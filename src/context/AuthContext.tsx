import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createRateLimiter,
  sanitizeAddress,
  sanitizeEmail,
  sanitizeName,
  sanitizePhone,
} from "../lib/security";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Role = "customer" | "admin" | "owner";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Optional phone/WhatsApp, editable by the user's own account or an admin. */
  phone?: string;
  /** Home / billing address. */
  address?: string;
  /** Separate shipping address (falls back to `address` at checkout if empty). */
  shippingAddress?: string;
  role: Role;
  /** Banned accounts cannot sign in and are signed out immediately. */
  banned?: boolean;
  createdAt: number;
  lastLoginAt?: number;
}

interface StoredUser extends User {
  kdf: "pbkdf2";
  salt: string;
  hash: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

type AuthMode = "signin" | "signup";

/** Patch shape the admin console (or an account itself) may apply. */
export interface UserPatch {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  shippingAddress?: string;
}

/* ------------------------------------------------------------------ */
/* Demo constants + helpers                                            */
/* ------------------------------------------------------------------ */

export const DEMO_ADMIN = {
  name: "Owner Demo",
  email: "owner@isak.co.id",
  password: "owner123",
  phone: "081965678901",
};

// The demo owner account can never be demoted, banned or deleted.
export const OWNER_ID = "u-admin-demo";

// Storage bumped to v2: v1 stored weak djb2 hashes, v2 stores salted PBKDF2.
// The v3 shape (role/phone/banned) is normalized in-place on read, so existing
// accounts keep working.
const USERS_KEY = "isak-users-v2";
const SESSION_KEY = "isak-session-v2";

const PBKDF2_ITERATIONS = 120_000;
const LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 30_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function deriveHash(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(bits));
}

async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomSalt();
  return { salt, hash: await deriveHash(password, salt) };
}

/** Normalize a stored record into the current v3 shape (keeps v2 data). */
function normalizeUser(u: StoredUser): StoredUser {
  const isOwnerEmail = u.email.toLowerCase() === DEMO_ADMIN.email.toLowerCase();
  const role: Role = isOwnerEmail
    ? "owner"
    : u.role === "owner"
      ? "owner"
      : u.role === "admin"
        ? "admin"
        : "customer";
  return {
    ...u,
    id: isOwnerEmail ? OWNER_ID : u.id,
    role,
    phone: u.phone ?? "",
    banned: !!u.banned,
    lastLoginAt: u.lastLoginAt,
  };
}

function readUsers(): StoredUser[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed.map(normalizeUser) : [];
  } catch {
    return [];
  }
}

function toPublicUser(u: StoredUser): User {
  const { kdf: _omit1, salt: _omit2, hash: _omit3, ...safe } = u;
  return safe;
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  isOwner: boolean;
  /** Public view of every registered account (no hashes) — admin management. */
  users: User[];
  authOpen: boolean;
  authMode: AuthMode;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => void;
  /** Edit a user's name/email/phone. Admins may edit any account. */
  updateUser: (id: string, patch: UserPatch) => AuthResult;
  /** Owner-only: promote a customer to admin or revoke admin rights. */
  setUserRole: (id: string, role: Role) => AuthResult;
  /** Ban/unban a user — banned accounts are locked out immediately. */
  setUserBanned: (id: string, banned: boolean) => AuthResult;
  /** Permanently remove an account (owner accounts are protected). */
  deleteUser: (id: string) => AuthResult;
  /** Change an account's password — requires the current password. */
  updatePassword: (id: string, currentPassword: string, newPassword: string) => Promise<AuthResult>;
  /**
   * Demo "forgot password" request. Always resolves ok so the storefront never
   * reveals which emails have accounts (no account enumeration).
   */
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  /**
   * Compatibility surface for the unused tournament module (kept so those pages
   * still type-check): aliases mapped from the localStorage demo auth state.
   */
  profile: User | null;
  session: { user: User } | null;
  loading: boolean;
  canScore: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StoredUser[]>(() => readUsers());
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const loginLimiter = useRef(createRateLimiter(LOGIN_ATTEMPTS, LOGIN_WINDOW_MS));

  // Seed the demo owner account (PBKDF2 derivation is async).
  useEffect(() => {
    let alive = true;
    (async () => {
      const secret = await hashPassword(DEMO_ADMIN.password);
      if (!alive) return;
      setUsers((prev) => {
        const exists = prev.some((u) => u.email.toLowerCase() === DEMO_ADMIN.email.toLowerCase());
        if (exists) return prev;
        const owner: StoredUser = {
          id: OWNER_ID,
          name: DEMO_ADMIN.name,
          email: DEMO_ADMIN.email,
          phone: DEMO_ADMIN.phone,
          role: "owner",
          kdf: "pbkdf2",
          salt: secret.salt,
          hash: secret.hash,
          createdAt: Date.now(),
        };
        return [...prev, owner];
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {
      /* demo only */
    }
  }, [users]);

  useEffect(() => {
    try {
      if (sessionId) window.localStorage.setItem(SESSION_KEY, sessionId);
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* demo only */
    }
  }, [sessionId]);

  const user = useMemo(() => {
    if (!sessionId) return null;
    const found = users.find((u) => u.id === sessionId);
    if (!found) return null;
    return toPublicUser(found);
  }, [users, sessionId]);

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isOwner = user?.role === "owner";

  // Mid-session ban enforcement: if the signed-in account gets banned (e.g. by
  // an admin in the console) it is signed out on the next render.
  useEffect(() => {
    if (user?.banned) setSessionId(null);
  }, [user?.banned, user?.id]);

  const openAuth = useCallback((mode: AuthMode = "signin") => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const clean = sanitizeEmail(email);
      if (!clean || !password) return { ok: false, error: "Email and password are required." };

      const gate = loginLimiter.current.consume(clean);
      if (!gate.ok) {
        return {
          ok: false,
          error: `Too many attempts — try again in ${Math.ceil(gate.retryAfterMs / 1000)}s.`,
        };
      }

      const found = users.find((u) => u.email.toLowerCase() === clean);
      if (!found) return { ok: false, error: "No account with that email — try signing up." };
      if (found.banned) {
        return {
          ok: false,
          error: "This account has been suspended — contact the store to appeal.",
        };
      }
      if (found.kdf !== "pbkdf2") {
        return { ok: false, error: "That account predates the security upgrade — please sign up again." };
      }
      const derived = await deriveHash(password, found.salt);
      if (derived !== found.hash) {
        return { ok: false, error: "Incorrect password — check and try again." };
      }
      loginLimiter.current.reset(clean);
      setUsers((prev) =>
        prev.map((u) => (u.id === found.id ? { ...u, lastLoginAt: Date.now() } : u))
      );
      setSessionId(found.id);
      return { ok: true };
    },
    [users]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<AuthResult> => {
      const cleanName = sanitizeName(name);
      const clean = sanitizeEmail(email);
      if (cleanName.length < 2) return { ok: false, error: "Please enter your full name." };
      if (!EMAIL_RE.test(clean)) {
        return { ok: false, error: "That email doesn't look right — double-check it." };
      }
      if (users.some((u) => u.email.toLowerCase() === clean)) {
        return { ok: false, error: "An account with that email already exists — sign in instead." };
      }
      if (password.length < 6) {
        return { ok: false, error: "Password must be at least 6 characters." };
      }
      const { salt, hash } = await hashPassword(password);
      const created: StoredUser = {
        id: `user-${Date.now().toString(36)}`,
        name: cleanName,
        email: clean,
        phone: "",
        role: "customer",
        kdf: "pbkdf2",
        salt,
        hash,
        createdAt: Date.now(),
      };
      setUsers((prev) => [...prev, created]);
      setSessionId(created.id);
      return { ok: true };
    },
    [users]
  );

  const signOut = useCallback(() => setSessionId(null), []);

  const updateUser = useCallback(
    (id: string, patch: UserPatch): AuthResult => {
      const target = users.find((u) => u.id === id);
      if (!target) return { ok: false, error: "That account no longer exists." };

      const next: UserPatch = {};
      if (patch.name !== undefined) {
        const name = sanitizeName(patch.name);
        if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters." };
        next.name = name;
      }
      if (patch.email !== undefined) {
        const email = sanitizeEmail(patch.email);
        if (!EMAIL_RE.test(email)) {
          return { ok: false, error: "That email doesn't look right — double-check it." };
        }
        if (users.some((u) => u.id !== id && u.email.toLowerCase() === email)) {
          return { ok: false, error: "Another account already uses that email." };
        }
        next.email = email;
      }
      if (patch.phone !== undefined) next.phone = sanitizePhone(patch.phone);
      if (patch.address !== undefined) next.address = sanitizeAddress(patch.address);
      if (patch.shippingAddress !== undefined) next.shippingAddress = sanitizeAddress(patch.shippingAddress);

      // A regular user may only edit their own profile.
      if (user && !isAdmin && user.id !== id) {
        return { ok: false, error: "You can only edit your own account." };
      }
      // Nobody may change the owner's identity.
      if (target.role === "owner" && (next.name || next.email)) {
        return { ok: false, error: "The owner account's name and email are protected." };
      }

      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...next } : u)));
      return { ok: true };
    },
    [users, user, isAdmin]
  );

  const setUserRole = useCallback(
    (id: string, role: Role): AuthResult => {
      const target = users.find((u) => u.id === id);
      if (!target) return { ok: false, error: "That account no longer exists." };
      if (!user || user.role !== "owner") {
        return { ok: false, error: "Only the store owner can change admin roles." };
      }
      if (target.role === "owner") {
        return { ok: false, error: "The owner account cannot be demoted." };
      }
      if (target.id === user.id) {
        return { ok: false, error: "You cannot change your own role here." };
      }
      const nextRole: Role = role === "owner" ? "admin" : role === "admin" ? "admin" : "customer";
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: nextRole } : u)));
      return { ok: true };
    },
    [users, user]
  );

  const setUserBanned = useCallback(
    (id: string, banned: boolean): AuthResult => {
      const target = users.find((u) => u.id === id);
      if (!target) return { ok: false, error: "That account no longer exists." };
      if (target.role === "owner") return { ok: false, error: "The owner account cannot be banned." };
      if (target.id === user?.id) return { ok: false, error: "You cannot ban your own account." };
      if (target.role === "admin" && !isOwner) {
        return { ok: false, error: "Only the owner can ban an admin account." };
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, banned } : u)));
      return { ok: true };
    },
    [users, user, isOwner]
  );

  const deleteUser = useCallback(
    (id: string): AuthResult => {
      const target = users.find((u) => u.id === id);
      if (!target) return { ok: false, error: "That account no longer exists." };
      if (target.role === "owner") return { ok: false, error: "The owner account cannot be deleted." };
      if (target.id === user?.id) {
        return { ok: false, error: "You cannot delete your own account here." };
      }
      if (target.role === "admin" && !isOwner) {
        return { ok: false, error: "Only the owner can delete an admin account." };
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (sessionId === id) setSessionId(null);
      return { ok: true };
    },
    [users, user, isOwner, sessionId]
  );

  const updatePassword = useCallback(
    async (id: string, currentPassword: string, newPassword: string): Promise<AuthResult> => {
      const target = users.find((u) => u.id === id);
      if (!target) return { ok: false, error: "That account no longer exists." };
      if (!user || (user.id !== id && !isAdmin)) {
        return { ok: false, error: "You can only change your own password." };
      }
      if (!currentPassword) return { ok: false, error: "Enter your current password first." };
      if (newPassword.length < 6) {
        return { ok: false, error: "New password must be at least 6 characters." };
      }
      const derived = await deriveHash(currentPassword, target.salt);
      if (derived !== target.hash) {
        return { ok: false, error: "Current password is incorrect — check and try again." };
      }
      const { salt, hash } = await hashPassword(newPassword);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, salt, hash, kdf: "pbkdf2" } : u)));
      return { ok: true };
    },
    [users, user, isAdmin]
  );

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    const clean = sanitizeEmail(email);
    if (!clean || !EMAIL_RE.test(clean)) {
      return { ok: false, error: "That email doesn't look right — double-check it." };
    }
    // Demo store: simulate a reset email. Always succeed so visitors can't find
    // out which accounts exist.
    return { ok: true };
  }, []);

  const publicUsers = useMemo(() => users.map(toPublicUser), [users]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin,
      isOwner,
      users: publicUsers,
      authOpen,
      authMode,
      openAuth,
      closeAuth,
      signIn,
      signUp,
      signOut,
      updateUser,
      setUserRole,
      setUserBanned,
      deleteUser,
      updatePassword,
      requestPasswordReset,
      profile: user,
      session: user ? { user } : null,
      loading: false,
      canScore: isAdmin,
    }),
    [
      user,
      isAdmin,
      isOwner,
      publicUsers,
      authOpen,
      authMode,
      openAuth,
      closeAuth,
      signIn,
      signUp,
      signOut,
      updateUser,
      setUserRole,
      setUserBanned,
      deleteUser,
      updatePassword,
      requestPasswordReset,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
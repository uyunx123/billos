import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { sanitizeEmail, sanitizeName, sanitizePhone, sanitizeText } from "../lib/security";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ChatIdentity {
  name: string;
  email: string;
  phone: string;
}

export type ChatSender = "customer" | "admin";

export interface ChatMessage {
  id: string;
  from: ChatSender;
  /** Display name of whoever wrote the message (customer or admin). */
  senderName: string;
  /** User id when an admin wrote it — used to color replies per admin. */
  senderId?: string;
  body: string;
  at: string; // ISO
}

export interface ChatThread {
  /** Stable id — the visitor's normalized email. */
  id: string;
  customerKey: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  messages: ChatMessage[];
  /** Last time the customer read their own thread (for unread admin replies). */
  customerReadAt?: string;
  /** Last time an admin read this thread (for the inbox unread badge). */
  adminReadAt?: string;
  updatedAt: string;
}

interface StoredChatV1 {
  identity: ChatIdentity | null;
  messages: { id: string; from: "customer"; body: string; at: string }[];
}

interface ChatContextValue {
  identity: ChatIdentity | null;
  /** All conversations — the admin inbox. Customers see only their own thread. */
  threads: ChatThread[];
  /** Thread the admin is currently viewing (null = none selected yet). */
  activeThreadId: string | null;
  /** Messages of the current view (customer's own thread or admin's selection). */
  messages: ChatMessage[];
  /** Unread badge: admin → unread customer messages across all threads; customer → unread admin replies. */
  unreadCount: number;
  setIdentity: (identity: ChatIdentity) => void;
  /** Role-aware: customers append to their thread, admins reply to the selected thread. */
  sendMessage: (body: string) => boolean;
  selectThread: (id: string | null) => void;
  /** Mark the current view read for the signed-in role. */
  markThreadRead: () => void;
  clearHistory: () => void;
}

const THREADS_KEY = "isak-chat-threads-v2";
const CHAT_KEY_V1 = "isak-chat-v1";
const SESSION_READ_KEY_V1 = "isak-chat-read-at-v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — demo only */
  }
}

function threadIdFor(email: string): string {
  return sanitizeEmail(email) || "guest";
}

/** Migrate the old single-thread v1 chat into the v2 thread list. */
function migrateV1(): ChatThread[] {
  try {
    const stored = readJson<StoredChatV1>(CHAT_KEY_V1, { identity: null, messages: [] });
    if (!stored.identity || stored.messages.length === 0) {
      window.localStorage.removeItem(CHAT_KEY_V1);
      window.localStorage.removeItem(SESSION_READ_KEY_V1);
      return [];
    }
    const id = threadIdFor(stored.identity.email);
    const readAt = window.localStorage.getItem(SESSION_READ_KEY_V1) ?? undefined;
    const thread: ChatThread = {
      id,
      customerKey: id,
      customerName: sanitizeName(stored.identity.name) || "Guest",
      customerEmail: sanitizeEmail(stored.identity.email),
      customerPhone: sanitizePhone(stored.identity.phone),
      messages: stored.messages.map((m) => ({
        id: m.id,
        from: "customer" as const,
        senderName: stored.identity?.name ?? "Guest",
        body: sanitizeText(m.body, 600),
        at: m.at,
      })),
      adminReadAt: readAt,
      updatedAt: stored.messages[stored.messages.length - 1]?.at ?? new Date().toISOString(),
    };
    window.localStorage.removeItem(CHAT_KEY_V1);
    window.localStorage.removeItem(SESSION_READ_KEY_V1);
    return [thread];
  } catch {
    return [];
  }
}

function readThreads(): ChatThread[] {
  const v2 = readJson<ChatThread[]>(THREADS_KEY, [] as ChatThread[]);
  if (Array.isArray(v2) && v2.length > 0) return v2;
  return migrateV1();
}

function sortThreads(threads: ChatThread[]): ChatThread[] {
  return [...threads].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [identity, setIdentityState] = useState<ChatIdentity | null>(() => {
    const stored = readJson<StoredChatV1>(CHAT_KEY_V1, { identity: null, messages: [] });
    return stored.identity;
  });
  const [threads, setThreads] = useState<ChatThread[]>(() => readThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  useEffect(() => writeJson(THREADS_KEY, threads), [threads]);

  // Signed-in customers get their account details pre-filled — and their chat
  // thread is keyed to the same email. The owner/any admin account never
  // overwrites a visitor's identity: the inbox reads it to know who wrote in.
  useEffect(() => {
    if (!user || isAdmin) return;
    setIdentityState((prev) => {
      if (prev && sanitizeEmail(prev.email) === sanitizeEmail(user.email)) return prev;
      return {
        name: user.name,
        email: user.email,
        phone: prev?.phone ?? user.phone ?? "",
      };
    });
  }, [user, isAdmin]);

  const setIdentity = useCallback((next: ChatIdentity) => {
    setIdentityState({
      name: sanitizeName(next.name) || "Guest",
      email: sanitizeEmail(next.email),
      phone: sanitizePhone(next.phone),
    });
  }, []);

  const myThreadId = useMemo(
    () => (identity ? threadIdFor(identity.email) : null),
    [identity]
  );

  /** Upsert a thread (create when missing) and run an update on its messages. */
  const mutateThread = useCallback(
    (threadId: string, makeThread: () => ChatThread, mutate: (t: ChatThread) => ChatThread) => {
      setThreads((prev) => {
        const existing = prev.find((t) => t.id === threadId);
        if (existing) {
          return sortThreads(prev.map((t) => (t.id === threadId ? mutate(t) : t)));
        }
        return sortThreads([...prev, mutate(makeThread())]);
      });
    },
    []
  );

  const sendMessage = useCallback(
    (body: string): boolean => {
      const text = sanitizeText(body, 600);
      if (!text) return false;

      if (isAdmin) {
        if (!activeThreadId) return false;
        const at = new Date().toISOString();
        mutateThread(
          activeThreadId,
          () => {
            throw new Error("thread must exist");
          },
          (t) => ({
            ...t,
            messages: [
              ...t.messages,
              {
                id: `chat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
                from: "admin",
                senderName: user?.name ?? "Admin",
                senderId: user?.id,
                body: text,
                at,
              },
            ],
            adminReadAt: at,
            updatedAt: at,
          })
        );
        return true;
      }

      if (!identity || !myThreadId) return false;
      const at = new Date().toISOString();
      mutateThread(
        myThreadId,
        () => ({
          id: myThreadId,
          customerKey: myThreadId,
          customerName: identity.name,
          customerEmail: identity.email,
          customerPhone: identity.phone,
          messages: [],
          customerReadAt: at,
          updatedAt: at,
        }),
        (t) => ({
          ...t,
          customerName: identity.name,
          customerEmail: identity.email,
          customerPhone: identity.phone,
          messages: [
            ...t.messages,
            {
              id: `chat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
              from: "customer",
              senderName: identity.name,
              body: text,
              at,
            },
          ],
          customerReadAt: at,
          updatedAt: at,
        })
      );
      return true;
    },
    [isAdmin, activeThreadId, identity, myThreadId, user, mutateThread]
  );

  const selectThread = useCallback((id: string | null) => {
    setActiveThreadId(id);
  }, []);

  const markThreadRead = useCallback(() => {
    const at = new Date().toISOString();
    if (isAdmin) {
      if (!activeThreadId) return;
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThreadId ? { ...t, adminReadAt: at } : t))
      );
      return;
    }
    if (!myThreadId) return;
    setThreads((prev) =>
      prev.map((t) => (t.id === myThreadId ? { ...t, customerReadAt: at } : t))
    );
  }, [isAdmin, activeThreadId, myThreadId]);

  const clearHistory = useCallback(() => {
    setThreads([]);
    setIdentityState(null);
    setActiveThreadId(null);
    try {
      window.localStorage.removeItem(THREADS_KEY);
      window.localStorage.removeItem(CHAT_KEY_V1);
      window.localStorage.removeItem(SESSION_READ_KEY_V1);
    } catch {
      /* demo only */
    }
  }, []);

  const messages = useMemo(() => {
    if (isAdmin) {
      return threads.find((t) => t.id === activeThreadId)?.messages ?? [];
    }
    return threads.find((t) => t.id === myThreadId)?.messages ?? [];
  }, [isAdmin, threads, activeThreadId, myThreadId]);

  const unreadCount = useMemo(() => {
    if (isAdmin) {
      const total = threads.reduce((sum, t) => {
        const cutoff = t.adminReadAt ? new Date(t.adminReadAt).getTime() : 0;
        return (
          sum +
          t.messages.filter((m) => m.from === "customer" && new Date(m.at).getTime() > cutoff)
            .length
        );
      }, 0);
      return Math.min(99, total);
    }
    const my = threads.find((t) => t.id === myThreadId);
    if (!my) return 0;
    const cutoff = my.customerReadAt ? new Date(my.customerReadAt).getTime() : 0;
    return Math.min(
      99,
      my.messages.filter((m) => m.from === "admin" && new Date(m.at).getTime() > cutoff).length
    );
  }, [isAdmin, threads, myThreadId]);

  const value = useMemo<ChatContextValue>(
    () => ({
      identity,
      threads,
      activeThreadId,
      messages,
      unreadCount,
      setIdentity,
      sendMessage,
      selectThread,
      markThreadRead,
      clearHistory,
    }),
    [
      identity,
      threads,
      activeThreadId,
      messages,
      unreadCount,
      setIdentity,
      sendMessage,
      selectThread,
      markThreadRead,
      clearHistory,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, LockKeyhole, LogIn, Mail, MailCheck, Sparkles, UserPlus, X } from "lucide-react";
import { DEMO_ADMIN, useAuth } from "../context/AuthContext";

type Mode = "signin" | "signup";
type View = "auth" | "forgot";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), a[href], select, textarea, [tabindex]:not([tabindex="-1"])';

export default function AuthModal() {
  const { authOpen, authMode, closeAuth, signIn, signUp, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>(authMode);
  const [view, setView] = useState<View>("auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  // Sync mode when opened (e.g. "Create account" buttons request signup).
  useEffect(() => {
    if (authOpen) {
      setMode(authMode);
      setView("auth");
      setResetDone(false);
      setError(null);
      setSuccess(null);
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [authOpen, authMode]);

  // Focus first field; body scroll lock; focus return on close.
  useEffect(() => {
    if (!authOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    }, 30);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      if (!authOpen) triggerRef.current?.focus?.();
    };
  }, [authOpen]);

  // Escape closes; basic focus trap keeps Tab inside the dialog.
  useEffect(() => {
    if (!authOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAuth();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [authOpen, closeAuth]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  if (!authOpen) return null;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSuccess(null);
  }

  async function handleForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await requestPasswordReset(resetEmail);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong — please try again.");
      return;
    }
    setResetDone(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await (mode === "signin"
      ? signIn(email, password)
      : signUp(name, email, password));
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong — please try again.");
      return;
    }
    const displayName =
      mode === "signin" ? email.trim().split("@")[0] : name.trim().split(" ")[0];
    setSuccess(
      mode === "signin"
        ? `Welcome back${displayName ? `, ${displayName}` : ""}!`
        : "Account created — you're signed in."
    );
    closeTimer.current = window.setTimeout(() => {
      closeAuth();
      setSuccess(null);
    }, 900);
  }

  const isOwnerDemo = email.trim().toLowerCase() === DEMO_ADMIN.email.toLowerCase();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close sign in dialog"
        className="absolute inset-0 cursor-pointer bg-primary-950/60 backdrop-blur-sm"
        onClick={closeAuth}
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-background shadow-lift"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-800 to-primary-950 px-7 pb-6 pt-7 text-on-primary">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-gold-400/20 blur-2xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-primary-400/20 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-gold-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                ISAK Billiard Co.
              </p>
              <h2 id="auth-modal-title" className="mt-2 font-heading text-2xl font-bold tracking-tight">
                {view === "forgot"
                  ? "Reset your password"
                  : mode === "signin"
                    ? "Welcome back"
                    : "Join the club"}
              </h2>
              <p className="mt-1 text-xs text-on-primary/70">
                {view === "forgot"
                  ? "Enter your account email and we'll send reset instructions."
                  : mode === "signin"
                    ? "Sign in for your orders, faster checkout and member perks."
                    : "Create a free account — orders saved, checkout in a tap."}
              </p>
            </div>
            <button
              type="button"
              onClick={closeAuth}
              aria-label="Close sign in dialog"
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-on-primary/10 text-on-primary transition-colors hover:bg-on-primary/20"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {view === "auth" && (
        <div role="tablist" aria-label="Authentication mode" className="flex border-b border-border px-7 pt-4">
          {(
            [
              { id: "signin", label: "Sign in", icon: LogIn },
              { id: "signup", label: "Create account", icon: UserPlus },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`auth-tab-${tab.id}`}
              aria-selected={mode === tab.id}
              aria-controls={`auth-panel-${tab.id}`}
              tabIndex={mode === tab.id ? 0 : -1}
              onClick={() => switchMode(tab.id)}
              className={`-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors duration-150 ${
                mode === tab.id
                  ? "border-gold-400 text-gold-300"
                  : "border-transparent text-foreground/50 hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>
        )}

        <div className="px-7 py-6">
          {view === "forgot" ? (
            resetDone ? (
              <div className="flex flex-col items-center py-8 text-center" role="status">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-on-primary shadow-lift">
                  <MailCheck className="h-8 w-8" aria-hidden="true" />
                </span>
                <p className="mt-4 font-heading text-lg font-bold">Check your inbox</p>
                <p className="mt-1 max-w-xs text-sm text-foreground/60">
                  If an account exists for <strong className="break-all">{resetEmail}</strong>, reset
                  instructions are on their way.
                </p>
                <p className="mt-2 text-xs text-foreground/50">
                  This demo simulates the email — once signed in, you can change your password
                  anytime from Edit profile.
                </p>
                <button
                  type="button"
                  className="btn btn-outline mt-6"
                  onClick={() => {
                    setView("auth");
                    setResetDone(false);
                    setResetEmail("");
                  }}
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} noValidate className="space-y-4" aria-label="Reset password form">
                <div>
                  <label htmlFor="auth-reset-email" className="field-label">Account email</label>
                  <input
                    id="auth-reset-email"
                    type="email"
                    className="input"
                    autoComplete="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                {error && (
                  <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
                    {error}
                  </p>
                )}
                <button type="submit" className="btn btn-primary w-full !py-3.5" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending reset link…
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" aria-hidden="true" /> Send reset link
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="w-full cursor-pointer text-center text-xs font-bold text-primary-200 underline-offset-2 hover:underline"
                  onClick={() => {
                    setView("auth");
                    setError(null);
                  }}
                >
                  ← Back to sign in
                </button>
              </form>
            )
          ) : success ? (
            <div className="flex flex-col items-center py-8 text-center" role="status">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-on-primary shadow-lift">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </span>
              <p className="mt-4 font-heading text-lg font-bold">{success}</p>
              <p className="mt-1 text-sm text-foreground/60">One moment…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label={mode === "signin" ? "Sign in form" : "Create account form"}>
              {mode === "signup" && (
                <div>
                  <label htmlFor="auth-name" className="field-label">Full name</label>
                  <input
                    id="auth-name"
                    className="input"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Bima Saputra"
                  />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className="field-label">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  className="input"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="auth-password" className="text-sm font-semibold text-foreground/80">Password</label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="cursor-pointer text-xs font-bold text-primary-200 underline-offset-2 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="auth-password"
                  type="password"
                  className="input"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {mode === "signup" && (
                  <p className="mt-1 text-xs text-foreground/50">At least 6 characters.</p>
                )}
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn-primary w-full !py-3.5" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                  </>
                ) : mode === "signin" ? (
                  <>
                    <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" aria-hidden="true" /> Create account
                  </>
                )}
              </button>
            </form>
          )}

          {view === "auth" && mode === "signin" && !success && (
            <div className="mt-5 rounded-2xl border border-gold-300/40 bg-gold-100/50 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold-200">
                <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                Owner demo account
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">
                Email <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary-200">{DEMO_ADMIN.email}</span> · password{" "}
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary-200">{DEMO_ADMIN.password}</span>{" "}
                opens the Admin console. Any signup gives you a customer account.
              </p>
              {isOwnerDemo && password === DEMO_ADMIN.password && (
                <p className="mt-2 text-xs font-semibold text-gold-200">✓ That&apos;s it — admin access is unlocked after signing in.</p>
              )}
            </div>
          )}

          {view === "auth" && (
          <p className="mt-5 text-center text-xs text-foreground/50">
            {mode === "signin" ? "Guest checkout is still available — " : "Already have an account? "}
            <button
              type="button"
              className="cursor-pointer font-bold text-primary-200 underline-offset-2 hover:underline"
              onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "create an account" : "Sign in"}
            </button>
          </p>
          )}
        </div>
      </div>
    </div>
  );
}
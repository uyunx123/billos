import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Loader2, Mail, MessageSquare, Phone, Send, User, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useConfig } from "../context/ConfigContext";

/**
 * Two-way chat widget. Customers write to the store and read admin replies;
 * every admin account reads all conversations and replies from the admin
 * console. Unread admin replies surface on the launcher badge.
 */
export default function ChatWidget() {
  const { user, isAdmin } = useAuth();
  const { identity, messages, unreadCount, setIdentity, sendMessage, markThreadRead } = useChat();
  const { ticker } = useConfig();
  const tickerVisible = ticker.enabled && ticker.items.some((i) => i.enabled && i.text.trim());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(identity?.name ?? user?.name ?? "");
  const [email, setEmail] = useState(identity?.email ?? user?.email ?? "");
  const [phone, setPhone] = useState(identity?.phone ?? user?.phone ?? "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      // Opening the widget counts as reading — clear the unread badge.
      markThreadRead();
    }
  }, [open, messages.length, markThreadRead]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // Hide for admins — they read and reply from the admin console.
  // NOTE: this early return MUST stay after every hook in this component,
  // otherwise React throws "Rendered fewer hooks than expected" when the
  // isAdmin flag flips after sign-in and the whole app unmounts.
  if (isAdmin) return null;

  function confirmIdentity(e: FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) {
      setError("Tell us your name so we know who we're talking to.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("That email doesn't look quite right — double-check it.");
      return;
    }
    if (phone.trim().length < 6) {
      setError("Add a phone / WhatsApp number so we can reply.");
      return;
    }
    setError(null);
    setIdentity({ name: cleanName, email: cleanEmail, phone: phone.trim() });
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!identity || !body.trim()) return;
    setSending(true);
    setError(null);
    window.setTimeout(() => {
      sendMessage(body);
      setBody("");
      setSending(false);
      setSent(true);
      window.setTimeout(() => setSent(false), 1600);
    }, 350);
  }

  return (
    <div className={`fixed right-5 z-50 flex flex-col items-end gap-3 print:hidden ${tickerVisible ? "bottom-[calc(4rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"}`}>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Chat with the store team"
          className="flex h-[min(36rem,calc(100dvh-7rem))] w-[min(26rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-lift"
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 to-primary-950 px-5 pb-4 pt-4 text-on-primary">
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gold-400/20 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-on-primary/10 ring-1 ring-on-primary/20">
                  <MessageSquare className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-heading font-bold">Message the store</p>
                  <p className="text-xs text-on-primary/75">Real two-way chat — we reply here, by WhatsApp or email.</p>
                </div>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full bg-on-primary/10 transition-colors hover:bg-on-primary/20"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Identity form */}
          {!identity ? (
            <form onSubmit={confirmIdentity} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              <div>
                <label htmlFor="chat-name" className="field-label">Your name *</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
                  <input id="chat-name" className="input !pl-9" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Budi Santoso" />
                </div>
              </div>
              <div>
                <label htmlFor="chat-email" className="field-label">Email *</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
                  <input id="chat-email" type="email" className="input !pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label htmlFor="chat-phone" className="field-label">Phone / WhatsApp *</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
                  <input id="chat-phone" type="tel" className="input !pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx…" />
                </div>
              </div>
              {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
              )}
              <button type="submit" className="btn btn-primary mt-auto w-full !py-2.5">
                Start the conversation
              </button>
              <p className="text-center text-xs text-foreground/50">
                Signed in? Your details are pre-filled automatically.
              </p>
            </form>
          ) : (
            <>
              {/* Thread */}
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
                {messages.length === 0 && (
                  <div className="px-2 py-6 text-center">
                    <MessageSquare className="mx-auto h-8 w-8 text-foreground/25" aria-hidden="true" />
                    <p className="mt-3 font-heading font-bold">How can we help?</p>
                    <p className="mx-auto mt-1 max-w-[18rem] text-sm text-foreground/55">
                      Ask about an order, a cue spec, or anything else — your message goes
                      straight to our team, and their replies appear right here.
                    </p>
                  </div>
                )}
                {messages.map((m) =>
                  m.from === "customer" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-primary-600 to-primary-800 px-4 py-2.5 text-sm text-on-primary shadow-soft">
                        <p className="whitespace-pre-wrap leading-snug">{m.body}</p>
                        <p className="mt-1 text-right text-[10px] font-semibold text-on-primary/60">
                          {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(m.at))}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground shadow-soft">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary-700">
                          {m.senderName || "Store team"}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap leading-snug">{m.body}</p>
                        <p className="mt-1 text-right text-[10px] font-semibold text-foreground/45">
                          {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(m.at))}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Composer */}
              <form onSubmit={handleSend} className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <label htmlFor="chat-body" className="sr-only">Your message</label>
                  <textarea
                    id="chat-body"
                    ref={inputRef}
                    rows={2}
                    className="input flex-1 resize-none !py-2.5"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message…"
                    maxLength={600}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary !h-11 !w-11 shrink-0 !p-0"
                    disabled={sending || !body.trim() || sent}
                    aria-label="Send message"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : sent ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {sent && (
                  <p role="status" className="mt-2 text-center text-xs font-semibold text-primary-700">
                    Sent — our team will reply here or via {identity.email} / {identity.phone}.
                  </p>
                )}
                <p className="mt-2 text-center text-[11px] text-foreground/45">
                  The whole store team sees this conversation and can reply.
                </p>
              </form>
            </>
          )}
        </div>
      )}

      {/* Launcher */}
      <button
        type="button"
        className="relative grid h-14 w-14 cursor-pointer place-items-center rounded-full bg-gradient-to-br from-primary-600 to-primary-800 text-on-primary shadow-lift transition-transform duration-150 active:scale-95 hover:scale-105"
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? "Close chat with the store" : `Chat with the store${unreadCount ? `, ${unreadCount} unread` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageSquare className="h-6 w-6" aria-hidden="true" />
        )}
        {!open && unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 px-1 text-[11px] font-bold text-primary-950 shadow-gold">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
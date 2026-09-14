/**
 * Lightweight client-side input sanitisation helpers.
 * These guard the demo store against trivial injection / javascript: link
 * abuse. A production deployment should additionally validate on the server.
 */

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:", "whatsapp:", "wa.me"]);
// Allow clean relative paths like /product/foo or /page/terms — but never protocol-relative //.
const RELATIVE = /^\/(?!\/)/;

/** Allow only http(s), mailto, tel, whatsapp or same-site relative URLs. */
export function sanitizeUrl(raw: string | null | undefined, fallback = "#"): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (RELATIVE.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    return SAFE_PROTOCOLS.has(url.protocol) ? trimmed : fallback;
  } catch {
    return fallback;
  }
}

/** Strip tags, collapse whitespace and cap length. */
export function sanitizeText(raw: string | null | undefined, max = 500): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Escape a string so it can be safely embedded in HTML. */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------------ */
/* Field-level sanitizers                                              */
/* ------------------------------------------------------------------ */

/** Human name: strip tags/control chars, collapse spaces, cap at 80 chars. */
export function sanitizeName(raw: string | null | undefined): string {
  return sanitizeText(raw, 80);
}

/** Email: strip tags/whitespace, lowercase, cap length. */
export function sanitizeEmail(raw: string | null | undefined): string {
  return sanitizeText(raw, 120).toLowerCase();
}

/** Phone: keep only digits, +, spaces and dashes, cap at 20 chars. */
export function sanitizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[^\d+\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
}

/** Keep only plain digits/letters/spaces/dots/dashes/commas (safe for addresses). */
export function sanitizeAddress(raw: string | null | undefined): string {
  if (!raw) return "";
  return sanitizeText(raw, 200).replace(/[^a-zA-Z0-9 .,#'\-/]/g, "");
}

/* ------------------------------------------------------------------ */
/* Simple in-memory rate limiter (login attempts, chat flood, …)       */
/* ------------------------------------------------------------------ */

export interface RateLimitState {
  ok: boolean;
  /** Milliseconds to wait before the key may be used again. */
  retryAfterMs: number;
  remaining: number;
}

/**
 * Token-bucket style limiter: `limit` attempts per `windowMs` per key.
 * Keys are typically emails or user ids. State lives in memory (per tab);
 * a production deployment should rate-limit server-side.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, { count: number; windowStart: number }>();

  function sweep(now: number) {
    for (const [key, b] of buckets) {
      if (now - b.windowStart > windowMs) buckets.delete(key);
    }
  }

  return {
    /** Consume one attempt for `key`. */
    consume(key: string): RateLimitState {
      const now = Date.now();
      sweep(now);
      const b = buckets.get(key) ?? { count: 0, windowStart: now };
      if (now - b.windowStart > windowMs) {
        b.count = 0;
        b.windowStart = now;
      }
      b.count += 1;
      buckets.set(key, b);
      const remaining = Math.max(0, limit - b.count);
      const ok = b.count <= limit;
      const retryAfterMs = ok ? 0 : Math.max(0, windowMs - (now - b.windowStart));
      return { ok, retryAfterMs, remaining };
    },
    /** Drop the bucket for `key` (e.g. after a successful login). */
    reset(key: string) {
      buckets.delete(key);
    },
  };
}
/* ------------------------------------------------------------------ */
/* Invoice numbering                                                   */
/* ------------------------------------------------------------------ */

/** Escape a string for use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `INV` + 2026 + 1 → "INV-2026-0001". */
export function formatInvoiceNumber(prefix: string, year: number, seq: number): string {
  return `${prefix.trim() || "INV"}-${year}-${String(Math.max(1, seq)).padStart(4, "0")}`;
}

/** Extract the numeric sequence from an existing invoice number for the prefix+year, or 0. */
export function parseInvoiceSequence(number: string, prefix: string, year: number): number {
  const re = new RegExp(`^${escapeRegExp(prefix.trim() || "INV")}-${year}-(\\d{1,6})$`);
  const m = re.exec(number.trim());
  return m ? Number(m[1]) : 0;
}

/**
 * Compute the next invoice number in a shared per-year sequence.
 * Starts at `start` and skips any numbers already present in `existing`,
 * so receipts and offline sales never collide.
 */
export function nextInvoiceNumber(
  prefix: string,
  start: number,
  existing: string[],
  date: string | Date
): string {
  const year = new Date(date).getFullYear();
  const clean = prefix.trim() || "INV";
  let seq = Math.max(1, Math.round(start) || 1);
  const used = new Set(
    existing
      .map((n) => parseInvoiceSequence(n, clean, year))
      .filter((s) => s > 0)
  );
  while (used.has(seq)) seq += 1;
  return formatInvoiceNumber(clean, year, seq);
}

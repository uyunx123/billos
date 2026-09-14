import { useRef, useState, type FormEvent } from "react";
import { Check, ImagePlus, Loader2, Star, X } from "lucide-react";
import {
  imageFileToDataUrl,
  videoFileToDataUrl,
  type ProductReview,
  type ReviewInput,
  type ReviewMedia,
} from "../context/ReviewContext";

const STAR_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

/**
 * Verified-purchase review form: 1–5 stars, a comment, and up to 3 photo/video
 * attachments (images are compressed in the browser, files capped ~1.5 MB).
 */
export default function ReviewModal({
  orderId,
  productId,
  productName,
  author,
  onClose,
  onSave,
  existing,
}: {
  orderId: string;
  productId: string;
  productName: string;
  author: string;
  onClose: () => void;
  onSave: (input: ReviewInput) => void;
  existing?: ProductReview;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [media, setMedia] = useState<ReviewMedia[]>(existing?.media ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    const room = 3 - media.length;
    if (room <= 0) {
      setError("You can attach up to 3 photos or videos.");
      return;
    }
    try {
      const next: ReviewMedia[] = [];
      for (const file of files.slice(0, room)) {
        if (file.type.startsWith("video/")) {
          next.push({ kind: "video", dataUrl: await videoFileToDataUrl(file) });
        } else if (file.type.startsWith("image/")) {
          next.push({ kind: "image", dataUrl: await imageFileToDataUrl(file) });
        } else {
          setError(`"${file.name}" isn't a photo or video we can attach.`);
        }
      }
      setMedia((prev) => [...prev, ...next]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That file couldn't be attached.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!rating) {
      setError("Tap a star rating first — one of them must have impressed you.");
      return;
    }
    if (comment.trim() && comment.trim().length < 4) {
      setError("If you add a comment, give it a couple more words.");
      return;
    }
    setError(null);
    setSaving(true);
    window.setTimeout(() => {
      onSave({
        orderId,
        productId,
        author,
        rating,
        comment: comment.trim(),
        media,
      });
      setSaving(false);
    }, 350);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button type="button" aria-label="Close review form" className="fixed inset-0 bg-primary-950/50 backdrop-blur-sm" onClick={onClose} tabIndex={-1} />
      <form
        role="dialog"
        aria-modal="true"
        aria-label={`Review ${productName}`}
        onSubmit={submit}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-background shadow-lift"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 to-primary-950 px-6 pb-5 pt-5 text-on-primary">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gold-400/20 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-300">Verified purchase</p>
              <h2 className="mt-1 font-heading text-xl font-bold leading-tight">{productName}</h2>
            </div>
            <button type="button" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-on-primary/10 transition-colors hover:bg-on-primary/20" aria-label="Close" onClick={onClose}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
          <div>
            <span className="field-label">Your rating *</span>
            <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Star rating" aria-required="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={rating === i}
                  aria-label={`${i} star${i === 1 ? "" : "s"} — ${STAR_LABELS[i - 1]}`}
                  className="cursor-pointer p-0.5 transition-transform duration-150 active:scale-90"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                >
                  <Star
                    className={`h-9 w-9 transition-colors ${
                      i <= (hover || rating)
                        ? "fill-gold-500 text-gold-500"
                        : "fill-foreground/10 text-foreground/20"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs font-semibold text-foreground/55" aria-live="polite">
              {rating ? STAR_LABELS[rating - 1] : "Tap a star to rate"}
            </p>
          </div>

          <div>
            <label htmlFor="rv-comment" className="field-label">How was it?</label>
            <textarea
              id="rv-comment"
              rows={3}
              className="input resize-none"
              maxLength={600}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Balance, finish, delivery — what should other players know?"
            />
            <p className="mt-1 text-right text-xs text-foreground/45">{comment.length}/600</p>
          </div>

          <div>
            <span className="field-label">Photos / video (optional, up to 3)</span>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {media.map((m, i) => (
                <span key={i} className="relative">
                  {m.kind === "image" ? (
                    <img src={m.dataUrl} alt="" className="h-16 w-16 rounded-xl border border-border object-cover" />
                  ) : (
                    <video src={m.dataUrl} muted controls preload="metadata" className="h-16 w-24 rounded-xl border border-border bg-black" />
                  )}
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-primary-950 text-on-primary shadow-soft"
                    onClick={() => setMedia((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
              {media.length < 3 && (
                <label className="btn btn-outline cursor-pointer !px-3 !py-2 text-sm">
                  <ImagePlus className="h-4 w-4" aria-hidden="true" /> Add media
                  <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => void handleFiles(e)} />
                </label>
              )}
            </div>
            <p className="mt-1 text-xs text-foreground/50">
              Photos are compressed automatically; videos up to 1.5 MB.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
          )}

          <div className="flex gap-3 border-t border-border pt-4">
            <button type="submit" className="btn btn-primary flex-1 !py-3" disabled={saving || !rating}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                </>
              ) : existing ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" /> Save updated review
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" /> Submit review
                </>
              )}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </form>
    </div>
  );
}
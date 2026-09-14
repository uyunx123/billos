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
import type { Product } from "../data/products";
import { SEED_REVIEWS } from "../data/seedReviews";
import { sanitizeName, sanitizeText } from "../lib/security";
import { supabase } from "../lib/supabase";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ReviewMedia {
  kind: "image" | "video";
  dataUrl: string;
}

export interface ProductReview {
  id: string;
  orderId: string;
  productId: string;
  author: string;
  rating: number; // 1–5
  comment: string;
  media: ReviewMedia[];
  at: string; // ISO
  /** Moderation state — "hidden" reviews are kept but never shown to shoppers. */
  status?: "published" | "hidden";
}

export interface ReviewInput {
  orderId: string;
  productId: string;
  author: string;
  rating: number;
  comment?: string;
  media?: ReviewMedia[];
}

/** Merged rating for a product: seeded catalogue baseline + verified buyer reviews. */
export interface RatingSummary {
  rating: number;
  reviews: number;
}

const REVIEWS_KEY = "isak-store-reviews-v1";
const MAX_MEDIA_EACH = 1_500_000; // ~1.5 MB per file (data URL)

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

/* ------------------------------------------------------------------ */
/* Supabase persistence (public reviews)                               */
/* ------------------------------------------------------------------ */

interface ReviewRow {
  id: string;
  order_id: string;
  product_id: string;
  author: string;
  rating: number;
  comment: string | null;
  media: ReviewMedia[] | null;
  status: string | null;
  created_at: string;
}

function reviewFromRow(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    author: row.author,
    rating: row.rating,
    comment: row.comment ?? "",
    media: Array.isArray(row.media) ? (row.media as ReviewMedia[]) : [],
    status: row.status === "hidden" ? "hidden" : "published",
    at: row.created_at,
  };
}

function reviewToRow(r: ProductReview): Record<string, unknown> {
  return {
    id: r.id,
    order_id: r.orderId,
    product_id: r.productId,
    author: r.author,
    rating: r.rating,
    comment: r.comment || null,
    media: r.media ?? [],
    status: r.status ?? "published",
    created_at: r.at,
  };
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface ReviewContextValue {
  reviews: ProductReview[];
  /** Add a review — silently ignores duplicates (one review per order item). */
  addReview: (input: ReviewInput) => void;
  /** Admin moderation — patch an existing review (rating, comment, media, status…). */
  updateReview: (id: string, patch: Partial<Pick<ProductReview, "author" | "rating" | "comment" | "media" | "status">>) => void;
  /** Admin moderation — permanently remove a review. */
  deleteReview: (id: string) => void;
  /** Public list for a product — only published reviews. */
  reviewsForProduct: (productId: string) => ProductReview[];
  reviewForOrderItem: (orderId: string, productId: string) => ProductReview | undefined;
  /** Combined display rating = seeded catalogue base + verified reviews. */
  summaryForProduct: (product: Product) => RatingSummary;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<ProductReview[]>(() =>
    readJson(REVIEWS_KEY, SEED_REVIEWS as ProductReview[])
  );

  useEffect(() => writeJson(REVIEWS_KEY, reviews), [reviews]);

  /* ---------------- Supabase sync (public reviews) ---------------- */
  const hydratedRef = useRef(false);

  // Hydrate once on mount: merge DB reviews into the local (seed + offline)
  // list — the DB wins on collisions, seeds stay as the offline baseline.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) {
        hydratedRef.current = true;
        return;
      }
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .limit(300);
      if (!alive) return;
      if (!error && data && data.length > 0) {
        const rows = data as ReviewRow[];
        setReviews((prev) => {
          const byId = new Map<string, ProductReview>();
          for (const r of prev) byId.set(r.id, r);
          for (const r of rows) byId.set(r.id, reviewFromRow(r));
          return Array.from(byId.values()).sort((a, b) => (a.at < b.at ? 1 : -1));
        });
      }
      hydratedRef.current = true;
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Write-through: mirror any new review to Supabase (idempotent upsert).
  useEffect(() => {
    if (!hydratedRef.current || reviews.length === 0) return;
    const db = supabase;
    if (!db) return;
    void db
      .from("reviews")
      .upsert(reviews.slice(0, 100).map(reviewToRow), { onConflict: "id" })
      .then(
        () => undefined,
        () => undefined
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews, hydratedRef.current]);

  const addReview = useCallback((input: ReviewInput) => {
    setReviews((prev) => {
      if (prev.some((r) => r.orderId === input.orderId && r.productId === input.productId)) {
        return prev;
      }
      const review: ProductReview = {
        id: `rev-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
        orderId: input.orderId,
        productId: input.productId,
        author: sanitizeName(input.author) || "Verified buyer",
        rating: Math.min(5, Math.max(1, Math.round(input.rating))),
        comment: sanitizeText(input.comment ?? "", 600),
        media: (input.media ?? []).slice(0, 3),
        status: "published",
        at: new Date().toISOString(),
      };
      return [review, ...prev];
    });
  }, []);

  const updateReview = useCallback<ReviewContextValue["updateReview"]>((id, patch) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r };
        if (patch.author !== undefined) next.author = sanitizeName(patch.author) || r.author;
        if (patch.rating !== undefined) next.rating = Math.min(5, Math.max(1, Math.round(patch.rating)));
        if (patch.comment !== undefined) next.comment = sanitizeText(patch.comment, 600);
        if (patch.media !== undefined) next.media = patch.media.slice(0, 3);
        if (patch.status !== undefined) next.status = patch.status;
        return next;
      })
    );
    const db = supabase;
    if (db) {
      void db
        .from("reviews")
        .update({ status: patch.status ?? undefined, rating: patch.rating ?? undefined, comment: patch.comment !== undefined ? patch.comment || null : undefined, author: patch.author ?? undefined, media: patch.media ?? undefined })
        .eq("id", id)
        .then(
          () => undefined,
          () => undefined
        );
    }
  }, []);

  const deleteReview = useCallback((id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    const db = supabase;
    if (db) {
      void db
        .from("reviews")
        .delete()
        .eq("id", id)
        .then(
          () => undefined,
          () => undefined
        );
    }
  }, []);

  const reviewsForProduct = useCallback(
    (productId: string) =>
      reviews.filter((r) => r.productId === productId && r.status !== "hidden"),
    [reviews]
  );

  const reviewForOrderItem = useCallback(
    (orderId: string, productId: string) =>
      reviews.find((r) => r.orderId === orderId && r.productId === productId),
    [reviews]
  );

  const summaryForProduct = useCallback(
    (product: Product): RatingSummary => {
      const userReviews = reviews.filter(
        (r) => r.productId === product.id && r.status !== "hidden"
      );
      if (userReviews.length === 0) return { rating: product.rating, reviews: product.reviews };
      const baseValue = product.rating * product.reviews;
      const sum = userReviews.reduce((s, r) => s + r.rating, 0);
      const count = product.reviews + userReviews.length;
      return { rating: Math.round(((baseValue + sum) / count) * 10) / 10, reviews: count };
    },
    [reviews]
  );

  const value = useMemo<ReviewContextValue>(
    () => ({ reviews, addReview, updateReview, deleteReview, reviewsForProduct, reviewForOrderItem, summaryForProduct }),
    [reviews, addReview, updateReview, deleteReview, reviewsForProduct, reviewForOrderItem, summaryForProduct]
  );

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Media helpers                                                       */
/* ------------------------------------------------------------------ */

/** Resize + compress an image file to a small JPEG data URL (~< 500 KB). */
export function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a readable image."));
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("This browser cannot process images."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Read a small video file into a data URL (rejects anything over the cap). */
export function videoFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_MEDIA_EACH) {
      reject(new Error(`Video is too large — keep it under ${Math.round(MAX_MEDIA_EACH / 1e6)} MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that video."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function useReviews(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReviews must be used within ReviewProvider");
  return ctx;
}
import { useState } from "react";
import { Link } from "react-router-dom";
import { useConfig, type TickerItem } from "../context/ConfigContext";
import { cn } from "../lib/cn";

/**
 * Sticky "newsticker" bar fixed to the bottom of the viewport.
 * Content and pace come from the admin console (/admin/newsticker).
 *
 * - Lively marquee: the admin "seconds per lap" dial is halved (×0.5) so the
 *   bar glides at a snappy, readable pace out of the box.
 * - Single-line `whitespace-nowrap` layout — items never wrap, so nothing can
 *   spill past the bar height.
 * - Pauses on hover / keyboard focus so links stay clickable.
 * - Falls back to a static scrollable strip when the user prefers reduced motion.
 */
function chipFor(item: TickerItem): { text: string; cls: string } {
  if (item.labelStyle === "big_sale") {
    return {
      text: item.label?.trim() || "Big sale",
      cls: "bg-gradient-to-r from-red-500/35 to-rose-500/15 text-red-100 ring-red-400/50 shadow-[0_0_14px_-4px_rgb(239_68_68/0.65)]",
    };
  }
  if (item.labelStyle === "custom" && item.label?.trim()) {
    return {
      text: item.label.trim(),
      cls: "bg-white/10 text-on-primary/90 ring-white/25 shadow-[0_0_10px_-4px_rgb(255_255_255/0.4)] backdrop-blur-sm",
    };
  }
  return {
    text: "Featured",
    cls: "bg-gradient-to-r from-gold-400/30 to-gold-600/10 text-gold-100 ring-gold-400/45 shadow-[0_0_12px_-4px_oklch(0.8_0.108_245/0.7)]",
  };
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}

function TickerItemView({ item }: { item: TickerItem }) {
  const chip = chipFor(item);
  const content = (
    <>
      <span
        className={cn(
          "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1",
          chip.cls
        )}
      >
        {chip.text}
      </span>
      <span className="whitespace-nowrap text-sm font-medium text-on-primary/90">{item.text}</span>
      <Sparkle className="ml-1 h-3 w-3 shrink-0 text-gold-400/80" />
    </>
  );
  const className =
    "flex items-center gap-2.5 whitespace-nowrap rounded-md transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400";
  if (item.linkType === "product" && item.linkSlug) {
    return (
      <Link to={`/product/${item.linkSlug}`} className={className}>
        {content}
      </Link>
    );
  }
  if (item.linkType === "blog" && item.linkSlug) {
    return (
      <Link to={`/blog/${item.linkSlug}`} className={className}>
        {content}
      </Link>
    );
  }
  return <span className="flex items-center gap-2.5 whitespace-nowrap">{content}</span>;
}

export default function Newsticker() {
  const { ticker } = useConfig();
  const [reducedMotion] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      : false
  );

  const items = ticker.items.filter((i) => i.enabled && i.text.trim());
  if (!ticker.enabled || items.length === 0) return null;

  // Admin dial = seconds per lap; halve it so the bar always feels lively.
  const pace = Math.min(90, Math.max(10, ticker.speed || 24));
  const duration = Math.max(8, +(pace * 0.5).toFixed(1));

  return (
    <aside aria-label="Store announcements" className="fixed inset-x-0 bottom-0 z-40 print:hidden">
      <div className="relative overflow-hidden border-t border-primary-800/70 bg-gradient-to-r from-primary-950 via-primary-900/95 to-primary-950 pb-[env(safe-area-inset-bottom)] shadow-[0_-14px_34px_-18px_rgb(0_0_0/0.7)]">
        {/* Top accent line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/80 to-transparent"
        />
        {/* Soft glow wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 left-1/3 h-20 w-1/2 rounded-full bg-gold-400/10 blur-2xl"
        />

        <div className="relative mx-auto flex h-12 max-w-7xl items-center">
          {reducedMotion ? (
            <div className="no-scrollbar flex items-center gap-10 overflow-x-auto whitespace-nowrap px-4 text-sm">
              {items.map((it) => (
                <TickerItemView key={it.id} item={it} />
              ))}
            </div>
          ) : (
            <div className="group relative flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
              <div
                className="flex w-max animate-marquee items-center whitespace-nowrap will-change-transform group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
                style={{ animationDuration: `${duration}s` }}
              >
                {[0, 1].map((dup) => (
                  <div key={dup} aria-hidden={dup === 1} className="flex items-center gap-10">
                    {items.map((it) => (
                      <TickerItemView key={`${it.id}-${dup}`} item={it} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Link2,
  Lock,
  LogIn,
  Newspaper,
  Pencil,
  Plus,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useConfig, type TickerItem, type TickerLabelStyle } from "../context/ConfigContext";
import { useStore } from "../context/StoreContext";
import { usePageMeta } from "../hooks/usePageMeta";
import { cn } from "../lib/cn";

const LABEL_STYLES: { id: TickerLabelStyle; label: string; hint: string }[] = [
  { id: "featured", label: "Featured", hint: "Gold chip" },
  { id: "big_sale", label: "Big sale", hint: "Red chip" },
  { id: "custom", label: "Custom label", hint: "Write your own" },
];

function chipCls(style: TickerLabelStyle): string {
  if (style === "big_sale") return "bg-red-500/20 text-red-200 ring-red-400/40";
  if (style === "custom") return "bg-white/10 text-on-primary/85 ring-white/25";
  return "bg-gold-400/20 text-gold-200 ring-gold-400/40";
}

export default function NewstickerPage() {
  const { user, isAdmin, openAuth, signOut } = useAuth();

  usePageMeta({
    title: "Newsticker — Admin",
    description: "Configure the sticky announcement ticker shown at the bottom of the store.",
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/25 text-primary-200 ring-1 ring-primary-400/40">
          <Lock className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Owners only</h1>
        <p className="mt-2 text-foreground/60">
          The newsticker console manages the announcement bar at the bottom of the store. Sign in
          with the owner account to continue.
        </p>
        <button type="button" className="btn btn-primary mt-6" onClick={() => openAuth("signin")}>
          <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in to continue
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/20">
          <ShieldCheck className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">This area needs admin access</h1>
        <p className="mt-2 text-foreground/60">
          You&apos;re signed in as <strong>{user.name}</strong> ({user.email}) — a customer
          account. Ask the store owner for an admin account.
        </p>
        <button type="button" className="btn btn-outline mt-6" onClick={signOut}>
          Switch account
        </button>
      </div>
    );
  }

  return <NewstickerConsole />;
}

/* ------------------------------------------------------------------ */
/* Console                                                             */
/* ------------------------------------------------------------------ */

type Target = { kind: "blog" | "product"; slug: string; label: string };

function NewstickerConsole() {
  const { ticker, updateTicker, addTickerItem, updateTickerItem, deleteTickerItem, resetTicker } =
    useConfig();
  const { products } = useStore();
  const { posts } = useConfig();

  const [style, setStyle] = useState<TickerLabelStyle>("featured");
  const [customLabel, setCustomLabel] = useState("");
  const [text, setText] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [searchFor, setSearchFor] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const liveCount = ticker.items.filter((i) => i.enabled && i.text.trim()).length;

  const results = useMemo(() => {
    const q = searchFor.trim().toLowerCase();
    if (!q) return [];
    const blogHits = posts
      .filter((p) => p.published && `${p.title} ${p.slug}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((p) => ({ kind: "blog" as const, slug: p.slug, label: p.title }));
    const productHits = products
      .filter((p) => `${p.name} ${p.slug}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((p) => ({ kind: "product" as const, slug: p.slug, label: p.name }));
    return [...blogHits, ...productHits];
  }, [posts, products, searchFor]);

  function resetForm() {
    setStyle("featured");
    setCustomLabel("");
    setText("");
    setTarget(null);
    setEnabled(true);
    setSearchFor("");
    setEditingId(null);
    setNotice(null);
    setError(null);
  }

  function startEdit(it: TickerItem) {
    setEditingId(it.id);
    setStyle(it.labelStyle);
    setCustomLabel(it.label ?? "");
    setText(it.text);
    setTarget(
      it.linkType && it.linkSlug
        ? { kind: it.linkType, slug: it.linkSlug, label: it.linkSlug }
        : null
    );
    setEnabled(it.enabled);
    setNotice(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Give the announcement some copy.");
      return;
    }
    if (style === "custom" && !customLabel.trim()) {
      setError("Custom labels need chip text — e.g. “Tip of the week”.");
      return;
    }
    if (editingId) {
      updateTickerItem(editingId, {
        labelStyle: style,
        label: style === "custom" ? customLabel.trim() : undefined,
        text: text.trim(),
        linkType: target?.kind,
        linkSlug: target?.slug,
        enabled,
      });
      setNotice("Announcement updated — the ticker reflects it right now.");
    } else {
      addTickerItem({
        labelStyle: style,
        label: style === "custom" ? customLabel.trim() : undefined,
        text: text.trim(),
        linkType: target?.kind,
        linkSlug: target?.slug,
        enabled,
      });
      setNotice("Announcement added — scroll down to see it on the live ticker.");
    }
    resetForm();
  }

  function remove(id: string) {
    deleteTickerItem(id);
    setConfirming(null);
    setNotice("Announcement removed from the ticker.");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-10 shadow-soft sm:px-10 sm:py-12">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold-400/15 blur-3xl" aria-hidden="true" />
        <p className="eyebrow">Store front</p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          Newsticker
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 sm:text-base">
          The slim announcement bar pinned to the bottom of every page. Add content, link it to a
          product or a journal post, and set the scroll speed — changes apply to the live bar
          instantly (it&apos;s running at the bottom of this very page).
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/25 bg-gold-100/60 px-3 py-1 text-xs font-bold text-gold-200">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {ticker.enabled ? `${liveCount} of ${ticker.items.length} items live` : "Bar hidden"} ·{" "}
            {Math.max(8, Math.round(ticker.speed * 0.5))}s per lap
          </span>
          <Link to="/admin" className="btn btn-outline ml-auto !px-4 !py-2 text-sm">
            Back to the admin console
          </Link>
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-6 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-200">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {/* Settings: visibility + speed */}
      <div className="card mt-6 space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold">Ticker settings</h2>
            <p className="text-xs text-foreground/55">Turn the bar on or off and set the scroll speed.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-3 py-1.5 text-xs font-bold text-foreground/70">
            <Radio className="h-3.5 w-3.5 text-gold-300" aria-hidden="true" />
            {ticker.enabled ? "LIVE on the site" : "Off"}
          </span>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-foreground/80">
          <input
            type="checkbox"
            checked={ticker.enabled}
            onChange={(e) => updateTicker({ enabled: e.target.checked })}
            className="h-4 w-4 accent-gold-500"
          />
          Show the newsticker at the bottom of every page
        </label>

        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="field-label !mb-0">Scroll speed</span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-foreground/70">
              {Math.max(8, Math.round(ticker.speed * 0.5))}s per lap
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={ticker.speed}
            onChange={(e) => updateTicker({ speed: Number(e.target.value) })}
            className="mt-3 w-full accent-gold-500"
            aria-label="Ticker scroll speed in seconds per lap"
          />
          <div className="mt-1 flex justify-between text-[11px] font-semibold text-foreground/45">
            <span>Turbo (8s)</span>
            <span className="text-gold-300/90">— default ≈ 12s lap —</span>
            <span>Slow (45s)</span>
          </div>
          <p className="mt-1 text-xs text-foreground/50">
            A “lap” is one full pass of the bar. Higher = calmer. The bar also pauses whenever you
            hover or focus it, and stops moving entirely for visitors who prefer reduced motion.
          </p>
        </div>
      </div>

      {/* Add / edit form */}
      <form
        onSubmit={submit}
        className="card mt-6 space-y-4 p-5"
        aria-label={editingId ? "Edit announcement" : "Add an announcement"}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold">
            {editingId ? "Edit announcement" : "Add an announcement"}
          </h2>
          {editingId && (
            <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={resetForm}>
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel edit
            </button>
          )}
        </div>

        <div>
          <span className="field-label">Label style</span>
          <div role="radiogroup" aria-label="Label style" className="flex flex-wrap gap-2">
            {LABEL_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={style === s.id}
                className={`chip !py-1.5 text-xs ${style === s.id ? "chip-active" : ""}`}
                onClick={() => setStyle(s.id)}
              >
                {s.label}
                <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1", chipCls(s.id))}>
                  {s.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {style === "custom" && (
            <div>
              <label htmlFor="nt-label" className="field-label">Chip text *</label>
              <input
                id="nt-label"
                className="input"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Tip of the week"
              />
            </div>
          )}
          <div className={style === "custom" ? "" : "sm:col-span-2"}>
            <label htmlFor="nt-text" className="field-label">Announcement *</label>
            <input
              id="nt-text"
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Mid-season sale — up to 30% off tables & ball sets"
            />
          </div>
        </div>

        <div>
          <span className="field-label">Link (optional)</span>
          <div className="flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="Link target" className="flex flex-wrap gap-2">
              {(
                [
                  [null, "No link"],
                  ["blog", "Blog post"],
                  ["product", "Product"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={(target?.kind ?? null) === mode}
                  className={`chip !py-1.5 text-xs ${(target?.kind ?? null) === mode ? "chip-active" : ""}`}
                  onClick={() => {
                    setTarget(mode === null ? null : { kind: mode, slug: "", label: "" });
                    setSearchFor("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {target && (
              <button
                type="button"
                className="btn btn-ghost !h-9 !px-3 !py-1.5 text-xs"
                onClick={() => {
                  setTarget(null);
                  setSearchFor("");
                }}
                aria-label="Clear link"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear
              </button>
            )}
          </div>

          {target && (
            <div className="mt-3">
              <label htmlFor="nt-search" className="field-label">
                Search {target.kind === "blog" ? "journal posts" : "products"}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
                <input
                  id="nt-search"
                  className="input !pl-9"
                  value={searchFor}
                  onChange={(e) => setSearchFor(e.target.value)}
                  placeholder={target.kind === "blog" ? "Type a post title or slug…" : "Type a product name or slug…"}
                />
              </div>

              {searchFor.trim() && (
                <ul className="mt-2 max-h-56 divide-y divide-border overflow-auto rounded-xl border border-border bg-white/5">
                  {results.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-foreground/55">
                      Nothing matches “{searchFor.trim()}” — try fewer words.
                    </li>
                  ) : (
                    results.map((r) => (
                      <li key={`${r.kind}-${r.slug}`}>
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-white/10"
                          onClick={() => {
                            setTarget(r);
                            setSearchFor("");
                          }}
                        >
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ring-1",
                              r.kind === "blog" ? "bg-gold-400/20 text-gold-200 ring-gold-400/40" : "bg-primary-400/20 text-primary-200 ring-primary-400/40"
                            )}
                          >
                            {r.kind === "blog" ? "Blog" : "Product"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground/85">{r.label}</span>
                            <span className="block truncate text-xs text-foreground/45">/{r.kind === "blog" ? "blog" : "product"}/{r.slug}</span>
                          </span>
                          <Plus className="h-4 w-4 shrink-0 text-foreground/40" aria-hidden="true" />
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}

              {target && target.slug ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary-200">
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Links to /{target.kind}/{target.slug}
                </p>
              ) : (
                searchFor.trim() === "" && (
                  <p className="mt-2 text-xs text-foreground/50">
                    Pick something above to make the announcement clickable.
                  </p>
                )
              )}
            </div>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-foreground/80">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 accent-gold-500"
          />
          Live on the ticker
        </label>

        <div className="flex gap-3 border-t border-border pt-4">
          <button type="submit" className="btn btn-primary">
            {editingId ? <><Check className="h-4 w-4" aria-hidden="true" /> Save announcement</> : <><Plus className="h-4 w-4" aria-hidden="true" /> Add to ticker</>}
          </button>
        </div>
      </form>

      {/* Live preview */}
      <div className="card mt-6 overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-heading text-lg font-bold">Live preview</h2>
            <p className="text-xs text-foreground/55">
              The real bar below this page — this is what visitors see, at your speed.
            </p>
          </div>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-foreground/55">
            {liveCount} visible
          </span>
        </div>
        <div className="flex h-11 items-center gap-10 overflow-hidden border-b border-border bg-primary-950 px-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          {liveCount === 0 ? (
            <p className="text-sm text-on-primary/60">No live items — the bar is hidden until you add one.</p>
          ) : (
            ticker.items
              .filter((i) => i.enabled && i.text.trim())
              .map((it) => (
                <span key={it.id} className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-sm">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ring-1", chipCls(it.labelStyle))}>
                    {it.labelStyle === "custom" && it.label ? it.label : it.labelStyle === "big_sale" ? "Big sale" : "Featured"}
                  </span>
                  <span className="font-medium text-on-primary/90">{it.text}</span>
                </span>
              ))
          )}
        </div>
      </div>

      {/* Items list */}
      {ticker.items.length === 0 ? (
        <div className="card mt-6 px-5 py-14 text-center">
          <Newspaper className="mx-auto h-10 w-10 text-foreground/25" aria-hidden="true" />
          <p className="mt-4 font-heading text-lg font-bold">Nothing on the ticker yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
            Add your first announcement above — or restore the defaults and tweak from there.
          </p>
          <button
            type="button"
            className="btn btn-outline mt-5"
            onClick={() => {
              resetTicker();
              setNotice("Back to the default newsticker line-up.");
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restore defaults
          </button>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-2">
          {ticker.items.map((it) => (
            <li key={it.id} className={`flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center ${it.enabled ? "" : "opacity-70"}`}>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.14em] ring-1", chipCls(it.labelStyle))}>
                {it.labelStyle === "custom" && it.label?.trim()
                  ? it.label.trim().slice(0, 14)
                  : it.labelStyle === "big_sale"
                    ? "Big sale"
                    : "Featured"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground/90">{it.text}</p>
                {it.linkType && it.linkSlug ? (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-foreground/50">
                    <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                    /{it.linkType === "blog" ? "blog" : "product"}/{it.linkSlug}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-foreground/45">No link</p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={it.enabled}
                    onChange={(e) => updateTickerItem(it.id, { enabled: e.target.checked })}
                    className="h-4 w-4 accent-gold-500"
                  />
                  {it.enabled ? "Live" : "Paused"}
                </label>
                <button
                  type="button"
                  className="btn btn-ghost !px-3 !py-1.5 text-xs"
                  onClick={() => startEdit(it)}
                  aria-label={`Edit ${it.text}`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                </button>
                {confirming === it.id ? (
                  <>
                    <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={() => remove(it.id)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                    </button>
                    <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive"
                    onClick={() => setConfirming(it.id)}
                    aria-label={`Delete ${it.text}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Reset */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {confirmReset ? (
          <>
            <span className="text-sm font-semibold text-destructive">Replace the ticker with the defaults?</span>
            <button
              type="button"
              className="btn btn-primary !px-3.5 !py-2 text-xs"
              onClick={() => {
                resetTicker();
                setConfirmReset(false);
                setNotice("Newsticker restored to the default line-up.");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Yes, restore
            </button>
            <button type="button" className="btn btn-ghost !px-3 !py-2 text-xs" onClick={() => setConfirmReset(false)}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost !py-2 text-sm text-foreground/60" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset to default line-up
          </button>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-foreground/45">
        <Radio className="h-3.5 w-3.5" aria-hidden="true" />
        Ticker content and speed sync to your Supabase database and show on every page across
        devices instantly.
      </p>
    </div>
  );
}
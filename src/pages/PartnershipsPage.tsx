import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  ImagePlus,
  Lock,
  LogIn,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useConfig, type PartnerConfig } from "../context/ConfigContext";
import { sanitizeUrl } from "../lib/security";
import { usePageMeta } from "../hooks/usePageMeta";

/**
 * Logo assets available for the homepage "In partnership with" strip.
 * Kept in sync with public/sponsors/*.svg — the admin can also paste a
 * custom URL instead of picking one of these.
 */
const LOGO_ASSETS = [
  "/sponsors/jakarta-billiards-league.svg",
  "/sponsors/kipas-kuning-sport.svg",
  "/sponsors/senayan-billiard-hall.svg",
  "/sponsors/liga-9ball-indonesia.svg",
  "/sponsors/predator.svg",
  "/sponsors/murrey.svg",
  "/sponsors/aramith.svg",
];

const assetName = (src: string) => src.split("/").pop() ?? src;

function isValidLink(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith("/") && !t.startsWith("//")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function PartnershipsPage() {
  const { user, isAdmin, openAuth, signOut } = useAuth();

  usePageMeta({
    title: "Manage partnerships — Admin",
    description: "Configure the partner logos shown on the homepage.",
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/25 text-primary-200 ring-1 ring-primary-400/40">
          <Lock className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Owners only</h1>
        <p className="mt-2 text-foreground/60">
          The partnerships console manages the partner strip on the homepage. Sign in with the
          owner account to continue.
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

  return <PartnershipsConsole />;
}

/* ------------------------------------------------------------------ */
/* Console                                                             */
/* ------------------------------------------------------------------ */

function PartnershipsConsole() {
  const { partners, addPartner, updatePartner, deletePartner, movePartner, resetPartners } =
    useConfig();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [logoMode, setLogoMode] = useState<"asset" | "custom" | "none">("asset");
  const [asset, setAsset] = useState(LOGO_ASSETS[0]);
  const [custom, setCustom] = useState("");
  const [active, setActive] = useState(true);
  const [main, setMain] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formImage = logoMode === "custom" ? custom.trim() : logoMode === "asset" ? asset : "";

  function resetForm() {
    setName("");
    setUrl("");
    setLogoMode("asset");
    setAsset(LOGO_ASSETS[0]);
    setCustom("");
    setActive(true);
    setMain(false);
    setEditingId(null);
    setNotice(null);
    setError(null);
  }

  function startEdit(p: PartnerConfig) {
    const image = p.image ?? "";
    const isAsset = LOGO_ASSETS.includes(image);
    setEditingId(p.id);
    setName(p.name);
    setUrl(p.url);
    setLogoMode(isAsset ? "asset" : image ? "custom" : "none");
    setAsset(isAsset ? image : LOGO_ASSETS[0]);
    setCustom(isAsset || !image ? "" : image);
    setActive(p.active);
    setMain(p.isMain);
    setNotice(null);
    setError(null);
  }

  function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give the partner a name.");
      return;
    }
    if (!isValidLink(url)) {
      setError("Enter a valid link — https://… or a site path like /page/about.");
      return;
    }
    const patch = {
      name: name.trim(),
      url: url.trim(),
      image: formImage || "",
      active,
      isMain: main,
    };
    if (editingId) {
      updatePartner(editingId, patch);
      setNotice(`"${patch.name}" updated — the homepage strip reflects it instantly.`);
    } else {
      addPartner(patch);
      setNotice(`"${patch.name}" is live on the homepage.`);
    }
    resetForm();
  }

  function remove(p: PartnerConfig) {
    deletePartner(p.id);
    setConfirming(null);
    setNotice(`"${p.name}" removed from the homepage.`);
  }

  const activeCount = partners.filter((p) => p.active).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-10 shadow-soft sm:px-10 sm:py-12">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold-400/15 blur-3xl" aria-hidden="true" />
        <p className="eyebrow">Partnerships</p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          Partners &amp; sponsorship
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 sm:text-base">
          Manage the &ldquo;In partnership with&rdquo; logos on the homepage. Add, edit, reorder or
          pause partners, and mark which ones are <strong>main sponsors</strong> — their big logo
          sits at the top of the strip. Changes go live instantly and sync to your database.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/25 bg-gold-100/60 px-3 py-1 text-xs font-bold text-gold-200">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {activeCount} of {partners.length} partner{partners.length === 1 ? "" : "s"} live
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

      {/* Add / edit form */}
      <form
        onSubmit={save}
        className="card mt-6 space-y-4 p-5"
        aria-label={editingId ? "Edit partner" : "Add a partner"}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold">
            {editingId ? "Edit partner" : "Add a partner"}
          </h2>
          {editingId && (
            <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={resetForm}>
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel edit
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pt-name" className="field-label">Name *</label>
            <input
              id="pt-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Predator Cues"
            />
          </div>
          <div>
            <label htmlFor="pt-url" className="field-label">Link *</label>
            <input
              id="pt-url"
              type="url"
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
            <p className="mt-1 text-xs text-foreground/50">Opens in a new tab from the homepage pill.</p>
          </div>
          <div className="sm:col-span-2">
            <span className="field-label">Logo</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-border">
                {formImage ? (
                  <img src={formImage} alt="" aria-hidden="true" className="h-full w-full object-contain" />
                ) : (
                  <span aria-hidden="true" className="h-full w-full rounded-full bg-gradient-to-br from-gold-300 to-gold-600" />
                )}
              </span>

              <div role="radiogroup" aria-label="Logo source" className="flex flex-wrap gap-2">
                {(
                  [
                    ["asset", "Built-in logo"],
                    ["custom", "Custom URL"],
                    ["none", "No logo (gold dot)"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={logoMode === mode}
                    className={`chip !py-1.5 text-xs ${logoMode === mode ? "chip-active" : ""}`}
                    onClick={() => setLogoMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {logoMode === "asset" && (
                <select
                  aria-label="Built-in partner logo"
                  className="input !w-auto !py-2 text-sm"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                >
                  {LOGO_ASSETS.map((src) => (
                    <option key={src} value={src}>{assetName(src)}</option>
                  ))}
                </select>
              )}
              {logoMode === "custom" && (
                <input
                  aria-label="Custom logo URL"
                  className="input !w-72 !py-2 text-sm"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="https://… or /path/to/logo.svg"
                />
              )}
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-foreground/80">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Live on the homepage
        </label>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-foreground/80">
          <input
            type="checkbox"
            checked={main}
            onChange={(e) => setMain(e.target.checked)}
            className="h-4 w-4 accent-gold-500"
          />
          Main sponsor — big logo at the top of the homepage strip
        </label>

        <div className="flex gap-3 border-t border-border pt-4">
          <button type="submit" className="btn btn-primary">
            {editingId ? <><Check className="h-4 w-4" aria-hidden="true" /> Save partner</> : <><Plus className="h-4 w-4" aria-hidden="true" /> Add partner</>}
          </button>
        </div>
      </form>

      {/* Live preview */}
      <div className="card mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold">Homepage preview</h2>
            <p className="text-xs text-foreground/55">
              Exactly how the strip appears under the hero — order and the active toggle apply here.
            </p>
          </div>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-foreground/55">
            {activeCount} visible
          </span>
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-white/5 p-4">
          <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-foreground/45">
            In partnership with
          </p>
          {activeCount === 0 ? (
            <p className="py-4 text-center text-sm text-foreground/50">
              No live partners — the strip is hidden on the homepage until you add one.
            </p>
          ) : (
            <ul className="flex flex-wrap items-center justify-center gap-3">
              {partners.filter((p) => p.active).map((p) => (
                <li key={p.id}>
                  <span className="flex items-center gap-2.5 rounded-full border border-border bg-surface-2 py-1.5 pl-1.5 pr-5 shadow-soft">
                    {p.image ? (
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white p-1 ring-1 ring-border">
                        <img src={p.image} alt="" aria-hidden="true" className="h-full w-full object-contain" />
                      </span>
                    ) : (
                      <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-gold-300 to-gold-600" aria-hidden="true" />
                    )}
                    <span className="font-heading text-sm font-bold text-foreground/80">{p.name}</span>
                    {p.isMain && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" title="Main sponsor" aria-hidden="true" />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Partner list */}
      {partners.length === 0 ? (
        <div className="card mt-6 px-5 py-14 text-center">
          <Megaphone className="mx-auto h-10 w-10 text-foreground/25" aria-hidden="true" />
          <p className="mt-4 font-heading text-lg font-bold">No partners yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
            Add the first partner above and it appears on the homepage strip instantly — or
            restore the default line-up.
          </p>
          <button
            type="button"
            className="btn btn-outline mt-5"
            onClick={() => {
              resetPartners();
              setNotice("Back to the default partner line-up.");
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restore defaults
          </button>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-2">
          {partners.map((p, i) => (
            <li
              key={p.id}
              className={`flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center ${p.active ? "" : "opacity-70"}`}
            >
              <span className="w-6 shrink-0 text-center font-heading text-sm font-bold text-foreground/40">
                {i + 1}
              </span>
              {p.image ? (
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-border">
                  <img src={p.image} alt="" aria-hidden="true" className="h-full w-full object-contain" />
                </span>
              ) : (
                <span className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-gold-300 to-gold-600" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-heading text-sm font-bold">{p.name}</span>
                  {p.isMain && (
                    <span className="rounded-full bg-gold-400/15 px-2 py-0.5 text-[11px] font-bold text-gold-200 ring-1 ring-gold-400/30">
                      Main sponsor
                    </span>
                  )}
                  {!p.active && (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-bold text-foreground/50">paused</span>
                  )}
                </p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-foreground/55">
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{sanitizeUrl(p.url, "#")}</span>
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="btn btn-ghost !h-9 !w-9 !px-0"
                  disabled={i === 0}
                  onClick={() => movePartner(p.id, -1)}
                  aria-label={`Move ${p.name} left`}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost !h-9 !w-9 !px-0"
                  disabled={i === partners.length - 1}
                  onClick={() => movePartner(p.id, 1)}
                  aria-label={`Move ${p.name} right`}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={p.active}
                    onChange={(e) => updatePartner(p.id, { active: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  {p.active ? "Live" : "Paused"}
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-gold-200" title="Feature as main sponsor — big logo up top">
                  <input
                    type="checkbox"
                    checked={p.isMain}
                    onChange={(e) => updatePartner(p.id, { isMain: e.target.checked })}
                    className="h-4 w-4 accent-gold-500"
                  />
                  Main
                </label>
                <button
                  type="button"
                  className="btn btn-ghost !px-3 !py-1.5 text-xs"
                  onClick={() => startEdit(p)}
                  aria-label={`Edit ${p.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                </button>
                {confirming === p.id ? (
                  <>
                    <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={() => remove(p)}>
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
                    onClick={() => setConfirming(p.id)}
                    aria-label={`Delete ${p.name}`}
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
            <span className="text-sm font-semibold text-destructive">Replace the line-up with the defaults?</span>
            <button
              type="button"
              className="btn btn-primary !px-3.5 !py-2 text-xs"
              onClick={() => {
                resetPartners();
                setConfirmReset(false);
                setNotice("Partnerships restored to the default line-up.");
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
        <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
        Added, edited and reordered partners sync to your Supabase database and appear on the
        homepage across devices instantly.
      </p>
    </div>
  );
}
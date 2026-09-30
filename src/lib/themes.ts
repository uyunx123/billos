/**
 * Theme & layout system — ISAK Billiard Co.
 *
 * The house palette is defined as Tailwind v4 `@theme` tokens in `src/index.css`
 * (compiled to CSS custom properties on `:root`). This module ships alternative
 * palettes and layout settings that override those tokens at runtime by setting
 * `data-theme`, `data-width` and `data-radius` attributes on `<html>`.
 * The matching CSS lives in `src/theme.css` (imported after `index.css`).
 *
 * Store owners can switch palettes and layout live from the admin console
 * (Configuration → Theme & layout). Selections persist to localStorage and,
 * when Supabase is configured, to the `app_config` table (configId "theme")
 * via the manage-config Edge Function — so the look follows the store across
 * devices and browsers.
 */

export type ThemeId = "cobalt" | "emerald" | "ruby" | "violet" | "amber" | "graphite" | "custom";
export type LayoutWidth = "standard" | "compact" | "wide";
export type CornerRadius = "rounded" | "sharp" | "pill";

/** Four brand colours behind the "Custom" palette. Everything else (shade ramps,
 *  surfaces, borders, glow accents) is derived from these automatically. */
export interface CustomColors {
  primary: string; // buttons, links, highlights
  accent: string; // CTAs, prices, glow moments
  deep: string; // page background family
  surface: string; // card background
}

export interface ThemeState {
  palette: ThemeId;
  width: LayoutWidth;
  radius: CornerRadius;
  custom?: CustomColors;
}

export const CUSTOM_DEFAULT_COLORS: CustomColors = {
  primary: "#3f63d4",
  accent: "#5c8df5",
  deep: "#16233f",
  surface: "#20293f",
};

export interface ThemePalette {
  id: ThemeId;
  name: string;
  tagline: string;
  /** Literal display colours for the admin swatch preview (independent of the live theme). */
  swatch: { primary: string; deep: string; accent: string; surface: string };
  /** CSS custom property overrides applied via `[data-theme="…"]` in theme.css. */
  overrides: Record<string, string>;
}

export const DEFAULT_THEME_STATE: ThemeState = { palette: "cobalt", width: "standard", radius: "rounded" };

/* ------------------------------------------------------------------ */
/* Palettes                                                            */
/* ------------------------------------------------------------------ */

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: "cobalt",
    name: "Cobalt",
    tagline: "House hue — deep table-blue with azure glow",
    swatch: { primary: "#3f63d4", deep: "#16233f", accent: "#5c8df5", surface: "#20293f" },
    overrides: {}, // the default @theme palette in index.css
  },
  {
    id: "emerald",
    name: "Emerald",
    tagline: "Tournament-green with a teal accent",
    swatch: { primary: "#12a06e", deep: "#0d2f23", accent: "#14c8a8", surface: "#1e332a" },
    overrides: {
      "--color-primary-50": "oklch(0.96 0.03 165)",
      "--color-primary-100": "oklch(0.93 0.05 166)",
      "--color-primary-200": "oklch(0.88 0.08 167)",
      "--color-primary-300": "oklch(0.81 0.105 168)",
      "--color-primary-400": "oklch(0.72 0.13 167)",
      "--color-primary-500": "oklch(0.65 0.15 166)",
      "--color-primary-600": "oklch(0.56 0.14 164)",
      "--color-primary-700": "oklch(0.48 0.12 163)",
      "--color-primary-800": "oklch(0.4 0.1 162)",
      "--color-primary-900": "oklch(0.33 0.08 162)",
      "--color-primary-950": "oklch(0.26 0.06 161)",
      "--color-gold-100": "oklch(0.955 0.03 175)",
      "--color-gold-200": "oklch(0.92 0.06 176)",
      "--color-gold-300": "oklch(0.87 0.09 177)",
      "--color-gold-400": "oklch(0.8 0.12 178)",
      "--color-gold-500": "oklch(0.73 0.14 176)",
      "--color-gold-600": "oklch(0.64 0.13 174)",
      "--color-gold-700": "oklch(0.55 0.11 172)",
      "--color-secondary": "oklch(0.62 0.09 172)",
      "--color-background": "oklch(0.19 0.02 168)",
      "--color-surface": "oklch(0.235 0.025 168)",
      "--color-surface-2": "oklch(0.282 0.03 168)",
      "--color-foreground": "oklch(0.955 0.012 170)",
      "--color-muted": "oklch(0.73 0.03 168)",
      "--color-border": "oklch(0.36 0.03 168)",
    },
  },
  {
    id: "ruby",
    name: "Ruby",
    tagline: "Burgundy felt with champagne accents",
    swatch: { primary: "#c13a4e", deep: "#2e1118", accent: "#e8b14c", surface: "#2f1c20" },
    overrides: {
      "--color-primary-50": "oklch(0.965 0.02 22)",
      "--color-primary-100": "oklch(0.935 0.045 22)",
      "--color-primary-200": "oklch(0.885 0.07 22)",
      "--color-primary-300": "oklch(0.81 0.1 23)",
      "--color-primary-400": "oklch(0.71 0.13 24)",
      "--color-primary-500": "oklch(0.63 0.15 24)",
      "--color-primary-600": "oklch(0.55 0.15 25)",
      "--color-primary-700": "oklch(0.47 0.13 25)",
      "--color-primary-800": "oklch(0.4 0.11 25)",
      "--color-primary-900": "oklch(0.33 0.09 26)",
      "--color-primary-950": "oklch(0.26 0.07 26)",
      "--color-gold-100": "oklch(0.955 0.03 70)",
      "--color-gold-200": "oklch(0.92 0.05 72)",
      "--color-gold-300": "oklch(0.865 0.08 73)",
      "--color-gold-400": "oklch(0.795 0.11 74)",
      "--color-gold-500": "oklch(0.72 0.13 75)",
      "--color-gold-600": "oklch(0.63 0.12 76)",
      "--color-gold-700": "oklch(0.54 0.11 78)",
      "--color-secondary": "oklch(0.62 0.09 70)",
      "--color-background": "oklch(0.19 0.025 20)",
      "--color-surface": "oklch(0.235 0.028 20)",
      "--color-surface-2": "oklch(0.282 0.032 20)",
      "--color-foreground": "oklch(0.955 0.015 60)",
      "--color-muted": "oklch(0.73 0.03 60)",
      "--color-border": "oklch(0.36 0.03 20)",
    },
  },
  {
    id: "violet",
    name: "Violet",
    tagline: "Midnight purple with a fuchsia shimmer",
    swatch: { primary: "#7a4dd8", deep: "#221a3d", accent: "#d45cc6", surface: "#29203f" },
    overrides: {
      "--color-primary-50": "oklch(0.96 0.03 300)",
      "--color-primary-100": "oklch(0.93 0.05 296)",
      "--color-primary-200": "oklch(0.885 0.08 294)",
      "--color-primary-300": "oklch(0.81 0.11 292)",
      "--color-primary-400": "oklch(0.715 0.14 291)",
      "--color-primary-500": "oklch(0.64 0.16 290)",
      "--color-primary-600": "oklch(0.56 0.15 288)",
      "--color-primary-700": "oklch(0.48 0.13 286)",
      "--color-primary-800": "oklch(0.4 0.11 284)",
      "--color-primary-900": "oklch(0.33 0.09 282)",
      "--color-primary-950": "oklch(0.26 0.07 280)",
      "--color-gold-100": "oklch(0.955 0.03 320)",
      "--color-gold-200": "oklch(0.92 0.05 322)",
      "--color-gold-300": "oklch(0.865 0.08 324)",
      "--color-gold-400": "oklch(0.795 0.115 326)",
      "--color-gold-500": "oklch(0.72 0.14 328)",
      "--color-gold-600": "oklch(0.63 0.13 330)",
      "--color-gold-700": "oklch(0.54 0.12 332)",
      "--color-secondary": "oklch(0.62 0.1 300)",
      "--color-background": "oklch(0.19 0.03 292)",
      "--color-surface": "oklch(0.235 0.035 292)",
      "--color-surface-2": "oklch(0.282 0.04 292)",
      "--color-foreground": "oklch(0.955 0.015 300)",
      "--color-muted": "oklch(0.73 0.035 296)",
      "--color-border": "oklch(0.36 0.04 292)",
    },
  },
  {
    id: "amber",
    name: "Amber",
    tagline: "Classic gold club-room with ember highlights",
    swatch: { primary: "#d69e2e", deep: "#2b2312", accent: "#e8733f", surface: "#2e2a20" },
    overrides: {
      "--color-primary-50": "oklch(0.97 0.025 95)",
      "--color-primary-100": "oklch(0.94 0.05 92)",
      "--color-primary-200": "oklch(0.89 0.08 88)",
      "--color-primary-300": "oklch(0.82 0.11 85)",
      "--color-primary-400": "oklch(0.73 0.14 82)",
      "--color-primary-500": "oklch(0.66 0.15 80)",
      "--color-primary-600": "oklch(0.58 0.14 75)",
      "--color-primary-700": "oklch(0.5 0.12 70)",
      "--color-primary-800": "oklch(0.42 0.1 65)",
      "--color-primary-900": "oklch(0.35 0.08 60)",
      "--color-primary-950": "oklch(0.27 0.06 55)",
      "--color-gold-100": "oklch(0.955 0.03 40)",
      "--color-gold-200": "oklch(0.92 0.06 42)",
      "--color-gold-300": "oklch(0.86 0.09 44)",
      "--color-gold-400": "oklch(0.79 0.12 46)",
      "--color-gold-500": "oklch(0.71 0.14 48)",
      "--color-gold-600": "oklch(0.62 0.14 50)",
      "--color-gold-700": "oklch(0.53 0.13 52)",
      "--color-secondary": "oklch(0.62 0.09 80)",
      "--color-background": "oklch(0.19 0.02 70)",
      "--color-surface": "oklch(0.235 0.025 70)",
      "--color-surface-2": "oklch(0.282 0.03 70)",
      "--color-foreground": "oklch(0.955 0.015 90)",
      "--color-muted": "oklch(0.73 0.03 80)",
      "--color-border": "oklch(0.36 0.03 70)",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    tagline: "Steel-grey minimal with an ice accent",
    swatch: { primary: "#8b93a7", deep: "#181c26", accent: "#9fb4d9", surface: "#222634" },
    overrides: {
      "--color-primary-50": "oklch(0.965 0.008 250)",
      "--color-primary-100": "oklch(0.935 0.012 252)",
      "--color-primary-200": "oklch(0.89 0.018 253)",
      "--color-primary-300": "oklch(0.82 0.025 254)",
      "--color-primary-400": "oklch(0.73 0.035 255)",
      "--color-primary-500": "oklch(0.66 0.04 256)",
      "--color-primary-600": "oklch(0.58 0.04 258)",
      "--color-primary-700": "oklch(0.5 0.035 260)",
      "--color-primary-800": "oklch(0.42 0.03 262)",
      "--color-primary-900": "oklch(0.34 0.025 264)",
      "--color-primary-950": "oklch(0.27 0.02 266)",
      "--color-gold-100": "oklch(0.955 0.02 240)",
      "--color-gold-200": "oklch(0.92 0.04 242)",
      "--color-gold-300": "oklch(0.865 0.06 244)",
      "--color-gold-400": "oklch(0.795 0.09 246)",
      "--color-gold-500": "oklch(0.72 0.11 248)",
      "--color-gold-600": "oklch(0.63 0.1 250)",
      "--color-gold-700": "oklch(0.54 0.09 252)",
      "--color-secondary": "oklch(0.62 0.05 252)",
      "--color-background": "oklch(0.19 0.012 264)",
      "--color-surface": "oklch(0.235 0.015 264)",
      "--color-surface-2": "oklch(0.282 0.018 264)",
      "--color-foreground": "oklch(0.955 0.006 250)",
      "--color-muted": "oklch(0.73 0.02 252)",
      "--color-border": "oklch(0.36 0.02 264)",
    },
  },
  {
    id: "custom",
    name: "Custom",
    tagline: "Your brand colours — pick any primary, accent and surfaces",
    swatch: { primary: CUSTOM_DEFAULT_COLORS.primary, deep: CUSTOM_DEFAULT_COLORS.deep, accent: CUSTOM_DEFAULT_COLORS.accent, surface: CUSTOM_DEFAULT_COLORS.surface },
    overrides: {}, // handled dynamically by applyThemeState() below
  },
];

export const THEME_BY_ID = Object.fromEntries(THEME_PALETTES.map((p) => [p.id, p])) as Record<ThemeId, ThemePalette>;

/* ------------------------------------------------------------------ */
/* Layout options                                                      */
/* ------------------------------------------------------------------ */

export const WIDTH_OPTIONS: { id: LayoutWidth; label: string; hint: string }[] = [
  { id: "compact", label: "Compact", hint: "~72rem — tighter content column" },
  { id: "standard", label: "Standard", hint: "~80rem — the default page width" },
  { id: "wide", label: "Wide", hint: "~90rem — maxed-out showroom" },
];

export const RADIUS_OPTIONS: { id: CornerRadius; label: string; hint: string }[] = [
  { id: "sharp", label: "Sharp", hint: "Small corners, crisp edges" },
  { id: "rounded", label: "Rounded", hint: "Soft corners — the default" },
  { id: "pill", label: "Pill", hint: "Extra-round, friendly panels" },
];

/* ------------------------------------------------------------------ */
/* Apply                                                               */
/* ------------------------------------------------------------------ */

/** All CSS custom properties the "Custom" palette may set — cleared
 *  whenever a preset palette is active so attribute rules take over. */
export const CUSTOM_VAR_KEYS: string[] = [
  "--color-primary-50", "--color-primary-100", "--color-primary-200", "--color-primary-300",
  "--color-primary-400", "--color-primary-500", "--color-primary-600", "--color-primary-700",
  "--color-primary-800", "--color-primary-900", "--color-primary-950",
  "--color-primary", "--color-primary-strong",
  "--color-gold-100", "--color-gold-200", "--color-gold-300", "--color-gold-400",
  "--color-gold-500", "--color-gold-600", "--color-gold-700",
  "--color-accent", "--color-accent-soft", "--color-secondary",
  "--color-background", "--color-surface", "--color-surface-2",
  "--color-foreground", "--color-muted", "--color-border",
];

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { h: 224, s: 0.62, l: 0.55 }; // safe cobalt-ish fallback
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Derive a full 50→950 shade ramp from a single hex (treated as the 500 shade). */
function shadeRamp(hex: string): Record<string, string> {
  const { h, s, l } = hexToHsl(hex);
  const light: [string, number][] = [
    ["50", 0.965], ["100", 0.93], ["200", 0.88], ["300", 0.82], ["400", 0.73],
    ["500", Math.min(0.72, Math.max(0.32, l))],
    ["600", Math.max(0.24, Math.min(0.62, l * 0.86))],
    ["700", Math.max(0.2, Math.min(0.52, l * 0.72))],
    ["800", Math.max(0.17, Math.min(0.42, l * 0.59))],
    ["900", Math.max(0.14, Math.min(0.34, l * 0.48))],
    ["950", Math.max(0.11, Math.min(0.27, l * 0.38))],
  ];
  const out: Record<string, string> = {};
  for (const [step, lightness] of light) {
    const sMult = Number(step) <= 200 ? 0.7 : Number(step) >= 800 ? 0.85 : 1;
    out[`--color-primary-${step}`] = hslToHex(h, Math.max(0, Math.min(1, s * sMult)), lightness);
  }
  return out;
}

/** CSS custom-property map for the "Custom" palette (ramps + surfaces). */
export function customOverrides(state: ThemeState): Record<string, string> {
  const c = state.custom ?? CUSTOM_DEFAULT_COLORS;
  const primaryRamp = shadeRamp(c.primary);
  const accentRamp = shadeRamp(c.accent);
  const { h: ph, s: ps } = hexToHsl(c.primary);
  const deep = hexToHsl(c.deep);
  const surface = hexToHsl(c.surface);

  const gold: Record<string, string> = {};
  (["100", "200", "300", "400", "500", "600", "700"] as const).forEach((step) => {
    gold[`--color-gold-${step}`] = accentRamp[`--color-primary-${step}`] ?? c.accent;
  });

  const deepL = Math.min(0.28, Math.max(0.12, deep.l));
  const surfaceL = Math.min(0.3, Math.max(deep.l, surface.l));

  return {
    ...primaryRamp,
    "--color-primary": primaryRamp["--color-primary-500"] ?? c.primary,
    "--color-primary-strong": primaryRamp["--color-primary-600"] ?? c.primary,
    ...gold,
    "--color-accent": gold["--color-gold-500"] ?? c.accent,
    "--color-accent-soft": gold["--color-gold-300"] ?? c.accent,
    "--color-secondary": gold["--color-gold-500"] ?? c.accent,
    "--color-background": hslToHex(deep.h, deep.s, deepL * 0.82),
    "--color-surface": hslToHex(surface.h, surface.s, surfaceL * 0.9),
    "--color-surface-2": hslToHex(surface.h, surface.s, Math.min(0.42, surfaceL * 1.06)),
    "--color-foreground": hslToHex(ph, Math.min(0.06, ps * 0.4), 0.955),
    "--color-muted": hslToHex(ph, Math.min(0.08, ps * 0.5), 0.73),
    "--color-border": hslToHex(deep.h, deep.s, Math.min(0.38, deepL * 1.4)),
  };
}

export function applyThemeState(state: ThemeState): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", state.palette);
  root.setAttribute("data-width", state.width);
  root.setAttribute("data-radius", state.radius);

  // Inline styles beat the attribute rules in theme.css — clear them first,
  // then apply the custom ramp when the Custom palette is active.
  for (const key of CUSTOM_VAR_KEYS) root.style.removeProperty(key);
  if (state.palette === "custom") {
    const vars = customOverrides(state);
    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
  }
}

export function paletteLabel(id: ThemeId): string {
  return THEME_BY_ID[id]?.name ?? id;
}
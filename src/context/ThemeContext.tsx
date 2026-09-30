import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME_STATE,
  applyThemeState,
  type CornerRadius,
  type CustomColors,
  type LayoutWidth,
  type ThemeId,
  type ThemeState,
} from "../lib/themes";
import { getThemeConfig, saveThemeConfig } from "../lib/integrationsApi";

/**
 * Theme & layout context.
 *
 * Reads the saved theme (localStorage, then the server-side `app_config`
 * record when Supabase is reachable), applies it to `<html>` via
 * `data-theme` / `data-width` / `data-radius` attributes, and lets the
 * admin console switch palettes, page width and corner radius live.
 * Every change is saved back to localStorage immediately and synced to
 * Supabase (best-effort — never blocks or errors the UI).
 */

const STORAGE_KEY = "isak.theme.v1";

interface ThemeContextValue {
  theme: ThemeState;
  setPalette: (id: ThemeId) => void;
  setWidth: (w: LayoutWidth) => void;
  setRadius: (r: CornerRadius) => void;
  setCustomColors: (c: CustomColors) => void;
  reset: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readLocal(): ThemeState {
  if (typeof window === "undefined") return DEFAULT_THEME_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeState>;
      return { ...DEFAULT_THEME_STATE, ...parsed };
    }
  } catch {
    /* corrupted storage — fall through to defaults */
  }
  return DEFAULT_THEME_STATE;
}

function writeLocal(state: ThemeState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full/blocked — the live theme still applies for this visit */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeState>(readLocal);

  // Apply to <html> + persist locally + best-effort server sync.
  useEffect(() => {
    applyThemeState(theme);
    writeLocal(theme);
    void saveThemeConfig({ ...theme }).catch(() => {});
  }, [theme]);

  // On mount, pull the server-side theme (shared across devices) if present.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await getThemeConfig();
        if (cancelled) return;
        const patch: Partial<ThemeState> = {};
        if (typeof remote.palette === "string") patch.palette = remote.palette as ThemeId;
        if (typeof remote.width === "string") patch.width = remote.width as LayoutWidth;
        if (typeof remote.radius === "string") patch.radius = remote.radius as CornerRadius;
        if (remote.custom && typeof remote.custom === "object") {
          const c = remote.custom as Partial<CustomColors>;
          if (
            typeof c.primary === "string" &&
            typeof c.accent === "string" &&
            typeof c.deep === "string" &&
            typeof c.surface === "string"
          ) {
            patch.custom = { primary: c.primary, accent: c.accent, deep: c.deep, surface: c.surface };
          }
        }
        if (Object.keys(patch).length > 0) {
          setTheme((prev) => ({ ...prev, ...patch }));
        }
      } catch {
        /* no server config (or Supabase not connected) — local choice stands */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // All callbacks are top-level hooks — never call hooks inside useMemo/useEffect.
  const setPalette = useCallback((palette: ThemeId) => setTheme((t) => ({ ...t, palette })), []);
  const setWidth = useCallback((width: LayoutWidth) => setTheme((t) => ({ ...t, width })), []);
  const setRadius = useCallback((radius: CornerRadius) => setTheme((t) => ({ ...t, radius })), []);
  // Custom colours only apply while the Custom palette is selected; the admin
  // panel calls setPalette("custom") separately when the Custom card is chosen.
  const setCustomColors = useCallback((custom: CustomColors) => setTheme((t) => ({ ...t, custom })), []);
  const reset = useCallback(() => setTheme(DEFAULT_THEME_STATE), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setPalette, setWidth, setRadius, setCustomColors, reset }),
    [theme, setPalette, setWidth, setRadius, setCustomColors, reset]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
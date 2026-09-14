import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingCart,
  Sparkles,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";
import { useConfig } from "../context/ConfigContext";
import { formatIDR } from "../lib/format";
import { CATEGORIES } from "../data/products";
import { BRAND_LOGO } from "../lib/logo";

export function BrandMark({
  className = "h-10 w-10",
  imgClassName = "h-full w-full object-contain",
}: {
  className?: string;
  imgClassName?: string;
}) {
  const { logo } = useConfig();
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 shadow-lift ring-1 ring-primary/10 ${className}`}
    >
      <img src={logo || BRAND_LOGO} alt="ISAK Billiard Co. logo" className={imgClassName} />
    </span>
  );
}

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/blog", label: "Journal" },
  { to: "/contact", label: "Contact" },
];

export default function Header() {
  const { count } = useCart();
  const { user, isAdmin, openAuth, signOut } = useAuth();
  const { settings } = useStore();
  const { siteConfig } = useConfig();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const initials = user
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-40 print:hidden">
      {/* Announcement bar — collapses on scroll so the nav stays compact */}
      <div
        className={`relative overflow-hidden bg-gradient-to-r from-primary-950 via-primary-800 to-primary-950 text-on-primary transition-all duration-300 ${
          scrolled ? "max-h-0 opacity-0" : "max-h-12 opacity-100"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 nav-grid opacity-40" aria-hidden="true" />
        <p className="relative mx-auto flex max-w-7xl items-center justify-center gap-2.5 overflow-hidden px-4 py-2 text-center text-[11px] font-semibold tracking-wide sm:text-xs">
          <Sparkles className="hidden h-3.5 w-3.5 shrink-0 text-gold-300 sm:block" aria-hidden="true" />
          <span className="min-w-0 truncate">
            {siteConfig.announcement.replace("{threshold}", formatIDR(settings.freeShippingThreshold))}
          </span>
        </p>
      </div>

      {/* Main bar */}
      <div
        className={`transition-all duration-300 ${
          scrolled
            ? "border-b border-border/70 bg-background/85 shadow-[0_12px_32px_-18px_oklch(0.24_0.05_150/0.45)] backdrop-blur-xl"
            : "border-b border-transparent bg-background/70 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:gap-4 sm:px-6">
          <Link to="/" className="group flex min-w-0 items-center gap-2.5" aria-label="ISAK Billiard Co. home">
            <BrandMark className="h-9 w-9 shrink-0 transition-transform duration-200 group-hover:scale-105 sm:h-10 sm:w-10" />
            <span className="flex flex-col leading-none">
              <span className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
                ISAK<span className="text-accent">.</span>
              </span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.3em] text-foreground/40">
                Billiard Co.
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `nav-link rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                    isActive ? "active text-primary-200" : "text-foreground/70 hover:text-gold-300"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={`Account menu for ${user.name}`}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-2 py-1 pl-1 pr-2.5 shadow-soft transition-all duration-150 hover:border-primary/40 hover:shadow-md sm:pr-3"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-[11px] font-extrabold text-on-primary">
                    {initials}
                  </span>
                  <span className="hidden max-w-[7.5rem] truncate text-sm font-bold text-foreground sm:block">
                    {user.name.split(" ")[0]}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-foreground/50 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    aria-label="Account"
                    className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-background shadow-lift"
                  >
                    <div className="border-b border-border px-4 py-3">
                      <p className="font-heading text-sm font-bold">{user.name}</p>
                      <p className="mt-0.5 truncate text-xs text-foreground/55">{user.email}</p>
                      {isAdmin && (
                        <span className="mt-1.5 inline-flex rounded-full bg-tokopedia/10 px-2 py-0.5 text-[10px] font-bold text-tokopedia">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="p-1.5">
                      <Link
                        to="/orders"
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-white/5 hover:text-gold-300"
                      >
                        <Package className="h-4 w-4 text-foreground/45" aria-hidden="true" /> My orders
                      </Link>
                      <Link
                        to="/profile"
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-white/5 hover:text-gold-300"
                      >
                        <UserRound className="h-4 w-4 text-foreground/45" aria-hidden="true" /> My profile
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          role="menuitem"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-white/5 hover:text-gold-300"
                        >
                          <LayoutDashboard className="h-4 w-4 text-foreground/45" aria-hidden="true" /> Admin console
                        </Link>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={signOut}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuth("signup")}
                  className="btn btn-outline hidden !px-4 !py-2 text-sm lg:inline-flex"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" /> Create account
                </button>
                <button
                  type="button"
                  onClick={() => openAuth("signin")}
                  className="btn btn-primary min-h-11 min-w-11 !gap-1.5 !px-2.5 text-sm min-[400px]:!px-4"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden min-[400px]:inline">Sign in</span>
                </button>
              </>
            )}
            <Link
              to="/shop"
              aria-label="Search products"
              className="btn btn-ghost min-h-11 min-w-11 !px-2 sm:min-h-0 sm:min-w-0 sm:!px-3"
            >
              <Search className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
            </Link>
            <Link
              to="/cart"
              className="relative btn btn-ghost min-h-11 min-w-11 !px-2 sm:min-h-0 sm:min-w-0 sm:!px-3"
              aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
            >
              <ShoppingCart className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 px-1 text-[11px] font-bold text-primary-950 shadow-gold">
                  {count}
                </span>
              )}
            </Link>
            <button
              type="button"
              className="btn btn-ghost min-h-11 min-w-11 !px-2 md:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden" id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 z-40 bg-primary-950/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-[19rem] max-w-[85vw] flex-col overflow-hidden rounded-r-3xl bg-background shadow-lift">
            <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 to-primary-900 px-5 pb-5 pt-5 text-on-primary">
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gold-400/20 blur-2xl" aria-hidden="true" />
              <div className="relative flex items-center justify-between">
                <span className="font-heading text-base font-bold">Menu</span>
                <button
                  type="button"
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-on-primary/10 transition-colors hover:bg-on-primary/20"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {NAV_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                        isActive ? "bg-primary-400/15 text-primary-200" : "text-foreground/80 hover:bg-white/5"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {link.label}
                        {isActive && <ChevronRight className="h-4 w-4 text-gold-300" aria-hidden="true" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
              <p className="mb-2 mt-6 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-foreground/45">
                Categories
              </p>
              <nav className="flex flex-col gap-1" aria-label="Categories">
                {CATEGORIES.map((c) => (
                  <Link
                    key={c.id}
                    to={`/shop?category=${c.id}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-foreground/75 transition-colors hover:bg-white/5 hover:text-gold-300"
                  >
                    {c.name}
                    <ChevronRight className="h-3.5 w-3.5 text-foreground/30" aria-hidden="true" />
                  </Link>
                ))}
              </nav>
            </div>

            <div className="border-t border-border bg-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-1 pb-1">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-sm font-extrabold text-on-primary">
                      {initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{user.name}</span>
                      <span className="block truncate text-xs text-foreground/55">{user.email}</span>
                    </span>
                  </div>
                  <Link to="/orders" className="btn btn-outline w-full !py-2.5 text-sm">
                    <Package className="h-4 w-4" aria-hidden="true" /> My orders
                  </Link>
                  <Link to="/profile" className="btn btn-outline w-full !py-2.5 text-sm">
                    <UserRound className="h-4 w-4" aria-hidden="true" /> My profile
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="btn btn-outline w-full !py-2.5 text-sm">
                      <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Admin console
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={signOut}
                    className="btn btn-ghost w-full !py-2.5 text-sm text-destructive"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      openAuth("signin");
                    }}
                    className="btn btn-primary w-full !py-2.5 text-sm"
                  >
                    <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      openAuth("signup");
                    }}
                    className="btn btn-outline w-full !py-2.5 text-sm"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden="true" /> Create account
                  </button>
                  <Link to="/shop" className="btn btn-accent w-full !py-2.5 text-sm">
                    Shop the collection
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
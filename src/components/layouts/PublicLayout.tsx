import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, User as UserIcon, Trophy, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui";
import { cn } from "../../lib/cn";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/brackets", label: "Brackets" },
  { to: "/schedule", label: "Schedule" },
  { to: "/live", label: "Live" },
  { to: "/players", label: "Players" },
  { to: "/faq", label: "FAQ" },
];

export function PublicLayout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="CueSports home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-heading text-lg font-extrabold tracking-tight">
              Cue<span className="text-primary">Sports</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer",
                    isActive
                      ? "bg-surface-2 text-foreground"
                      : "text-muted hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {profile ? (
              <>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                    Admin
                  </Button>
                )}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 cursor-pointer transition-colors duration-150 hover:border-primary/50"
                  aria-label="My account"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    {profile.name?.[0]?.toUpperCase() ?? <UserIcon className="h-4 w-4" />}
                  </span>
                  <span className="text-sm font-medium">{profile.name}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                  Sign in
                </Button>
                <Button size="sm" onClick={() => navigate("/register")}>
                  Register
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="rounded-md p-2 text-muted cursor-pointer hover:text-foreground md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile drawer */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-background shadow-xl transition-transform duration-250 md:hidden",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
        >
          <div className="flex h-16 items-center justify-between px-4">
            <span className="font-heading text-lg font-extrabold">Menu</span>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="rounded-md p-2 text-muted cursor-pointer hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-3" aria-label="Mobile primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={closeMenu}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors duration-150",
                    isActive ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {profile ? (
              <>
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    onClick={closeMenu}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-muted cursor-pointer hover:text-foreground"
                  >
                    Admin area
                  </NavLink>
                )}
                <NavLink
                  to="/profile"
                  onClick={closeMenu}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-muted cursor-pointer hover:text-foreground"
                >
                  My account
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    signOut();
                  }}
                  className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-destructive cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={closeMenu}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-muted cursor-pointer hover:text-foreground"
                >
                  Sign in
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={closeMenu}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-primary cursor-pointer"
                >
                  Register
                </NavLink>
              </>
            )}
          </nav>
        </div>
        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={closeMenu}
            aria-hidden="true"
          />
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted sm:flex-row">
          <p className="font-heading font-bold text-foreground">
            Cue<span className="text-primary">Sports</span>{" "}
            <span className="font-normal text-muted">— tournament management for cue sports</span>
          </p>
          <p>Pool · Snooker · English Billiards · Carom</p>
        </div>
      </footer>
    </div>
  );
}
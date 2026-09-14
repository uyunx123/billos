import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarRange,
  ClipboardList,
  Dices,
  Eraser,
  FileSpreadsheet,
  Flag,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MonitorPlay,
  PanelLeft,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/cn";

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/admin/matches", label: "Matches", icon: ListChecks },
  { to: "/admin/schedule", label: "Schedule", icon: CalendarRange },
  { to: "/admin/scorer", label: "Live scoring", icon: MonitorPlay },
  { to: "/admin/scoring-sheet", label: "Scoring sheets", icon: FileSpreadsheet },
  { to: "/admin/players", label: "Players", icon: Users },
  { to: "/admin/disciplines", label: "Disciplines", icon: Dices },
  { to: "/admin/geography", label: "Geography", icon: Flag },
  { to: "/admin/tables", label: "Tables", icon: PanelLeft },
  { to: "/admin/users", label: "Users", icon: ShieldCheck },
  { to: "/admin/tv", label: "TV screens", icon: MonitorPlay },
  { to: "/admin/api", label: "API", icon: KeyRound },
  { to: "/admin/faq", label: "FAQ", icon: ClipboardList },
  { to: "/admin/clear", label: "Clear data", icon: Eraser },
];

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin min-h-screen bg-background text-foreground">
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
          <AdminSidebarContent onNavigate={() => setSidebarOpen(false)} />
        </aside>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-surface shadow-xl">
              <div className="flex justify-end p-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close menu"
                  className="rounded-md p-1.5 text-muted cursor-pointer hover:bg-surface-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <AdminSidebarContent onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md p-2 text-muted cursor-pointer hover:bg-surface-2 lg:hidden"
                aria-label="Open menu"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link to="/" className="text-sm font-medium text-muted hover:text-foreground">
                View public site →
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  {profile?.name?.[0]?.toUpperCase() ?? "?"}
                </span>
                <span className="text-sm font-medium">{profile?.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  navigate("/");
                }}
                aria-label="Sign out"
                className="rounded-md p-2 text-muted cursor-pointer hover:bg-surface-2 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function AdminSidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const { profile } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
          <Trophy className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-heading text-sm font-extrabold leading-tight">CueSports</p>
          <p className="text-xs text-muted">Admin console</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Admin navigation">
        {adminNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item && item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors duration-150",
                isActive
                  ? "bg-primary text-on-primary"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )
            }
          >
            <item.icon className="h-4.5 w-4.5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted">
        <CalendarRange className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
        Logged in as <span className="font-semibold text-foreground">{profile?.role}</span>
      </div>
    </div>
  );
}
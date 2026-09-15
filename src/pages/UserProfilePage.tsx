import { Link } from "react-router-dom";
import {
  CalendarDays,
  LogIn,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Truck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePageMeta } from "../hooks/usePageMeta";

const ROLE_LABEL = { owner: "Store owner", admin: "Admin", customer: "Member" } as const;

export default function UserProfilePage() {
  const { user, isAdmin, openAuth } = useAuth();

  usePageMeta({
    title: "My profile — ISAK Billiard Co.",
    description: "Your account details, addresses and member info at ISAK Billiard Co.",
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/25 text-primary-700 ring-1 ring-primary-400/40">
          <UserRound className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Sign in to view your profile</h1>
        <p className="mt-2 text-foreground/60">
          Your profile keeps your phone, addresses and member details ready for a faster
          checkout next time.
        </p>
        <button type="button" className="btn btn-primary mt-6" onClick={() => openAuth("signin")}>
          <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in to continue
        </button>
      </div>
    );
  }

  const joined = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(user.createdAt)
  );

  const rows = [
    {
      icon: UserRound,
      label: "Full name",
      value: user.name,
    },
    {
      icon: Mail,
      label: "Email",
      value: user.email,
      href: `mailto:${user.email}`,
    },
    {
      icon: Phone,
      label: "Phone / WhatsApp",
      value: user.phone || "Not set yet",
      href: user.phone ? `tel:${user.phone.replace(/[^\d+]/g, "")}` : undefined,
    },
    {
      icon: MapPin,
      label: "Billing address",
      value: user.address || "Not set yet",
    },
    {
      icon: Truck,
      label: "Shipping address",
      value: user.shippingAddress || (user.address ? "Same as billing address" : "Not set yet"),
    },
    {
      icon: CalendarDays,
      label: "Member since",
      value: joined,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-10 shadow-soft sm:px-10">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold-400/15 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-xl font-extrabold text-on-primary shadow-lift ring-2 ring-gold-400/40">
              {user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="eyebrow">My profile</p>
              <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                {user.name}
              </h1>
              <p className="mt-1 text-sm text-foreground/60">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary-700 ring-1 ring-primary/30">
                {ROLE_LABEL[user.role]}
              </span>
            )}
            <Link to="/profile/edit" className="btn btn-primary">
              <Pencil className="h-4 w-4" aria-hidden="true" /> Manage &amp; edit profile
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {rows.map((row) => {
          const Wrapper = row.href ? "a" : "div";
          return (
            <div key={row.label} className="card p-5">
              <Wrapper
                {...(row.href ? { href: row.href, className: "block" } : { className: "block" })}
              >
                <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary-700">
                  <row.icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/45">
                  {row.label}
                </p>
                <p className="mt-1 font-heading font-bold leading-snug">{row.value}</p>
              </Wrapper>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link to="/orders" className="btn btn-outline flex-1">
          <Package className="h-4 w-4" aria-hidden="true" /> Track my orders
        </Link>
        <Link to="/profile/edit" className="btn btn-accent flex-1">
          <Pencil className="h-4 w-4" aria-hidden="true" /> Edit details &amp; password
        </Link>
      </div>
    </div>
  );
}
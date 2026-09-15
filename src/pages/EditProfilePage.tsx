import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  KeyRound,
  Loader2,
  LogIn,
  MapPin,
  Phone,
  Truck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePageMeta } from "../hooks/usePageMeta";

export default function EditProfilePage() {
  const { user, openAuth, updateUser, updatePassword } = useAuth();

  usePageMeta({
    title: "Edit profile — ISAK Billiard Co.",
    description: "Update your name, phone, addresses and password.",
  });

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [shippingAddress, setShippingAddress] = useState(user?.shippingAddress ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/25 text-primary-700 ring-1 ring-primary-400/40">
          <UserRound className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Sign in to edit your profile</h1>
        <p className="mt-2 text-foreground/60">You need to be signed in to change your details.</p>
        <button type="button" className="btn btn-primary mt-6" onClick={() => openAuth("signin")}>
          <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in to continue
        </button>
      </div>
    );
  }

  const isOwnerAccount = user.role === "owner";
  // Aliased so the (narrowed) account is visible inside the submit closures.
  const account = user;

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setProfileBusy(true);
    // Owner's name/email are protected by the auth layer — still allow the rest.
    const patch: { name: string; phone: string; address: string; shippingAddress: string } = {
      name,
      phone,
      address,
      shippingAddress,
    };
    const result = updateUser(account.id, patch);
    setProfileBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't save your profile — try again.");
      return;
    }
    setNotice("Profile saved — changes are live.");
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    setPasswordBusy(true);
    const result = await updatePassword(account.id, currentPassword, newPassword);
    setPasswordBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't change your password — try again.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setNotice("Password changed — use it next time you sign in.");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/profile" className="btn btn-ghost -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to my profile
      </Link>

      <div className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-10 shadow-soft sm:px-10">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold-400/15 blur-3xl" aria-hidden="true" />
        <p className="eyebrow">Account settings</p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Manage your profile
        </h1>
        <p className="mt-3 max-w-lg text-foreground/65 sm:text-base">
          Update your name, phone and addresses — saved to this browser so checkout stays
          one tap faster. You can also change your password below.
        </p>
      </div>

      {notice && (
        <p role="status" className="mt-6 flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary-700">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {/* Profile details */}
      <form onSubmit={saveProfile} className="card mt-6 space-y-5 p-6" noValidate>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary-700">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold">Profile details</h2>
            <p className="text-xs text-foreground/55">
              {isOwnerAccount ? "Owner accounts keep their protected name & email." : "These appear on your orders and speed up checkout."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="ep-name" className="field-label">Full name (username)</label>
            <input
              id="ep-name"
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isOwnerAccount}
              autoComplete="name"
              placeholder="e.g. Bima Saputra"
            />
            {isOwnerAccount && (
              <p className="mt-1 text-xs text-foreground/50">The demo owner name is fixed to keep the console stable.</p>
            )}
          </div>
          <div>
            <label htmlFor="ep-phone" className="field-label">Phone / WhatsApp</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
              <input
                id="ep-phone"
                type="tel"
                className="input pl-9"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="08xx…"
              />
            </div>
          </div>
          <div>
            <label htmlFor="ep-address" className="field-label">Billing address</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-foreground/40" aria-hidden="true" />
              <input
                id="ep-address"
                className="input pl-9"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                placeholder="Street, district, city"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ep-shipping" className="field-label">Shipping address</label>
            <div className="relative">
              <Truck className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-foreground/40" aria-hidden="true" />
              <textarea
                id="ep-shipping"
                rows={2}
                className="input resize-none pl-9"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Leave empty to use the billing address at checkout"
              />
            </div>
            <p className="mt-1 text-xs text-foreground/50">
              If blank, your billing address is used when placing orders.
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-border pt-4">
          <button type="submit" className="btn btn-primary" disabled={profileBusy}>
            {profileBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            Save profile
          </button>
        </div>
      </form>

      {/* Password */}
      <form onSubmit={savePassword} className="card mt-6 space-y-5 p-6" noValidate>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-100 text-gold-700">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold">Change password</h2>
            <p className="text-xs text-foreground/55">Verify your current password, then set a new one (min. 6 characters).</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ep-current" className="field-label">Current password</label>
            <input
              id="ep-current"
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="ep-new" className="field-label">New password</label>
            <input
              id="ep-new"
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="ep-confirm" className="field-label">Confirm new password</label>
            <input
              id="ep-confirm"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-border pt-4">
          <button type="submit" className="btn btn-primary" disabled={passwordBusy}>
            {passwordBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            Update password
          </button>
        </div>
      </form>
    </div>
  );
}
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Info,
  Landmark,
  Loader2,
  MapPin,
  QrCode,
  ShoppingBag,
  Ticket,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useStore, shippingRate } from "../context/StoreContext";
import { useGateways } from "../context/GatewayContext";
import { useAuth } from "../context/AuthContext";
import { useCoupons, normalizeCode } from "../context/CouponContext";
import { INDONESIA_REGIONS, citiesOfProvince } from "../data/regions";
import { createPaymentRedirect } from "../lib/payments";
import { usePageMeta } from "../hooks/usePageMeta";
import { formatIDR } from "../lib/format";

// Fallback icons for commonly used gateway ids — custom gateways get a wallet icon.
const GATEWAY_ICONS: Record<string, typeof QrCode> = {
  qris: QrCode,
  va: Landmark,
  ewallet: Wallet,
  card: CreditCard,
  bank_transfer: Landmark,
  cod: Wallet,
  midtrans: Wallet,
  xendit: Landmark,
  stripe: CreditCard,
};

// Leaflet is heavy — only load it when the customer opens the map.
const AddressMapPicker = lazy(() => import("../components/AddressMapPicker"));

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  province: string;
  city: string;
  postal: string;
  lat?: number;
  lng?: number;
}

export default function CheckoutPage() {
  const { lines, subtotal } = useCart();
  const { products, shippingMethods, settings, placeOrder } = useStore();
  const { checkoutGateways } = useGateways();
  const { user, openAuth } = useAuth();
  const { evaluate, claim } = useCoupons();
  const activeGateways = checkoutGateways;
  const [carrier, setCarrier] = useState<string>(shippingMethods.find((m) => m.active)?.id ?? "");
  // Deterministic default: prefer Bank transfer (the store's primary manual method),
  // then fall back to the first active gateway so checkout never starts unselected.
  const [payment, setPayment] = useState<string>(() => {
    const preferred = checkoutGateways.find((g) => g.id === "bank_transfer");
    return (preferred ?? checkoutGateways[0])?.id ?? "";
  });
  // Tracks whether the customer picked a method themselves. The initializer above
  // can only see the moment-of-mount list (still the localStorage/fallback list
  // while the DB gateways load), so we re-settle the default once the real list
  // arrives — but an explicit choice is never overridden.
  const paymentTouched = useRef(false);
  useEffect(() => {
    if (paymentTouched.current) return;
    const preferred =
      checkoutGateways.find((g) => g.id === "bank_transfer") ?? checkoutGateways[0];
    if (!preferred) return;
    setPayment((prev) => (prev === preferred.id ? prev : preferred.id));
  }, [checkoutGateways]);
  const [form, setForm] = useState<FormState>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    address: "",
    province: "",
    city: "",
    postal: "",
  });
  const [showMap, setShowMap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  usePageMeta({
    title: "Checkout — ISAK Billiard Co.",
    description: "Secure checkout for your billiard gear — province, city and delivery details in a few taps.",
  });

  const weightKg = lines.reduce((sum, l) => {
    const p = products.find((prod) => prod.id === l.productId);
    return sum + ((p?.weightGrams ?? 0) * l.qty) / 1000;
  }, 0);

  const selected = shippingMethods.find((m) => m.id === carrier && m.active);
  // Every line flagged "ships free" → the whole delivery is free, no minimum.
  const allFreeShip =
    lines.length > 0 && lines.every((l) => products.find((p) => p.id === l.productId)?.freeShipping);
  const shipping =
    lines.length === 0 || !selected
      ? 0
      : subtotal >= settings.freeShippingThreshold || allFreeShip
        ? 0
        : shippingRate(selected, Math.max(weightKg, 1));
  const shippingLabel = subtotal >= settings.freeShippingThreshold || allFreeShip ? "Free" : formatIDR(shipping);

  // Live coupon evaluation — recomputes as the basket, email or code changes.
  const appliedEval = useMemo(() => {
    if (!appliedCode) return null;
    return evaluate(appliedCode, subtotal, form.email.trim() || user?.email || undefined);
  }, [appliedCode, subtotal, form.email, user?.email, evaluate]);
  const discount = appliedEval?.ok ? appliedEval.discount : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleApplyCoupon() {
    const code = normalizeCode(couponInput);
    if (!code) return;
    const res = evaluate(code, subtotal, form.email.trim() || undefined);
    if (res.ok && res.coupon) {
      setAppliedCode(res.coupon.code);
      setCouponInput("");
      setCouponMsg({ kind: "ok", text: `${res.coupon.code} applied — ${formatIDR(res.discount)} off your order.` });
    } else {
      setCouponMsg({ kind: "error", text: res.error ?? "That code didn't work." });
    }
  }

  function handleRemoveCoupon() {
    setAppliedCode(null);
    setCouponInput("");
    setCouponMsg(null);
  }

  function handleMapPick(pick: {
    lat: number;
    lng: number;
    label?: string;
    province?: string;
    city?: string;
    postalCode?: string;
  }) {
    let province = form.province;
    if (pick.province) {
      const exact = INDONESIA_REGIONS.find(
        (p) => p.name.toLowerCase() === pick.province!.toLowerCase()
      );
      const fuzzy = exact ??
        INDONESIA_REGIONS.find((p) =>
          p.name.toLowerCase().includes(pick.province!.toLowerCase()) ||
          pick.province!.toLowerCase().includes(p.name.toLowerCase())
        );
      if (fuzzy) province = fuzzy.name;
    }
    set("lat", pick.lat);
    set("lng", pick.lng);
    if (province) set("province", province);
    if (pick.city && !form.city) set("city", pick.city);
    if (pick.postalCode && !form.postal) set("postal", pick.postalCode);
    if (pick.label && !form.address) set("address", pick.label);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setError("Please add your name, phone and email so we can confirm the order.");
      return;
    }
    if (!form.address.trim() || !form.province || !form.city.trim()) {
      setError("Tell us where to deliver — street address, province and city are required.");
      return;
    }
    if (!selected) {
      setError("Pick a courier first.");
      return;
    }
    if (activeGateways.length === 0) {
      setError("No payment methods are active right now — please try again shortly.");
      return;
    }
    // Final coupon check with the customer's real email (per-user usage limit).
    if (appliedCode) {
      const check = evaluate(appliedCode, subtotal, form.email.trim());
      if (!check.ok) {
        setError(check.error ?? "That coupon no longer applies to this order.");
        return;
      }
    }
    setError(null);
    setPlacing(true);
    const order = placeOrder({
      email: form.email.trim() || undefined,
      customer: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      province: form.province,
      city: form.city.trim(),
      postalCode: form.postal.trim() || undefined,
      lat: form.lat,
      lng: form.lng,
      carrier: selected.name,
      payment: activeGateways.find((g) => g.id === payment)?.name ?? payment,
      paymentMethodId: payment,
      shipping,
      discount,
      couponCode: appliedCode ?? undefined,
      lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
    });
    // Record the coupon use against this order's email (released on refund/cancel).
    if (appliedCode && form.email.trim()) claim(appliedCode, form.email.trim(), order.id);
    const chosen = activeGateways.find((g) => g.id === payment);
    // Manual methods (bank transfer / QRIS / COD) show the instructions page
    // directly — no hosted gateway redirect. API gateways go to Midtrans (or
    // the built-in demo page when no provider is configured).
    if (chosen && (chosen.type === "manual" || chosen.type === "cod")) {
      const returnUrl = `${window.location.origin}/checkout/complete?order=${encodeURIComponent(order.id)}`;
      window.location.href = `/gateway/${encodeURIComponent(order.id)}?return=${encodeURIComponent(returnUrl)}`;
      return;
    }
    // Auto-redirect to the payment gateway (Midtrans live, or the demo page).
    const redirect = await createPaymentRedirect(order);
    window.location.href = redirect.url;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/25 text-primary-200 ring-1 ring-primary-400/40">
          <ShoppingBag className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Nothing to check out</h1>
        <p className="mt-2 text-foreground/60">Your bag is empty — rack up some gear first.</p>
        <Link to="/shop" className="btn btn-accent mt-6">Back to shop</Link>
      </div>
    );
  }

  const steps = [
    { label: "Bag", done: true },
    { label: "Shipping & payment", active: true },
    { label: "Confirmation" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/cart" className="btn btn-ghost -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to bag
      </Link>

      {/* Steps */}
      <ol className="mt-4 flex items-center gap-2" aria-label="Checkout progress">
        {steps.map((s, i) => (
          <li key={s.label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
                s.done
                  ? "bg-primary text-on-primary"
                  : s.active
                    ? "bg-gradient-to-br from-gold-400 to-gold-600 text-primary-950 shadow-gold"
                    : "bg-white/5 text-foreground/45"
              }`}
              aria-current={s.active ? "step" : undefined}
            >
              {s.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span className={`text-xs font-semibold sm:text-sm ${s.active ? "text-foreground" : s.done ? "text-primary-200" : "text-foreground/45"}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight">Checkout</h1>
      <p className="mt-1 text-foreground/60">
        Step 2 of 3 — delivery &amp; payment. Guest checkout is welcome, no account needed.
      </p>

      {!user && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-accent-soft bg-accent-soft/60 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <p>
            <button type="button" onClick={() => openAuth("signin")} className="cursor-pointer font-bold text-accent underline underline-offset-2 hover:text-gold-200">
              Sign in
            </button>{" "}
            to save this order to your account and track it later — or continue as a guest.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section className="card p-6">
            <h2 className="font-heading text-lg font-bold">Delivery details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="co-name" className="field-label">Full name</label>
                <input id="co-name" className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label htmlFor="co-phone" className="field-label">Phone / WhatsApp</label>
                <input id="co-phone" type="tel" className="input" required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08xx…" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="co-email" className="field-label">Email</label>
                <input id="co-email" type="email" className="input" required value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="co-address" className="field-label">Street address</label>
                <input id="co-address" className="input" required value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Jl. name, no., building, district" />
              </div>
              <div>
                <label htmlFor="co-province" className="field-label">Province</label>
                <select
                  id="co-province"
                  className="input"
                  required
                  value={form.province}
                  onChange={(e) => {
                    set("province", e.target.value);
                    set("city", "");
                  }}
                >
                  <option value="" disabled>Choose province…</option>
                  {INDONESIA_REGIONS.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="co-city" className="field-label">City / Regency</label>
                <select
                  id="co-city"
                  className="input"
                  required
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  disabled={!form.province}
                >
                  <option value="" disabled>{form.province ? "Choose city…" : "Pick a province first"}</option>
                  {citiesOfProvince(form.province).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="co-postal" className="field-label">Postal code</label>
                <input id="co-postal" inputMode="numeric" className="input" value={form.postal} onChange={(e) => set("postal", e.target.value)} />
              </div>
            </div>

            {/* Map pin */}
            <div className="mt-5 border-t border-border pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground/80">
                  <MapPin className="mr-1.5 inline h-4 w-4 text-primary-200" aria-hidden="true" />
                  Pin on map {form.lat !== undefined && <span className="text-foreground/45">· pin placed</span>}
                </p>
                <button type="button" className="btn btn-ghost !py-1.5 text-sm" onClick={() => setShowMap((v) => !v)} aria-expanded={showMap}>
                  {showMap ? "Hide map" : "Show map"}
                </button>
              </div>
              {showMap && (
                <Suspense fallback={<div className="grid h-64 place-items-center rounded-2xl border border-border bg-white/5 text-sm text-foreground/50">Loading map…</div>}>
                  <AddressMapPicker
                    value={form.lat !== undefined && form.lng !== undefined ? { lat: form.lat, lng: form.lng } : null}
                    onPick={handleMapPick}
                  />
                </Suspense>
              )}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-heading text-lg font-bold">Courier</h2>
            <p className="mt-1 text-sm text-foreground/55">
              {allFreeShip
                ? "Every item in your bag ships free — enjoy!"
                : subtotal >= settings.freeShippingThreshold
                  ? "Your order qualifies for free shipping — enjoy!"
                  : `Estimated for ${weightKg.toFixed(1)} kg of gear:`}
            </p>
            {shippingMethods.filter((m) => m.active).length === 0 ? (
              <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
                No active couriers right now — the store owner is updating shipping options.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Choose courier">
                {shippingMethods.filter((m) => m.active).map((c) => (
                  <label
                    key={c.id}
                    className={`relative cursor-pointer rounded-2xl border-2 bg-surface-2 p-4 transition-all duration-200 ${
                      carrier === c.id
                        ? "border-gold-500 shadow-gold"
                        : "border-border hover:border-primary/50 hover:shadow-soft"
                    }`}
                  >
                    <input
                      type="radio"
                      name="carrier"
                      value={c.id}
                      checked={carrier === c.id}
                      onChange={() => setCarrier(c.id)}
                      className="sr-only"
                    />
                    {carrier === c.id && (
                      <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-primary-950 shadow-gold">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    )}
                    <span className="flex items-center justify-between">
                      <span className="font-heading font-bold">{c.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${carrier === c.id ? "bg-gold-100 text-gold-200" : "bg-white/5 text-foreground/70"}`}>{c.eta}</span>
                    </span>
                    <span className="mt-2 block text-sm font-semibold text-primary-200">
                      {subtotal >= settings.freeShippingThreshold || allFreeShip ? "Free" : formatIDR(shippingRate(c, Math.max(weightKg, 1)))}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="font-heading text-lg font-bold">Payment method</h2>
            {activeGateways.length === 0 ? (
              <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
                No payment methods are active right now — the store owner is updating payment options.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Choose payment method">
                {activeGateways.map((g) => {
                  const Icon = GATEWAY_ICONS[g.id] ?? Wallet;
                  return (
                    <label
                      key={g.id}
                      className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition-all duration-200 ${
                        payment === g.id
                          ? "border-gold-500 bg-gold-100/40 shadow-gold"
                          : "border-border bg-surface-2 hover:border-primary/50 hover:shadow-soft"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={g.id}
                        checked={payment === g.id}
                        onChange={() => {
                          paymentTouched.current = true;
                          setPayment(g.id);
                        }}
                        className="sr-only"
                      />
                      {payment === g.id && (
                        <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-primary-950 shadow-gold">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      )}
                      <Icon className={`h-5 w-5 shrink-0 ${payment === g.id ? "text-gold-300" : "text-primary-200"}`} aria-hidden="true" />
                      <span className="text-sm font-semibold">{g.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="card relative h-fit overflow-hidden p-6 lg:sticky lg:top-40">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400" aria-hidden="true" />
          <h2 className="font-heading text-lg font-bold">Order summary</h2>
          <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto pr-1 text-sm">
            {lines.map((l) => {
              const p = products.find((prod) => prod.id === l.productId);
              if (!p) return null;
              return (
                <li key={l.productId} className="flex justify-between gap-3">
                  <span className="text-foreground/70">
                    {p.name} × {l.qty}
                    {p.freeShipping && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary-200 align-middle">
                        <Truck className="h-2.5 w-2.5" aria-hidden="true" /> free ship
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-semibold">{formatIDR(p.price * l.qty)}</span>
                </li>
              );
            })}
          </ul>
          {/* Coupon */}
          <div className="mt-4 border-t border-border pt-4">
            {appliedCode && appliedEval ? (
              <div
                className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${
                  appliedEval.ok ? "border-primary/25 bg-primary/10" : "border-destructive/25 bg-destructive/5"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Ticket className={`h-4 w-4 shrink-0 ${appliedEval.ok ? "text-gold-300" : "text-destructive"}`} aria-hidden="true" />
                  <span className="truncate font-bold">{appliedEval.coupon?.code}</span>
                  {appliedEval.ok ? (
                    <span className="shrink-0 font-semibold text-primary-200">−{formatIDR(appliedEval.discount)}</span>
                  ) : (
                    <span className="shrink-0 text-xs font-semibold text-destructive">{appliedEval.error}</span>
                  )}
                </span>
                <button type="button" onClick={handleRemoveCoupon} className="btn btn-ghost !h-7 !w-7 shrink-0 !p-0" aria-label="Remove coupon">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <label className="sr-only" htmlFor="co-coupon">Coupon code</label>
                <input
                  id="co-coupon"
                  className="input min-w-0 flex-1 !py-2.5"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Keep Enter-in-field = apply coupon (not "Place order").
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyCoupon();
                    }
                  }}
                  placeholder="Coupon code (e.g. WELCOME10)"
                  autoComplete="off"
                />
                <button type="button" onClick={handleApplyCoupon} className="btn btn-outline shrink-0 !px-4 !py-2.5 text-sm" disabled={!normalizeCode(couponInput)}>
                  Apply
                </button>
              </div>
            )}
            {couponMsg && !appliedCode && (
              <p role="alert" className={`mt-2 text-xs font-semibold ${couponMsg.kind === "ok" ? "text-primary-200" : "text-destructive"}`}>
                {couponMsg.text}
              </p>
            )}
            {!appliedCode && (
              <p className="mt-2 text-[11px] text-foreground/45">
                Have a code? Apply it before paying — the discount shows instantly.
              </p>
            )}
          </div>

          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-foreground/55">Subtotal</dt><dd className="font-semibold">{formatIDR(subtotal)}</dd></div>
            {discount > 0 && appliedEval?.coupon && (
              <div className="flex justify-between"><dt className="text-foreground/55">Coupon ({appliedEval.coupon.code})</dt><dd className="font-semibold text-gold-200">−{formatIDR(discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-foreground/55">Shipping ({selected?.name})</dt><dd className="font-semibold">{shippingLabel}</dd></div>
            <div className="flex justify-between border-t border-border pt-2"><dt className="font-bold">Total</dt><dd className="font-heading text-lg font-bold">{formatIDR(total)}</dd></div>
          </dl>
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary mt-5 w-full" disabled={placing || shippingMethods.filter((m) => m.active).length === 0 || activeGateways.length === 0}>
            {placing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending you to payment…
              </>
            ) : (
              <>Place order · {formatIDR(total)}</>
            )}
          </button>
          <p className="mt-3 text-center text-xs text-foreground/55">
            You&apos;ll be redirected to the payment gateway to complete your purchase.
          </p>
        </aside>
      </form>
    </div>
  );
}
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { Badge, Button, Card, Field, Input, Select, Spinner } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useGateways } from "../../context/GatewayContext";
import { COURIER_CATALOG } from "../../lib/courier";
import {
  SECRET_SLOT_META,
  getCourierConfig,
  listSecretSlots,
  removeSecret,
  saveCourierConfig,
  setSecret,
  testSecret,
  type CourierIntegrationConfig,
  type SecretSlotName,
} from "../../lib/integrationsApi";

/**
 * Integrations — API keys & courier settings.
 * Provider keys are stored as Supabase Edge Function secrets (server-side
 * only, managed through the manage-config Edge Function + Management API).
 * Courier origin details live in `app_config` and are used by the
 * courier-tracking Edge Function when creating real shipments.
 */
export function AdminIntegrationsPage() {
  const { user, isAdmin, openAuth, signOut } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/25 text-primary ring-1 ring-primary/40">
          <Lock className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Owners only</h1>
        <p className="mt-2 text-foreground/60">
          The integrations console manages payment and courier API keys. Sign in with the
          owner account to continue.
        </p>
        <Button className="mt-6" onClick={() => openAuth("signin")}>
          <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in to continue
        </Button>
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
        <Button variant="secondary" className="mt-6" onClick={signOut}>
          Switch account
        </Button>
      </div>
    );
  }

  return <IntegrationsConsole />;
}

function IntegrationsConsole() {
  const [slots, setSlots] = useState<{ name: SecretSlotName; set: boolean }[]>([]);
  const [config, setConfig] = useState<CourierIntegrationConfig>({});
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Per-slot draft values + busy/test state
  const [drafts, setDrafts] = useState<Partial<Record<SecretSlotName, string>>>({});
  const [showValues, setShowValues] = useState<Partial<Record<SecretSlotName, boolean>>>({});
  const [busy, setBusy] = useState<Partial<Record<SecretSlotName, "save" | "test" | "remove">>>({});
  const [results, setResults] = useState<Partial<Record<SecretSlotName, { kind: "ok" | "error"; text: string }>>>({});
  const [configBusy, setConfigBusy] = useState(false);

  const { gateways, refresh } = useGateways();

  const reload = useCallback(async () => {
    const res = await listSecretSlots();
    setListError(res.ok ? null : (res.message ?? "Couldn't read the configured keys."));
    setSlots(res.ok ? res.slots : []);
    const cfg = await getCourierConfig();
    setConfig(cfg);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void reload();
    void refresh();
  }, [reload, refresh]);

  const enabledCount = slots.filter((s) => s.set).length;
  const gatewayCount = gateways.filter((g) => g.enabled).length;

  const setDraft = (name: SecretSlotName, value: string) => setDrafts((d) => ({ ...d, [name]: value }));

  async function handleSave(name: SecretSlotName) {
    const value = drafts[name]?.trim() ?? "";
    if (!value) {
      setResults((r) => ({ ...r, [name]: { kind: "error", text: "Enter the key value first." } }));
      return;
    }
    setBusy((b) => ({ ...b, [name]: "save" }));
    setResults((r) => ({ ...r, [name]: undefined }));
    const res = await setSecret(name, value);
    setBusy((b) => ({ ...b, [name]: undefined }));
    if (res.ok) {
      setDraft(name, "");
      setSlots((prev) => prev.map((s) => (s.name === name ? { ...s, set: true } : s)));
      setResults((r) => ({ ...r, [name]: { kind: "ok", text: "Key saved — new payments/shipments will use it." } }));
      setNotice(`${SECRET_SLOT_META[name].label} saved as an Edge Function secret.`);
    } else {
      setResults((r) => ({ ...r, [name]: { kind: "error", text: res.message ?? "Couldn't save the key — try again." } }));
    }
  }

  async function handleTest(name: SecretSlotName) {
    setBusy((b) => ({ ...b, [name]: "test" }));
    setResults((r) => ({ ...r, [name]: undefined }));
    const res = await testSecret(name);
    setBusy((b) => ({ ...b, [name]: undefined }));
    setResults((r) => ({
      ...r,
      [name]: { kind: res.ok ? "ok" : "error", text: res.message ?? (res.ok ? "Connection looks good." : "Test failed — try again.") },
    }));
  }

  async function handleRemove(name: SecretSlotName) {
    setBusy((b) => ({ ...b, [name]: "remove" }));
    setResults((r) => ({ ...r, [name]: undefined }));
    const res = await removeSecret(name);
    setBusy((b) => ({ ...b, [name]: undefined }));
    if (res.ok) {
      setSlots((prev) => prev.map((s) => (s.name === name ? { ...s, set: false } : s)));
      setNotice(`${SECRET_SLOT_META[name].label} removed — the provider is no longer used.`);
    } else {
      setResults((r) => ({ ...r, [name]: { kind: "error", text: res.message ?? "Couldn't remove the key — try again." } }));
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setConfigBusy(true);
    setError(null);
    const res = await saveCourierConfig(config);
    setConfigBusy(false);
    if (res.ok) {
      setNotice("Courier details saved — new shipments use these origin defaults.");
    } else {
      setError(res.message ?? "Couldn't save the courier details — try again.");
    }
  }

  const toggleCourier = (code: string) => {
    setConfig((c) => {
      const current = Array.isArray(c.enabledCouriers) ? c.enabledCouriers : [];
      const next = current.includes(code) ? current.filter((x) => x !== code) : [...current, code];
      return { ...c, enabledCouriers: next };
    });
  };

  const slotsByProvider = useMemo(
    () => ({
      courier: slots.filter((s) => SECRET_SLOT_META[s.name].provider === "courier"),
      payment: slots.filter((s) => SECRET_SLOT_META[s.name].provider === "payment"),
    }),
    [slots]
  );

  if (!loaded) return <Spinner label="Loading integrations…" />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 font-heading text-3xl font-bold tracking-tight">
          <PlugZap className="h-7 w-7 text-primary" aria-hidden="true" /> Integrations
        </h1>
        <p className="mt-2 max-w-2xl text-foreground/60">
          Connect payment gateways and shipment couriers. API keys are stored as{" "}
          <strong className="text-foreground/80">Supabase Edge Function secrets</strong> — they never
          reach this browser or your customers, and shoppers only ever see the display details you configure.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {enabledCount} of {slots.length} provider keys configured
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {gatewayCount} of {gateways.length} payment methods live
          </span>
        </div>
      </div>

      {notice && (
        <p role="status" className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      {listError && (
        <p role="alert" className="mb-4 rounded-xl border border-gold-500/25 bg-gold-500/15 px-4 py-2.5 text-sm font-semibold text-gold-300">
          {listError} Keys you save below are still stored safely server-side.
        </p>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Provider API keys                                         */}
      {/* ---------------------------------------------------------- */}
      <section aria-labelledby="keys-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 id="keys-heading" className="font-heading text-xl font-bold">Provider API keys</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Courier */}
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/45">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Shipment couriers
            </p>
            {slotsByProvider.courier.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-foreground/55">
                No courier key slots found.
              </p>
            ) : (
              slotsByProvider.courier.map((slot) => (
                <SecretSlotCard
                  key={slot.name}
                  slot={slot}
                  draft={drafts[slot.name] ?? ""}
                  busy={busy[slot.name]}
                  result={results[slot.name]}
                  show={!!showValues[slot.name]}
                  onDraft={(v) => setDraft(slot.name, v)}
                  onToggleShow={() => setShowValues((s) => ({ ...s, [slot.name]: !s[slot.name] }))}
                  onSave={() => void handleSave(slot.name)}
                  onTest={() => void handleTest(slot.name)}
                  onRemove={() => void handleRemove(slot.name)}
                />
              ))
            )}
          </div>

          {/* Payment */}
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/45">
              <Wallet className="h-3.5 w-3.5" aria-hidden="true" /> Payment gateways
            </p>
            {slotsByProvider.payment.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-foreground/55">
                No payment key slots found.
              </p>
            ) : (
              slotsByProvider.payment.map((slot) => (
                <SecretSlotCard
                  key={slot.name}
                  slot={slot}
                  draft={drafts[slot.name] ?? ""}
                  busy={busy[slot.name]}
                  result={results[slot.name]}
                  show={!!showValues[slot.name]}
                  onDraft={(v) => setDraft(slot.name, v)}
                  onToggleShow={() => setShowValues((s) => ({ ...s, [slot.name]: !s[slot.name] }))}
                  onSave={() => void handleSave(slot.name)}
                  onTest={() => void handleTest(slot.name)}
                  onRemove={() => void handleRemove(slot.name)}
                />
              ))
            )}
          </div>
        </div>

        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-foreground/50">
          Keys are upserted as Supabase Edge Function secrets via the Management API — the browser never
          stores them, and they&apos;re read at runtime only inside the payment and courier functions.
        </p>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Courier shipping details                                  */}
      {/* ---------------------------------------------------------- */}
      <section aria-labelledby="courier-heading" className="mt-10 space-y-4">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 id="courier-heading" className="font-heading text-xl font-bold">Courier shipping details</h2>
        </div>

        <form onSubmit={handleSaveConfig} className="card space-y-5 p-6">
          <p className="text-sm text-foreground/60">
            These defaults are used when the store creates a real shipment via Biteship (JNE, J&amp;T,
            SiCepat, AnterAja, …). You can still override them per-order in the Orders tab.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Store origin address">
              <Input
                value={config.originAddress ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, originAddress: e.target.value }))}
                placeholder="e.g. Jl. Jend. Sudirman Kav. 12, Jakarta 10220"
              />
            </Field>
            <Field label="Origin postal code">
              <Input
                value={config.originPostalCode ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, originPostalCode: e.target.value }))}
                placeholder="e.g. 10220"
              />
            </Field>
            <Field label="Origin phone">
              <Input
                value={config.originPhone ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, originPhone: e.target.value }))}
                placeholder="e.g. +62 21 555 0123"
              />
            </Field>
            <Field label="Origin note (optional)">
              <Input
                value={config.originNote ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, originNote: e.target.value }))}
                placeholder="e.g. Pickup hours 10:00–20:00"
              />
            </Field>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">Couriers enabled for shipments</span>
            <div className="flex flex-wrap gap-2">
              {COURIER_CATALOG.map((c) => {
                const enabled = Array.isArray(config.enabledCouriers)
                  ? config.enabledCouriers.includes(c.code)
                  : true;
                return (
                  <button
                    key={c.code}
                    type="button"
                    aria-pressed={enabled}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors duration-150 ${
                      enabled
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-surface text-foreground/45 hover:text-foreground"
                    }`}
                    onClick={() => toggleCourier(c.code)}
                  >
                    {enabled ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                    {c.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-foreground/50">
              Disabled couriers won&apos;t be available when creating a shipment. All are enabled by default.
            </p>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <Button type="submit" loading={configBusy}>
              <Check className="h-4 w-4" aria-hidden="true" /> Save courier details
            </Button>
            <Link to="/admin" className="btn btn-outline !py-2 text-sm">
              Open the Orders tab to create a shipment
            </Link>
          </div>
        </form>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Payment gateway summary                                   */}
      {/* ---------------------------------------------------------- */}
      <section aria-labelledby="gateways-heading" className="mt-10 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="gateways-heading" className="font-heading text-xl font-bold">Payment methods at checkout</h2>
          </div>
          <Link to="/admin" className="btn btn-outline !px-3.5 !py-1.5 text-xs">
            Configure in the admin console
          </Link>
        </div>

        {gateways.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground/55">
            No payment methods connected yet — head to the admin console → Configuration → Payment gateways to add one.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <ul className="divide-y divide-border">
              {gateways.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-sm font-bold">{g.name}</span>
                    <span className="text-xs text-foreground/50">{g.type}</span>
                  </span>
                  {g.enabled ? (
                    <Badge tone="green">
                      <Check className="h-3 w-3" aria-hidden="true" /> Live
                    </Badge>
                  ) : (
                    <Badge tone="gray">Paused</Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One API-key slot card                                               */
/* ------------------------------------------------------------------ */

function SecretSlotCard({
  slot,
  draft,
  busy,
  result,
  show,
  onDraft,
  onToggleShow,
  onSave,
  onTest,
  onRemove,
}: {
  slot: { name: SecretSlotName; set: boolean };
  draft: string;
  busy?: "save" | "test" | "remove";
  result?: { kind: "ok" | "error"; text: string };
  show: boolean;
  onDraft: (v: string) => void;
  onToggleShow: () => void;
  onSave: () => void;
  onTest: () => void;
  onRemove: () => void;
}) {
  const meta = SECRET_SLOT_META[slot.name];
  const isEnvToggle = slot.name === "MIDTRANS_IS_PRODUCTION";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-heading text-sm font-bold">
            {meta.label}
            {slot.set ? (
              <Badge tone="green">
                <Check className="h-3 w-3" aria-hidden="true" /> Configured
              </Badge>
            ) : (
              <Badge tone="gray">Not set</Badge>
            )}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/55">{meta.hint}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2">
          {isEnvToggle ? (
            <Select
              aria-label={`${meta.label} value`}
              value={draft || (slot.set ? "" : "")}
              onChange={(e) => onDraft(e.target.value)}
            >
              <option value="">— choose environment —</option>
              <option value="false">Sandbox (testing)</option>
              <option value="true">Production (live money)</option>
            </Select>
          ) : (
            <Input
              type={show ? "text" : "password"}
              autoComplete="off"
              placeholder={slot.set ? "Paste a new key to replace it…" : "Paste the API key…"}
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              className="font-mono"
            />
          )}
          {!isEnvToggle && (
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 !px-3"
              onClick={onToggleShow}
              aria-label={show ? "Hide the key value" : "Show the key value"}
            >
              {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onSave} loading={busy === "save"} disabled={!draft.trim()}>
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Save key
          </Button>
          {slot.set && (
            <>
              <Button size="sm" variant="secondary" onClick={onTest} loading={busy === "test"}>
                {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                Test connection
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={onRemove} loading={busy === "remove"}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </Button>
            </>
          )}
        </div>

        {result && (
          <p
            role="status"
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              result.kind === "ok"
                ? "border border-primary/25 bg-primary/10 text-primary"
                : "border border-destructive/25 bg-destructive/10 text-destructive"
            }`}
          >
            {result.text}
          </p>
        )}
      </div>
    </Card>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  PlugZap,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import {
  getGatewayCatalog,
  GATEWAY_TYPE_LABEL,
  type GatewayField,
} from "../data/gatewayCatalog";
import { fileToPictureDataUrl, type GatewayResult, type GatewayRow } from "../lib/gatewayApi";
import { useGateways } from "../context/GatewayContext";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface WizardProps {
  slug: string;
  /** Existing row when editing — prefills display fields. */
  existing?: GatewayRow | null;
  onClose: () => void;
  onConnected: (slug: string) => void;
}

interface FormValues {
  [key: string]: string;
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function FieldInput({
  field,
  id,
  value,
  onChange,
}: {
  field: GatewayField;
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.kind === "select") {
    return (
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>Choose…</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o === "sandbox" ? "Sandbox (test payments)" : o === "production" ? "Production (live money)" : o}
          </option>
        ))}
      </select>
    );
  }
  if (field.kind === "textarea") {
    return (
      <textarea id={id} rows={4} className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
    );
  }
  if (field.kind === "password") {
    return (
      <input id={id} type="password" autoComplete="new-password" className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
    );
  }
  return (
    <input id={id} type="text" className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
  );
}

function PictureField({
  field,
  value,
  onChange,
}: {
  field: GatewayField;
  value: string;
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await fileToPictureDataUrl(file);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        {value ? (
          <img src={value} alt="Uploaded preview" className="h-24 w-24 rounded-xl border border-border object-cover" />
        ) : (
          <span className="grid h-24 w-24 place-items-center rounded-xl bg-foreground/10 text-foreground/40">
            <ImagePlus className="h-7 w-7" aria-hidden="true" />
          </span>
        )}
        <div className="space-y-2">
          <label className="btn btn-outline !py-2 text-sm cursor-pointer">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            )}
            {value ? "Replace picture" : "Upload picture"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {value && (
            <button type="button" className="btn btn-ghost !py-2 text-sm" onClick={() => onChange("")}>
              Remove
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-foreground/50">{field.hint}</p>
      {error && <p className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function StepDots({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Setup progress">
      {steps.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
              i < current
                ? "bg-primary text-on-primary"
                : i === current
                  ? "bg-gradient-to-br from-gold-400 to-gold-600 text-primary-950 shadow-gold"
                  : "bg-foreground/10 text-foreground/45"
            }`}
            aria-current={i === current ? "step" : undefined}
          >
            {i < current ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
          </span>
          <span className={`text-xs font-semibold sm:text-sm ${i === current ? "text-foreground" : i < current ? "text-primary-400" : "text-foreground/45"}`}>
            {label}
          </span>
          {i < steps.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Wizard                                                              */
/* ------------------------------------------------------------------ */

export default function GatewayWizard({ slug, existing, onClose, onConnected }: WizardProps) {
  const entry = getGatewayCatalog(slug);
  const { saveGateway, testConnection, refresh } = useGateways();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(() => {
    const pub = existing?.public_config ?? {};
    const initial: FormValues = {};
    for (const s of entry?.steps ?? []) {
      for (const f of s.fields) {
        if (f.kind !== "picture") initial[f.key] = "";
      }
    }
    if (pub.display_name) initial.display_name = String(pub.display_name);
    if (pub.account_name) initial.account_name = String(pub.account_name);
    if (pub.account_number) initial.account_number = String(pub.account_number);
    if (pub.bank_name) initial.bank_name = String(pub.bank_name);
    if (pub.instructions) initial.instructions = String(pub.instructions);
    if (pub.picture) initial.picture = String(pub.picture);
    return initial;
  });
  const [testResult, setTestResult] = useState<GatewayResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flatten field steps: overview → each catalog step → (api: test) → done
  const stepTitles = useRef<string[]>([]);
  if (stepTitles.current.length === 0 && entry) {
    stepTitles.current = ["About", ...entry.steps.map((s) => s.title), ...(entry.canTest ? ["Test & connect"] : ["Save"]), "Done"];
  }
  const titles = entry ? stepTitles.current : ["Done"];
  const totalSteps = titles.length;

  const fieldsFor = (i: number): GatewayField[] => {
    if (!entry) return [];
    const s = entry.steps[i - 1];
    return s ? s.fields : [];
  };

  /* Accessibility: trap focus, close on Escape, restore focus on close. */
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!entry) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
        <div className="card max-w-md p-8 text-center" role="alert">
          <p className="text-destructive">That gateway isn't available.</p>
          <button type="button" className="btn btn-primary mt-4" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  function set(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function missingRequired(fields: GatewayField[]): string | null {
    for (const f of fields) {
      if (f.required && f.kind !== "picture" && !values[f.key]?.trim()) {
        return `"${f.label}" is required — please fill it in.`;
      }
    }
    return null;
  }

  const validatePictureRequired = (): string | null => {
    for (const s of entry.steps) {
      for (const f of s.fields) {
        if (f.kind === "picture" && f.required && !values.picture) {
          return `A ${f.label.toLowerCase()} is required to activate this gateway.`;
        }
      }
    }
    return null;
  }

  const collectPublicConfig = (): Record<string, unknown> => {
    const pub: Record<string, unknown> = {};
    for (const s of entry.steps) {
      for (const f of s.fields) {
        if (f.secret || f.kind === "picture") continue;
        if (f.key === "display_name") continue;
        const v = values[f.key]?.trim();
        if (v) pub[f.key] = v;
      }
    }
    if (values.picture) pub.picture = values.picture;
    return pub;
  }

  const collectCredentials = (): Record<string, string> => {
    const creds: Record<string, string> = {};
    for (const s of entry.steps) {
      for (const f of s.fields) {
        if (f.secret && values[f.key]?.trim()) creds[f.key] = values[f.key].trim();
      }
    }
    return creds;
  }

  const handleContinue = async () => {
    setError(null);
    if (step === 0) {
      setStep(1);
      return;
    }
    const fields = fieldsFor(step);
    if (fields.length > 0) {
      const missing = missingRequired(fields);
      if (missing) {
        setError(missing);
        return;
      }
    }
    if (entry.canTest && step === totalSteps - 2) {
      // On the test step — require a successful test before saving.
      if (!testResult?.ok) {
        setError("Run the connection test first — once it passes you can save the gateway.");
        return;
      }
      await handleSave();
      return;
    }
    if (step === totalSteps - 2 && !entry.canTest) {
      await handleSave();
      return;
    }
    setStep((s) => s + 1);
  }

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);
    const res = await testConnection(entry.slug, collectCredentials());
    setTestResult(res);
    setTesting(false);
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await saveGateway({
      slug: entry.slug,
      name: values.display_name?.trim() || entry.name,
      credentials: collectCredentials(),
      publicConfig: collectPublicConfig(),
      enabled: true,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.message ?? "Couldn't save the gateway — try again.");
      return;
    }
    await refresh();
    setStep(totalSteps - 1);
    onConnected(entry.slug);
  }

  const pictureRequired = validatePictureRequired();
  const onPictureStep = entry.steps.some((s) => s.fields.some((f) => f.kind === "picture")) && step >= 2 && step < totalSteps - 1;

  const stepContent = (): ReactNode => {
    if (step === 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary-400 ring-1 ring-primary/25">
              <PlugZap className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="font-heading text-lg font-bold">{entry.name}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-primary-400">
                {GATEWAY_TYPE_LABEL[entry.type]} · {entry.tagline}
              </p>
            </div>
          </div>
          <p className="text-sm text-foreground/70">{entry.description}</p>
          <div className="rounded-2xl border border-border bg-foreground/10 p-4">
            <p className="text-sm font-bold">You&apos;ll need:</p>
            <ul className="mt-2 space-y-1.5 text-sm text-foreground/70">
              {entry.needs.map((n) => (
                <li key={n} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-foreground/50">
            <ShieldCheck className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
            API keys are stored server-side and never shown to customers.
          </p>
        </div>
      );
    }

    if (step === totalSteps - 1) {
      return (
        <div className="py-4 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-primary-400 ring-1 ring-primary/30">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-heading text-xl font-bold">Gateway connected</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-foreground/65">
            <strong>{values.display_name?.trim() || entry.name}</strong> is live at checkout — customers can
            now pay with it. You can pause or reconfigure it any time from the configuration page.
          </p>
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-gold-500/25 bg-gold-500/15/60 px-3 py-1 text-xs font-bold text-gold-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Live in the shop
          </div>
        </div>
      );
    }

    const fields = fieldsFor(step);
    const isTestStep = entry.canTest && step === totalSteps - 2;

    return (
      <div className="space-y-4">
        {fields.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const id = `gw-${entry.slug}-${f.key}`;
              return (
                <div key={f.key} className={f.kind === "textarea" || f.kind === "picture" ? "sm:col-span-2" : ""}>
                  {f.kind !== "picture" && (
                    <>
                      <label htmlFor={id} className="field-label">
                        {f.label} {f.required && <span className="text-destructive">*</span>}
                        {f.secret && <span className="ml-1.5 font-normal text-foreground/40">(stored securely)</span>}
                      </label>
                      <FieldInput field={f} id={id} value={values[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
                      {f.hint && <p className="mt-1 text-xs text-foreground/50">{f.hint}</p>}
                    </>
                  )}
                  {f.kind === "picture" && (
                    <>
                      <span className="field-label">
                        {f.label} {f.required && <span className="text-destructive">*</span>}
                      </span>
                      <PictureField field={f} value={values.picture ?? ""} onChange={(v) => set("picture", v)} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isTestStep && (
          <div className="rounded-2xl border border-border bg-foreground/10 p-4">
            <p className="text-sm font-bold">Connection test</p>
            <p className="mt-1 text-xs text-foreground/55">
              We&apos;ll verify the credentials against {entry.name}&apos;s live API before saving.
            </p>
            <button type="button" className="btn btn-outline mt-3" onClick={() => void handleTest()} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlugZap className="h-4 w-4" aria-hidden="true" />}
              {testing ? "Testing…" : "Test connection"}
            </button>
            {testResult && (
              <p
                role="status"
                className={`mt-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
                  testResult.ok ? "bg-primary/10 text-primary-400" : "bg-destructive/10 text-destructive"
                }`}
              >
                {testResult.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                {testResult.message}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const canContinue = step === 0 || step === totalSteps - 1 || !onPictureStep || !pictureRequired;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="gw-title">
      <div
        ref={dialogRef}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-surface shadow-lift"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="gw-title" className="font-heading text-lg font-bold">
            {step === totalSteps - 1 ? "All set" : `Connect ${entry.name}`}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn btn-ghost !px-2 text-foreground/55"
            aria-label="Close gateway setup"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Progress */}
        {step < totalSteps - 1 && (
          <div className="border-b border-border px-6 py-4">
            <StepDots steps={titles} current={step} />
          </div>
        )}

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto px-6 py-6">{stepContent()}</div>

        {/* Footer */}
        {step < totalSteps - 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
            {error && (
              <p role="alert" className="min-w-0 flex-1 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2.5">
              {step > 0 && (
                <button type="button" className="btn btn-ghost" onClick={() => { setError(null); setStep((s) => s - 1); }}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleContinue()}
                disabled={!canContinue || saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
                {saving ? "Saving…" : entry.canTest && step === totalSteps - 2 ? "Save & activate" : "Continue"}
              </button>
            </div>
          </div>
        )}

        {/* Done footer */}
        {step === totalSteps - 1 && (
          <div className="flex justify-end gap-2.5 border-t border-border px-6 py-4">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              <Check className="h-4 w-4" aria-hidden="true" /> Finish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
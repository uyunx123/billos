import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Check,
  Lock,
  LogIn,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAccounting } from "../../context/AccountingContext";
import { formatIDR, formatDate } from "../../lib/format";
import {
  currentMonthKey,
  invoiceMonthLabel,
  salaryInvoiceBreakdown,
  type PayrollEmployee,
  type SalaryInvoice,
} from "../../lib/accounting";

/* ------------------------------------------------------------------ */
/* Page gate (owners / superadmins only)                               */
/* ------------------------------------------------------------------ */

export default function AdminSalary() {
  const { user, isAdmin, openAuth, signOut } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/100/25 text-primary-400 ring-1 ring-primary-400/40">
          <Lock className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Owners only</h1>
        <p className="mt-2 text-foreground/60">
          Salary invoices are part of the admin console. Sign in with an owner or superadmin
          account to continue.
        </p>
        <button type="button" className="btn btn-primary mt-6" onClick={() => openAuth("signin")}>
          <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in to continue
        </button>
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
        <button type="button" className="btn btn-outline mt-6" onClick={signOut}>
          Switch account
        </button>
      </div>
    );
  }

  return <SalaryConsole />;
}

/* ------------------------------------------------------------------ */
/* Console                                                            */
/* ------------------------------------------------------------------ */

function SalaryConsole() {
  const { employees, invoices, addInvoice, updateInvoice, deleteInvoice } = useAccounting();
  const [month, setMonth] = useState(currentMonthKey());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const active = useMemo(() => employees.filter((e) => e.active), [employees]);
  const monthInvoices = useMemo(() => invoices.filter((i) => i.month === month), [invoices, month]);

  const totals = useMemo(
    () =>
      monthInvoices.reduce(
        (acc, i) => ({
          salary: acc.salary + i.salary,
          bonus: acc.bonus + i.bonus,
          overtime: acc.overtime + i.overtime,
          tax: acc.taxAmount + i.taxAmount,
          net: acc.net + i.net,
        }),
        { salary: 0, bonus: 0, overtime: 0, tax: 0, net: 0 }
      ),
    [monthInvoices]
  );

  const invoiceFor = (employeeId: string) => monthInvoices.find((i) => i.employeeId === employeeId);

  function handleSave(input: {
    employee: PayrollEmployee;
    bonus: number;
    overtime: number;
    taxRate: number;
    note: string;
  }) {
    const breakdown = salaryInvoiceBreakdown(input.employee.monthlySalary, input.bonus, input.overtime, input.taxRate);
    const existing = invoiceFor(input.employee.id);
    const payload = {
      employeeId: input.employee.id,
      month,
      salary: input.employee.monthlySalary,
      bonus: Math.max(0, Math.round(input.bonus)),
      overtime: Math.max(0, Math.round(input.overtime)),
      taxRate: Math.max(0, Math.min(100, Math.round(input.taxRate))),
      taxAmount: breakdown.taxAmount,
      net: breakdown.net,
      note: input.note.trim() || undefined,
    };
    if (existing) {
      updateInvoice(existing.id, payload);
      setNotice(`"${input.employee.name}" — ${invoiceMonthLabel(month)} invoice updated.`);
    } else {
      addInvoice({ ...payload, issuedAt: new Date().toISOString() });
      setNotice(`"${input.employee.name}" — ${invoiceMonthLabel(month)} invoice issued.`);
    }
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/55 cursor-pointer hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to admin console
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Back office · Payroll</p>
          <h2 className="mt-1 flex items-center gap-2 font-heading text-2xl font-bold">
            <ReceiptText className="h-6 w-6 text-primary-400" aria-hidden="true" />
            Salary invoices
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-foreground/55">
            Issue one invoice per staff member per month. Base salary comes from the payroll
            roster — bonus and overtime are typed in manually here, right before you print the
            slip. Tax is withheld from the gross automatically.
          </p>
        </div>
        <div>
          <label htmlFor="salary-month" className="field-label">Pay period</label>
          <input
            id="salary-month"
            type="month"
            className="input w-auto"
            value={month}
            onChange={(e) => {
              if (e.target.value) {
                setMonth(e.target.value);
                setEditingId(null);
              }
            }}
          />
        </div>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-400">
          {notice}
        </p>
      )}

      {/* Period totals */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Base salaries" value={formatIDR(totals.salary)} icon={Users} />
        <Stat label="Bonus" value={formatIDR(totals.bonus)} icon={Plus} accent />
        <Stat label="Overtime" value={formatIDR(totals.overtime)} icon={Banknote} accent />
        <Stat label="Tax withheld" value={`−${formatIDR(totals.tax)}`} icon={ShieldCheck} alert={totals.tax > 0} />
        <Stat label="Take-home paid" value={formatIDR(totals.net)} icon={Check} highlight />
      </div>

      {/* Roster */}
      {active.length === 0 ? (
        <div className="card px-5 py-12 text-center">
          <Users className="mx-auto h-9 w-9 text-foreground/25" aria-hidden="true" />
          <p className="mt-3 font-heading text-lg font-bold">No active staff on the payroll</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
            Add employees on the Accounting &amp; payroll tab first — then their salary invoices
            appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {active.map((emp) => {
            const inv = invoiceFor(emp.id);
            return (
              <li key={emp.id} className="card overflow-hidden">
                {editingId === emp.id ? (
                  <InvoiceEditor
                    employee={emp}
                    existing={inv}
                    month={month}
                    onSave={handleSave}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-sm font-extrabold text-on-primary">
                      {emp.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-sm font-bold">
                        {emp.name}
                        <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-bold text-foreground/60">
                          {emp.role || "Staff"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-foreground/55">
                        Base {formatIDR(emp.monthlySalary)}/mo
                        {emp.bonus > 0 && ` · default bonus ${formatIDR(emp.bonus)}`}
                        {emp.overtime > 0 && ` · default OT ${formatIDR(emp.overtime)}`}
                        {emp.taxRate > 0 && ` · tax ${emp.taxRate}%`}
                      </p>
                    </div>
                    {inv ? (
                      <div className="shrink-0 text-left sm:text-right">
                        <p className="font-heading text-lg font-bold text-primary-400">{formatIDR(inv.net)}</p>
                        <p className="text-[11px] font-semibold text-foreground/45">
                          net of {formatIDR(inv.taxAmount)} tax · issued {formatDate(inv.issuedAt)}
                        </p>
                      </div>
                    ) : (
                      <p className="shrink-0 text-xs font-semibold text-gold-300">No invoice for {invoiceMonthLabel(month)}</p>
                    )}
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {inv ? (
                        <>
                          <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => printSlip(inv, emp)}>
                            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Print
                          </button>
                          <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setEditingId(emp.id)} aria-label={`Edit ${emp.name} salary invoice`}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                          </button>
                          {confirming === emp.id ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary !bg-destructive !px-3 !py-1.5 text-xs text-on-primary"
                                onClick={() => {
                                  if (inv) deleteInvoice(inv.id);
                                  setConfirming(null);
                                  setNotice(`"${emp.name}" invoice deleted.`);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Confirm
                              </button>
                              <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>
                                Keep
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive"
                              onClick={() => {
                                setNotice(null);
                                setConfirming(emp.id);
                              }}
                              aria-label={`Delete ${emp.name} salary invoice`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </>
                      ) : (
                        <button type="button" className="btn btn-accent !px-3.5 !py-2 text-xs" onClick={() => setEditingId(emp.id)}>
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Create invoice
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-foreground/50">
        Invoices are saved with the rest of the payroll in this browser&apos;s admin settings.
        Bonus and overtime always stay editable per period before printing — nothing is final
        until you hit print.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bits                                                                */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  icon: Icon,
  accent,
  alert,
  highlight,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  accent?: boolean;
  alert?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="card p-4">
      <span
        className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${
          alert ? "bg-destructive/10 text-destructive" : accent ? "bg-gold-500/15 text-gold-300" : highlight ? "bg-primary/15 text-primary-400" : "bg-primary/10 text-primary-400"
        }`}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <p className="truncate font-heading text-xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-foreground/55">{label}</p>
    </div>
  );
}

function InvoiceEditor({
  employee,
  existing,
  month,
  onSave,
  onCancel,
}: {
  employee: PayrollEmployee;
  existing?: SalaryInvoice;
  month: string;
  onSave: (input: { employee: PayrollEmployee; bonus: number; overtime: number; taxRate: number; note: string }) => void;
  onCancel: () => void;
}) {
  const [bonus, setBonus] = useState(String(existing?.bonus ?? employee.bonus ?? ""));
  const [overtime, setOvertime] = useState(String(existing?.overtime ?? employee.overtime ?? ""));
  const [taxRate, setTaxRate] = useState(String(existing?.taxRate ?? employee.taxRate ?? ""));
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const b = Math.max(0, Math.round(Number(bonus) || 0));
  const o = Math.max(0, Math.round(Number(overtime) || 0));
  const t = Math.max(0, Math.min(100, Math.round(Number(taxRate) || 0)));
  const breakdown = salaryInvoiceBreakdown(employee.monthlySalary, b, o, t);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (Number.isNaN(Number(bonus)) || Number.isNaN(Number(overtime)) || Number.isNaN(Number(taxRate))) {
      setError("Bonus, overtime and tax must be numbers.");
      return;
    }
    onSave({ employee, bonus: b, overtime: o, taxRate: t, note });
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-heading font-bold">
            {existing ? "Edit salary invoice" : "New salary invoice"} — {invoiceMonthLabel(month)}
          </h4>
          <p className="mt-0.5 text-xs text-foreground/55">
            {employee.name} · base {formatIDR(employee.monthlySalary)}/mo
          </p>
        </div>
        <button type="button" onClick={onCancel} className="btn btn-ghost !px-2 text-foreground/55" aria-label="Close invoice editor">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="inv-bonus" className="field-label">Bonus (Rp) — manual</label>
          <input id="inv-bonus" type="number" min="0" step="50000" className="input" value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label htmlFor="inv-overtime" className="field-label">Overtime (Rp) — manual</label>
          <input id="inv-overtime" type="number" min="0" step="10000" className="input" value={overtime} onChange={(e) => setOvertime(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label htmlFor="inv-tax" className="field-label">Tax rate (%)</label>
          <input id="inv-tax" type="number" min="0" max="100" step="0.5" className="input" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="inv-note" className="field-label">Note (optional)</label>
          <input id="inv-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Performance bonus for Jakarta Open" />
        </div>
      </div>

      {/* Live breakdown */}
      <div className="grid gap-3 rounded-2xl border border-border bg-surface-2 p-4 sm:grid-cols-5">
        <Row label="Base salary" value={formatIDR(employee.monthlySalary)} />
        <Row label="Bonus" value={`+${formatIDR(b)}`} accent />
        <Row label="Overtime" value={`+${formatIDR(o)}`} accent />
        <Row label={`Tax (${t}%)`} value={`−${formatIDR(breakdown.taxAmount)}`} alert={breakdown.taxAmount > 0} />
        <Row label="Take-home" value={formatIDR(breakdown.net)} strong />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button type="submit" className="btn btn-primary">
          <Check className="h-4 w-4" aria-hidden="true" /> {existing ? "Save invoice" : "Issue invoice"}
        </button>
        {existing && (
          <button type="button" className="btn btn-outline" onClick={() => printSlip({ ...existing, bonus: b, overtime: o, taxRate: t, taxAmount: breakdown.taxAmount, net: breakdown.net }, employee)}>
            <Printer className="h-4 w-4" aria-hidden="true" /> Print now
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <p className="ml-auto text-xs text-foreground/50">
          Bonus &amp; overtime are typed manually before printing — the slip only exists once you print it.
        </p>
      </div>
    </form>
  );
}

function Row({ label, value, accent, alert, strong }: { label: string; value: string; accent?: boolean; alert?: boolean; strong?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/45">{label}</p>
      <p className={`truncate font-heading text-lg font-bold ${alert ? "text-destructive" : accent ? "text-gold-300" : strong ? "text-primary-400" : ""}`}>
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Print a salary slip in a new window                                 */
/* ------------------------------------------------------------------ */

function rupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export function printSlip(invoice: SalaryInvoice, employee: PayrollEmployee) {
  const win = window.open("", "_blank", "width=720,height=920");
  if (!win) return;
  const lines = [
    "<!doctype html><html><head><meta charset='utf-8'><title>Salary Slip — " + employee.name + "</title>",
    "<style>",
    "  * { box-sizing: border-box; }",
    "  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; background: #eee; }",
    "  .sheet { max-width: 640px; margin: 24px auto; background: #fff; padding: 40px 44px; }",
    "  .brand { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0b4f8a; padding-bottom: 14px; }",
    "  .brand h1 { margin: 0; font-size: 20px; color: #0b4f8a; }",
    "  .brand p { margin: 2px 0 0; font-size: 11px; color: #555; }",
    "  .title { text-align: center; margin: 22px 0 4px; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: #333; }",
    "  .period { text-align: center; font-size: 12px; color: #666; margin-bottom: 22px; }",
    "  .meta { font-size: 12px; line-height: 1.7; margin-bottom: 18px; }",
    "  table { width: 100%; border-collapse: collapse; font-size: 13px; }",
    "  td { padding: 9px 10px; border-bottom: 1px solid #e2e2e2; }",
    "  td.amt { text-align: right; font-variant-numeric: tabular-nums; }",
    "  tr.total td { border-bottom: none; }",
    "  .gross td { background: #f4f7fb; font-weight: 700; }",
    "  .net td { background: #0b4f8a; color: #fff; font-size: 15px; font-weight: 700; }",
    "  .note { font-size: 11px; color: #777; margin-top: 14px; }",
    "  .sign { display: flex; justify-content: space-between; margin-top: 64px; font-size: 12px; }",
    "  .sign div { width: 40%; }",
    "  .sign .line { margin-top: 44px; border-top: 1px solid #333; text-align: center; padding-top: 6px; }",
    "</style></head><body><div class='sheet'>",
    "  <div class='brand'><div><h1>ISAK Billiard Co.</h1><p>Official store for cues, tables &amp; tournament gear</p></div><div style='text-align:right'><strong style='font-size:13px'>SALARY SLIP</strong><p>No. " + invoice.id + "</p></div></div>",
    "  <div class='title'>Salary Invoice</div>",
    "  <div class='period'>Pay period: " + invoiceMonthLabel(invoice.month) + "</div>",
    "  <div class='meta'><strong>" + employee.name + "</strong><br>Role: " + (employee.role || "Staff") + "<br>Invoice issued: " + new Date(invoice.issuedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) + "</div>",
    "  <table>",
    "    <tr><td>Base salary</td><td class='amt'>" + rupiah(invoice.salary) + "</td></tr>",
    "    <tr><td>Bonus</td><td class='amt'>" + rupiah(invoice.bonus) + "</td></tr>",
    "    <tr><td>Overtime</td><td class='amt'>" + rupiah(invoice.overtime) + "</td></tr>",
    "    <tr class='gross'><td>Gross pay</td><td class='amt'>" + rupiah(invoice.salary + invoice.bonus + invoice.overtime) + "</td></tr>",
    "    <tr><td>Tax withheld (" + invoice.taxRate + "%)</td><td class='amt'>− " + rupiah(invoice.taxAmount) + "</td></tr>",
    "    <tr class='net'><td>Take-home pay</td><td class='amt'>" + rupiah(invoice.net) + "</td></tr>",
    "  </table>",
    invoice.note ? "  <p class='note'>Note: " + invoice.note + "</p>" : "",
    "  <div class='sign'><div>Prepared by<div class='line'></div></div><div>Employee signature<div class='line'></div></div></div>",
    "</div><script>window.onload = function () { setTimeout(function(){ window.print(); }, 120); };</script></body></html>",
  ].join("\n");
  win.document.open();
  win.document.write(lines);
  win.document.close();
}

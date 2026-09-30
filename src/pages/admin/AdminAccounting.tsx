import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  Calculator,
  Check,
  HandCoins,
  Info,
  Lock,
  LogIn,
  Pencil,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { useAccounting } from "../../context/AccountingContext";
import { formatIDR, formatDate } from "../../lib/format";
import {
  SUGGESTED_CATEGORIES,
  computeAccounting,
  currentMonthKey,
  filterMonths,
  monthKeyOf,
  totalsOf,
  type AccountingAdjustment,
  type PayrollEmployee,
  type PayoutEntry,
  type PayoutKind,
  type ReportPeriod,
} from "../../lib/accounting";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }
  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  }
  return formatIDR(value);
}

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  alert,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="card p-5">
      <span
        className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
          alert ? "bg-destructive/10 text-destructive" : accent ? "bg-gold-500/15 text-gold-300" : "bg-primary/10 text-primary-400"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="truncate font-heading text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-foreground/60">
        {label}
        {hint && <span className="text-foreground/45"> · {hint}</span>}
      </p>
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: typeof Wallet;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold">
          <Icon className="h-4.5 w-4.5 text-primary-400" aria-hidden="true" />
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-sm text-foreground/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const KIND_LABEL: Record<PayoutKind, string> = {
  match: "Match",
  shift: "Shift",
  other: "Other",
};

/* ------------------------------------------------------------------ */
/* Page gate                                                           */
/* ------------------------------------------------------------------ */

export default function AdminAccounting() {
  const { user, isAdmin, openAuth, signOut } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/100/25 text-primary-400 ring-1 ring-primary-400/40">
          <Lock className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Owners only</h1>
        <p className="mt-2 text-foreground/60">
          Accounting &amp; payroll are part of the admin console. Sign in with an owner or
          superadmin account to continue.
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

  return <AccountingConsole />;
}

/* ------------------------------------------------------------------ */
/* Console                                                             */
/* ------------------------------------------------------------------ */

function AccountingConsole() {
  const { orders } = useStore();
  // Only the store owner (top privilege) may edit payroll and the ledger;
  // other admins get a read-only view of the books.
  const { isOwner: isSuperAdmin } = useAuth();
  const accounting = useAccounting();
  const { employees } = accounting;
  const [period, setPeriod] = useState<ReportPeriod>("month");

  const report = useMemo(() => computeAccounting(orders, accounting.config), [orders, accounting.config]);
  const shown = useMemo(() => filterMonths(report.months, period), [report.months, period]);
  const totals = useMemo(() => totalsOf(shown), [shown]);
  const currentMonth = report.months[report.months.length - 1];
  const payrollThisMonth = currentMonth ? currentMonth.fixedSalaries + currentMonth.eventPayouts : 0;

  const chartMonths = shown.length > 12 ? shown.slice(-12) : shown;
  const hasChartData = chartMonths.some((m) => m.totalIncome > 0 || m.totalExpenses > 0);
  const maxChart = Math.max(1, ...chartMonths.map((m) => Math.max(m.totalIncome, m.totalExpenses)));

  const periodOptions: { id: ReportPeriod; label: string }[] = [
    { id: "month", label: "This month" },
    { id: "3", label: "3 months" },
    { id: "6", label: "6 months" },
    { id: "all", label: "All time" },
  ];

  const tableMonths = [...shown].reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Back office · Finance</p>
          <h2 className="mt-1 flex items-center gap-2 font-heading text-2xl font-bold">
            <Calculator className="h-6 w-6 text-primary-400" aria-hidden="true" />
            Accounting &amp; payroll
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-foreground/55">
            A live profit &amp; loss view built from the store&apos;s own records — confirmed
            orders, refunds, staff salaries and per-event payouts. Everything updates the
            moment data changes.
          </p>
        </div>
        <div role="group" aria-label="Reporting period" className="flex flex-wrap gap-1.5">
          {periodOptions.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={period === o.id}
              className={`chip ${period === o.id ? "chip-active" : ""}`}
              onClick={() => setPeriod(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {!isSuperAdmin && (
        <p className="flex items-center gap-2 rounded-2xl border border-gold-500/25 bg-gold-500/10 px-4 py-3 text-sm font-semibold text-gold-300">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          You&apos;re viewing the books read-only — only a superadmin or the store owner can
          edit payroll and the ledger.
        </p>
      )}

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={TrendingUp}
          label="Income"
          value={formatCompact(totals.totalIncome)}
          hint={period === "month" ? "this month" : "selected period"}
        />
        <KpiTile
          icon={TrendingDown}
          label="Expenses"
          value={formatCompact(totals.totalExpenses)}
          hint="refunds, payroll, ledger"
        />
        <KpiTile
          icon={BadgeDollarSign}
          label="Net profit"
          value={formatCompact(totals.netProfit)}
          hint={totals.netProfit >= 0 ? "income − expenses" : "loss this period"}
          accent
          alert={totals.netProfit < 0}
        />
        <KpiTile
          icon={Banknote}
          label="Payroll this month"
          value={formatCompact(payrollThisMonth)}
          hint="salaries + payouts"
          alert={payrollThisMonth > 0 && employees.length > 0}
        />
      </div>

      {/* Monthly chart */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 font-heading font-bold">
              <ReceiptText className="h-4 w-4 text-primary-400" aria-hidden="true" />
              Income vs expenses by month
            </h3>
            <p className="mt-0.5 text-xs text-foreground/55">
              Rupiah per month
              {chartMonths.length < shown.length && ` · showing the latest ${chartMonths.length} months`}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-foreground/50">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-primary-700 to-primary-400" aria-hidden="true" /> Income
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-destructive/60" aria-hidden="true" /> Expenses
            </span>
          </div>
        </div>

        {!hasChartData ? (
          <div className="px-5 py-14 text-center">
            <ReceiptText className="mx-auto h-8 w-8 text-foreground/25" aria-hidden="true" />
            <p className="mt-3 font-heading font-bold">Nothing to chart yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-foreground/55">
              Confirm a payment on the Orders tab, add staff to the payroll, and the monthly
              income and expenses bars appear here instantly.
            </p>
          </div>
        ) : (
          <div className="px-5 pb-5 pt-6">
            <p className="sr-only">
              Monthly income and expenses:{" "}
              {chartMonths.map((m) => `${m.label} — income ${formatIDR(m.totalIncome)}, expenses ${formatIDR(m.totalExpenses)}`).join("; ")}.
            </p>
            <div className="relative">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40" aria-hidden="true">
                <div className="absolute inset-x-0 top-0 border-t border-border/40" />
                <div className="absolute inset-x-0 top-1/3 border-t border-border/20" />
                <div className="absolute inset-x-0 top-2/3 border-t border-border/20" />
                <div className="absolute inset-x-0 top-full border-t border-border/40" />
              </div>
              <div className="relative flex h-40 items-end gap-1 px-1">
                {chartMonths.map((m) => {
                  const incomePct = Math.max(m.totalIncome > 0 ? 4 : 0, Math.round((m.totalIncome / maxChart) * 100));
                  const expensePct = Math.max(m.totalExpenses > 0 ? 4 : 0, Math.round((m.totalExpenses / maxChart) * 100));
                  return (
                    <div key={m.key} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-center text-[11px] leading-tight shadow-soft group-hover:block">
                        <p className="font-semibold">{m.label}</p>
                        <p className="font-bold text-primary-400">Income {formatIDR(m.totalIncome)}</p>
                        <p className="font-bold text-destructive">Expenses {formatIDR(m.totalExpenses)}</p>
                        <p className="text-foreground/50">Net {formatIDR(m.netProfit)}</p>
                      </div>
                      <div className="flex h-full w-full max-w-8 items-end gap-0.5">
                        <span
                          role="img"
                          aria-label={`${m.label}: income ${formatIDR(m.totalIncome)}, expenses ${formatIDR(m.totalExpenses)}`}
                          className="block w-1/2 rounded-t-sm bg-gradient-to-t from-primary-700 to-primary-400 transition-colors duration-200"
                          style={{ height: `${incomePct}%` }}
                        />
                        <span
                          role="img"
                          aria-label={`${m.label}: expenses ${formatIDR(m.totalExpenses)}`}
                          className="block w-1/2 rounded-t-sm bg-destructive/60 transition-colors duration-200"
                          style={{ height: `${expensePct}%` }}
                        />
                      </div>
                      <span className="mt-1.5 text-[10px] font-semibold text-foreground/45">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* P&L table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-heading font-bold">Profit &amp; loss by month</h3>
          <p className="mt-0.5 text-xs text-foreground/55">
            {shown.length} month{shown.length === 1 ? "" : "s"} · coupon discounts and refunds
            are shown as expenses (contra revenue).
          </p>
        </div>
        {tableMonths.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-foreground/55">No activity in this period yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-left text-sm">
              <caption className="sr-only">Monthly profit and loss in Indonesian Rupiah</caption>
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-foreground/45">
                  <th scope="col" className="px-5 py-3 font-bold">Month</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Store revenue</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Coupons −</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Other income</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-primary-400">Total income</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Refunds</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Salaries</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Payouts</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Other exp.</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold text-destructive">Total expenses</th>
                  <th scope="col" className="px-5 py-3 text-right font-bold">Net profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tableMonths.map((m) => (
                  <tr key={m.key} className={m.key === currentMonthKey() ? "bg-primary/5" : ""}>
                    <td className="px-5 py-3 font-heading font-bold">
                      {m.label}
                      {m.key === currentMonthKey() && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary-400">current</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">{m.storeRevenue > 0 ? formatIDR(m.storeRevenue) : "—"}</td>
                    <td className="px-3 py-3 text-right text-gold-300">{m.couponDiscounts > 0 ? `−${formatIDR(m.couponDiscounts)}` : "—"}</td>
                    <td className="px-3 py-3 text-right text-foreground/70">{m.otherIncome > 0 ? formatIDR(m.otherIncome) : "—"}</td>
                    <td className="px-3 py-3 text-right font-bold text-primary-400">{m.totalIncome > 0 ? formatIDR(m.totalIncome) : "—"}</td>
                    <td className="px-3 py-3 text-right text-destructive">{m.refunds > 0 ? `−${formatIDR(m.refunds)}` : "—"}</td>
                    <td className="px-3 py-3 text-right">{m.fixedSalaries > 0 ? formatIDR(m.fixedSalaries) : "—"}</td>
                    <td className="px-3 py-3 text-right">{m.eventPayouts > 0 ? formatIDR(m.eventPayouts) : "—"}</td>
                    <td className="px-3 py-3 text-right">{m.otherExpenses > 0 ? formatIDR(m.otherExpenses) : "—"}</td>
                    <td className="px-3 py-3 text-right font-bold text-destructive">{m.totalExpenses > 0 ? formatIDR(m.totalExpenses) : "—"}</td>
                    <td className={`px-5 py-3 text-right font-heading font-bold ${m.netProfit >= 0 ? "text-primary-400" : "text-destructive"}`}>
                      {m.netProfit >= 0 ? formatIDR(m.netProfit) : `−${formatIDR(Math.abs(m.netProfit))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-foreground/10">
                  <th scope="row" className="px-5 py-3 font-heading font-bold">Total</th>
                  <td className="px-3 py-3 text-right font-bold">{totals.storeRevenue > 0 ? formatIDR(totals.storeRevenue) : "—"}</td>
                  <td className="px-3 py-3 text-right font-bold text-gold-300">{totals.couponDiscounts > 0 ? `−${formatIDR(totals.couponDiscounts)}` : "—"}</td>
                  <td className="px-3 py-3 text-right font-bold text-foreground/70">{totals.otherIncome > 0 ? formatIDR(totals.otherIncome) : "—"}</td>
                  <td className="px-3 py-3 text-right font-bold text-primary-400">{totals.totalIncome > 0 ? formatIDR(totals.totalIncome) : "—"}</td>
                  <td className="px-3 py-3 text-right font-bold text-destructive">{totals.refunds > 0 ? `−${formatIDR(totals.refunds)}` : "—"}</td>
                  <td className="px-3 py-3 text-right font-bold">{totals.fixedSalaries > 0 ? formatIDR(totals.fixedSalaries) : "—"}</td>
                  <td className="px-3 py-3 text-right font-bold">{totals.eventPayouts > 0 ? formatIDR(totals.eventPayouts) : "—"}</td>
                  <td className="px-3 py-3 text-right font-bold">{totals.otherExpenses > 0 ? formatIDR(totals.otherExpenses) : "—"}</td>
                  <td className="px-3 py-3 text-right font-bold text-destructive">{totals.totalExpenses > 0 ? formatIDR(totals.totalExpenses) : "—"}</td>
                  <td className={`px-5 py-3 text-right font-heading font-bold ${totals.netProfit >= 0 ? "text-primary-400" : "text-destructive"}`}>
                    {totals.netProfit >= 0 ? formatIDR(totals.netProfit) : `−${formatIDR(Math.abs(totals.netProfit))}`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Payroll */}
      <PayrollPanel accounting={accounting} canEdit={isSuperAdmin} />

      {/* Payouts */}
      <PayoutsPanel accounting={accounting} canEdit={isSuperAdmin} />

      {/* Ledger */}
      <LedgerPanel accounting={accounting} canEdit={isSuperAdmin} />

      {/* Explainer */}
      <div className="rounded-2xl border border-border bg-foreground/10 p-5">
        <h3 className="flex items-center gap-2 font-heading font-bold">
          <Info className="h-4 w-4 text-primary-400" aria-hidden="true" /> How these numbers are computed
        </h3>
        <ul className="mt-3 grid gap-x-6 gap-y-2 text-sm text-foreground/65 sm:grid-cols-2">
          <li className="flex gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
            Store revenue, refunds and coupon discounts are pulled automatically from confirmed
            orders on the Orders tab.
          </li>
          <li className="flex gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
            Fixed salaries accrue automatically each month for every active employee, from their
            join month onward.
          </li>
          <li className="flex gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
            Per-event payouts total from the payout log — amounts pre-fill from each
            employee&apos;s per-event rate.
          </li>
          <li className="flex gap-2">
            <HandCoins className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
            Tournament fees, sponsorship and ad-hoc costs (venue, utilities) are recorded in the
            ledger, because the app doesn&apos;t capture them anywhere else yet.
          </li>
        </ul>
        <p className="mt-3 text-xs text-foreground/45">
          Payroll and ledger entries are saved to this browser&apos;s admin settings. Bookkeeping
          edits are restricted to the superadmin role and the owner.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Payroll                                                             */
/* ------------------------------------------------------------------ */

function PayrollPanel({
  accounting,
  canEdit,
}: {
  accounting: ReturnType<typeof useAccounting>;
  canEdit: boolean;
}) {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = accounting;
  const [editing, setEditing] = useState<PayrollEmployee | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function saveEmployee(input: Omit<PayrollEmployee, "id">) {
    if (editing) {
      updateEmployee(editing.id, input);
      setNotice(`"${input.name}" updated — salaries re-accrue automatically.`);
    } else {
      addEmployee(input);
      setNotice(`"${input.name}" added — their salary accrues from this month.`);
    }
    setEditing(null);
    setAdding(false);
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-400">
          {notice}
        </p>
      )}
      <PanelHeader
        icon={Users}
        title={`Payroll roster (${employees.length})`}
        subtitle="Fixed monthly salaries accrue automatically for active staff; per-event rates pre-fill the payout log."
        action={
          canEdit && !adding && !editing ? (
            <button type="button" className="btn btn-accent !px-3.5 !py-2 text-xs" onClick={() => setAdding(true)}>
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Add employee
            </button>
          ) : undefined
        }
      />

      {adding && (
        <EmployeeForm
          onCancel={() => setAdding(false)}
          onSave={(input) => saveEmployee(input)}
        />
      )}
      {editing && (
        <EmployeeForm
          key={editing.id}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(input) => saveEmployee(input)}
        />
      )}

      {employees.length === 0 ? (
        <div className="card px-5 py-12 text-center">
          <Users className="mx-auto h-9 w-9 text-foreground/25" aria-hidden="true" />
          <p className="mt-3 font-heading text-lg font-bold">No staff on the payroll yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
            Add your first employee — cashier, sales staff, scorers, referees — and their fixed
            salary starts accruing in the books automatically.
          </p>
          {canEdit && (
            <button type="button" className="btn btn-primary mt-4" onClick={() => setAdding(true)}>
              <UserPlus className="h-4 w-4" aria-hidden="true" /> Add your first employee
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-2">
          {employees.map((e) => (
            <li key={e.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-sm font-extrabold text-on-primary">
                {e.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-heading text-sm font-bold">{e.name}</span>
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-bold text-foreground/60">{e.role || "Staff"}</span>
                  {!e.active && (
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-bold text-foreground/45">inactive</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-foreground/55">
                  Joined {e.joinedAt ? formatDate(e.joinedAt) : "—"}
                  {e.perEventRate > 0 && ` · ${formatIDR(e.perEventRate)} per event`}
                </p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="font-heading text-lg font-bold text-primary-400">{e.monthlySalary > 0 ? formatIDR(e.monthlySalary) : "No fixed salary"}</p>
                <p className="text-[11px] font-semibold text-foreground/45">per month · auto-accrued</p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={e.active}
                      onChange={(ev) => {
                        updateEmployee(e.id, { active: ev.target.checked });
                        setNotice(ev.target.checked ? `"${e.name}" is back on the payroll.` : `"${e.name}" paused — salary stops accruing.`);
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    {e.active ? "Active" : "Paused"}
                  </label>
                  <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setEditing(e)} aria-label={`Edit ${e.name}`}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </button>
                  {confirming === e.id ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary !bg-destructive !px-3 !py-1.5 text-xs text-on-primary"
                        onClick={() => {
                          deleteEmployee(e.id);
                          setConfirming(null);
                          setNotice(`"${e.name}" removed — their payouts were removed too.`);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Confirm
                      </button>
                      <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>Keep</button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive"
                      onClick={() => { setNotice(null); setConfirming(e.id); }}
                      aria-label={`Delete ${e.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmployeeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: PayrollEmployee;
  onSave: (e: Omit<PayrollEmployee, "id">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [monthlySalary, setMonthlySalary] = useState(initial ? String(initial.monthlySalary) : "");
  const [perEventRate, setPerEventRate] = useState(initial ? String(initial.perEventRate) : "");
  const [joinedAt, setJoinedAt] = useState(initial?.joinedAt ? initial.joinedAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [active, setActive] = useState(initial?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) {
      setError("Enter the employee's full name.");
      return;
    }
    const salary = Math.max(0, Math.round(Number(monthlySalary) || 0));
    const rate = Math.max(0, Math.round(Number(perEventRate) || 0));
    onSave({
      name: clean,
      role: role.trim() || "Staff",
      monthlySalary: salary,
      perEventRate: rate,
      active,
      joinedAt: joinedAt || new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h4 className="font-heading font-bold">{initial ? `Edit: ${initial.name}` : "New employee"}</h4>
        <button type="button" onClick={onCancel} className="btn btn-ghost !px-2 text-foreground/55" aria-label="Close employee form">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="emp-name" className="field-label">Full name *</label>
          <input id="emp-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Budi Santoso" />
        </div>
        <div>
          <label htmlFor="emp-role" className="field-label">Role</label>
          <input id="emp-role" className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Cashier, Scorer, Referee" />
        </div>
        <div>
          <label htmlFor="emp-salary" className="field-label">Monthly salary (Rp)</label>
          <input id="emp-salary" type="number" min="0" step="50000" className="input" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} placeholder="3000000" />
        </div>
        <div>
          <label htmlFor="emp-rate" className="field-label">Per-event rate (Rp, optional)</label>
          <input id="emp-rate" type="number" min="0" step="10000" className="input" value={perEventRate} onChange={(e) => setPerEventRate(e.target.value)} placeholder="e.g. 150000 per match" />
        </div>
        <div>
          <label htmlFor="emp-joined" className="field-label">Joined (start of accrual)</label>
          <input id="emp-joined" type="date" className="input" value={joinedAt} onChange={(e) => setJoinedAt(e.target.value)} />
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-foreground/80">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-primary" />
            Active — salary accrues monthly
          </label>
        </div>
      </div>
      <div className="flex gap-3 border-t border-border pt-4">
        <button type="submit" className="btn btn-primary">
          <Check className="h-4 w-4" aria-hidden="true" /> {initial ? "Save employee" : "Add employee"}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Per-event payouts                                                   */
/* ------------------------------------------------------------------ */

function PayoutsPanel({
  accounting,
  canEdit,
}: {
  accounting: ReturnType<typeof useAccounting>;
  canEdit: boolean;
}) {
  const { employees, payouts, addPayout, updatePayout, deletePayout } = accounting;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PayoutEntry | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const monthKeys = Array.from(new Set(payouts.map((p) => monthKeyOf(p.date)))).sort().reverse();
  const shown = monthFilter === "all" ? payouts : payouts.filter((p) => monthKeyOf(p.date) === monthFilter);
  const sorted = [...shown].sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = sorted.reduce((s, p) => s + p.amount, 0);

  function savePayout(input: Omit<PayoutEntry, "id">) {
    if (editing) {
      updatePayout(editing.id, input);
      setNotice("Payout updated — the P&L recalculates instantly.");
    } else {
      addPayout(input);
      setNotice("Payout recorded — it lands in the month it was paid.");
    }
    setEditing(null);
    setAdding(false);
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-400">
          {notice}
        </p>
      )}
      <PanelHeader
        icon={HandCoins}
        title={`Per-event payouts (${sorted.length})`}
        subtitle="Matches, shifts and one-off event pay — amounts pre-fill from each employee's rate."
        action={
          canEdit && !adding && !editing ? (
            <button type="button" className="btn btn-accent !px-3.5 !py-2 text-xs" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Record payout
            </button>
          ) : undefined
        }
      />

      {monthKeys.length > 1 && (
        <div role="group" aria-label="Payout month filter" className="flex flex-wrap gap-1.5">
          <button type="button" className={`chip ${monthFilter === "all" ? "chip-active" : ""}`} onClick={() => setMonthFilter("all")}>
            All months
          </button>
          {monthKeys.map((k) => (
            <button key={k} type="button" className={`chip ${monthFilter === k ? "chip-active" : ""}`} onClick={() => setMonthFilter(k)}>
              {new Date(k + "-01").toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
            </button>
          ))}
        </div>
      )}

      {adding && (
        <PayoutForm
          onCancel={() => setAdding(false)}
          onSave={(input) => savePayout(input)}
        />
      )}
      {editing && (
        <PayoutForm
          key={editing.id}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(input) => savePayout(input)}
        />
      )}

      {sorted.length === 0 ? (
        <div className="card px-5 py-10 text-center">
          <HandCoins className="mx-auto h-9 w-9 text-foreground/25" aria-hidden="true" />
          <p className="mt-3 font-heading text-lg font-bold">No payouts here yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
            {employees.length === 0
              ? "Add staff to the payroll first — then you can record per-event pay (refereeing a match, covering a shift) against their rate."
              : "Record the first payout — a refereed match, a scored session or a one-off shift — and it flows into the books automatically."}
          </p>
          {canEdit && employees.length > 0 && (
            <button type="button" className="btn btn-primary mt-4" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Record the first payout
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-2">
            {sorted.map((p) => {
              const emp = employees.find((e) => e.id === p.employeeId);
              return (
                <li key={p.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-xs font-extrabold text-primary-950 shadow-gold">
                    {(emp?.name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{emp?.name ?? "Removed staff"} <span className="font-normal text-foreground/45">· {p.label}</span></p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-foreground/55">
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 font-bold text-foreground/60">{KIND_LABEL[p.kind]}</span>
                      <span>{formatDate(p.date)}</span>
                      {p.note && <span className="text-foreground/45">· {p.note}</span>}
                    </p>
                  </div>
                  <p className="shrink-0 font-heading font-bold text-primary-400">{formatIDR(p.amount)}</p>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setEditing(p)} aria-label={`Edit payout for ${emp?.name ?? "staff"}`}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                      </button>
                      {confirming === p.id ? (
                        <>
                          <button type="button" className="btn btn-primary !bg-destructive !px-3 !py-1.5 text-xs text-on-primary" onClick={() => { deletePayout(p.id); setConfirming(null); setNotice("Payout deleted."); }}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Confirm
                          </button>
                          <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>Keep</button>
                        </>
                      ) : (
                        <button type="button" className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive" onClick={() => { setNotice(null); setConfirming(p.id); }} aria-label={`Delete payout for ${emp?.name ?? "staff"}`}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-2.5 text-sm">
            <span className="font-semibold text-foreground/60">Total in this view</span>
            <span className="font-heading font-bold text-primary-400">{formatIDR(total)}</span>
          </p>
        </>
      )}
    </div>
  );
}

function PayoutForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: PayoutEntry;
  onSave: (p: Omit<PayoutEntry, "id">) => void;
  onCancel: () => void;
}) {
  const { employees } = useAccounting();
  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? employees[0]?.id ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [kind, setKind] = useState<PayoutKind>(initial?.kind ?? "match");
  const [date, setDate] = useState(initial?.date ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  function pickEmployee(id: string) {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp && emp.perEventRate > 0) setAmount(String(emp.perEventRate));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) {
      setError("Pick which staff member this payout is for.");
      return;
    }
    if (!label.trim()) {
      setError("Describe the event — e.g. “Jakarta Open — Match #12”.");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Set a payout amount above 0.");
      return;
    }
    onSave({
      employeeId,
      label: label.trim(),
      kind,
      date: date || new Date().toISOString().slice(0, 10),
      amount: Math.round(value),
      note: note.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h4 className="font-heading font-bold">{initial ? "Edit payout" : "Record a payout"}</h4>
        <button type="button" onClick={onCancel} className="btn btn-ghost !px-2 text-foreground/55" aria-label="Close payout form">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pay-employee" className="field-label">Staff member *</label>
          <select id="pay-employee" className="input" value={employeeId} onChange={(e) => pickEmployee(e.target.value)}>
            {employees.length === 0 && <option value="">No staff yet — add them on the payroll first</option>}
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} · {emp.role || "Staff"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pay-label" className="field-label">Event / label *</label>
          <input id="pay-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Jakarta Open — Match #12" />
        </div>
        <div>
          <span className="field-label">Kind</span>
          <div role="radiogroup" aria-label="Payout kind" className="flex gap-2">
            {(["match", "shift", "other"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} className={`chip ${kind === k ? "chip-active" : ""}`} onClick={() => setKind(k)}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="pay-date" className="field-label">Date paid</label>
          <input id="pay-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pay-amount" className="field-label">Amount (Rp) *</label>
          <input id="pay-amount" type="number" min="1" step="5000" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="150000" />
          <p className="mt-1 text-xs text-foreground/50">Pre-filled from the employee&apos;s per-event rate — adjust if needed.</p>
        </div>
        <div>
          <label htmlFor="pay-note" className="field-label">Note (optional)</label>
          <input id="pay-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Final round" />
        </div>
      </div>
      <div className="flex gap-3 border-t border-border pt-4">
        <button type="submit" className="btn btn-primary">
          <Check className="h-4 w-4" aria-hidden="true" /> {initial ? "Save payout" : "Record payout"}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Income / expense ledger                                             */
/* ------------------------------------------------------------------ */

function LedgerPanel({
  accounting,
  canEdit,
}: {
  accounting: ReturnType<typeof useAccounting>;
  canEdit: boolean;
}) {
  const { adjustments, addAdjustment, updateAdjustment, deleteAdjustment } = accounting;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AccountingAdjustment | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sorted = [...adjustments].sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalIncome = sorted.filter((a) => a.kind === "income").reduce((s, a) => s + a.amount, 0);
  const totalExpense = sorted.filter((a) => a.kind === "expense").reduce((s, a) => s + a.amount, 0);

  function saveAdjustment(input: Omit<AccountingAdjustment, "id">) {
    if (editing) {
      updateAdjustment(editing.id, input);
      setNotice("Ledger entry updated — the P&L recalculates instantly.");
    } else {
      addAdjustment(input);
      setNotice(input.kind === "income" ? "Income recorded — it adds to that month's revenue." : "Expense recorded — it reduces that month's profit.");
    }
    setEditing(null);
    setAdding(false);
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-400">
          {notice}
        </p>
      )}
      <PanelHeader
        icon={Wallet}
        title="Income & expense ledger"
        subtitle="Tournament entry fees, sponsorship, venue hire, utilities — anything the store doesn't capture automatically."
        action={
          canEdit && !adding && !editing ? (
            <button type="button" className="btn btn-accent !px-3.5 !py-2 text-xs" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add entry
            </button>
          ) : undefined
        }
      />

      {(totalIncome > 0 || totalExpense > 0) && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-bold text-primary-400">
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> {formatIDR(totalIncome)} income
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 font-bold text-destructive">
            <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" /> {formatIDR(totalExpense)} expenses
          </span>
        </div>
      )}

      {adding && (
        <AdjustmentForm
          onCancel={() => setAdding(false)}
          onSave={(input) => saveAdjustment(input)}
        />
      )}
      {editing && (
        <AdjustmentForm
          key={editing.id}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(input) => saveAdjustment(input)}
        />
      )}

      {sorted.length === 0 ? (
        <div className="card px-5 py-10 text-center">
          <Wallet className="mx-auto h-9 w-9 text-foreground/25" aria-hidden="true" />
          <p className="mt-3 font-heading text-lg font-bold">No ledger entries yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
            Record tournament entry fees and sponsorship as income, or rent, utilities and
            equipment as expenses — they slot straight into the monthly P&amp;L.
          </p>
          {canEdit && (
            <button type="button" className="btn btn-primary mt-4" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add the first entry
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-2">
          {sorted.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  a.kind === "income" ? "bg-primary/10 text-primary-400" : "bg-destructive/10 text-destructive"
                }`}
              >
                {a.kind === "income" ? <ArrowUpRight className="h-5 w-5" aria-hidden="true" /> : <ArrowDownRight className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{a.label}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-foreground/55">
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 font-bold text-foreground/60">{a.category}</span>
                  <span>{formatDate(a.date)}</span>
                  {a.note && <span className="text-foreground/45">· {a.note}</span>}
                </p>
              </div>
              <p className={`shrink-0 font-heading font-bold ${a.kind === "income" ? "text-primary-400" : "text-destructive"}`}>
                {a.kind === "income" ? "+" : "−"}{formatIDR(a.amount)}
              </p>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setEditing(a)} aria-label={`Edit ${a.label}`}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </button>
                  {confirming === a.id ? (
                    <>
                      <button type="button" className="btn btn-primary !bg-destructive !px-3 !py-1.5 text-xs text-on-primary" onClick={() => { deleteAdjustment(a.id); setConfirming(null); setNotice("Ledger entry deleted."); }}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Confirm
                      </button>
                      <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>Keep</button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive" onClick={() => { setNotice(null); setConfirming(a.id); }} aria-label={`Delete ${a.label}`}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdjustmentForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: AccountingAdjustment;
  onSave: (a: Omit<AccountingAdjustment, "id">) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<"income" | "expense">(initial?.kind ?? "income");
  const [category, setCategory] = useState(initial?.category ?? SUGGESTED_CATEGORIES[0]);
  const [label, setLabel] = useState(initial?.label ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      setError("Give the entry a short label — e.g. “Jakarta Open entry fees”.");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Set an amount above 0.");
      return;
    }
    onSave({
      kind,
      category: category.trim() || "Other",
      label: label.trim(),
      amount: Math.round(value),
      date: date || new Date().toISOString().slice(0, 10),
      note: note.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h4 className="font-heading font-bold">{initial ? "Edit ledger entry" : "Add ledger entry"}</h4>
        <button type="button" onClick={onCancel} className="btn btn-ghost !px-2 text-foreground/55" aria-label="Close ledger form">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="field-label">Type</span>
          <div role="radiogroup" aria-label="Entry type" className="flex gap-2">
            <button type="button" role="radio" aria-checked={kind === "income"} className={`chip ${kind === "income" ? "chip-active" : ""}`} onClick={() => setKind("income")}>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> Income
            </button>
            <button type="button" role="radio" aria-checked={kind === "expense"} className={`chip ${kind === "expense" ? "chip-active" : ""}`} onClick={() => setKind("expense")}>
              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" /> Expense
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="adj-category" className="field-label">Category</label>
          <select id="adj-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {SUGGESTED_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="adj-label" className="field-label">Label *</label>
          <input id="adj-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Jakarta Open — entry fees (32 players)" />
        </div>
        <div>
          <label htmlFor="adj-amount" className="field-label">Amount (Rp) *</label>
          <input id="adj-amount" type="number" min="1" step="5000" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500000" />
        </div>
        <div>
          <label htmlFor="adj-date" className="field-label">Date</label>
          <input id="adj-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="adj-note" className="field-label">Note (optional)</label>
          <input id="adj-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any detail worth remembering" />
        </div>
      </div>
      <div className="flex gap-3 border-t border-border pt-4">
        <button type="submit" className="btn btn-primary">
          <Check className="h-4 w-4" aria-hidden="true" /> {initial ? "Save entry" : "Add entry"}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
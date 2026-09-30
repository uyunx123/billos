import type { Order } from "../context/StoreContext";

/* ------------------------------------------------------------------ */
/* Payroll & ledger types                                              */
/* ------------------------------------------------------------------ */

export interface PayrollEmployee {
  id: string;
  name: string;
  role: string;
  /** Fixed salary in Rupiah per month — accrues automatically each month while active. */
  monthlySalary: number;
  /** Per-event rate in Rupiah (per match, per shift…) — used to pre-fill payout amounts. */
  perEventRate: number;
  /** Default monthly bonus in Rupiah — pre-filled when a salary invoice is created. */
  bonus: number;
  /** Default overtime pay in Rupiah for the month — pre-filled on the salary invoice. */
  overtime: number;
  /** Tax rate as a percentage (0–100) withheld from the gross salary invoice. */
  taxRate: number;
  active: boolean;
  /** ISO date the employee started. Full salary counts from this month onward. */
  joinedAt: string;
}

export type PayoutKind = "match" | "shift" | "other";

export interface PayoutEntry {
  id: string;
  employeeId: string;
  /** e.g. "Jakarta Open — Match #12" or "Saturday shift". */
  label: string;
  kind: PayoutKind;
  date: string; // ISO
  /** Rupiah — pre-filled from the employee's per-event rate. */
  amount: number;
  note?: string;
}

export interface AccountingAdjustment {
  id: string;
  kind: "income" | "expense";
  /** e.g. "Tournament entry fees", "Venue hire", "Utilities". */
  category: string;
  label: string;
  amount: number; // Rupiah (positive)
  date: string; // ISO
  note?: string;
}

export interface AccountingConfig {
  employees: PayrollEmployee[];
  payouts: PayoutEntry[];
  adjustments: AccountingAdjustment[];
  /** Issued monthly salary invoices (bonus & overtime entered manually per period). */
  invoices: SalaryInvoice[];
}

export const EMPTY_ACCOUNTING: AccountingConfig = {
  employees: [],
  payouts: [],
  adjustments: [],
  invoices: [],
};

/**
 * A printable salary slip for one employee for one month. Base salary comes
 * from the employee; bonus and overtime are typed in manually right before
 * the invoice is printed; tax is withheld from the gross at the tax rate.
 */
export interface SalaryInvoice {
  id: string;
  employeeId: string;
  /** Pay period as "YYYY-MM". */
  month: string;
  /** Base salary for the period (Rupiah). */
  salary: number;
  /** Manual bonus entered before printing (Rupiah). */
  bonus: number;
  /** Manual overtime entered before printing (Rupiah). */
  overtime: number;
  /** Tax rate percent used on this invoice (defaults to the employee's). */
  taxRate: number;
  /** Withheld tax = gross × taxRate / 100. */
  taxAmount: number;
  /** Take-home = gross − tax. */
  net: number;
  note?: string;
  issuedAt: string;
}

/** Gross = salary + bonus + overtime; tax = gross × rate; net = gross − tax. */
export function salaryInvoiceBreakdown(salary: number, bonus: number, overtime: number, taxRate: number) {
  const gross = Math.max(0, salary) + Math.max(0, bonus) + Math.max(0, overtime);
  const taxAmount = Math.round((gross * Math.max(0, Math.min(100, taxRate))) / 100);
  const net = gross - taxAmount;
  return { gross, taxAmount, net };
}

/** Month label for an invoice, e.g. "2026-09" → "Sep 2026". */
export function invoiceMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

export const SUGGESTED_CATEGORIES = [
  "Tournament entry fees",
  "Prize pool",
  "Sponsorship",
  "Venue hire",
  "Rent",
  "Utilities",
  "Marketing",
  "Equipment purchase",
  "Repairs",
  "Other",
];

/* ------------------------------------------------------------------ */
/* Month helpers                                                       */
/* ------------------------------------------------------------------ */

export function monthKeyOf(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  return monthKeyOf(new Date());
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(
    new Date(y, m - 1, 1)
  );
}

/* ------------------------------------------------------------------ */
/* Monthly P&L                                                         */
/* ------------------------------------------------------------------ */

export interface MonthFinance {
  key: string;
  label: string;
  /** Accepted payments — order total including shipping. */
  storeRevenue: number;
  /** Coupon discounts given on accepted orders (contra revenue). */
  couponDiscounts: number;
  /** Income ledger adjustments (tournament fees, sponsorship…). */
  otherIncome: number;
  totalIncome: number;
  /** Refunded order totals. */
  refunds: number;
  /** Auto-accrued fixed monthly salaries. */
  fixedSalaries: number;
  /** Per-event payouts from the payout log. */
  eventPayouts: number;
  /** Expense ledger adjustments (venue, utilities…). */
  otherExpenses: number;
  totalExpenses: number;
  netProfit: number;
}

export function emptyMonth(key: string): MonthFinance {
  return {
    key,
    label: monthLabel(key),
    storeRevenue: 0,
    couponDiscounts: 0,
    otherIncome: 0,
    totalIncome: 0,
    refunds: 0,
    fixedSalaries: 0,
    eventPayouts: 0,
    otherExpenses: 0,
    totalExpenses: 0,
    netProfit: 0,
  };
}

export interface AccountingTotals {
  storeRevenue: number;
  couponDiscounts: number;
  otherIncome: number;
  totalIncome: number;
  refunds: number;
  fixedSalaries: number;
  eventPayouts: number;
  otherExpenses: number;
  totalExpenses: number;
  netProfit: number;
}

export interface AccountingReport {
  /** All months with activity plus the current month, ascending. */
  months: MonthFinance[];
  totals: AccountingTotals;
}

export function totalsOf(months: MonthFinance[]): AccountingTotals {
  const t: AccountingTotals = {
    storeRevenue: 0,
    couponDiscounts: 0,
    otherIncome: 0,
    totalIncome: 0,
    refunds: 0,
    fixedSalaries: 0,
    eventPayouts: 0,
    otherExpenses: 0,
    totalExpenses: 0,
    netProfit: 0,
  };
  for (const m of months) {
    t.storeRevenue += m.storeRevenue;
    t.couponDiscounts += m.couponDiscounts;
    t.otherIncome += m.otherIncome;
    t.totalIncome += m.totalIncome;
    t.refunds += m.refunds;
    t.fixedSalaries += m.fixedSalaries;
    t.eventPayouts += m.eventPayouts;
    t.otherExpenses += m.otherExpenses;
    t.totalExpenses += m.totalExpenses;
    t.netProfit += m.netProfit;
  }
  return t;
}

/**
 * Derive the full monthly P&L from the app's own data:
 *  - store revenue/refunds/coupons from confirmed orders (auto)
 *  - fixed salaries auto-accrue for every month an active employee is on staff
 *  - per-event payouts come from the payout log (amounts pre-filled from rates)
 *  - tournament fees & ad-hoc items come from the income/expense ledger
 */
export function computeAccounting(orders: Order[], config: AccountingConfig): AccountingReport {
  const byKey = new Map<string, MonthFinance>();
  const ensure = (key: string): MonthFinance => {
    let m = byKey.get(key);
    if (!m) {
      m = emptyMonth(key);
      byKey.set(key, m);
    }
    return m;
  };

  // Store — accepted payments are income, refunds are an expense.
  for (const o of orders) {
    const key = monthKeyOf(o.createdAt);
    if (!key) continue;
    const m = ensure(key);
    if (o.paymentStatus === "accepted") {
      m.storeRevenue += o.total;
      m.couponDiscounts += o.discount ?? 0;
    } else if (o.paymentStatus === "refunded") {
      m.refunds += o.total;
    }
  }

  // Ledger adjustments (tournament fees, sponsorship, venue, utilities…).
  for (const a of config.adjustments) {
    const key = monthKeyOf(a.date);
    if (!key) continue;
    const m = ensure(key);
    if (a.kind === "income") m.otherIncome += a.amount;
    else m.otherExpenses += a.amount;
  }

  // Per-event payouts.
  for (const p of config.payouts) {
    const key = monthKeyOf(p.date);
    if (!key) continue;
    ensure(key).eventPayouts += p.amount;
  }

  // Fixed salaries — accrue for every month from the join month onward.
  const allKeys = new Set<string>([...byKey.keys(), currentMonthKey()]);
  for (const emp of config.employees) {
    if (!emp.active || emp.monthlySalary <= 0) continue;
    const start = monthKeyOf(emp.joinedAt) || currentMonthKey();
    for (const key of allKeys) {
      if (key >= start) ensure(key).fixedSalaries += emp.monthlySalary;
    }
  }

  const months = Array.from(allKeys)
    .sort()
    .map((key) => {
      const m = ensure(key);
      m.totalIncome = m.storeRevenue + m.otherIncome;
      m.totalExpenses =
        m.refunds + m.couponDiscounts + m.fixedSalaries + m.eventPayouts + m.otherExpenses;
      m.netProfit = m.totalIncome - m.totalExpenses;
      return m;
    });

  return { months, totals: totalsOf(months) };
}

export type ReportPeriod = "month" | "3" | "6" | "all";

export function filterMonths(months: MonthFinance[], period: ReportPeriod): MonthFinance[] {
  if (period === "all") return months;
  const n = period === "month" ? 1 : Number(period);
  return months.slice(-n);
}

export function employeeName(config: AccountingConfig, id: string): string {
  return config.employees.find((e) => e.id === id)?.name ?? "Unknown staff";
}
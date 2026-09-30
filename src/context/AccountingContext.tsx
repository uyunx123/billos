import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_ACCOUNTING,
  type AccountingAdjustment,
  type AccountingConfig,
  type OfflineSale,
  type PayrollEmployee,
  type PayoutEntry,
  type SalaryInvoice,
} from "../lib/accounting";

/* ------------------------------------------------------------------ */
/* Persistence helpers                                                 */
/* ------------------------------------------------------------------ */

const ACCOUNTING_KEY = "isak-accounting-v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — demo only */
  }
}

/** Sanitize anything stored under the key into a valid config shape. */
export function normalizeConfig(raw: unknown): AccountingConfig {
  const base = (raw && typeof raw === "object" ? raw : {}) as Partial<AccountingConfig>;
  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const str = (v: unknown): string => (typeof v === "string" ? v : "");

  const employees: PayrollEmployee[] = Array.isArray(base.employees)
    ? base.employees.map((e) => ({
        id: str(e.id),
        name: str(e.name),
        role: str(e.role),
        monthlySalary: num(e.monthlySalary),
        perEventRate: num(e.perEventRate),
        bonus: num(e.bonus),
        overtime: num(e.overtime),
        taxRate: num(e.taxRate),
        active: e.active !== false,
        joinedAt: str(e.joinedAt),
      }))
    : [];

  const invoices: SalaryInvoice[] = Array.isArray(base.invoices)
    ? base.invoices.map((i) => ({
        id: str(i.id),
        employeeId: str(i.employeeId),
        month: str(i.month),
        salary: num(i.salary),
        bonus: num(i.bonus),
        overtime: num(i.overtime),
        taxRate: num(i.taxRate),
        taxAmount: num(i.taxAmount),
        net: num(i.net),
        note: str(i.note) || undefined,
        issuedAt: str(i.issuedAt),
      }))
    : [];

  const payouts: PayoutEntry[] = Array.isArray(base.payouts)
    ? base.payouts.map((p) => ({
        id: str(p.id),
        employeeId: str(p.employeeId),
        label: str(p.label),
        kind: p.kind === "shift" || p.kind === "other" ? p.kind : "match",
        date: str(p.date),
        amount: num(p.amount),
        note: str(p.note) || undefined,
      }))
    : [];

  const adjustments: AccountingAdjustment[] = Array.isArray(base.adjustments)
    ? base.adjustments.map((a) => ({
        id: str(a.id),
        kind: a.kind === "expense" ? "expense" : "income",
        category: str(a.category),
        label: str(a.label),
        amount: num(a.amount),
        date: str(a.date),
        note: str(a.note) || undefined,
      }))
    : [];

  const sales: OfflineSale[] = Array.isArray(base.sales)
    ? base.sales.map((s) => ({
        id: str(s.id),
        invoiceNumber: str(s.invoiceNumber),
        productId: str(s.productId),
        productName: str(s.productName),
        image: typeof s.image === "string" && s.image ? s.image : undefined,
        qty: Math.max(1, Math.round(num(s.qty) || 1)),
        unitPrice: Math.max(0, Math.round(num(s.unitPrice) || 0)),
        total: Math.max(0, Math.round(num(s.total) || 0)),
        date: str(s.date),
        note: typeof s.note === "string" && s.note ? s.note : undefined,
        createdAt: str(s.createdAt),
      }))
    : [];

  return { employees, payouts, adjustments, invoices, sales };
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface AccountingContextValue {
  config: AccountingConfig;
  employees: PayrollEmployee[];
  payouts: PayoutEntry[];
  adjustments: AccountingAdjustment[];
  invoices: SalaryInvoice[];
  addEmployee: (e: Omit<PayrollEmployee, "id">) => PayrollEmployee;
  updateEmployee: (id: string, patch: Partial<PayrollEmployee>) => void;
  deleteEmployee: (id: string) => void;
  addPayout: (p: Omit<PayoutEntry, "id">) => PayoutEntry;
  updatePayout: (id: string, patch: Partial<PayoutEntry>) => void;
  deletePayout: (id: string) => void;
  addAdjustment: (a: Omit<AccountingAdjustment, "id">) => AccountingAdjustment;
  updateAdjustment: (id: string, patch: Partial<AccountingAdjustment>) => void;
  deleteAdjustment: (id: string) => void;
  addInvoice: (i: Omit<SalaryInvoice, "id">) => SalaryInvoice;
  updateInvoice: (id: string, patch: Partial<SalaryInvoice>) => void;
  deleteInvoice: (id: string) => void;
  sales: OfflineSale[];
  addSale: (s: Omit<OfflineSale, "id" | "createdAt">) => OfflineSale;
  deleteSale: (id: string) => void;
}

const AccountingContext = createContext<AccountingContextValue | null>(null);

export function AccountingProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AccountingConfig>(() =>
    normalizeConfig(readJson(ACCOUNTING_KEY, EMPTY_ACCOUNTING))
  );

  useEffect(() => writeJson(ACCOUNTING_KEY, config), [config]);

  const addEmployee = useCallback((e: Omit<PayrollEmployee, "id">): PayrollEmployee => {
    const employee: PayrollEmployee = {
      ...e,
      id: `emp-${Date.now().toString(36)}`,
      monthlySalary: Math.max(0, Math.round(e.monthlySalary || 0)),
      perEventRate: Math.max(0, Math.round(e.perEventRate || 0)),
      bonus: Math.max(0, Math.round(e.bonus || 0)),
      overtime: Math.max(0, Math.round(e.overtime || 0)),
      taxRate: Math.max(0, Math.min(100, Math.round(e.taxRate || 0))),
    };
    setConfig((prev) => ({ ...prev, employees: [...prev.employees, employee] }));
    return employee;
  }, []);

  const updateEmployee = useCallback((id: string, patch: Partial<PayrollEmployee>) => {
    setConfig((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== id),
      payouts: prev.payouts.filter((p) => p.employeeId !== id),
    }));
  }, []);

  const addPayout = useCallback((p: Omit<PayoutEntry, "id">): PayoutEntry => {
    const payout: PayoutEntry = { ...p, id: `pay-${Date.now().toString(36)}`, amount: Math.max(0, Math.round(p.amount || 0)) };
    setConfig((prev) => ({ ...prev, payouts: [...prev.payouts, payout] }));
    return payout;
  }, []);

  const updatePayout = useCallback((id: string, patch: Partial<PayoutEntry>) => {
    setConfig((prev) => ({
      ...prev,
      payouts: prev.payouts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const deletePayout = useCallback((id: string) => {
    setConfig((prev) => ({ ...prev, payouts: prev.payouts.filter((p) => p.id !== id) }));
  }, []);

  const addAdjustment = useCallback((a: Omit<AccountingAdjustment, "id">): AccountingAdjustment => {
    const adjustment: AccountingAdjustment = {
      ...a,
      id: `adj-${Date.now().toString(36)}`,
      amount: Math.max(0, Math.round(a.amount || 0)),
    };
    setConfig((prev) => ({ ...prev, adjustments: [...prev.adjustments, adjustment] }));
    return adjustment;
  }, []);

  const updateAdjustment = useCallback((id: string, patch: Partial<AccountingAdjustment>) => {
    setConfig((prev) => ({
      ...prev,
      adjustments: prev.adjustments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const deleteAdjustment = useCallback((id: string) => {
    setConfig((prev) => ({ ...prev, adjustments: prev.adjustments.filter((a) => a.id !== id) }));
  }, []);

  const addSale = useCallback((s: Omit<OfflineSale, "id" | "createdAt">): OfflineSale => {
    const qty = Math.max(1, Math.round(s.qty || 1));
    const unitPrice = Math.max(0, Math.round(s.unitPrice || 0));
    const sale: OfflineSale = {
      ...s,
      id: `sale-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      qty,
      unitPrice,
      total: Math.max(0, Math.round(qty * unitPrice)),
      createdAt: new Date().toISOString(),
    };
    setConfig((prev) => ({ ...prev, sales: [...prev.sales, sale] }));
    return sale;
  }, []);

  const deleteSale = useCallback((id: string) => {
    setConfig((prev) => ({ ...prev, sales: prev.sales.filter((s) => s.id !== id) }));
  }, []);

  const addInvoice = useCallback((i: Omit<SalaryInvoice, "id">): SalaryInvoice => {
    const invoice: SalaryInvoice = {
      ...i,
      id: `inv-${Date.now().toString(36)}`,
      salary: Math.max(0, Math.round(i.salary || 0)),
      bonus: Math.max(0, Math.round(i.bonus || 0)),
      overtime: Math.max(0, Math.round(i.overtime || 0)),
      taxRate: Math.max(0, Math.min(100, Math.round(i.taxRate || 0))),
      taxAmount: Math.max(0, Math.round(i.taxAmount || 0)),
      net: Math.max(0, Math.round(i.net || 0)),
      issuedAt: i.issuedAt || new Date().toISOString(),
    };
    setConfig((prev) => ({
      ...prev,
      invoices: [
        ...prev.invoices.filter((x) => !(x.employeeId === invoice.employeeId && x.month === invoice.month)),
        invoice,
      ],
    }));
    return invoice;
  }, []);

  const updateInvoice = useCallback((id: string, patch: Partial<SalaryInvoice>) => {
    setConfig((prev) => ({
      ...prev,
      invoices: prev.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setConfig((prev) => ({ ...prev, invoices: prev.invoices.filter((i) => i.id !== id) }));
  }, []);

  const value = useMemo<AccountingContextValue>(
    () => ({
      config,
      employees: config.employees,
      payouts: config.payouts,
      adjustments: config.adjustments,
      invoices: config.invoices,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      addPayout,
      updatePayout,
      deletePayout,
      addAdjustment,
      updateAdjustment,
      deleteAdjustment,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      sales: config.sales,
      addSale,
      deleteSale,
    }),
    [
      config,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      addPayout,
      updatePayout,
      deletePayout,
      addAdjustment,
      updateAdjustment,
      deleteAdjustment,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      addSale,
      deleteSale,
    ]
  );

  return <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>;
}

export function useAccounting(): AccountingContextValue {
  const ctx = useContext(AccountingContext);
  if (!ctx) throw new Error("useAccounting must be used within AccountingProvider");
  return ctx;
}
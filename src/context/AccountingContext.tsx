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
  type PayrollEmployee,
  type PayoutEntry,
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
        active: e.active !== false,
        joinedAt: str(e.joinedAt),
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

  return { employees, payouts, adjustments };
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface AccountingContextValue {
  config: AccountingConfig;
  employees: PayrollEmployee[];
  payouts: PayoutEntry[];
  adjustments: AccountingAdjustment[];
  addEmployee: (e: Omit<PayrollEmployee, "id">) => PayrollEmployee;
  updateEmployee: (id: string, patch: Partial<PayrollEmployee>) => void;
  deleteEmployee: (id: string) => void;
  addPayout: (p: Omit<PayoutEntry, "id">) => PayoutEntry;
  updatePayout: (id: string, patch: Partial<PayoutEntry>) => void;
  deletePayout: (id: string) => void;
  addAdjustment: (a: Omit<AccountingAdjustment, "id">) => AccountingAdjustment;
  updateAdjustment: (id: string, patch: Partial<AccountingAdjustment>) => void;
  deleteAdjustment: (id: string) => void;
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
      employees: prev.employees.filter((e) => e.id !== id),
      payouts: prev.payouts.filter((p) => p.employeeId !== id),
      adjustments: prev.adjustments,
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

  const value = useMemo<AccountingContextValue>(
    () => ({
      config,
      employees: config.employees,
      payouts: config.payouts,
      adjustments: config.adjustments,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      addPayout,
      updatePayout,
      deletePayout,
      addAdjustment,
      updateAdjustment,
      deleteAdjustment,
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
    ]
  );

  return <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>;
}

export function useAccounting(): AccountingContextValue {
  const ctx = useContext(AccountingContext);
  if (!ctx) throw new Error("useAccounting must be used within AccountingProvider");
  return ctx;
}

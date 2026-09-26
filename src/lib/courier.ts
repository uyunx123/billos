/* ------------------------------------------------------------------ */
/* Courier catalogue + Biteship tracking helpers                       */
/* ------------------------------------------------------------------ */

export interface CourierEntry {
  /** Biteship courier_company code (jne, jnt, sicepat, …). */
  code: string;
  name: string;
  /** Optional deep-link to the courier's own tracking page. */
  trackUrl?: (awb: string) => string;
}

export const COURIER_CATALOG: CourierEntry[] = [
  { code: "jne", name: "JNE", trackUrl: (awb) => `https://www.jne.co.id/tracking/trace?awb=${encodeURIComponent(awb)}` },
  { code: "jnt", name: "J&T Express", trackUrl: () => "https://www.jtexpress.id/trace/track_waybill" },
  { code: "sicepat", name: "SiCepat", trackUrl: () => "https://sicepat.com/tracking" },
  { code: "anteraja", name: "AnterAja", trackUrl: () => "https://anteraja.id/tracking" },
  { code: "ninja", name: "Ninja Express", trackUrl: () => "https://www.ninjaexpress.id/tracking" },
  { code: "pos", name: "POS Indonesia", trackUrl: () => "https://www.posindonesia.co.id/tracking" },
  { code: "lion", name: "Lion Parcel", trackUrl: () => "https://lionparcel.com/tracking" },
  { code: "wahana", name: "Wahana Express", trackUrl: () => "https://wahanaexpress.com/tracking" },
  { code: "rex", name: "REX Express", trackUrl: () => "https://rex.id/tracking" },
  { code: "ide", name: "ID Express", trackUrl: () => "https://idexpress.co.id/tracking" },
  { code: "sap", name: "SAP Express", trackUrl: () => "https://sap.id/tracking" },
];

export function courierName(code?: string): string {
  if (!code) return "";
  const hit = COURIER_CATALOG.find((c) => c.code === code.toLowerCase());
  return hit?.name ?? code;
}

export function courierTrackUrl(code?: string, awb?: string): string | null {
  if (!code || !awb) return null;
  const hit = COURIER_CATALOG.find((c) => c.code === code.toLowerCase());
  return hit?.trackUrl ? hit.trackUrl(awb) : null;
}

/** Best-effort guess of a Biteship courier code from a display name. */
export function courierCodeFromName(name?: string): string | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  const exact = COURIER_CATALOG.find(
    (c) => n === c.name.toLowerCase() || n === c.code || n.includes(c.code)
  );
  if (exact) return exact.code;
  const fuzzy = COURIER_CATALOG.find(
    (c) => n.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(n)
  );
  return fuzzy?.code;
}

export type CourierStatusKey =
  | "awaiting"
  | "picked"
  | "transit"
  | "delivered"
  | "cancelled"
  | "unknown";

export interface CourierHistoryEntry {
  time: string;
  note: string;
}

export interface CourierTracking {
  courierCode: string;
  courierName: string;
  waybill: string;
  /** Raw status line from the courier, e.g. "Paket diterima kurir". */
  status: string;
  statusKey: CourierStatusKey;
  history: CourierHistoryEntry[];
  updatedAt: string;
}

/** Maps the courier's raw status text to a stable key. Order matters:
 *  "diterima kurir" (picked) must be tested before the delivered rules. */
export function courierStatusKey(raw: string): CourierStatusKey {
  const s = raw.toLowerCase();
  if (/(batal|cancel|returned|retur|gagal|failed)/.test(s)) return "cancelled";
  if (/(diterima oleh|telah diterima|sudah diterima|diterima pembeli|diterima penerima|delivered|received|complete|selesai)/.test(s)) return "delivered";
  if (/(diterima kurir|pickup|diambil|di pick|with courier)/.test(s)) return "picked";
  if (/(transit|dalam perjalanan|in transit|menuju|proses pengiriman|shipped|on the way|out for delivery|dalam pengiriman)/.test(s)) return "transit";
  if (/(menunggu pickup|menunggu|pending|created|awaiting|diproses)/.test(s)) return "awaiting";
  return "unknown";
}

export const STATUS_KEY_LABEL: Record<CourierStatusKey, string> = {
  awaiting: "Awaiting pickup",
  picked: "Picked up by courier",
  transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
  unknown: "In progress",
};

/** Normalizes a Biteship tracking response into the app's shape. Parses
 *  defensively so small API-shape changes don't break the storefront. */
export function normalizeBiteshipTracking(raw: unknown): CourierTracking | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const courierObj = (data.courier ?? {}) as Record<string, unknown>;
  const waybillObj = (data.waybill ?? {}) as Record<string, unknown>;
  const statusRaw = String(data.status ?? waybillObj.status ?? courierObj.status ?? "")
    .replace(/^status:\s*/i, "")
    .trim();
  const historyRaw = Array.isArray(data.history)
    ? (data.history as Record<string, unknown>[])
    : [];
  const history: CourierHistoryEntry[] = historyRaw
    .map((h) => ({
      time: String(h.updated_at ?? h.time ?? h.date ?? h.created_at ?? ""),
      note: String(h.note ?? h.description ?? h.status ?? ""),
    }))
    .filter((h) => h.note);
  const updatedAt = history[0]?.time || new Date().toISOString();
  return {
    courierCode: String(courierObj.company ?? courierObj.code ?? "").toLowerCase(),
    courierName: String(courierObj.name ?? courierObj.company ?? ""),
    waybill: String(waybillObj.waybill_number ?? waybillObj.waybill ?? ""),
    status: statusRaw,
    statusKey: courierStatusKey(statusRaw),
    history,
    updatedAt,
  };
}

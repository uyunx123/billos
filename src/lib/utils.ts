export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(d: string | null | undefined): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function playerName(p: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  alias?: string | null;
} | null): string {
  if (!p) return "TBD";
  return (
    p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    p.alias ||
    "TBD"
  );
}

export const STATUS_LABELS: Record<string, string> = {
  setup: "Setup",
  registration: "Registration",
  draw: "Draw",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
  pending: "Pending",
  scheduled: "Scheduled",
  live: "Live",
  bye: "Bye",
  walkover: "Walkover",
  confirmed: "Confirmed",
  waitlist: "Waitlist",
  withdrawn: "Withdrawn",
};

export function statusTone(status: string): "green" | "amber" | "red" | "gray" | "blue" {
  switch (status) {
    case "completed":
    case "confirmed":
    case "ongoing":
      return "green";
    case "registration":
    case "draw":
    case "scheduled":
    case "waitlist":
      return "amber";
    case "cancelled":
    case "withdrawn":
    case "walkover":
      return "red";
    case "live":
      return "blue";
    default:
      return "gray";
  }
}
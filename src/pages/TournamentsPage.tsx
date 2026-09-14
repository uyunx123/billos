import { useMemo, useState } from "react";
import { Search, Trophy } from "lucide-react";
import { EmptyState, Input, Select, Spinner } from "../components/ui";
import { useAsync, fetchTournaments } from "../lib/data";
import { STATUS_LABELS } from "../lib/utils";
import type { Discipline, Tournament } from "../lib/types";

const STATUS_FILTERS = ["all", "registration", "draw", "ongoing", "completed"];

function TournamentCard({
  tournament,
}: {
  tournament: Tournament & { disciplines: Discipline | null };
}) {
  const statusLabel = STATUS_LABELS[tournament.status] ?? tournament.status;
  const disciplineName = tournament.disciplines?.name;
  const dates = [tournament.start_date, tournament.end_date]
    .filter(Boolean)
    .join(" – ");

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-primary/50">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="font-heading text-lg font-bold leading-snug">{tournament.name}</h2>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {statusLabel}
        </span>
      </div>
      {disciplineName && (
        <p className="text-sm font-medium text-accent">{disciplineName}</p>
      )}
      {tournament.venue && <p className="mt-1 text-sm text-muted">{tournament.venue}</p>}
      {dates && <p className="mt-1 text-sm text-muted">{dates}</p>}
      {tournament.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted">{tournament.description}</p>
      )}
    </article>
  );
}

export function TournamentsPage() {
  const { data: tournaments, loading, error } = useAsync(() => fetchTournaments(), []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    let list = tournaments ?? [];
    if (status !== "all") list = list.filter((t) => t.status === status);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.venue ?? "").toLowerCase().includes(q) ||
          t.disciplines?.name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [tournaments, query, status]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-extrabold">Tournaments</h1>
        <p className="mt-1 text-muted">Find your next event and register to play.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder="Search by name, venue or discipline…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search tournaments"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="sm:w-48"
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Spinner label="Loading tournaments…" />
      ) : error ? (
        <EmptyState
          icon={<Trophy className="h-8 w-8" />}
          title="Couldn't load tournaments"
          message={error}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title={query || status !== "all" ? "No matching tournaments" : "No tournaments yet"}
          message={
            query || status !== "all"
              ? "Try adjusting your search or filters."
              : "Tournaments will be listed here once published."
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}
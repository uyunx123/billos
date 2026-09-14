import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { Badge, Card, EmptyState, Select, Spinner } from "../../components/ui";
import { fetchScheduleMatches, fetchTournaments, useAsync } from "../../lib/data";
import { formatDateTime, playerName, STATUS_LABELS, statusTone } from "../../lib/utils";

export function AdminSchedulePage() {
  const matches = useAsync(() => fetchScheduleMatches(), []);
  const tournaments = useAsync(() => fetchTournaments(), []);
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = matches.data ?? [];
    if (filter !== "all") list = list.filter((m) => m.tournament_id === filter);
    return list;
  }, [matches.data, filter]);

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-extrabold">
            <CalendarClock className="h-6 w-6 text-primary" aria-hidden="true" /> Schedule
          </h1>
          <p className="text-sm text-muted">Every scheduled match, grouped for the day of play.</p>
        </div>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="sm:w-64"
          aria-label="Filter by tournament"
        >
          <option value="all">All tournaments</option>
          {(tournaments.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </div>

      {matches.loading ? (
        <Spinner label="Loading schedule…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-8 w-8" />}
          title="Nothing scheduled"
          message="Assign tables and start times from the Matches page to build the schedule."
          action={
            <Link to="/admin/matches" className="text-sm font-semibold text-primary cursor-pointer hover:underline">
              Go to Matches →
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((m) => (
            <Card key={m.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold">
                  {playerName(m.players_a ?? null)} <span className="text-muted">vs</span> {playerName(m.players_b ?? null)}
                </p>
                <p className="text-xs text-muted">
                  {m.tournaments?.name ?? ""} · Round {m.round_no}
                  {m.tables?.name ? ` · ${m.tables.name}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm text-muted">{formatDateTime(m.scheduled_at)}</span>
                <Badge tone={statusTone(m.status)}>{STATUS_LABELS[m.status]}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
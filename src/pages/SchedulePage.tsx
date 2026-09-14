import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Radio } from "lucide-react";
import { Badge, Card, EmptyState, Select, Spinner } from "../components/ui";
import { fetchScheduleMatches, useAsync } from "../lib/data";
import { fetchTournaments } from "../lib/data";
import { formatDateTime, playerName, STATUS_LABELS, statusTone } from "../lib/utils";
import type { MatchWithJoins } from "../lib/data";

function matchName(m: MatchWithJoins): string {
  const a = m.players_a ? playerName(m.players_a) : "TBD";
  const b = m.players_b ? playerName(m.players_b) : "TBD";
  return `${a} vs ${b}`;
}

export function SchedulePage() {
  const matches = useAsync(() => fetchScheduleMatches(), []);
  const tournaments = useAsync(() => fetchTournaments(), []);
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = matches.data ?? [];
    if (filter !== "all") list = list.filter((m) => m.tournament_id === filter);
    return list;
  }, [matches.data, filter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="flex items-center gap-2.5 font-heading text-3xl font-extrabold">
          <CalendarClock className="h-7 w-7 text-primary" aria-hidden="true" />
          Match schedule
        </h1>
        <p className="mt-1 text-muted">Every scheduled match across all tournaments, newest dates first.</p>
      </div>

      <div className="mb-6 max-w-xs">
        <label htmlFor="schedule-filter" className="mb-1.5 block text-sm font-medium">
          Tournament
        </label>
        <Select id="schedule-filter" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by tournament">
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
          title="Nothing scheduled yet"
          message="Matches appear here once the committee assigns tables and start times."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Match</th>
                  <th className="px-4 py-3 font-semibold">Tournament</th>
                  <th className="px-4 py-3 font-semibold">Scheduled</th>
                  <th className="px-4 py-3 font-semibold">Table</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((m, i) => (
                  <tr key={m.id} className={i % 2 ? "bg-surface" : "bg-transparent"}>
                    <td className="px-4 py-3 font-medium">
                      {matchName(m)}
                      {m.on_tv && (
                        <Badge tone="amber" className="ml-2" pulse>
                          <Radio className="h-3 w-3" aria-hidden="true" /> TV
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {m.tournaments ? (
                        <Link to={`/tournaments/${m.tournaments.slug}`} className="cursor-pointer hover:text-primary">
                          {m.tournaments.name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(m.scheduled_at)}</td>
                    <td className="px-4 py-3 text-muted">{m.tables?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(m.status)}>{STATUS_LABELS[m.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MonitorPlay, Radio } from "lucide-react";
import { Badge, Card, EmptyState, Select, Spinner } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { fetchMatches, fetchTournaments, useAsync } from "../../lib/data";
import { playerName, STATUS_LABELS, statusTone } from "../../lib/utils";

/** Configure which matches are pushed to the TV scoreboard screens. */
export function AdminTvPage() {
  const tournaments = useAsync(() => fetchTournaments(), []);
  const [tournamentId, setTournamentId] = useState("all");
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof fetchMatches>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tournamentId === "all") {
        const results = await Promise.all(
          (tournaments.data ?? []).map((t) => fetchMatches(t.id)),
        );
        setMatches(results.flat());
      } else {
        setMatches(await fetchMatches(tournamentId));
      }
    } finally {
      setLoading(false);
    }
  }, [tournamentId, tournaments.data]);

  useEffect(() => {
    if (tournaments.data) load();
  }, [tournaments.data, load]);

  const onTv = useMemo(() => matches.filter((m) => m.on_tv).sort((a, b) => (a.tv_position ?? 99) - (b.tv_position ?? 99)), [matches]);
  const available = useMemo(() => matches.filter((m) => !m.on_tv && m.status !== "completed"), [matches]);

  const toggle = async (id: string, current: boolean) => {
    const nextPos = !current ? onTv.length + 1 : null;
    await supabase.from("matches").update({ on_tv: !current, tv_position: nextPos }).eq("id", id);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-extrabold">
            <MonitorPlay className="h-6 w-6 text-primary" aria-hidden="true" /> TV screens
          </h1>
          <p className="text-sm text-muted">Pick matches for the big screen. Position 1 plays first.</p>
        </div>
        <Select
          value={tournamentId}
          onChange={(e) => setTournamentId(e.target.value)}
          className="sm:w-64"
          aria-label="Filter by tournament"
        >
          <option value="all">All tournaments</option>
          {(tournaments.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Spinner label="Loading matches…" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold">
              <Radio className="h-5 w-5 text-amber-500" aria-hidden="true" /> On air
            </h2>
            {onTv.length === 0 ? (
              <EmptyState
                icon={<MonitorPlay className="h-8 w-8" />}
                title="Nothing on air"
                message="Add matches from the available list to start broadcasting."
              />
            ) : (
              <div className="space-y-2">
                {onTv.map((m) => (
                  <Card key={m.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <Badge tone="amber">{m.tv_position}</Badge>
                        <span className="truncate">
                          {playerName(m.players_a)} vs {playerName(m.players_b)}
                        </span>
                      </p>
                      <p className="text-xs text-muted">{m.tournaments?.name ?? m.tournament_id}</p>
                    </div>
                    <button
                      onClick={() => toggle(m.id, true)}
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-destructive cursor-pointer hover:underline"
                    >
                      Take off air
                    </button>
                  </Card>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              Preview the screens at{" "}
              <Link to="/tv" className="font-semibold text-primary cursor-pointer hover:underline">/tv</Link>.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-heading text-lg font-bold">Available</h2>
            {available.length === 0 ? (
              <p className="text-sm text-muted">No unassigned active matches.</p>
            ) : (
              <div className="space-y-2">
                {available.map((m) => (
                  <Card key={m.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {playerName(m.players_a)} vs {playerName(m.players_b)}
                      </p>
                      <p className="text-xs text-muted">
                        {m.tournaments?.name ?? ""} · <Badge tone={statusTone(m.status)}>{STATUS_LABELS[m.status]}</Badge>
                      </p>
                    </div>
                    <button
                      onClick={() => toggle(m.id, false)}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary cursor-pointer transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
                    >
                      Put on air
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
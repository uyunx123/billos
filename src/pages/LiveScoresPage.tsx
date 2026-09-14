import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { Badge, Card, EmptyState, Spinner } from "../components/ui";
import { fetchLiveMatches } from "../lib/data";
import { supabase } from "../lib/supabase";
import { formatDateTime, playerName, STATUS_LABELS, statusTone } from "../lib/utils";
import type { MatchWithJoins } from "../lib/data";

function matchName(m: MatchWithJoins): string {
  const a = m.players_a ? playerName(m.players_a) : "TBD";
  const b = m.players_b ? playerName(m.players_b) : "TBD";
  return `${a} vs ${b}`;
}

export function LiveScoresPage() {
  const [matches, setMatches] = useState<MatchWithJoins[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setMatches(await fetchLiveMatches());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Poll every 20s so the scoreboard stays fresh without manual refresh.
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to match updates for instant score refresh.
  useEffect(() => {
    const channel = supabase
      .channel("live-scores")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const live = useMemo(() => matches.filter((m) => m.status === "live"), [matches]);
  const scheduled = useMemo(() => matches.filter((m) => m.status === "scheduled"), [matches]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 font-heading text-3xl font-extrabold">
            <Activity className="h-7 w-7 text-primary" aria-hidden="true" />
            Live scores
          </h1>
          <p className="mt-1 text-muted">Updates automatically as referees score matches.</p>
        </div>
        <Badge tone="blue" pulse>Live</Badge>
      </div>

      {loading ? (
        <Spinner label="Loading live scores…" />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-8 w-8" />}
          title="No live action right now"
          message="Live and upcoming matches will show here the moment they're scheduled."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Live matches */}
          <section>
            <h2 className="mb-4 font-heading text-xl font-extrabold">On the tables now</h2>
            {live.length === 0 ? (
              <p className="text-sm text-muted">No matches in play at the moment.</p>
            ) : (
              <div className="space-y-3">
                {live.map((m) => (
                  <Link key={m.id} to={`/tournaments/${m.tournaments?.slug ?? ""}`} className="block cursor-pointer">
                    <Card hover className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge tone="blue" pulse>Live</Badge>
                        <span className="text-xs text-muted">{m.tables?.name ?? ""}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{matchName(m)}</p>
                        <p className="shrink-0 font-heading text-2xl font-extrabold">
                          {m.score_a} <span className="text-muted">–</span> {m.score_b}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-muted">{m.tournaments?.name ?? ""}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming */}
          <section>
            <h2 className="mb-4 font-heading text-xl font-extrabold">Coming up</h2>
            {scheduled.length === 0 ? (
              <p className="text-sm text-muted">Nothing scheduled yet.</p>
            ) : (
              <div className="space-y-3">
                {scheduled.map((m) => (
                  <Link key={m.id} to={`/tournaments/${m.tournaments?.slug ?? ""}`} className="block cursor-pointer">
                    <Card hover className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge tone={statusTone(m.status)}>{STATUS_LABELS[m.status]}</Badge>
                        <span className="text-xs text-muted">{formatDateTime(m.scheduled_at)}</span>
                      </div>
                      <p className="text-sm font-semibold">{matchName(m)}</p>
                      <p className="mt-1 text-xs text-muted">
                        {m.tournaments?.name ?? ""}
                        {m.tables?.name ? ` · ${m.tables.name}` : ""}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Flag, Play, Plus, RotateCcw, Trophy, Users } from "lucide-react";
import { Badge, Button, Card, EmptyState, Select, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { fetchMatches, fetchTournaments, useAsync } from "../lib/data";
import { formatDateTime, playerName, STATUS_LABELS, statusTone } from "../lib/utils";

/**
 * Scorer console — for referees and scorers to run a match:
 * start it, add points/legs, end legs, and finish with a winner.
 * Writes to `matches` + `match_details` (leg-by-leg log).
 */
export function ScorerPage() {
  const { canScore, profile } = useAuth();
  const navigate = useNavigate();
  const tournaments = useAsync(() => fetchTournaments(), []);
  const [tournamentId, setTournamentId] = useState("all");
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof fetchMatches>>>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  useEffect(() => {
    if (profile && !canScore) navigate("/");
  }, [profile, canScore, navigate]);

  const scoreable = useMemo(
    () => matches.filter((m) => ["pending", "scheduled", "live"].includes(m.status)),
    [matches],
  );

  const active = matches.find((m) => m.id === activeId) ?? null;

  const startMatch = async (id: string) => {
    await supabase
      .from("matches")
      .update({ status: "live", started_at: new Date().toISOString() })
      .eq("id", id);
    setActiveId(id);
    load();
  };

  const addPoint = async (side: "A" | "B") => {
    if (!active) return;
    const nextScore = side === "A" ? active.score_a + 1 : active.score_b + 1;
    await supabase
      .from("matches")
      .update(side === "A" ? { score_a: nextScore } : { score_b: nextScore })
      .eq("id", active.id);
    load();
  };

  const endLeg = async (winner: "A" | "B") => {
    if (!active) return;
    const { data: details } = await supabase
      .from("match_details")
      .select("leg_no")
      .eq("match_id", active.id)
      .order("leg_no", { ascending: false })
      .limit(1);
    const legNo = (details?.[0]?.leg_no ?? 0) + 1;
    await supabase.from("match_details").insert({
      match_id: active.id,
      leg_no: legNo,
      score_a: active.score_a,
      score_b: active.score_b,
      winner,
    });
    // A leg is a frame/rack: +1 to the winner's match score.
    await supabase
      .from("matches")
      .update(winner === "A" ? { score_a: active.score_a + 1 } : { score_b: active.score_b + 1 })
      .eq("id", active.id);
    load();
  };

  const finishMatch = async (winner: "A" | "B") => {
    if (!active) return;
    const winnerEntryId = winner === "A" ? active.entry_a_id : active.entry_b_id;
    await supabase
      .from("matches")
      .update({
        status: "completed",
        winner_entry_id: winnerEntryId,
        loser_entry_id: winner === "A" ? active.entry_b_id : active.entry_a_id,
        finished_at: new Date().toISOString(),
      })
      .eq("id", active.id);
    setActiveId(null);
    load();
  };

  const resetMatch = async (id: string) => {
    await supabase
      .from("matches")
      .update({ status: "pending", score_a: 0, score_b: 0, started_at: null })
      .eq("id", id);
    await supabase.from("match_details").delete().eq("match_id", id);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Scorer console</h1>
          <p className="text-sm text-muted">Start matches, add scores, end legs and declare winners.</p>
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
      ) : scoreable.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No matches to score"
          message="Matches appear here after the draw is run. Start one to begin scoring."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {scoreable.map((m) => {
            const isActive = activeId === m.id;
            const winner = m.score_a > m.score_b ? "A" : m.score_b > m.score_a ? "B" : null;
            return (
              <Card key={m.id} className={isActive ? "border-primary" : ""}>
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge tone={statusTone(m.status)}>{STATUS_LABELS[m.status]}</Badge>
                    <span className="text-xs text-muted">
                      {m.tables?.name ?? "No table"} · {formatDateTime(m.scheduled_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <PlayerScore name={playerName(m.players_a)} score={m.score_a} onAdd={() => isActive && addPoint("A")} active={isActive} />
                    <span className="text-xs font-bold text-muted">vs</span>
                    <PlayerScore name={playerName(m.players_b)} score={m.score_b} onAdd={() => isActive && addPoint("B")} active={isActive} />
                  </div>

                  {isActive && (
                    <div className="mt-4 space-y-2 border-t border-border pt-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => endLeg("A")}>
                          <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Leg to A
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => endLeg("B")}>
                          <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Leg to B
                        </Button>
                        <Button
                          size="sm"
                          variant="accent"
                          onClick={() => winner && finishMatch(winner)}
                          disabled={!winner}
                        >
                          <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Finish match
                        </Button>
                      </div>
                      <p className="text-xs text-muted">
                        Points are the in-leg tally; "Leg to X" awards the frame/rack and advances the match score.
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-end gap-2">
                    {m.status !== "live" ? (
                      <Button size="sm" onClick={() => startMatch(m.id)}>
                        <Play className="h-3.5 w-3.5" aria-hidden="true" /> Start match
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setActiveId(isActive ? null : m.id)}>
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {isActive ? "Close console" : "Open console"}
                      </Button>
                    )}
                    <button
                      onClick={() => resetMatch(m.id)}
                      aria-label="Reset match"
                      className="rounded-md p-2 text-muted cursor-pointer hover:bg-surface-2 hover:text-foreground"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayerScore({
  name,
  score,
  onAdd,
  active,
}: {
  name: string;
  score: number;
  onAdd: () => void;
  active: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        onClick={onAdd}
        disabled={!active}
        aria-label={`Add point to ${name}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted cursor-pointer transition-all duration-150 hover:border-primary/50 hover:text-primary active:scale-[0.95] disabled:opacity-40 disabled:pointer-events-none"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="font-heading text-2xl font-extrabold">{score}</p>
      </div>
    </div>
  );
}
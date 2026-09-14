import { useCallback, useEffect, useMemo, useState } from "react";
import { Radio, Trophy } from "lucide-react";
import { Badge, EmptyState, Spinner } from "../components/ui";
import { supabase } from "../lib/supabase";
import { fetchMatches, fetchTournaments, useAsync } from "../lib/data";
import { playerName } from "../lib/utils";

/**
 * Public TV scoreboard — arena-style screens shown on the big display.
 * Cycles through every match marked "on TV" in the admin TV config.
 */
export function TvPage() {
  const tournaments = useAsync(() => fetchTournaments(), []);
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof fetchMatches>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        (tournaments.data ?? []).map((t) => fetchMatches(t.id)),
      );
      setMatches(results.flat());
    } finally {
      setLoading(false);
    }
  }, [tournaments.data]);

  useEffect(() => {
    if (tournaments.data) load();
  }, [tournaments.data, load]);

  useEffect(() => {
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("tv-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const onTv = useMemo(
    () => matches.filter((m) => m.on_tv).sort((a, b) => (a.tv_position ?? 99) - (b.tv_position ?? 99)),
    [matches],
  );
  const [cycle, setCycle] = useState(0);

  // Cycle through matches when more than one is on air.
  useEffect(() => {
    if (onTv.length <= 1) return;
    const id = setInterval(() => setCycle((c) => (c + 1) % onTv.length), 15000);
    return () => clearInterval(id);
  }, [onTv.length]);

  const current = onTv[cycle] ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-heading text-xl font-extrabold tracking-tight">
            Cue<span className="text-primary">Sports</span> <span className="text-muted">· Live</span>
          </span>
        </div>
        <Badge tone="blue" pulse>
          <Radio className="h-3 w-3" aria-hidden="true" /> ON AIR
        </Badge>
      </div>

      {loading ? (
        <Spinner label="Warming up the screens…" />
      ) : !current ? (
        <div className="flex min-h-[70vh] items-center justify-center px-6">
          <EmptyState
            icon={<Radio className="h-10 w-10" />}
            title="No match on air"
            message="Matches selected for TV in the admin console will appear here automatically."
          />
        </div>
      ) : (
        <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center gap-8 px-6 py-10">
          <p className="max-w-3xl text-center font-heading text-2xl font-extrabold md:text-3xl">
            {current.tournaments?.name ?? ""}
          </p>

          <div className="grid w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-4">
            <PlayerPanel name={playerName(current.players_a)} score={current.score_a} align="right" />
            <span className="font-heading text-3xl font-extrabold text-muted">vs</span>
            <PlayerPanel name={playerName(current.players_b)} score={current.score_b} align="left" />
          </div>

          <div className="flex items-center gap-3 text-sm text-muted">
            {current.tables?.name && <span>{current.tables.name}</span>}
            {current.tables?.name && current.status === "live" && <span>·</span>}
            {current.status === "live" ? (
              <Badge tone="blue" pulse>LIVE</Badge>
            ) : (
              <Badge tone="amber">{current.status}</Badge>
            )}
          </div>

          {onTv.length > 1 && (
            <p className="text-xs text-muted">
              Showing {cycle + 1} of {onTv.length} · auto-cycles every 15s
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerPanel({
  name,
  score,
  align,
}: {
  name: string;
  score: number;
  align: "left" | "right";
}) {
  return (
    <div className={`flex flex-col gap-2 ${align === "right" ? "items-end" : "items-start"}`}>
      <p className="max-w-full truncate text-xl font-semibold md:text-2xl">{name}</p>
      <p className="font-heading text-7xl font-extrabold text-primary md:text-8xl">{score}</p>
    </div>
  );
}
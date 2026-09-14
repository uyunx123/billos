import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { EmptyState, Input, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useAsync, fetchPlayers } from "../lib/data";
import { initials, playerName } from "../lib/utils";
import type { Player } from "../lib/types";

export function PlayersPage() {
  const { session } = useAuth();
  const { data: players, loading } = useAsync(() => fetchPlayers(), []);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = players ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.countries?.name ?? "").toLowerCase().includes(q) ||
        (p.clubs?.name ?? "").toLowerCase().includes(q),
    );
  }, [players, query]);

  const myPlayer = players?.find((p) => p.user_id === session?.user?.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl font-extrabold">Players</h1>
          <p className="mt-1 text-muted">Ranked by tournament points.</p>
        </div>
        {session && (
          <Link
            to={myPlayer ? `/players/${myPlayer.id}` : "/players/me"}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold cursor-pointer transition-all duration-150 hover:border-primary/50 active:scale-[0.97]"
          >
            {myPlayer ? "My profile" : "Create my player profile"}
          </Link>
        )}
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input
          className="pl-9"
          placeholder="Search players…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search players"
        />
      </div>

      {loading ? (
        <Spinner label="Loading players…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={query ? "No players found" : "No players yet"}
          message={query ? "Try a different search." : "Player profiles will appear here once created."}
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {filtered.map((p: Player & { countries?: { name: string } | null; clubs?: { name: string } | null }, i) => (
            <li key={p.id} className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-surface-2">
              <span className="w-8 shrink-0 text-center font-heading text-sm font-bold text-muted">
                {i + 1}
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {initials(playerName(p))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{playerName(p)}</p>
                <p className="truncate text-xs text-muted">
                  {[p.countries?.name, p.clubs?.name].filter(Boolean).join(" · ") || "Unranked"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-heading text-sm font-bold text-primary">
                  {Number(p.ranking_pts ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted">pts</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
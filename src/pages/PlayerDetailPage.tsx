import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Trophy, Users } from "lucide-react";
import { Badge, Card, EmptyState, Spinner } from "../components/ui";
import { useAsync, fetchPlayer, fetchEntries, fetchTournaments } from "../lib/data";
import { formatDate, initials, playerName } from "../lib/utils";

export function PlayerDetailPage() {
  const { id = "" } = useParams();
  const { data: player, loading } = useAsync(() => fetchPlayer(id), [id]);
  const { data: entries } = useAsync(() => fetchEntries(id), [id]);
  const { data: tournaments } = useAsync(() => fetchTournaments(), []);

  if (loading || !player) return <Spinner label="Loading player…" />;

  const myTournaments = (entries ?? [])
    .filter((e) => e.tournament_id)
    .map((e) => tournaments?.find((t) => t.id === e.tournament_id))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link to="/players" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted cursor-pointer hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to players
      </Link>

      <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/15 font-heading text-3xl font-extrabold text-primary">
          {initials(playerName(player))}
        </span>
        <div>
          <h1 className="font-heading text-3xl font-extrabold">{playerName(player)}</h1>
          <p className="mt-1 text-muted">
            {[player.countries?.name, player.clubs?.name].filter(Boolean).join(" · ") || "Country TBD"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="green">{Number(player.ranking_pts ?? 0).toLocaleString()} ranking pts</Badge>
            {player.handedness && <Badge tone="gray">{player.handedness}</Badge>}
            {player.gender && <Badge tone="gray">{player.gender}</Badge>}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted">License</p>
          <p className="mt-1 font-semibold">{player.license_no || "Not on file"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Born</p>
          <p className="mt-1 font-semibold">{player.birth_date ? formatDate(player.birth_date) : "—"}</p>
        </Card>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-extrabold">
          <Trophy className="h-5 w-5 text-primary" aria-hidden="true" /> Tournament history
        </h2>
        {myTournaments.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No tournament history yet"
            message="This player hasn't entered any tournaments yet."
          />
        ) : (
          <div className="space-y-3">
            {myTournaments.map((t) => (
              <Link key={t!.id} to={`/tournaments/${t!.slug}`} className="block">
                <Card hover className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{t!.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Calendar className="h-3 w-3" aria-hidden="true" /> {formatDate(t!.start_date)}
                    </p>
                  </div>
                  <Badge tone="gray">{t!.status}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
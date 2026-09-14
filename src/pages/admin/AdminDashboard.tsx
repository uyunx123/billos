import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Dices, Flag, Trophy, Users } from "lucide-react";
import { Card, EmptyState, Skeleton, Spinner, StatCard } from "../../components/ui";
import { useAsync, fetchTournaments, fetchPlayers, fetchDisciplines, fetchFaq } from "../../lib/data";
import { formatDate, STATUS_LABELS, statusTone } from "../../lib/utils";
import { Badge } from "../../components/ui";

export function AdminDashboard() {
  const tournaments = useAsync(() => fetchTournaments(), []);
  const players = useAsync(() => fetchPlayers(), []);
  const disciplines = useAsync(() => fetchDisciplines(), []);
  const faq = useAsync(() => fetchFaq(), []);

  const list = tournaments.data ?? [];
  const active = list.filter((t) => ["registration", "draw", "ongoing"].includes(t.status));
  const upcoming = list.filter((t) => t.status === "registration").slice(0, 5);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-muted">Overview of your cue-sports platform.</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tournaments"
          value={tournaments.loading ? <Skeleton className="h-8 w-14" /> : list.length}
          icon={<Trophy className="h-5 w-5" />}
          delta={`${active.length} active`}
        />
        <StatCard
          label="Active now"
          value={tournaments.loading ? <Skeleton className="h-8 w-14" /> : active.length}
          icon={<Flag className="h-5 w-5" />}
          delta={active.length ? "In progress or open" : "No live events"}
          deltaUp={active.length > 0}
        />
        <StatCard
          label="Players"
          value={players.loading ? <Skeleton className="h-8 w-14" /> : players.data?.length ?? 0}
          icon={<Users className="h-5 w-5" />}
          delta="Ranked profiles"
        />
        <StatCard
          label="Disciplines"
          value={disciplines.loading ? <Skeleton className="h-8 w-14" /> : disciplines.data?.length ?? 0}
          icon={<Dices className="h-5 w-5" />}
          delta="Pool · Snooker · EB · Carom"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold">Tournaments</h2>
            <Link
              to="/admin/tournaments"
              className="flex items-center gap-1 text-sm font-semibold text-primary cursor-pointer hover:underline"
            >
              Manage <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {tournaments.loading ? (
            <Spinner label="Loading…" />
          ) : list.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-8 w-8" />}
              title="No tournaments yet"
              message="Create your first tournament to start taking registrations."
              action={
                <Link to="/admin/tournaments/new">
                  <button className="h-10 cursor-pointer rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-all duration-150 hover:opacity-90 active:scale-[0.97]">
                    Create tournament
                  </button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((t) => (
                <Link key={t.id} to={`/admin/tournaments/${t.id}`} className="block">
                  <Card hover className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted">
                        {formatDate(t.start_date)} · {t.draw_size} players
                      </p>
                    </div>
                    <Badge tone={statusTone(t.status)}>{STATUS_LABELS[t.status]}</Badge>
                  </Card>
                </Link>
              ))}
              {upcoming.length === 0 && (
                <p className="text-sm text-muted">
                  No tournaments in registration right now.{" "}
                  <Link to="/admin/tournaments/new" className="text-primary cursor-pointer hover:underline">
                    Create one →
                  </Link>
                </p>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold">Quick actions</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: "New tournament", to: "/admin/tournaments/new", icon: Trophy },
              { label: "Manage players", to: "/admin/players", icon: Users },
              { label: "Disciplines", to: "/admin/disciplines", icon: Dices },
              { label: "Geography (countries, clubs)", to: "/admin/geography", icon: Flag },
              { label: "FAQ", to: "/admin/faq", icon: ClipboardList },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground cursor-pointer transition-all duration-150 hover:border-primary/40 hover:bg-surface-2"
              >
                <a.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                {a.label}
                <ArrowRight className="ml-auto h-4 w-4 text-muted" aria-hidden="true" />
              </Link>
            ))}
          </div>
          {!faq.loading && (faq.data?.length ?? 0) > 0 && (
            <p className="mt-4 text-xs text-muted">Public FAQ: {faq.data?.length} questions live.</p>
          )}
        </section>
      </div>
    </div>
  );
}
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Dices, Trophy } from "lucide-react";
import { Badge, Card, EmptyState, Spinner } from "../components/ui";
import { fetchDisciplineBySlug, fetchTournamentsByDiscipline, useAsync } from "../lib/data";
import { formatDate, STATUS_LABELS, statusTone } from "../lib/utils";

export function DisciplineDetailPage() {
  const { slug = "" } = useParams();
  const discipline = useAsync(() => fetchDisciplineBySlug(slug), [slug]);
  const tournaments = useAsync(
    () => (discipline.data ? fetchTournamentsByDiscipline(discipline.data.id) : Promise.resolve([])),
    [discipline.data?.id],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        to="/tournaments"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted cursor-pointer hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tournaments
      </Link>

      {discipline.loading ? (
        <Spinner label="Loading discipline…" />
      ) : !discipline.data ? (
        <EmptyState icon={<Dices className="h-8 w-8" />} title="Discipline not found" message="We couldn't find that discipline." />
      ) : (
        <div>
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `${discipline.data.color ?? "#888"}22`,
                  color: discipline.data.color ?? "inherit",
                }}
              >
                <Trophy className="h-7 w-7" aria-hidden="true" />
              </span>
              <Badge tone="gray">{discipline.data.category}</Badge>
            </div>
            <h1 className="font-heading text-3xl font-extrabold md:text-4xl">{discipline.data.name}</h1>
            {discipline.data.description && (
              <p className="mt-3 max-w-3xl text-muted">{discipline.data.description}</p>
            )}
          </div>

          <h2 className="mb-4 font-heading text-xl font-extrabold">Tournaments</h2>
          {tournaments.loading ? (
            <Spinner label="Loading tournaments…" />
          ) : tournaments.data?.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-8 w-8" />}
              title="No tournaments in this discipline yet"
              message="Check back soon — new events are added regularly."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(tournaments.data ?? []).map((t) => (
                <Link key={t.id} to={`/tournaments/${t.slug}`} className="block cursor-pointer">
                  <Card hover className="flex h-full flex-col p-5">
                    <div className="mb-3">
                      <Badge tone={statusTone(t.status)}>{STATUS_LABELS[t.status]}</Badge>
                    </div>
                    <h3 className="font-heading text-lg font-bold leading-snug">{t.name}</h3>
                    <div className="mt-auto pt-4 text-xs text-muted">
                      {formatDate(t.start_date)} – {formatDate(t.end_date)}
                      {t.venue ? ` · ${t.venue}` : ""}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
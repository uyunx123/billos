import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  MapPin,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Spinner, ConfirmDialog } from "../components/ui";
import { BracketView } from "../components/BracketView";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  fetchCommittee,
  fetchDivisions,
  fetchEntries,
  fetchMyPlayer,
  fetchTig,
  fetchTournament,
  useAsync,
} from "../lib/data";
import {
  buildBracket,
  nextPowerOfTwo,
  seedEntries,
  type SeededEntry,
} from "../lib/drawEngine";
import { formatDate, playerName, STATUS_LABELS, statusTone } from "../lib/utils";
import type { Discipline, EntryWithPlayer, Tournament } from "../lib/types";

export function TournamentDetailPage() {
  const { slug = "" } = useParams();
  const { data: tournament, loading: tLoading } = useAsync(() => fetchTournament(slug), [slug]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {tLoading || !tournament ? (
        <Spinner label="Loading tournament…" />
      ) : (
        <TournamentBody tournament={tournament} key={tournament.id} />
      )}
    </div>
  );
}

type TournamentWithDiscipline = Tournament & { disciplines: Discipline | null };

function TournamentBody({ tournament }: { tournament: TournamentWithDiscipline }) {
  const { session, isAdmin } = useAuth();
  const [entries, setEntries] = useState<EntryWithPlayer[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [myPlayer, setMyPlayer] = useState<Awaited<ReturnType<typeof fetchMyPlayer>> | null>(null);
  const [registering, setRegistering] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const divisions = useAsync(() => fetchDivisions(tournament.id), [tournament.id]);
  const committee = useAsync(() => fetchCommittee(tournament.id), [tournament.id]);
  const tig = useAsync(() => fetchTig(tournament.id), [tournament.id]);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      setEntries(await fetchEntries(tournament.id));
    } finally {
      setLoadingEntries(false);
    }
  }, [tournament.id]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (session?.user) {
      fetchMyPlayer(session.user.id).then(setMyPlayer).catch(() => {});
    }
  }, [session]);

  const confirmed = entries.filter((e) => e.entry_status === "confirmed");
  const waitlist = entries.filter((e) => e.entry_status === "waitlist");
  const isRegistered = entries.some((e) => e.player_id === myPlayer?.id);
  const myEntry = entries.find((e) => e.player_id === myPlayer?.id);

  const bracketNodes = useMemo(() => {
    const seeded = seedEntries(confirmed, "manual");
    if (seeded.length < 2) return [];
    const lookup = new Map(entries.map((e) => [e.id, e]));
    return buildBracket(
      seeded as SeededEntry[],
      tournament.draw_size,
      (id) => (id ? playerName(lookup.get(id)?.players ?? null) : "TBD"),
    );
  }, [confirmed, entries, tournament.draw_size]);

  const nameOf = useCallback(
    (id: string | null) => (id ? playerName(entries.find((e) => e.id === id)?.players ?? null) : "TBD"),
    [entries],
  );

  const handleRegister = async () => {
    if (!myPlayer) return;
    setRegistering(true);
    setMessage(null);
    const { error } = await supabase.from("tournament_entries").insert({
      tournament_id: tournament.id,
      player_id: myPlayer.id,
      division_id: divisions.data?.[0]?.id ?? null,
      entry_status: confirmed.length >= tournament.draw_size ? "waitlist" : "confirmed",
    });
    setRegistering(false);
    if (error) {
      setMessage({ kind: "error", text: "We couldn't add your entry — try again." });
    } else {
      setMessage({
        kind: "success",
        text:
          confirmed.length >= tournament.draw_size
            ? "You're on the waitlist. We'll notify you if a spot opens."
            : "You're registered. See you at the table!",
      });
      loadEntries();
    }
  };

  const handleWithdraw = async () => {
    if (!myEntry) return;
    const { error } = await supabase
      .from("tournament_entries")
      .update({ entry_status: "withdrawn" })
      .eq("id", myEntry.id);
    setConfirmOpen(false);
    if (error) {
      setMessage({ kind: "error", text: "Couldn't withdraw — try again." });
    } else {
      setMessage({ kind: "success", text: "Your entry has been withdrawn." });
      loadEntries();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(tournament.status)}>{STATUS_LABELS[tournament.status]}</Badge>
          {tournament.disciplines && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: `${tournament.disciplines.color ?? "#888"}22`,
                color: tournament.disciplines.color ?? "inherit",
              }}
            >
              {tournament.disciplines.name}
            </span>
          )}
          {isAdmin && (
            <Link to={`/admin/tournaments/${tournament.id}`}>
              <Badge tone="blue">Manage</Badge>
            </Link>
          )}
        </div>
        <h1 className="font-heading text-3xl font-extrabold md:text-4xl">{tournament.name}</h1>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" aria-hidden="true" /> {formatDate(tournament.start_date)} – {formatDate(tournament.end_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden="true" /> {tournament.venue ?? "TBD"}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" aria-hidden="true" /> {tournament.draw_size} players
          </span>
        </div>
        {tournament.description && (
          <p className="mt-4 max-w-3xl text-muted">{tournament.description}</p>
        )}
      </div>

      {message && (
        <div
          role="status"
          className={`mb-6 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.kind === "success"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {message.text}
        </div>
      )}

      {/* Registration */}
      {session ? (
        <Card className="mb-8 p-5">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-lg font-bold">Registration</h2>
              <p className="text-sm text-muted">
                {confirmed.length}/{tournament.draw_size} confirmed · {waitlist.length} on waitlist
                {myEntry && (
                  <span className="ml-2 inline-flex items-center gap-1 font-semibold text-primary">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {STATUS_LABELS[myEntry.entry_status]}
                  </span>
                )}
              </p>
            </div>
            {!myPlayer ? (
              <p className="text-sm text-amber-500">
                Complete your <Link to="/players" className="underline">player profile</Link> to register.
              </p>
            ) : isRegistered ? (
              myEntry?.entry_status === "withdrawn" ? (
                <Button onClick={handleRegister} loading={registering}>
                  <UserPlus className="h-4 w-4" aria-hidden="true" /> Re-register
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                  Withdraw
                </Button>
              )
            ) : tournament.status === "registration" ? (
              <Button onClick={handleRegister} loading={registering}>
                <UserPlus className="h-4 w-4" aria-hidden="true" /> Register to play
              </Button>
            ) : (
              <Badge tone="gray">Registration closed</Badge>
            )}
          </div>
        </Card>
      ) : tournament.status === "registration" ? (
        <Card className="mb-8 flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-lg font-bold">Want to play?</h2>
            <p className="text-sm text-muted">
              {confirmed.length}/{tournament.draw_size} confirmed so far.
            </p>
          </div>
          <Link to="/login">
            <Button>Sign in to register</Button>
          </Link>
        </Card>
      ) : null}

      {/* Bracket */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-heading text-xl font-extrabold">Bracket</h2>
          {confirmed.length >= 2 && (
            <Badge tone="green">
              {confirmed.length} seeded · {nextPowerOfTwo(tournament.draw_size)} bracket
            </Badge>
          )}
        </div>
        {loadingEntries ? (
          <Spinner label="Loading entries…" />
        ) : confirmed.length < 2 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="Bracket not drawn yet"
            message="The bracket appears here once players register and the committee runs the draw."
          />
        ) : (
          <Card className="p-4">
            <BracketView nodes={bracketNodes} winnerName={nameOf} />
          </Card>
        )}
      </section>

      {/* Entries */}
      <section className="mb-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 font-heading text-xl font-extrabold">Confirmed players</h2>
          {confirmed.length === 0 ? (
            <p className="text-sm text-muted">No confirmed players yet.</p>
          ) : (
            <ul className="space-y-2">
              {confirmed.map((e, i) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {e.seed_no ?? i + 1}
                    </span>
                    <span className="text-sm font-medium">{playerName(e.players)}</span>
                  </span>
                  {e.checked_in && <Badge tone="green">Checked in</Badge>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-8">
          {committee.data && committee.data.length > 0 && (
            <div>
              <h2 className="mb-4 font-heading text-xl font-extrabold">Committee</h2>
              <ul className="space-y-2">
                {committee.data.map((c) => (
                  <li key={c.id} className="rounded-lg border border-border bg-surface px-4 py-2.5">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-muted">
                      {[c.role, c.organization].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tig.data && (
            <div>
              <h2 className="mb-4 font-heading text-xl font-extrabold">Tournament Information Guide</h2>
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold">
                      <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
                      {tig.data.title ?? "TIG"}
                    </h3>
                    {tig.data.content && <p className="mt-2 text-sm text-muted">{tig.data.content}</p>}
                    {tig.data.rules_content && (
                      <p className="mt-2 text-sm text-muted">{tig.data.rules_content}</p>
                    )}
                  </div>
                  {tig.data.file_path && (
                    <a
                      href={tig.data.file_path}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-foreground cursor-pointer transition-all duration-150 hover:border-primary/50 active:scale-[0.97]"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" /> TIG
                    </a>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleWithdraw}
        title="Withdraw from tournament?"
        message="This will remove your place in the event. You can re-register later if spots remain."
        confirmLabel="Withdraw"
      />
    </div>
  );
}
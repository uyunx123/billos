import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, Trophy } from "lucide-react";
import { Card, EmptyState, Spinner } from "../../components/ui";
import { fetchEntries, fetchTournaments, useAsync } from "../../lib/data";
import { playerName } from "../../lib/utils";

/** Print-friendly scoring sheet listing every confirmed player per tournament. */
export function AdminScoringSheetPage() {
  const tournaments = useAsync(() => fetchTournaments(), []);
  const [tournamentId, setTournamentId] = useState("");
  const entries = useAsync(
    () => (tournamentId ? fetchEntries(tournamentId) : Promise.resolve([])),
    [tournamentId],
  );

  const selected = useMemo(
    () => (tournaments.data ?? []).find((t) => t.id === tournamentId) ?? null,
    [tournaments.data, tournamentId],
  );

  const confirmed = useMemo(() => (entries.data ?? []).filter((e) => e.entry_status === "confirmed"), [entries.data]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-extrabold">
          <FileSpreadsheet className="h-6 w-6 text-primary" aria-hidden="true" /> Scoring sheets
        </h1>
        <p className="text-sm text-muted">Generate a print-ready list of players for scoring reference.</p>
      </div>

      {tournaments.loading ? (
        <Spinner label="Loading tournaments…" />
      ) : (
        <>
          <div className="mb-6 max-w-md">
            <label htmlFor="sheet-tournament" className="mb-1.5 block text-sm font-medium">
              Tournament
            </label>
            <select
              id="sheet-tournament"
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              className="w-full h-10 rounded-lg bg-surface border border-border px-3 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
            >
              <option value="">Select a tournament…</option>
              {(tournaments.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {!tournamentId ? (
            <EmptyState
              icon={<Trophy className="h-8 w-8" />}
              title="Pick a tournament"
              message="Select a tournament above to generate its scoring sheet."
            />
          ) : entries.loading ? (
            <Spinner label="Preparing sheet…" />
          ) : (
            <Card className="p-6 print:shadow-none">
              <div className="mb-4 border-b border-border pb-4">
                <h2 className="font-heading text-xl font-extrabold">{selected?.name}</h2>
                <p className="text-sm text-muted">{confirmed.length} confirmed players · {selected?.draw_size ?? "—"} draw</p>
              </div>
              {confirmed.length === 0 ? (
                <p className="text-sm text-muted">No confirmed players yet.</p>
              ) : (
                <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                  {confirmed.map((e, i) => (
                    <div key={e.id} className="flex items-baseline gap-2 py-1">
                      <span className="text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-sm font-medium">{playerName(e.players)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary cursor-pointer transition-all duration-150 hover:opacity-90 active:scale-[0.97] print:hidden"
                >
                  Print sheet
                </button>
              </div>
            </Card>
          )}
        </>
      )}
      <p className="mt-4 text-xs text-muted">
        Need more depth? Use the{" "}
        <Link to="/admin/matches" className="font-semibold text-primary cursor-pointer hover:underline">
          Matches
        </Link>{" "}
        page for per-match scoring control.
      </p>
    </div>
  );
}
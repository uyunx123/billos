import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Radio, Repeat, Table2, UserCog } from "lucide-react";
import { Badge, Button, Card, EmptyState, Modal, Select, Spinner } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { fetchMatches, fetchTables, fetchTournaments, useAsync } from "../../lib/data";
import { formatDateTime, playerName, STATUS_LABELS, statusTone } from "../../lib/utils";

export function AdminMatchesPage() {
  const tournaments = useAsync(() => fetchTournaments(), []);
  const tables = useAsync(() => fetchTables(), []);
  const [tournamentId, setTournamentId] = useState("all");
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof fetchMatches>>>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editTable, setEditTable] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editReferee, setEditReferee] = useState("");

  const loadMatches = useCallback(async () => {
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
    if (tournaments.data) loadMatches();
  }, [tournaments.data, loadMatches]);

  const editMatch = useMemo(
    () => (editTarget ? matches.find((m) => m.id === editTarget) ?? null : null),
    [matches, editTarget],
  );
  void editMatch;

  const openEdit = (id: string) => {
    const m = matches.find((x) => x.id === id);
    if (!m) return;
    setEditTarget(id);
    setEditTable(m.table_id ?? "");
    setEditTime(m.scheduled_at ? new Date(m.scheduled_at).toISOString().slice(0, 16) : "");
    setEditReferee(m.referee_id ?? "");
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const { error } = await supabase
      .from("matches")
      .update({
        table_id: editTable || null,
        scheduled_at: editTime ? new Date(editTime).toISOString() : null,
        referee_id: editReferee || null,
      })
      .eq("id", editTarget);
    if (!error) {
      setEditTarget(null);
      loadMatches();
    }
  };

  const toggleTv = async (id: string, current: boolean) => {
    await supabase.from("matches").update({ on_tv: !current }).eq("id", id);
    loadMatches();
  };

  const rematch = async (id: string) => {
    await supabase
      .from("matches")
      .update({ status: "pending", score_a: 0, score_b: 0, winner_entry_id: null, loser_entry_id: null })
      .eq("id", id);
    await supabase.from("match_details").delete().eq("match_id", id);
    loadMatches();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Matches</h1>
          <p className="text-sm text-muted">Assign tables, schedule times, referees and TV slots.</p>
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
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-8 w-8" />}
          title="No matches yet"
          message="Run the draw for a tournament to generate matches, then assign tables and times here."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Match</th>
                  <th className="px-4 py-3 font-semibold">Round</th>
                  <th className="px-4 py-3 font-semibold">Table</th>
                  <th className="px-4 py-3 font-semibold">Scheduled</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matches.map((m, i) => (
                  <tr key={m.id} className={i % 2 ? "bg-surface" : "bg-transparent"}>
                    <td className="px-4 py-3 font-medium">
                      {playerName(m.players_a)} vs {playerName(m.players_b)}
                      {m.on_tv && (
                        <Badge tone="amber" className="ml-2" pulse>
                          <Radio className="h-3 w-3" aria-hidden="true" /> TV
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{m.round_no}</td>
                    <td className="px-4 py-3 text-muted">{m.tables?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(m.scheduled_at)}</td>
                    <td className="px-4 py-3 font-heading font-extrabold">
                      {m.score_a} – {m.score_b}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(m.status)}>{STATUS_LABELS[m.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => toggleTv(m.id, m.on_tv)}
                          aria-label={m.on_tv ? "Remove from TV" : "Send to TV"}
                          className={`rounded-md p-2 cursor-pointer transition-colors ${
                            m.on_tv ? "text-amber-500" : "text-muted hover:text-amber-500"
                          }`}
                        >
                          <Radio className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(m.id)}
                          aria-label="Edit table and schedule"
                          className="rounded-md p-2 text-muted cursor-pointer hover:bg-surface-2 hover:text-foreground"
                        >
                          <Table2 className="h-4 w-4" />
                        </button>
                        {m.status === "completed" && (
                          <button
                            onClick={() => rematch(m.id)}
                            aria-label="Reset match"
                            className="rounded-md p-2 text-muted cursor-pointer hover:bg-surface-2 hover:text-foreground"
                          >
                            <Repeat className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={editTarget !== null} onClose={() => setEditTarget(null)} title="Assign table & schedule">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Table</label>
            <Select value={editTable} onChange={(e) => setEditTable(e.target.value)}>
              <option value="">No table</option>
              {(tables.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Scheduled at</label>
            <input
              type="datetime-local"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="w-full h-10 rounded-lg bg-surface border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Referee (user id)</label>
            <input
              type="text"
              value={editReferee}
              onChange={(e) => setEditReferee(e.target.value)}
              placeholder="Leave blank to clear"
              className="w-full h-10 rounded-lg bg-surface border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={saveEdit}>
              <UserCog className="h-4 w-4" aria-hidden="true" /> Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
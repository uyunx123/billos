import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Dices,
  Plus,
  Save,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Spinner } from "../../components/ui";
import { BracketView } from "../../components/BracketView";
import { supabase } from "../../lib/supabase";
import {
  fetchDivisions,
  fetchEntries,
  fetchTournamentById,
  fetchPlayers,
  useAsync,
} from "../../lib/data";
import {
  buildBracket,
  nextPowerOfTwo,
  seedEntries,
  type SeededEntry,
} from "../../lib/drawEngine";
import { playerName, STATUS_LABELS, statusTone } from "../../lib/utils";
import type { Discipline, EntryWithPlayer, Player, Tournament } from "../../lib/types";

type Tab = "entries" | "divisions" | "draw";

type TournamentWithDiscipline = Tournament & { disciplines: Discipline | null };

export function AdminTournamentManagePage() {
  const { id = "" } = useParams();
  const tournament = useAsync(() => fetchTournamentById(id), [id]);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/admin/tournaments"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted cursor-pointer hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tournaments
      </Link>

      {tournament.loading || !tournament.data ? (
        <Spinner label="Loading tournament…" />
      ) : (
        <ManageBody tournament={tournament.data} onReload={tournament.reload} />
      )}
    </div>
  );
}

function ManageBody({
  tournament,
  onReload,
}: {
  tournament: TournamentWithDiscipline;
  onReload: () => void;
}) {
  const [tab, setTab] = useState<Tab>("entries");
  const [entries, setEntries] = useState<EntryWithPlayer[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [addStatus, setAddStatus] = useState<"confirmed" | "waitlist">("confirmed");
  const [seedMode, setSeedMode] = useState<"manual" | "ranking" | "random">(tournament.seeding_mode);
  const [savedDraw, setSavedDraw] = useState<{
    seed_no: number;
    bracket_slot: number | null;
  }[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const divisions = useAsync(() => fetchDivisions(tournament.id), [tournament.id]);
  const players = useAsync(() => fetchPlayers(), []);

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

  const confirmed = entries.filter((e) => e.entry_status === "confirmed");
  const waitlist = entries.filter((e) => e.entry_status === "waitlist");
  const rankingLookup = useMemo(
    () =>
      Object.fromEntries(
        (players.data ?? []).map((p) => [p.id, Number(p.ranking_pts ?? 0)] as const),
      ),
    [players.data],
  );

  const seeded = useMemo(() => {
    const s = seedEntries(confirmed, seedMode, rankingLookup);
    // Re-apply any saved manual seeds
    const saved = new Map(savedDraw.map((x) => [x.seed_no, x]));
    if (seedMode === "manual" && saved.size) {
      return s
        .map((x) => {
          const existing = confirmed.find((c) => c.id === x.entry.id);
          return { entry: x.entry, seed: existing?.seed_no ?? x.seed };
        })
        .sort((a, b) => a.seed - b.seed);
    }
    return s;
  }, [confirmed, seedMode, rankingLookup, savedDraw]);

  const nameOf = useCallback(
    (entryId: string | null) => {
      if (!entryId) return "TBD";
      const e = entries.find((x) => x.id === entryId);
      return playerName(e?.players ?? null);
    },
    [entries],
  );

  const bracketNodes = useMemo(() => {
    if (seeded.length < 2) return [];
    return buildBracket(seeded as SeededEntry[], tournament.draw_size, nameOf);
  }, [seeded, tournament.draw_size, nameOf]);

  const handleAddEntry = async () => {
    if (!selectedPlayer) return;
    const existing = entries.find((e) => e.player_id === selectedPlayer);
    if (existing) {
      setNotice("That player is already registered.");
      return;
    }
    const { error } = await supabase.from("tournament_entries").insert({
      tournament_id: tournament.id,
      player_id: selectedPlayer,
      division_id: divisions.data?.[0]?.id ?? null,
      entry_status: addStatus,
    });
    if (error) {
      setNotice("Couldn't add the entry — try again.");
    } else {
      setNotice(`${addStatus === "confirmed" ? "Added" : "Waitlisted"} player.`);
      setAddOpen(false);
      setSelectedPlayer("");
      loadEntries();
    }
  };

  const handleToggleStatus = async (e: EntryWithPlayer) => {
    const next = e.entry_status === "confirmed" ? "waitlist" : "confirmed";
    await supabase.from("tournament_entries").update({ entry_status: next }).eq("id", e.id);
    loadEntries();
  };

  const handleDeleteEntry = async (e: EntryWithPlayer) => {
    await supabase.from("tournament_entries").delete().eq("id", e.id);
    loadEntries();
  };

  const handleCheckIn = async (e: EntryWithPlayer) => {
    await supabase.from("tournament_entries").update({ checked_in: !e.checked_in }).eq("id", e.id);
    loadEntries();
  };

  const handleSaveDraw = async () => {
    // Persist seeds + bracket slots onto entries
    const order = seeded.map((s, i) => ({
      id: s.entry.id,
      seed_no: s.seed,
      bracket_slot: i + 1,
    }));
    for (const row of order) {
      await supabase.from("tournament_entries").update({
        seed_no: row.seed_no,
        bracket_slot: row.bracket_slot,
      }).eq("id", row.id);
    }
    await supabase
      .from("tournaments")
      .update({ status: "draw", seeding_mode: seedMode })
      .eq("id", tournament.id);
    setSavedDraw(order.map((o) => ({ seed_no: o.seed_no, bracket_slot: o.bracket_slot })));
    setNotice(`Draw saved — ${order.length} players seeded.`);
    onReload();
  };

  const tabs: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { id: "entries", label: "Registrations", icon: Users, count: entries.length },
    { id: "divisions", label: "Divisions", icon: Trophy, count: divisions.data?.length ?? 0 },
    { id: "draw", label: "Draw & Bracket", icon: Dices, count: confirmed.length },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(tournament.status)}>{STATUS_LABELS[tournament.status]}</Badge>
          <span className="text-sm text-muted">{tournament.disciplines?.name ?? "—"}</span>
          <span className="text-sm text-muted">· {tournament.draw_size} draw</span>
        </div>
        <h1 className="mt-1 font-heading text-2xl font-extrabold">{tournament.name}</h1>
        <p className="text-sm text-muted">
          {tournament.venue ?? "No venue"} · {confirmed.length} confirmed · {waitlist.length} waitlist
        </p>
      </div>

      {notice && (
        <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> {notice}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors duration-150 ${
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" aria-hidden="true" />
            {t.label}
            {t.count !== undefined && <Badge tone={tab === t.id ? "green" : "gray"}>{t.count}</Badge>}
          </button>
        ))}
      </div>

      {tab === "entries" && (
        <EntriesTab
          loading={loadingEntries}
          confirmed={confirmed}
          waitlist={waitlist}
          onAdd={() => setAddOpen(true)}
          onToggle={handleToggleStatus}
          onDelete={handleDeleteEntry}
          onCheckIn={handleCheckIn}
        />
      )}

      {tab === "divisions" && (
        <DivisionsTab
          divisions={divisions.data ?? []}
          loading={divisions.loading}
          onCreated={divisions.reload}
        />
      )}

      {tab === "draw" && (
        <DrawTab
          seeded={seeded}
          bracketNodes={bracketNodes}
          nameOf={nameOf}
          seedMode={seedMode}
          setSeedMode={setSeedMode}
          onSave={handleSaveDraw}
          confirmed={confirmed}
        />
      )}

      {/* Add entry modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a player">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Player</label>
            <Select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)}>
              <option value="">Select a player…</option>
              {(players.data ?? [])
                .filter((p) => !entries.some((e) => e.player_id === p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>{playerName(p as Player)}</option>
                ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Status</label>
            <Select value={addStatus} onChange={(e) => setAddStatus(e.target.value as "confirmed" | "waitlist")}>
              <option value="confirmed">Confirmed</option>
              <option value="waitlist">Waitlist</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEntry} disabled={!selectedPlayer}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add player
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EntriesTab({
  loading,
  confirmed,
  waitlist,
  onAdd,
  onToggle,
  onDelete,
  onCheckIn,
}: {
  loading: boolean;
  confirmed: EntryWithPlayer[];
  waitlist: EntryWithPlayer[];
  onAdd: () => void;
  onToggle: (e: EntryWithPlayer) => void;
  onDelete: (e: EntryWithPlayer) => void;
  onCheckIn: (e: EntryWithPlayer) => void;
}) {
  if (loading) return <Spinner label="Loading entries…" />;
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add player
        </Button>
      </div>
      {confirmed.length === 0 && waitlist.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No registrations yet"
          message="Add players manually, or share the public tournament page for self-registration."
          action={<Button onClick={onAdd}>Add first player</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Player</th>
                  <th className="px-4 py-3 font-semibold">Seed</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Checked in</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...confirmed, ...waitlist].map((e, i) => (
                  <tr key={e.id} className={i % 2 ? "bg-surface" : "bg-transparent"}>
                    <td className="px-4 py-3 font-medium">{playerName(e.players)}</td>
                    <td className="px-4 py-3 text-muted">{e.seed_no ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={e.entry_status === "confirmed" ? "green" : "amber"}>
                        {STATUS_LABELS[e.entry_status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onCheckIn(e)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                          e.checked_in ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted hover:text-foreground"
                        }`}
                      >
                        {e.checked_in ? "Checked in" : "Not yet"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => onToggle(e)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-muted cursor-pointer hover:bg-surface-2 hover:text-foreground"
                        >
                          {e.entry_status === "confirmed" ? "→ Waitlist" : "→ Confirm"}
                        </button>
                        <button
                          onClick={() => onDelete(e)}
                          aria-label={`Remove ${playerName(e.players)}`}
                          className="rounded-md p-2 text-muted cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function DivisionsTab({
  divisions,
  loading,
  onCreated,
}: {
  divisions: { id: string; name: string; draw_size: number | null; best_of: number | null }[];
  loading: boolean;
  onCreated: () => void;
}) {
  const { id = "" } = useParams();
  const [name, setName] = useState("");
  const [drawSize, setDrawSize] = useState("16");
  const [bestOf, setBestOf] = useState("5");

  const create = async () => {
    await supabase.from("tournament_divisions").insert({
      tournament_id: id,
      name: name || "Open",
      draw_size: Number(drawSize),
      best_of: Number(bestOf),
      sort_order: divisions.length + 1,
    });
    setName("");
    onCreated();
  };

  if (loading) return <Spinner label="Loading divisions…" />;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 font-heading text-lg font-bold">Divisions</h3>
        {divisions.length === 0 ? (
          <p className="text-sm text-muted">No divisions yet. Create one to group entries.</p>
        ) : (
          <div className="space-y-2">
            {divisions.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-xs text-muted">
                    {d.draw_size ?? "—"} draw · best of {d.best_of ?? "—"}
                  </p>
                </div>
                <Badge tone="gray">Division</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <Card className="space-y-4 p-5">
          <h3 className="font-heading text-lg font-bold">New division</h3>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Open Singles" />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" value={drawSize} onChange={(e) => setDrawSize(e.target.value)} placeholder="Draw size" aria-label="Draw size" />
            <Input type="number" value={bestOf} onChange={(e) => setBestOf(e.target.value)} placeholder="Best of" aria-label="Best of" />
          </div>
          <Button className="w-full" onClick={create}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add division
          </Button>
        </Card>
      </div>
    </div>
  );
}

function DrawTab({
  seeded,
  bracketNodes,
  nameOf,
  seedMode,
  setSeedMode,
  onSave,
  confirmed,
}: {
  seeded: SeededEntry[];
  bracketNodes: ReturnType<typeof buildBracket>;
  nameOf: (id: string | null) => string;
  seedMode: "manual" | "ranking" | "random";
  setSeedMode: (m: "manual" | "ranking" | "random") => void;
  onSave: () => void;
  confirmed: EntryWithPlayer[];
}) {
  const [showSeeds, setShowSeeds] = useState(true);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">Seeding:</label>
          <Select value={seedMode} onChange={(e) => setSeedMode(e.target.value as typeof seedMode)} className="w-44" aria-label="Seeding mode">
            <option value="manual">Manual</option>
            <option value="ranking">By ranking</option>
            <option value="random">Random</option>
          </Select>
          <Badge tone="green">{confirmed.length} confirmed</Badge>
        </div>
        <Button onClick={onSave} disabled={seeded.length < 2}>
          <Save className="h-4 w-4" aria-hidden="true" /> Save draw
        </Button>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading font-bold">Seeding order</h3>
            <button
              onClick={() => setShowSeeds((v) => !v)}
              className="text-xs font-semibold text-primary cursor-pointer hover:underline"
            >
              {showSeeds ? "Hide" : "Show"}
            </button>
          </div>
          {showSeeds ? (
            <ol className="space-y-1.5">
              {seeded.map((s, i) => (
                <li key={s.entry.id} className="flex items-center gap-2 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="truncate">{nameOf(s.entry.id)}</span>
                </li>
              ))}
              {seeded.length === 0 && <li className="text-sm text-muted">No confirmed entries.</li>}
            </ol>
          ) : null}
          <p className="mt-3 text-xs text-muted">
            {nextPowerOfTwo(tournamentDrawSize(confirmed.length, 16))} bracket · byes fill empty slots.
          </p>
        </Card>

        <div className="lg:col-span-2">
          {bracketNodes.length === 0 ? (
            <EmptyState
              icon={<Dices className="h-8 w-8" />}
              title="Need at least 2 players"
              message="Add confirmed entries to generate the bracket preview."
            />
          ) : (
            <Card className="p-4">
              <BracketView nodes={bracketNodes} winnerName={nameOf} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function tournamentDrawSize(count: number, fallback: number) {
  if (count < 2) return fallback;
  let size = 2;
  while (size < count) size *= 2;
  return size;
}
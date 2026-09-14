import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Spinner } from "../../components/ui";
import { useAsync, fetchCountries, fetchPlayers } from "../../lib/data";
import { playerName } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import type { Player } from "../../lib/types";

const emptyForm = {
  full_name: "",
  alias: "",
  gender: "",
  country_id: "",
  birth_date: "",
  license_no: "",
  handedness: "",
  phone: "",
  email: "",
  ranking_pts: "0",
};

export function AdminPlayersPage() {
  const players = useAsync(() => fetchPlayers(), []);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);

  useAsync(() => fetchCountries().then((c) => { setCountries(c); return c; }), []);

  const filtered = useMemo(() => {
    const list = players.data ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((p) => (playerName(p) ?? "").toLowerCase().includes(q));
  }, [players.data, query]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: Player) => {
    setEditing(p);
    setForm({
      full_name: p.full_name ?? "",
      alias: p.alias ?? "",
      gender: p.gender ?? "",
      country_id: p.country_id ?? "",
      birth_date: p.birth_date ?? "",
      license_no: p.license_no ?? "",
      handedness: p.handedness ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      ranking_pts: String(p.ranking_pts ?? 0),
    });
    setModalOpen(true);
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, ranking_pts: Number(form.ranking_pts || 0), country_id: form.country_id || null };
    const { error } = editing
      ? await supabase.from("players").update(payload).eq("id", editing.id)
      : await supabase.from("players").insert(payload);
    setBusy(false);
    if (!error) {
      setModalOpen(false);
      players.reload();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    await supabase.from("players").delete().eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    players.reload();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Players</h1>
          <p className="text-sm text-muted">Player directory and ranking points.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New player
        </Button>
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input className="pl-9" placeholder="Search players…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search players" />
      </div>

      {players.loading ? (
        <Spinner label="Loading players…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={query ? "No players found" : "No players yet"}
          message={query ? "Try a different search." : "Create player profiles to use in tournaments."}
          action={query ? undefined : <Button onClick={openNew}>Create player</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Player</th>
                  <th className="px-4 py-3 font-semibold">Country</th>
                  <th className="px-4 py-3 font-semibold">License</th>
                  <th className="px-4 py-3 text-right font-semibold">Points</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p, i) => (
                  <tr key={p.id} className={i % 2 ? "bg-surface" : "bg-transparent"}>
                    <td className="px-4 py-3 font-medium">{playerName(p)}</td>
                    <td className="px-4 py-3 text-muted">{p.countries?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{p.license_no || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {Number(p.ranking_pts ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(p)} aria-label={`Edit ${playerName(p)}`} className="rounded-md p-2 text-muted cursor-pointer hover:bg-surface-2 hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(p)} aria-label={`Delete ${playerName(p)}`} className="rounded-md p-2 text-muted cursor-pointer hover:bg-destructive/10 hover:text-destructive">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit player" : "New player"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Full name">
            <Input required value={form.full_name} onChange={set("full_name")} placeholder="Jane Doe" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Alias">
              <Input value={form.alias} onChange={set("alias")} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={set("gender")}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country">
              <Select value={form.country_id} onChange={set("country_id")}>
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={form.birth_date} onChange={set("birth_date")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Handedness">
              <Select value={form.handedness} onChange={set("handedness")}>
                <option value="">Select…</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="ambidextrous">Ambidextrous</option>
              </Select>
            </Field>
            <Field label="License no.">
              <Input value={form.license_no} onChange={set("license_no")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <Input value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={set("email")} />
            </Field>
          </div>
          <Field label="Ranking points">
            <Input type="number" value={form.ranking_pts} onChange={set("ranking_pts")} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>{editing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        busy={busy}
        title="Delete player?"
        message={`"${deleting ? playerName(deleting) : ""}" will be removed from the directory.`}
      />
    </div>
  );
}
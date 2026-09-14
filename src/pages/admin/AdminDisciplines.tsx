import { useState, type FormEvent } from "react";
import { Dices, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Spinner } from "../../components/ui";
import { useAsync, fetchDisciplines } from "../../lib/data";
import { supabase } from "../../lib/supabase";
import type { Discipline } from "../../lib/types";

const emptyForm = { name: "", code: "", category: "pool", scoring_type: "racks", color: "#1e9e57", description: "" };

export function AdminDisciplinesPage() {
  const disciplines = useAsync(() => fetchDisciplines(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Discipline | null>(null);
  const [deleting, setDeleting] = useState<Discipline | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (d: Discipline) => {
    setEditing(d);
    setForm({ name: d.name, code: d.code, category: d.category, scoring_type: d.scoring_type, color: d.color ?? "#1e9e57", description: d.description ?? "" });
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = editing
      ? await supabase.from("disciplines").update(form).eq("id", editing.id)
      : await supabase.from("disciplines").insert(form);
    setBusy(false);
    if (!error) { setModalOpen(false); disciplines.reload(); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    await supabase.from("disciplines").delete().eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    disciplines.reload();
  };

  const categories: Record<string, string> = { pool: "Pool", snooker: "Snooker", english_billiards: "English Billiards", carom: "Carom" };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Disciplines</h1>
          <p className="text-sm text-muted">Pool, snooker, English billiards and carom variants.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" aria-hidden="true" /> New discipline</Button>
      </div>

      {disciplines.loading ? (
        <Spinner label="Loading disciplines…" />
      ) : (disciplines.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Dices className="h-8 w-8" />}
          title="No disciplines yet"
          message="Add disciplines so tournaments can be categorised."
          action={<Button onClick={openNew}>Add discipline</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(disciplines.data ?? []).map((d) => (
            <Card key={d.id} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${d.color ?? "#888"}22`, color: d.color ?? "inherit" }}>
                  <Dices className="h-5 w-5" aria-hidden="true" />
                </span>
                <Badge tone="gray">{categories[d.category] ?? d.category}</Badge>
              </div>
              <h3 className="font-heading font-bold">{d.name}</h3>
              <p className="text-xs text-muted">
                {d.code} · {d.scoring_type} scoring
              </p>
              {d.description && <p className="mt-2 text-sm text-muted line-clamp-2">{d.description}</p>}
              <div className="mt-4 flex justify-end gap-1">
                <button onClick={() => openEdit(d)} aria-label={`Edit ${d.name}`} className="rounded-md p-2 text-muted cursor-pointer hover:bg-surface-2 hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleting(d)} aria-label={`Delete ${d.name}`} className="rounded-md p-2 text-muted cursor-pointer hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit discipline" : "New discipline"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Name"><Input required value={form.name} onChange={set("name")} placeholder="9-Ball Pool" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code"><Input required value={form.code} onChange={set("code")} placeholder="9ball" /></Field>
            <Field label="Category">
              <Select value={form.category} onChange={set("category")}>
                <option value="pool">Pool</option>
                <option value="snooker">Snooker</option>
                <option value="english_billiards">English Billiards</option>
                <option value="carom">Carom</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Scoring type">
              <Select value={form.scoring_type} onChange={set("scoring_type")}>
                <option value="racks">Racks</option>
                <option value="frames">Frames</option>
                <option value="points">Points</option>
                <option value="innings">Innings</option>
              </Select>
            </Field>
            <Field label="Accent colour">
              <Input type="color" value={form.color} onChange={set("color")} className="h-10 p-1" />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={form.description} onChange={set("description")} rows={2} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>{editing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={deleting !== null} onClose={() => setDeleting(null)} onConfirm={handleDelete} busy={busy} title="Delete discipline?" message={`"${deleting?.name}" will be removed.`} />
    </div>
  );
}
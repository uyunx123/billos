import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Spinner } from "../../components/ui";
import { useAsync, fetchTables } from "../../lib/data";
import { supabase } from "../../lib/supabase";
import type { Table } from "../../lib/types";

const emptyForm = { name: "", code: "", table_type: "pool", venue: "" };

export function AdminTablesPage() {
  const tables = useAsync(() => fetchTables(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Table | null>(null);
  const [deleting, setDeleting] = useState<Table | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (t: Table) => { setEditing(t); setForm({ name: t.name, code: t.code ?? "", table_type: t.table_type, venue: t.venue ?? "" }); setModalOpen(true); };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, code: form.code || null, venue: form.venue || null };
    const { error } = editing
      ? await supabase.from("tables").update(payload).eq("id", editing.id)
      : await supabase.from("tables").insert(payload);
    setBusy(false);
    if (!error) { setModalOpen(false); tables.reload(); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    await supabase.from("tables").delete().eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    tables.reload();
  };

  const typeLabels: Record<string, string> = { pool: "Pool", snooker: "Snooker", carom: "Carom", english_billiards: "English Billiards" };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Tables</h1>
          <p className="text-sm text-muted">Match tables available for scheduling.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" aria-hidden="true" /> New table</Button>
      </div>

      {tables.loading ? (
        <Spinner label="Loading tables…" />
      ) : (tables.data ?? []).length === 0 ? (
        <EmptyState icon={<Plus className="h-8 w-8" />} title="No tables yet" message="Add the tables used in your venue so matches can be scheduled." action={<Button onClick={openNew}>Add table</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(tables.data ?? []).map((t) => (
            <Card key={t.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-heading font-bold">{t.name}</p>
                <p className="text-xs text-muted">{typeLabels[t.table_type] ?? t.table_type}{t.venue ? ` · ${t.venue}` : ""}{t.code ? ` · ${t.code}` : ""}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(t)} aria-label={`Edit ${t.name}`} className="rounded-md p-2 text-muted cursor-pointer hover:bg-surface-2 hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setDeleting(t)} aria-label={`Delete ${t.name}`} className="rounded-md p-2 text-muted cursor-pointer hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit table" : "New table"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Name"><Input required value={form.name} onChange={set("name")} placeholder="Table 1" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code"><Input value={form.code} onChange={set("code")} placeholder="T1" /></Field>
            <Field label="Type">
              <Select value={form.table_type} onChange={set("table_type")}>
                <option value="pool">Pool</option>
                <option value="snooker">Snooker</option>
                <option value="carom">Carom</option>
                <option value="english_billiards">English Billiards</option>
              </Select>
            </Field>
          </div>
          <Field label="Venue"><Input value={form.venue} onChange={set("venue")} placeholder="Main Hall" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>{editing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={deleting !== null} onClose={() => setDeleting(null)} onConfirm={handleDelete} busy={busy} title="Delete table?" message={`"${deleting?.name}" will be removed.`} />
    </div>
  );
}
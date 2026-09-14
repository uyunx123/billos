import { useState, type FormEvent } from "react";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, Spinner } from "../../components/ui";
import { useAsync, fetchFaq } from "../../lib/data";
import { supabase } from "../../lib/supabase";
import type { FAQ } from "../../lib/types";

const emptyForm = { question: "", answer: "", category: "General", sort_order: "0" };

export function AdminFaqPage() {
  const faq = useAsync(() => fetchFaq(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [deleting, setDeleting] = useState<FAQ | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (f: FAQ) => { setEditing(f); setForm({ question: f.question, answer: f.answer ?? "", category: f.category ?? "General", sort_order: String(f.sort_order) }); setModalOpen(true); };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, sort_order: Number(form.sort_order || 0), active: true };
    const { error } = editing
      ? await supabase.from("faq").update(payload).eq("id", editing.id)
      : await supabase.from("faq").insert(payload);
    setBusy(false);
    if (!error) { setModalOpen(false); faq.reload(); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    await supabase.from("faq").delete().eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    faq.reload();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">FAQ</h1>
          <p className="text-sm text-muted">Questions shown on the public FAQ page.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" aria-hidden="true" /> New question</Button>
      </div>

      {faq.loading ? (
        <Spinner label="Loading FAQ…" />
      ) : (faq.data ?? []).length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-8 w-8" />} title="No FAQ entries" message="Add questions and answers for players." action={<Button onClick={openNew}>Add question</Button>} />
      ) : (
        <div className="space-y-3">
          {(faq.data ?? []).map((f) => (
            <Card key={f.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone="gray">{f.category ?? "General"}</Badge>
                </div>
                <p className="truncate font-semibold">{f.question}</p>
                {f.answer && <p className="mt-1 line-clamp-1 text-sm text-muted">{f.answer}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openEdit(f)} aria-label={`Edit ${f.question}`} className="rounded-md p-2 text-muted cursor-pointer hover:bg-surface-2 hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setDeleting(f)} aria-label={`Delete ${f.question}`} className="rounded-md p-2 text-muted cursor-pointer hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit question" : "New question"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Question"><Input required value={form.question} onChange={set("question")} placeholder="How do I register?" /></Field>
          <Field label="Answer">
            <textarea value={form.answer} onChange={set("answer")} rows={4} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category"><Input value={form.category} onChange={set("category")} placeholder="General" /></Field>
            <Field label="Sort order"><Input type="number" value={form.sort_order} onChange={set("sort_order")} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>{editing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={deleting !== null} onClose={() => setDeleting(null)} onConfirm={handleDelete} busy={busy} title="Delete question?" message={`"${deleting?.question}" will be removed from the FAQ.`} />
    </div>
  );
}
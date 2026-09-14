import { useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, Users } from "lucide-react";
import { Button, Card, EmptyState, Input, Spinner } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { fetchCommittee, useAsync } from "../../lib/data";

export function AdminCommitteePage() {
  const { id = "" } = useParams();
  const committee = useAsync(() => fetchCommittee(id), [id]);
  const [form, setForm] = useState({ name: "", role: "", organization: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    await supabase.from("tournament_committee").insert({
      tournament_id: id,
      name: form.name.trim(),
      role: form.role || null,
      organization: form.organization || null,
      phone: form.phone || null,
      email: form.email || null,
      sort_order: (committee.data?.length ?? 0) + 1,
    });
    setBusy(false);
    setForm({ name: "", role: "", organization: "", phone: "", email: "" });
    committee.reload();
  };

  const remove = async (memberId: string) => {
    await supabase.from("tournament_committee").delete().eq("id", memberId);
    committee.reload();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold">Committee</h1>
        <p className="text-sm text-muted">Tournament officials shown on the public tournament page.</p>
      </div>

      {committee.loading ? (
        <Spinner label="Loading committee…" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            {committee.data?.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="No committee members yet"
                message="Add referees, organisers and officials who run this tournament."
              />
            ) : (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {(committee.data ?? []).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{c.name}</p>
                        <p className="truncate text-xs text-muted">
                          {[c.role, c.organization].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(c.id)}
                        aria-label={`Remove ${c.name}`}
                        className="shrink-0 rounded-md p-2 text-muted cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <Card className="space-y-4 p-5">
            <h3 className="font-heading text-lg font-bold">Add member</h3>
            <Input value={form.name} onChange={set("name")} placeholder="Name *" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={form.role} onChange={set("role")} placeholder="Role" />
              <Input value={form.organization} onChange={set("organization")} placeholder="Organization" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={form.phone} onChange={set("phone")} placeholder="Phone" />
              <Input value={form.email} onChange={set("email")} placeholder="Email" />
            </div>
            <Button className="w-full" onClick={create} loading={busy} disabled={!form.name.trim()}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add member
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
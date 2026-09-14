import { useState, type FormEvent } from "react";
import { Flag, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Spinner } from "../../components/ui";
import { useAsync, fetchClubs, fetchCountries, fetchRegions } from "../../lib/data";
import { supabase } from "../../lib/supabase";
import type { Club, Country, Region } from "../../lib/types";

type GeoType = "countries" | "regions" | "clubs";

export function AdminGeographyPage() {
  const [type, setType] = useState<GeoType>("countries");
  const countries = useAsync(() => fetchCountries(), []);
  const regions = useAsync(() => fetchRegions(), []);
  const clubs = useAsync(() => fetchClubs(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ name: string; code: string; country_id: string }>({ name: "", code: "", country_id: "" });

  const openNew = () => { setForm({ name: "", code: "", country_id: type === "clubs" ? (countries.data?.[0]?.id ?? "") : "" }); setModalOpen(true); };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let error: { message?: string } | null = null;
    if (type === "countries") {
      ({ error } = await supabase.from("countries").insert({ name: form.name, code: form.code || null }));
    } else if (type === "regions") {
      ({ error } = await supabase.from("regions").insert({ name: form.name, code: form.code || null, country_id: form.country_id || null }));
    } else {
      ({ error } = await supabase.from("clubs").insert({ name: form.name, short_name: form.code || null, country_id: form.country_id || null }));
    }
    setBusy(false);
    if (!error) { setModalOpen(false); countries.reload(); regions.reload(); clubs.reload(); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const table = type === "countries" ? "countries" : type === "regions" ? "regions" : "clubs";
    await supabase.from(table).delete().eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    countries.reload(); regions.reload(); clubs.reload();
  };

  const tabs: { id: GeoType; label: string; count?: number }[] = [
    { id: "countries", label: "Countries", count: countries.data?.length },
    { id: "regions", label: "Regions", count: regions.data?.length },
    { id: "clubs", label: "Clubs", count: clubs.data?.length },
  ];

  const data = type === "countries" ? (countries.data ?? []) : type === "regions" ? (regions.data ?? []) : (clubs.data ?? []);
  const loading = type === "countries" ? countries.loading : type === "regions" ? regions.loading : clubs.loading;

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Geography</h1>
          <p className="text-sm text-muted">Countries, regions and clubs used across the platform.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" aria-hidden="true" /> Add {type.slice(0, -1)}</Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setType(t.id)} aria-current={type === t.id ? "page" : undefined}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors duration-150 ${type === t.id ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>
            {t.label}
            {t.count !== undefined && <Badge tone={type === t.id ? "green" : "gray"}>{t.count}</Badge>}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="Loading…" />
      ) : data.length === 0 ? (
        <EmptyState icon={<Flag className="h-8 w-8" />} title={`No ${type} yet`} message={`Add ${type} to use in player and tournament profiles.`} action={<Button onClick={openNew}>Add {type.slice(0, -1)}</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data as Array<Country | Region | Club>).map((item) => (
            <Card key={item.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{item.name}</p>
                <p className="text-xs text-muted">
                  {"code" in item && item.code ? item.code : ""}
                  {"country_id" in item && item.country_id ? " · linked country" : ""}
                </p>
              </div>
              <button onClick={() => setDeleting({ id: item.id, name: item.name })} aria-label={`Delete ${item.name}`} className="rounded-md p-2 text-muted cursor-pointer hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Add ${type.slice(0, -1)}`}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label={type === "clubs" ? "Club name" : type === "regions" ? "Region name" : "Country name"}>
            <Input required value={form.name} onChange={set("name")} placeholder="…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={type === "clubs" ? "Short name" : type === "regions" ? "Code" : "ISO code"}>
              <Input value={form.code} onChange={set("code")} placeholder="…" />
            </Field>
            {type !== "countries" && (
              <Field label="Country">
                <Select value={form.country_id} onChange={set("country_id")}>
                  <option value="">Select…</option>
                  {(countries.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Add</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={deleting !== null} onClose={() => setDeleting(null)} onConfirm={handleDelete} busy={busy} title={`Delete ${type.slice(0, -1)}?`} message={`"${deleting?.name}" will be removed.`} />
    </div>
  );
}
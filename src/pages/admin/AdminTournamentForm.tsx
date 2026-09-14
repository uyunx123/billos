import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button, Card, Field, Input, Select, Spinner } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { fetchDisciplines, fetchTournamentById } from "../../lib/data";
import { slugify } from "../../lib/utils";

const empty = {
  name: "",
  slug: "",
  discipline_id: "",
  format: "single",
  bracket_type: "elimination",
  gender: "open",
  draw_size: "16",
  seeding_mode: "manual",
  venue: "",
  start_date: "",
  end_date: "",
  status: "setup",
  description: "",
  is_public: true,
  featured: false,
};

export function AdminTournamentFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [disciplines, setDisciplines] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    fetchDisciplines().then(setDisciplines).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchTournamentById(id)
      .then((t) => {
        setForm({
          name: t.name,
          slug: t.slug,
          discipline_id: t.discipline_id ?? "",
          format: t.format,
          bracket_type: t.bracket_type,
          gender: t.gender ?? "open",
          draw_size: String(t.draw_size),
          seeding_mode: t.seeding_mode,
          venue: t.venue ?? "",
          start_date: t.start_date ?? "",
          end_date: t.end_date ?? "",
          status: t.status,
          description: t.description ?? "",
          is_public: t.is_public,
          featured: t.featured,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      slug: form.slug || slugify(form.name) || "tournament",
      draw_size: Number(form.draw_size),
      discipline_id: form.discipline_id || null,
    };
    const { error } = editing
      ? await supabase.from("tournaments").update(payload).eq("id", id)
      : await supabase.from("tournaments").insert(payload);
    setSaving(false);
    if (error) {
      setError("We couldn't save the tournament — check the slug isn't already in use and try again.");
    } else {
      navigate("/admin/tournaments");
    }
  };

  if (loading) return <Spinner label="Loading tournament…" />;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/admin/tournaments"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted cursor-pointer hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tournaments
      </Link>
      <h1 className="mb-6 font-heading text-2xl font-extrabold">
        {editing ? "Edit tournament" : "New tournament"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-4 p-6">
          <h2 className="font-heading text-lg font-bold">Details</h2>
          <Field label="Tournament name">
            <Input
              required
              value={form.name}
              onChange={set("name")}
              placeholder="National 8-Ball Open"
            />
          </Field>
          <Field label="URL slug" hint={`Public link: /tournaments/${form.slug || "…"}`}>
            <Input
              value={form.slug}
              onChange={set("slug")}
              placeholder="national-8ball-open"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Discipline">
              <Select value={form.discipline_id} onChange={set("discipline_id")}>
                <option value="">Select…</option>
                {disciplines.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={set("gender")}>
                <option value="open">Open</option>
                <option value="male">Men</option>
                <option value="female">Women</option>
                <option value="mixed">Mixed</option>
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              placeholder="Event details, format, prizes…"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </Field>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-heading text-lg font-bold">Format & bracket</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Format">
              <Select value={form.format} onChange={set("format")}>
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="mixed">Mixed</option>
              </Select>
            </Field>
            <Field label="Bracket type">
              <Select value={form.bracket_type} onChange={set("bracket_type")}>
                <option value="elimination">Single elimination</option>
                <option value="double_elimination">Double elimination</option>
                <option value="round_robin">Round robin</option>
                <option value="swiss">Swiss</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Draw size" hint="Powers of two work best (4–128).">
              <Select value={form.draw_size} onChange={set("draw_size")}>
                {[4, 8, 16, 32, 64, 128].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
            </Field>
            <Field label="Seeding mode">
              <Select value={form.seeding_mode} onChange={set("seeding_mode")}>
                <option value="manual">Manual</option>
                <option value="ranking">By ranking points</option>
                <option value="random">Random</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-heading text-lg font-bold">Venue & dates</h2>
          <Field label="Venue">
            <Input value={form.venue} onChange={set("venue")} placeholder="Grand Sports Arena" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <Input type="date" value={form.start_date} onChange={set("start_date")} />
            </Field>
            <Field label="End date">
              <Input type="date" value={form.end_date} onChange={set("end_date")} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-heading text-lg font-bold">Status & visibility</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Select value={form.status} onChange={set("status")}>
                {["setup", "registration", "draw", "ongoing", "completed", "cancelled"].map((s) => (
                  <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_public}
                  onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Public
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Featured
              </label>
            </div>
          </div>
        </Card>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/tournaments")}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? "Save changes" : "Create tournament"}
          </Button>
        </div>
      </form>
    </div>
  );
}
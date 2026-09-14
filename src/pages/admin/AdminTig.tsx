import { useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { Button, Card, Field, Input, Spinner } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { fetchTig, useAsync } from "../../lib/data";

export function AdminTigPage() {
  const { id = "" } = useParams();
  const tig = useAsync(() => fetchTig(id), [id]);
  const [form, setForm] = useState<{ title: string; content: string; rules_content: string }>({
    title: "",
    content: "",
    rules_content: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hydrate form once when data arrives
  if (tig.data && !loaded) {
    setForm({
      title: tig.data.title ?? "",
      content: tig.data.content ?? "",
      rules_content: tig.data.rules_content ?? "",
    });
    setLoaded(true);
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    const payload = { ...form, title: form.title || "Tournament Information Guide" };
    if (tig.data) {
      await supabase.from("tournament_tig").update(payload).eq("id", tig.data.id);
    } else {
      await supabase.from("tournament_tig").insert({ tournament_id: id, ...payload });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    tig.reload();
  };

  if (tig.loading) return <Spinner label="Loading TIG…" />;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-extrabold">
            <ClipboardList className="h-6 w-6 text-primary" aria-hidden="true" /> Tournament Information Guide
          </h1>
          <p className="text-sm text-muted">Shown on the public tournament page and available to players.</p>
        </div>
        {saved && (
          <span role="status" className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Saved
          </span>
        )}
      </div>

      <Card className="space-y-4 p-6">
        <Field label="Title">
          <Input value={form.title} onChange={set("title")} placeholder="Tournament Information Guide" />
        </Field>
        <Field label="Guide content" hint="Markdown or plain text describing rules, format and info.">
          <textarea
            value={form.content}
            onChange={set("content")}
            rows={6}
            placeholder="Venue, schedule, format, entry fees…"
            className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
          />
        </Field>
        <Field label="Rules content">
          <textarea
            value={form.rules_content}
            onChange={set("rules_content")}
            rows={5}
            placeholder="Official playing rules, dress code, code of conduct…"
            className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
          />
        </Field>
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            Save guide
          </Button>
        </div>
      </Card>
    </div>
  );
}
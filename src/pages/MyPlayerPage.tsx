import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { Button, Card, Field, Input, Select, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { fetchCountries, fetchMyPlayer } from "../lib/data";

export function MyPlayerPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    alias: "",
    gender: "",
    country_id: "",
    birth_date: "",
    license_no: "",
    handedness: "",
    phone: "",
    email: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    fetchCountries().then(setCountries).catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.user) {
      navigate("/login");
      return;
    }
    fetchMyPlayer(session.user.id)
      .then((p) => {
        if (p) {
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
          });
        } else {
          setForm((f) => ({ ...f, email: session.user.email ?? "" }));
        }
      })
      .finally(() => setLoading(false));
  }, [session, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setSaving(true);
    setMessage(null);
    const existing = await fetchMyPlayer(session.user.id);
    const payload = { ...form, user_id: session.user.id };
    const { error } = existing
      ? await supabase.from("players").update(payload).eq("id", existing.id)
      : await supabase.from("players").insert(payload);
    setSaving(false);
    if (error) {
      setMessage({ kind: "error", text: "We couldn't save your profile — try again." });
    } else {
      setMessage({ kind: "success", text: "Profile saved. You're ready to register!" });
    }
  };

  if (loading) return <Spinner label="Loading your profile…" />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-extrabold">My player profile</h1>
        <p className="mt-1 text-muted">This profile is used when you register for tournaments.</p>
      </div>

      {message && (
        <div
          role="status"
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            message.kind === "success"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" /> Details
          </h2>
          <Field label="Full name">
            <Input required value={form.full_name} onChange={set("full_name")} placeholder="Jane Doe" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Alias / nickname">
              <Input value={form.alias} onChange={set("alias")} placeholder="" />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={set("gender")}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country">
              <Select value={form.country_id} onChange={set("country_id")}>
                <option value="">Select country…</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={form.birth_date} onChange={set("birth_date")} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-heading text-lg font-bold">Playing & contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Handedness">
              <Select value={form.handedness} onChange={set("handedness")}>
                <option value="">Select…</option>
                <option value="right">Right-handed</option>
                <option value="left">Left-handed</option>
                <option value="ambidextrous">Ambidextrous</option>
              </Select>
            </Field>
            <Field label="License number (optional)">
              <Input value={form.license_no} onChange={set("license_no")} placeholder="" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <Input value={form.phone} onChange={set("phone")} placeholder="" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={set("email")} />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate("/")}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save profile
          </Button>
        </div>
      </form>
    </div>
  );
}
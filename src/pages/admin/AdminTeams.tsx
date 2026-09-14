import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Trash2, Users } from "lucide-react";
import { Button, Card, EmptyState, Input, Select, Spinner } from "../../components/ui";
import { supabase } from "../../lib/supabase";

export function AdminTeamsPage() {
  const { id = "" } = useParams();
  const [teams, setTeams] = useState<Awaited<ReturnType<typeof loadTeams>>>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [teamType, setTeamType] = useState("national");

  async function loadTeams() {
    const { data, error } = await supabase
      .from("teams")
      .select("*, team_members(*, players(*))")
      .eq("tournament_id", id)
      .order("name");
    if (error) throw new Error(error.message);
    return data;
  }

  useEffect(() => {
    loadTeams().then(setTeams).finally(() => setLoading(false));
  }, [id]);

  const create = async () => {
    if (!name.trim()) return;
    const { data } = await supabase
      .from("teams")
      .insert({ tournament_id: id, name: name.trim(), team_type: teamType })
      .select()
      .single();
    if (data) setTeams((t) => [...t, data]);
    setName("");
  };

  const remove = async (teamId: string) => {
    await supabase.from("teams").delete().eq("id", teamId);
    setTeams((t) => t.filter((x) => x.id !== teamId));
  };

  if (loading) return <Spinner label="Loading teams…" />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold">Teams</h1>
        <p className="text-sm text-muted">Team-based entries for this tournament.</p>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No teams yet"
          message="Create teams for team-based tournaments. Members are managed from team entries."
        />
      ) : (
        <Card className="mb-6 overflow-hidden">
          <ul className="divide-y divide-border">
            {teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted capitalize">{t.team_type} · {t.team_members?.length ?? 0} members</p>
                </div>
                <button
                  onClick={() => remove(t.id)}
                  aria-label={`Delete ${t.name}`}
                  className="shrink-0 rounded-md p-2 text-muted cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-4 p-5">
        <h3 className="font-heading text-lg font-bold">Create team</h3>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name *" />
        <Select value={teamType} onChange={(e) => setTeamType(e.target.value)} aria-label="Team type">
          <option value="national">National</option>
          <option value="club">Club</option>
          <option value="regional">Regional</option>
          <option value="other">Other</option>
        </Select>
        <Button className="w-full" onClick={create} disabled={!name.trim()}>
          Create team
        </Button>
      </Card>
    </div>
  );
}
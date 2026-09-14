import { useEffect, useMemo, useState } from "react";
import { Search, Shield, Users } from "lucide-react";
import { Badge, Card, EmptyState, Input, Select, Spinner } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import type { Profile, Role } from "../../lib/types";

const ROLES: Role[] = ["superadmin", "admin", "scorer", "public"];

export function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("name");
    if (!error) setUsers(data as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setRole = async (id: string, role: Role) => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (!error) load();
  };

  const toggleActive = async (u: Profile) => {
    const { error } = await supabase.from("profiles").update({ active: !u.active }).eq("id", u.id);
    if (!error) load();
  };

  const filtered = useMemo(() => {
    let list = users;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    return list;
  }, [users, query]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-extrabold">
          <Users className="h-6 w-6 text-primary" aria-hidden="true" /> Users
        </h1>
        <p className="text-sm text-muted">Manage roles and access across the platform.</p>
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input
          className="pl-9"
          placeholder="Search users…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
        />
      </div>

      {loading ? (
        <Spinner label="Loading users…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No users found" message="Try a different search." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u, i) => (
                  <tr key={u.id} className={i % 2 ? "bg-surface" : "bg-transparent"}>
                    <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{u.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                        <Select
                          value={u.role}
                          onChange={(e) => setRole(u.id, e.target.value as Role)}
                          className="h-8 w-36 text-xs"
                          aria-label={`Role for ${u.name}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </Select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(u)}
                        className="cursor-pointer"
                        aria-label={`${u.active ? "Deactivate" : "Activate"} ${u.name}`}
                      >
                        <Badge tone={u.active ? "green" : "red"}>{u.active ? "Active" : "Disabled"}</Badge>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
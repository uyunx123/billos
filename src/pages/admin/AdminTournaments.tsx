import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Search, Trash2, Trophy } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Select, Spinner } from "../../components/ui";
import { useAsync, fetchTournaments } from "../../lib/data";
import { formatDate, STATUS_LABELS, statusTone } from "../../lib/utils";
import type { Tournament } from "../../lib/types";
import { supabase } from "../../lib/supabase";

export function AdminTournamentsPage() {
  const tournaments = useAsync(() => fetchTournaments(), []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [deleting, setDeleting] = useState<Tournament | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = useMemo(() => {
    let list = tournaments.data ?? [];
    if (status !== "all") list = list.filter((t) => t.status === status);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [tournaments.data, query, status]);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    await supabase.from("tournaments").delete().eq("id", deleting.id);
    setDeleteBusy(false);
    setDeleting(null);
    tournaments.reload();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Tournaments</h1>
          <p className="text-sm text-muted">Create and manage events, registrations and draws.</p>
        </div>
        <Link to="/admin/tournaments/new">
          <Button>
            <Plus className="h-4 w-4" aria-hidden="true" /> New tournament
          </Button>
        </Link>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder="Search tournaments…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search tournaments"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44" aria-label="Filter by status">
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>

      {tournaments.loading ? (
        <Spinner label="Loading tournaments…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-8 w-8" />}
          title={query || status !== "all" ? "No matching tournaments" : "No tournaments yet"}
          message={
            query || status !== "all"
              ? "Try adjusting your filters."
              : "Create your first tournament to start taking registrations."
          }
          action={
            query || status !== "all" ? undefined : (
              <Link to="/admin/tournaments/new">
                <Button>Create tournament</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Discipline</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Draw</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t, i) => (
                  <tr key={t.id} className={i % 2 ? "bg-surface" : "bg-transparent"}>
                    <td className="px-4 py-3">
                      <Link to={`/admin/tournaments/${t.id}`} className="font-semibold text-foreground cursor-pointer hover:text-primary">
                        {t.name}
                      </Link>
                      {t.featured && <Badge tone="amber" className="ml-2">Featured</Badge>}
                    </td>
                    <td className="px-4 py-3 text-muted">{t.disciplines?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(t.start_date)} – {formatDate(t.end_date)}
                    </td>
                    <td className="px-4 py-3">{t.draw_size} players</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(t.status)}>{STATUS_LABELS[t.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link to={`/admin/tournaments/${t.id}`} aria-label={`Edit ${t.name}`}>
                          <button className="rounded-md p-2 text-muted cursor-pointer transition-colors hover:bg-surface-2 hover:text-foreground">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleting(t)}
                          aria-label={`Delete ${t.name}`}
                          className="rounded-md p-2 text-muted cursor-pointer transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteBusy}
        title="Delete tournament?"
        message={`"${deleting?.name}" and all its registrations will be permanently deleted.`}
      />
    </div>
  );
}
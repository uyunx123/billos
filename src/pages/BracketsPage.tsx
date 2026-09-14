import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Network, Search } from "lucide-react";
import { Badge, Card, EmptyState, Input, Spinner } from "../components/ui";
import { fetchBracketsList, useAsync } from "../lib/data";
import { formatDate, STATUS_LABELS, statusTone } from "../lib/utils";

export function BracketsPage() {
  const brackets = useAsync(() => fetchBracketsList(), []);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = brackets.data ?? [];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [brackets.data, query]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="flex items-center gap-2.5 font-heading text-3xl font-extrabold">
          <Network className="h-7 w-7 text-primary" aria-hidden="true" />
          Brackets
        </h1>
        <p className="mt-1 text-muted">Live and completed tournament draws — open one to follow the action.</p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input
          className="pl-9"
          placeholder="Search brackets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search brackets"
        />
      </div>

      {brackets.loading ? (
        <Spinner label="Loading brackets…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Network className="h-8 w-8" />}
          title="No brackets yet"
          message="Tournament draws appear here once a tournament reaches the draw stage."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Link key={t.id} to={`/tournaments/${t.slug}`} className="block cursor-pointer">
              <Card hover className="flex h-full flex-col p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <Badge tone={statusTone(t.status)}>{STATUS_LABELS[t.status]}</Badge>
                  {t.disciplines && (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: `${t.disciplines.color ?? "#888"}22`,
                        color: t.disciplines.color ?? "inherit",
                      }}
                    >
                      {t.disciplines.name}
                    </span>
                  )}
                </div>
                <h2 className="font-heading text-lg font-bold leading-snug">{t.name}</h2>
                <div className="mt-auto pt-4 text-xs text-muted">
                  {formatDate(t.start_date)} – {formatDate(t.end_date)}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { AlertTriangle, Database, Eraser } from "lucide-react";
import { Card, ConfirmDialog } from "../../components/ui";
import { supabase } from "../../lib/supabase";

/** Development utilities to reset live-scoring data (match history), never players or tournaments. */
export function AdminClearPage() {
  const [target, setTarget] = useState<"matches" | "entries" | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!target) return;
    setBusy(true);
    if (target === "matches") {
      await supabase.from("score_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("match_details").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } else if (target === "entries") {
      await supabase.from("tournament_entries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }
    setBusy(false);
    setTarget(null);
  };

  const items = [
    {
      key: "matches" as const,
      title: "Reset all matches & scores",
      desc: "Deletes every match, leg detail and score event. Draws on tournaments are left intact.",
    },
    {
      key: "entries" as const,
      title: "Clear tournament entries",
      desc: "Removes every registration across all tournaments. Players themselves are not deleted.",
    },
  ];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-extrabold">
          <Eraser className="h-6 w-6 text-destructive" aria-hidden="true" /> Clear data
        </h1>
        <p className="text-sm text-muted">Development utilities for wiping live-scoring and registration data.</p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.key} className="flex items-start justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Database className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-0.5 text-sm text-muted">{item.desc}</p>
              </div>
            </div>
            <button
              onClick={() => setTarget(item.key)}
              className="shrink-0 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive cursor-pointer transition-all duration-150 hover:bg-destructive/10 active:scale-[0.97]"
            >
              Clear
            </button>
          </Card>
        ))}
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
        These actions are permanent and can't be undone.
      </p>

      <ConfirmDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        onConfirm={run}
        busy={busy}
        title="Confirm clear"
        message={
          target === "matches"
            ? "This permanently deletes all matches and scores. Continue?"
            : "This permanently deletes every tournament entry. Continue?"
        }
        confirmLabel="Yes, clear it"
      />
    </div>
  );
}
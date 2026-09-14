import { useId } from "react";
import { computeLayout, ROUND_NAMES, type BracketNode } from "../lib/drawEngine";
import { cn } from "../lib/cn";

interface BracketProps {
  nodes: BracketNode[];
  winnerName?: (entryId: string | null) => string;
  className?: string;
}

export function BracketView({ nodes, winnerName, className }: BracketProps) {
  const uid = useId().replace(/:/g, "");
  const layout = computeLayout(nodes);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="font-heading text-lg font-bold text-foreground">No bracket yet</p>
        <p className="text-sm text-muted">Run the draw to generate the bracket.</p>
      </div>
    );
  }

  const groups: BracketNode[][] = [];
  nodes.forEach((n) => {
    if (!groups[n.round]) groups[n.round] = [];
    groups[n.round].push(n);
  });

  const MATCH_W = 170;
  const MATCH_H = 56;
  const roundNames = ROUND_NAMES.slice(0, groups.length).reverse();

  return (
    <div className={cn("w-full overflow-x-auto pb-4", className)}>
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label="Tournament bracket"
        className="mx-auto block"
      >
        <defs>
          <clipPath id={`clip-${uid}`}>
            <rect x="0" y="0" width={MATCH_W - 14} height={MATCH_H - 2} rx="8" />
          </clipPath>
        </defs>

        {groups.map((roundMatches, r) => {
          const x = layout.roundX(r);
          const count = roundMatches.length;
          // connector lines to next round
          return (
            <g key={r}>
              {roundMatches.map((m, idx) => {
                const y = layout.matchY(r, idx, count);
                const nextCount = groups[r + 1]?.length ?? 0;
                const midY = y + MATCH_H / 2;
                const nextY = nextCount
                  ? (() => {
                      // match in next round that this feeds into
                      const target = Math.floor(idx / 2);
                      return layout.matchY(r + 1, target, nextCount) + MATCH_H / 2;
                    })()
                  : midY;
                const isLast = r === groups.length - 1;
                const aWin = m.winnerId !== null && m.winnerId === m.slotA.entryId;
                const bWin = m.winnerId !== null && m.winnerId === m.slotB.entryId;
                const isBye = m.slotA.entryId === null || m.slotB.entryId === null;

                return (
                  <g key={`${r}-${idx}`}>
                    {/* connectors */}
                    {!isLast && (
                      <>
                        <line
                          x1={x + MATCH_W}
                          y1={midY}
                          x2={x + MATCH_W + 30}
                          y2={midY}
                          stroke="currentColor"
                          className="text-border"
                          strokeWidth="1.5"
                        />
                        <line
                          x1={x + MATCH_W + 30}
                          y1={midY}
                          x2={x + MATCH_W + 30}
                          y2={nextY}
                          stroke="currentColor"
                          className="text-border"
                          strokeWidth="1.5"
                        />
                        <line
                          x1={x + MATCH_W + 30}
                          y1={nextY}
                          x2={x + MATCH_W + 60}
                          y2={nextY}
                          stroke="currentColor"
                          className="text-border"
                          strokeWidth="1.5"
                        />
                      </>
                    )}

                    {/* match box */}
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={MATCH_W}
                        height={MATCH_H}
                        rx="8"
                        className={cn(
                          "fill-surface stroke-border",
                          m.status === "live" && "stroke-primary stroke-[2]",
                          m.status === "completed" && "fill-surface-2",
                        )}
                      />
                      {/* slot A */}
                      <text
                        x={x + 8}
                        y={y + 20}
                        fontSize="12"
                        fontWeight={aWin ? 700 : 400}
                        fill={aWin ? "var(--color-primary)" : "currentColor"}
                        className="text-foreground"
                      >
                        {(winnerName ? winnerName(m.slotA.entryId) : m.slotA.playerName) || "TBD"}
                      </text>
                      <text x={x + MATCH_W - 30} y={y + 20} fontSize="12" fontWeight={700} fill="currentColor" className="text-foreground">
                        {m.slotA.entryId === null ? "" : m.scoreA}
                      </text>
                      <line x1={x + 8} y1={y + 27} x2={x + MATCH_W - 8} y2={y + 27} stroke="currentColor" className="text-border" strokeWidth="0.5" />
                      {/* slot B */}
                      <text
                        x={x + 8}
                        y={y + 45}
                        fontSize="12"
                        fontWeight={bWin ? 700 : 400}
                        fill={bWin ? "var(--color-primary)" : "currentColor"}
                        className="text-foreground"
                      >
                        {(winnerName ? winnerName(m.slotB.entryId) : m.slotB.playerName) || "TBD"}
                      </text>
                      <text x={x + MATCH_W - 30} y={y + 45} fontSize="12" fontWeight={700} fill="currentColor" className="text-foreground">
                        {m.slotB.entryId === null ? "" : m.scoreB}
                      </text>
                      {isBye && (
                        <text x={x + 8} y={y + 33} fontSize="9" fill="currentColor" className="text-muted">
                          bye
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* round labels */}
        {groups.map((_, r) => {
          const x = layout.roundX(r);
          return (
            <text
              key={`label-${r}`}
              x={x + MATCH_W / 2}
              y={14}
              fontSize="11"
              fontWeight={700}
              textAnchor="middle"
              fill="currentColor"
              className="text-muted uppercase"
            >
              {roundNames[r]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
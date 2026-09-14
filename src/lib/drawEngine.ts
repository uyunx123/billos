import type { BracketMatch, TournamentEntry } from "./types";

// ============================================================
// Draw engine — ported from the CodeIgniter DrawEngine library.
// Standard single-elimination seeding so seed 1 & 2 only meet in
// the final, with byes handled for non-power-of-two fields.
// ============================================================

export interface SeededEntry {
  entry: TournamentEntry;
  seed: number;
}

/** Standard seeded bracket order for a power-of-two field. */
export function seededPositions(n: number): number[] {
  let positions = [1, 2];
  let size = 2;
  while (size < n) {
    const next: number[] = [];
    for (let i = 0; i < positions.length; i += 2) {
      const a = positions[i];
      const b = positions[i + 1];
      next.push(a, b + size, a + size, b);
    }
    positions = next;
    size *= 2;
  }
  return positions;
}

/**
 * Assign seeds to confirmed entries.
 * - ranking: sort by player ranking_pts desc
 * - random: shuffle
 * - manual: keep existing seed_no
 */
export function seedEntries(
  entries: TournamentEntry[],
  mode: "manual" | "ranking" | "random",
  rankingLookup: Record<string, number> = {},
): SeededEntry[] {
  const active = entries.filter((e) => e.entry_status === "confirmed");
  let sorted: TournamentEntry[];
  if (mode === "manual") {
    sorted = [...active].sort((a, b) => (a.seed_no ?? 999) - (b.seed_no ?? 999));
  } else if (mode === "ranking") {
    sorted = [...active].sort(
      (a, b) =>
        (rankingLookup[b.player_id ?? ""] ?? 0) - (rankingLookup[a.player_id ?? ""] ?? 0),
    );
  } else {
    sorted = [...active].sort(() => Math.random() - 0.5);
  }
  return sorted.map((entry, i) => ({ entry, seed: i + 1 }));
}

/** Next power of two >= n. */
export function nextPowerOfTwo(n: number): number {
  let size = 2;
  while (size < n) size *= 2;
  return Math.max(size, 2);
}

export interface BracketParticipant {
  seed: number | null;
  entryId: string | null;
  playerName: string;
}

export interface BracketNode {
  round: number;
  matchIndex: number;
  slotA: BracketParticipant;
  slotB: BracketParticipant;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  status: string;
}

/**
 * Build a single-elimination bracket tree from seeded entries.
 * drawSize must be a power of two; remaining slots become byes.
 */
export function buildBracket(
  seeded: SeededEntry[],
  drawSize: number,
  nameOf: (entryId: string | null) => string,
  existing?: Map<string, { scoreA: number; scoreB: number; winnerId: string | null; status: string }>,
): BracketNode[] {
  const size = nextPowerOfTwo(drawSize);
  const order = seededPositions(size);
  const totalRounds = Math.log2(size);
  const nodes: BracketNode[] = [];

  // Position -> seeded entry (by bracket slot)
  const slotMap = new Map<number, SeededEntry>();
  seeded.forEach((s) => {
    // Seed s sits at order[s-1]
    slotMap.set(order[s.seed - 1], s);
  });

  // Round 1: drawSize/2 matches
  const matchCounts: number[] = [];
  for (let r = 0; r < totalRounds; r++) {
    matchCounts.push(size / Math.pow(2, r + 1));
  }

  // Round 1 participants
  let roundParticipants: BracketParticipant[] = [];
  for (let slot = 1; slot <= size; slot++) {
    const s = slotMap.get(slot);
    roundParticipants.push({
      seed: s?.seed ?? null,
      entryId: s?.entry.id ?? null,
      playerName: s ? nameOf(s.entry.id) : "Bye",
    });
  }

  for (let r = 0; r < totalRounds; r++) {
    const matchesThisRound = matchCounts[r];
    const nextParticipants: BracketParticipant[] = [];
    for (let m = 0; m < matchesThisRound; m++) {
      const a = roundParticipants[m * 2];
      const b = roundParticipants[m * 2 + 1];
      const key = `${r}-${m}`;
      const saved = existing?.get(key);
      const bye = a.entryId === null || b.entryId === null;
      let winnerId: string | null = saved?.winnerId ?? null;
      if (bye && !saved) {
        winnerId = a.entryId ?? b.entryId;
      }
      const isBye = bye || (a.entryId === null && b.entryId === null);
      nodes.push({
        round: r,
        matchIndex: m,
        slotA: a,
        slotB: b,
        scoreA: saved?.scoreA ?? 0,
        scoreB: saved?.scoreB ?? 0,
        winnerId,
        status: saved?.status ?? (isBye ? "bye" : "pending"),
      });
      nextParticipants.push({
        seed: null,
        entryId: winnerId,
        playerName: winnerId ? nameOf(winnerId) : "TBD",
      });
    }
    roundParticipants = nextParticipants;
  }

  return nodes;
}

export interface BracketLayout {
  rounds: number;
  width: number;
  height: number;
  roundX: (r: number) => number;
  matchY: (r: number, m: number, count: number) => number;
}

export function computeLayout(nodes: BracketNode[]): BracketLayout {
  const rounds = nodes.length ? Math.max(...nodes.map((n) => n.round)) + 1 : 1;
  const matchW = 170;
  const matchH = 64;
  const gapX = 120;
  const gapY = 12;
  const width = rounds * (matchW + gapX) + gapX;
  const baseCount = nodes.length ? nodes.filter((n) => n.round === 0).length : 1;
  const height = baseCount * (matchH + gapY) + gapY * 4;
  const roundX = (r: number) => gapX + r * (matchW + gapX);
  const matchY = (_r: number, m: number, count: number) => {
    const per = matchH + gapY;
    const totalH = count * per;
    const y = (height - totalH) / 2 + m * per;
    return y;
  };
  return { rounds, width, height, roundX, matchY };
}

/** Convert bracket nodes into a serialisable round list for the public view. */
export function toRounds(nodes: BracketNode[]): BracketMatch[][] {
  const rounds: BracketMatch[][] = [];
  nodes.forEach((n) => {
    if (!rounds[n.round]) rounds[n.round] = [];
    rounds[n.round].push({
      round: n.round,
      index: n.matchIndex,
      matchNo: n.matchIndex + 1,
      slotA: n.slotA.seed,
      slotB: n.slotB.seed,
      entryAId: n.slotA.entryId,
      entryBId: n.slotB.entryId,
      scoreA: n.scoreA,
      scoreB: n.scoreB,
      winnerEntryId: n.winnerId,
      status: n.status,
    });
  });
  return rounds;
}

export const ROUND_NAMES = [
  "Round of 128",
  "Round of 64",
  "Round of 32",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Final",
];
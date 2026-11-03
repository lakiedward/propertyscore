import type { Sql } from '../db/sql.ts';

export type NeighbourPair = { cell_id: string; neighbour_id: string };

export type SmoothingWeights = { cellWeight: number; neighbourWeight: number };

export function smoothScores(
  scores: ReadonlyMap<string, number | null>,
  pairs: readonly NeighbourPair[],
  weights: SmoothingWeights,
): Map<string, number | null> {
  const neighbours = new Map<string, string[]>();
  for (const pair of pairs) {
    const list = neighbours.get(pair.cell_id) ?? [];
    list.push(pair.neighbour_id);
    neighbours.set(pair.cell_id, list);
  }
  const smoothed = new Map<string, number | null>();
  for (const [cellId, score] of scores) {
    if (score === null) {
      smoothed.set(cellId, null);
      continue;
    }
    const around = (neighbours.get(cellId) ?? [])
      .map((id) => scores.get(id))
      .filter((value): value is number => typeof value === 'number');
    if (around.length === 0) {
      smoothed.set(cellId, score);
      continue;
    }
    const mean = around.reduce((sum, value) => sum + value, 0) / around.length;
    const total = weights.cellWeight + weights.neighbourWeight;
    smoothed.set(cellId, (weights.cellWeight * score + weights.neighbourWeight * mean) / total);
  }
  return smoothed;
}

export async function listNeighbourPairs(
  sql: Sql,
  snapshotId: string,
  cityId: string,
): Promise<NeighbourPair[]> {
  const rows = await sql<NeighbourPair[]>`
    select cell_id, neighbour_id from private.grid_cell_neighbours(${snapshotId}, ${cityId})
  `;
  return [...rows];
}

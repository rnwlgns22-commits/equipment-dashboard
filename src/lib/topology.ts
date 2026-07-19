import type { Equipment } from '../types';

export interface ConnectionPair {
  key: string; // "A|B" (정렬된 순서, 무방향 취급)
  a: string;
  b: string;
}

// Equipment.연결설비 배열에서 "지금 이 도면에 둘 다 배치된" 쌍만 파생시켜 그림.
// 별도 저장 안 함(설계.md §11.1) — 배치가 바뀌거나 연결설비가 바뀌면 다시 계산하면 그만.
export function computeConnections(equipments: Equipment[], placedIds: Set<string>): ConnectionPair[] {
  const pairs = new Map<string, ConnectionPair>();
  for (const eq of equipments) {
    if (!placedIds.has(eq.설비ID)) continue;
    for (const otherId of eq.연결설비) {
      if (!placedIds.has(otherId) || otherId === eq.설비ID) continue;
      const [a, b] = [eq.설비ID, otherId].sort();
      const key = `${a}|${b}`;
      if (!pairs.has(key)) pairs.set(key, { key, a, b });
    }
  }
  return [...pairs.values()];
}

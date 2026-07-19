import type { Equipment, FailureStat, Placement, Zone } from '../types';

export function pointInPolygon(
  point: { xPct: number; yPct: number },
  polygon: { xPct: number; yPct: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].xPct;
    const yi = polygon[i].yPct;
    const xj = polygon[j].xPct;
    const yj = polygon[j].yPct;
    const intersect =
      yi > point.yPct !== yj > point.yPct &&
      point.xPct < ((xj - xi) * (point.yPct - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface ZoneStats {
  설비수: number;
  가동률: number; // % — 상태가 "정상"인 설비 비율
  위험설비수: number; // 위험등급 상/중인 설비 수
  에러율: number; // % — 위험설비수 / 설비수
}

export function computeZoneStats(
  zone: Zone,
  placements: Placement[],
  equipmentsById: Map<string, Equipment>,
  statsById: Map<string, FailureStat>,
): ZoneStats {
  const inside = placements.filter((p) => pointInPolygon(p, zone.points));
  const eqs = inside
    .map((p) => equipmentsById.get(p.설비ID))
    .filter((e): e is Equipment => Boolean(e));
  const total = eqs.length;
  const normalCount = eqs.filter((e) => e.상태 === '정상').length;
  const riskyCount = eqs.filter((e) => {
    const s = statsById.get(e.설비ID);
    return s && s.위험등급 !== '하';
  }).length;
  return {
    설비수: total,
    가동률: total ? Math.round((normalCount / total) * 100) : 0,
    위험설비수: riskyCount,
    에러율: total ? Math.round((riskyCount / total) * 100) : 0,
  };
}

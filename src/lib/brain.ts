// _스크립트\failure_brain.py 포팅. 머신러닝 예측 아님 — 볼트/샘플 안에 있는 사실
// (계통 연결·제조사·설치연도·날짜 근접)만으로 "이 조합은 지켜볼 근거가 있다"를
// 설명하는 규칙기반 분석. 확정 진단이 아니라 참고 신호(원본 스크립트 주석 그대로).
import type { BrainSignal, Equipment, HistoryRecord } from '../types';

const CASCADE_WINDOW_DAYS = 30;
const CLUSTER_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / DAY_MS);
}

function repairDatesByEquip(histories: HistoryRecord[]): Map<string, Date[]> {
  const map = new Map<string, Date[]>();
  for (const h of histories) {
    if (h.유형 !== '수리' || !h.설비ID) continue;
    const d = new Date(h.날짜);
    if (Number.isNaN(d.getTime())) continue;
    const list = map.get(h.설비ID) ?? [];
    list.push(d);
    map.set(h.설비ID, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.getTime() - b.getTime());
  return map;
}

function analyzeCascade(equipments: Equipment[], fails: Map<string, Date[]>): BrainSignal[] {
  const byId = new Map(equipments.map((e) => [e.설비ID, e]));
  const seen = new Set<string>();
  const signals: { hits: number; signal: BrainSignal }[] = [];

  for (const eq of equipments) {
    for (const targetId of eq.연결설비) {
      if (!byId.has(targetId)) continue;
      const pairKey = [eq.설비ID, targetId].sort().join('|');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const aDates = fails.get(eq.설비ID) ?? [];
      const bDates = fails.get(targetId) ?? [];
      if (aDates.length === 0 || bDates.length === 0) continue;

      const hits: { a: Date; b: Date; delta: number }[] = [];
      for (const da of aDates) {
        for (const db of bDates) {
          const delta = daysBetween(da, db);
          if (delta <= CASCADE_WINDOW_DAYS) hits.push({ a: da, b: db, delta });
        }
      }
      if (hits.length === 0) continue;

      hits.sort((x, y) => x.a.getTime() - y.a.getTime());
      const bName = byId.get(targetId)?.설비명 ?? targetId;
      const example = hits[0];
      signals.push({
        hits: hits.length,
        signal: {
          종류: '연쇄고장',
          관련설비: [eq.설비ID, targetId],
          근거:
            `${eq.설비명} ↔ ${bName}: 계통상 직접 연결된 설비, ${CASCADE_WINDOW_DAYS}일 이내 근접 고장 ${hits.length}건 ` +
            `(예: ${example.a.toISOString().slice(0, 10)} / ${example.b.toISOString().slice(0, 10)}, 차이 ${example.delta}일)`,
        },
      });
    }
  }

  return signals.sort((a, b) => b.hits - a.hits).map((s) => s.signal);
}

function analyzeCohorts(equipments: Equipment[], fails: Map<string, Date[]>): BrainSignal[] {
  const groups = new Map<string, Equipment[]>();
  for (const eq of equipments) {
    if (!eq.제조사 || !eq.설치일) continue;
    const year = eq.설치일.slice(0, 4);
    const key = `${eq.제조사}|${year}|${eq.분류}`;
    const list = groups.get(key) ?? [];
    list.push(eq);
    groups.set(key, list);
  }

  const signals: { size: number; signal: BrainSignal }[] = [];
  for (const [key, members] of groups) {
    if (members.length < 2) continue;
    const recentFailed = members.filter((m) => (fails.get(m.설비ID)?.length ?? 0) > 0);
    if (recentFailed.length === 0) continue;
    const [maker, year, category] = key.split('|');
    signals.push({
      size: members.length,
      signal: {
        종류: '설치코호트',
        관련설비: members.map((m) => m.설비ID),
        근거:
          `${maker} · ${year}년 설치 · ${category} (${members.length}개) — ` +
          `고장이력 있는 것: ${recentFailed.map((m) => m.설비명).join(', ')}`,
      },
    });
  }
  return signals.sort((a, b) => b.size - a.size).map((s) => s.signal);
}

function analyzeClusters(equipments: Equipment[], fails: Map<string, Date[]>): BrainSignal[] {
  const nameById = new Map(equipments.map((e) => [e.설비ID, e.설비명]));
  const events: { date: Date; id: string }[] = [];
  for (const [id, dates] of fails) {
    for (const d of dates) events.push({ date: d, id });
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  const signals: BrainSignal[] = [];
  let i = 0;
  while (i < events.length) {
    let j = i;
    while (j + 1 < events.length && daysBetween(events[i].date, events[j + 1].date) <= CLUSTER_WINDOW_DAYS) {
      j += 1;
    }
    const clusterEvents = events.slice(i, j + 1);
    const distinctIds = [...new Set(clusterEvents.map((e) => e.id))].sort();
    if (distinctIds.length >= 2) {
      const start = clusterEvents[0].date;
      const end = clusterEvents[clusterEvents.length - 1].date;
      signals.push({
        종류: '동시다발',
        관련설비: distinctIds,
        근거:
          `${start.toISOString().slice(0, 10)} ~ ${end.toISOString().slice(0, 10)}: ` +
          `${distinctIds.map((id) => nameById.get(id) ?? id).join(', ')} — 계통 무관 동시다발, ` +
          `정전·침수 등 공통원인 의심`,
      });
    }
    i = j + 1;
  }
  return signals;
}

export function computeBrainSignals(equipments: Equipment[], histories: HistoryRecord[]): BrainSignal[] {
  const fails = repairDatesByEquip(histories);
  return [
    ...analyzeCascade(equipments, fails),
    ...analyzeCohorts(equipments, fails),
    ...analyzeClusters(equipments, fails),
  ];
}

// 통합검색(2026-07-27 추가, 설계 문서 _웹서비스설계/할일.md) — 설비/이력/자재 각
// 화면에서 따로만 검색되던 걸 한 번에 가로질러 찾을 수 있게 함. UI 없이 순수 매칭
// 로직만 분리해서 GlobalSearch.tsx가 그대로 쓴다(다른 lib/*.ts 모듈과 같은 패턴).
import type { Equipment, HistoryRecord, Part } from '../types';

export type SearchKind = '설비' | '이력' | '자재';

export interface SearchHit {
  kind: SearchKind;
  key: string;
  title: string;
  subtitle: string;
  to: string;
  // 이력·자재는 상세 페이지가 없어서 목록 화면으로 이동한 뒤 그 화면의 검색창에
  // 이 값을 채워 넣어 바로 찾아준다(설비는 상세 페이지가 있어서 필요 없음).
  presetQuery?: string;
}

const MAX_PER_GROUP = 6;

function norm(s: string): string {
  return s.toLowerCase();
}

function matches(q: string, values: (string | undefined)[]): boolean {
  return values.some((v) => v !== undefined && v !== '' && norm(v).includes(q));
}

export function unifiedSearch(
  query: string,
  equipments: Equipment[],
  histories: HistoryRecord[],
  parts: Part[],
): SearchHit[] {
  const q = norm(query.trim());
  if (!q) return [];

  const equipmentsById = new Map(equipments.map((e) => [e.설비ID, e]));

  const equipmentHits: SearchHit[] = equipments
    .filter((e) =>
      matches(q, [e.설비명, e.설비ID, e.위치, e.제조사, e.모델명, e.사이트, ...Object.values(e.상세사양)]),
    )
    .slice(0, MAX_PER_GROUP)
    .map((e) => ({
      kind: '설비',
      key: `eq-${e.설비ID}`,
      title: e.설비명,
      subtitle: [e.설비ID, e.분류, e.위치].filter(Boolean).join(' · '),
      to: `/equipment/${e.설비ID}`,
    }));

  const historyHits: SearchHit[] = histories
    .filter((h) => {
      const eqName = h.설비ID ? equipmentsById.get(h.설비ID)?.설비명 : undefined;
      return matches(q, [h.제목, h.내용, h.출처파일, eqName]);
    })
    .slice(0, MAX_PER_GROUP)
    .map((h) => {
      const eqName = h.설비ID ? equipmentsById.get(h.설비ID)?.설비명 : undefined;
      return {
        kind: '이력',
        key: `hist-${h.id}`,
        title: h.제목,
        subtitle: [h.날짜, h.유형, eqName ?? '설비 미지정'].filter(Boolean).join(' · '),
        to: '/history',
        presetQuery: h.제목,
      };
    });

  const partHits: SearchHit[] = parts
    .filter((p) => matches(q, [p.자재명, p.규격, p.보관위치, p.비고]))
    .slice(0, MAX_PER_GROUP)
    .map((p) => ({
      kind: '자재',
      key: `part-${p.id}`,
      title: p.자재명,
      subtitle: [`${p.현재수량}${p.단위}`, p.보관위치].filter(Boolean).join(' · '),
      to: '/inventory',
      presetQuery: p.자재명,
    }));

  return [...equipmentHits, ...historyHits, ...partHits];
}

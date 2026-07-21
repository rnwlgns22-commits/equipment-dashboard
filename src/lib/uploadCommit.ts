// buildRecordsFromCandidates만 따로 뺀 파일. uploadPipeline.ts는 xlsx/pdfjs/mammoth를
// 물고 있는 convert.ts를 끌고 오는데, Landing.tsx는 늦게 로드되는 페이지가 아니라서
// (App.tsx에서 lazy 안 하고 즉시 import) 거기서 uploadPipeline.ts를 값으로 import하면
// 그 무거운 파싱 라이브러리들이 초기 번들에 다시 섞여 들어간다(index 청크가 483KB→1.74MB로
// 튄 걸 빌드에서 발견, 2026-07-20). 이 함수는 nextEquipmentId만 있으면 되므로 분리.
import type { Equipment, HistoryRecord } from '../types';
import type { EquipmentCandidate, HistoryCandidate } from './uploadPipeline';
import { nextEquipmentId } from './equipmentId';

export function buildRecordsFromCandidates(
  equipmentCandidates: EquipmentCandidate[],
  historyCandidates: HistoryCandidate[],
  existingEquipments: Equipment[],
): { newEquipments: Equipment[]; newHistories: HistoryRecord[] } {
  const runningEquipments = [...existingEquipments];
  const keyToId = new Map<string, string>();
  const newEquipments: Equipment[] = [];

  for (const c of equipmentCandidates) {
    const id = nextEquipmentId(c.category, runningEquipments);
    const equipment: Equipment = {
      설비ID: id,
      설비명: c.name,
      분류: c.category,
      사이트: c.site,
      상태: '정상',
      연결설비: [],
      상세사양: { 자동인식: '업로드 파일에서 자동 추출됨 — 필요하면 상세 페이지에서 보완하세요' },
      출처파일: c.relativePath,
    };
    newEquipments.push(equipment);
    runningEquipments.push(equipment);
    keyToId.set(c.key, id);
  }

  const newHistories: HistoryRecord[] = historyCandidates.map((h, i) => {
    let 설비ID: string | undefined;
    if (h.equipmentRef.startsWith('cand:')) {
      설비ID = keyToId.get(h.equipmentRef.slice(5));
    } else if (h.equipmentRef) {
      설비ID = h.equipmentRef;
    }
    return {
      id: `up-h-${Date.now()}-${i}`,
      날짜: h.date,
      설비ID,
      유형: h.type,
      제목: h.title,
      비용: h.비용,
      출처파일: h.relativePath,
    };
  });

  return { newEquipments, newHistories };
}

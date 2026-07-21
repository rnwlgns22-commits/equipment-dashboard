import type { Category, Equipment } from '../types';
import type { DroppedFile } from './readDroppedFiles';
import { convertFile, CONVERTIBLE_EXTS } from './convert';
import { classifyCategory, guessHistoryType, looksLikeLedger, maxDate } from './classify';

export interface EquipmentCandidate {
  key: string;
  fileName: string;
  relativePath: string;
  site: string;
  category: Category;
  name: string;
  content: string;
}

export interface HistoryCandidate {
  key: string;
  fileName: string;
  relativePath: string;
  date: string;
  type: '점검' | '수리';
  title: string;
  equipmentRef: string; // '' | 기존 설비ID | `cand:${equipmentCandidateKey}`
  content: string;
}

export interface FailedCandidate {
  key: string;
  fileName: string;
  relativePath: string;
  reason: string;
}

export interface PipelineResult {
  equipmentCandidates: EquipmentCandidate[];
  historyCandidates: HistoryCandidate[];
  failed: FailedCandidate[];
}

// 부서 지명 하드코딩 금지(설계.md §4.3) — 사이트는 드롭한 폴더의 최상위 하위폴더명에서
// 그때그때 뽑는다. 파일이 루트에 바로 있으면 사이트 없음.
function siteFromPath(relativePath: string): string {
  const parts = relativePath.split('/');
  return parts.length > 1 ? parts[0] : '';
}

export async function runUploadPipeline(
  files: DroppedFile[],
  existingEquipments: Equipment[],
  onProgress?: (done: number, total: number) => void,
): Promise<PipelineResult> {
  const equipmentCandidates: EquipmentCandidate[] = [];
  const historyCandidates: HistoryCandidate[] = [];
  const failed: FailedCandidate[] = [];

  const targets = files.filter((f) => CONVERTIBLE_EXTS.has(f.file.name.toLowerCase().split('.').pop() ?? ''));

  let seq = 0;
  let done = 0;
  for (const { file, relativePath } of targets) {
    seq += 1;
    const key = `up-${seq}`;
    const { content, error } = await convertFile(file);
    done += 1;
    onProgress?.(done, targets.length);

    if (error || content.trim().length < 5) {
      failed.push({ key, fileName: file.name, relativePath, reason: error || '내용 없음' });
      continue;
    }

    const stem = file.name.replace(/\.[^.]+$/, '');
    const site = siteFromPath(relativePath);

    // 순서가 중요함(2026-07-21 수정) — 예전엔 looksLikeLedger()가 "분류만 되면
    // (기타가 아니면) 설비대장"으로 봐서, 여러 설비를 한 표에 늘어놓은 월간 현황
    // 요약 문서(예: 승강기 14대 상태를 십자표로 정리한 xlsx)까지 전부 "설비 1개"로
    // 뭉개버리고 이력은 아예 만들지도 않았음(실제 업로드 실패 사례로 발견). 명시적
    // 설비대장 신호(제작회사/설치장소)가 없다면 날짜 존재 여부를 먼저 봐서 이력으로
    // 처리하고, 그것도 없을 때만 기존 분류-fallback으로 설비대장 취급 — 어느 것도
    // 아니면 가짜 설비를 만드는 대신 실패로 남긴다.
    const hasExplicitLedgerMarkers = content.includes('제작회사') || content.includes('설치장소');
    if (hasExplicitLedgerMarkers) {
      equipmentCandidates.push({ key, fileName: file.name, relativePath, site, category: classifyCategory(stem, content), name: stem, content });
      continue;
    }

    const date = maxDate(content);
    if (date) {
      historyCandidates.push({
        key,
        fileName: file.name,
        relativePath,
        date: date.toISOString().slice(0, 10),
        type: guessHistoryType(content),
        title: stem,
        equipmentRef: '',
        content,
      });
      continue;
    }

    if (looksLikeLedger(stem, content)) {
      equipmentCandidates.push({ key, fileName: file.name, relativePath, site, category: classifyCategory(stem, content), name: stem, content });
      continue;
    }

    failed.push({ key, fileName: file.name, relativePath, reason: '설비/이력 패턴을 찾지 못함(무관 문서)' });
  }

  // 이력 후보 ↔ 설비 자동 매칭: 제목/파일명에 기존 또는 새로 인식된 설비명이 그대로
  // 들어있으면 미리 채워줌(사용자가 검토 화면에서 그대로 두거나 바꿀 수 있음).
  const namePool: { ref: string; name: string }[] = [
    ...existingEquipments.map((e) => ({ ref: e.설비ID, name: e.설비명 })),
    ...equipmentCandidates.map((c) => ({ ref: `cand:${c.key}`, name: c.name })),
  ];
  for (const h of historyCandidates) {
    const hit = namePool.find((p) => h.title.includes(p.name) || h.fileName.includes(p.name));
    if (hit) h.equipmentRef = hit.ref;
  }

  return { equipmentCandidates, historyCandidates, failed };
}

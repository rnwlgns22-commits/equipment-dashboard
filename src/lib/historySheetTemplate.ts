// 점검·수리 이력용 양식(셀 매핑) — src/lib/sheetTemplate.ts(설비용)와 같은 개념이지만
// 대상 스키마(HistoryRecord)가 달라서 필드셋이 다름. 셀 읽기·다중셀 파싱·날짜 정규화
// 로직은 그대로 재사용(cellValue/parseCellList/normalizeDateCell).
import type * as XLSX from 'xlsx';
import type { HistoryType } from '../types';
import { cellValue, fieldRefAt, normalizeDateCell, parseCellList } from './sheetTemplate';

export interface HistoryTemplateCells {
  날짜?: string;
  유형?: string;
  설비명?: string; // 기존 설비명과 정확히 같으면(공백 제외) 자동으로 그 설비에 연결
  제목?: string;
  내용?: string;
  비용?: string;
}

export interface HistoryTemplate {
  id: string;
  name: string;
  createdAt: string;
  cells: HistoryTemplateCells;
}

export interface HistoryTemplateApplyResult {
  title: string;
  date: string;
  type: HistoryType;
  content?: string;
  cost?: number;
  equipmentName?: string;
}

// 필드마다 셀 개수가 다를 수 있음 — 하나만 적으면 전체 이력에 통일 적용, 여러 개면
// 같은 순번끼리 짝짓는다(sheetTemplate.ts의 fieldRefAt과 같은 규칙 — 설비 양식과
// 이력 양식이 다른 결과를 내면 헷갈리므로 동일하게 맞춤, 2026-07-26).
// 전체 이력 개수는 모든 필드 중 가장 긴 셀 목록 기준. 제목이나 날짜가 빈 순번은
// 만들지 않는다 — 둘 다 HistoryRecord 필수값.
export function applyHistoryTemplateToSheet(
  sheet: XLSX.WorkSheet,
  template: HistoryTemplate,
): HistoryTemplateApplyResult[] {
  const allRefLists = [
    template.cells.제목,
    template.cells.날짜,
    template.cells.유형,
    template.cells.내용,
    template.cells.비용,
    template.cells.설비명,
  ].map(parseCellList);
  const count = Math.max(1, ...allRefLists.map((l) => l.length));

  const get = (raw: string | undefined, i: number) => cellValue(sheet, fieldRefAt(raw, i));

  const results: HistoryTemplateApplyResult[] = [];

  for (let i = 0; i < count; i += 1) {
    const title = get(template.cells.제목, i);
    const dateRaw = get(template.cells.날짜, i);
    const date = dateRaw ? normalizeDateCell(dateRaw) : '';
    if (!title || !date) continue;

    const typeRaw = get(template.cells.유형, i);
    const type: HistoryType = typeRaw === '수리' ? '수리' : '점검';
    const content = get(template.cells.내용, i) || undefined;
    const costRaw = get(template.cells.비용, i).replace(/[^0-9.-]/g, '');
    const cost = costRaw ? Number(costRaw) : undefined;
    const equipmentName = get(template.cells.설비명, i) || undefined;

    results.push({
      title,
      date,
      type,
      content,
      cost: cost !== undefined && !Number.isNaN(cost) ? cost : undefined,
      equipmentName,
    });
  }

  return results;
}

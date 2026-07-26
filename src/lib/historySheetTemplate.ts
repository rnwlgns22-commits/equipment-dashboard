// 점검·수리 이력용 양식(셀 매핑) — src/lib/sheetTemplate.ts(설비용)와 같은 개념이지만
// 대상 스키마(HistoryRecord)가 달라서 필드셋이 다름. 셀 읽기·다중셀 파싱·날짜 정규화
// 로직은 그대로 재사용(cellValue/parseCellList/normalizeDateCell).
import type * as XLSX from 'xlsx';
import type { HistoryType } from '../types';
import { cellValue, normalizeDateCell, parseCellList } from './sheetTemplate';

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

// 제목 칸의 셀 개수만큼 이력을 만든다(설비용 applyTemplateToSheet의 설비명과 같은 역할).
// 제목이나 날짜가 비어있는 순번은 만들지 않는다 — 둘 다 HistoryRecord 필수값.
export function applyHistoryTemplateToSheet(
  sheet: XLSX.WorkSheet,
  template: HistoryTemplate,
): HistoryTemplateApplyResult[] {
  const titleRefs = parseCellList(template.cells.제목);
  const count = Math.max(titleRefs.length, 1);

  const at = (raw: string | undefined, i: number): string | undefined => parseCellList(raw)[i];
  const get = (raw: string | undefined, i: number) => cellValue(sheet, at(raw, i));

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

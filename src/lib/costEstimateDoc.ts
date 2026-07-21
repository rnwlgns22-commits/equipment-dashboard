// 산출기초조사서(공공기관 표준 견적/원가계산 서식) 인식·추출.
// 다운로드된 실제 문서("1. 산출기초조사서.xlsx")의 행 구조를 기준으로 작성 —
// 품명/규격/단위/수량 칸과, 그 아래 서브헤더 행의 단가/금액 칸으로 구성되고
// (업체 견적 비교 칸 수는 문서마다 다를 수 있어 고정 인덱스 대신 헤더 텍스트로
// 열을 찾는다), 하단에 계/부가세/합계, 상단에 "금X원 (한글금액)" 총액 표기가
// 항상 있는 관행을 이용한다.
import { maxDate } from './classify';

export interface CostEstimateItem {
  품명: string;
  단위?: string;
  수량?: number;
  금액?: number;
}

export interface ParsedCostEstimate {
  총액?: number;
  날짜?: string;
  항목: CostEstimateItem[];
}

function norm(s: string): string {
  return s.replace(/\s+/g, '');
}

export function looksLikeCostEstimateDoc(fileName: string, rows: string[][]): boolean {
  if (norm(fileName).includes('산출기초조사서')) return true;
  const firstRow = norm((rows[0] ?? []).join(''));
  return firstRow.includes('산출기초조사서');
}

// "1. 인건비" 같은 섹션 구분행 — 품명 칸 텍스트만 있고 나머지 칸은 전부 빔.
const SECTION_HEADER_RE = /^\d+\.\s*\S+$/;
const SUMMARY_LABELS = new Set(['계', '부가세', '합계']);
const COST_LABEL_SUFFIX_RE = /\s*(인건비|자재비|재료비)\s*$/;

function parseAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/,/g, '').trim();
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function findHeaderCol(row: string[] | undefined, label: string): number {
  if (!row) return -1;
  return row.findIndex((c) => norm(c) === label);
}

export function stripCostLabel(name: string): string {
  return name.replace(COST_LABEL_SUFFIX_RE, '').trim();
}

export function summarizeItems(항목: CostEstimateItem[]): string {
  const names = Array.from(new Set(항목.map((i) => stripCostLabel(i.품명)).filter(Boolean)));
  return names.join(' · ');
}

export function parseCostEstimateDoc(rows: string[][]): ParsedCostEstimate {
  // 총액: 상단 "금X원 (한글금액)" 표기를 최우선으로 씀 — "합계" 행의 금액이 어느
  // 칸에 있는지는 문서마다 흔들리지만(실제 샘플에서도 계/부가세는 금액 칸, 합계는
  // 그보다 한 칸 왼쪽에 있었음) 상단 총액 표기는 항상 같은 형식이라 더 안정적.
  const wholeText = rows.map((r) => r.join(' ')).join('\n');
  let 총액 = parseAmount(/금\s*([\d,]+)\s*원/.exec(wholeText)?.[1] ?? '');

  let headerRowIdx = -1;
  for (let i = 0; i < rows.length; i += 1) {
    if (findHeaderCol(rows[i], '품명') >= 0) {
      headerRowIdx = i;
      break;
    }
  }
  const headerRow = headerRowIdx >= 0 ? rows[headerRowIdx] : undefined;
  const nameCol = headerRow ? Math.max(findHeaderCol(headerRow, '품명'), 0) : 0;
  const unitCol = headerRow ? findHeaderCol(headerRow, '단위') : -1;
  const qtyCol = headerRow ? findHeaderCol(headerRow, '수량') : -1;
  const subHeaderRow = headerRowIdx >= 0 ? rows[headerRowIdx + 1] : undefined;
  const amountCol = findHeaderCol(subHeaderRow, '금액') >= 0 ? findHeaderCol(subHeaderRow, '금액') : findHeaderCol(headerRow, '금액');

  if (총액 === undefined) {
    const totalRow = rows.find((r) => norm(r[0] ?? '') === '합계');
    if (totalRow) {
      for (let i = totalRow.length - 1; i >= 0; i -= 1) {
        const v = parseAmount(totalRow[i] ?? '');
        if (v !== undefined && v > 0) {
          총액 = v;
          break;
        }
      }
    }
  }

  const 항목: CostEstimateItem[] = [];
  const dataStart = headerRowIdx >= 0 ? headerRowIdx + 2 : 0;
  for (let i = dataStart; i < rows.length; i += 1) {
    const row = rows[i];
    const name = (row[nameCol] ?? '').trim();
    if (!name) continue;
    if (SUMMARY_LABELS.has(norm(name))) break; // 항목 구역이 끝나고 계/부가세/합계 도달
    if (SECTION_HEADER_RE.test(name) && row.slice(1).every((c) => !c.trim())) continue; // "1. 인건비" 등 구분행

    const 단위 = unitCol >= 0 ? (row[unitCol] ?? '').trim() || undefined : undefined;
    const qtyRaw = qtyCol >= 0 ? (row[qtyCol] ?? '').trim() : '';
    const qty = qtyRaw ? Number(qtyRaw.replace(/,/g, '')) : undefined;
    const 금액 = amountCol >= 0 ? parseAmount(row[amountCol] ?? '') : undefined;
    항목.push({ 품명: name, 단위, 수량: qty !== undefined && Number.isFinite(qty) ? qty : undefined, 금액 });
  }

  let 날짜: string | undefined;
  for (const row of rows) {
    const d = maxDate(row.join(' '));
    if (!d) continue;
    const iso = d.toISOString().slice(0, 10);
    if (!날짜 || iso > 날짜) 날짜 = iso;
  }

  return { 총액, 날짜, 항목 };
}

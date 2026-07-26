// 양식(엑셀) 등록 기능 — 같은 서식의 파일이 반복 업로드될 때, 셀 위치(A6 등)만 한 번
// 등록해두면 그 다음부턴 내용 파싱(문서분류·날짜추정) 없이 지정한 셀 값을 그대로 필드에
// 꽂아넣는다. LLM/재학습 없이 로컬(zustand+IndexedDB, templateStore.ts)에만 저장.
import * as XLSX from 'xlsx';
import type { Category, Equipment, EquipmentStatus } from '../types';

const CATEGORIES: Category[] = ['공조', '냉난방', '급배수', '전기', '소방', '승강기', '통신', '기타'];
const STATUSES: EquipmentStatus[] = ['정상', '수리중', '정지', '폐기'];

export interface SheetTemplateCells {
  설비명?: string;
  분류?: string;
  사이트?: string;
  위치?: string;
  제조사?: string;
  모델명?: string;
  설치일?: string;
  상태?: string;
  최근점검일?: string;
  점검주기일?: string;
}

export const TEMPLATE_FIELD_KEYS: (keyof SheetTemplateCells)[] = [
  '설비명',
  '분류',
  '사이트',
  '위치',
  '제조사',
  '모델명',
  '설치일',
  '상태',
  '최근점검일',
  '점검주기일',
];

export interface SheetTemplateCustomField {
  label: string; // 상세사양 키(예: "가격")
  cell: string;
}

export interface SheetTemplate {
  id: string;
  name: string;
  createdAt: string;
  cells: SheetTemplateCells;
  customFields: SheetTemplateCustomField[];
}

// 셀 참조("A6")가 잘못 입력되거나 비어있어도 전체 적용이 죽으면 안 되므로 항상 빈
// 문자열로 안전하게 폴백. 워크시트 원본에서 A1 주소로 직접 찾는다(convert.ts의
// readXlsxSheet 참고 — sheet_to_json 기반 배열은 빈 앞행이 있으면 주소가 어긋남).
export function cellValue(sheet: XLSX.WorkSheet, ref: string | undefined): string {
  if (!ref || !ref.trim()) return '';
  const cell = sheet[ref.trim().toUpperCase()];
  const v = cell?.v;
  return v === undefined || v === null ? '' : String(v).trim();
}

// 한 서식 안에 설비가 여러 개 있으면("A7,A8") 필드 하나에 셀을 여러 개 적을 수 있게 함 —
// 쉼표/공백 아무거나로 구분. 순서대로 다른 설비에 매칭(2026-07-26, 여러 설비가 한 시트에
// 있는 서식 요청으로 추가).
export function parseCellList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

// 엑셀은 날짜 셀을 raw:true로 읽으면 표시서식이 아니라 일련번호(1900년 기준 경과일수)로
// 온다 — readXlsxRowsRaw가 정확히 이 옵션을 쓰기 때문에(금액 파싱 때문에 원본 숫자값이
// 필요해서, convert.ts 참고) 날짜로 매핑한 셀도 같은 값이 들어올 수 있어 여기서 변환.
const EXCEL_EPOCH_OFFSET_DAYS = 25569; // 1900-01-01(엑셀) → 1970-01-01(유닉스) 사이 일수
export function normalizeDateCell(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = Number(trimmed);
    if (serial > 20000 && serial < 60000) {
      const ms = Math.round((serial - EXCEL_EPOCH_OFFSET_DAYS) * 86400 * 1000);
      return new Date(ms).toISOString().slice(0, 10);
    }
  }
  const normalized = trimmed.replace(/[./]/g, '-');
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
    const [y, m, d] = normalized.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return trimmed;
}

export interface TemplateApplyResult {
  name: string;
  category: Category;
  site: string;
  extraFields: Partial<Equipment>;
  상세사양: Record<string, string>;
  filledCount: number;
}

// 설비명 칸의 셀 개수만큼 설비를 만든다(하나만 적었으면 기존과 동일하게 1개) — 나머지
// 필드도 같은 순번의 셀을 짝지어 쓰고, 그 순번에 셀이 없으면 그 설비만 그 필드가 빈다.
// 설비명이 아예 안 채워진(빈 문자열) 순번은 가짜 설비를 만들지 않고 건너뛴다.
export function applyTemplateToSheet(sheet: XLSX.WorkSheet, template: SheetTemplate): TemplateApplyResult[] {
  const nameRefs = parseCellList(template.cells.설비명);
  const count = Math.max(nameRefs.length, 1);

  const at = (raw: string | undefined, i: number): string | undefined => parseCellList(raw)[i];
  const get = (raw: string | undefined, i: number) => cellValue(sheet, at(raw, i));

  const results: TemplateApplyResult[] = [];

  for (let i = 0; i < count; i += 1) {
    const name = get(template.cells.설비명, i);
    if (!name) continue;

    const categoryRaw = get(template.cells.분류, i);
    const site = get(template.cells.사이트, i);
    const 위치 = get(template.cells.위치, i);
    const 제조사 = get(template.cells.제조사, i);
    const 모델명 = get(template.cells.모델명, i);
    const 설치일raw = get(template.cells.설치일, i);
    const 상태raw = get(template.cells.상태, i);
    const 최근점검일raw = get(template.cells.최근점검일, i);
    const 점검주기일raw = get(template.cells.점검주기일, i);

    const category = (CATEGORIES as string[]).includes(categoryRaw) ? (categoryRaw as Category) : '기타';

    const extraFields: Partial<Equipment> = {};
    if (위치) extraFields.위치 = 위치;
    if (제조사) extraFields.제조사 = 제조사;
    if (모델명) extraFields.모델명 = 모델명;
    if (설치일raw) extraFields.설치일 = normalizeDateCell(설치일raw);
    if ((STATUSES as string[]).includes(상태raw)) extraFields.상태 = 상태raw as EquipmentStatus;
    if (최근점검일raw) extraFields.최근점검일 = normalizeDateCell(최근점검일raw);
    if (점검주기일raw) {
      const n = Number(점검주기일raw);
      if (!Number.isNaN(n)) extraFields.점검주기일 = n;
    }

    const 상세사양: Record<string, string> = {};
    for (const cf of template.customFields) {
      const v = get(cf.cell, i);
      if (cf.label.trim() && v) 상세사양[cf.label.trim()] = v;
    }

    const mappedValues = [name, categoryRaw, site, 위치, 제조사, 모델명, 설치일raw, 상태raw, 최근점검일raw, 점검주기일raw];
    const filledCount = mappedValues.filter(Boolean).length + Object.keys(상세사양).length;

    results.push({ name, category, site, extraFields, 상세사양, filledCount });
  }

  return results;
}

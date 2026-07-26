import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { applyTemplateToSheet, cellValue, normalizeDateCell, type SheetTemplate } from './sheetTemplate';

function template(overrides: Partial<SheetTemplate> = {}): SheetTemplate {
  return {
    id: 'tpl-1',
    name: '테스트 양식',
    createdAt: '2026-01-01T00:00:00.000Z',
    cells: {},
    customFields: [],
    ...overrides,
  };
}

// 실제 업로드 서식처럼 위쪽 몇 행이 완전히 비어있는 경우를 재현 — sheet_to_json 기반
// 배열(readXlsxRowsRaw)은 이런 시트를 압축해서 반환해 A1 주소가 어긋나므로(2026-07-26
// 발견), 반드시 워크시트 원본으로 직접 주소를 찾아야 한다는 걸 이 테스트로 고정.
function sheetWithLeadingBlankRows() {
  const data: unknown[][] = [];
  data[5] = ['공조기 4호기'];
  data[5][2] = '전기';
  data[9] = [];
  data[9][1] = '삼성전자';
  data[10] = [];
  data[10][0] = 1500000;
  return XLSX.utils.aoa_to_sheet(data);
}

describe('cellValue', () => {
  const sheet = sheetWithLeadingBlankRows();

  it('A1 표기로 셀 값을 읽는다 — 앞쪽에 완전히 빈 행이 있어도 실제 주소를 그대로 찾는다', () => {
    expect(cellValue(sheet, 'A6')).toBe('공조기 4호기');
    expect(cellValue(sheet, 'C6')).toBe('전기');
    expect(cellValue(sheet, 'B10')).toBe('삼성전자');
  });

  it('빈 참조나 범위 밖 셀은 빈 문자열', () => {
    expect(cellValue(sheet, undefined)).toBe('');
    expect(cellValue(sheet, '')).toBe('');
    expect(cellValue(sheet, 'Z99')).toBe('');
  });

  it('데이터가 없는(완전히 빈) 행의 셀도 빈 문자열', () => {
    expect(cellValue(sheet, 'A1')).toBe('');
  });
});

describe('normalizeDateCell', () => {
  it('엑셀 날짜 일련번호를 YYYY-MM-DD로 변환한다', () => {
    // 45853 = 2025-07-15 (엑셀 1900 기준)
    expect(normalizeDateCell('45853')).toBe('2025-07-15');
  });

  it('점·슬래시 구분 날짜를 하이픈 형식으로 정규화한다', () => {
    expect(normalizeDateCell('2026.7.1')).toBe('2026-07-01');
    expect(normalizeDateCell('2026/07/01')).toBe('2026-07-01');
  });

  it('이미 정규화된 값은 그대로 둔다', () => {
    expect(normalizeDateCell('2026-07-01')).toBe('2026-07-01');
  });

  it('날짜로 인식 못하는 값은 원문 그대로 반환한다', () => {
    expect(normalizeDateCell('점검완료')).toBe('점검완료');
  });
});

describe('applyTemplateToSheet', () => {
  const sheet = sheetWithLeadingBlankRows();

  it('매핑된 셀 값으로 설비 필드를 채운다(설비 1개, 배열 길이 1)', () => {
    const t = template({ cells: { 설비명: 'A6', 분류: 'C6', 제조사: 'B10' } });
    const result = applyTemplateToSheet(sheet, t);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('공조기 4호기');
    expect(result[0].category).toBe('전기');
    expect(result[0].extraFields.제조사).toBe('삼성전자');
  });

  it('분류 값이 정해진 카테고리가 아니면 기타로 폴백한다', () => {
    const t = template({ cells: { 설비명: 'A6', 분류: 'B10' } }); // B10 = 삼성전자(카테고리 아님)
    const result = applyTemplateToSheet(sheet, t);
    expect(result[0].category).toBe('기타');
  });

  it('커스텀 필드는 상세사양으로 들어간다', () => {
    const t = template({ cells: { 설비명: 'A6' }, customFields: [{ label: '가격', cell: 'A11' }] });
    const result = applyTemplateToSheet(sheet, t);
    expect(result[0].상세사양).toEqual({ 가격: '1500000' });
  });

  it('라벨이 비었거나 값이 없는 커스텀 필드는 상세사양에서 빠진다', () => {
    const t = template({
      cells: { 설비명: 'A6' },
      customFields: [
        { label: '', cell: 'A11' },
        { label: '용량', cell: 'Z99' },
      ],
    });
    const result = applyTemplateToSheet(sheet, t);
    expect(result[0].상세사양).toEqual({});
  });

  it('매핑 안 된 필드는 extraFields에 아예 없다(undefined로 덮어쓰지 않음)', () => {
    const t = template({ cells: { 설비명: 'A6' } });
    const result = applyTemplateToSheet(sheet, t);
    expect('제조사' in result[0].extraFields).toBe(false);
    expect('설치일' in result[0].extraFields).toBe(false);
  });

  it('설비명 칸이 비어있으면 빈 배열(가짜 설비를 만들지 않음)', () => {
    const t = template({ cells: { 설비명: 'Z99' } });
    expect(applyTemplateToSheet(sheet, t)).toEqual([]);
  });

  describe('한 서식에 설비가 여러 개(쉼표로 여러 셀)', () => {
    function sheetWithTwoEquipments() {
      const data: unknown[][] = [];
      data[6] = ['공조기 4호기'];
      data[6][2] = '전기';
      data[7] = ['공조기 5호기'];
      data[7][2] = '소방';
      return XLSX.utils.aoa_to_sheet(data);
    }
    const twoEquipSheet = sheetWithTwoEquipments();

    it('설비명에 셀을 쉼표로 여러 개 적으면 그 수만큼 설비를 만든다(순서대로 다른 필드와 짝지음)', () => {
      const t = template({ cells: { 설비명: 'A7,A8', 분류: 'C7,C8' } });
      const result = applyTemplateToSheet(twoEquipSheet, t);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('공조기 4호기');
      expect(result[0].category).toBe('전기');
      expect(result[1].name).toBe('공조기 5호기');
      expect(result[1].category).toBe('소방');
    });

    it('공백으로 구분해도 동일하게 동작한다', () => {
      const t = template({ cells: { 설비명: 'A7 A8' } });
      const result = applyTemplateToSheet(twoEquipSheet, t);
      expect(result.map((r) => r.name)).toEqual(['공조기 4호기', '공조기 5호기']);
    });

    it('목록 중 이름이 비어있는 순번은 건너뛰고 나머지만 만든다', () => {
      const t = template({ cells: { 설비명: 'A7,A9' } }); // A9는 빈 셀
      const result = applyTemplateToSheet(twoEquipSheet, t);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('공조기 4호기');
    });

    it('분류를 하나만 매핑했으면 설비가 여러 개여도 그 값으로 통일 적용한다', () => {
      const t = template({ cells: { 설비명: 'A7,A8', 분류: 'C7' } }); // 분류는 하나만(C7=전기)
      const result = applyTemplateToSheet(twoEquipSheet, t);
      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('전기');
      expect(result[1].category).toBe('전기'); // 둘 다 C7 값으로 통일
    });

    it('설비명은 하나뿐인데 다른 필드가 더 많으면, 그 필드 개수만큼 설비를 만들고 설비명은 통일 적용한다', () => {
      const t = template({ cells: { 설비명: 'A7', 분류: 'C7,C8' } }); // 설비명 1개, 분류 2개
      const result = applyTemplateToSheet(twoEquipSheet, t);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('공조기 4호기');
      expect(result[1].name).toBe('공조기 4호기'); // 통일 적용
      expect(result[0].category).toBe('전기');
      expect(result[1].category).toBe('소방');
    });
  });
});

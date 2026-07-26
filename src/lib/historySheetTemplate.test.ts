import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { applyHistoryTemplateToSheet, type HistoryTemplate } from './historySheetTemplate';

function template(overrides: Partial<HistoryTemplate> = {}): HistoryTemplate {
  return {
    id: 'htpl-1',
    name: '테스트 이력 양식',
    createdAt: '2026-01-01T00:00:00.000Z',
    cells: {},
    ...overrides,
  };
}

// 실제 점검표처럼 앞쪽 몇 행이 완전히 비어있는 시트 — sheetTemplate.ts와 같은 이유로
// 워크시트 원본에서 직접 주소를 찾아야 함(readXlsxSheet 기반).
function sheetWithLeadingBlankRows() {
  const data: unknown[][] = [];
  data[5] = ['필터 교체']; // A6
  data[5][2] = '수리'; // C6
  data[9] = [];
  data[9][1] = '2026-03-10'; // B10
  data[10] = [];
  data[10][0] = '먼지 누적으로 필터 막힘, 신품 교체'; // A11
  data[11] = [];
  data[11][0] = '80,000'; // A12 (쉼표 포함 — 실제 엑셀에 흔한 표기)
  data[12] = [];
  data[12][0] = '공조기 4호기'; // A13
  return XLSX.utils.aoa_to_sheet(data);
}

describe('applyHistoryTemplateToSheet', () => {
  const sheet = sheetWithLeadingBlankRows();

  it('매핑된 셀 값으로 이력 필드를 채운다', () => {
    const t = template({
      cells: { 제목: 'A6', 유형: 'C6', 날짜: 'B10', 내용: 'A11', 비용: 'A12', 설비명: 'A13' },
    });
    const result = applyHistoryTemplateToSheet(sheet, t);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      title: '필터 교체',
      date: '2026-03-10',
      type: '수리',
      content: '먼지 누적으로 필터 막힘, 신품 교체',
      cost: 80000,
      equipmentName: '공조기 4호기',
    });
  });

  it('유형 칸이 점검/수리가 아니거나 비어있으면 점검으로 처리한다', () => {
    const t = template({ cells: { 제목: 'A6', 날짜: 'B10', 유형: 'A11' } }); // A11 = 내용 텍스트(유형 아님)
    const result = applyHistoryTemplateToSheet(sheet, t);
    expect(result[0].type).toBe('점검');
  });

  it('제목이나 날짜가 비어있으면 그 순번은 만들지 않는다', () => {
    const 제목없음 = template({ cells: { 제목: 'Z99', 날짜: 'B10' } });
    expect(applyHistoryTemplateToSheet(sheet, 제목없음)).toEqual([]);

    const 날짜없음 = template({ cells: { 제목: 'A6', 날짜: 'Z99' } });
    expect(applyHistoryTemplateToSheet(sheet, 날짜없음)).toEqual([]);
  });

  it('비용에 쉼표·단위가 섞여 있어도 숫자만 뽑아낸다', () => {
    const t = template({ cells: { 제목: 'A6', 날짜: 'B10', 비용: 'A12' } });
    const result = applyHistoryTemplateToSheet(sheet, t);
    expect(result[0].cost).toBe(80000);
  });

  it('매핑 안 된 필드는 undefined로 남는다', () => {
    const t = template({ cells: { 제목: 'A6', 날짜: 'B10' } });
    const result = applyHistoryTemplateToSheet(sheet, t);
    expect(result[0].content).toBeUndefined();
    expect(result[0].cost).toBeUndefined();
    expect(result[0].equipmentName).toBeUndefined();
  });

  describe('한 서식에 이력이 여러 개(쉼표로 여러 셀)', () => {
    function sheetWithTwoRecords() {
      const data: unknown[][] = [];
      data[6] = ['필터 교체']; // A7
      data[6][1] = '2026-01-05'; // B7
      data[7] = ['배관 누수 수리']; // A8
      data[7][1] = '2026-02-10'; // B8
      return XLSX.utils.aoa_to_sheet(data);
    }
    const twoRecordSheet = sheetWithTwoRecords();

    it('제목에 셀을 쉼표로 여러 개 적으면 그 수만큼 이력을 만든다', () => {
      const t = template({ cells: { 제목: 'A7,A8', 날짜: 'B7,B8' } });
      const result = applyHistoryTemplateToSheet(twoRecordSheet, t);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ title: '필터 교체', date: '2026-01-05' });
      expect(result[1]).toMatchObject({ title: '배관 누수 수리', date: '2026-02-10' });
    });

    it('날짜를 하나만 매핑했으면 모든 이력에 그 값을 통일 적용한다', () => {
      const t = template({ cells: { 제목: 'A7,A8', 날짜: 'B7' } }); // 날짜는 하나만
      const result = applyHistoryTemplateToSheet(twoRecordSheet, t);
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-01-05');
      expect(result[1].date).toBe('2026-01-05');
    });

    it('날짜를 여러 개 적었는데 특정 순번이 빈 셀이면 그 순번만 건너뛴다', () => {
      const t = template({ cells: { 제목: 'A7,A8', 날짜: 'B7,Z99' } }); // 두번째는 빈 셀
      const result = applyHistoryTemplateToSheet(twoRecordSheet, t);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('필터 교체');
    });
  });
});

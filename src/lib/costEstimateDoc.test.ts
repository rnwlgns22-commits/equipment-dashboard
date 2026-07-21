import { describe, it, expect } from 'vitest';
import { looksLikeCostEstimateDoc, parseCostEstimateDoc, summarizeItems, stripCostLabel } from './costEstimateDoc';

// 실제 다운로드된 "1. 산출기초조사서.xlsx"를 raw:true로 읽었을 때의 행 구조 그대로
// (핸드레일 인건비 1건짜리 견적서). 열 위치가 문서마다 흔들릴 수 있어 헤더 텍스트로
// 찾는 방식이라, 이 샘플이 실제 열 배치의 기준이 된다.
const SAMPLE_ROWS: string[][] = [
  ['산  출  기  초  조  사  서', '', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', '', ''],
  ['금4,444,000원 (금사백사십사만사천원)', '', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '(단위 : 원)', '', ''],
  ['', '', '', '', '', '', '', '', '', ''],
  ['품   명', '규 격', '단위', '수량', '산  출  조  사  근  거', '', '산출근거(적용금액)', '', '', ''],
  ['', '', '', '', '원신엘리베이터', '현승엘리베이터', '단 가', '금 액', '', ''],
  ['1. 인건비', '', '', '', '', '', '', '', '', ''],
  ['핸드레일[로터리 2번출구 하행(우측)] 인건비', '', 'M', '37.44', '108000', '142500', '108000', '4039999.9999999995', '', ''],
  ['', '', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', '', ''],
  ['계', '', '', '', '', '', '', '4039999.9999999995', '', ''],
  ['부가세', '', '', '', '', '', '', '404000', '', ''],
  ['합      계', '', '', '', '', '', '4444000', '', '', ''],
  ['2026. 7.  ', '', '', '', '', '', '', '', '', ''],
  ['조 사 자 : 직 급  4 급  성 명  정 만 규', '', '', '', '', '', '', '', '', ''],
];

describe('looksLikeCostEstimateDoc', () => {
  it('파일명에 산출기초조사서가 있으면(공백 무시) 인식한다', () => {
    expect(looksLikeCostEstimateDoc('1. 산출기초조사서.xlsx', [])).toBe(true);
    expect(looksLikeCostEstimateDoc('산출기초조사서.xlsx', [])).toBe(true);
  });

  it('첫 행 텍스트가 산출기초조사서면(글자 사이 공백 포함) 인식한다', () => {
    expect(looksLikeCostEstimateDoc('무관한파일명.xlsx', SAMPLE_ROWS)).toBe(true);
  });

  it('둘 다 아니면 인식하지 않는다', () => {
    expect(looksLikeCostEstimateDoc('공조기_1호기.xlsx', [['공조기 1호기 이력카드']])).toBe(false);
  });
});

describe('parseCostEstimateDoc', () => {
  it('상단 "금X원" 표기에서 총액을 뽑는다', () => {
    expect(parseCostEstimateDoc(SAMPLE_ROWS).총액).toBe(4444000);
  });

  it('하단 날짜(연.월만, 일 없음)를 인식한다', () => {
    expect(parseCostEstimateDoc(SAMPLE_ROWS).날짜).toBe('2026-07-01');
  });

  it('품명/단위/수량/금액 항목을 뽑는다', () => {
    const { 항목 } = parseCostEstimateDoc(SAMPLE_ROWS);
    expect(항목).toHaveLength(1);
    expect(항목[0].품명).toBe('핸드레일[로터리 2번출구 하행(우측)] 인건비');
    expect(항목[0].단위).toBe('M');
    expect(항목[0].수량).toBeCloseTo(37.44);
    expect(항목[0].금액).toBe(4040000); // 부동소수점 오차 반올림
  });

  it('"1. 인건비" 같은 섹션 구분행은 항목으로 잡지 않는다', () => {
    const { 항목 } = parseCostEstimateDoc(SAMPLE_ROWS);
    expect(항목.some((i) => i.품명 === '1. 인건비')).toBe(false);
  });

  it('계/부가세/합계 행은 항목으로 잡지 않는다', () => {
    const { 항목 } = parseCostEstimateDoc(SAMPLE_ROWS);
    expect(항목.some((i) => ['계', '부가세', '합계'].includes(i.품명.replace(/\s/g, '')))).toBe(false);
  });

  it('상단 총액 표기가 없으면 합계 행에서 폴백으로 뽑는다', () => {
    const rowsNoTopTotal = SAMPLE_ROWS.filter((r) => !r[0].includes('금4,444,000원'));
    expect(parseCostEstimateDoc(rowsNoTopTotal).총액).toBe(4444000);
  });

  it('빈 행렬이면 크래시 없이 빈 결과를 반환한다', () => {
    const result = parseCostEstimateDoc([]);
    expect(result.항목).toEqual([]);
    expect(result.총액).toBeUndefined();
    expect(result.날짜).toBeUndefined();
  });

  it('여러 섹션(인건비+자재비)의 항목을 전부 뽑는다', () => {
    const rows: string[][] = [
      ['산  출  기  초  조  사  서'],
      ['금1,100,000원 (금백십만원)'],
      ['품   명', '규 격', '단위', '수량', '', '', '단 가', '금 액'],
      ['', '', '', '', '', '', '', ''],
      ['1. 인건비', '', '', '', '', '', '', ''],
      ['베어링 교체 인건비', '', 'EA', '1', '', '', '500000', '500000'],
      ['2. 재료비', '', '', '', '', '', '', ''],
      ['베어링 자재비', '', 'EA', '1', '', '', '500000', '500000'],
      ['계', '', '', '', '', '', '', '1000000'],
      ['부가세', '', '', '', '', '', '', '100000'],
      ['합      계', '', '', '', '', '', '1100000', ''],
      ['2026. 3.  '],
    ];
    const { 항목 } = parseCostEstimateDoc(rows);
    expect(항목).toHaveLength(2);
    expect(항목.map((i) => i.품명)).toEqual(['베어링 교체 인건비', '베어링 자재비']);
  });
});

describe('stripCostLabel', () => {
  it('끝의 인건비/자재비/재료비 표기를 뗀다', () => {
    expect(stripCostLabel('핸드레일[로터리 2번출구 하행(우측)] 인건비')).toBe('핸드레일[로터리 2번출구 하행(우측)]');
    expect(stripCostLabel('베어링 자재비')).toBe('베어링');
    expect(stripCostLabel('그냥 품명')).toBe('그냥 품명');
  });
});

describe('summarizeItems', () => {
  it('여러 품명을 · 로 이어붙인다', () => {
    expect(
      summarizeItems([
        { 품명: '베어링 교체 인건비' },
        { 품명: '체인 자재비' },
      ]),
    ).toBe('베어링 교체 · 체인');
  });

  it('인건비/자재비만 다르고 실제 품명이 같으면 중복 제거한다', () => {
    expect(
      summarizeItems([
        { 품명: '베어링 인건비' },
        { 품명: '베어링 자재비' },
      ]),
    ).toBe('베어링');
  });

  it('빈 배열이면 빈 문자열', () => {
    expect(summarizeItems([])).toBe('');
  });
});

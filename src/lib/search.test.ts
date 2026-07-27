import { describe, it, expect } from 'vitest';
import { unifiedSearch } from './search';
import type { Equipment, HistoryRecord, Part } from '../types';

function eqStub(overrides: Partial<Equipment> = {}): Equipment {
  return {
    설비ID: 'AHU-01',
    설비명: '공조기 1호기',
    분류: '공조',
    사이트: '역',
    위치: '지하1층 기계실',
    제조사: '삼성',
    모델명: 'SEC-3000',
    상태: '정상',
    연결설비: [],
    상세사양: {},
    출처파일: 'test',
    ...overrides,
  };
}

function histStub(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    id: 'h1',
    날짜: '2026-07-01',
    설비ID: 'AHU-01',
    유형: '점검',
    제목: '필터 교체',
    출처파일: 'test',
    ...overrides,
  };
}

function partStub(overrides: Partial<Part> = {}): Part {
  return {
    id: 'p1',
    자재명: 'V벨트 A형',
    단위: 'EA',
    현재수량: 5,
    연결설비ID: [],
    ...overrides,
  };
}

describe('unifiedSearch', () => {
  it('빈 쿼리는 빈 배열을 반환한다', () => {
    expect(unifiedSearch('', [eqStub()], [histStub()], [partStub()])).toEqual([]);
    expect(unifiedSearch('   ', [eqStub()], [histStub()], [partStub()])).toEqual([]);
  });

  it('설비명으로 찾는다', () => {
    const hits = unifiedSearch('공조기', [eqStub()], [], []);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ kind: '설비', title: '공조기 1호기', to: '/equipment/AHU-01' });
  });

  it('설비ID·모델명으로도 찾고 대소문자를 구분하지 않는다', () => {
    expect(unifiedSearch('ahu-01', [eqStub()], [], [])).toHaveLength(1);
    expect(unifiedSearch('sec-3000', [eqStub()], [], [])).toHaveLength(1);
  });

  it('상세사양 값으로도 찾는다', () => {
    const eq = eqStub({ 상세사양: { 정격전압: '380V' } });
    expect(unifiedSearch('380v', [eq], [], [])).toHaveLength(1);
  });

  it('이력은 제목·내용·연결된 설비명으로 찾고 목록 화면으로 보내는 presetQuery를 담는다', () => {
    const eq = eqStub();
    const h = histStub({ 제목: '베어링 교체', 내용: '소음 발생으로 교체' });
    expect(unifiedSearch('베어링', [eq], [h], [])).toMatchObject([
      { kind: '이력', title: '베어링 교체', to: '/history', presetQuery: '베어링 교체' },
    ]);
    expect(unifiedSearch('소음', [eq], [h], [])).toHaveLength(1);
    expect(unifiedSearch('공조기 1호기', [eq], [h], [])[1]).toMatchObject({ kind: '이력' });
  });

  it('설비 미지정 이력도 검색되고 부제에 "설비 미지정"이 붙는다', () => {
    const h = histStub({ 설비ID: undefined, 제목: '고아 이력' });
    const hits = unifiedSearch('고아', [], [h], []);
    expect(hits[0].subtitle).toContain('설비 미지정');
  });

  it('자재는 자재명·규격·보관위치·비고로 찾는다', () => {
    const p = partStub({ 규격: 'A-38', 보관위치: '자재창고 A-3', 비고: '정기교체용' });
    expect(unifiedSearch('a-38', [], [], [p])).toHaveLength(1);
    expect(unifiedSearch('자재창고', [], [], [p])).toHaveLength(1);
    expect(unifiedSearch('정기교체', [], [], [p])).toHaveLength(1);
  });

  it('그룹별 최대 6건까지만 반환한다', () => {
    const many = Array.from({ length: 10 }, (_, i) => eqStub({ 설비ID: `AHU-0${i}`, 설비명: '공조기' }));
    expect(unifiedSearch('공조기', many, [], [])).toHaveLength(6);
  });

  it('설비·이력·자재를 한 번에 가로질러 찾는다', () => {
    const eq = eqStub({ 설비명: '펌프', 설비ID: 'P-01' });
    const h = histStub({ 설비ID: 'P-01', 제목: '펌프 소음 점검' });
    const p = partStub({ 자재명: '펌프 씰', 연결설비ID: ['P-01'] });
    const hits = unifiedSearch('펌프', [eq], [h], [p]);
    expect(hits.map((h) => h.kind)).toEqual(['설비', '이력', '자재']);
  });
});

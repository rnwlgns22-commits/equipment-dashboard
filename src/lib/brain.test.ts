import { describe, it, expect } from 'vitest';
import { computeBrainSignals } from './brain';
import type { Equipment, HistoryRecord } from '../types';

function stub(overrides: Partial<Equipment> & { 설비ID: string }): Equipment {
  return {
    설비명: overrides.설비ID,
    분류: '공조',
    사이트: 'A동',
    상태: '정상',
    연결설비: [],
    상세사양: {},
    출처파일: 'test',
    ...overrides,
  };
}
function repair(설비ID: string, 날짜: string): HistoryRecord {
  return { id: `h-${설비ID}-${날짜}`, 날짜, 설비ID, 유형: '수리', 제목: '수리', 출처파일: 'test' };
}

describe('computeBrainSignals — 연쇄고장(cascade)', () => {
  it('계통상 연결된 두 설비가 30일 이내 근접 고장이면 신호를 낸다', () => {
    const equipments = [stub({ 설비ID: 'A', 연결설비: ['B'] }), stub({ 설비ID: 'B', 연결설비: ['A'] })];
    const histories = [repair('A', '2026-01-01'), repair('B', '2026-01-10')];
    const signals = computeBrainSignals(equipments, histories);
    expect(signals.some((s) => s.종류 === '연쇄고장')).toBe(true);
  });

  it('연결돼 있어도 고장 간격이 30일을 넘으면 신호를 안 낸다', () => {
    const equipments = [stub({ 설비ID: 'A', 연결설비: ['B'] }), stub({ 설비ID: 'B', 연결설비: ['A'] })];
    const histories = [repair('A', '2026-01-01'), repair('B', '2026-06-01')];
    const signals = computeBrainSignals(equipments, histories);
    expect(signals.some((s) => s.종류 === '연쇄고장')).toBe(false);
  });

  it('연결 안 된 설비끼리는 근접 고장이어도 연쇄고장 신호를 안 낸다', () => {
    const equipments = [stub({ 설비ID: 'A' }), stub({ 설비ID: 'B' })];
    const histories = [repair('A', '2026-01-01'), repair('B', '2026-01-02')];
    const signals = computeBrainSignals(equipments, histories);
    expect(signals.some((s) => s.종류 === '연쇄고장')).toBe(false);
  });

  it('같은 쌍을 두 번(양방향) 세지 않는다', () => {
    const equipments = [stub({ 설비ID: 'A', 연결설비: ['B'] }), stub({ 설비ID: 'B', 연결설비: ['A'] })];
    const histories = [repair('A', '2026-01-01'), repair('B', '2026-01-05')];
    const signals = computeBrainSignals(equipments, histories);
    expect(signals.filter((s) => s.종류 === '연쇄고장')).toHaveLength(1);
  });
});

describe('computeBrainSignals — 설치코호트(cohort)', () => {
  it('같은 제조사·설치연도·분류 2개 이상 + 그중 고장 이력 있으면 신호를 낸다', () => {
    const equipments = [
      stub({ 설비ID: 'A', 제조사: '한빛', 설치일: '2020-01-01', 분류: '공조' }),
      stub({ 설비ID: 'B', 제조사: '한빛', 설치일: '2020-06-01', 분류: '공조' }),
    ];
    const signals = computeBrainSignals(equipments, [repair('A', '2026-01-01')]);
    expect(signals.some((s) => s.종류 === '설치코호트')).toBe(true);
  });

  it('그룹 내 고장 이력이 하나도 없으면 신호를 안 낸다', () => {
    const equipments = [
      stub({ 설비ID: 'A', 제조사: '한빛', 설치일: '2020-01-01', 분류: '공조' }),
      stub({ 설비ID: 'B', 제조사: '한빛', 설치일: '2020-06-01', 분류: '공조' }),
    ];
    expect(computeBrainSignals(equipments, []).some((s) => s.종류 === '설치코호트')).toBe(false);
  });

  it('제조사/설치일 정보가 없는 설비는 그룹핑에서 빠진다', () => {
    const equipments = [stub({ 설비ID: 'A' }), stub({ 설비ID: 'B', 제조사: '한빛', 설치일: '2020-01-01' })];
    const signals = computeBrainSignals(equipments, [repair('B', '2026-01-01')]);
    expect(signals.some((s) => s.종류 === '설치코호트')).toBe(false); // 그룹 멤버 1개뿐
  });

  it('같은 제조사라도 분류가 다르면 다른 그룹으로 본다', () => {
    const equipments = [
      stub({ 설비ID: 'A', 제조사: '한빛', 설치일: '2020-01-01', 분류: '공조' }),
      stub({ 설비ID: 'B', 제조사: '한빛', 설치일: '2020-01-01', 분류: '전기' }),
    ];
    const signals = computeBrainSignals(equipments, [repair('A', '2026-01-01'), repair('B', '2026-01-01')]);
    expect(signals.some((s) => s.종류 === '설치코호트')).toBe(false);
  });
});

describe('computeBrainSignals — 동시다발(cluster)', () => {
  it('계통 무관하게 서로 다른 설비 2개 이상이 7일 이내 고장나면 신호를 낸다', () => {
    const equipments = [stub({ 설비ID: 'A' }), stub({ 설비ID: 'B' })];
    const histories = [repair('A', '2026-01-01'), repair('B', '2026-01-05')];
    const signals = computeBrainSignals(equipments, histories);
    expect(signals.some((s) => s.종류 === '동시다발')).toBe(true);
  });

  it('같은 설비 혼자 여러 번 고장나면 동시다발이 아니다(설비 2개 이상 필요)', () => {
    const equipments = [stub({ 설비ID: 'A' })];
    const histories = [repair('A', '2026-01-01'), repair('A', '2026-01-03')];
    expect(computeBrainSignals(equipments, histories).some((s) => s.종류 === '동시다발')).toBe(false);
  });

  it('7일보다 멀리 떨어진 고장은 묶지 않는다', () => {
    const equipments = [stub({ 설비ID: 'A' }), stub({ 설비ID: 'B' })];
    const histories = [repair('A', '2026-01-01'), repair('B', '2026-02-01')];
    expect(computeBrainSignals(equipments, histories).some((s) => s.종류 === '동시다발')).toBe(false);
  });
});

describe('computeBrainSignals — 공통', () => {
  it('고장 이력이 없으면 신호가 없다', () => {
    expect(computeBrainSignals([stub({ 설비ID: 'A' })], [])).toEqual([]);
  });

  it('점검 이력만으로는 어떤 신호도 안 낸다', () => {
    const inspection: HistoryRecord = { id: 'i1', 날짜: '2026-01-01', 설비ID: 'A', 유형: '점검', 제목: 'x', 출처파일: 'test' };
    expect(computeBrainSignals([stub({ 설비ID: 'A' })], [inspection])).toEqual([]);
  });
});

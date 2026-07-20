import { describe, it, expect } from 'vitest';
import { nextEquipmentId } from './equipmentId';
import type { Equipment } from '../types';

function stub(설비ID: string): Equipment {
  return {
    설비ID,
    설비명: 설비ID,
    분류: '공조',
    사이트: 'A동',
    상태: '정상',
    연결설비: [],
    상세사양: {},
    출처파일: 'test',
  };
}

describe('nextEquipmentId', () => {
  it('기존 설비가 없으면 01번부터 시작한다', () => {
    expect(nextEquipmentId('공조', [])).toBe('AHU-01');
    expect(nextEquipmentId('승강기', [])).toBe('ES-01');
  });

  it('같은 분류의 최대 번호 다음 번호를 부여한다', () => {
    const existing = [stub('AHU-01'), stub('AHU-02'), stub('AHU-05')];
    expect(nextEquipmentId('공조', existing)).toBe('AHU-06');
  });

  it('다른 분류의 번호는 무시한다', () => {
    const existing = [stub('AHU-01'), stub('CH-01'), stub('CH-02')];
    expect(nextEquipmentId('공조', existing)).toBe('AHU-02');
  });

  it('두 자리 이하는 0으로 패딩한다', () => {
    expect(nextEquipmentId('공조', [stub('AHU-09')])).toBe('AHU-10');
  });
});

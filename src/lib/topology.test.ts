import { describe, it, expect } from 'vitest';
import { computeConnections } from './topology';
import type { Equipment } from '../types';

function stub(설비ID: string, 연결설비: string[]): Equipment {
  return {
    설비ID,
    설비명: 설비ID,
    분류: '공조',
    사이트: 'A동',
    상태: '정상',
    연결설비,
    상세사양: {},
    출처파일: 'test',
  };
}

describe('computeConnections', () => {
  it('둘 다 배치된 연결만 반환한다', () => {
    const equipments = [stub('A', ['B']), stub('B', ['A']), stub('C', ['A'])];
    const placedIds = new Set(['A', 'B']); // C는 도면에 없음
    const result = computeConnections(equipments, placedIds);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('A|B');
  });

  it('양방향 연결이어도 쌍을 한 번만 반환한다', () => {
    const equipments = [stub('A', ['B']), stub('B', ['A'])];
    const result = computeConnections(equipments, new Set(['A', 'B']));
    expect(result).toHaveLength(1);
  });

  it('자기 자신을 가리키는 연결은 무시한다', () => {
    const equipments = [stub('A', ['A'])];
    const result = computeConnections(equipments, new Set(['A']));
    expect(result).toHaveLength(0);
  });

  it('연결이 없으면 빈 배열', () => {
    const equipments = [stub('A', []), stub('B', [])];
    expect(computeConnections(equipments, new Set(['A', 'B']))).toEqual([]);
  });

  it('key는 항상 정렬된 순서다', () => {
    const equipments = [stub('Z', ['A']), stub('A', ['Z'])];
    const result = computeConnections(equipments, new Set(['A', 'Z']));
    expect(result[0].key).toBe('A|Z');
    expect(result[0].a).toBe('A');
    expect(result[0].b).toBe('Z');
  });
});

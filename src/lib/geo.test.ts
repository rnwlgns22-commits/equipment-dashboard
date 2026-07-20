import { describe, it, expect } from 'vitest';
import { pointInPolygon, computeZoneStats } from './geo';
import type { Equipment, FailureStat, Placement, Zone } from '../types';

const square = [
  { xPct: 10, yPct: 10 },
  { xPct: 50, yPct: 10 },
  { xPct: 50, yPct: 50 },
  { xPct: 10, yPct: 50 },
];

describe('pointInPolygon', () => {
  it('사각형 내부의 점을 인식한다', () => {
    expect(pointInPolygon({ xPct: 30, yPct: 30 }, square)).toBe(true);
  });

  it('사각형 바깥의 점은 인식하지 않는다', () => {
    expect(pointInPolygon({ xPct: 90, yPct: 90 }, square)).toBe(false);
    expect(pointInPolygon({ xPct: 5, yPct: 30 }, square)).toBe(false);
  });

  it('삼각형처럼 3개 점짜리 다각형도 처리한다', () => {
    const tri = [
      { xPct: 0, yPct: 0 },
      { xPct: 100, yPct: 0 },
      { xPct: 50, yPct: 100 },
    ];
    expect(pointInPolygon({ xPct: 50, yPct: 30 }, tri)).toBe(true);
    expect(pointInPolygon({ xPct: 5, yPct: 90 }, tri)).toBe(false);
  });
});

function makeEquipment(id: string, 상태: Equipment['상태']): Equipment {
  return {
    설비ID: id,
    설비명: id,
    분류: '공조',
    사이트: 'A동',
    상태,
    연결설비: [],
    상세사양: {},
    출처파일: 'test',
  };
}

describe('computeZoneStats', () => {
  const zone: Zone = { id: 'z1', name: '테스트구역', 도면ID: 'fp1', points: square };

  it('구역 안에 배치된 설비만 집계한다', () => {
    const placements: Placement[] = [
      { 설비ID: 'A', 도면ID: 'fp1', xPct: 30, yPct: 30 }, // 안
      { 설비ID: 'B', 도면ID: 'fp1', xPct: 90, yPct: 90 }, // 밖
    ];
    const equipmentsById = new Map([
      ['A', makeEquipment('A', '정상')],
      ['B', makeEquipment('B', '정상')],
    ]);
    const stats = computeZoneStats(zone, placements, equipmentsById, new Map());
    expect(stats.설비수).toBe(1);
  });

  it('설비가 없으면 0으로 나누지 않고 0%를 반환한다', () => {
    const stats = computeZoneStats(zone, [], new Map(), new Map());
    expect(stats).toEqual({ 설비수: 0, 가동률: 0, 위험설비수: 0, 에러율: 0 });
  });

  it('가동률·에러율을 정확히 계산한다', () => {
    const placements: Placement[] = [
      { 설비ID: 'A', 도면ID: 'fp1', xPct: 20, yPct: 20 },
      { 설비ID: 'B', 도면ID: 'fp1', xPct: 25, yPct: 25 },
    ];
    const equipmentsById = new Map([
      ['A', makeEquipment('A', '정상')],
      ['B', makeEquipment('B', '수리중')],
    ]);
    const statsById = new Map<string, FailureStat>([
      [
        'B',
        {
          설비ID: 'B',
          고장건수: 3,
          최근1년건수: 3,
          최초고장일: '2026-01-01',
          최근고장일: '2026-06-01',
          위험등급: '상',
        },
      ],
    ]);
    const stats = computeZoneStats(zone, placements, equipmentsById, statsById);
    expect(stats.설비수).toBe(2);
    expect(stats.가동률).toBe(50); // A만 정상
    expect(stats.위험설비수).toBe(1); // B만 위험 상
    expect(stats.에러율).toBe(50);
  });
});

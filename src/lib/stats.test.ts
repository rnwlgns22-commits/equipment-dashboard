import { describe, it, expect } from 'vitest';
import { computeFailureStats, equipmentName } from './stats';
import type { Equipment, HistoryRecord } from '../types';

function repair(설비ID: string | undefined, 날짜: string): HistoryRecord {
  return { id: `h-${설비ID}-${날짜}`, 날짜, 설비ID, 유형: '수리', 제목: '수리', 출처파일: 'test' };
}
function inspection(설비ID: string, 날짜: string): HistoryRecord {
  return { id: `i-${설비ID}-${날짜}`, 날짜, 설비ID, 유형: '점검', 제목: '점검', 출처파일: 'test' };
}

const now = new Date('2026-07-20T00:00:00Z');

describe('computeFailureStats', () => {
  it('점검 이력은 집계에서 제외한다(수리만 고장으로 본다)', () => {
    const { stats } = computeFailureStats([inspection('AHU-01', '2026-01-01')], now);
    expect(stats).toHaveLength(0);
  });

  it('설비ID 없는 수리 이력은 고아로 센다', () => {
    const { orphanCount } = computeFailureStats([repair(undefined, '2026-01-01')], now);
    expect(orphanCount).toBe(1);
  });

  it('고장 1건이면 MTBF를 계산하지 않는다(2건부터 가능)', () => {
    const { stats } = computeFailureStats([repair('AHU-01', '2026-01-01')], now);
    expect(stats[0].mtbf일).toBeUndefined();
    expect(stats[0].예상다음고장일).toBeUndefined();
  });

  it('고장 2건 이상이면 MTBF와 예상 다음 고장일을 계산한다', () => {
    const { stats } = computeFailureStats(
      [repair('AHU-01', '2026-01-01'), repair('AHU-01', '2026-01-11')],
      now,
    );
    expect(stats[0].mtbf일).toBe(10);
    expect(stats[0].예상다음고장일).toBe('2026-01-21');
  });

  it('위험등급: 최근 1년 3건 이상=상, 1~2건=중, 0건=하', () => {
    const manyRepairs = ['2026-01-01', '2026-02-01', '2026-03-01'].map((d) => repair('A', d));
    expect(computeFailureStats(manyRepairs, now).stats[0].위험등급).toBe('상');

    const oneRepair = [repair('B', '2026-06-01')];
    expect(computeFailureStats(oneRepair, now).stats[0].위험등급).toBe('중');

    // 1년보다 오래된 고장만 있으면 최근1년건수=0 → 하
    const oldRepair = [repair('C', '2020-01-01')];
    expect(computeFailureStats(oldRepair, now).stats[0].위험등급).toBe('하');
  });

  it('최근1년건수·고장건수 내림차순으로 정렬한다', () => {
    const histories = [
      repair('LOW', '2026-06-01'),
      repair('HIGH', '2026-01-01'),
      repair('HIGH', '2026-02-01'),
      repair('HIGH', '2026-03-01'),
    ];
    const { stats } = computeFailureStats(histories, now);
    expect(stats[0].설비ID).toBe('HIGH');
  });

  it('날짜 형식이 잘못된 이력은 건너뛴다', () => {
    const { stats } = computeFailureStats([repair('AHU-01', '이상한날짜')], now);
    expect(stats).toHaveLength(0);
  });
});

describe('equipmentName', () => {
  const equipments: Equipment[] = [
    { 설비ID: 'AHU-01', 설비명: '공조기 1호기', 분류: '공조', 사이트: 'A동', 상태: '정상', 연결설비: [], 상세사양: {}, 출처파일: 'x' },
  ];

  it('설비ID로 이름을 찾는다', () => {
    expect(equipmentName(equipments, 'AHU-01')).toBe('공조기 1호기');
  });

  it('못 찾으면 ID를 그대로 반환한다', () => {
    expect(equipmentName(equipments, 'UNKNOWN-99')).toBe('UNKNOWN-99');
  });
});

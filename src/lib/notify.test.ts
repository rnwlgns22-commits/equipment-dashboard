import { describe, it, expect } from 'vitest';
import { collectNotificationCategories } from './notify';
import type { Equipment, InspectionSchedule, Part } from '../types';

const now = new Date('2026-07-27T00:00:00.000Z');

function eqStub(overrides: Partial<Equipment> = {}): Equipment {
  return {
    설비ID: 'AHU-01',
    설비명: '공조기 1호기',
    분류: '공조',
    사이트: '역',
    상태: '정상',
    연결설비: [],
    상세사양: {},
    출처파일: 'test',
    ...overrides,
  };
}

function inspStub(overrides: Partial<InspectionSchedule> = {}): InspectionSchedule {
  return {
    id: 'insp-1',
    설비ID: 'EL-01',
    종류: '법정점검',
    항목명: '승강기 정기검사',
    주기일: 180,
    ...overrides,
  };
}

function partStub(overrides: Partial<Part> = {}): Part {
  return {
    id: 'p1',
    자재명: 'V벨트 A형',
    단위: 'EA',
    현재수량: 1,
    안전재고: 3,
    연결설비ID: [],
    ...overrides,
  };
}

describe('collectNotificationCategories', () => {
  it('아무것도 임박하지 않으면 빈 배열', () => {
    const eq = eqStub({ 다음점검일: '2026-12-01' });
    expect(collectNotificationCategories([eq], [], [], now)).toEqual([]);
  });

  it('7일 이내 점검 임박 설비를 하나의 카테고리로 묶는다', () => {
    const eq = eqStub({ 다음점검일: '2026-08-01' });
    const cats = collectNotificationCategories([eq], [], [], now);
    expect(cats).toHaveLength(1);
    expect(cats[0]).toMatchObject({ title: '점검 임박 설비 1건', to: '/dashboard' });
    expect(cats[0].body).toContain('공조기 1호기');
  });

  it('8일 이후·이미 지난 점검은 "점검 임박"에 포함하지 않는다', () => {
    const tooFar = eqStub({ 설비ID: 'A', 다음점검일: '2026-08-05' });
    const already = eqStub({ 설비ID: 'B', 다음점검일: '2026-07-20' });
    expect(collectNotificationCategories([tooFar, already], [], [], now)).toEqual([]);
  });

  it('법정·정기점검은 임박·기한초과 모두 포함하고 법정점검을 우선 정렬한다', () => {
    const regular = inspStub({ id: 'r1', 종류: '정기점검', 항목명: '필터 청소', 다음점검일: '2026-07-30' });
    const legal = inspStub({ id: 'l1', 종류: '법정점검', 항목명: '승강기 검사', 다음점검일: '2026-07-25' });
    const cats = collectNotificationCategories([], [regular, legal], [], now);
    expect(cats).toHaveLength(1);
    expect(cats[0].title).toBe('법정·정기점검 도래 2건');
    expect(cats[0].body.indexOf('승강기 검사')).toBeLessThan(cats[0].body.indexOf('필터 청소'));
  });

  it('안전재고 이하인 자재만 재고부족으로 묶는다', () => {
    const low = partStub({ id: 'low', 현재수량: 1, 안전재고: 3 });
    const ok = partStub({ id: 'ok', 자재명: '충분한 자재', 현재수량: 10, 안전재고: 3 });
    const cats = collectNotificationCategories([], [], [low, ok], now);
    expect(cats).toHaveLength(1);
    expect(cats[0]).toMatchObject({ title: '재고부족 자재 1건', to: '/inventory' });
  });

  it('4건 넘게 몰리면 본문에 "외 N건"으로 요약한다', () => {
    const many = Array.from({ length: 5 }, (_, i) => partStub({ id: `p${i}`, 자재명: `자재${i}` }));
    const cats = collectNotificationCategories([], [], many, now);
    expect(cats[0].body).toContain('외 2건');
  });

  it('key는 대상 집합이 바뀌면 달라지고, 그대로면 같다', () => {
    const eq1 = eqStub({ 다음점검일: '2026-08-01' });
    const a = collectNotificationCategories([eq1], [], [], now);
    const b = collectNotificationCategories([eq1], [], [], now);
    expect(a[0].key).toBe(b[0].key);

    const eq2 = eqStub({ 다음점검일: '2026-08-02' }); // 완료 처리로 다음점검일이 바뀐 경우
    const c = collectNotificationCategories([eq2], [], [], now);
    expect(c[0].key).not.toBe(a[0].key);
  });

  it('세 카테고리가 동시에 있으면 전부 반환한다', () => {
    const eq = eqStub({ 다음점검일: '2026-08-01' });
    const insp = inspStub({ 다음점검일: '2026-07-28' });
    const part = partStub();
    const cats = collectNotificationCategories([eq], [insp], [part], now);
    expect(cats.map((c) => c.to)).toEqual(['/dashboard', '/dashboard', '/inventory']);
  });
});

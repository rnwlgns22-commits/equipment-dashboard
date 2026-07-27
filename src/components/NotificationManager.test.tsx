import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationManager from './NotificationManager';
import { useAppStore } from '../store';
import { useNotifyStore } from '../notifyStore';
import type { Equipment } from '../types';

function equipment(overrides: Partial<Equipment> & { 설비ID: string; 설비명: string }): Equipment {
  return {
    분류: '공조',
    사이트: '미분류',
    상태: '정상',
    연결설비: [],
    상세사양: {},
    출처파일: '테스트',
    ...overrides,
  };
}

// 실행 시점의 실제 날짜를 기준으로 상대 날짜를 계산 — 하드코딩한 날짜를 쓰면
// 시간이 지나 "7일 이내" 조건을 벗어나는 순간 테스트가 저절로 깨짐(타임밤).
const dueSoonDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const farFutureDate = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);

// 알림 API 자체는 jsdom에 없어서(또는 있어도 실제 팝업을 못 띄우니) 생성자를 스파이로
// 교체 — GlobalSearch.tsx 브라우저 검증 때 쓴 것과 같은 방식(2026-07-27).
let notificationSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // vi.fn()에 화살표 함수 구현을 넣으면 new로 호출할 때 "is not a constructor"로
  // 터짐 — 일반 function 표현식으로 감싸야 new Notification(...)이 통과함.
  notificationSpy = vi.fn(function (this: unknown) {
    return { close: vi.fn() };
  });
  (notificationSpy as unknown as { permission: string }).permission = 'granted';
  vi.stubGlobal('Notification', notificationSpy);
  localStorage.clear();
});

afterEach(() => {
  useAppStore.setState({ equipments: [], histories: [], inspectionSchedules: [], parts: [], loaded: false });
  useNotifyStore.setState({ enabled: false });
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderManager() {
  return render(
    <MemoryRouter>
      <NotificationManager />
    </MemoryRouter>,
  );
}

describe('NotificationManager', () => {
  it('꺼져 있으면(기본값) 임박 항목이 있어도 알리지 않는다', () => {
    useAppStore.setState({
      equipments: [equipment({ 설비ID: 'A', 설비명: '공조기', 다음점검일: dueSoonDate })],
    });
    renderManager();
    expect(notificationSpy).not.toHaveBeenCalled();
  });

  it('브라우저 권한이 없으면 켜져 있어도 알리지 않는다', () => {
    (notificationSpy as unknown as { permission: string }).permission = 'denied';
    useNotifyStore.setState({ enabled: true });
    useAppStore.setState({
      equipments: [equipment({ 설비ID: 'A', 설비명: '공조기', 다음점검일: dueSoonDate })],
    });
    renderManager();
    expect(notificationSpy).not.toHaveBeenCalled();
  });

  it('켜져 있고 권한이 있으면 임박 항목을 알린다', () => {
    useNotifyStore.setState({ enabled: true });
    useAppStore.setState({
      equipments: [equipment({ 설비ID: 'A', 설비명: '공조기', 다음점검일: dueSoonDate })],
    });
    renderManager();
    expect(notificationSpy).toHaveBeenCalledTimes(1);
    expect(notificationSpy.mock.calls[0][0]).toContain('점검 임박');
  });

  it('같은 상태로는 다시 렌더링해도 재알림하지 않는다(dedup)', () => {
    useNotifyStore.setState({ enabled: true });
    useAppStore.setState({
      equipments: [equipment({ 설비ID: 'A', 설비명: '공조기', 다음점검일: dueSoonDate })],
    });
    const { unmount } = renderManager();
    expect(notificationSpy).toHaveBeenCalledTimes(1);
    unmount();

    renderManager();
    expect(notificationSpy).toHaveBeenCalledTimes(1);
  });

  it('임박 항목이 없으면 알리지 않는다', () => {
    useNotifyStore.setState({ enabled: true });
    useAppStore.setState({
      equipments: [equipment({ 설비ID: 'A', 설비명: '공조기', 다음점검일: farFutureDate })],
    });
    renderManager();
    expect(notificationSpy).not.toHaveBeenCalled();
  });
});

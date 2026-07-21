import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LegalInspection from './LegalInspection';
import RegularInspection from './RegularInspection';
import { useAppStore } from '../store';
import type { Equipment } from '../types';

// 법정점검/정기점검은 같은 InspectionScheduleBoard를 kind만 바꿔 재사용하므로,
// 추가/완료처리/수정/삭제와 종류별 분리를 여기서 함께 검증.
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

afterEach(() => {
  useAppStore.setState({ equipments: [], histories: [], inspectionSchedules: [], loaded: false });
});

beforeEach(() => {
  useAppStore.setState({
    equipments: [equipment({ 설비ID: 'E-001', 설비명: '승강기 1호기' })],
    histories: [],
    inspectionSchedules: [],
    loaded: true,
  });
});

function renderLegal() {
  return render(
    <MemoryRouter>
      <LegalInspection />
    </MemoryRouter>,
  );
}

function renderRegular() {
  return render(
    <MemoryRouter>
      <RegularInspection />
    </MemoryRouter>,
  );
}

describe('법정점검/정기점검', () => {
  it('법정점검 항목을 추가하면 종류=법정점검으로 store에 반영되고 다음점검일이 계산된다', async () => {
    const user = userEvent.setup();
    renderLegal();

    await user.click(screen.getByRole('button', { name: '+ 항목 추가' }));
    await user.selectOptions(screen.getByRole('combobox'), 'E-001');
    await user.type(screen.getByLabelText(/법정점검 항목 \*/), '승강기 정기검사');
    await user.type(screen.getByLabelText(/주기\(일\)/), '180');
    fireEvent.change(screen.getByLabelText('최근 점검일'), { target: { value: '2026-01-01' } });
    await user.click(screen.getByRole('button', { name: '등록' }));

    const schedules = useAppStore.getState().inspectionSchedules;
    expect(schedules).toHaveLength(1);
    expect(schedules[0].종류).toBe('법정점검');
    expect(schedules[0].설비ID).toBe('E-001');
    expect(schedules[0].다음점검일).toBe('2026-06-30');
    expect(await screen.findByText(/승강기 정기검사/)).toBeInTheDocument();
  });

  it('정기점검 페이지에서 추가한 항목은 법정점검 목록엔 안 보인다(종류별 분리)', async () => {
    const user = userEvent.setup();
    renderRegular();

    await user.click(screen.getByRole('button', { name: '+ 항목 추가' }));
    await user.selectOptions(screen.getByRole('combobox'), 'E-001');
    await user.type(screen.getByLabelText(/정기점검 항목 \*/), '필터 청소');
    await user.type(screen.getByLabelText(/주기\(일\)/), '30');
    await user.click(screen.getByRole('button', { name: '등록' }));

    expect(useAppStore.getState().inspectionSchedules[0].종류).toBe('정기점검');

    renderLegal();
    expect(screen.getByText('등록된 항목이 없습니다.')).toBeInTheDocument();
  });

  it('"오늘 완료" 클릭 시 최근점검일이 오늘로, 다음점검일이 주기만큼 재계산된다', async () => {
    useAppStore.setState({
      inspectionSchedules: [
        { id: 'insp-1', 설비ID: 'E-001', 종류: '법정점검', 항목명: '승강기 정기검사', 주기일: 30, 최근점검일: '2020-01-01', 다음점검일: '2020-01-31' },
      ],
    });
    const user = userEvent.setup();
    renderLegal();

    await user.click(screen.getByRole('button', { name: '오늘 완료' }));

    const today = new Date().toISOString().slice(0, 10);
    const updated = useAppStore.getState().inspectionSchedules[0];
    expect(updated.최근점검일).toBe(today);
    expect(updated.다음점검일).toBeDefined();
    expect(updated.다음점검일! > today).toBe(true);
  });

  it('삭제(확인 후) 시 store에서 제거된다', async () => {
    useAppStore.setState({
      inspectionSchedules: [
        { id: 'insp-1', 설비ID: 'E-001', 종류: '법정점검', 항목명: '승강기 정기검사', 주기일: 180 },
      ],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderLegal();

    await user.click(screen.getByLabelText('승강기 정기검사 삭제'));

    expect(useAppStore.getState().inspectionSchedules).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it('설비가 삭제되면 그 설비의 법정/정기점검 항목도 같이 삭제된다', () => {
    useAppStore.setState({
      inspectionSchedules: [
        { id: 'insp-1', 설비ID: 'E-001', 종류: '법정점검', 항목명: '승강기 정기검사', 주기일: 180 },
      ],
    });
    useAppStore.getState().deleteEquipment('E-001');
    expect(useAppStore.getState().inspectionSchedules).toHaveLength(0);
  });
});

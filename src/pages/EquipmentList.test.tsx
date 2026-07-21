import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import EquipmentList from './EquipmentList';
import { useAppStore } from '../store';
import type { Equipment } from '../types';

// 목록이 늘어나면 하나씩 상세페이지에 들어가 지우는 게 번거로워서 추가된 다중선택+
// 일괄삭제 검증(2026-07-21 요청). 체크박스가 카드(Link) 안에 있어서 클릭 시 상세
// 페이지로 안 튕기고 선택만 토글되는지도 같이 확인.
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
  useAppStore.setState({ equipments: [], histories: [], loaded: false });
});

beforeEach(() => {
  useAppStore.setState({
    equipments: [
      equipment({ 설비ID: 'E-001', 설비명: '공조기 1호기' }),
      equipment({ 설비ID: 'E-002', 설비명: '공조기 2호기' }),
      equipment({ 설비ID: 'E-003', 설비명: '냉각탑 1호기', 분류: '냉난방' }),
    ],
    histories: [],
    loaded: true,
  });
});

function renderList() {
  return render(
    <MemoryRouter>
      <EquipmentList />
    </MemoryRouter>,
  );
}

describe('EquipmentList 다중선택/일괄삭제', () => {
  it('카드 체크박스를 클릭해도 상세페이지로 이동하지 않고 선택만 토글된다', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByLabelText('공조기 1호기 선택'));

    expect(screen.getByText('1개 선택됨')).toBeInTheDocument();
    expect(screen.getByText('설비 목록')).toBeInTheDocument(); // 여전히 목록 화면
  });

  it('전체선택 체크 시 화면에 보이는 항목이 모두 선택된다', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByLabelText('전체선택'));

    expect(screen.getByText('3개 선택됨')).toBeInTheDocument();
  });

  it('선택 삭제(확인 후) 시 선택된 설비만 store에서 제거된다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByLabelText('공조기 1호기 선택'));
    await user.click(screen.getByLabelText('냉각탑 1호기 선택'));
    await user.click(screen.getByRole('button', { name: '선택 삭제' }));

    const remaining = useAppStore.getState().equipments.map((e) => e.설비ID);
    expect(remaining).toEqual(['E-002']);
    vi.restoreAllMocks();
  });

  it('삭제 확인창에서 취소하면 아무것도 지워지지 않는다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByLabelText('공조기 1호기 선택'));
    await user.click(screen.getByRole('button', { name: '선택 삭제' }));

    expect(useAppStore.getState().equipments).toHaveLength(3);
    vi.restoreAllMocks();
  });

  it('선택 해제를 누르면 선택이 전부 풀린다', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByLabelText('전체선택'));
    await user.click(screen.getByRole('button', { name: '선택 해제' }));

    expect(screen.queryByText(/개 선택됨/)).not.toBeInTheDocument();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Inventory from './Inventory';
import { useAppStore } from '../store';
import type { Equipment, Part } from '../types';

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

function part(overrides: Partial<Part> & { id: string; 자재명: string }): Part {
  return { 단위: 'EA', 현재수량: 10, 연결설비ID: [], ...overrides };
}

afterEach(() => {
  useAppStore.setState({ equipments: [], histories: [], inspectionSchedules: [], parts: [], loaded: false });
});

beforeEach(() => {
  useAppStore.setState({
    equipments: [equipment({ 설비ID: 'E-001', 설비명: '공조기 1호기' })],
    parts: [],
    loaded: true,
  });
});

function renderInventory() {
  return render(
    <MemoryRouter>
      <Inventory />
    </MemoryRouter>,
  );
}

describe('자재·재고관리', () => {
  it('자재를 추가하면 store에 반영된다', async () => {
    const user = userEvent.setup();
    renderInventory();

    await user.click(screen.getByRole('button', { name: '+ 자재 추가' }));
    await user.type(screen.getByLabelText(/자재명 \*/), 'V벨트 A형');
    await user.clear(screen.getByLabelText(/단위 \*/));
    await user.type(screen.getByLabelText(/단위 \*/), 'EA');
    await user.type(screen.getByLabelText(/현재수량 \*/), '5');
    await user.type(screen.getByLabelText('안전재고'), '2');
    await user.click(screen.getByRole('button', { name: '등록' }));

    const parts = useAppStore.getState().parts;
    expect(parts).toHaveLength(1);
    expect(parts[0].자재명).toBe('V벨트 A형');
    expect(parts[0].현재수량).toBe(5);
    expect(parts[0].안전재고).toBe(2);
    expect(await screen.findByText('V벨트 A형')).toBeInTheDocument();
  });

  it('현재수량이 안전재고 이하면 재고부족 배지가 표시된다', () => {
    useAppStore.setState({ parts: [part({ id: 'p1', 자재명: '필터', 현재수량: 1, 안전재고: 3 })] });
    renderInventory();
    expect(screen.getByText('재고부족')).toBeInTheDocument();
  });

  it('+/- 버튼으로 현재수량을 조정할 수 있고 0 밑으로는 안 내려간다', async () => {
    useAppStore.setState({ parts: [part({ id: 'p1', 자재명: '필터', 현재수량: 0 })] });
    const user = userEvent.setup();
    renderInventory();

    await user.click(screen.getByLabelText('필터 재고 1 감소'));
    expect(useAppStore.getState().parts[0].현재수량).toBe(0);

    await user.click(screen.getByLabelText('필터 재고 1 증가'));
    expect(useAppStore.getState().parts[0].현재수량).toBe(1);
  });

  it('삭제(확인 후) 시 store에서 제거된다', async () => {
    useAppStore.setState({ parts: [part({ id: 'p1', 자재명: '필터' })] });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderInventory();

    await user.click(screen.getByLabelText('필터 삭제'));

    expect(useAppStore.getState().parts).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it('설비가 삭제되면 그 설비를 참조하던 자재의 연결설비ID에서만 빠지고 자재는 남는다', () => {
    useAppStore.setState({ parts: [part({ id: 'p1', 자재명: '필터', 연결설비ID: ['E-001'] })] });
    useAppStore.getState().deleteEquipment('E-001');
    const parts = useAppStore.getState().parts;
    expect(parts).toHaveLength(1);
    expect(parts[0].연결설비ID).toEqual([]);
  });
});

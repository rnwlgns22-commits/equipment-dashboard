import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AddEquipment from './AddEquipment';
import { useAppStore } from '../store';

// 수기 입력 탭이 실제로 useAppStore에 설비를 반영하는지 — 지금까지는 Playwright로만
// 확인했던 플로우(설비 등록 → 목록 반영)를 회귀 테스트로 고정.
afterEach(() => {
  useAppStore.setState({ equipments: [], histories: [], loaded: false });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AddEquipment />
    </MemoryRouter>,
  );
}

describe('AddEquipment 수기 입력', () => {
  it('필수 항목만 채워서 제출하면 useAppStore에 설비가 추가된다', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/설비명/), '테스트 공조기');
    await user.click(screen.getByRole('button', { name: '설비 등록' }));

    const equipments = useAppStore.getState().equipments;
    expect(equipments).toHaveLength(1);
    expect(equipments[0].설비명).toBe('테스트 공조기');
    expect(equipments[0].분류).toBe('공조');
    expect(equipments[0].연결설비).toEqual([]);

    expect(await screen.findByText(/등록되었습니다/)).toBeInTheDocument();
  });

  it('설비명을 비운 채 제출하면 추가되지 않는다', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: '설비 등록' }));

    expect(useAppStore.getState().equipments).toHaveLength(0);
  });

  it('연달아 등록하면 분류·사이트는 유지되고 나머지는 비워진다', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByText('공조').closest('select')!, '전기');
    await user.type(screen.getByPlaceholderText(/A동/), 'B동');
    await user.type(screen.getByLabelText(/설비명/), '전기설비 1호기');
    await user.click(screen.getByRole('button', { name: '설비 등록' }));

    expect(useAppStore.getState().equipments).toHaveLength(1);
    expect((screen.getByLabelText(/설비명/) as HTMLInputElement).value).toBe('');
    expect((screen.getByPlaceholderText(/A동/) as HTMLInputElement).value).toBe('B동');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HistoryBrowser from './HistoryBrowser';
import { useAppStore } from '../store';

// 이력 추가/수정/삭제 세 가지가 실제로 useAppStore를 갱신하는지 — 이번 세션에서
// Playwright로 여러 번 검증했던 플로우를 회귀 테스트로 고정.
afterEach(() => {
  useAppStore.setState({ equipments: [], histories: [], loaded: false });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <HistoryBrowser />
    </MemoryRouter>,
  );
}

describe('HistoryBrowser', () => {
  it('수기 입력 폼으로 이력을 추가하면 목록과 store에 반영된다', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: '+ 이력 추가' }));
    fireEvent.change(screen.getByLabelText(/날짜 \*/), { target: { value: '2026-07-20' } });
    await user.type(screen.getByLabelText(/제목 \*/), '테스트 이력 항목');
    await user.click(screen.getByRole('button', { name: '등록' }));

    expect(await screen.findByText('테스트 이력 항목')).toBeInTheDocument();
    const histories = useAppStore.getState().histories;
    expect(histories).toHaveLength(1);
    expect(histories[0].제목).toBe('테스트 이력 항목');
    expect(histories[0].날짜).toBe('2026-07-20');
  });

  describe('기존 이력이 있을 때', () => {
    beforeEach(() => {
      useAppStore.setState({
        equipments: [],
        histories: [{ id: 'h-1', 날짜: '2026-07-01', 유형: '점검', 제목: '원본 제목', 출처파일: '테스트' }],
        loaded: true,
      });
    });

    it('✎ 버튼으로 인라인 수정하면 store가 갱신된다', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByLabelText('이력 수정'));
      const titleInput = screen.getByDisplayValue('원본 제목');
      await user.clear(titleInput);
      await user.type(titleInput, '수정된 제목');
      await user.click(screen.getByRole('button', { name: '저장' }));

      expect(await screen.findByText('수정된 제목')).toBeInTheDocument();
      expect(useAppStore.getState().histories[0].제목).toBe('수정된 제목');
    });

    it('✕ 버튼(확인 후)으로 삭제하면 store에서 제거된다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderPage();

      await user.click(screen.getByLabelText('이력 삭제'));

      expect(useAppStore.getState().histories).toHaveLength(0);
      vi.restoreAllMocks();
    });

    it('삭제 확인창에서 취소하면 삭제되지 않는다', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderPage();

      await user.click(screen.getByLabelText('이력 삭제'));

      expect(useAppStore.getState().histories).toHaveLength(1);
      vi.restoreAllMocks();
    });

    it('고아 이력에 설비를 지정하면 설비 매칭 안 됨 탭에서 사라진다', async () => {
      useAppStore.setState({
        equipments: [
          {
            설비ID: 'E-001',
            설비명: '테스트 설비',
            분류: '공조',
            사이트: '미분류',
            상태: '정상',
            연결설비: [],
            상세사양: {},
            출처파일: '테스트',
          },
        ],
      });
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: /설비 매칭 안 됨/ }));
      expect(screen.getByText('원본 제목')).toBeInTheDocument();

      await user.selectOptions(screen.getByTitle('설비를 지정하면 고아 이력에서 빠집니다'), 'E-001');

      expect(useAppStore.getState().histories[0].설비ID).toBe('E-001');
    });
  });
});

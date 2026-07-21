import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KpiTile from './KpiTile';

describe('KpiTile', () => {
  it('detail이 없으면 클릭해도 아무 일도 안 일어난다(정적 타일)', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<KpiTile label="총 설비 수" value={10} onOpen={onOpen} />);

    await user.click(screen.getByText('총 설비 수'));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('detail이 있으면 클릭 시 onOpen이 호출된다', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<KpiTile label="총 설비 수" value={10} detail={<p>상세</p>} onOpen={onOpen} />);

    await user.click(screen.getByText('총 설비 수'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('열려 있을 때 ESC를 누르면 onClose가 호출된다', () => {
    const onClose = vi.fn();
    render(<KpiTile label="총 설비 수" value={10} detail={<p>상세 내용</p>} isOpen onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('닫혀 있을 때 ESC를 눌러도 onClose가 호출되지 않는다', () => {
    const onClose = vi.fn();
    render(<KpiTile label="총 설비 수" value={10} detail={<p>상세 내용</p>} isOpen={false} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('배경 클릭이나 닫기 버튼으로도 onClose가 호출된다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<KpiTile label="총 설비 수" value={10} detail={<p>상세 내용</p>} isOpen onClose={onClose} />);

    await user.click(screen.getByLabelText('닫기'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

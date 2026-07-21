import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EquipmentDetail from './EquipmentDetail';
import { useAppStore } from '../store';
import type { Equipment } from '../types';

// 설비 수정과 연결설비 추가/해제가 실제로 store를 (양방향으로) 갱신하는지 검증.
// 연결설비 양방향 불변식은 이번 세션 내내 여러 화면(EquipmentDetail, ConnectionPopover)에서
// 지켜야 했던 규칙이라 회귀 테스트로 고정해둘 가치가 있음.
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

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/equipment/${id}`]}>
      <Routes>
        <Route path="/equipment/:id" element={<EquipmentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EquipmentDetail', () => {
  beforeEach(() => {
    useAppStore.setState({
      equipments: [
        equipment({ 설비ID: 'E-001', 설비명: '공조기 1호기' }),
        equipment({ 설비ID: 'E-002', 설비명: '공조기 2호기' }),
      ],
      histories: [],
      loaded: true,
    });
  });

  it('존재하지 않는 설비ID면 안내 문구를 보여준다', () => {
    renderDetail('E-999');
    expect(screen.getByText(/찾을 수 없습니다/)).toBeInTheDocument();
  });

  it('수정 폼으로 필드를 바꾸면 store가 갱신된다', async () => {
    const user = userEvent.setup();
    renderDetail('E-001');

    await user.click(screen.getByRole('button', { name: '수정' }));
    const nameInput = screen.getByLabelText(/설비명/);
    await user.clear(nameInput);
    await user.type(nameInput, '공조기 1호기(개명)');
    await user.click(screen.getByRole('button', { name: '저장' }));

    const updated = useAppStore.getState().equipments.find((e) => e.설비ID === 'E-001');
    expect(updated?.설비명).toBe('공조기 1호기(개명)');
    expect(await screen.findByText('공조기 1호기(개명)')).toBeInTheDocument();
  });

  it('연결 추가 시 양쪽 설비의 연결설비 배열이 모두 갱신된다', async () => {
    const user = userEvent.setup();
    renderDetail('E-001');

    await user.selectOptions(screen.getByRole('combobox'), 'E-002');
    await user.click(screen.getByRole('button', { name: '연결 추가' }));

    const [e1, e2] = useAppStore.getState().equipments;
    expect(e1.연결설비).toEqual(['E-002']);
    expect(e2.연결설비).toEqual(['E-001']);
    expect(await screen.findByText('공조기 2호기')).toBeInTheDocument();
  });

  it('연결 해제 시 양쪽 설비의 연결설비 배열에서 모두 제거된다', async () => {
    useAppStore.setState({
      equipments: [
        equipment({ 설비ID: 'E-001', 설비명: '공조기 1호기', 연결설비: ['E-002'] }),
        equipment({ 설비ID: 'E-002', 설비명: '공조기 2호기', 연결설비: ['E-001'] }),
      ],
    });
    const user = userEvent.setup();
    renderDetail('E-001');

    await user.click(screen.getByLabelText('공조기 2호기 연결 해제'));

    const [e1, e2] = useAppStore.getState().equipments;
    expect(e1.연결설비).toEqual([]);
    expect(e2.연결설비).toEqual([]);
  });

  it('삭제 확인 후 store에서 제거되고 다른 설비의 연결설비 참조도 정리된다', async () => {
    useAppStore.setState({
      equipments: [
        equipment({ 설비ID: 'E-001', 설비명: '공조기 1호기', 연결설비: ['E-002'] }),
        equipment({ 설비ID: 'E-002', 설비명: '공조기 2호기', 연결설비: ['E-001'] }),
      ],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderDetail('E-001');

    await user.click(screen.getByRole('button', { name: '삭제' }));

    const remaining = useAppStore.getState().equipments;
    expect(remaining.find((e) => e.설비ID === 'E-001')).toBeUndefined();
    expect(remaining.find((e) => e.설비ID === 'E-002')?.연결설비).toEqual([]);
    vi.restoreAllMocks();
  });

  // 예전엔 이력 추가/삭제가 /history 화면에만 있어서 설비를 보다가 바로 기록을 남길
  // 방법이 없었음(2026-07-21 요청) — 이 화면에서 바로 추가/삭제되는지 검증.
  it('+ 이력 추가 폼으로 등록하면 이 설비ID로 store에 반영된다', async () => {
    const user = userEvent.setup();
    renderDetail('E-001');

    await user.click(screen.getByRole('button', { name: '+ 이력 추가' }));
    fireEvent.change(screen.getByLabelText(/날짜 \*/), { target: { value: '2026-07-21' } });
    await user.type(screen.getByLabelText(/제목 \*/), '필터 교체');
    await user.click(screen.getByRole('button', { name: '등록' }));

    const added = useAppStore.getState().histories[0];
    expect(added.설비ID).toBe('E-001');
    expect(added.제목).toBe('필터 교체');
    expect(added.날짜).toBe('2026-07-21');
    expect(await screen.findByText('필터 교체')).toBeInTheDocument();
  });

  it('이력 목록의 ✕ 버튼(확인 후)으로 삭제하면 store에서 제거된다', async () => {
    useAppStore.setState({
      histories: [{ id: 'h-1', 날짜: '2026-07-01', 설비ID: 'E-001', 유형: '점검', 제목: '정기점검', 출처파일: '테스트' }],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderDetail('E-001');

    await user.click(screen.getByLabelText('정기점검 이력 삭제'));

    expect(useAppStore.getState().histories).toHaveLength(0);
    vi.restoreAllMocks();
  });

  // 상세사양은 그동안 업로드 파이프라인이 채운 값을 보기만 했음(2026-07-21 요청 전) —
  // 기본정보 수정모드와 별개로 추가/수정/삭제되는지 검증.
  describe('상세사양 편집', () => {
    it('+ 사양 추가 폼으로 등록하면 store에 반영된다', async () => {
      const user = userEvent.setup();
      renderDetail('E-001');

      await user.click(screen.getByRole('button', { name: '+ 사양 추가' }));
      await user.type(screen.getByPlaceholderText('항목명 (예: 정격전압)'), '정격전압');
      await user.type(screen.getByPlaceholderText('값'), '380V');
      await user.click(screen.getByRole('button', { name: '추가' }));

      const updated = useAppStore.getState().equipments.find((e) => e.설비ID === 'E-001');
      expect(updated?.상세사양).toEqual({ 정격전압: '380V' });
      expect(await screen.findByText('380V', { exact: false })).toBeInTheDocument();
    });

    it('기존 사양 값을 수정하면 store가 갱신된다', async () => {
      useAppStore.setState({
        equipments: [equipment({ 설비ID: 'E-001', 설비명: '공조기 1호기', 상세사양: { 정격전압: '220V' } })],
      });
      const user = userEvent.setup();
      renderDetail('E-001');

      await user.click(screen.getByLabelText('정격전압 수정'));
      const input = screen.getByDisplayValue('220V');
      await user.clear(input);
      await user.type(input, '380V');
      await user.click(screen.getByRole('button', { name: '저장' }));

      const updated = useAppStore.getState().equipments.find((e) => e.설비ID === 'E-001');
      expect(updated?.상세사양).toEqual({ 정격전압: '380V' });
    });

    it('사양을 삭제(확인 후)하면 그 키만 store에서 제거된다', async () => {
      useAppStore.setState({
        equipments: [
          equipment({ 설비ID: 'E-001', 설비명: '공조기 1호기', 상세사양: { 정격전압: '220V', 정격전류: '10A' } }),
        ],
      });
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const user = userEvent.setup();
      renderDetail('E-001');

      await user.click(screen.getByLabelText('정격전압 삭제'));

      const updated = useAppStore.getState().equipments.find((e) => e.설비ID === 'E-001');
      expect(updated?.상세사양).toEqual({ 정격전류: '10A' });
      vi.restoreAllMocks();
    });
  });
});

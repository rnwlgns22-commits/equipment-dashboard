import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import { useAppStore } from '../store';
import type { Equipment, HistoryRecord } from '../types';

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

function history(overrides: Partial<HistoryRecord> & { id: string }): HistoryRecord {
  return { 날짜: '2026-01-01', 유형: '점검', 제목: '테스트 이력', 출처파일: '테스트', ...overrides };
}

afterEach(() => {
  useAppStore.setState({ equipments: [], histories: [], parts: [], loaded: false });
});

// 이력 페이지 스텁 — 실제 HistoryBrowser.tsx는 무거워서(파일 파이프라인 등) 그대로
// 마운트하지 않고, GlobalSearch가 넘긴 location.state.presetQuery를 잘 받는지만
// 확인하는 최소 스텁으로 대체.
function HistoryStub() {
  const location = useLocation();
  const preset = (location.state as { presetQuery?: string } | null)?.presetQuery;
  return <div>이력 화면 (presetQuery: {preset ?? '없음'})</div>;
}

function renderWithRoutes(initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/dashboard" element={<GlobalSearch />} />
        <Route path="/equipment/:id" element={<div>설비 상세 화면</div>} />
        <Route path="/history" element={<HistoryStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GlobalSearch', () => {
  it('트리거 버튼을 클릭하면 모달이 열리고 입력창에 포커스된다', async () => {
    const user = userEvent.setup();
    renderWithRoutes();

    await user.click(screen.getByRole('button', { name: /설비·이력·자재 검색/ }));
    const input = screen.getByPlaceholderText('설비명·ID·위치·점검이력·자재 검색…');
    // 포커스는 requestAnimationFrame 안에서 걸려서(GlobalSearch.tsx) 한 틱 기다려야 함.
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('검색어를 입력하면 종류별로 그룹핑된 결과가 뜬다', async () => {
    const user = userEvent.setup();
    useAppStore.setState({
      equipments: [equipment({ 설비ID: 'AHU-01', 설비명: '공조기 1호기' })],
      histories: [history({ id: 'h1', 설비ID: 'AHU-01', 제목: '공조기 필터 교체' })],
      loaded: true,
    });
    renderWithRoutes();

    await user.click(screen.getByRole('button', { name: /설비·이력·자재 검색/ }));
    await user.type(screen.getByPlaceholderText('설비명·ID·위치·점검이력·자재 검색…'), '공조기');

    expect(screen.getByText('공조기 1호기')).toBeInTheDocument();
    expect(screen.getByText('공조기 필터 교체')).toBeInTheDocument();
    expect(screen.getByText('설비')).toBeInTheDocument();
    expect(screen.getByText('점검·수리 이력')).toBeInTheDocument();
  });

  it('설비 결과를 클릭하면 설비 상세 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    useAppStore.setState({
      equipments: [equipment({ 설비ID: 'AHU-01', 설비명: '공조기 1호기' })],
      histories: [],
      loaded: true,
    });
    renderWithRoutes();

    await user.click(screen.getByRole('button', { name: /설비·이력·자재 검색/ }));
    await user.type(screen.getByPlaceholderText('설비명·ID·위치·점검이력·자재 검색…'), '공조기');
    await user.click(screen.getByText('공조기 1호기'));

    expect(await screen.findByText('설비 상세 화면')).toBeInTheDocument();
  });

  it('이력 결과를 클릭하면 이력 화면으로 이동하며 제목을 presetQuery로 넘긴다', async () => {
    const user = userEvent.setup();
    useAppStore.setState({
      equipments: [],
      histories: [history({ id: 'h1', 제목: '베어링 교체' })],
      loaded: true,
    });
    renderWithRoutes();

    await user.click(screen.getByRole('button', { name: /설비·이력·자재 검색/ }));
    await user.type(screen.getByPlaceholderText('설비명·ID·위치·점검이력·자재 검색…'), '베어링');
    await user.click(screen.getByText('베어링 교체'));

    expect(await screen.findByText('이력 화면 (presetQuery: 베어링 교체)')).toBeInTheDocument();
  });

  it('Escape로 닫으면 트리거 버튼으로 포커스가 돌아온다', async () => {
    const user = userEvent.setup();
    renderWithRoutes();

    const trigger = screen.getByRole('button', { name: /설비·이력·자재 검색/ });
    await user.click(trigger);
    expect(screen.getByPlaceholderText('설비명·ID·위치·점검이력·자재 검색…')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByPlaceholderText('설비명·ID·위치·점검이력·자재 검색…')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

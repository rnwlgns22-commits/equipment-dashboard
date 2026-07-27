import { Suspense, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store';
import ThemeToggle from './ThemeToggle';
import ToastContainer from './ToastContainer';
import GlobalSearch from './GlobalSearch';
import NotificationManager from './NotificationManager';

// 텍스트 한 줄("불러오는 중…")만 보이던 걸 스켈레톤으로 교체(2026-07-25) — 특히
// three.js를 통째로 물고 오는 그래프뷰처럼 lazy 로드가 체감되는 화면에서 개선.
// 어느 라우트든 재사용하는 범용 모양이라 페이지별 실제 레이아웃과 완전히
// 일치하진 않지만, 빈 화면보다 로딩 중이라는 걸 훨씬 잘 전달함.
function RouteFallback() {
  return (
    <div className="p-6 md:p-8 space-y-6 animate-pulse">
      <div className="h-7 w-48 rounded-lg bg-card" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-card border border-border" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-card border border-border" />
    </div>
  );
}

const navItems = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/equipment', label: '설비 목록', end: true },
  { to: '/equipment/add', label: '설비 추가' },
  { to: '/mapping', label: '레이아웃 매핑' },
  { to: '/graph', label: '관계 그래프' },
  { to: '/history', label: '점검·수리 이력' },
  { to: '/legal-inspection', label: '법정점검' },
  { to: '/regular-inspection', label: '정기점검' },
  { to: '/inventory', label: '자재·재고관리' },
  { to: '/settings', label: '설정 / 데이터' },
];

export default function Layout() {
  const clearData = useAppStore((s) => s.clearData);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg text-text">
      {/* 모바일 전용 상단바 — 사이드바가 폭을 다 차지해버려서(390px에서 컨텐츠가
          166px로 눌리던 문제, 2026-07-19 발견) md 미만에서는 사이드바를 드로어로 뺌 */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-bg-soft shrink-0">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="text-text-dim hover:text-text"
          aria-label="메뉴 열기"
        >
          ☰
        </button>
        <div className="text-sm font-medium">설비관리 대시보드</div>
        <ThemeToggle />
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-bg-soft flex flex-col transition-transform duration-200 md:static md:z-auto md:w-56 md:shrink-0 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-6 space-y-3">
          <div>
            <div className="text-lg font-semibold tracking-tight">설비관리 대시보드</div>
            <div className="text-xs text-text-dim mt-1">클라이언트 전용 · 서버 없음</div>
          </div>
          <ThemeToggle />
          <GlobalSearch />
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-dim hover:bg-white/5 hover:text-text'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-1">
          <NavLink
            to="/guide"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-accent/15 text-accent' : 'text-text-dim hover:bg-white/5 hover:text-text'
              }`
            }
          >
            기능설명
          </NavLink>
        </div>
        <div className="px-3 pb-5">
          <button
            type="button"
            onClick={clearData}
            className="w-full rounded-lg px-3 py-2 text-sm text-text-dim hover:bg-white/5 hover:text-text transition-colors text-left"
          >
            ← 데이터 비우고 나가기
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Suspense fallback={<RouteFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      <ToastContainer />
      <NotificationManager />
    </div>
  );
}

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
    // 배경화면은 body가 그리므로 여기서 bg를 칠하면 유리 뒤가 가려짐 — 투명하게 둠
    <div className="min-h-screen flex flex-col md:flex-row text-text">
      {/* 모바일 전용 상단바 — 사이드바가 폭을 다 차지해버려서(390px에서 컨텐츠가
          166px로 눌리던 문제, 2026-07-19 발견) md 미만에서는 사이드바를 드로어로 뺌 */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 glass depth-2 shrink-0 sticky top-0 z-30">
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 사이드바를 유리판으로 — 뒤의 공간감 배경(ambient-depth)이 비쳐 보이면서
          본문보다 한 층 앞에 떠 있는 판처럼 읽힘. 데스크톱에선 static이라 배경이
          거의 안 비치므로 오른쪽 depth 그림자로 층을 만든다. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 glass depth-3 flex flex-col transition-transform duration-200 md:static md:z-10 md:w-56 md:shrink-0 md:translate-x-0 ${
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
                // 활성 항목은 색만 바꾸는 대신 앞으로 튀어나온 판처럼 — 그림자 +
                // 살짝 오른쪽 이동으로 "선택된 것이 위에 있다"를 깊이로 표현
                `block rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-accent/15 text-accent depth-2 translate-x-1'
                    : 'text-text-dim hover:bg-white/5 hover:text-text hover:translate-x-1'
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
              `block rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-accent/15 text-accent depth-2 translate-x-1'
                  : 'text-text-dim hover:bg-white/5 hover:text-text hover:translate-x-1'
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
      {/* persp를 main에 걸어야 아래 페이지 전환의 z축 이동이 원근으로 보임.
          relative z-10은 ambient-depth의 고정 배경(z-0) 위에 본문을 올리기 위함. */}
      <main className="relative z-10 flex-1 min-w-0 overflow-x-hidden persp">
        <Suspense fallback={<RouteFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              // 평면 페이드 대신 뒤에서 앞으로 들어옴 — 화면이 겹겹이 쌓인
              // 공간이라는 인상을 라우팅에서도 유지(2026-08-07 입체화).
              // 거리는 짧게: 페이지 이동은 매번 일어나므로 크면 금방 피로해짐.
              initial={{ opacity: 0, z: -60, scale: 0.985 }}
              animate={{ opacity: 1, z: 0, scale: 1 }}
              exit={{ opacity: 0, z: 40, scale: 1.01 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: 'preserve-3d' }}
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

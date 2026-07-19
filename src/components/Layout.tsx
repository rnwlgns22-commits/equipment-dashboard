import { NavLink, Outlet } from 'react-router-dom';
import { useAppStore } from '../store';

const navItems = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/equipment', label: '설비 목록' },
  { to: '/mapping', label: '레이아웃 매핑' },
  { to: '/graph', label: '관계 그래프' },
];

export default function Layout() {
  const clearData = useAppStore((s) => s.clearData);

  return (
    <div className="min-h-screen flex bg-bg text-text">
      <aside className="w-56 shrink-0 border-r border-border bg-bg-soft flex flex-col">
        <div className="px-5 py-6">
          <div className="text-lg font-semibold tracking-tight">설비관리 대시보드</div>
          <div className="text-xs text-text-dim mt-1">클라이언트 전용 · 서버 없음</div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
        <Outlet />
      </main>
    </div>
  );
}

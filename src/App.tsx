import { lazy, useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore, hydrateFromDb } from './store';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import MascotHelp from './components/MascotHelp';

// 대시보드/설비목록/이력은 가벼워서 즉시 로드. 무거운 의존성을 끌고 오는 화면만
// lazy — 그래프 뷰는 three.js(react-force-graph-3d)를 통째로 물고 있어서 초기
// 번들에서 빼는 효과가 가장 큼(설계.md README "알려진 제약" 참고).
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EquipmentList = lazy(() => import('./pages/EquipmentList'));
const EquipmentDetail = lazy(() => import('./pages/EquipmentDetail'));
const AddEquipment = lazy(() => import('./pages/AddEquipment'));
const Mapping = lazy(() => import('./pages/Mapping'));
const GraphView = lazy(() => import('./pages/GraphView'));
const HistoryBrowser = lazy(() => import('./pages/HistoryBrowser'));
const Settings = lazy(() => import('./pages/Settings'));

function RequireData({ children }: { children: ReactNode }) {
  const loaded = useAppStore((s) => s.loaded);
  if (!loaded) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrateFromDb().finally(() => setHydrated(true));
  }, []);

  if (!hydrated) return null;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          element={
            <RequireData>
              <Layout />
            </RequireData>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/equipment" element={<EquipmentList />} />
          <Route path="/equipment/add" element={<AddEquipment />} />
          <Route path="/equipment/:id" element={<EquipmentDetail />} />
          <Route path="/mapping" element={<Mapping />} />
          <Route path="/graph" element={<GraphView />} />
          <Route path="/history" element={<HistoryBrowser />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <MascotHelp />
    </HashRouter>
  );
}

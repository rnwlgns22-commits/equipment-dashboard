import type { ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import EquipmentList from './pages/EquipmentList';
import EquipmentDetail from './pages/EquipmentDetail';
import Mapping from './pages/Mapping';
import GraphView from './pages/GraphView';
import HistoryBrowser from './pages/HistoryBrowser';
import Settings from './pages/Settings';
import MascotHelp from './components/MascotHelp';

function RequireData({ children }: { children: ReactNode }) {
  const loaded = useAppStore((s) => s.loaded);
  if (!loaded) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
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

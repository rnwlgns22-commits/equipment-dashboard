import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './themeStore' // App보다 먼저 import — 렌더 전에 저장된 테마를 즉시 적용(깜빡임 방지)
import App from './App.tsx'

// 페이지별 lazy import 청크는 배포마다 파일명 해시가 바뀌는데, 탭을 켜둔 채로
// 그 사이에 재배포가 일어나면 브라우저가 기억하는 옛 해시 파일이 서버에서 이미
// 지워져 있어 404 → 이 에러를 받아줄 ErrorBoundary가 없어서 흰 화면으로 멈춤
// (Ctrl+Shift+R로만 복구되던 문제, 2026-07-25 발견). Vite가 이럴 때 쏘는
// vite:preloadError를 감지해서 자동으로 한 번 새로고침 — 무한 새로고침 방지용
// 세션 플래그를 둠(진짜 네트워크가 끊긴 경우엔 한 번만 시도하고 포기).
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('reloaded-after-preload-error')) return;
  sessionStorage.setItem('reloaded-after-preload-error', 'true');
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

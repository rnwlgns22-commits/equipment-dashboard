import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './themeStore' // App보다 먼저 import — 렌더 전에 저장된 테마를 즉시 적용(깜빡임 방지)
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // 완전 클라이언트 전용(IndexedDB) 앱이라 PWA로 설치·오프라인 실행이 자연스럽게
    // 맞음 — 현장에서 홈 화면에 설치해 앱처럼 쓰기 위함(2026-07-25 추가).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '설비관리 대시보드',
        short_name: '설비관리',
        description: '설비·점검이력·자재재고를 관리하는 클라이언트 전용 대시보드',
        lang: 'ko',
        theme_color: '#0b0e14',
        background_color: '#0b0e14',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: './',
})

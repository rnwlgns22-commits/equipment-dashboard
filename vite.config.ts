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
      // 기본 generateSW는 빌드 산출물을 통째로 프리캐시함 — 그래프뷰(three.js,
      // 1.4MB)·업로드파이프라인(1.16MB)까지 설치 시점에 다 받아버려서, 원래
      // App.tsx에서 lazy loading으로 "방문할 때만 받기"로 뺀 의도가 무력화됨
      // (2026-07-26 발견). 이 두 개만 globIgnores로 프리캐시에서 빼고,
      // runtimeCaching으로 "실제로 그 페이지에 들어갈 때 받아서 캐싱"하도록 바꿈 —
      // 첫 방문 후엔 오프라인에서도 그대로 캐시에서 씀.
      workbox: {
        globIgnores: ['**/GraphView-*.js', '**/uploadPipeline-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(GraphView|uploadPipeline)-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'heavy-chunks',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
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

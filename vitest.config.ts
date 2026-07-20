import { defineConfig } from 'vitest/config';

// 순수 로직(lib/*)만 테스트 대상 — DOM/캔버스/IndexedDB가 필요한 화면은 이미
// Playwright 브라우저 검증으로 커버(README "진행 상황" 참고). node 환경으로 충분.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

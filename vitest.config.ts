import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// jsdom은 node 전역도 그대로 제공하므로 lib/*.test.ts(순수 로직)도 문제없이 돌아감 —
// *.test.tsx(페이지/컴포넌트 렌더링)에 DOM + fake-indexeddb(store.ts가 Dexie로 실제
// IndexedDB에 쓰기 때문에 폴리필 필요)가 필요해서 environmentMatchGlobs 대신 전체를
// jsdom으로 통일(경로에 한글이 섞여 있으면 glob 매칭이 깨지는 걸 피하기 위함).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // globals: true — Testing Library의 자동 cleanup(afterEach)이 전역 afterEach를
    // 찾아서 등록되는데, 이게 없으면 한 파일 안의 렌더가 테스트마다 쌓여서
    // "여러 요소 발견" 오류로 이어짐.
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});

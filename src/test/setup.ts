import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// pdfjs-dist가 모듈 로드 시점에 `new DOMMatrix()`를 즉시 실행하는데(canvas.js 상단
// 상수), jsdom엔 DOMMatrix가 없어서 lib/convert.ts를 import하기만 해도(uploadPipeline
// 테스트처럼 xlsx 경로만 써도) 곧바로 터짐. 실제 좌표계산은 테스트에서 안 쓰므로
// 아무 동작 안 하는 더미로 충분(2026-07-21, uploadPipeline.test.ts 작성 중 발견).
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-expect-error 테스트 환경 전용 더미 폴리필 — 실제 DOMMatrix 스펙을 구현하지 않음
  globalThis.DOMMatrix = class DOMMatrix {};
}

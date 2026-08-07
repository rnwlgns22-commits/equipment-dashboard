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

// jsdom엔 IntersectionObserver가 없어서 framer-motion의 whileInView(Reveal 컴포넌트가
// 스크롤 리빌에 사용)가 마운트되자마자 터짐(2026-07-25, Reveal 도입하며 발견). 실제
// 교차 판정은 테스트에서 의미 없으므로 아무 동작 안 하는 더미로 충분.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  // @ts-expect-error 테스트 환경 전용 더미 폴리필 — 실제로 교차를 계산하지 않음
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom엔 window.matchMedia도 없음 — Tilt3D가 호버 가능 여부/모션 감소 설정을
// 이걸로 확인하는데, 카드를 클릭·호버하는 테스트마다 uncaught로 터졌음
// (2026-08-07 입체화 작업 중 발견). matches:false로 답하게 해두면 테스트
// 환경에서는 틸트가 꺼진 상태로 렌더돼서 기존 동작 검증에 영향이 없다.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  });
}

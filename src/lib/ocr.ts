// 스캔 PDF(텍스트 레이어 없는 이미지) 대응 — 설계.md §2/§9가 애초에 예견해둔 OCR 폴백.
// 실제 볼트 첨부파일 85개로 검증했을 때 pdf 14개 중 13개가 스캐너 출력물이라 텍스트를
// 하나도 못 뽑았던 것(README "알려진 제약" 참고)을 이걸로 구제.
//
// tesseract.js 자체와 언어데이터(~15MB, kor+eng)는 여기서만 필요하므로 이 파일 전체를
// convert.ts의 convertPdf()에서 텍스트가 거의 없을 때만 동적 import 한다 — 정적으로
// 물면 uploadPipeline 청크가 다시 부풀어 오르는(2026-07-20 개발노트에 이미 한 번
// 겪은 실수) 것과 같은 문제가 생기므로 주의.
//
// 언어데이터는 tesseract.js 기본 설정대로 CDN(jsdelivr)에서 받아옴 — 사용자 파일 자체는
// 여전히 브라우저를 안 떠나고(§1 원칙), OCR 엔진 리소스만 최초 1회 CDN에서 받는 것.
import type { PDFDocumentProxy } from 'pdfjs-dist';

async function renderPageToCanvas(doc: PDFDocumentProxy, pageNum: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNum);
  // 스캔본은 저해상도로 렌더링하면 OCR 정확도가 떨어져서 2배 스케일로 렌더
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스 컨텍스트를 만들 수 없음');
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas;
}

export async function ocrPdf(doc: PDFDocumentProxy, onProgress?: (page: number, total: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('kor+eng');
  try {
    const texts: string[] = [];
    // 스캔 문서가 많아도 페이지 수십 장씩 OCR 돌리면 너무 오래 걸리므로 앞 5페이지로 제한
    // (점검·수리 기록류는 보통 1~2페이지라 실사용에서는 거의 안 걸림).
    const pageCount = Math.min(doc.numPages, 5);
    for (let i = 1; i <= pageCount; i += 1) {
      onProgress?.(i, pageCount);
      const canvas = await renderPageToCanvas(doc, i);
      const { data } = await worker.recognize(canvas);
      texts.push(data.text);
    }
    return texts.join('\n\n');
  } finally {
    await worker.terminate();
  }
}

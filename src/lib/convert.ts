// _스크립트\sync_documents.py의 변환기들을 브라우저용으로 포팅.
// 설계.md는 이 로직을 Web Worker 안에 두라고 했는데(§2), pdfjs-dist가 자체 워커
// (workerSrc)로 무거운 파싱을 이미 오프로드하고 xlsx/mammoth/JSZip은 개별 문서
// 단위로는 빠른 편이라 이번 구현은 메인 스레드에서 직접 돌림 — 폴더가 수백 개
// 파일 규모로 커지면 그때 커스텀 Worker로 감싸는 걸 Phase 4 성능 항목으로 남김.
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
// eslint-disable-next-line import/no-unresolved
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { isDrmLocked } from './classify';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ConvertResult {
  content: string;
  error?: string;
}

function rowToBullet(cells: string[]): string | null {
  const vals = cells.map((c) => c.trim()).filter(Boolean);
  if (vals.length === 0) return null;
  return '- ' + vals.join(' · ');
}

// 산출기초조사서 등 열 구조(품명/수량/단가/금액)를 그대로 읽어야 하는 전용 파서용 —
// convertXlsx의 rowToBullet은 셀을 " · "로 이어붙여 열 위치 정보를 날려버려서 못 씀.
// raw:false(convertXlsx가 쓰는 옵션)는 셀 표시서식으로 반올림된 문자열을 주는데, 금액
// 파싱엔 원래 숫자값이 필요해서 여기선 기본(raw:true) 그대로 두고 String()만 씌운다.
export async function readXlsxRowsRaw(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  return rows.map((row) => row.map((c) => (c === null || c === undefined ? '' : String(c))));
}

async function convertXlsx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const out: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    out.push(`## 시트: ${sheetName}\n`);
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
    for (const row of rows) {
      const bullet = rowToBullet(row.map(String));
      if (bullet) out.push(bullet);
    }
    out.push('');
  }
  return out.join('\n');
}

// 텍스트 레이어에서 이 정도도 못 뽑으면 스캔(이미지) PDF로 보고 OCR로 폴백한다 —
// 실제 볼트 첨부파일 검증(2026-07-20)에서 scan_*.pdf류가 텍스트를 하나도 못 뽑던
// 문제(README "알려진 제약" 참고)를 이걸로 구제.
const OCR_FALLBACK_THRESHOLD = 20;

async function convertPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const texts: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ');
    texts.push(text);
  }
  const extracted = texts.join('\n\n');
  if (extracted.trim().length >= OCR_FALLBACK_THRESHOLD) return extracted;

  // tesseract.js는 여기서만 필요해서 동적 import — 정적으로 물면 이 파일을 쓰는
  // uploadPipeline 청크가 다시 부풀어 오름(2026-07-20 개발노트의 번들 크기 실수와
  // 같은 유형이라 주의). OCR 자체가 실패해도(네트워크로 언어데이터를 못 받는 등)
  // 원래 텍스트 추출 결과를 그대로 반환 — 업로드 자체를 막지 않는다.
  try {
    const { ocrPdf } = await import('./ocr');
    const ocrText = await ocrPdf(doc);
    return ocrText.trim().length > extracted.trim().length ? ocrText : extracted;
  } catch {
    return extracted;
  }
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function convertHwpx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const texts: string[] = [];
  for (const path of Object.keys(zip.files)) {
    if (path.startsWith('Contents/') && path.endsWith('.xml')) {
      const xml = await zip.files[path].async('string');
      const txt = stripXmlTags(xml);
      if (txt) texts.push(txt);
    }
  }
  return texts.join('\n\n');
}

async function convertPptx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort();
  const texts: string[] = [];
  for (const path of slidePaths) {
    const xml = await zip.files[path].async('string');
    const txt = stripXmlTags(xml);
    if (txt) texts.push(txt);
  }
  return texts.join('\n\n');
}

async function convertDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}

export async function convertFile(file: File): Promise<ConvertResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isDrmLocked(bytes)) {
    return { content: '', error: 'DRM 잠김(Fasoo) — 원본 프로그램에서 보안 해제 후 다시 올려주세요' };
  }
  const ext = file.name.toLowerCase().split('.').pop();
  try {
    switch (ext) {
      case 'xlsx':
      case 'xls':
        return { content: await convertXlsx(file) };
      case 'pdf':
        return { content: await convertPdf(file) };
      case 'hwpx':
        return { content: await convertHwpx(file) };
      case 'pptx':
        return { content: await convertPptx(file) };
      case 'docx':
        return { content: await convertDocx(file) };
      case 'hwp':
        return { content: '', error: '구버전 .hwp는 브라우저에서 지원 안 함 — hwpx로 다시 저장해서 올려주세요' };
      default:
        return { content: '', error: '지원하지 않는 형식' };
    }
  } catch (e) {
    return { content: '', error: `변환 오류: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export const CONVERTIBLE_EXTS = new Set(['hwp', 'hwpx', 'xls', 'xlsx', 'pdf', 'pptx', 'docx']);

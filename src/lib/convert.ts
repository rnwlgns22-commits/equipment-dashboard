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
  return texts.join('\n\n');
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

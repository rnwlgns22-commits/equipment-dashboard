// 설계.md §7은 원래 classify_rules.py를 지목했지만, 그건 사진 파일명을
// KEEP/EXCLUDE/DISCARD로 거르는 별개 용도(sync_photos.py/sync_kakao.py 전용)라
// 문서 업로드 파이프라인과 안 맞음. 실제로 맞는 원본은 _스크립트\sync_documents.py의
// 분류 로직(TYPE_RULES/TRADE_RULES/find_dates/looks_like_ledger 등)이라 그걸 포팅함
// (2026-07-19 정정). SITE_KEYWORDS(역/로터리/시장/로타리)는 이 부서 전용 지명이라
// 포팅하지 않음 — 사이트는 업로드된 폴더 경로에서 뽑는다(§4.3).
import type { Category } from '../types';

const TYPE_RULES: [Category, string[]][] = [
  ['승강기', ['에스컬레이터', '승강기', 'ES']],
  ['소방', ['소화기', '소방', '비상조명', '재난관리자원', '방화', '스프링클러', '감지기', '경종']],
  ['공조', ['공조기', 'AHU']],
  ['냉난방', ['냉온수기', '냉각탑', '버너', 'FCU', '패키지에어컨', 'PAC']],
  ['급배수', ['펌프', '집수정', '양수기']],
  ['통신', ['통신', 'TRS', '무선통신', '인터폰', 'DMB', 'CCTV', '폐쇄회로', '교환기', '무전기', '방송설비', '네트워크']],
  ['전기', ['변압기', '전기', '발전', '차단기', 'ACB', 'VCB', 'LBS', 'ATS', 'MOF', '수변전']],
];

const TRADE_RULES: [string, string[]][] = [
  ['소방', ['소화기', '소방', '비상조명', '재난관리자원', '방화', '스프링클러', '화재', '감지기', '경종']],
  ['통신', ['통신', 'TRS', '무선통신', '인터폰', 'DMB', 'CCTV', '폐쇄회로', '교환기', '무전기', '방송설비', '네트워크']],
  ['전기', ['변압기', '전기', '발전', '차단기', 'ACB', 'VCB', 'LBS', 'ATS', 'MOF', '수변전', '배전', '조명', 'LED']],
  [
    '기계',
    ['공조기', 'AHU', '냉온수기', '냉각탑', '버너', 'FCU', '패키지에어컨', 'PAC', '펌프', '집수정', '양수기', '배관', '밸브', '승강기', '에스컬레이터', '엘리베이터'],
  ],
];

// 원본 sync_documents.py의 classify_type/classify_trade는 짧은 영문 키워드도 그냥
// 부분일치(kw in hay)로 봐서, "TEST-500"처럼 우연히 "ES"를 포함하는 모델명이 승강기로
// 오분류되는 잠재 버그가 있었음(classify_rules.py의 LATIN_SHORT_KEYWORDS만 이 문제를
// 막아뒀었음). 브라우저 포팅 중 실제 테스트 데이터로 재현돼서(2026-07-19), 짧은 영문
// 약어는 단어 경계를 확인하도록 여기서 고침 — 로직 재발명이 아니라 같은 코드베이스
// 안에 이미 있던 안전장치를 가져와 적용한 것.
const SHORT_LATIN_KEYWORDS = new Set(['ES', 'AHU', 'FCU', 'PAC', 'ACB', 'VCB', 'LBS', 'ATS', 'MOF', 'TRS', 'DMB', 'LED']);

function keywordHit(keyword: string, hay: string): boolean {
  if (SHORT_LATIN_KEYWORDS.has(keyword.toUpperCase())) {
    const re = new RegExp(`(?<![a-zA-Z0-9])${keyword}(?![a-zA-Z0-9])`, 'i');
    return re.test(hay);
  }
  return hay.includes(keyword);
}

const DATE_PATTERNS = [
  /(20\d{2})[.\-/\s]\s*(\d{1,2})[.\-/\s]\s*(\d{1,2})/g,
  /(?<!\d)(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})(?!\d)/g,
  /(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g,
];

export function findDates(text: string): Date[] {
  const found: Date[] = [];
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text))) {
      let y = parseInt(m[1], 10);
      if (y < 100) y += 2000;
      const mo = parseInt(m[2], 10);
      const d = parseInt(m[3], 10);
      if (y >= 2000 && y <= 2035 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        // UTC로 만들어야 나중에 .toISOString().slice(0,10)으로 되돌릴 때
        // 그대로 나옴 — 로컬시간(new Date(y,mo-1,d))으로 만들면 UTC+9 같은 시간대에서
        // toISOString이 하루 전으로 밀림(2026-07-19 실제 업로드 테스트에서 발견).
        const dt = new Date(Date.UTC(y, mo - 1, d));
        if (!Number.isNaN(dt.getTime())) found.push(dt);
      }
    }
  }
  return found;
}

export function maxDate(text: string): Date | null {
  const dates = findDates(text);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

export function classifyCategory(name: string, content: string): Category {
  const hay = name + '\n' + content.slice(0, 500);
  for (const [cat, keywords] of TYPE_RULES) {
    if (keywords.some((k) => keywordHit(k, hay))) return cat;
  }
  return '기타';
}

export function classifyTrade(name: string, content: string): string {
  const hay = name + '\n' + content.slice(0, 800);
  for (const [trade, keywords] of TRADE_RULES) {
    if (keywords.some((k) => keywordHit(k, hay))) return trade;
  }
  return '기타';
}

export function looksLikeLedger(name: string, content: string): boolean {
  if (content.includes('제작회사') || content.includes('설치장소')) return true;
  return classifyCategory(name, content) !== '기타';
}

const ADMIN_KEYWORDS = ['결의서', '수료증', '접수증', '품의', '확인서', '교육비'];
export function looksLikeAdmin(name: string): boolean {
  return ADMIN_KEYWORDS.some((k) => name.includes(k));
}

export function guessHistoryType(content: string): '점검' | '수리' {
  return content.includes('점검') ? '점검' : '수리';
}

// Fasoo DRM 감지 — _스크립트\sync_documents.py의 is_drm() 버그 수정본과 동일 로직
// (b"DRM" 3바이트만 보면 OLE2/zip 바이너리 잡음과 겹쳐 오탐 나던 걸 2026-07-19에 고침).
export function isDrmLocked(bytes: Uint8Array): boolean {
  const head = bytes.slice(0, 128);
  const text = new TextDecoder('latin1').decode(head);
  return text.includes('Fasoo');
}

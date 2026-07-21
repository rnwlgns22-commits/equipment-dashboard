import { describe, it, expect } from 'vitest';
import {
  classifyCategory,
  classifyTrade,
  findDates,
  maxDate,
  looksLikeLedger,
  looksLikeAdmin,
  guessHistoryType,
  isDrmLocked,
} from './classify';

describe('classifyCategory', () => {
  it('키워드로 정상 분류한다', () => {
    expect(classifyCategory('공조기 1호기 이력카드', '')).toBe('공조');
    expect(classifyCategory('2번출구 상행 에스컬레이터', '')).toBe('승강기');
    expect(classifyCategory('냉온수기 정기점검', '')).toBe('냉난방');
  });

  // 2026-07-19 실제 데이터에서 재현된 회귀 케이스 — 짧은 영문 약어가 부분일치로
  // 오분류되던 버그. "TEST-500"의 "ES"가 승강기로 잘못 잡히면 안 됨.
  it('짧은 영문 약어는 단어경계 밖 부분일치로 오분류하지 않는다', () => {
    expect(classifyCategory('TEST-500 성능검사', '')).not.toBe('승강기');
    expect(classifyCategory('KOREA-LED-2024', '')).not.toBe('전기');
  });

  it('단어경계가 지켜지면 짧은 영문 약어도 정상 매칭한다', () => {
    expect(classifyCategory('AHU 필터 교체', '')).toBe('공조');
    expect(classifyCategory('ES 점검표', '')).toBe('승강기');
    expect(classifyCategory('공조기(AHU-01)', '')).toBe('공조');
  });

  it('아무 키워드도 없으면 기타로 분류한다', () => {
    expect(classifyCategory('알수없는문서', '')).toBe('기타');
  });

  it('본문(content)도 분류에 반영한다', () => {
    expect(classifyCategory('제목없음', '이것은 소화기 점검 기록입니다')).toBe('소방');
  });
});

describe('classifyTrade', () => {
  it('기계/전기/통신/소방 계열로 분류한다', () => {
    expect(classifyTrade('펌프 점검', '')).toBe('기계');
    expect(classifyTrade('변압기 점검', '')).toBe('전기');
    expect(classifyTrade('CCTV 점검', '')).toBe('통신');
    expect(classifyTrade('소화기 충전', '')).toBe('소방');
  });

  it('짧은 영문 약어(LED 등)도 단어경계 밖에서는 오분류하지 않는다', () => {
    expect(classifyTrade('SOLED-A 계약서', '')).not.toBe('전기');
  });
});

describe('findDates / maxDate', () => {
  it('YYYY.MM.DD, YYYY-MM-DD, YYYY년 MM월 DD일 패턴을 모두 인식한다', () => {
    expect(findDates('2026.07.20 작업').length).toBe(1);
    expect(findDates('2026-07-20 작업').length).toBe(1);
    expect(findDates('2026년 7월 20일 작업').length).toBe(1);
  });

  // 2026-07-19 실제 업로드 테스트에서 발견된 회귀 케이스 — 로컬시간 생성자를 쓰면
  // UTC+9 등에서 toISOString()이 하루 전으로 밀림. UTC 기준으로 만들어야 한다.
  it('날짜를 UTC 기준으로 만들어 toISOString 왕복 시 하루가 밀리지 않는다', () => {
    const [d] = findDates('2026.01.01 작업내역');
    expect(d.toISOString().slice(0, 10)).toBe('2026-01-01');
  });

  it('범위를 벗어난 월/일은 무시한다', () => {
    expect(findDates('2026.13.40 잘못된 날짜').length).toBe(0);
  });

  it('연도가 2000~2035 범위를 벗어나면 무시한다', () => {
    expect(findDates('1998.05.01 오래된 문서').length).toBe(0);
  });

  it('maxDate는 여러 날짜 중 가장 최근 것을 고른다', () => {
    const result = maxDate('2024.01.01 최초 작성, 2026.03.15 최종 수정');
    expect(result?.toISOString().slice(0, 10)).toBe('2026-03-15');
  });

  it('날짜가 없으면 maxDate는 null을 반환한다', () => {
    expect(maxDate('날짜 없는 문서')).toBeNull();
  });

  // 2026-07-21 실제 업로드 실패 사례("승강기 안전장치 현황 및 상태_26.6월기준.xlsx")에서
  // 발견 — 월간 현황 요약처럼 일(day) 없이 "OO년 OO월"만 있으면 findDates는 못 잡지만
  // maxDate는 그 달 1일로 근사해야 한다(정확한 날짜가 있으면 그쪽을 우선).
  it('일(day) 없이 "N년 N월"만 있어도 maxDate는 그 달 1일로 근사한다', () => {
    expect(maxDate('26년 6월 기준 현황')?.toISOString().slice(0, 10)).toBe('2026-06-01');
    expect(maxDate('2026년 6월 기준 현황')?.toISOString().slice(0, 10)).toBe('2026-06-01');
  });

  it('정확한 날짜가 있으면 연-월만 있는 근사보다 우선한다', () => {
    expect(maxDate('26년 6월 기준, 실제 점검일 2026.06.15')?.toISOString().slice(0, 10)).toBe('2026-06-15');
  });

  // 2026-07-21 산출기초조사서(공문서 하단 날짜 표기) 업로드 지원 추가하며 발견 —
  // "2026. 7.  "처럼 일(day) 없이 점으로만 연.월을 구분하는 형식은 년/월 한글이
  // 없어서 기존 YEAR_MONTH_ONLY_PATTERN이 못 잡았음.
  it('일 없이 점으로만 구분된 "YYYY. M." 형식도 그 달 1일로 근사한다', () => {
    expect(maxDate('2026. 7.  ')?.toISOString().slice(0, 10)).toBe('2026-07-01');
  });

  it('점 형식이라도 일(day)까지 있으면 findDates가 먼저 잡아 정확한 날짜를 쓴다', () => {
    expect(maxDate('2026. 7. 15')?.toISOString().slice(0, 10)).toBe('2026-07-15');
  });

  it('findDates 자체는 일(day) 없는 "년 월"까지 확장하지 않는다', () => {
    expect(findDates('26년 6월 기준 현황').length).toBe(0);
  });
});

describe('looksLikeLedger', () => {
  it('제작회사·설치장소 키워드가 있으면 설비대장으로 본다', () => {
    expect(looksLikeLedger('제목', '제작회사: 한빛공조')).toBe(true);
    expect(looksLikeLedger('제목', '설치장소: 지하2층')).toBe(true);
  });

  it('분류가 되면(기타가 아니면) 설비대장으로 본다', () => {
    expect(looksLikeLedger('공조기 1호기', '')).toBe(true);
  });

  it('아무 근거도 없으면 설비대장이 아니다', () => {
    expect(looksLikeLedger('알수없는문서', '')).toBe(false);
  });
});

describe('looksLikeAdmin', () => {
  it('행정 서류 키워드를 인식한다', () => {
    expect(looksLikeAdmin('교육비 신청서')).toBe(true);
    expect(looksLikeAdmin('결의서_2026')).toBe(true);
  });

  it('행정 서류가 아니면 false', () => {
    expect(looksLikeAdmin('공조기 1호기')).toBe(false);
  });
});

describe('guessHistoryType', () => {
  it('"점검"이 포함되면 점검, 아니면 수리로 본다', () => {
    expect(guessHistoryType('정기 점검 완료')).toBe('점검');
    expect(guessHistoryType('베어링 교체 수리')).toBe('수리');
  });
});

describe('isDrmLocked', () => {
  it('헤더에 Fasoo 문자열이 있으면 DRM으로 감지한다', () => {
    const bytes = new TextEncoder().encode('Fasoo DRM Header' + 'x'.repeat(200));
    expect(isDrmLocked(bytes)).toBe(true);
  });

  it('Fasoo가 없으면 DRM이 아니다', () => {
    const bytes = new TextEncoder().encode('일반 hwp 파일 내용입니다');
    expect(isDrmLocked(bytes)).toBe(false);
  });

  // 2026-07-19 수정된 버그 — 예전엔 "DRM" 3바이트만 봐서 무관한 OLE2/zip
  // 바이너리와 겹쳐 오탐이 났음. 지금은 "Fasoo" 전체 문자열만 봐야 한다.
  it('DRM이라는 단어만으로는 오탐하지 않는다(Fasoo가 없으면)', () => {
    const bytes = new TextEncoder().encode('이 문서는 DRM 정책 안내문입니다');
    expect(isDrmLocked(bytes)).toBe(false);
  });

  it('128바이트 밖에 Fasoo가 있으면 감지하지 못한다(헤더만 검사)', () => {
    const bytes = new TextEncoder().encode('x'.repeat(200) + 'Fasoo');
    expect(isDrmLocked(bytes)).toBe(false);
  });
});

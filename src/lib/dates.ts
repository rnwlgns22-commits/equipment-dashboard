// .toISOString()으로 다시 읽는 코드가 여러 화면에 있어서(그 관례를 따름) 지역시간
// 생성자(new Date(y,m,d))를 쓰면 UTC+9 등에서 하루씩 밀릴 수 있음 — Date.UTC로 생성.
export function addDaysUTC(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Dashboard.tsx에서만 쓰던 걸 통합검색 이후 lib/notify.ts도 같은 "점검 임박(7일
// 이내)" 판정이 필요해져서 이쪽으로 옮김(2026-07-27) — 두 곳에 같은 날짜계산을
// 따로 두면 언젠가 하나만 고치고 잊어버리는 실수가 나기 쉬움(개발노트.md에 이미
// 몇 번 기록된 패턴).
export function daysUntil(dateStr: string | undefined, now: Date): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

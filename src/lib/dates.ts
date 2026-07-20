// .toISOString()으로 다시 읽는 코드가 여러 화면에 있어서(그 관례를 따름) 지역시간
// 생성자(new Date(y,m,d))를 쓰면 UTC+9 등에서 하루씩 밀릴 수 있음 — Date.UTC로 생성.
export function addDaysUTC(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

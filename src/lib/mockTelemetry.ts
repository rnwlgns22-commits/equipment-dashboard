// 실시간 센서 연동 전이라 데모용 가상 수치. 설비ID로 시드를 고정해서 새로고침해도
// 같은 설비는 같은 값이 나오게 함(진짜 랜덤이면 화면마다 값이 튀어서 데모 신뢰도가 떨어짐).
function seedOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function mockTemperature(설비ID: string): number {
  const seed = seedOf(설비ID);
  return 18 + (seed % 45); // 18~62도
}

export function mockUptimeHours(설비ID: string): number {
  const seed = seedOf(설비ID + 'uptime');
  return 20 + (seed % 8000);
}

export function statusColor(상태: string): string {
  if (상태 === '정상') return '#4ade80';
  if (상태 === '수리중') return '#fbbf24';
  return '#f87171'; // 정지/폐기 = 고장으로 취급
}

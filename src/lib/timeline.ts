import type { HistoryRecord } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function historyDateRange(histories: HistoryRecord[]): { min: Date; max: Date } {
  let min: Date | null = null;
  let max: Date | null = null;
  for (const h of histories) {
    const d = new Date(h.날짜);
    if (Number.isNaN(d.getTime())) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  const now = new Date();
  return { min: min ?? now, max: max && max > now ? max : now };
}

// 그 시점 "상태"를 따로 저장해두지 않으므로(설계.md §11.5), 그 날짜 직전 며칠 안에
// 수리 이력이 있었는지로 "그 무렵 사고가 있었다"를 역산해 재생하는 단순화된 근사치.
// 확정 상태 기록이 아니라 참고용 재현임.
export function hadRecentRepair(
  설비ID: string,
  asOf: Date,
  histories: HistoryRecord[],
  windowDays = 3,
): boolean {
  const windowMs = windowDays * DAY_MS;
  return histories.some((h) => {
    if (h.설비ID !== 설비ID || h.유형 !== '수리') return false;
    const d = new Date(h.날짜);
    if (Number.isNaN(d.getTime())) return false;
    const diff = asOf.getTime() - d.getTime();
    return diff >= 0 && diff <= windowMs;
  });
}

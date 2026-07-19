// _스크립트\new_equipment.py의 PREFIX 매핑 + 다음 번호 부여 로직 포팅.
import type { Category, Equipment } from '../types';

export const CATEGORY_PREFIX: Record<Category, string> = {
  공조: 'AHU',
  냉난방: 'CH',
  급배수: 'PU',
  전기: 'EL',
  소방: 'FR',
  승강기: 'ES',
  통신: 'COM',
  기타: 'ETC',
};

export function nextEquipmentId(category: Category, existing: Equipment[]): string {
  const prefix = CATEGORY_PREFIX[category];
  let max = 0;
  for (const e of existing) {
    if (e.설비ID.startsWith(`${prefix}-`)) {
      const n = parseInt(e.설비ID.slice(prefix.length + 1), 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  return `${prefix}-${String(max + 1).padStart(2, '0')}`;
}

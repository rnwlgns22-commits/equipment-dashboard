// 필터링된 목록을 CSV로 내보내기 위한 공용 유틸(2026-07-25 추가) — 전체 백업은
// Settings의 JSON/zip으로 이미 되지만, "지금 화면에 보이는 것만" 뽑아서 외부
// 보고용으로 쓰고 싶을 때를 위한 것.
function escapeCsvCell(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => headers.map((h) => escapeCsvCell(r[h])).join(',')),
  ];
  // 맨 앞 BOM(U+FEFF) — 엑셀에서 한글이 안 깨지고 열리게 함.
  return '﻿' + lines.join('\r\n');
}

export function csvBlob(rows: Record<string, unknown>[]): Blob {
  return new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
}

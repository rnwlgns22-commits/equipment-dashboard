import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildVaultZip, buildJsonExport } from './vaultExport';
import type { Equipment, HistoryRecord, Part } from '../types';
import type { SheetTemplate } from './sheetTemplate';
import type { HistoryTemplate } from './historySheetTemplate';

function equipment(overrides: Partial<Equipment> & { 설비ID: string; 설비명: string }): Equipment {
  return {
    분류: '공조',
    사이트: '미분류',
    상태: '정상',
    연결설비: [],
    상세사양: {},
    출처파일: '테스트',
    ...overrides,
  };
}

function part(overrides: Partial<Part> & { id: string; 자재명: string }): Part {
  return { 단위: 'EA', 현재수량: 10, 연결설비ID: [], ...overrides };
}

describe('buildVaultZip', () => {
  it('자재가 있으면 40_자재관리 폴더에 마크다운으로 내보낸다', async () => {
    const blob = await buildVaultZip([], [], [part({ id: 'p1', 자재명: 'V벨트 A형', 규격: 'A-38', 현재수량: 5, 안전재고: 2 })]);
    const zip = await JSZip.loadAsync(blob);
    const file = zip.file('설비통합/40_자재관리/p1_V벨트 A형.md');
    expect(file).not.toBeNull();
    const text = await file!.async('text');
    expect(text).toContain('자재명: V벨트 A형');
    expect(text).toContain('현재수량: 5');
    expect(text).toContain('안전재고: 2');
  });

  it('자재가 없으면 자재관리 폴더를 만들지 않는다', async () => {
    const blob = await buildVaultZip([], []);
    const zip = await JSZip.loadAsync(blob);
    const files = Object.keys(zip.files).filter((f) => f.includes('40_자재관리'));
    expect(files).toHaveLength(0);
  });

  it('수리 이력에 비용이 있으면 마크다운 frontmatter와 본문에 포함된다', async () => {
    const history: HistoryRecord = {
      id: 'h1',
      날짜: '2026-01-01',
      설비ID: 'E-001',
      유형: '수리',
      제목: '베어링 교체',
      비용: 50000,
      출처파일: '테스트',
    };
    const blob = await buildVaultZip([equipment({ 설비ID: 'E-001', 설비명: '공조기 1호기' })], [history]);
    const zip = await JSZip.loadAsync(blob);
    const file = zip.file('설비통합/20_점검이력/2026/2026-01-01_E-001_수리_베어링 교체_h1.md');
    expect(file).not.toBeNull();
    const text = await file!.async('text');
    expect(text).toContain('비용: 50000');
    expect(text).toContain('50,000원');
  });
});

describe('buildJsonExport', () => {
  it('parts를 payload에 포함한다', async () => {
    const parts = [part({ id: 'p1', 자재명: '필터' })];
    const blob = buildJsonExport([], [], undefined, undefined, parts);
    const text = await blob.text();
    const payload = JSON.parse(text);
    expect(payload.parts).toEqual(parts);
  });

  // "전체 백업"이라면서 설비 양식·이력 양식 셀 매핑 스토어가 빠져있었음(2026-07-27
  // 발견) — 애써 만든 양식이 기기 이전·복원 시 조용히 사라지는 문제라 회귀 방지.
  it('설비 양식·이력 양식도 payload에 포함한다', async () => {
    const templates: SheetTemplate[] = [
      { id: 't1', name: '테스트 양식', createdAt: '2026-07-27', cells: {}, customFields: [] },
    ];
    const historyTemplates: HistoryTemplate[] = [
      { id: 'ht1', name: '테스트 이력양식', createdAt: '2026-07-27', cells: {} },
    ];
    const blob = buildJsonExport([], [], undefined, undefined, undefined, templates, historyTemplates);
    const payload = JSON.parse(await blob.text());
    expect(payload.templates).toEqual(templates);
    expect(payload.historyTemplates).toEqual(historyTemplates);
  });
});

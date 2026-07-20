import JSZip from 'jszip';
import type { Equipment, HistoryRecord } from '../types';

// 설비통합 볼트의 frontmatter 규격(CLAUDE.md)에 맞춰 마크다운으로 재구성.
// 실제 볼트 파일명 관행 그대로: 설비카드 = {ID}_{설비명}.md, 이력 = {날짜}_{ID}_{유형}.md
function equipmentFileStem(e: Equipment): string {
  return `${e.설비ID}_${e.설비명}`;
}

function equipmentMarkdown(e: Equipment, equipmentsById: Map<string, Equipment>): string {
  const links = e.연결설비
    .map((id) => equipmentsById.get(id))
    .filter((t): t is Equipment => Boolean(t))
    .map((t) => `"[[${equipmentFileStem(t)}]]"`);

  const fm = [
    '---',
    'type: 설비',
    `설비ID: ${e.설비ID}`,
    `설비명: ${e.설비명}`,
    `분류: ${e.분류}`,
    `사이트: ${e.사이트 || '미분류'}`,
    `위치: ${e.위치 ?? ''}`,
    `제조사: ${e.제조사 ?? ''}`,
    `모델명: ${e.모델명 ?? ''}`,
    `설치일: ${e.설치일 ?? ''}`,
    `상태: ${e.상태}`,
    `점검주기일: ${e.점검주기일 ?? ''}`,
    `최근점검일: ${e.최근점검일 ?? ''}`,
    `다음점검일: ${e.다음점검일 ?? ''}`,
    `연결설비: [${links.join(', ')}]`,
    'tags: [설비]',
    '---',
    '',
    `# ${e.설비명}`,
    '',
  ];

  const specs = Object.entries(e.상세사양);
  if (specs.length > 0) {
    fm.push('## 📋 상세 사양', '');
    for (const [k, v] of specs) fm.push(`- **${k}**: ${v}`);
    fm.push('');
  }

  return fm.join('\n');
}

function historyMarkdown(h: HistoryRecord, equipmentsById: Map<string, Equipment>): string {
  const equipment = h.설비ID ? equipmentsById.get(h.설비ID) : undefined;
  const fm = [
    '---',
    `날짜: ${h.날짜}`,
    `설비ID: ${h.설비ID ?? ''}`,
    `유형: ${h.유형}`,
    '---',
    '',
    `# ${h.제목}`,
    '',
  ];
  if (equipment) fm.push(`설비: [[${equipmentFileStem(equipment)}]]`, '');
  if (h.내용) fm.push(h.내용, '');
  return fm.join('\n');
}

function historyFileStem(h: HistoryRecord): string {
  const safeTitle = h.제목.replace(/[\\/:*?"<>|]/g, '_');
  // 레코드 id를 끝에 붙여 유일성을 보장 — 날짜/설비/유형/제목이 전부 같은 이력 2건이
  // (예: 같은 날 자동생성된 동일 제목의 점검 2건) id 없이는 zip 안에서 서로 덮어씀
  // (JSZip은 경로 중복을 경고 없이 그냥 덮어씀, 2026-07-20 코드리뷰에서 발견).
  return `${h.날짜}_${h.설비ID ?? '미지정'}_${h.유형}_${safeTitle}_${h.id}`;
}

export async function buildVaultZip(equipments: Equipment[], histories: HistoryRecord[]): Promise<Blob> {
  const zip = new JSZip();
  const equipmentsById = new Map(equipments.map((e) => [e.설비ID, e]));

  const root = zip.folder('설비통합')!;
  const equipDir = root.folder('10_설비')!;
  const historyDir = root.folder('20_점검이력')!;

  for (const e of equipments) {
    const dir = equipDir.folder(e.분류)!.folder(e.사이트 || '미분류')!;
    dir.file(`${equipmentFileStem(e)}.md`, equipmentMarkdown(e, equipmentsById));
  }

  for (const h of histories) {
    const year = h.날짜.slice(0, 4) || '미분류';
    const dir = historyDir.folder(/^\d{4}$/.test(year) ? year : '미분류')!;
    dir.file(`${historyFileStem(h)}.md`, historyMarkdown(h, equipmentsById));
  }

  root.file(
    '읽어주세요.md',
    [
      '# 내보낸 데이터 안내',
      '',
      `내보낸 시각: ${new Date().toISOString()}`,
      `설비 ${equipments.length}개, 점검·수리 이력 ${histories.length}건.`,
      '',
      '이 폴더를 옵시디언 볼트 안에 그대로 복사하면 설비관리 시스템의 frontmatter 규격에',
      '맞는 노트로 바로 열립니다(설비통합/CLAUDE.md 규격 기준).',
    ].join('\n'),
  );

  return zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildJsonExport(equipments: Equipment[], histories: HistoryRecord[]): Blob {
  const payload = { exportedAt: new Date().toISOString(), equipments, histories };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

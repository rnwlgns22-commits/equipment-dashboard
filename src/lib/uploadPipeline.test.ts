import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { runUploadPipeline } from './uploadPipeline';

// 2026-07-21 실제 업로드 실패 사례: "승강기 안전장치 현황 및 상태_26.6월기준.xlsx" —
// 승강기 14대를 십자표(행=점검항목, 열=설비)로 늘어놓은 월간 현황 요약. 예전 로직은
// looksLikeLedger()가 "분류만 되면(기타가 아니면) 설비대장"으로 봐서 파일 전체를 파일명
// 그대로인 가짜 설비 1개로 만들어버리고 이력은 하나도 안 만들었음. 지금은 명시적 설비대장
// 신호(제작회사/설치장소)가 없으면 날짜 존재 여부를 먼저 봐서 이력으로 처리하도록 순서를
// 바꿈 — 이 실제 시나리오를 회귀 테스트로 고정.
function makeXlsxFile(name: string, rows: (string | number)[][]): File {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, '요약');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new File([buf], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

describe('runUploadPipeline — 설비대장 vs 이력 vs 실패 우선순위', () => {
  it('날짜 없는 월간 현황 매트릭스(승강기 현황)는 설비 대신 이력 후보로 처리된다', async () => {
    const rows = [
      ['26년 6월 기준 영등포 시설공단'],
      ['E/S', 'EX)', '로터리 4번출구'],
      ['', '', '하행\n1810-185'],
      ['스텝체인', '부식있음', '양호'],
    ];
    const file = makeXlsxFile('승강기 안전장치 현황 및 상태_26.6월기준.xlsx', rows);
    const result = await runUploadPipeline([{ file, relativePath: file.name }], []);

    expect(result.equipmentCandidates).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
    expect(result.historyCandidates).toHaveLength(1);
    expect(result.historyCandidates[0].date).toBe('2026-06-01');
    expect(result.historyCandidates[0].title).toBe('승강기 안전장치 현황 및 상태_26.6월기준');
  });

  it('명시적 설비대장 신호(제작회사/설치장소)가 있으면 날짜가 있어도 설비 후보로 처리된다', async () => {
    const rows = [['공조기 1호기'], ['제작회사: 한빛공조'], ['설치장소: 지하2층'], ['설치일: 2020.03.15']];
    const file = makeXlsxFile('공조기_1호기_대장.xlsx', rows);
    const result = await runUploadPipeline([{ file, relativePath: file.name }], []);

    expect(result.equipmentCandidates).toHaveLength(1);
    expect(result.historyCandidates).toHaveLength(0);
    expect(result.equipmentCandidates[0].category).toBe('공조');
  });

  it('날짜도 없고 설비 분류도 안 되는 무관 문서는 가짜 설비를 만들지 않고 실패로 남는다', async () => {
    const rows = [['아무 관련 없는 문서'], ['이것저것 잡담']];
    const file = makeXlsxFile('무관문서.xlsx', rows);
    const result = await runUploadPipeline([{ file, relativePath: file.name }], []);

    expect(result.equipmentCandidates).toHaveLength(0);
    expect(result.historyCandidates).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].reason).toContain('찾지 못함');
  });

  it('날짜도 명시적 신호도 없지만 분류는 되는 단순 문서는 여전히 설비 후보로 처리된다(기존 동작 보존)', async () => {
    const rows = [['공조기 1호기']];
    const file = makeXlsxFile('공조기_1호기.xlsx', rows);
    const result = await runUploadPipeline([{ file, relativePath: file.name }], []);

    expect(result.equipmentCandidates).toHaveLength(1);
    expect(result.historyCandidates).toHaveLength(0);
  });
});

// 2026-07-21 실제 요청: "1. 산출기초조사서.xlsx"(공공기관 표준 견적서) 업로드 시
// 어떤 설비를 어떻게 고쳤는지 + 비용까지 이력 후보에 자동으로 채워져야 함.
describe('runUploadPipeline — 산출기초조사서', () => {
  it('산출기초조사서 형식이면 품명 기반 제목·비용·날짜가 채워진 수리 이력 후보가 된다', async () => {
    const rows = [
      ['산  출  기  초  조  사  서'],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['금4,444,000원 (금사백사십사만사천원)'],
      ['', '', '', '', '', '', '', '(단위 : 원)'],
      [],
      ['품   명', '규 격', '단위', '수량', '산  출  조  사  근  거', '', '산출근거(적용금액)', '', '', ''],
      ['', '', '', '', '원신엘리베이터', '현승엘리베이터', '단 가', '금 액'],
      ['1. 인건비'],
      ['핸드레일[로터리 2번출구 하행(우측)] 인건비', '', 'M', 37.44, 108000, 142500, 108000, 4039999.9999999995],
      [],
      [],
      [],
      [],
      ['계', '', '', '', '', '', '', 4039999.9999999995],
      ['부가세', '', '', '', '', '', '', 404000],
      ['합      계', '', '', '', '', '', 4444000],
      ['2026. 7.  '],
    ];
    const file = makeXlsxFile('1. 산출기초조사서.xlsx', rows);
    const result = await runUploadPipeline([{ file, relativePath: file.name }], []);

    expect(result.failed).toHaveLength(0);
    expect(result.equipmentCandidates).toHaveLength(0);
    expect(result.historyCandidates).toHaveLength(1);
    const h = result.historyCandidates[0];
    expect(h.title).toBe('핸드레일[로터리 2번출구 하행(우측)]');
    expect(h.type).toBe('수리');
    expect(h.date).toBe('2026-07-01');
    expect(h.비용).toBe(4444000);
  });

  it('날짜를 못 찾으면 설비/이력 후보 대신 실패로 남는다(가짜 값 대신 사람 확인 유도)', async () => {
    const rows = [['산  출  기  초  조  사  서'], ['금1,000원 (금천원)'], ['품   명', '단위', '수량', '금액']];
    const file = makeXlsxFile('산출기초조사서_날짜없음.xlsx', rows);
    const result = await runUploadPipeline([{ file, relativePath: file.name }], []);

    expect(result.historyCandidates).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].reason).toContain('날짜');
  });
});

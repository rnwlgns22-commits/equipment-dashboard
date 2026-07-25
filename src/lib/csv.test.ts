import { describe, expect, it } from 'vitest';
import { toCsv, csvBlob } from './csv';

describe('toCsv', () => {
  it('빈 배열이면 빈 문자열을 반환한다', () => {
    expect(toCsv([])).toBe('');
  });

  it('첫 행의 키로 헤더를 만들고 값은 그 순서대로 나열한다', () => {
    const csv = toCsv([{ 이름: '공조기', 수량: 3 }]);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(lines[0]).toBe('이름,수량');
    expect(lines[1]).toBe('공조기,3');
  });

  it('맨 앞에 BOM(U+FEFF)이 붙는다 — 엑셀에서 한글이 안 깨지게', () => {
    const csv = toCsv([{ a: 1 }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('쉼표가 든 값은 따옴표로 감싼다', () => {
    const csv = toCsv([{ 메모: '점검, 수리 완료' }]);
    expect(csv).toContain('"점검, 수리 완료"');
  });

  it('값 안의 큰따옴표는 두 개로 이스케이프한다', () => {
    const csv = toCsv([{ 메모: '이름이 "특수"함' }]);
    expect(csv).toContain('"이름이 ""특수""함"');
  });

  it('줄바꿈이 든 값도 따옴표로 감싼다', () => {
    const csv = toCsv([{ 메모: '첫줄\n둘째줄' }]);
    expect(csv).toContain('"첫줄\n둘째줄"');
  });

  it('undefined·null은 빈 문자열로 처리한다', () => {
    const csv = toCsv([{ 규격: undefined, 비고: null }]);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(lines[1]).toBe(',');
  });

  it('여러 행을 순서대로 CRLF로 이어붙인다', () => {
    const csv = toCsv([{ a: 1 }, { a: 2 }, { a: 3 }]);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(lines).toEqual(['a', '1', '2', '3']);
  });
});

describe('csvBlob', () => {
  it('text/csv MIME 타입의 Blob을 만든다', () => {
    const blob = csvBlob([{ a: 1 }]);
    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });

  // Blob.text()는 UTF-8 BOM을 디코딩 과정에서 자동으로 제거함(표준 동작) —
  // 그래서 원본 문자열 그대로가 아니라 BOM만 뺀 나머지가 같은지 비교한다.
  it('Blob 내용이 toCsv 결과와 같다(BOM 제외)', async () => {
    const rows = [{ 이름: '자재', 수량: 5 }];
    const blob = csvBlob(rows);
    const text = await blob.text();
    expect(text).toBe(toCsv(rows).replace(/^﻿/, ''));
  });
});

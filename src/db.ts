import Dexie, { type Table } from 'dexie';
import type { Equipment, HistoryRecord, InspectionSchedule } from './types';

// 완전 클라이언트 사이드 원칙(설계.md §1) — 업로드/샘플 데이터를 IndexedDB에 로컬
// 저장해서 새로고침해도 유지되게 함. 서버로는 아무것도 안 나감.
class AppDatabase extends Dexie {
  equipments!: Table<Equipment, string>;
  histories!: Table<HistoryRecord, string>;
  inspectionSchedules!: Table<InspectionSchedule, string>;

  constructor() {
    super('fms-app-db');
    this.version(1).stores({
      equipments: '설비ID',
      histories: 'id',
    });
    // v2(2026-07-21) — 법정점검/정기점검 테이블 추가. 이전 버전 stores도 그대로 남겨둬야
    // 기존 사용자 브라우저의 IndexedDB가 자동 마이그레이션됨(Dexie 컨벤션).
    this.version(2).stores({
      equipments: '설비ID',
      histories: 'id',
      inspectionSchedules: 'id, 설비ID',
    });
  }
}

export const db = new AppDatabase();

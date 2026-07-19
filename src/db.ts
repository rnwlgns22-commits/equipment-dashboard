import Dexie, { type Table } from 'dexie';
import type { Equipment, HistoryRecord } from './types';

// 완전 클라이언트 사이드 원칙(설계.md §1) — 업로드/샘플 데이터를 IndexedDB에 로컬
// 저장해서 새로고침해도 유지되게 함. 서버로는 아무것도 안 나감.
class AppDatabase extends Dexie {
  equipments!: Table<Equipment, string>;
  histories!: Table<HistoryRecord, string>;

  constructor() {
    super('fms-app-db');
    this.version(1).stores({
      equipments: '설비ID',
      histories: 'id',
    });
  }
}

export const db = new AppDatabase();

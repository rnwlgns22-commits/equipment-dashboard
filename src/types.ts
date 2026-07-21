// 설계.md §3 데이터 모델. 필드명은 원본 볼트 frontmatter와 개념을 맞춰서 한글 유지.

export type Category =
  | '공조'
  | '냉난방'
  | '급배수'
  | '전기'
  | '소방'
  | '승강기'
  | '통신'
  | '기타';

export type EquipmentStatus = '정상' | '정지' | '수리중' | '폐기';

export type RiskLevel = '상' | '중' | '하';

export interface Equipment {
  설비ID: string;
  설비명: string;
  분류: Category;
  사이트: string;
  위치?: string;
  제조사?: string;
  모델명?: string;
  설치일?: string;
  상태: EquipmentStatus;
  점검주기일?: number;
  최근점검일?: string;
  다음점검일?: string;
  연결설비: string[];
  상세사양: Record<string, string>;
  출처파일: string;
}

export type HistoryType = '점검' | '수리';

export interface HistoryRecord {
  id: string;
  날짜: string;
  설비ID?: string;
  유형: HistoryType;
  제목: string;
  내용?: string;
  출처파일: string;
}

export interface FailureStat {
  설비ID: string;
  고장건수: number;
  최근1년건수: number;
  최초고장일: string;
  최근고장일: string;
  mtbf일?: number;
  예상다음고장일?: string;
  위험등급: RiskLevel;
}

export type BrainSignalKind = '연쇄고장' | '설치코호트' | '동시다발';

export interface BrainSignal {
  종류: BrainSignalKind;
  관련설비: string[];
  근거: string;
}

// 설계.md §11 — 설비 레이아웃 매핑(FMS Mapping). 좌표는 Equipment의 속성이 아니라
// "이 도면 위에서 어디 있는지"라서 별도 모델로 분리 (도면이 여러 장이면 같은 설비가
// 여러 좌표를 가질 수 있어야 함).
export interface Floorplan {
  id: string;
  name: string;
  imageDataUrl: string;
}

export interface Placement {
  설비ID: string;
  도면ID: string;
  xPct: number; // 0~100, 도면 원본 이미지 기준 상대좌표
  yPct: number;
  scale?: number; // 도면 위 아이콘 크기 배율, 없으면 1(기본 크기)
}

// Phase B — 구역(Geofencing). 연결선(ConnectionLine)은 별도 타입 없음: Equipment.연결설비
// 배열을 그 자리에서 파생시켜 그리기 때문에 저장 상태가 필요 없음 (설계.md §11.1 참고).
export interface Zone {
  id: string;
  name: string;
  도면ID: string;
  points: { xPct: number; yPct: number }[]; // 다각형 꼭짓점, 3개 이상
}

// Phase C — 작업오더(Work Order). 도면과 무관하게 설비 자체에 붙는 상태라 도면ID 없음.
export type WorkOrderStatus = '대기' | '진행중' | '완료';

export interface WorkOrder {
  설비ID: string;
  상태: WorkOrderStatus;
}

export type ViewMode = '일반' | '유지보수' | '히트맵' | '타임라인';

// 법정점검/정기점검(2026-07-21 추가) — Equipment.점검주기일/최근점검일/다음점검일은
// 설비당 "점검" 한 종류만 표현 가능한데, 실제로는 같은 설비에 법정점검(엘리베이터
// 안전검사 등 법령상 의무)과 정기점검(내부 유지보수 루틴)이 여러 항목 따로 걸릴 수
// 있어서 별도 모델로 분리. 종류(법정/정기)만 다르고 구조는 동일하게 둠 —
// InspectionScheduleBoard 컴포넌트가 종류별로 필터링해서 재사용.
export type InspectionKind = '법정점검' | '정기점검';

export interface InspectionSchedule {
  id: string;
  설비ID: string;
  종류: InspectionKind;
  항목명: string; // 예: "승강기 정기검사(법정)", "필터 청소(정기)"
  주기일: number;
  최근점검일?: string;
  다음점검일?: string; // 최근점검일 + 주기일로 계산, 최근점검일 없으면 미정
  점검사항?: string; // 가장 최근 점검의 결과/특이사항 메모
}

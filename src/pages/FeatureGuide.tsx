import { Link } from 'react-router-dom';
import Card from '../components/Card';

interface Feature {
  to: string;
  label: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    to: '/dashboard',
    label: '대시보드',
    description:
      '설비 현황을 한눈에 — 총 설비 수, 상태별 분포, 점검 임박·법정/정기점검 도래, 위험등급 상위 설비, 고장 추이, 분류별·사이트별 통계, 누적 수리비용과 수리비용 Top10, 재고부족 자재, 뇌모델(고장연계) 신호를 요약해서 보여줍니다.',
  },
  {
    to: '/equipment',
    label: '설비 목록',
    description: '등록된 모든 설비를 검색·필터링하고, 여러 건을 선택해 한꺼번에 삭제할 수 있습니다.',
  },
  {
    to: '/equipment/add',
    label: '설비 추가',
    description:
      '직접 입력하거나, 점검·수리 기록 파일(hwp/hwpx/xls/xlsx/pdf/pptx/docx)이 든 폴더를 통째로 올리면 설비와 이력을 자동으로 인식합니다. 산출기초조사서(견적서) 형식은 비용까지 자동으로 뽑아줍니다.',
  },
  {
    to: '/mapping',
    label: '레이아웃 매핑',
    description:
      '건물 도면 위에 설비를 배치해서 위치 기반으로 보고, 구역(지오펜싱)을 그려 구역별 통계를 확인하고, 히트맵·작업오더 상태·이력 타임라인 보기로 전환할 수 있습니다.',
  },
  {
    to: '/graph',
    label: '관계 그래프',
    description: '설비 간 연결 관계를 그래프로 시각화해서 어떤 설비끼리 계통이 이어져 있는지 한눈에 봅니다.',
  },
  {
    to: '/history',
    label: '점검·수리 이력',
    description: '모든 점검·수리 기록을 검색·필터링하고 직접 추가·수정·삭제합니다. 수리 건에는 비용도 기록할 수 있습니다.',
  },
  {
    to: '/legal-inspection',
    label: '법정점검',
    description:
      '법령상 의무 점검 항목(예: 승강기 정기검사)의 주기와 다음 점검일을 관리합니다. 대시보드에서 정기점검보다 항상 먼저 도래 알림을 받습니다.',
  },
  {
    to: '/regular-inspection',
    label: '정기점검',
    description: '내부 유지보수 루틴 점검 항목(예: 필터 청소)을 법정점검과 같은 방식으로 관리합니다.',
  },
  {
    to: '/inventory',
    label: '자재·재고관리',
    description: '예비부품·소모자재의 현재 재고와 안전재고를 관리하고, 안전재고 이하로 떨어지면 재고부족으로 표시합니다.',
  },
  {
    to: '/settings',
    label: '설정 / 데이터',
    description: '전체 데이터를 JSON으로 백업하거나 옵시디언 볼트 형식(zip)으로 내보내고, 백업 파일을 다시 불러올 수 있습니다.',
  },
];

export default function FeatureGuide() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">기능설명</h1>
        <p className="text-sm text-text-dim mt-1">
          이 앱의 각 메뉴가 무엇을 하는지 정리했습니다. 완전 클라이언트 사이드로 동작하며 올린 파일과
          입력한 데이터는 서버로 전송되지 않고 이 브라우저 안에만 저장됩니다.
        </p>
      </div>

      <div className="space-y-3">
        {FEATURES.map((f) => (
          <Card key={f.to}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-medium">{f.label}</h3>
                <p className="text-sm text-text-dim mt-1 leading-relaxed">{f.description}</p>
              </div>
              <Link to={f.to} className="text-xs text-accent hover:underline shrink-0">
                바로가기 →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

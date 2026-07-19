import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { sampleEquipments, sampleHistories } from '../lib/sampleData';

export default function Landing() {
  const navigate = useNavigate();
  const loadData = useAppStore((s) => s.loadData);

  const loadSample = () => {
    loadData(sampleEquipments, sampleHistories);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg text-text px-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-soft px-4 py-1.5 text-xs text-text-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-risk-low" />
          파일은 서버로 전송되지 않습니다 — 브라우저 안에서만 처리됩니다
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          업무폴더 하나로<br />설비현황 대시보드 완성
        </h1>
        <p className="text-text-dim text-sm sm:text-base leading-relaxed">
          점검·수리 기록이 담긴 문서 폴더를 올리면 설비별로 자동 정리하고,
          고장통계·예측·연계분석까지 한 화면에서 볼 수 있습니다.
        </p>

        <div
          className="rounded-2xl border-2 border-dashed border-border bg-bg-soft/60 py-14 px-6 hover:border-accent/50 transition-colors cursor-not-allowed"
          title="파일 업로드는 다음 단계에서 연결됩니다"
        >
          <p className="text-text-dim text-sm">
            여기로 업무폴더를 끌어다 놓으세요
          </p>
          <p className="text-text-dim/60 text-xs mt-1">(업로드 파이프라인 준비 중)</p>
        </div>

        <button
          type="button"
          onClick={loadSample}
          className="w-full rounded-xl bg-accent text-bg font-medium py-3 text-sm hover:brightness-110 transition"
        >
          샘플 데이터로 대시보드 구경하기
        </button>
      </div>
    </div>
  );
}

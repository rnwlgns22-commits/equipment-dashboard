import { useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useMappingStore } from '../mappingStore';
import { buildJsonExport, buildVaultZip, downloadBlob } from '../lib/vaultExport';
import Card from '../components/Card';

export default function Settings() {
  const equipments = useAppStore((s) => s.equipments);
  const histories = useAppStore((s) => s.histories);
  const inspectionSchedules = useAppStore((s) => s.inspectionSchedules);
  const parts = useAppStore((s) => s.parts);
  const loadData = useAppStore((s) => s.loadData);
  const loadInspectionSchedules = useAppStore((s) => s.loadInspectionSchedules);
  const loadParts = useAppStore((s) => s.loadParts);
  const floorplans = useMappingStore((s) => s.floorplans);
  const placements = useMappingStore((s) => s.placements);
  const zones = useMappingStore((s) => s.zones);
  const workOrders = useMappingStore((s) => s.workOrders);
  const loadMappingSnapshot = useMappingStore((s) => s.loadSnapshot);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStamp = () => new Date().toISOString().slice(0, 10);

  const exportJson = () => {
    downloadBlob(
      buildJsonExport(equipments, histories, { floorplans, placements, zones, workOrders }, inspectionSchedules, parts),
      `설비데이터_전체백업_${todayStamp()}.json`,
    );
    setMessage('JSON 파일을 내려받았습니다(설비·이력·레이아웃 매핑·법정/정기점검·자재재고 전체 포함).');
  };

  const exportVaultZip = async () => {
    setBusy(true);
    try {
      const blob = await buildVaultZip(equipments, histories, parts);
      downloadBlob(blob, `설비통합_볼트내보내기_${todayStamp()}.zip`);
      setMessage('옵시디언 볼트 형식 zip을 내려받았습니다.');
    } finally {
      setBusy(false);
    }
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.equipments) || !Array.isArray(parsed.histories)) {
        setMessage('올바른 형식의 파일이 아닙니다(equipments/histories 배열 필요).');
        return;
      }
      loadData(parsed.equipments, parsed.histories);
      const m = parsed.mapping;
      const hasMapping =
        m && Array.isArray(m.floorplans) && Array.isArray(m.placements) && Array.isArray(m.zones) && Array.isArray(m.workOrders);
      if (hasMapping) {
        loadMappingSnapshot(m);
      }
      const hasInspections = Array.isArray(parsed.inspectionSchedules);
      if (hasInspections) {
        loadInspectionSchedules(parsed.inspectionSchedules);
      }
      const hasParts = Array.isArray(parsed.parts);
      if (hasParts) {
        loadParts(parsed.parts);
      }
      setMessage(
        `불러오기 완료: 설비 ${parsed.equipments.length}개, 이력 ${parsed.histories.length}건` +
          (hasMapping ? `, 레이아웃 매핑(도면 ${m.floorplans.length}개)까지 복원됨` : ' (이 파일엔 레이아웃 매핑 데이터가 없어 그 부분은 그대로 둠)') +
          (hasInspections
            ? `, 법정/정기점검 ${parsed.inspectionSchedules.length}건까지 복원됨`
            : ' (이 파일엔 법정/정기점검 데이터가 없어 그 부분도 그대로 둠)') +
          (hasParts ? `, 자재 ${parsed.parts.length}건까지 복원됨.` : ' (이 파일엔 자재 데이터가 없어 그 부분도 그대로 둠).'),
      );
    } catch {
      setMessage('파일을 읽는 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">설정 / 데이터</h1>
        <p className="text-sm text-text-dim mt-1">
          현재 설비 {equipments.length}개, 이력 {histories.length}건, 레이아웃 매핑 도면{' '}
          {floorplans.length}개, 법정/정기점검 {inspectionSchedules.length}건, 자재{' '}
          {parts.length}건이 이 브라우저에
          저장돼 있습니다(새로고침해도 유지되지만, 이 브라우저·이 PC에만 있는 데이터라 다른
          기기로 옮기거나 브라우저 데이터를 지우기 전엔 아래에서 내보내기를 권장합니다).
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 text-accent text-sm px-4 py-2">
          {message}
        </div>
      )}

      <Card title="내보내기">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">JSON으로 전체 내보내기</div>
              <div className="text-xs text-text-dim">
                설비·이력(수리비용 포함)·레이아웃 매핑(도면·배치·구역)·법정/정기점검·자재재고까지
                이 앱에서 다시 불러올 수 있는 형태로 전부 백업
              </div>
            </div>
            <button
              type="button"
              onClick={exportJson}
              className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition shrink-0"
            >
              내려받기
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
            <div>
              <div className="text-sm font-medium">옵시디언 볼트 형식(zip)으로 내보내기</div>
              <div className="text-xs text-text-dim">
                설비카드·점검이력·자재카드 마크다운 노트로 변환된 zip — 옵시디언 볼트에 바로 복사 가능
              </div>
            </div>
            <button
              type="button"
              onClick={exportVaultZip}
              disabled={busy}
              className="rounded-lg border border-border text-sm font-medium px-4 py-2 hover:border-accent/50 hover:text-accent transition shrink-0 disabled:opacity-50"
            >
              {busy ? '생성 중…' : '내려받기'}
            </button>
          </div>
        </div>
      </Card>

      <Card title="가져오기">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">JSON 파일 불러오기</div>
            <div className="text-xs text-text-dim">
              이 앱에서 내보낸 JSON을 다시 불러와 현재 데이터를 교체(설비·이력·레이아웃 매핑·법정/정기점검·자재재고 전부)
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-border text-sm font-medium px-4 py-2 hover:border-accent/50 hover:text-accent transition shrink-0"
          >
            파일 선택
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importJson(file);
              e.target.value = '';
            }}
          />
        </div>
      </Card>
    </div>
  );
}

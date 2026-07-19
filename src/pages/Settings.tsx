import { useRef, useState } from 'react';
import { useAppStore } from '../store';
import { buildJsonExport, buildVaultZip, downloadBlob } from '../lib/vaultExport';
import Card from '../components/Card';

export default function Settings() {
  const equipments = useAppStore((s) => s.equipments);
  const histories = useAppStore((s) => s.histories);
  const loadData = useAppStore((s) => s.loadData);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStamp = () => new Date().toISOString().slice(0, 10);

  const exportJson = () => {
    downloadBlob(buildJsonExport(equipments, histories), `설비데이터_${todayStamp()}.json`);
    setMessage('JSON 파일을 내려받았습니다.');
  };

  const exportVaultZip = async () => {
    setBusy(true);
    try {
      const blob = await buildVaultZip(equipments, histories);
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
      setMessage(`불러오기 완료: 설비 ${parsed.equipments.length}개, 이력 ${parsed.histories.length}건.`);
    } catch {
      setMessage('파일을 읽는 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">설정 / 데이터</h1>
        <p className="text-sm text-text-dim mt-1">
          현재 설비 {equipments.length}개, 이력 {histories.length}건이 브라우저 메모리에 있습니다
          (새로고침하면 사라짐 — 백업하려면 아래에서 내보내세요).
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
              <div className="text-sm font-medium">JSON으로 내보내기</div>
              <div className="text-xs text-text-dim">이 앱에서 다시 불러올 수 있는 원본 데이터 백업</div>
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
                설비카드·점검이력 마크다운 노트로 변환된 zip — 옵시디언 볼트에 바로 복사 가능
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
            <div className="text-xs text-text-dim">이 앱에서 내보낸 JSON을 다시 불러와 현재 데이터를 교체</div>
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

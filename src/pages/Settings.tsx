import { useRef, useState } from 'react';
import { useAppStore } from '../store';
import { useMappingStore } from '../mappingStore';
import { useNotifyStore } from '../notifyStore';
import { useTemplateStore } from '../templateStore';
import { useHistoryTemplateStore } from '../historyTemplateStore';
import { buildJsonExport, buildVaultZip, downloadBlob } from '../lib/vaultExport';
import Card from '../components/Card';
import { useT, useLang } from '../i18n';

export default function Settings() {
  const t = useT();
  const lang = useLang();
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
  const templates = useTemplateStore((s) => s.templates);
  const loadTemplates = useTemplateStore((s) => s.loadTemplates);
  const historyTemplates = useHistoryTemplateStore((s) => s.templates);
  const loadHistoryTemplates = useHistoryTemplateStore((s) => s.loadTemplates);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 알림(2026-07-27, _웹서비스설계/할일.md) — 서버가 없어서 브라우저 알림
  // (Notification API, 탭이 열려 있어야 동작)까지가 현실적 범위. 권한은 브라우저가
  // 들고 있고 여기선 앱 차원의 켬/끔만 관리(notifyStore.ts). 처음 켤 때만 권한을
  // 요청 — 사용자 동작 없이 자동으로 묻지 않음(브라우저 알림 권한 요청은 항상
  // 명시적 사용자 제스처에서 해야 거부율이 낮고 UX 관례에도 맞음).
  const notifyEnabled = useNotifyStore((s) => s.enabled);
  const setNotifyEnabled = useNotifyStore((s) => s.setEnabled);
  const notifySupported = typeof window !== 'undefined' && 'Notification' in window;
  const notifyPermission = notifySupported ? Notification.permission : 'unsupported';

  const toggleNotify = async () => {
    if (notifyEnabled) {
      setNotifyEnabled(false);
      return;
    }
    if (!notifySupported) return;
    if (Notification.permission === 'granted') {
      setNotifyEnabled(true);
      return;
    }
    if (Notification.permission === 'denied') {
      setMessage(t('브라우저가 알림 권한을 차단했습니다. 주소창의 사이트 설정에서 알림을 허용한 뒤 다시 시도하세요.'));
      return;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setNotifyEnabled(true);
    } else {
      setMessage(t('알림 권한이 거부되어 켤 수 없습니다.'));
    }
  };

  const todayStamp = () => new Date().toISOString().slice(0, 10);

  const exportJson = () => {
    downloadBlob(
      buildJsonExport(
        equipments,
        histories,
        { floorplans, placements, zones, workOrders },
        inspectionSchedules,
        parts,
        templates,
        historyTemplates,
      ),
      `설비데이터_전체백업_${todayStamp()}.json`,
    );
    setMessage(t('JSON 파일을 내려받았습니다(설비·이력·레이아웃 매핑·법정/정기점검·자재재고·양식 전체 포함).'));
  };

  const exportVaultZip = async () => {
    setBusy(true);
    try {
      const blob = await buildVaultZip(equipments, histories, parts);
      downloadBlob(blob, `설비통합_볼트내보내기_${todayStamp()}.zip`);
      setMessage(t('옵시디언 볼트 형식 zip을 내려받았습니다.'));
    } finally {
      setBusy(false);
    }
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.equipments) || !Array.isArray(parsed.histories)) {
        setMessage(t('올바른 형식의 파일이 아닙니다(equipments/histories 배열 필요).'));
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
      const hasTemplates = Array.isArray(parsed.templates);
      if (hasTemplates) {
        loadTemplates(parsed.templates);
      }
      const hasHistoryTemplates = Array.isArray(parsed.historyTemplates);
      if (hasHistoryTemplates) {
        loadHistoryTemplates(parsed.historyTemplates);
      }
      if (lang === 'ko') {
        setMessage(
          `불러오기 완료: 설비 ${parsed.equipments.length}개, 이력 ${parsed.histories.length}건` +
            (hasMapping ? `, 레이아웃 매핑(도면 ${m.floorplans.length}개)까지 복원됨` : ' (이 파일엔 레이아웃 매핑 데이터가 없어 그 부분은 그대로 둠)') +
            (hasInspections
              ? `, 법정/정기점검 ${parsed.inspectionSchedules.length}건까지 복원됨`
              : ' (이 파일엔 법정/정기점검 데이터가 없어 그 부분도 그대로 둠)') +
            (hasParts ? `, 자재 ${parsed.parts.length}건까지 복원됨` : ' (이 파일엔 자재 데이터가 없어 그 부분도 그대로 둠)') +
            (hasTemplates || hasHistoryTemplates
              ? `, 양식(설비 ${parsed.templates?.length ?? 0}·이력 ${parsed.historyTemplates?.length ?? 0})까지 복원됨.`
              : ' (이 파일엔 양식 데이터가 없어 그 부분도 그대로 둠).'),
        );
      } else {
        setMessage(
          `Import complete: ${parsed.equipments.length} equipment, ${parsed.histories.length} history records` +
            (hasMapping ? `, layout mapping restored (${m.floorplans.length} floorplans)` : ' (no layout mapping data in this file, left unchanged)') +
            (hasInspections
              ? `, ${parsed.inspectionSchedules.length} legal/regular inspections restored`
              : ' (no legal/regular inspection data in this file, left unchanged)') +
            (hasParts ? `, ${parsed.parts.length} parts restored` : ' (no parts data in this file, left unchanged)') +
            (hasTemplates || hasHistoryTemplates
              ? `, templates restored (equipment ${parsed.templates?.length ?? 0} · history ${parsed.historyTemplates?.length ?? 0}).`
              : ' (no template data in this file, left unchanged).'),
        );
      }
    } catch {
      setMessage(t('파일을 읽는 중 오류가 발생했습니다.'));
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('설정 / 데이터')}</h1>
        <p className="text-sm text-text-dim mt-1">
          {lang === 'ko' ? (
            <>
              현재 설비 {equipments.length}개, 이력 {histories.length}건, 레이아웃 매핑 도면{' '}
              {floorplans.length}개, 법정/정기점검 {inspectionSchedules.length}건, 자재{' '}
              {parts.length}건, 양식 {templates.length + historyTemplates.length}개가 이 브라우저에
              저장돼 있습니다(새로고침해도 유지되지만, 이 브라우저·이 PC에만 있는 데이터라 다른
              기기로 옮기거나 브라우저 데이터를 지우기 전엔 아래에서 내보내기를 권장합니다).
            </>
          ) : (
            <>
              This browser currently stores {equipments.length} equipment, {histories.length} history
              records, {floorplans.length} layout mapping floorplans, {inspectionSchedules.length}{' '}
              legal/regular inspections, {parts.length} parts, and {templates.length + historyTemplates.length}{' '}
              templates (it persists across reloads, but only lives in this browser on this PC — export below
              before switching devices or clearing browser data).
            </>
          )}
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 text-accent text-sm px-4 py-2">
          {message}
        </div>
      )}

      <Card title={t('알림')}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">{t('브라우저 알림')}</div>
            <div className="text-xs text-text-dim mt-0.5">
              {t('점검 임박·법정/정기점검 도래·재고부족을 이 탭이 열려 있는 동안 브라우저 알림으로 받습니다. 서버가 없는 앱이라 탭을 닫으면 알림도 멈춥니다(이메일·푸시 알림은 지원하지 않음).')}
            </div>
            {!notifySupported && (
              <div className="text-xs text-risk-high mt-1">{t('이 브라우저는 알림 기능을 지원하지 않습니다.')}</div>
            )}
            {notifySupported && notifyPermission === 'denied' && (
              <div className="text-xs text-risk-high mt-1">
                {t('브라우저에서 알림 권한이 차단돼 있습니다. 사이트 설정에서 알림을 허용해야 켤 수 있습니다.')}
              </div>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifyEnabled}
            onClick={toggleNotify}
            disabled={!notifySupported}
            className={`shrink-0 h-7 w-12 rounded-full border transition-colors relative disabled:opacity-40 disabled:cursor-not-allowed ${
              notifyEnabled ? 'bg-accent/80 border-accent' : 'bg-bg-soft border-border'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                notifyEnabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </Card>

      <Card title={t('내보내기')}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">{t('JSON으로 전체 내보내기')}</div>
              <div className="text-xs text-text-dim">
                {t('설비·이력(수리비용 포함)·레이아웃 매핑(도면·배치·구역)·법정/정기점검·자재재고· 양식(셀 매핑)까지 이 앱에서 다시 불러올 수 있는 형태로 전부 백업')}
              </div>
            </div>
            <button
              type="button"
              onClick={exportJson}
              className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition shrink-0"
            >
              {t('내려받기')}
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
            <div>
              <div className="text-sm font-medium">{t('옵시디언 볼트 형식(zip)으로 내보내기')}</div>
              <div className="text-xs text-text-dim">
                {t('설비카드·점검이력·자재카드 마크다운 노트로 변환된 zip — 옵시디언 볼트에 바로 복사 가능')}
              </div>
            </div>
            <button
              type="button"
              onClick={exportVaultZip}
              disabled={busy}
              className="rounded-lg border border-border text-sm font-medium px-4 py-2 hover:border-accent/50 hover:text-accent transition shrink-0 disabled:opacity-50"
            >
              {busy ? t('생성 중…') : t('내려받기')}
            </button>
          </div>
        </div>
      </Card>

      <Card title={t('가져오기')}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">{t('JSON 파일 불러오기')}</div>
            <div className="text-xs text-text-dim">
              {t('이 앱에서 내보낸 JSON을 다시 불러와 현재 데이터를 교체(설비·이력·레이아웃 매핑·법정/정기점검·자재재고·양식 전부)')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-border text-sm font-medium px-4 py-2 hover:border-accent/50 hover:text-accent transition shrink-0"
          >
            {t('파일 선택')}
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

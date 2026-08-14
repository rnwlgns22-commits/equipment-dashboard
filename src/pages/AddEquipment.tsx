import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useTemplateStore } from '../templateStore';
import { nextEquipmentId } from '../lib/equipmentId';
import { readDataTransfer, readFileList } from '../lib/readDroppedFiles';
import type { EquipmentCandidate, HistoryCandidate, FailedCandidate } from '../lib/uploadPipeline';
import { buildRecordsFromCandidates } from '../lib/uploadCommit';
import type { Equipment } from '../types';
import UploadReview from '../components/UploadReview';
import TemplateManager from '../components/TemplateManager';
import { showToast } from '../toastStore';
import EquipmentFormFields, { emptyEquipmentForm, equipmentFieldsFromForm } from '../components/EquipmentFormFields';
import { useT, useLang } from '../i18n';

type Tab = 'manual' | 'file' | 'template';
type FileMode = 'idle' | 'dragging' | 'parsing' | 'review';

export default function AddEquipment() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const equipments = useAppStore((s) => s.equipments);
  const appendData = useAppStore((s) => s.appendData);

  const [tab, setTab] = useState<Tab>('manual');
  const templates = useTemplateStore((s) => s.templates);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // ---- 수기 입력 ----
  const [form, setForm] = useState(emptyEquipmentForm);
  const [justAdded, setJustAdded] = useState<{ id: string; name: string } | null>(null);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.설비명.trim()) return;

    const id = nextEquipmentId(form.분류, equipments);
    const equipment: Equipment = {
      설비ID: id,
      ...equipmentFieldsFromForm(form),
      연결설비: [],
      상세사양: {},
      출처파일: '수기 입력',
    };

    appendData([equipment], []);
    setJustAdded({ id, name: equipment.설비명 });
    // 같은 분류/사이트 설비를 연달아 등록하는 경우가 많아 그 두 값만 남기고 나머지는 비움
    setForm((f) => ({ ...emptyEquipmentForm, 분류: f.분류, 사이트: f.사이트 }));
  };

  // ---- 파일로 업로드 ----
  const [fileMode, setFileMode] = useState<FileMode>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [equipmentCandidates, setEquipmentCandidates] = useState<EquipmentCandidate[]>([]);
  const [historyCandidates, setHistoryCandidates] = useState<HistoryCandidate[]>([]);
  const [failed, setFailed] = useState<FailedCandidate[]>([]);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const runPipeline = async (files: { file: File; relativePath: string }[]) => {
    if (files.length === 0) {
      setFileMode('idle');
      return;
    }
    setFileMode('parsing');
    setProgress({ done: 0, total: files.length });

    // 양식(셀 매핑)을 골랐으면 엑셀 파일만 그 양식으로 직접 처리하고, 나머지 형식은
    // 기존 일반 파이프라인(내용 기반 자동분류)으로 — 둘을 섞어 올려도 각자 알맞게 처리됨.
    const selectedTemplate = templates.find((tpl) => tpl.id === selectedTemplateId);
    const templateFiles = selectedTemplate ? files.filter((f) => /\.xlsx?$/i.test(f.file.name)) : [];
    const restFiles = selectedTemplate ? files.filter((f) => !/\.xlsx?$/i.test(f.file.name)) : files;

    const newEquipmentCandidates: EquipmentCandidate[] = [];
    const newFailed: FailedCandidate[] = [];
    let done = 0;

    if (selectedTemplate && templateFiles.length > 0) {
      const [{ readXlsxSheet }, { applyTemplateToSheet }] = await Promise.all([
        import('../lib/convert'),
        import('../lib/sheetTemplate'),
      ]);
      for (let i = 0; i < templateFiles.length; i += 1) {
        const { file, relativePath } = templateFiles[i];
        try {
          const sheet = await readXlsxSheet(file);
          const applied = applyTemplateToSheet(sheet, selectedTemplate);
          if (applied.length === 0) {
            newFailed.push({
              key: `tpl-${i}`,
              fileName: file.name,
              relativePath,
              reason:
                lang === 'ko'
                  ? `양식 "${selectedTemplate.name}" 적용 결과 설비명 칸이 비어있음`
                  : `Template "${selectedTemplate.name}" produced an empty equipment-name field`,
            });
          } else {
            applied.forEach((a, j) => {
              newEquipmentCandidates.push({
                key: `tpl-${i}-${j}`,
                fileName: file.name,
                relativePath,
                site: a.site,
                category: a.category,
                name: a.name,
                content: '',
                extraFields: a.extraFields,
                상세사양: a.상세사양,
                templateName: selectedTemplate.name,
              });
            });
          }
        } catch {
          newFailed.push({
            key: `tpl-${i}`,
            fileName: file.name,
            relativePath,
            reason: t('양식 적용 중 오류(엑셀 파일인지 확인)'),
          });
        }
        done += 1;
        setProgress({ done, total: files.length });
      }
    }

    let newHistoryCandidates: HistoryCandidate[] = [];
    if (restFiles.length > 0) {
      const { runUploadPipeline } = await import('../lib/uploadPipeline');
      const result = await runUploadPipeline(restFiles, equipments, (restDone, restTotal) =>
        setProgress({ done: done + restDone, total: Math.max(files.length, done + restTotal) }),
      );
      newEquipmentCandidates.push(...result.equipmentCandidates);
      newHistoryCandidates = result.historyCandidates;
      newFailed.push(...result.failed);
    }

    setEquipmentCandidates(newEquipmentCandidates);
    setHistoryCandidates(newHistoryCandidates);
    setFailed(newFailed);
    setFileMode('review');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    void readDataTransfer(e.dataTransfer).then(runPipeline);
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void runPipeline(readFileList(e.target.files));
    e.target.value = '';
  };

  const equipmentOptions = useMemo(
    () => [
      ...equipments.map((e) => ({ ref: e.설비ID, label: `${e.설비명} (${e.설비ID})` })),
      ...equipmentCandidates.map((c) => ({ ref: `cand:${c.key}`, label: `${c.name} (신규)` })),
    ],
    [equipments, equipmentCandidates],
  );

  const cancelFileReview = () => {
    setFileMode('idle');
    setEquipmentCandidates([]);
    setHistoryCandidates([]);
    setFailed([]);
  };

  const commitFileReview = () => {
    const { newEquipments, newHistories } = buildRecordsFromCandidates(
      equipmentCandidates,
      historyCandidates,
      equipments,
    );
    appendData(newEquipments, newHistories);
    cancelFileReview();
    navigate('/equipment');
    showToast(
      lang === 'ko'
        ? `설비 ${newEquipments.length}개, 이력 ${newHistories.length}건을 반영했습니다`
        : `Added ${newEquipments.length} equipment, ${newHistories.length} history records`,
    );
  };

  if (tab === 'file' && fileMode === 'review') {
    return (
      <div className="py-10">
        <UploadReview
          equipmentCandidates={equipmentCandidates}
          historyCandidates={historyCandidates}
          failed={failed}
          onUpdateEquipment={(key, patch) =>
            setEquipmentCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)))
          }
          onUpdateHistory={(key, patch) =>
            setHistoryCandidates((prev) => prev.map((h) => (h.key === key ? { ...h, ...patch } : h)))
          }
          equipmentOptions={equipmentOptions}
          onCommit={commitFileReview}
          onCancel={cancelFileReview}
        />
      </div>
    );
  }

  return (
    <div className={`p-6 md:p-8 space-y-6 ${tab === 'template' ? 'max-w-5xl' : 'max-w-2xl'}`}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('설비 추가')}</h1>
        <p className="text-sm text-text-dim mt-1">{t('직접 입력하거나, 점검·수리 기록 파일을 폴더째 올리면 자동으로 인식합니다.')}</p>
      </div>

      <div className="inline-flex rounded-lg border border-border p-1 gap-1">
        <button
          type="button"
          onClick={() => setTab('manual')}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            tab === 'manual' ? 'bg-accent/15 text-accent' : 'text-text-dim hover:text-text'
          }`}
        >
          {t('수기 입력')}
        </button>
        <button
          type="button"
          onClick={() => setTab('file')}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            tab === 'file' ? 'bg-accent/15 text-accent' : 'text-text-dim hover:text-text'
          }`}
        >
          {t('파일로 업로드')}
        </button>
        <button
          type="button"
          onClick={() => setTab('template')}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            tab === 'template' ? 'bg-accent/15 text-accent' : 'text-text-dim hover:text-text'
          }`}
        >
          {t('양식 등록')}
        </button>
      </div>

      {tab === 'template' && <TemplateManager />}

      {tab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          {justAdded && (
            <div className="rounded-2xl border border-risk-low/30 bg-risk-low/10 px-4 py-3 text-sm flex items-center justify-between gap-3">
              <span>
                {lang === 'ko' ? (
                  <><strong>{justAdded.name}</strong>이(가) <strong>{justAdded.id}</strong>로 등록되었습니다.</>
                ) : (
                  <>Registered <strong>{justAdded.name}</strong> as <strong>{justAdded.id}</strong>.</>
                )}
              </span>
              <Link to={`/equipment/${justAdded.id}`} className="text-accent hover:underline shrink-0">
                {t('상세 보기 →')}
              </Link>
            </div>
          )}

          <EquipmentFormFields form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />

          <button
            type="submit"
            className="rounded-lg bg-accent text-bg font-medium px-5 py-2.5 text-sm hover:brightness-110 transition"
          >
            {t('설비 등록')}
          </button>
        </form>
      )}

      {tab === 'file' && (
        <div>
          {templates.length > 0 && (
            <label className="block mb-3">
              <span className="text-xs text-text-dim">{t('적용할 양식 (엑셀 파일에만 적용됩니다)')}</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="">{t('일반 처리(자동 분류)')}</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setFileMode('dragging');
            }}
            onDragLeave={() => setFileMode('idle')}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed py-12 px-6 text-center transition-colors ${
              fileMode === 'dragging'
                ? 'border-accent bg-accent/5'
                : 'border-border bg-bg-soft/60 hover:border-accent/50'
            }`}
          >
            {fileMode === 'parsing' ? (
              <p className="text-text-dim text-sm">
                {t('분석 중…')} {progress.total > 0 ? `${progress.done}/${progress.total}` : ''}
              </p>
            ) : (
              <>
                <p className="text-text-dim text-sm">{t('여기로 업무폴더를 끌어다 놓으세요')}</p>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="mt-3 text-xs text-accent hover:underline"
                >
                  {t('또는 폴더 선택하기')}
                </button>
                <input
                  ref={folderInputRef}
                  type="file"
                  // @ts-expect-error 표준 File 타입엔 없지만 크로미움 계열이 지원하는 폴더선택 속성
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                  onChange={handleFolderSelect}
                />
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-text-dim">
            {t('hwp/hwpx/xls/xlsx/pdf/pptx/docx 지원. 파일은 서버로 전송되지 않고 브라우저 안에서만 처리됩니다.')}
          </p>
        </div>
      )}
    </div>
  );
}

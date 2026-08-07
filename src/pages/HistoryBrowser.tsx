import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { useHistoryTemplateStore } from '../historyTemplateStore';
import AnimatedTabs from '../components/AnimatedTabs';
import Reveal from '../components/Reveal';
import UploadReview from '../components/UploadReview';
import HistoryTemplateManager from '../components/HistoryTemplateManager';
import { showToast } from '../toastStore';
import { csvBlob } from '../lib/csv';
import { downloadBlob } from '../lib/vaultExport';
import { readDataTransfer, readFileList } from '../lib/readDroppedFiles';
import { buildRecordsFromCandidates } from '../lib/uploadCommit';
import type { EquipmentCandidate, HistoryCandidate, FailedCandidate } from '../lib/uploadPipeline';
import type { HistoryRecord, HistoryType } from '../types';

const emptyAddForm = { 날짜: '', 유형: '점검' as HistoryType, 설비ID: '', 제목: '', 내용: '', 비용: '' };

type AddTab = 'manual' | 'file' | 'template';
type FileMode = 'idle' | 'dragging' | 'parsing' | 'review';

export default function HistoryBrowser() {
  const equipments = useAppStore((s) => s.equipments);
  const histories = useAppStore((s) => s.histories);
  const addHistory = useAppStore((s) => s.addHistory);
  const updateHistory = useAppStore((s) => s.updateHistory);
  const deleteHistory = useAppStore((s) => s.deleteHistory);
  const appendData = useAppStore((s) => s.appendData);
  const historyTemplates = useHistoryTemplateStore((s) => s.templates);
  const equipmentsById = useMemo(() => new Map(equipments.map((e) => [e.설비ID, e])), [equipments]);

  const [tab, setTab] = useState<'전체' | '고아'>('전체');
  const [typeFilter, setTypeFilter] = useState<'전체' | HistoryType>('전체');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');

  // 통합검색(GlobalSearch.tsx)에서 이력을 골라 들어오면 이 화면으로 넘어와서
  // 검색창에 그 제목을 채워 바로 찾아준다 — 이력은 별도 상세 페이지가 없어서
  // 목록 화면 + 검색으로 대신함(2026-07-27).
  const location = useLocation();
  useEffect(() => {
    const preset = (location.state as { presetQuery?: string } | null)?.presetQuery;
    if (preset) setQuery(preset);
  }, [location.state]);

  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);

  // 설비추가(AddEquipment.tsx)와 같은 프레임 — 수기입력/파일로 업로드/양식등록 3탭
  // (2026-07-26 추가). 파일 업로드·양식등록은 EquipmentCandidate도 같이 만들 수 있어서
  // (예: 폴더에 설비대장 파일이 섞여 있으면) 두 후보 목록을 모두 검토화면에 보여준다.
  const [addTab, setAddTab] = useState<AddTab>('manual');
  const [selectedHistoryTemplateId, setSelectedHistoryTemplateId] = useState('');
  const [fileMode, setFileMode] = useState<FileMode>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [fileEquipCandidates, setFileEquipCandidates] = useState<EquipmentCandidate[]>([]);
  const [fileHistoryCandidates, setFileHistoryCandidates] = useState<HistoryCandidate[]>([]);
  const [fileFailed, setFileFailed] = useState<FailedCandidate[]>([]);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const runFilePipeline = async (files: { file: File; relativePath: string }[]) => {
    if (files.length === 0) {
      setFileMode('idle');
      return;
    }
    setFileMode('parsing');
    setProgress({ done: 0, total: files.length });

    const selectedTemplate = historyTemplates.find((t) => t.id === selectedHistoryTemplateId);
    const templateFiles = selectedTemplate ? files.filter((f) => /\.xlsx?$/i.test(f.file.name)) : [];
    const restFiles = selectedTemplate ? files.filter((f) => !/\.xlsx?$/i.test(f.file.name)) : files;

    const newHistoryCandidates: HistoryCandidate[] = [];
    const newFailed: FailedCandidate[] = [];
    let done = 0;

    if (selectedTemplate && templateFiles.length > 0) {
      const [{ readXlsxSheet }, { applyHistoryTemplateToSheet }] = await Promise.all([
        import('../lib/convert'),
        import('../lib/historySheetTemplate'),
      ]);
      for (let i = 0; i < templateFiles.length; i += 1) {
        const { file, relativePath } = templateFiles[i];
        try {
          const sheet = await readXlsxSheet(file);
          const applied = applyHistoryTemplateToSheet(sheet, selectedTemplate);
          if (applied.length === 0) {
            newFailed.push({
              key: `htpl-${i}`,
              fileName: file.name,
              relativePath,
              reason: `양식 "${selectedTemplate.name}" 적용 결과 제목/날짜 칸이 비어있음`,
            });
          } else {
            applied.forEach((a, j) => {
              const matched = a.equipmentName
                ? equipments.find((e) => e.설비명 === a.equipmentName!.trim())
                : undefined;
              newHistoryCandidates.push({
                key: `htpl-${i}-${j}`,
                fileName: file.name,
                relativePath,
                date: a.date,
                type: a.type,
                title: a.title,
                equipmentRef: matched ? matched.설비ID : '',
                content: a.content ?? '',
                비용: a.cost,
              });
            });
          }
        } catch {
          newFailed.push({
            key: `htpl-${i}`,
            fileName: file.name,
            relativePath,
            reason: '양식 적용 중 오류(엑셀 파일인지 확인)',
          });
        }
        done += 1;
        setProgress({ done, total: files.length });
      }
    }

    let newEquipCandidates: EquipmentCandidate[] = [];
    if (restFiles.length > 0) {
      const { runUploadPipeline } = await import('../lib/uploadPipeline');
      const result = await runUploadPipeline(restFiles, equipments, (restDone, restTotal) =>
        setProgress({ done: done + restDone, total: Math.max(files.length, done + restTotal) }),
      );
      newEquipCandidates = result.equipmentCandidates;
      newHistoryCandidates.push(...result.historyCandidates);
      newFailed.push(...result.failed);
    }

    setFileEquipCandidates(newEquipCandidates);
    setFileHistoryCandidates(newHistoryCandidates);
    setFileFailed(newFailed);
    setFileMode('review');
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    void readDataTransfer(e.dataTransfer).then(runFilePipeline);
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void runFilePipeline(readFileList(e.target.files));
    e.target.value = '';
  };

  const cancelFileReview = () => {
    setFileMode('idle');
    setFileEquipCandidates([]);
    setFileHistoryCandidates([]);
    setFileFailed([]);
  };

  const commitFileReview = () => {
    const { newEquipments, newHistories } = buildRecordsFromCandidates(fileEquipCandidates, fileHistoryCandidates, equipments);
    appendData(newEquipments, newHistories);
    cancelFileReview();
    setAdding(false);
    showToast(`설비 ${newEquipments.length}개, 이력 ${newHistories.length}건을 반영했습니다`);
  };

  const fileEquipmentOptions = useMemo(
    () => [
      ...equipments.map((e) => ({ ref: e.설비ID, label: `${e.설비명} (${e.설비ID})` })),
      ...fileEquipCandidates.map((c) => ({ ref: `cand:${c.key}`, label: `${c.name} (신규)` })),
    ],
    [equipments, fileEquipCandidates],
  );

  // 지금까지 이력을 고친다는 게 "설비 재지정" 하나뿐이었음 — 날짜·유형·제목에 오타가
  // 있어도 지우고 다시 등록하는 것 말고는 방법이 없었음.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 날짜: '', 유형: '점검' as HistoryType, 제목: '', 내용: '', 비용: '' });

  const startEditing = (h: HistoryRecord) => {
    setEditingId(h.id);
    setEditForm({ 날짜: h.날짜, 유형: h.유형, 제목: h.제목, 내용: h.내용 ?? '', 비용: h.비용 ? String(h.비용) : '' });
  };
  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm.날짜 || !editForm.제목.trim()) return;
    const 비용 = Number(editForm.비용);
    updateHistory(editingId, {
      날짜: editForm.날짜,
      유형: editForm.유형,
      제목: editForm.제목.trim(),
      내용: editForm.내용.trim() || undefined,
      비용: editForm.비용 && 비용 > 0 ? 비용 : undefined,
    });
    setEditingId(null);
    showToast('이력을 수정했습니다');
  };

  const orphanCount = useMemo(() => histories.filter((h) => !h.설비ID).length, [histories]);

  const filtered = useMemo(() => {
    return histories
      .filter((h) => (tab === '고아' ? !h.설비ID : true))
      .filter((h) => (typeFilter === '전체' ? true : h.유형 === typeFilter))
      .filter((h) => (from ? h.날짜 >= from : true))
      .filter((h) => (to ? h.날짜 <= to : true))
      .filter((h) => {
        if (!query) return true;
        const eqName = h.설비ID ? equipmentsById.get(h.설비ID)?.설비명 ?? '' : '';
        return h.제목.includes(query) || eqName.includes(query) || (h.설비ID ?? '').includes(query);
      })
      .sort((a, b) => b.날짜.localeCompare(a.날짜));
  }, [histories, tab, typeFilter, from, to, query, equipmentsById]);

  const exportCsv = () => {
    const rows = filtered.map((h) => ({
      날짜: h.날짜,
      유형: h.유형,
      제목: h.제목,
      설비ID: h.설비ID ?? '',
      설비명: h.설비ID ? equipmentsById.get(h.설비ID)?.설비명 ?? '' : '',
      비용: h.비용 ?? '',
      내용: h.내용 ?? '',
    }));
    downloadBlob(csvBlob(rows), `점검수리이력_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // 목록이 많아지면 하나씩 지우는 게 번거로워서(2026-07-21 요청) 행마다 체크박스 +
  // 상단 일괄삭제 추가. 필터가 바뀌어도 선택은 유지(필터 view와 무관하게 지워짐).
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((h) => selected.has(h.id));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((h) => next.delete(h.id));
      } else {
        filtered.forEach((h) => next.add(h.id));
      }
      return next;
    });
  };

  const bulkDelete = () => {
    if (selected.size === 0) return;
    if (!window.confirm(`선택한 이력 ${selected.size}건을 삭제할까요?`)) return;
    const count = selected.size;
    const snapshot = { histories };
    selected.forEach((id) => deleteHistory(id));
    setSelected(new Set());
    showToast(`이력 ${count}건을 삭제했습니다`, 'success', {
      label: '실행취소',
      onClick: () => useAppStore.getState().restoreSnapshot(snapshot),
    });
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.날짜 || !addForm.제목.trim()) return;
    const 비용 = Number(addForm.비용);
    const record: HistoryRecord = {
      id: `hist-manual-${Date.now()}`,
      날짜: addForm.날짜,
      설비ID: addForm.설비ID || undefined,
      유형: addForm.유형,
      제목: addForm.제목.trim(),
      내용: addForm.내용.trim() || undefined,
      비용: addForm.비용 && 비용 > 0 ? 비용 : undefined,
      출처파일: '수기 입력',
    };
    addHistory(record);
    setAddForm(emptyAddForm);
    setAdding(false);
    showToast('이력을 추가했습니다');
  };

  const handleDelete = (h: HistoryRecord) => {
    if (!window.confirm(`"${h.제목}" 이력을 삭제할까요?`)) return;
    const snapshot = { histories };
    deleteHistory(h.id);
    showToast('이력을 삭제했습니다', 'success', {
      label: '실행취소',
      onClick: () => useAppStore.getState().restoreSnapshot(snapshot),
    });
  };

  if (adding && addTab === 'file' && fileMode === 'review') {
    return (
      <div className="py-10">
        <UploadReview
          equipmentCandidates={fileEquipCandidates}
          historyCandidates={fileHistoryCandidates}
          failed={fileFailed}
          onUpdateEquipment={(key, patch) =>
            setFileEquipCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)))
          }
          onUpdateHistory={(key, patch) =>
            setFileHistoryCandidates((prev) => prev.map((h) => (h.key === key ? { ...h, ...patch } : h)))
          }
          equipmentOptions={fileEquipmentOptions}
          onCommit={commitFileReview}
          onCancel={cancelFileReview}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">점검·수리 이력</h1>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition shrink-0"
        >
          {adding ? '닫기' : '+ 이력 추가'}
        </button>
      </div>

      {adding && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="inline-flex rounded-lg border border-border p-1 gap-1">
            <button
              type="button"
              onClick={() => setAddTab('manual')}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                addTab === 'manual' ? 'bg-accent/15 text-accent' : 'text-text-dim hover:text-text'
              }`}
            >
              수기 입력
            </button>
            <button
              type="button"
              onClick={() => setAddTab('file')}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                addTab === 'file' ? 'bg-accent/15 text-accent' : 'text-text-dim hover:text-text'
              }`}
            >
              파일로 업로드
            </button>
            <button
              type="button"
              onClick={() => setAddTab('template')}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                addTab === 'template' ? 'bg-accent/15 text-accent' : 'text-text-dim hover:text-text'
              }`}
            >
              양식 등록
            </button>
          </div>

          {addTab === 'manual' && (
            <form
              onSubmit={submitAdd}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
            >
              <label className="block">
                <span className="text-xs text-text-dim">날짜 *</span>
                <input
                  required
                  type="date"
                  value={addForm.날짜}
                  onChange={(e) => setAddForm((f) => ({ ...f, 날짜: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
                />
              </label>
              <label className="block">
                <span className="text-xs text-text-dim">유형</span>
                <select
                  value={addForm.유형}
                  onChange={(e) => setAddForm((f) => ({ ...f, 유형: e.target.value as HistoryType }))}
                  className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                >
                  <option>점검</option>
                  <option>수리</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-text-dim">설비</span>
                <select
                  value={addForm.설비ID}
                  onChange={(e) => setAddForm((f) => ({ ...f, 설비ID: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                >
                  <option value="">설비 미지정</option>
                  {equipments.map((e) => (
                    <option key={e.설비ID} value={e.설비ID}>
                      {e.설비명} ({e.설비ID})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-text-dim">제목 *</span>
                <input
                  required
                  value={addForm.제목}
                  onChange={(e) => setAddForm((f) => ({ ...f, 제목: e.target.value }))}
                  placeholder="예: 공조기 1호기 필터 교체"
                  className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
                />
              </label>
              <label className="block sm:col-span-2 lg:col-span-3">
                <span className="text-xs text-text-dim">내용</span>
                <input
                  value={addForm.내용}
                  onChange={(e) => setAddForm((f) => ({ ...f, 내용: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
                />
              </label>
              <label className="block">
                <span className="text-xs text-text-dim">비용(원)</span>
                <input
                  type="number"
                  min={0}
                  value={addForm.비용}
                  onChange={(e) => setAddForm((f) => ({ ...f, 비용: e.target.value }))}
                  placeholder="예: 50000"
                  className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm outline-none focus:border-accent/60"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition"
              >
                등록
              </button>
            </form>
          )}

          {addTab === 'file' && (
            <div>
              {historyTemplates.length > 0 && (
                <label className="block mb-3">
                  <span className="text-xs text-text-dim">적용할 양식 (엑셀 파일에만 적용됩니다)</span>
                  <select
                    value={selectedHistoryTemplateId}
                    onChange={(e) => setSelectedHistoryTemplateId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
                  >
                    <option value="">일반 처리(자동 분류)</option>
                    {historyTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
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
                onDrop={handleFileDrop}
                className={`rounded-2xl border-2 border-dashed py-12 px-6 text-center transition-colors ${
                  fileMode === 'dragging' ? 'border-accent bg-accent/5' : 'border-border bg-bg-soft/60 hover:border-accent/50'
                }`}
              >
                {fileMode === 'parsing' ? (
                  <p className="text-text-dim text-sm">
                    분석 중… {progress.total > 0 ? `${progress.done}/${progress.total}` : ''}
                  </p>
                ) : (
                  <>
                    <p className="text-text-dim text-sm">여기로 점검·수리 기록 폴더를 끌어다 놓으세요</p>
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="mt-3 text-xs text-accent hover:underline"
                    >
                      또는 폴더 선택하기
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
                hwp/hwpx/xls/xlsx/pdf/pptx/docx 지원. 파일은 서버로 전송되지 않고 브라우저 안에서만 처리됩니다.
              </p>
            </div>
          )}

          {addTab === 'template' && <HistoryTemplateManager />}
        </div>
      )}

      <AnimatedTabs
        layoutId="history-tab"
        value={tab}
        onChange={setTab}
        options={[
          { value: '전체', label: '전체 이력', count: histories.length },
          { value: '고아', label: '설비 매칭 안 됨', count: orphanCount },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·설비명·ID 검색"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm w-52 outline-none focus:border-accent/60"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as '전체' | HistoryType)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option>전체</option>
          <option>점검</option>
          <option>수리</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <span className="self-center text-text-dim text-sm">~</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="ml-auto rounded-lg border border-border px-3 py-2 text-xs text-text-dim hover:text-accent hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          CSV 내보내기
        </button>
        <label className="flex items-center gap-1.5 text-xs text-text-dim">
          <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />
          전체선택
        </label>
        <span className="self-center text-xs text-text-dim">{filtered.length}건</span>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm">
          <span>{selected.size}건 선택됨</span>
          <div className="flex gap-3 shrink-0">
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-text-dim hover:text-text">
              선택 해제
            </button>
            <button type="button" onClick={bulkDelete} className="text-xs text-risk-high hover:underline">
              선택 삭제
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence>
        {filtered.map((h, i) =>
          editingId === h.id ? (
            <Reveal key={h.id} index={i}>
            <form
              onSubmit={saveEdit}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent/50 bg-card px-4 py-3"
            >
              <input
                type="date"
                required
                value={editForm.날짜}
                onChange={(e) => setEditForm((f) => ({ ...f, 날짜: e.target.value }))}
                className="w-32 shrink-0 rounded-lg border border-border bg-bg-soft px-2 py-1 text-xs"
              />
              <select
                value={editForm.유형}
                onChange={(e) => setEditForm((f) => ({ ...f, 유형: e.target.value as HistoryType }))}
                className="shrink-0 rounded-lg border border-border bg-bg-soft px-2 py-1 text-xs"
              >
                <option>점검</option>
                <option>수리</option>
              </select>
              <input
                required
                value={editForm.제목}
                onChange={(e) => setEditForm((f) => ({ ...f, 제목: e.target.value }))}
                className="flex-1 min-w-0 rounded-lg border border-border bg-bg-soft px-2 py-1 text-sm"
              />
              <input
                type="number"
                min={0}
                value={editForm.비용}
                onChange={(e) => setEditForm((f) => ({ ...f, 비용: e.target.value }))}
                placeholder="비용(원)"
                aria-label="비용(원)"
                className="w-24 shrink-0 rounded-lg border border-border bg-bg-soft px-2 py-1 text-xs"
              />
              <input
                value={editForm.내용}
                onChange={(e) => setEditForm((f) => ({ ...f, 내용: e.target.value }))}
                placeholder="내용"
                aria-label="내용"
                className="w-full rounded-lg border border-border bg-bg-soft px-2 py-1 text-sm"
              />
              <button type="submit" className="text-xs text-accent hover:underline shrink-0">
                저장
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-xs text-text-dim hover:text-text shrink-0"
              >
                취소
              </button>
            </form>
            </Reveal>
          ) : (
            <Reveal key={h.id} index={i}>
            {/* 한 줄에 shrink-0 요소가 8개라 390px 화면에서 폭이 557px까지 밀려나,
                제목이 안 보이고 수정·삭제 버튼이 화면 밖으로 잘려 아예 못 눌렀음
                (2026-08-07 모바일 점검에서 발견. main이 overflow-x-hidden이라
                가로 스크롤도 안 생겨서 접근 자체가 불가능했음).
                모바일에서만 두 줄로 쪼갬 — 아래 래퍼가 sm 이상에서 display:contents가
                되면서 사라지므로 데스크톱 레이아웃은 종전과 완전히 동일하다. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-nowrap sm:gap-4">
              <input
                type="checkbox"
                checked={selected.has(h.id)}
                onChange={() => toggleSelect(h.id)}
                aria-label={`${h.제목} 선택`}
                className="shrink-0"
              />
              <span className="text-xs text-text-dim shrink-0 sm:w-24">{h.날짜}</span>
              <span
                className={`text-xs rounded-full px-2 py-0.5 shrink-0 ${
                  h.유형 === '수리' ? 'bg-risk-high/15 text-risk-high' : 'bg-accent/15 text-accent'
                }`}
              >
                {h.유형}
              </span>

              {/* 모바일: 제목·비용·설비명을 묶어 둘째 줄로. sm 이상: contents로 풀려 원래대로 */}
              <div className="order-last flex w-full min-w-0 items-center gap-3 sm:order-none sm:contents">
                <span className="text-sm flex-1 min-w-0 truncate">{h.제목}</span>
                <span className="text-xs text-text-dim shrink-0 text-right sm:w-20" title="비용">
                  {h.비용 ? `${h.비용.toLocaleString()}원` : '-'}
                </span>
                {h.설비ID ? (
                  <Link
                    to={`/equipment/${h.설비ID}`}
                    className="text-xs text-accent hover:underline shrink-0 max-w-[8rem] truncate sm:max-w-none"
                  >
                    {equipmentsById.get(h.설비ID)?.설비명 ?? h.설비ID}
                  </Link>
                ) : (
                  <select
                    value=""
                    onChange={(e) => e.target.value && updateHistory(h.id, { 설비ID: e.target.value })}
                    className="text-xs rounded-lg border border-border bg-bg-soft px-2 py-1 shrink-0 max-w-[8rem] sm:max-w-[10rem]"
                    title="설비를 지정하면 고아 이력에서 빠집니다"
                  >
                    <option value="">설비 지정…</option>
                    {equipments.map((e) => (
                      <option key={e.설비ID} value={e.설비ID}>
                        {e.설비명} ({e.설비ID})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 모바일에선 첫 줄 오른쪽 끝으로 밀어붙임(ml-auto), 데스크톱은 종전 위치 */}
              <button
                type="button"
                onClick={() => startEditing(h)}
                className="text-xs text-text-dim hover:text-accent shrink-0 ml-auto p-1.5 -m-1.5 rounded-lg hover:bg-white/5 sm:ml-0"
                aria-label="이력 수정"
                title="수정"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => handleDelete(h)}
                className="text-xs text-text-dim hover:text-risk-high shrink-0 p-1.5 -m-1.5 rounded-lg hover:bg-white/5"
                aria-label="이력 삭제"
                title="삭제"
              >
                ✕
              </button>
            </div>
            </Reveal>
          ),
        )}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="text-sm text-text-dim text-center py-8">조건에 맞는 이력이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

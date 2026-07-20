import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { nextEquipmentId } from '../lib/equipmentId';
import { readDataTransfer, readFileList } from '../lib/readDroppedFiles';
import type { EquipmentCandidate, HistoryCandidate, FailedCandidate } from '../lib/uploadPipeline';
import { buildRecordsFromCandidates } from '../lib/uploadCommit';
import type { Category, Equipment, EquipmentStatus } from '../types';
import UploadReview from '../components/UploadReview';

const CATEGORIES: Category[] = ['공조', '냉난방', '급배수', '전기', '소방', '승강기', '통신', '기타'];
const STATUSES: EquipmentStatus[] = ['정상', '수리중', '정지', '폐기'];

type Tab = 'manual' | 'file';
type FileMode = 'idle' | 'dragging' | 'parsing' | 'review';

// 최근점검일 + 점검주기일(일) = 다음점검일 자동계산(설계.md §3). .toISOString()로 다시 읽는
// 코드가 있어서(§ 다른 화면들과 동일 관례) 지역시간 생성자를 쓰면 UTC+9 등에서 하루씩
// 밀릴 수 있음 — Date.UTC로 생성.
function addDaysUTC(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const emptyForm = {
  설비명: '',
  분류: '공조' as Category,
  사이트: '',
  위치: '',
  제조사: '',
  모델명: '',
  설치일: '',
  상태: '정상' as EquipmentStatus,
  최근점검일: '',
  점검주기일: '',
};

export default function AddEquipment() {
  const navigate = useNavigate();
  const equipments = useAppStore((s) => s.equipments);
  const appendData = useAppStore((s) => s.appendData);

  const [tab, setTab] = useState<Tab>('manual');

  // ---- 수기 입력 ----
  const [form, setForm] = useState(emptyForm);
  const [justAdded, setJustAdded] = useState<{ id: string; name: string } | null>(null);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.설비명.trim()) return;

    const id = nextEquipmentId(form.분류, equipments);
    const 점검주기일 = form.점검주기일 ? Number(form.점검주기일) : undefined;
    const 다음점검일 =
      form.최근점검일 && 점검주기일 ? addDaysUTC(form.최근점검일, 점검주기일) : undefined;

    const equipment: Equipment = {
      설비ID: id,
      설비명: form.설비명.trim(),
      분류: form.분류,
      사이트: form.사이트.trim() || '미분류',
      위치: form.위치.trim() || undefined,
      제조사: form.제조사.trim() || undefined,
      모델명: form.모델명.trim() || undefined,
      설치일: form.설치일 || undefined,
      상태: form.상태,
      점검주기일,
      최근점검일: form.최근점검일 || undefined,
      다음점검일,
      연결설비: [],
      상세사양: {},
      출처파일: '수기 입력',
    };

    appendData([equipment], []);
    setJustAdded({ id, name: equipment.설비명 });
    // 같은 분류/사이트 설비를 연달아 등록하는 경우가 많아 그 두 값만 남기고 나머지는 비움
    setForm((f) => ({ ...emptyForm, 분류: f.분류, 사이트: f.사이트 }));
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
    setProgress({ done: 0, total: 0 });
    const { runUploadPipeline } = await import('../lib/uploadPipeline');
    const result = await runUploadPipeline(files, equipments, (done, total) => setProgress({ done, total }));
    setEquipmentCandidates(result.equipmentCandidates);
    setHistoryCandidates(result.historyCandidates);
    setFailed(result.failed);
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
    <div className="p-6 md:p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">설비 추가</h1>
        <p className="text-sm text-text-dim mt-1">직접 입력하거나, 점검·수리 기록 파일을 폴더째 올리면 자동으로 인식합니다.</p>
      </div>

      <div className="inline-flex rounded-lg border border-border p-1 gap-1">
        <button
          type="button"
          onClick={() => setTab('manual')}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            tab === 'manual' ? 'bg-accent/15 text-accent' : 'text-text-dim hover:text-text'
          }`}
        >
          수기 입력
        </button>
        <button
          type="button"
          onClick={() => setTab('file')}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            tab === 'file' ? 'bg-accent/15 text-accent' : 'text-text-dim hover:text-text'
          }`}
        >
          파일로 업로드
        </button>
      </div>

      {tab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          {justAdded && (
            <div className="rounded-xl border border-risk-low/30 bg-risk-low/10 px-4 py-3 text-sm flex items-center justify-between gap-3">
              <span>
                <strong>{justAdded.name}</strong>이(가) <strong>{justAdded.id}</strong>로 등록되었습니다.
              </span>
              <Link to={`/equipment/${justAdded.id}`} className="text-accent hover:underline shrink-0">
                상세 보기 →
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="text-xs text-text-dim">설비명 *</span>
              <input
                required
                value={form.설비명}
                onChange={(e) => setForm((f) => ({ ...f, 설비명: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
                placeholder="예: 공조기 4호기"
              />
            </label>

            <label className="block">
              <span className="text-xs text-text-dim">분류 *</span>
              <select
                value={form.분류}
                onChange={(e) => setForm((f) => ({ ...f, 분류: e.target.value as Category }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-text-dim">상태</span>
              <select
                value={form.상태}
                onChange={(e) => setForm((f) => ({ ...f, 상태: e.target.value as EquipmentStatus }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-text-dim">사이트</span>
              <input
                value={form.사이트}
                onChange={(e) => setForm((f) => ({ ...f, 사이트: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
                placeholder="예: A동 (비우면 미분류)"
              />
            </label>
            <label className="block">
              <span className="text-xs text-text-dim">위치</span>
              <input
                value={form.위치}
                onChange={(e) => setForm((f) => ({ ...f, 위치: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
                placeholder="예: 지하2층 기계실"
              />
            </label>

            <label className="block">
              <span className="text-xs text-text-dim">제조사</span>
              <input
                value={form.제조사}
                onChange={(e) => setForm((f) => ({ ...f, 제조사: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
              />
            </label>
            <label className="block">
              <span className="text-xs text-text-dim">모델명</span>
              <input
                value={form.모델명}
                onChange={(e) => setForm((f) => ({ ...f, 모델명: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
              />
            </label>

            <label className="block">
              <span className="text-xs text-text-dim">설치일</span>
              <input
                type="date"
                value={form.설치일}
                onChange={(e) => setForm((f) => ({ ...f, 설치일: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
              />
            </label>
            <label className="block">
              <span className="text-xs text-text-dim">최근점검일</span>
              <input
                type="date"
                value={form.최근점검일}
                onChange={(e) => setForm((f) => ({ ...f, 최근점검일: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
              />
            </label>
            <label className="block">
              <span className="text-xs text-text-dim">점검주기(일)</span>
              <input
                type="number"
                min={1}
                value={form.점검주기일}
                onChange={(e) => setForm((f) => ({ ...f, 점검주기일: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent/60"
                placeholder="예: 30"
              />
            </label>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-accent text-bg font-medium px-5 py-2.5 text-sm hover:brightness-110 transition"
          >
            설비 등록
          </button>
        </form>
      )}

      {tab === 'file' && (
        <div>
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
                분석 중… {progress.total > 0 ? `${progress.done}/${progress.total}` : ''}
              </p>
            ) : (
              <>
                <p className="text-text-dim text-sm">여기로 업무폴더를 끌어다 놓으세요</p>
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
    </div>
  );
}

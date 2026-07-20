import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { sampleEquipments, sampleHistories } from '../lib/sampleData';
import { readDataTransfer, readFileList } from '../lib/readDroppedFiles';
import type { EquipmentCandidate, HistoryCandidate, FailedCandidate } from '../lib/uploadPipeline';
import { nextEquipmentId } from '../lib/equipmentId';
import type { Equipment, HistoryRecord } from '../types';
import UploadReview from '../components/UploadReview';
import mascotGreeting from '../assets/mascot/greeting.png';

type Mode = 'idle' | 'dragging' | 'parsing' | 'review';

export default function Landing() {
  const navigate = useNavigate();
  const equipments = useAppStore((s) => s.equipments);
  const loadData = useAppStore((s) => s.loadData);
  const appendData = useAppStore((s) => s.appendData);

  const [mode, setMode] = useState<Mode>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [equipmentCandidates, setEquipmentCandidates] = useState<EquipmentCandidate[]>([]);
  const [historyCandidates, setHistoryCandidates] = useState<HistoryCandidate[]>([]);
  const [failed, setFailed] = useState<FailedCandidate[]>([]);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const loadSample = () => {
    loadData(sampleEquipments, sampleHistories);
    navigate('/dashboard');
  };

  const runPipeline = async (files: { file: File; relativePath: string }[]) => {
    if (files.length === 0) {
      // 드롭한 게 파일이 아니어서(텍스트 선택 등) 0건으로 끝나면, 'drop' 이벤트는
      // 'dragleave' 없이 바로 발생하므로 여기서 안 돌려놓으면 강조 테두리가 새로고침할
      // 때까지 안 풀림(2026-07-20 코드리뷰에서 발견).
      setMode('idle');
      return;
    }
    setMode('parsing');
    setProgress({ done: 0, total: 0 });
    // xlsx/pdfjs/mammoth를 물고 있는 무거운 모듈이라, 실제로 파일을 넣기 전까진
    // 번들에 안 실리게 동적 import(랜딩은 초기 진입 라우트라 lazy 라우팅이 안 먹음).
    const { runUploadPipeline } = await import('../lib/uploadPipeline');
    const result = await runUploadPipeline(files, equipments, (done, total) => setProgress({ done, total }));
    setEquipmentCandidates(result.equipmentCandidates);
    setHistoryCandidates(result.historyCandidates);
    setFailed(result.failed);
    setMode('review');
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

  const cancelReview = () => {
    setMode('idle');
    setEquipmentCandidates([]);
    setHistoryCandidates([]);
    setFailed([]);
  };

  const commitReview = () => {
    const runningEquipments = [...equipments];
    const keyToId = new Map<string, string>();
    const newEquipments: Equipment[] = [];

    for (const c of equipmentCandidates) {
      const id = nextEquipmentId(c.category, runningEquipments);
      const equipment: Equipment = {
        설비ID: id,
        설비명: c.name,
        분류: c.category,
        사이트: c.site,
        상태: '정상',
        연결설비: [],
        상세사양: { 자동인식: '업로드 파일에서 자동 추출됨 — 필요하면 상세 페이지에서 보완하세요' },
        출처파일: c.relativePath,
      };
      newEquipments.push(equipment);
      runningEquipments.push(equipment);
      keyToId.set(c.key, id);
    }

    const newHistories: HistoryRecord[] = historyCandidates.map((h, i) => {
      let 설비ID: string | undefined;
      if (h.equipmentRef.startsWith('cand:')) {
        설비ID = keyToId.get(h.equipmentRef.slice(5));
      } else if (h.equipmentRef) {
        설비ID = h.equipmentRef;
      }
      return {
        id: `up-h-${Date.now()}-${i}`,
        날짜: h.date,
        설비ID,
        유형: h.type,
        제목: h.title,
        출처파일: h.relativePath,
      };
    });

    appendData(newEquipments, newHistories);
    cancelReview();
    navigate('/dashboard');
  };

  if (mode === 'review') {
    return (
      <div className="min-h-screen bg-bg text-text py-10">
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
          onCommit={commitReview}
          onCancel={cancelReview}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg text-text px-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <img
          src={mascotGreeting}
          alt="환영 인사를 하는 마스코트 캐릭터"
          className="mx-auto h-28 w-auto animate-mascot-float select-none"
          draggable={false}
        />

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
          onDragOver={(e) => {
            e.preventDefault();
            setMode('dragging');
          }}
          onDragLeave={() => setMode('idle')}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed py-14 px-6 transition-colors ${
            mode === 'dragging' ? 'border-accent bg-accent/5' : 'border-border bg-bg-soft/60 hover:border-accent/50'
          }`}
        >
          {mode === 'parsing' ? (
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

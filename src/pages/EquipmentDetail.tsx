import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { computeFailureStats } from '../lib/stats';
import Card from '../components/Card';
import EquipmentFormFields, { emptyEquipmentForm, equipmentFieldsFromForm, type EquipmentFormState } from '../components/EquipmentFormFields';
import type { HistoryRecord, HistoryType } from '../types';
import mascotSurprised from '../assets/mascot/surprised.png';

function formFromEquipment(e: {
  설비명: string;
  분류: EquipmentFormState['분류'];
  사이트: string;
  위치?: string;
  제조사?: string;
  모델명?: string;
  설치일?: string;
  상태: EquipmentFormState['상태'];
  최근점검일?: string;
  점검주기일?: number;
}): EquipmentFormState {
  return {
    설비명: e.설비명,
    분류: e.분류,
    사이트: e.사이트 === '미분류' ? '' : e.사이트,
    위치: e.위치 ?? '',
    제조사: e.제조사 ?? '',
    모델명: e.모델명 ?? '',
    설치일: e.설치일 ?? '',
    상태: e.상태,
    최근점검일: e.최근점검일 ?? '',
    점검주기일: e.점검주기일 ? String(e.점검주기일) : '',
  };
}

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const equipments = useAppStore((s) => s.equipments);
  const histories = useAppStore((s) => s.histories);
  const updateEquipment = useAppStore((s) => s.updateEquipment);
  const deleteEquipment = useAppStore((s) => s.deleteEquipment);
  const addHistory = useAppStore((s) => s.addHistory);
  const deleteHistory = useAppStore((s) => s.deleteHistory);

  const equipment = equipments.find((e) => e.설비ID === id);
  const { stats } = useMemo(() => computeFailureStats(histories), [histories]);
  const stat = stats.find((s) => s.설비ID === id);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EquipmentFormState>(emptyEquipmentForm);

  const startEditing = () => {
    if (!equipment) return;
    setForm(formFromEquipment(equipment));
    setEditing(true);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment || !form.설비명.trim()) return;
    updateEquipment(equipment.설비ID, equipmentFieldsFromForm(form));
    setEditing(false);
  };

  const handleDelete = () => {
    if (!equipment) return;
    if (!window.confirm(`"${equipment.설비명}"(${equipment.설비ID})을(를) 삭제할까요? 점검·수리 이력은 남지만 이 설비와의 연결은 끊어집니다.`)) {
      return;
    }
    deleteEquipment(equipment.설비ID);
    navigate('/equipment');
  };

  const [connectTarget, setConnectTarget] = useState('');

  // 연결은 양방향으로 취급하므로(lib/topology.ts computeConnections, 매핑 화면의
  // ConnectionPopover와 동일 원칙) 이쪽 화면에서 추가/삭제할 때도 양쪽 설비의
  // 연결설비 배열을 같이 갱신해야 함 — 한쪽만 고치면 그래프/매핑에서 반쪽짜리
  // 연결(한쪽에서만 보이는)이 생김.
  const addConnection = () => {
    if (!equipment || !connectTarget) return;
    const other = equipments.find((e) => e.설비ID === connectTarget);
    if (!other) return;
    if (!equipment.연결설비.includes(other.설비ID)) {
      updateEquipment(equipment.설비ID, { 연결설비: [...equipment.연결설비, other.설비ID] });
    }
    if (!other.연결설비.includes(equipment.설비ID)) {
      updateEquipment(other.설비ID, { 연결설비: [...other.연결설비, equipment.설비ID] });
    }
    setConnectTarget('');
  };

  const removeConnection = (otherId: string) => {
    if (!equipment) return;
    const other = equipments.find((e) => e.설비ID === otherId);
    updateEquipment(equipment.설비ID, { 연결설비: equipment.연결설비.filter((id) => id !== otherId) });
    if (other) {
      updateEquipment(other.설비ID, { 연결설비: other.연결설비.filter((id) => id !== equipment.설비ID) });
    }
  };

  // 예전엔 이력 추가/삭제가 /history 화면에만 있어서, 설비 하나를 보다가 점검·수리
  // 기록을 남기려면 이력 브라우저로 건너가 설비를 다시 골라야 했음 — 설비ID가 이미
  // 정해져 있는 이 화면에서 바로 추가/삭제할 수 있게 함(2026-07-21).
  const [addingHistory, setAddingHistory] = useState(false);
  const [historyForm, setHistoryForm] = useState({ 날짜: '', 유형: '점검' as HistoryType, 제목: '' });

  const submitHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment || !historyForm.날짜 || !historyForm.제목.trim()) return;
    addHistory({
      id: `hist-manual-${Date.now()}`,
      날짜: historyForm.날짜,
      설비ID: equipment.설비ID,
      유형: historyForm.유형,
      제목: historyForm.제목.trim(),
      출처파일: '수기 입력',
    });
    setHistoryForm({ 날짜: '', 유형: '점검', 제목: '' });
    setAddingHistory(false);
  };

  const handleDeleteHistory = (r: HistoryRecord) => {
    if (!window.confirm(`"${r.제목}" 이력을 삭제할까요?`)) return;
    deleteHistory(r.id);
  };

  // 상세사양(Record<string,string>)은 지금까지 업로드 파이프라인이 채운 값을 보기만
  // 했음(2026-07-21 요청 전) — 기본정보 수정모드와 별개로 항목을 추가/수정/삭제할 수
  // 있게 함. 키 자체를 바꾸는 건 지원 안 함(의미가 다른 새 항목이 되므로 삭제 후
  // 새로 추가하는 편이 헷갈리지 않음 — 값만 그 자리에서 바로 고치는 걸 지원).
  const [addingSpec, setAddingSpec] = useState(false);
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [editingSpecKey, setEditingSpecKey] = useState<string | null>(null);
  const [editingSpecValue, setEditingSpecValue] = useState('');

  const addSpec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment || !specKey.trim() || !specValue.trim()) return;
    updateEquipment(equipment.설비ID, { 상세사양: { ...equipment.상세사양, [specKey.trim()]: specValue.trim() } });
    setSpecKey('');
    setSpecValue('');
    setAddingSpec(false);
  };

  const startEditingSpec = (k: string, v: string) => {
    setEditingSpecKey(k);
    setEditingSpecValue(v);
  };

  const saveSpecEdit = (k: string) => {
    if (!equipment || !editingSpecValue.trim()) return;
    updateEquipment(equipment.설비ID, { 상세사양: { ...equipment.상세사양, [k]: editingSpecValue.trim() } });
    setEditingSpecKey(null);
  };

  const deleteSpec = (k: string) => {
    if (!equipment) return;
    if (!window.confirm(`"${k}" 항목을 삭제할까요?`)) return;
    const rest = { ...equipment.상세사양 };
    delete rest[k];
    updateEquipment(equipment.설비ID, { 상세사양: rest });
  };

  const records = histories
    .filter((h) => h.설비ID === id)
    .sort((a, b) => b.날짜.localeCompare(a.날짜));

  const connected = equipment?.연결설비
    .map((cid) => equipments.find((e) => e.설비ID === cid))
    .filter((e): e is NonNullable<typeof e> => Boolean(e)) ?? [];

  const connectableOptions = equipment
    ? equipments.filter((e) => e.설비ID !== equipment.설비ID && !equipment.연결설비.includes(e.설비ID))
    : [];

  if (!equipment) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3 text-center px-6">
        <img src={mascotSurprised} alt="" className="h-20 w-auto select-none" draggable={false} />
        <p className="text-text-dim text-sm">
          &ldquo;{id}&rdquo; 설비를 찾을 수 없습니다. 삭제됐거나 잘못된 링크일 수 있어요.
        </p>
        <Link to="/equipment" className="text-accent text-sm hover:underline">
          ← 설비 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/equipment" className="text-xs text-text-dim hover:text-text">
            ← 설비 목록
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold tracking-tight">{equipment.설비명}</h1>
            <span className="text-xs text-text-dim rounded-full border border-border px-2 py-0.5">
              {equipment.설비ID}
            </span>
            {stat && stat.위험등급 !== '하' && (
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${
                  stat.위험등급 === '상' ? 'bg-risk-high/15 text-risk-high' : 'bg-risk-mid/15 text-risk-mid'
                }`}
              >
                위험 {stat.위험등급}
              </span>
            )}
          </div>
        </div>
        {!editing && (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={startEditing}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent/50 hover:text-accent transition-colors"
            >
              수정
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-dim hover:text-risk-high hover:border-risk-high/50 transition-colors"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title={editing ? '기본 정보 수정' : '기본 정보'} className={editing ? 'lg:col-span-3' : undefined}>
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-4">
              <EquipmentFormFields form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-accent text-bg text-sm font-medium px-4 py-2 hover:brightness-110 transition"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-border text-sm px-4 py-2 text-text-dim hover:text-text"
                >
                  취소
                </button>
              </div>
            </form>
          ) : (
            <dl className="text-sm space-y-2">
              <Row label="분류" value={equipment.분류} />
              <Row label="사이트" value={equipment.사이트 || '미분류'} />
              <Row label="위치" value={equipment.위치} />
              <Row label="제조사" value={equipment.제조사} />
              <Row label="모델명" value={equipment.모델명} />
              <Row label="설치일" value={equipment.설치일} />
              <Row label="상태" value={equipment.상태} />
              <Row label="점검주기일" value={equipment.점검주기일 ? `${equipment.점검주기일}일` : undefined} />
              <Row label="최근점검일" value={equipment.최근점검일} />
              <Row label="다음점검일" value={equipment.다음점검일} />
            </dl>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-xs text-text-dim">상세 사양</div>
              <button
                type="button"
                onClick={() => setAddingSpec((v) => !v)}
                className="text-xs text-accent hover:underline"
              >
                {addingSpec ? '닫기' : '+ 사양 추가'}
              </button>
            </div>

            {addingSpec && (
              <form onSubmit={addSpec} className="flex flex-wrap gap-2 mb-3">
                <input
                  required
                  value={specKey}
                  onChange={(e) => setSpecKey(e.target.value)}
                  placeholder="항목명 (예: 정격전압)"
                  className="flex-1 min-w-[8rem] rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-sm outline-none focus:border-accent/60"
                />
                <input
                  required
                  value={specValue}
                  onChange={(e) => setSpecValue(e.target.value)}
                  placeholder="값"
                  className="flex-1 min-w-[8rem] rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-sm outline-none focus:border-accent/60"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-accent text-bg text-xs font-medium px-3 py-1.5 hover:brightness-110 transition"
                >
                  추가
                </button>
              </form>
            )}

            {Object.keys(equipment.상세사양).length === 0 ? (
              <p className="text-sm text-text-dim">등록된 상세 사양이 없습니다.</p>
            ) : (
              <ul className="text-sm space-y-1.5">
                {Object.entries(equipment.상세사양).map(([k, v]) =>
                  editingSpecKey === k ? (
                    <li key={k} className="flex items-center gap-2">
                      <span className="text-text-dim shrink-0">{k}:</span>
                      <input
                        autoFocus
                        value={editingSpecValue}
                        onChange={(e) => setEditingSpecValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveSpecEdit(k);
                          if (e.key === 'Escape') setEditingSpecKey(null);
                        }}
                        className="flex-1 min-w-0 rounded border border-accent/50 bg-bg-soft px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => saveSpecEdit(k)}
                        className="text-xs text-accent hover:underline shrink-0"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSpecKey(null)}
                        className="text-xs text-text-dim shrink-0"
                      >
                        취소
                      </button>
                    </li>
                  ) : (
                    <li key={k} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">
                        <span className="text-text-dim">{k}</span>: {v}
                      </span>
                      <span className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditingSpec(k, v)}
                          className="text-xs text-text-dim hover:text-accent"
                          aria-label={`${k} 수정`}
                          title="수정"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSpec(k)}
                          className="text-xs text-text-dim hover:text-risk-high"
                          aria-label={`${k} 삭제`}
                          title="삭제"
                        >
                          ✕
                        </button>
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        </Card>

        {!editing && (
          <>
            <Card title="고장 통계 (참고치)">
              {stat ? (
                <dl className="text-sm space-y-2">
                  <Row label="총 고장건수" value={`${stat.고장건수}건 (최근 1년 ${stat.최근1년건수}건)`} />
                  <Row label="최초→최근 고장일" value={`${stat.최초고장일} → ${stat.최근고장일}`} />
                  <Row label="평균고장간격(MTBF)" value={stat.mtbf일 ? `${Math.round(stat.mtbf일)}일` : '-'} />
                  <Row label="예상 다음 고장" value={stat.예상다음고장일 ?? '-'} />
                </dl>
              ) : (
                <p className="text-sm text-text-dim">수리 이력이 없습니다.</p>
              )}
            </Card>

            <Card title="연결 설비">
              {connected.length === 0 ? (
                <p className="text-sm text-text-dim">연결된 설비가 없습니다.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {connected.map((c) => (
                    <li key={c.설비ID} className="flex items-center justify-between gap-2">
                      <span>
                        <Link to={`/equipment/${c.설비ID}`} className="text-accent hover:underline">
                          {c.설비명}
                        </Link>
                        <span className="text-text-dim text-xs ml-1">({c.설비ID})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeConnection(c.설비ID)}
                        className="text-xs text-text-dim hover:text-risk-high shrink-0"
                        aria-label={`${c.설비명} 연결 해제`}
                        title="연결 해제"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {connectableOptions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex gap-1.5">
                  <select
                    value={connectTarget}
                    onChange={(e) => setConnectTarget(e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-xs"
                  >
                    <option value="">설비 선택…</option>
                    {connectableOptions.map((e) => (
                      <option key={e.설비ID} value={e.설비ID}>
                        {e.설비명} ({e.설비ID})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addConnection}
                    disabled={!connectTarget}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-dim hover:text-accent hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    연결 추가
                  </button>
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-medium text-text-dim">점검·고장 이력 ({records.length}건)</h3>
          <button
            type="button"
            onClick={() => setAddingHistory((v) => !v)}
            className="text-xs text-accent hover:underline shrink-0"
          >
            {addingHistory ? '닫기' : '+ 이력 추가'}
          </button>
        </div>

        {addingHistory && (
          <form
            onSubmit={submitHistory}
            className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-bg-soft/60 p-3"
          >
            <label className="block">
              <span className="text-xs text-text-dim">날짜 *</span>
              <input
                required
                type="date"
                value={historyForm.날짜}
                onChange={(e) => setHistoryForm((f) => ({ ...f, 날짜: e.target.value }))}
                className="mt-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:border-accent/60"
              />
            </label>
            <label className="block">
              <span className="text-xs text-text-dim">유형</span>
              <select
                value={historyForm.유형}
                onChange={(e) => setHistoryForm((f) => ({ ...f, 유형: e.target.value as HistoryType }))}
                className="mt-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
              >
                <option>점검</option>
                <option>수리</option>
              </select>
            </label>
            <label className="block flex-1 min-w-[10rem]">
              <span className="text-xs text-text-dim">제목 *</span>
              <input
                required
                value={historyForm.제목}
                onChange={(e) => setHistoryForm((f) => ({ ...f, 제목: e.target.value }))}
                placeholder="예: 필터 교체"
                className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:border-accent/60"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-accent text-bg text-sm font-medium px-3 py-1.5 hover:brightness-110 transition"
            >
              등록
            </button>
          </form>
        )}

        {records.length === 0 ? (
          <p className="text-sm text-text-dim">이력이 없습니다.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-4">
            {records.map((r) => (
              <li key={r.id} className="ml-4">
                <span
                  className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${
                    r.유형 === '수리' ? 'bg-risk-high' : 'bg-accent'
                  }`}
                />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-text-dim">
                      {r.날짜} · {r.유형}
                    </div>
                    <div className="text-sm">{r.제목}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteHistory(r)}
                    className="text-xs text-text-dim hover:text-risk-high shrink-0"
                    aria-label={`${r.제목} 이력 삭제`}
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-dim">{label}</dt>
      <dd className="text-right">{value || '-'}</dd>
    </div>
  );
}

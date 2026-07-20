import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { computeFailureStats } from '../lib/stats';
import Card from '../components/Card';
import EquipmentFormFields, { emptyEquipmentForm, equipmentFieldsFromForm, type EquipmentFormState } from '../components/EquipmentFormFields';
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

  const records = histories
    .filter((h) => h.설비ID === id)
    .sort((a, b) => b.날짜.localeCompare(a.날짜));

  const connected = equipment?.연결설비
    .map((cid) => equipments.find((e) => e.설비ID === cid))
    .filter((e): e is NonNullable<typeof e> => Boolean(e)) ?? [];

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
            <>
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
              {Object.keys(equipment.상세사양).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs text-text-dim mb-2">상세 사양</div>
                  <ul className="text-sm space-y-1">
                    {Object.entries(equipment.상세사양).map(([k, v]) => (
                      <li key={k}>
                        - <span className="text-text-dim">{k}</span>: {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
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
                    <li key={c.설비ID}>
                      <Link to={`/equipment/${c.설비ID}`} className="text-accent hover:underline">
                        {c.설비명}
                      </Link>
                      <span className="text-text-dim text-xs ml-1">({c.설비ID})</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>

      <Card title={`점검·고장 이력 (${records.length}건)`}>
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
                <div className="text-xs text-text-dim">
                  {r.날짜} · {r.유형}
                </div>
                <div className="text-sm">{r.제목}</div>
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

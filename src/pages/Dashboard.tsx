import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useAppStore } from '../store';
import { computeFailureStats, equipmentName } from '../lib/stats';
import { monthlyFailureTrend, failuresByCategory, siteStatusBreakdown, repairCostTop10, totalRepairCost } from '../lib/aggregate';
import { computeBrainSignals } from '../lib/brain';
import { dueStateOf, compareInspectionPriority } from '../lib/workOrders';
import { useThemeColors } from '../lib/colors';
import Card from '../components/Card';
import KpiTile from '../components/KpiTile';

const BRAIN_BADGE: Record<string, string> = {
  연쇄고장: 'bg-risk-high/15 text-risk-high',
  설치코호트: 'bg-risk-mid/15 text-risk-mid',
  동시다발: 'bg-accent/15 text-accent',
};

function daysUntil(dateStr: string | undefined, now: Date): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export default function Dashboard() {
  const colors = useThemeColors();
  const equipments = useAppStore((s) => s.equipments);
  const histories = useAppStore((s) => s.histories);
  const inspectionSchedules = useAppStore((s) => s.inspectionSchedules);
  const parts = useAppStore((s) => s.parts);

  const now = useMemo(() => new Date(), []);
  const { stats } = useMemo(() => computeFailureStats(histories, now), [histories, now]);
  const trend = useMemo(() => monthlyFailureTrend(histories, 24, now), [histories, now]);
  const byCategory = useMemo(() => failuresByCategory(equipments, histories), [equipments, histories]);
  const bySite = useMemo(() => siteStatusBreakdown(equipments), [equipments]);
  const costTop10 = useMemo(() => repairCostTop10(histories), [histories]);
  const totalCost = useMemo(() => totalRepairCost(histories), [histories]);
  const lowStockCount = useMemo(
    () => parts.filter((p) => p.안전재고 !== undefined && p.현재수량 <= p.안전재고).length,
    [parts],
  );

  const statusCounts = useMemo(() => {
    const c = { 정상: 0, 수리중: 0, 정지: 0, 폐기: 0 };
    for (const e of equipments) c[e.상태] += 1;
    return c;
  }, [equipments]);

  const dueSoonCount = useMemo(
    () => equipments.filter((e) => {
      const d = daysUntil(e.다음점검일, now);
      return d !== null && d >= 0 && d <= 7;
    }).length,
    [equipments, now],
  );

  const highRiskStats = stats.filter((s) => s.위험등급 !== '하').slice(0, 8);
  const brainSignals = useMemo(() => computeBrainSignals(equipments, histories).slice(0, 6), [equipments, histories]);

  // KPI 타일을 눌러 펼치는 확장 카드용 상세 데이터(2026-07-22 요청) — 한 번에 하나만
  // 펼쳐지도록 상태를 여기서 관리(타일마다 각자 열림상태를 들고 있으면 여러 개가
  // 동시에 겹쳐 뜰 수 있음).
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);

  const equipmentCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of equipments) counts.set(e.분류, (counts.get(e.분류) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [equipments]);

  const problemEquipments = useMemo(
    () => equipments.filter((e) => e.상태 === '수리중' || e.상태 === '정지'),
    [equipments],
  );

  const dueSoonEquipments = useMemo(
    () =>
      equipments
        .map((e) => ({ e, d: daysUntil(e.다음점검일, now) }))
        .filter((x): x is { e: (typeof equipments)[number]; d: number } => x.d !== null && x.d >= 0 && x.d <= 7)
        .sort((a, b) => a.d - b.d),
    [equipments, now],
  );

  const highOnlyStats = useMemo(() => stats.filter((s) => s.위험등급 === '상'), [stats]);

  const lowStockParts = useMemo(
    () => parts.filter((p) => p.안전재고 !== undefined && p.현재수량 <= p.안전재고),
    [parts],
  );

  // 법정점검/정기점검 도래 — 임박(7일 이내)이거나 이미 지난 항목만, 법정점검을
  // 최우선순위로 두고 그 안에서 가장 급한 순(compareInspectionPriority).
  const dueInspections = useMemo(
    () =>
      inspectionSchedules
        .map((s) => ({ ...s, due: dueStateOf(s.다음점검일, now) }))
        .filter((s) => s.due !== null)
        .sort(compareInspectionPriority),
    [inspectionSchedules, now],
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">설비 현황 대시보드</h1>
        <p className="text-sm text-text-dim mt-1">
          아래 예상 다음 고장·위험등급은 과거 평균 고장간격 기반 참고치입니다. 확정 예측이 아닙니다.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <KpiTile
          label="총 설비 수"
          value={equipments.length}
          isOpen={expandedKpi === '총 설비 수'}
          onOpen={() => setExpandedKpi('총 설비 수')}
          onClose={() => setExpandedKpi(null)}
          detail={
            <div className="space-y-3">
              <div>
                <div className="text-xs text-text-dim mb-1.5">분류별</div>
                <div className="space-y-1">
                  {equipmentCountByCategory.map(([분류, count]) => (
                    <div key={분류} className="flex justify-between">
                      <span>{분류}</span>
                      <span className="text-text-dim">{count}개</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link to="/equipment" className="block text-center text-xs text-accent hover:underline pt-2 border-t border-border">
                설비 목록 전체보기 →
              </Link>
            </div>
          }
        />
        <KpiTile
          label="상태별 (정상 · 수리중 · 정지)"
          value={`${statusCounts.정상} · ${statusCounts.수리중} · ${statusCounts.정지}`}
          isOpen={expandedKpi === '상태별'}
          onOpen={() => setExpandedKpi('상태별')}
          onClose={() => setExpandedKpi(null)}
          detail={
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between"><span>정상</span><span className="text-text-dim">{statusCounts.정상}개</span></div>
                <div className="flex justify-between"><span>수리중</span><span className="text-text-dim">{statusCounts.수리중}개</span></div>
                <div className="flex justify-between"><span>정지</span><span className="text-text-dim">{statusCounts.정지}개</span></div>
                <div className="flex justify-between"><span>폐기</span><span className="text-text-dim">{statusCounts.폐기}개</span></div>
              </div>
              {problemEquipments.length > 0 && (
                <div className="pt-2 border-t border-border space-y-1.5">
                  <div className="text-xs text-text-dim mb-1">수리중 · 정지 설비</div>
                  {problemEquipments.map((e) => (
                    <Link
                      key={e.설비ID}
                      to={`/equipment/${e.설비ID}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 hover:border-white/20 transition-colors"
                    >
                      <span className="truncate">{e.설비명}</span>
                      <span className={`text-xs shrink-0 ${e.상태 === '정지' ? 'text-risk-high' : 'text-risk-mid'}`}>{e.상태}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          }
        />
        <KpiTile
          label="점검 임박 (7일 이내)"
          value={dueSoonCount}
          accentClass="text-risk-mid"
          isOpen={expandedKpi === '점검 임박'}
          onOpen={() => setExpandedKpi('점검 임박')}
          onClose={() => setExpandedKpi(null)}
          detail={
            dueSoonEquipments.length === 0 ? (
              <p className="text-text-dim">임박한 점검이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {dueSoonEquipments.map(({ e, d }) => (
                  <Link
                    key={e.설비ID}
                    to={`/equipment/${e.설비ID}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 hover:border-white/20 transition-colors"
                  >
                    <span className="truncate">{e.설비명}</span>
                    <span className="text-xs text-text-dim shrink-0">{e.다음점검일} · {d}일 후</span>
                  </Link>
                ))}
              </div>
            )
          }
        />
        <KpiTile
          label="위험 등급 상"
          value={highOnlyStats.length}
          accentClass="text-risk-high"
          isOpen={expandedKpi === '위험 등급 상'}
          onOpen={() => setExpandedKpi('위험 등급 상')}
          onClose={() => setExpandedKpi(null)}
          detail={
            highOnlyStats.length === 0 ? (
              <p className="text-text-dim">위험 등급 상인 설비가 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {highOnlyStats.map((s) => (
                  <Link
                    key={s.설비ID}
                    to={`/equipment/${s.설비ID}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 hover:border-white/20 transition-colors"
                  >
                    <span className="truncate">{equipmentName(equipments, s.설비ID)}</span>
                    <span className="text-xs text-text-dim shrink-0">최근 1년 {s.최근1년건수}건</span>
                  </Link>
                ))}
              </div>
            )
          }
        />
        <KpiTile
          label="법정·정기점검 도래"
          value={dueInspections.length}
          accentClass={dueInspections.some((s) => s.due === 'overdue') ? 'text-risk-high' : 'text-risk-mid'}
          isOpen={expandedKpi === '법정정기점검 도래'}
          onOpen={() => setExpandedKpi('법정정기점검 도래')}
          onClose={() => setExpandedKpi(null)}
          detail={
            dueInspections.length === 0 ? (
              <p className="text-text-dim">임박하거나 기한이 지난 법정·정기점검이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {dueInspections.map((s) => (
                  <Link
                    key={s.id}
                    to={`/equipment/${s.설비ID}`}
                    className="block rounded-lg border border-border px-3 py-1.5 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{equipmentName(equipments, s.설비ID)} · {s.항목명}</span>
                      <span className={`text-xs shrink-0 rounded-full px-2 py-0.5 ${s.due === 'overdue' ? 'bg-risk-high/15 text-risk-high' : 'bg-risk-mid/15 text-risk-mid'}`}>
                        {s.종류} · {s.due === 'overdue' ? '기한 지남' : '임박'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )
          }
        />
        <KpiTile
          label="누적 수리비용"
          value={`${totalCost.toLocaleString()}원`}
          isOpen={expandedKpi === '누적 수리비용'}
          onOpen={() => setExpandedKpi('누적 수리비용')}
          onClose={() => setExpandedKpi(null)}
          detail={
            costTop10.length === 0 ? (
              <p className="text-text-dim">비용이 기록된 수리 이력이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                <div className="text-xs text-text-dim mb-1">수리비용 Top10 설비</div>
                {costTop10.map((row, i) => (
                  <Link
                    key={row.설비ID}
                    to={`/equipment/${row.설비ID}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 hover:border-white/20 transition-colors"
                  >
                    <span className="truncate">{i + 1}. {equipmentName(equipments, row.설비ID)}</span>
                    <span className="text-xs text-text-dim shrink-0">{row.총비용.toLocaleString()}원 · {row.건수}건</span>
                  </Link>
                ))}
              </div>
            )
          }
        />
        <KpiTile
          label="재고부족 자재"
          value={lowStockCount}
          accentClass={lowStockCount > 0 ? 'text-risk-high' : undefined}
          isOpen={expandedKpi === '재고부족 자재'}
          onOpen={() => setExpandedKpi('재고부족 자재')}
          onClose={() => setExpandedKpi(null)}
          detail={
            lowStockParts.length === 0 ? (
              <p className="text-text-dim">재고부족 자재가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  {lowStockParts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5">
                      <span className="truncate">{p.자재명}</span>
                      <span className="text-xs text-risk-high shrink-0">{p.현재수량}{p.단위} / 안전 {p.안전재고}{p.단위}</span>
                    </div>
                  ))}
                </div>
                <Link to="/inventory" className="block text-center text-xs text-accent hover:underline pt-2 border-t border-border">
                  자재·재고관리로 이동 →
                </Link>
              </div>
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="고장 추이 (최근 24개월, 월별 수리 건수)" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={colors.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: colors.textDim, fontSize: 11 }} interval={2} />
                <YAxis tick={{ fill: colors.textDim, fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                  labelStyle={{ color: colors.textDim }}
                />
                <Area type="monotone" dataKey="건수" stroke={colors.accent} fill="url(#trendFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="위험 상위 설비" className="xl:row-span-2">
          <div className="space-y-3 max-h-[34rem] overflow-y-auto pr-1">
            {highRiskStats.length === 0 && (
              <p className="text-sm text-text-dim">최근 1년 이내 반복 고장이 없습니다.</p>
            )}
            {highRiskStats.map((s) => (
              <Link
                key={s.설비ID}
                to={`/equipment/${s.설비ID}`}
                className="block rounded-xl border border-border p-3 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{equipmentName(equipments, s.설비ID)}</span>
                  <span
                    className={`text-xs shrink-0 rounded-full px-2 py-0.5 ${
                      s.위험등급 === '상' ? 'bg-risk-high/15 text-risk-high' : 'bg-risk-mid/15 text-risk-mid'
                    }`}
                  >
                    위험 {s.위험등급}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text-dim">
                  최근 1년 {s.최근1년건수}건 · MTBF {s.mtbf일 ? `${Math.round(s.mtbf일)}일` : '-'}
                  {s.예상다음고장일 && ` · 예상 다음 고장 ${s.예상다음고장일}`}
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="법정·정기점검 도래" className="xl:col-span-1">
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {dueInspections.length === 0 ? (
              <p className="text-sm text-text-dim">임박하거나 기한이 지난 법정·정기점검이 없습니다.</p>
            ) : (
              dueInspections.slice(0, 8).map((s) => (
                <Link
                  key={s.id}
                  to={`/equipment/${s.설비ID}`}
                  className="block rounded-xl border border-border p-3 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {equipmentName(equipments, s.설비ID)} · {s.항목명}
                    </span>
                    <span
                      className={`text-xs shrink-0 rounded-full px-2 py-0.5 ${
                        s.due === 'overdue' ? 'bg-risk-high/15 text-risk-high' : 'bg-risk-mid/15 text-risk-mid'
                      }`}
                    >
                      {s.종류} · {s.due === 'overdue' ? '기한 지남' : '임박'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-text-dim">다음 점검일 {s.다음점검일}</div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card title="수리비용 Top10 설비">
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {costTop10.length === 0 ? (
              <p className="text-sm text-text-dim">비용이 기록된 수리 이력이 없습니다.</p>
            ) : (
              costTop10.map((row, i) => (
                <Link
                  key={row.설비ID}
                  to={`/equipment/${row.설비ID}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 hover:border-white/20 transition-colors"
                >
                  <span className="text-sm truncate">
                    <span className="text-text-dim mr-1">{i + 1}.</span>
                    {equipmentName(equipments, row.설비ID)}
                  </span>
                  <span className="text-xs text-text-dim shrink-0">
                    {row.총비용.toLocaleString()}원 · {row.건수}건
                  </span>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card title="분류별 고장 건수">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke={colors.border} horizontal={false} />
                <XAxis type="number" tick={{ fill: colors.textDim, fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="분류" tick={{ fill: colors.textDim, fontSize: 12 }} width={48} />
                <Tooltip
                  contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="건수" fill={colors.accent} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="사이트별 설비 상태">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySite} margin={{ left: -20 }}>
                <CartesianGrid stroke={colors.border} vertical={false} />
                <XAxis dataKey="사이트" tick={{ fill: colors.textDim, fontSize: 12 }} />
                <YAxis tick={{ fill: colors.textDim, fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 8 }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: colors.textDim }} />
                <Bar dataKey="정상" stackId="s" fill={colors.riskLow} />
                <Bar dataKey="수리중" stackId="s" fill={colors.riskMid} />
                <Bar dataKey="정지" stackId="s" fill={colors.riskHigh} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="🧠 뇌모델 신호 (실험적 · 참고용)" className="xl:col-span-2">
          <p className="text-xs text-text-dim -mt-2 mb-3">
            머신러닝 예측 아님 — 계통 연결·제조사·설치연도·날짜 근접 같은 사실만으로 "지켜볼 근거가
            있다"를 뽑는 규칙기반 분석입니다.
          </p>
          {brainSignals.length === 0 ? (
            <p className="text-sm text-text-dim">발견된 신호가 없습니다(연결설비·고장이력 표본 부족).</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {brainSignals.map((s, i) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <span className={`text-xs rounded-full px-2 py-0.5 ${BRAIN_BADGE[s.종류]}`}>{s.종류}</span>
                  <p className="text-sm mt-1.5 leading-relaxed">{s.근거}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

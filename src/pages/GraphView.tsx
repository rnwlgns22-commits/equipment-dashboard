import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { computeFailureStats } from '../lib/stats';
import { COLORS } from '../lib/colors';
import type { Category } from '../types';

const CATEGORY_ORDER: Category[] = ['공조', '냉난방', '급배수', '전기', '소방', '승강기', '통신', '기타'];

function categoryColor(cat: Category): string {
  const idx = CATEGORY_ORDER.indexOf(cat);
  return COLORS.categorical[idx % COLORS.categorical.length];
}

function riskStroke(risk: string): string | null {
  if (risk === '상') return COLORS.riskHigh;
  if (risk === '중') return COLORS.riskMid;
  return null;
}

interface GraphNode {
  id: string;
  name: string;
  category: Category;
  color: string;
  val: number;
  risk: string;
  x?: number;
  y?: number;
}

export default function GraphView() {
  const equipments = useAppStore((s) => s.equipments);
  const histories = useAppStore((s) => s.histories);
  const equipmentsById = useMemo(() => new Map(equipments.map((e) => [e.설비ID, e])), [equipments]);

  const { stats } = useMemo(() => computeFailureStats(histories), [histories]);
  const statsById = useMemo(() => new Map(stats.map((s) => [s.설비ID, s])), [stats]);

  const [is3D, setIs3D] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = equipments.map((e) => {
      const stat = statsById.get(e.설비ID);
      return {
        id: e.설비ID,
        name: e.설비명,
        category: e.분류,
        color: categoryColor(e.분류),
        val: Math.max(1, stat?.고장건수 ?? 1),
        risk: stat?.위험등급 ?? '하',
      };
    });

    const seen = new Set<string>();
    const links: { source: string; target: string }[] = [];
    for (const e of equipments) {
      for (const targetId of e.연결설비) {
        if (!equipmentsById.has(targetId)) continue;
        const key = [e.설비ID, targetId].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        links.push({ source: e.설비ID, target: targetId });
      }
    }
    return { nodes, links };
  }, [equipments, equipmentsById, statsById]);

  const selectedEquipment = selectedId ? equipmentsById.get(selectedId) ?? null : null;
  const selectedStat = selectedId ? statsById.get(selectedId) ?? null : null;

  const commonProps = {
    graphData,
    width: size.width,
    height: size.height,
    backgroundColor: '#0b0e14',
    nodeLabel: (n: GraphNode) => n.name,
    nodeVal: (n: GraphNode) => n.val,
    nodeColor: (n: GraphNode) => n.color,
    linkColor: () => 'rgba(139,147,167,0.35)',
    onNodeClick: (n: GraphNode) => setSelectedId(n.id),
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="px-6 py-4 border-b border-border shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">설비 관계 그래프</h1>
          <p className="text-xs text-text-dim mt-1">
            노드 크기 = 고장건수, 색 = 분류, 테두리 = 위험등급. 선 = 연결설비.
          </p>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setIs3D(false)}
            className={`px-3 py-1.5 text-sm ${!is3D ? 'bg-accent/15 text-accent' : 'text-text-dim hover:text-text'}`}
          >
            2D
          </button>
          <button
            type="button"
            onClick={() => setIs3D(true)}
            className={`px-3 py-1.5 text-sm border-l border-border ${is3D ? 'bg-accent/15 text-accent' : 'text-text-dim hover:text-text'}`}
          >
            3D
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 relative overflow-hidden bg-bg-soft">
        {size.width > 0 &&
          (equipments.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-text-dim">
              표시할 설비가 없습니다.
            </div>
          ) : is3D ? (
            <ForceGraph3D {...commonProps} showNavInfo={false} />
          ) : (
            <ForceGraph2D
              {...commonProps}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const n = node as GraphNode;
                const r = 4 + Math.sqrt(n.val) * 2;
                ctx.save();
                ctx.shadowColor = n.color;
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI);
                ctx.fillStyle = n.color;
                ctx.fill();
                ctx.shadowBlur = 0;
                const stroke = riskStroke(n.risk);
                if (stroke) {
                  ctx.lineWidth = 2;
                  ctx.strokeStyle = stroke;
                  ctx.stroke();
                }
                if (globalScale > 1.1) {
                  ctx.font = `${10 / globalScale}px system-ui`;
                  ctx.fillStyle = '#e5e7eb';
                  ctx.textAlign = 'center';
                  ctx.fillText(n.name, n.x ?? 0, (n.y ?? 0) + r + 10 / globalScale);
                }
                ctx.restore();
              }}
            />
          ))}

        {selectedEquipment && (
          <div className="absolute top-4 right-4 w-72 rounded-2xl border border-border bg-card shadow-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{selectedEquipment.설비명}</div>
                <div className="text-xs text-text-dim mt-0.5">
                  {selectedEquipment.설비ID} · {selectedEquipment.분류}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-text-dim hover:text-text text-sm leading-none"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <dl className="mt-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-text-dim">사이트</dt>
                <dd>{selectedEquipment.사이트 || '미분류'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-dim">상태</dt>
                <dd>{selectedEquipment.상태}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-dim">고장건수</dt>
                <dd>{selectedStat?.고장건수 ?? 0}건</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-dim">위험등급</dt>
                <dd>{selectedStat?.위험등급 ?? '하'}</dd>
              </div>
            </dl>
            <Link
              to={`/equipment/${selectedEquipment.설비ID}`}
              className="mt-3 block text-center text-xs text-accent hover:underline"
            >
              설비 상세 페이지로 이동 →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

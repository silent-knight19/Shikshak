import { useMemo } from 'react';
import type { FlowchartData } from './types';
import { SvgContainer } from './SvgContainer';

export default function Flowchart({ data }: { data: FlowchartData }) {
  const W = 960, H = 600;

  const layout = useMemo(() => {
    const nodes = data.nodes;
    const n = nodes.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const cw = 720 / cols, rh = 480 / rows;
    const positioned = nodes.map((node, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      return {
        ...node,
        x: 120 + col * cw + cw / 2,
        y: 60 + row * rh + rh / 2,
        w: node.shape === 'diamond' ? 120 : 150,
        h: node.shape === 'diamond' ? 90 : 52,
      };
    });
    const nodeMap = new Map(positioned.map(n => [n.id, n]));
    const edges = data.edges.map(e => {
      const f = nodeMap.get(e.from), t = nodeMap.get(e.to);
      if (!f || !t) return null;
      const x1 = f.x, y1 = f.y + f.h / 2;
      const x2 = t.x, y2 = t.y - t.h / 2;
      const mx1 = (x1 + x2) / 2, my1 = y1;
      const mx2 = (x1 + x2) / 2, my2 = y2;
      const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
      return { from: e.from, to: e.to, label: e.label ?? '', d: `M${x1},${y1} C${mx1},${my1} ${mx2},${my2} ${x2},${y2}`, midX, midY };
    }).filter(Boolean) as { from: string; to: string; label: string; d: string; midX: number; midY: number }[];
    return { positioned, edges };
  }, [data]);

  return (
    <SvgContainer w={W} h={H} title={data.title}>
      <defs>
        <marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--text-muted)" />
        </marker>
      </defs>
      {layout.edges.map((e, i) => (
        <g key={i}>
          <path d={e.d} fill="none" stroke="var(--text-muted)" strokeWidth={1.5} markerEnd="url(#fa)" />
          {e.label && (
            <text x={e.midX + 12} y={e.midY - 8}
              fill="var(--text-faint)" fontSize="0.65em" textAnchor="middle" fontStyle="italic">
              {e.label}
            </text>
          )}
        </g>
      ))}
      {layout.positioned.map(n => (
        <g key={n.id}>
          {n.shape === 'diamond' ? (
            <polygon
              points={`${n.x},${n.y - n.h / 2} ${n.x + n.w / 2},${n.y} ${n.x},${n.y + n.h / 2} ${n.x - n.w / 2},${n.y}`}
              fill="var(--bg-hover)" stroke="var(--accent-blue)" strokeWidth={2} />
          ) : (
            <rect x={n.x - n.w / 2} y={n.y - n.h / 2} width={n.w} height={n.h} rx={8}
              fill="var(--bg-hover)" stroke="var(--accent-blue)" strokeWidth={2} />
          )}
          <text x={n.x} y={n.y} fill="var(--text-primary)" fontSize="0.8em" textAnchor="middle" dominantBaseline="central"
            style={{ pointerEvents: 'none' }}>
            {n.label}
          </text>
        </g>
      ))}
    </SvgContainer>
  );
}

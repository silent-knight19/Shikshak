import { useMemo } from 'react';
import type { FlowchartData } from './types';
import { SvgContainer } from './SvgContainer';

export default function Flowchart({ data }: { data: FlowchartData }) {
  const W = 760, H = 500;

  const layout = useMemo(() => {
    const nodes = data.nodes;
    const n = nodes.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const cw = 600 / cols, rh = 420 / rows;
    const positioned = nodes.map((node, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      return {
        ...node,
        x: 80 + col * cw + cw / 2,
        y: 40 + row * rh + rh / 2,
        w: node.shape === 'diamond' ? 100 : 130,
        h: node.shape === 'diamond' ? 80 : 44,
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
      return { from: e.from, to: e.to, label: e.label ?? '', d: `M${x1},${y1} C${mx1},${my1} ${mx2},${my2} ${x2},${y2}` };
    }).filter(Boolean) as { from: string; to: string; label: string; d: string }[];
    return { positioned, edges };
  }, [data]);

  return (
    <SvgContainer w={W} h={H} title={data.title}>
      <defs>
        <marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#888" />
        </marker>
      </defs>
      {layout.edges.map((e, i) => (
        <g key={i}>
          <path d={e.d} fill="none" stroke="#888" strokeWidth={1.5} markerEnd="url(#fa)" />
          {e.label && (
            <text x={layout.positioned.find(n => n.id === e.from)!.x + 15}
              y={layout.positioned.find(n => n.id === e.from)!.y + 20}
              fill="#666" fontSize={10} textAnchor="middle" fontStyle="italic">
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
              fill="#ffe0ec" stroke="#f72585" strokeWidth={2} />
          ) : (
            <rect x={n.x - n.w / 2} y={n.y - n.h / 2} width={n.w} height={n.h} rx={6}
              fill="#eef0ff" stroke="#4361ee" strokeWidth={2} />
          )}
          <text x={n.x} y={n.y} fill="#1a1a2e" fontSize={12} textAnchor="middle" dominantBaseline="central"
            style={{ pointerEvents: 'none' }}>
            {n.label}
          </text>
        </g>
      ))}
    </SvgContainer>
  );
}

import { useMemo } from 'react';
import type { TreeData } from './types';
import { SvgContainer } from './SvgContainer';

export default function TreeDiagram({ data }: { data: TreeData }) {
  const W = 960, H = 600;

  const layout = useMemo(() => {
    const childrenMap = new Map<string, string[]>();
    data.nodes.forEach(n => {
      if (n.parent) {
        const kids = childrenMap.get(n.parent) ?? [];
        kids.push(n.id);
        childrenMap.set(n.parent, kids);
      }
    });
    const roots = data.nodes.filter(n => !n.parent);
    const depths = new Map<string, number>();
    const queue = roots.map(r => ({ id: r.id, depth: 0 }));
    for (const item of queue) {
      depths.set(item.id, item.depth);
      const kids = childrenMap.get(item.id) ?? [];
      kids.forEach(k => queue.push({ id: k, depth: item.depth + 1 }));
    }
    const maxDepth = Math.max(...depths.values(), 0);
    const byDepth = new Map<number, { id: string; label: string; highlight?: boolean }[]>();
    data.nodes.forEach(n => {
      const d = depths.get(n.id) ?? 0;
      const arr = byDepth.get(d) ?? [];
      arr.push(n);
      byDepth.set(d, arr);
    });
    const NODE_R = 28;
    const rh = maxDepth > 0 ? 440 / maxDepth : 440;
    const positioned = data.nodes.map(n => {
      const d = depths.get(n.id) ?? 0;
      const atDepth = byDepth.get(d) ?? [];
      const idx = atDepth.findIndex(a => a.id === n.id);
      const x = 80 + (800 / Math.max(atDepth.length, 1)) * (idx + 0.5);
      const y = 60 + d * Math.min(rh, 120);
      return { ...n, x, y, r: NODE_R };
    });
    const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
    data.nodes.forEach(n => {
      if (!n.parent) return;
      const p = positioned.find(p => p.id === n.parent);
      const c = positioned.find(c => c.id === n.id);
      if (p && c) edges.push({ x1: p.x, y1: p.y + p.r, x2: c.x, y2: c.y - c.r });
    });
    return { positioned, edges };
  }, [data]);

  return (
    <SvgContainer w={W} h={H} title={data.title}>
      {layout.edges.map((e, i) => (
        <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke="var(--text-muted)" strokeWidth={1.5} />
      ))}
      {layout.positioned.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={n.r}
            fill={n.highlight ? 'var(--status-error)' : 'var(--accent-blue)'}
            stroke={n.highlight ? 'var(--status-error)' : 'var(--accent-blue)'}
            strokeWidth={2} />
          <text x={n.x} y={n.y} fill="var(--bg-root)" fontSize="0.75em"
            textAnchor="middle" dominantBaseline="central" fontWeight={600}
            style={{ pointerEvents: 'none' }}>
            {n.label}
          </text>
        </g>
      ))}
    </SvgContainer>
  );
}

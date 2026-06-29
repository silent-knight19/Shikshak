import { useMemo } from 'react';
import type { TreeData } from './types';
import { SvgContainer } from './SvgContainer';

export default function TreeDiagram({ data }: { data: TreeData }) {
  const W = 760, H = 500;

  const layout = useMemo(() => {
    const childrenMap = new Map<string, string[]>();
    data.nodes.forEach(n => {
      if (n.parent) {
        const kids = childrenMap.get(n.parent) ?? [];
        kids.push(n.id);
        childrenMap.set(n.parent, kids);
      }
    });
    // Find roots
    const roots = data.nodes.filter(n => !n.parent);
    // Assign depths & positions via BFS
    const depths = new Map<string, number>();
    const queue = roots.map(r => ({ id: r.id, depth: 0 }));
    for (const item of queue) {
      depths.set(item.id, item.depth);
      const kids = childrenMap.get(item.id) ?? [];
      kids.forEach(k => queue.push({ id: k, depth: item.depth + 1 }));
    }
    const maxDepth = Math.max(...depths.values(), 0);
    // Position: group by depth, space evenly
    const byDepth = new Map<number, { id: string; label: string; highlight?: boolean }[]>();
    data.nodes.forEach(n => {
      const d = depths.get(n.id) ?? 0;
      const arr = byDepth.get(d) ?? [];
      arr.push(n);
      byDepth.set(d, arr);
    });
    const rh = maxDepth > 0 ? 360 / maxDepth : 360;
    const positioned = data.nodes.map(n => {
      const d = depths.get(n.id) ?? 0;
      const atDepth = byDepth.get(d) ?? [];
      const idx = atDepth.findIndex(a => a.id === n.id);
      const x = 60 + (600 / Math.max(atDepth.length, 1)) * (idx + 0.5);
      const y = 40 + d * Math.min(rh, 100);
      return { ...n, x, y };
    });
    // Edges
    const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
    data.nodes.forEach(n => {
      if (!n.parent) return;
      const p = positioned.find(p => p.id === n.parent);
      const c = positioned.find(c => c.id === n.id);
      if (p && c) edges.push({ x1: p.x, y1: p.y + 18, x2: c.x, y2: c.y - 18 });
    });
    return { positioned, edges };
  }, [data]);

  return (
    <SvgContainer w={W} h={H} title={data.title}>
      {layout.edges.map((e, i) => (
        <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke="#bbb" strokeWidth={1.5} />
      ))}
      {layout.positioned.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={20}
            fill={n.highlight ? '#f72585' : '#4361ee'}
            stroke={n.highlight ? '#d81b60' : '#3a56d4'}
            strokeWidth={2} />
          <text x={n.x} y={n.y} fill="#fff" fontSize={11}
            textAnchor="middle" dominantBaseline="central" fontWeight={600}
            style={{ pointerEvents: 'none' }}>
            {n.label}
          </text>
        </g>
      ))}
    </SvgContainer>
  );
}

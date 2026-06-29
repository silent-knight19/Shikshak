import { useMemo } from 'react';
import type { AutomatonData } from './types';
import { SvgContainer } from './SvgContainer';

export default function Automaton({ data }: { data: AutomatonData }) {
  const W = 760, H = 460;

  const layout = useMemo(() => {
    const cx = W / 2, cy = H / 2 - 20;
    const r = Math.min(cx, cy) - 60;
    const n = data.states.length;
    const positioned = data.states.map((s, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return { ...s, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
    const stateMap = new Map(positioned.map(s => [s.id, s]));
    const transitions = data.transitions.map(t => {
      const f = stateMap.get(t.from), to = stateMap.get(t.to);
      if (!f || !to) return null;
      const dx = to.x - f.x, dy = to.y - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const off = 22;
      const sx = f.x + (dx / dist) * off, sy = f.y + (dy / dist) * off;
      const ex = to.x - (dx / dist) * off, ey = to.y - (dy / dist) * off;
      const bend = t.from === t.to ? 60 : 18 + (t.from > t.to ? 30 : 0);
      const cpx = (sx + ex) / 2 + (dy / dist) * bend;
      const cpy = (sy + ey) / 2 - (dx / dist) * bend;
      const d = t.from === t.to
        ? `M${sx},${sy - 10} C${sx + 50},${sy - 60} ${ex + 50},${ey - 60} ${ex},${ey - 10}`
        : `M${sx},${sy} Q${cpx},${cpy} ${ex},${ey}`;
      return { from: t.from, to: t.to, label: t.label, d, lx: cpx, ly: cpy + (t.from === t.to ? -50 : -8) };
    }).filter(Boolean) as { from: string; to: string; label: string; d: string; lx: number; ly: number }[];
    return { positioned, transitions };
  }, [data]);

  return (
    <SvgContainer w={W} h={H} title={data.title}>
      <defs>
        <marker id="ab" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#888" />
        </marker>
      </defs>
      {layout.transitions.map((t, i) => (
        <g key={i}>
          <path d={t.d} fill="none" stroke="#888" strokeWidth={1.5} markerEnd="url(#ab)" />
          <text x={t.lx} y={t.ly} fill="#555" fontSize={11} textAnchor="middle" fontStyle="italic">
            {t.label}
          </text>
        </g>
      ))}
      {layout.positioned.map(s => (
        <g key={s.id}>
          {s.accept && (
            <circle cx={s.x} cy={s.y} r={28} fill="none" stroke="#28a745" strokeWidth={3} />
          )}
          <circle cx={s.x} cy={s.y} r={24}
            fill={s.start ? '#fff3cd' : s.accept ? '#d4edda' : '#eef0ff'}
            stroke={s.start ? '#ffc107' : s.accept ? '#28a745' : '#4361ee'}
            strokeWidth={2.5} />
          <text x={s.x} y={s.y} fill="#1a1a2e" fontSize={13}
            textAnchor="middle" dominantBaseline="central" fontWeight={600}
            style={{ pointerEvents: 'none' }}>
            {s.label}
          </text>
        </g>
      ))}
    </SvgContainer>
  );
}

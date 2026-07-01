import { useMemo } from 'react';
import type { AutomatonData } from './types';
import { SvgContainer } from './SvgContainer';

export default function Automaton({ data }: { data: AutomatonData }) {
  const W = 960, H = 620;

  const layout = useMemo(() => {
    const cx = W / 2, cy = H / 2;
    const r = Math.min(cx, cy) - 80;
    const n = data.states.length;
    const STATE_R = 32;
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
      const isSelfLoop = t.from === t.to;
      const off = STATE_R + 6;
      const sx = f.x + (dx / dist) * off, sy = f.y + (dy / dist) * off;
      const ex = to.x - (dx / dist) * off, ey = to.y - (dy / dist) * off;
      const bend = isSelfLoop ? 80 : 20 + (t.from > t.to ? 20 : 0);
      const cpx = (sx + ex) / 2 + (dy / dist) * bend;
      const cpy = (sy + ey) / 2 - (dx / dist) * bend;
      const d = isSelfLoop
        ? `M${sx},${sy - 10} C${sx + 60},${sy - 70} ${ex + 60},${ey - 70} ${ex},${ey - 10}`
        : `M${sx},${sy} Q${cpx},${cpy} ${ex},${ey}`;
      return { from: t.from, to: t.to, label: t.label, d, lx: cpx, ly: cpy + (isSelfLoop ? -60 : -10), isSelfLoop };
    }).filter(Boolean) as { from: string; to: string; label: string; d: string; lx: number; ly: number; isSelfLoop: boolean }[];
    return { positioned, transitions };
  }, [data]);

  return (
    <SvgContainer w={W} h={H} title={data.title}>
      <defs>
        <marker id="ab" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--text-muted)" />
        </marker>
      </defs>
      {layout.transitions.map((t, i) => (
        <g key={i}>
          <path d={t.d} fill="none" stroke="var(--text-muted)" strokeWidth={1.5} markerEnd="url(#ab)" />
          <text x={t.lx} y={t.ly} fill="var(--text-faint)" fontSize="0.65em" textAnchor="middle" fontStyle="italic">
            {t.label}
          </text>
        </g>
      ))}
      {layout.positioned.map(s => (
        <g key={s.id}>
          {s.accept && (
            <circle cx={s.x} cy={s.y} r={38} fill="none" stroke="var(--status-good)" strokeWidth={3} />
          )}
          <circle cx={s.x} cy={s.y} r={32}
            fill="var(--bg-hover)"
            stroke={s.start ? 'var(--status-warning)' : s.accept ? 'var(--status-good)' : 'var(--accent-blue)'}
            strokeWidth={2.5} />
          <text x={s.x} y={s.y} fill="var(--text-primary)" fontSize="0.8em"
            textAnchor="middle" dominantBaseline="central" fontWeight={600}
            style={{ pointerEvents: 'none' }}>
            {s.label}
          </text>
        </g>
      ))}
    </SvgContainer>
  );
}

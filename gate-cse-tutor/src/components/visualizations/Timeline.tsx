import { useMemo } from 'react';
import type { TimelineData } from './types';
import { SvgContainer } from './SvgContainer';

export default function Timeline({ data }: { data: TimelineData }) {
  const W = 960, H = 500;

  const items = useMemo(() => {
    const n = data.items.length;
    const step = Math.min(140, 720 / Math.max(n, 1));
    const startX = 120;
    return data.items.map((item, i) => {
      const cx = startX + step * i + step / 2;
      const above = i % 2 === 0;
      const y = above ? 130 : 310;
      return { ...item, cx, y, above };
    });
  }, [data]);

  const lineY = 240;

  return (
    <SvgContainer w={W} h={H} title={data.title}>
      <line x1={80} y1={lineY} x2={880} y2={lineY} stroke="var(--accent-blue)" strokeWidth={3} strokeLinecap="round" />
      {items.map((item, i) => (
        <g key={i}>
          <line x1={item.cx} y1={item.above ? item.y + 32 : item.y - 32}
            x2={item.cx} y2={lineY} stroke="var(--text-faint)" strokeWidth={1.5} />
          <circle cx={item.cx} cy={item.y} r={10}
            fill="var(--accent-blue)" stroke="var(--bg-surface)" strokeWidth={2}
            style={{ transition: 'fill 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as SVGElement).style.fill = 'var(--status-error)'; }}
            onMouseLeave={e => { (e.currentTarget as SVGElement).style.fill = 'var(--accent-blue)'; }} />
          {item.date && (
            <text x={item.cx} y={item.y + (item.above ? 50 : -46)}
              fill="var(--text-faint)" fontSize="0.65em" textAnchor="middle">
              {item.date}
            </text>
          )}
          <text x={item.cx} y={item.y + (item.above ? -18 : 42)}
            fill="var(--text-primary)" fontSize="0.8em" textAnchor="middle" fontWeight={500}>
            {item.label}
          </text>
          {item.description && (
            <text x={item.cx} y={item.y + (item.above ? 66 : -62)}
              fill="var(--text-muted)" fontSize="0.6em" textAnchor="middle">
              {item.description}
            </text>
          )}
        </g>
      ))}
    </SvgContainer>
  );
}

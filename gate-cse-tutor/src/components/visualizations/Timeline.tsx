import { useMemo } from 'react';
import type { TimelineData } from './types';
import { SvgContainer } from './SvgContainer';

export default function Timeline({ data }: { data: TimelineData }) {
  const W = 760, H = 400;

  const items = useMemo(() => {
    const n = data.items.length;
    const step = Math.min(100, 520 / Math.max(n, 1));
    const startX = 120;
    return data.items.map((item, i) => {
      const cx = startX + step * i + step / 2;
      // Alternate above/below the line
      const above = i % 2 === 0;
      const y = above ? 120 : 240;
      return { ...item, cx, y, above };
    });
  }, [data]);

  const lineY = 200;

  return (
    <SvgContainer w={W} h={H} title={data.title}>
      {/* Horizontal line */}
      <line x1={60} y1={lineY} x2={700} y2={lineY} stroke="#4361ee" strokeWidth={3} strokeLinecap="round" />
      {items.map((item, i) => (
        <g key={i}>
          {/* Connector */}
          <line x1={item.cx} y1={item.above ? item.y + 28 : item.y - 28}
            x2={item.cx} y2={lineY} stroke="#ddd" strokeWidth={1.5} />
          {/* Dot */}
          <circle cx={item.cx} cy={item.y} r={8}
            fill="#4361ee" stroke="#fff" strokeWidth={2}
            style={{ transition: 'fill 0.15s' }}
            onMouseEnter={e => { e.currentTarget.setAttribute('fill', '#f72585'); }}
            onMouseLeave={e => { e.currentTarget.setAttribute('fill', '#4361ee'); }} />
          {/* Date */}
          {item.date && (
            <text x={item.cx} y={item.y + (item.above ? 42 : -34)}
              fill="#888" fontSize={10} textAnchor="middle">
              {item.date}
            </text>
          )}
          {/* Label */}
          <text x={item.cx} y={item.y + (item.above ? -14 : 36)}
            fill="#1a1a2e" fontSize={12} textAnchor="middle" fontWeight={500}>
            {item.label}
          </text>
          {/* Description */}
          {item.description && (
            <text x={item.cx} y={item.y + (item.above ? 56 : -48)}
              fill="#888" fontSize={10} textAnchor="middle">
              {item.description}
            </text>
          )}
        </g>
      ))}
    </SvgContainer>
  );
}

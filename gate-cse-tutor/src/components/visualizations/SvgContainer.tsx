import type { ReactNode } from 'react';

export function SvgContainer({ w, h, children, title }: { w: number; h: number; children: ReactNode; title?: string }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', width: '50vw', height: '50vh', minWidth: '600px', minHeight: '400px' }}>
      {title && (
        <text x={w / 2} y={18} textAnchor="middle" fill="var(--text-primary)"
          fontSize="1.0em" fontWeight={600}>{title}</text>
      )}
      {children}
    </svg>
  );
}

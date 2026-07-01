import type { ReactNode } from 'react';

export function SvgContainer({ w, h, children, title }: { w: number; h: number; children: ReactNode; title?: string }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', width: '100%', maxWidth: '100%', height: 'auto' }}>
      {title && (
        <text x={w / 2} y={18} textAnchor="middle" fill="var(--text-primary)"
          fontSize="1.0em" fontWeight={600}>{title}</text>
      )}
      {children}
    </svg>
  );
}

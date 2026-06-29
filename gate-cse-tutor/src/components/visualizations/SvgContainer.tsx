import type { ReactNode } from 'react';

export function SvgContainer({ w, h, children, title }: { w: number; h: number; children: ReactNode; title?: string }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="auto"
      style={{ display: 'block', maxWidth: '100%' }}>
      {title && (
        <text x={w / 2} y={18} textAnchor="middle" fill="#1a1a2e"
          fontSize={14} fontWeight={600}>{title}</text>
      )}
      {children}
    </svg>
  );
}

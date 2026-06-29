import type { FC, CSSProperties } from 'react';

const dotBase: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: 'var(--text-muted)',
  display: 'inline-block',
};

const LoadingDots: FC = () => (
  <div style={{ display: 'flex', gap: 5, padding: '8px 0', alignItems: 'center' }}>
    <span style={{ ...dotBase, animation: 'dotPulse1 1.4s ease-in-out infinite' }} />
    <span style={{ ...dotBase, animation: 'dotPulse2 1.4s ease-in-out infinite' }} />
    <span style={{ ...dotBase, animation: 'dotPulse3 1.4s ease-in-out infinite' }} />
  </div>
);

export default LoadingDots;
 

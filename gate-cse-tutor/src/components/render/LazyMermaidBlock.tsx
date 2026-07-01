import { lazy, Suspense, type FC } from 'react';

const MermaidBlock = lazy(() => import('./MermaidBlock'));

interface LazyMermaidProps {
  chart: string;
}

const LazyMermaidBlock: FC<LazyMermaidProps> = ({ chart }) => (
  <Suspense fallback={
    <div style={{
      padding: 16, textAlign: 'center', color: 'var(--text-faint)',
      fontSize: '0.857em', background: 'var(--bg-surface)', borderRadius: 8,
    }}>
      Loading diagram...
    </div>
  }>
    <MermaidBlock chart={chart} />
  </Suspense>
);

export default LazyMermaidBlock;

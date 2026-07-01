import { lazy, Suspense, type FC } from 'react';

const VisualizationRenderer = lazy(() => import('./VisualizationRenderer'));

interface LazyVizProps {
  data: any;
}

const LazyVisualization: FC<LazyVizProps> = ({ data }) => (
  <Suspense fallback={
    <div style={{
      padding: 16, textAlign: 'center', color: 'var(--text-faint)',
      fontSize: '0.857em', background: 'var(--bg-surface)', borderRadius: 8,
      minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      Loading visualization...
    </div>
  }>
    <VisualizationRenderer data={data} />
  </Suspense>
);

export default LazyVisualization;

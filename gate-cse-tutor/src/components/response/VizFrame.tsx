import { useMemo, lazy, Suspense } from 'react';
import type { VisualizationData } from '../visualizations/types';

const VisualizationRenderer = lazy(() => import('../visualizations/VisualizationRenderer'));

interface VizFrameProps {
  html: string | null;
}

export default function VizFrame({ html }: VizFrameProps) {
  const visualizations = useMemo((): VisualizationData[] => {
    if (!html) return [];
    try {
      if (html.startsWith('[')) {
        const arr = JSON.parse(html);
        return Array.isArray(arr) ? arr.filter((v: any) => v && v.type) : [];
      }
      const single = JSON.parse(html);
      return single && single.type ? [single] : [];
    } catch {
      return [];
    }
  }, [html]);

  if (visualizations.length === 0) return null;

  return (
    <div style={{ marginTop: '12px' }}>
      {visualizations.map((viz, i) => (
        <div key={i} style={{
          border: '1px solid var(--border)',
          borderRadius: '10px',
          overflow: 'hidden',
          background: 'var(--bg-surface)',
          marginBottom: i < visualizations.length - 1 ? '12px' : 0,
        }}>
          <div style={{
            padding: '6px 12px',
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            userSelect: 'none',
          }}>
            <span>Visualisation {visualizations.length > 1 ? `${i + 1}` : ''}</span>
          </div>
          <div style={{ padding: '16px', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
            <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-faint)', fontSize: '0.857em' }}>Loading chart...</div>}>
              <VisualizationRenderer data={viz} />
            </Suspense>
          </div>
        </div>
      ))}
    </div>
  );
}

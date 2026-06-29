import { useState, useEffect, useMemo } from 'react';
import type { VisualizationData } from '../visualizations/types';
import VisualizationRenderer from '../visualizations/VisualizationRenderer';

interface VizFrameProps {
  html: string | null;
}

export default function VizFrame({ html }: VizFrameProps) {
  const [expanded, setExpanded] = useState(false);
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#fff',
          marginBottom: i < visualizations.length - 1 ? '12px' : 0,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 12px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '12px',
            color: '#64748b',
            userSelect: 'none',
          }}>
            <span>Visualisation {visualizations.length > 1 ? `${i + 1}` : ''}</span>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              {expanded ? 'Collapse' : 'Expand'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>

          <div style={{
            padding: '16px',
            overflow: 'hidden',
            maxHeight: expanded
              ? (mobile ? 'none' : '800px')
              : (mobile ? '340px' : '480px'),
            transition: 'max-height 0.25s ease',
            position: 'relative',
          }}>
            {!expanded && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: '40px',
                background: 'linear-gradient(transparent, #fff)',
                pointerEvents: 'none', zIndex: 1,
              }} />
            )}
            <VisualizationRenderer data={viz} />
          </div>
        </div>
      ))}
    </div>
  );
}

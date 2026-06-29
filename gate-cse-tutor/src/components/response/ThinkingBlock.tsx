import type { FC } from 'react';
import { useState, useRef, useEffect } from 'react';

interface ThinkingBlockProps {
  text: string;
  streaming: boolean;
}

const ThinkingBlock: FC<ThinkingBlockProps> = ({ text, streaming }) => {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [text, expanded]);

  if (!text && !streaming) return null;

  return (
    <div style={{
      marginBottom: 12,
      borderLeft: '2px solid var(--border-active)',
      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
      background: 'var(--thinking-bg)',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 12px',
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-muted)',
          letterSpacing: '0.3px',
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform var(--transition-smooth)',
            flexShrink: 0,
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>

        <span>
          {streaming ? (
            <span style={{ animation: 'breathe 2s ease-in-out infinite' }}>
              Thinking...
            </span>
          ) : 'Thinking'}
        </span>

        {streaming && (
          <div style={{
            flex: 1,
            height: 2,
            borderRadius: 1,
            marginLeft: 4,
            background: 'linear-gradient(90deg, transparent, var(--border-active), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite',
          }} />
        )}
      </div>

      <div style={{
        maxHeight: expanded ? Math.min(contentHeight + 20, 320) : 0,
        overflow: 'hidden',
        transition: 'max-height var(--transition-smooth)',
      }}>
        <div
          ref={contentRef}
          style={{
            padding: '8px 12px',
            fontSize: 12,
            lineHeight: 1.6,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {text || (streaming ? 'Thinking...' : '')}
        </div>
      </div>
    </div>
  );
};

export default ThinkingBlock;

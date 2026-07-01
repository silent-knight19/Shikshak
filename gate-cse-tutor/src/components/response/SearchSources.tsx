import type { FC } from 'react';
import { useState } from 'react';
import type { Source } from '../../store/types';

interface SearchSourcesProps {
  sources: Source[];
}

const SearchSources: FC<SearchSourcesProps> = ({ sources }) => {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  const getDomain = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace('www.', '');
    } catch {
      return urlStr;
    }
  };

  return (
    <div style={{
      marginTop: 8,
      marginBottom: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          padding: '4px 0',
          cursor: 'pointer',
          fontSize: '0.8em',
          fontWeight: 600,
          color: 'var(--border-active)',
          textAlign: 'left',
          width: 'fit-content',
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform var(--transition-smooth)',
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>View Sources ({sources.length})</span>
      </button>

      {expanded && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: '4px 8px',
          animation: 'fadeIn var(--transition-smooth)',
        }}>
          {sources.map((src, idx) => {
            const domain = getDomain(src.url);
            return (
              <a
                key={idx}
                href={src.url}
                target="_blank"
                rel="noreferrer"
                title={src.snippet || src.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: 'var(--text)',
                  fontSize: '0.82em',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-active)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--border-active)',
                  color: 'white',
                  fontSize: '0.75em',
                  fontWeight: 700,
                }}>
                  {src.index ?? (idx + 1)}
                </span>
                <span style={{
                  fontWeight: 500,
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {src.title}
                </span>
                <span style={{
                  fontSize: '0.85em',
                  color: 'var(--text-muted)',
                  borderLeft: '1px solid var(--border)',
                  paddingLeft: 6,
                }}>
                  {domain}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchSources;

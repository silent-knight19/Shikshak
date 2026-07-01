import { type FC } from 'react';

const CTX_LIMIT = 131_072; // gpt-oss-120b: 128K · gemma-4-31b: 256K — safe minimum

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

interface ContextWindowProps {
  used: number;
}

const ContextWindow: FC<ContextWindowProps> = ({ used }) => {
  const pct = Math.min((used / CTX_LIMIT) * 100, 100);
  const color =
    pct > 90 ? '#f28b82'
    : pct > 70 ? '#fdd663'
    : '#9aa0a6';

  const barColor =
    pct > 90 ? '#f28b82'
    : pct > 70 ? '#fdd663'
    : '#5f6368';

  return (
    <div
      title={`${used.toLocaleString()} / ${CTX_LIMIT.toLocaleString()} tokens`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '0.714em',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          fontFamily: 'var(--font-sans)',
        }}>
          Context
        </span>
        <span style={{
          fontSize: '0.857em',
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          color: used === 0 ? 'var(--text-faint)' : 'var(--text-primary)',
          letterSpacing: '-0.01em',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <span>{fmt(used)}</span>
          <span style={{ color: 'var(--text-faint)', opacity: 0.5 }}>/</span>
          <span style={{ color }}>{fmt(CTX_LIMIT)}</span>
        </span>
      </div>
      <div style={{
        width: '100%',
        height: 3,
        borderRadius: 2,
        background: 'var(--bg-hover)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 2,
          background: barColor,
          opacity: used === 0 ? 0.3 : 0.8,
          transition: 'width 0.3s ease, opacity 0.3s ease',
        }} />
      </div>
    </div>
  );
};

export default ContextWindow;

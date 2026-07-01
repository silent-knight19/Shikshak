import { type FC, useMemo, useState, useCallback } from 'react';
import { ShikiHighlighter } from 'react-shiki';

interface CodeBlockProps {
  language: string;
  children: string;
}

const CodeBlock: FC<CodeBlockProps> = ({ language, children }) => {
  const code = useMemo(() => String(children).replace(/\n$/, ''), [children]);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div style={{
      margin: '12px 0',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      background: 'var(--code-bg)',
    }}>
      {/* Header bar */}
      <div style={{
        padding: '5px 12px',
        fontSize: '0.786em',
        color: 'var(--text-faint)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--thinking-bg)',
        letterSpacing: '0.3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: language ? 'var(--accent-blue)' : 'var(--text-faint)',
            opacity: 0.6,
          }} />
          {language || 'code'}
        </span>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          style={{
            background: 'transparent',
            border: 'none',
            color: copied ? 'var(--status-good)' : 'var(--text-faint)',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.786em',
            fontFamily: 'var(--font-sans)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'color var(--transition-normal)',
          }}
          onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'var(--text-faint)'; }}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div style={{ padding: '10px 12px', overflow: 'auto' }}>
        <ShikiHighlighter language={language} theme="github-dark">
          {code}
        </ShikiHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;

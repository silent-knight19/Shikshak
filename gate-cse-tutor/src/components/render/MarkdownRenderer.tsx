import { useMemo, useEffect, type FC, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import CodeBlock from './CodeBlock';
import LazyMermaidBlock from './LazyMermaidBlock';

interface MarkdownRendererProps {
  content: string;
  suppressMermaid?: boolean;
}

function isMermaidBlock(language: string | undefined): boolean {
  return language === 'mermaid' || language === 'mmd';
}

const MATH_RE = /\\\(|\\\[|\\\\\(|\\\\\[|\$\$/;

function hasMath(content: string): boolean {
  return MATH_RE.test(content);
}

const MarkdownRenderer: FC<MarkdownRendererProps> = ({ content, suppressMermaid = false }) => {
  const cleanContent = content
    .replace(/<visualization>[\s\S]*?(<\/visualization>|$)/gi, '')
    .replace(/```mermaid[\s\S]*?(```|$)/gi, '')
    .replace(/```mmd[\s\S]*?(```|$)/gi, '');

  const needsMath = useMemo(() => hasMath(cleanContent), [cleanContent]);

  useEffect(() => {
    if (needsMath) {
      const linkId = 'katex-css-lazy';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
        link.integrity = 'sha384-nB0miv6/jRmo5UMMR1wu3Gz6NL4x5NIfgQ1gW7H4kUTpmlXlLDTvG5IhK+qG6fG';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    }
  }, [needsMath]);

  const components: any = useMemo(() => ({
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match ? match[1] : '';
      const codeStr = String(children).replace(/\n$/, '');

      if (isMermaidBlock(lang)) {
        if (suppressMermaid) return null;
        return <LazyMermaidBlock chart={codeStr} />;
      }

      if (lang) {
        return <CodeBlock language={lang}>{codeStr}</CodeBlock>;
      }

      return (
        <code style={{
          background: 'var(--code-bg)',
          padding: '2px 5px',
          borderRadius: 4,
          fontSize: '0.88em',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }} {...props}>
          {children}
        </code>
      );
    },
    pre({ children }: { children: ReactNode }) {
      return <>{children}</>;
    },
    table({ children }: { children: ReactNode }) {
      return (
        <div style={{ overflowX: 'auto', margin: '12px 0' }}>
          <table style={{
            borderCollapse: 'collapse',
            width: '100%',
            fontSize: '0.929em',
            border: '1px solid var(--border)',
          }}>
            {children}
          </table>
        </div>
      );
    },
    th({ children }: { children: ReactNode }) {
      return (
        <th style={{
          border: '1px solid var(--border)',
          padding: '8px 12px',
          textAlign: 'left',
          fontWeight: 600,
          color: 'var(--text-heading)',
          background: 'var(--bg-surface)',
          fontSize: '0.857em',
          letterSpacing: '0.3px',
        }}>
          {children}
        </th>
      );
    },
    td({ children }: { children: ReactNode }) {
      return (
        <td style={{
          border: '1px solid var(--border)',
          padding: '8px 12px',
          textAlign: 'left',
          color: 'var(--text-primary)',
        }}>
          {children}
        </td>
      );
    },
    tr({ children, ...props }: any) {
      return (
        <tr style={{}} {...props}>
          {children}
        </tr>
      );
    },
    h1({ children }: { children: ReactNode }) {
      return <h1 style={{ color: 'var(--text-heading)', fontSize: '1.429em', fontWeight: 600, margin: '20px 0 10px', lineHeight: 1.3 }}>{children}</h1>;
    },
    h2({ children }: { children: ReactNode }) {
      return <h2 style={{ color: 'var(--text-heading)', fontSize: '1.214em', fontWeight: 600, margin: '18px 0 8px', lineHeight: 1.3 }}>{children}</h2>;
    },
    h3({ children }: { children: ReactNode }) {
      return <h3 style={{ color: 'var(--text-heading)', fontSize: '1.071em', fontWeight: 600, margin: '16px 0 6px', lineHeight: 1.4 }}>{children}</h3>;
    },
    p({ children }: { children: ReactNode }) {
      return <p style={{ margin: '10px 0', lineHeight: 1.75 }}>{children}</p>;
    },
    ul({ children }: { children: ReactNode }) {
      return <ul style={{ margin: '8px 0', paddingLeft: 22 }}>{children}</ul>;
    },
    ol({ children }: { children: ReactNode }) {
      return <ol style={{ margin: '8px 0', paddingLeft: 22 }}>{children}</ol>;
    },
    li({ children }: { children: ReactNode }) {
      return <li style={{ margin: '3px 0', lineHeight: 1.7 }}>{children}</li>;
    },
    blockquote(props: any) {
      const { children } = props;
      const textContent = String(children);
      const isTrap = textContent.includes('\u26A0\uFE0F') || textContent.includes('TRAP');

      return (
        <blockquote style={{
          margin: '12px 0',
          padding: '10px 14px',
          borderLeft: `3px solid ${isTrap ? 'var(--status-warning)' : 'var(--accent-blue)'}`,
          color: 'var(--text-primary)',
          background: isTrap ? 'var(--status-warning-bg)' : 'var(--accent-blue-subtle)',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          fontWeight: 500,
          lineHeight: 1.7,
        }}>
          {children}
        </blockquote>
      );
    },
    hr() {
      return <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />;
    },
    a(props: any) {
      const { href, children } = props;
      return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>{children}</a>;
    },
    strong({ children }: { children: ReactNode }) {
      return <strong style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{children}</strong>;
    },
  }), [suppressMermaid]);

  return (
    <div style={{ lineHeight: 1.75 }}>
      <ReactMarkdown
        remarkPlugins={needsMath ? [remarkMath, remarkGfm] : [remarkGfm]}
        rehypePlugins={needsMath ? [rehypeKatex, rehypeRaw] : [rehypeRaw]}
        components={components}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

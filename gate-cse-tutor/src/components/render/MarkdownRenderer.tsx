import { useMemo, type FC, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import CodeBlock from './CodeBlock';
import MermaidBlock from './MermaidBlock';

interface MarkdownRendererProps {
  content: string;
  suppressMermaid?: boolean;
}

function isMermaidBlock(language: string | undefined): boolean {
  return language === 'mermaid' || language === 'mmd';
}

const MarkdownRenderer: FC<MarkdownRendererProps> = ({ content, suppressMermaid = false }) => {
  // Strip any stray visualization/Mermaid tags that might leak through streaming
  const cleanContent = content
    .replace(/<visualization>[\s\S]*?(<\/visualization>|$)/gi, '')
    .replace(/```mermaid[\s\S]*?(```|$)/gi, '')
    .replace(/```mmd[\s\S]*?(```|$)/gi, '');
  const components: any = useMemo(() => ({
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match ? match[1] : '';
      const codeStr = String(children).replace(/\n$/, '');

      if (isMermaidBlock(lang)) {
        if (suppressMermaid) return null;
        return <MermaidBlock chart={codeStr} />;
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
            fontSize: 13,
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
          fontSize: 12,
          letterSpacing: '0.3px',
        }}>
          {children}
        </th>
      );
    },
    td({ children }: { children: ReactNode }) {
      return (
        <td
          style={{
            border: '1px solid var(--border)',
            padding: '8px 12px',
            textAlign: 'left',
            color: 'var(--text-primary)',
            transition: 'background var(--transition-fast)',
          }}
        >
          {children}
        </td>
      );
    },
    tr({ children, ...props }: any) {
      return (
        <tr
          style={{ transition: 'background var(--transition-fast)' }}
          onMouseEnter={(e: any) => { if (e.currentTarget.parentElement?.tagName === 'TBODY') e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
          {...props}
        >
          {children}
        </tr>
      );
    },
    h1({ children }: { children: ReactNode }) {
      return <h1 style={{ color: 'var(--text-heading)', fontSize: 20, fontWeight: 600, margin: '20px 0 10px', lineHeight: 1.3 }}>{children}</h1>;
    },
    h2({ children }: { children: ReactNode }) {
      return <h2 style={{ color: 'var(--text-heading)', fontSize: 17, fontWeight: 600, margin: '18px 0 8px', lineHeight: 1.3 }}>{children}</h2>;
    },
    h3({ children }: { children: ReactNode }) {
      return <h3 style={{ color: 'var(--text-heading)', fontSize: 15, fontWeight: 600, margin: '16px 0 6px', lineHeight: 1.4 }}>{children}</h3>;
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

      // Detect TRAP/WARNING callouts from the system prompt
      const textContent = String(children);
      const isTrap = textContent.includes('⚠️') || textContent.includes('TRAP');

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
      return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}>{children}</a>;
    },
    strong({ children }: { children: ReactNode }) {
      return <strong style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{children}</strong>;
    },
  }), [suppressMermaid]);

  return (
    <div style={{ lineHeight: 1.75 }}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={components}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

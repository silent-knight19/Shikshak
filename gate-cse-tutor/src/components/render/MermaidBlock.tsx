import { type FC, useEffect, useRef } from 'react';

interface MermaidBlockProps {
  chart: string;
}

let mermaidIdCounter = 0;
let mermaidInitialized = false;

const MermaidBlock: FC<MermaidBlockProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
              background: '#0d0d0d',
              primaryColor: '#333',
              primaryTextColor: '#b0b0b0',
              primaryBorderColor: '#333',
              lineColor: '#555',
              secondaryColor: '#1a1a1a',
              tertiaryColor: '#222',
            },
          });
          mermaidInitialized = true;
        }

        if (cancelled) return;
        const uniqueId = `mermaid-${++mermaidIdCounter}`;
        const { svg } = await mermaid.render(uniqueId, chart);
        if (cancelled) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        // Silent fail — don't show errors or raw chart text
      }
    })();

    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div ref={containerRef} />
  );
};

export default MermaidBlock;

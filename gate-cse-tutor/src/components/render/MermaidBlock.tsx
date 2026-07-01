import { type FC, useEffect, useRef, useState } from 'react';

interface MermaidBlockProps {
  chart: string;
}

let mermaidIdCounter = 0;
let mermaidInitialized = false;

const MermaidBlock: FC<MermaidBlockProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);

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
        if (!cancelled) setError(true);
      }
    })();

    return () => { cancelled = true; };
  }, [chart]);

  if (error) return null; // Silently hide broken diagrams

  return (
    <div ref={containerRef} />
  );
};

export default MermaidBlock;

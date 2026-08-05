import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
});

export default function Mermaid({ chart }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (chart && containerRef.current) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart)
        .then((result) => {
          containerRef.current.innerHTML = result.svg;
        })
        .catch((e) => {
          console.error("Mermaid parsing error", e);
        });
    }
  }, [chart]);

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', width: '100%', overflowX: 'auto', padding: '1rem' }} />;
}

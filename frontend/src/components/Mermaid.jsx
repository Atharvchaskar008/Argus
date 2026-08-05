import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize once — startOnLoad: false is critical to avoid conflicts with manual render
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    useMaxWidth: true,
  },
});

let _idCounter = 0;

export default function Mermaid({ chart }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [idSuffix] = useState(() => ++_idCounter);

  useEffect(() => {
    if (!chart || !containerRef.current) return;

    setError(null);

    // Sanitize the chart string:
    // 1. Normalize escaped newlines (\n) to real newlines
    // 2. Strip any wrapping ``` fences the LLM may have added
    let cleaned = chart
      .replace(/\\n/g, '\n')          // escaped \n → real newline
      .replace(/\\t/g, '  ')          // escaped \t → spaces
      .replace(/^```[a-z]*\n?/i, '')  // strip opening fence
      .replace(/\n?```$/i, '')        // strip closing fence
      .trim();

    // If the LLM returned nothing useful, show a placeholder
    if (!cleaned || cleaned.length < 5) {
      setError('No diagram data available.');
      return;
    }

    const id = `mermaid-chart-${idSuffix}`;

    mermaid.render(id, cleaned)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      })
      .catch((e) => {
        console.error('Mermaid render error:', e, '\nChart:', cleaned);
        setError(`Diagram syntax error: ${e?.message || 'Invalid Mermaid syntax'}`);
      });

  }, [chart, idSuffix]);

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        border: '1px solid #FCA5A5',
        backgroundColor: '#FEF2F2',
        borderRadius: '4px',
        color: '#DC2626',
        fontSize: '14px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        <strong>⚠ Diagram Error</strong><br />
        {error}
        {chart && (
          <details style={{ marginTop: '1rem', color: '#666' }}>
            <summary style={{ cursor: 'pointer' }}>Show raw diagram code</summary>
            <pre style={{ fontSize: '12px', overflowX: 'auto', marginTop: '0.5rem' }}>{chart}</pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        overflowX: 'auto',
        padding: '1rem',
        minHeight: '120px',
      }}
    />
  );
}

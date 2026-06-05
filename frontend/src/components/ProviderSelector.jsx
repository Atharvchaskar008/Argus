import React, { useEffect, useState } from 'react';

export default function ProviderSelector({ selectedModel, onSelect }) {
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/health/providers')
      .then(res => res.json())
      .then(data => {
        const arr = Object.entries(data).map(([id, info]) => ({
          id,
          name: info.name,
          status: info.status
        }));
        setProviders(arr);
      })
      .catch(err => console.error("Failed to load providers", err));
  }, []);

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
      {providers.map(p => {
        const isHealthy = p.status === 'Healthy';
        const isSelected = selectedModel === p.id;
        
        return (
          <button
            key={p.id}
            onClick={() => isHealthy && onSelect(p.id)}
            disabled={!isHealthy}
            title={!isHealthy ? "Missing API Key" : ""}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0',
              fontSize: '15px',
              fontWeight: 600,
              border: isSelected ? '1px solid #000000' : '1px solid #E5E5E5',
              backgroundColor: isSelected ? '#000000' : '#FFFFFF',
              color: isSelected ? '#FFFFFF' : (isHealthy ? '#000000' : '#A3A3A3'),
              cursor: isHealthy ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              opacity: isHealthy ? 1 : 0.6
            }}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}

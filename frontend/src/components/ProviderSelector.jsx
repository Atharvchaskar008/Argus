import React, { useEffect, useState } from 'react';
import { ChevronDown, Cpu } from 'lucide-react';

const PRESET_MODELS = [
  { id: 'gemini', name: 'Gemini Flash (Default)', provider: 'Google' },
  { id: 'claude', name: 'Claude Sonnet', provider: 'Anthropic' },
  { id: 'gpt4', name: 'GPT-4o', provider: 'OpenAI' },
];

export default function ProviderSelector({ selectedModel, onSelect }) {
  const [models, setModels] = useState(PRESET_MODELS);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/models')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setModels(data);
          // Auto-select first if current selection not in new list
          const ids = data.map(m => m.id);
          if (!ids.includes(selectedModel)) {
            onSelect(data[0].id);
          }
        }
      })
      .catch(() => {/* keep presets on error */})
      .finally(() => setLoading(false));
  }, []);

  const selected = models.find(m => m.id === selectedModel) || models[0];

  return (
    <div style={{ marginBottom: '2rem', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#404040', fontSize: '13px', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        <Cpu size={14} />
        LLM Provider
      </div>

      <div style={{ position: 'relative', display: 'inline-block', minWidth: '280px' }}>
        <button
          onClick={() => setIsOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '0.75rem 1rem',
            border: '1px solid #000000', backgroundColor: '#FFFFFF',
            cursor: 'pointer', fontSize: '15px', fontWeight: 500, color: '#000000',
            gap: '1rem'
          }}
        >
          <span>{loading ? 'Loading models...' : (selected?.name || selectedModel)}</span>
          <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </button>

        {isOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
            backgroundColor: '#FFFFFF', border: '1px solid #000000', borderTop: 'none',
            maxHeight: '280px', overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            {models.map(m => (
              <div
                key={m.id}
                onClick={() => { onSelect(m.id); setIsOpen(false); }}
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  backgroundColor: selectedModel === m.id ? '#F5F5F5' : '#FFFFFF',
                  borderLeft: selectedModel === m.id ? '3px solid #000000' : '3px solid transparent',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedModel === m.id ? '#F5F5F5' : '#FFFFFF'}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#000000' }}>{m.name}</div>
                {m.provider && (
                  <div style={{ fontSize: '12px', color: '#888888', marginTop: '2px' }}>{m.provider}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
        />
      )}
    </div>
  );
}

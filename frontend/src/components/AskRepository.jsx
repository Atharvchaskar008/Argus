import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useRepo } from '../context/RepoContext';

const MODELS = [
  { id: 'gemini', name: 'Gemini', color: '#10b981' },
  { id: 'openai', name: 'GPT-4o', color: '#2563eb' },
  { id: 'anthropic', name: 'Claude', color: '#d97706' },
  { id: 'deepseek', name: 'DeepSeek', color: '#8b5cf6' },
  { id: 'grok', name: 'Grok', color: '#ec4899' },
];

export default function AskRepository() {
  const { session } = useRepo();
  const [query, setQuery] = useState('');
  const [selectedModels, setSelectedModels] = useState(['gemini', 'openai']);
  const [responses, setResponses] = useState({});
  const [isQuerying, setIsQuerying] = useState(false);

  const toggleModel = (modelId) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(m => m !== modelId) 
        : [...prev, modelId].slice(0, 3) // Max 3 models to compare
    );
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!query.trim() || selectedModels.length === 0 || !session) return;

    setIsQuerying(true);
    setResponses({});

    await Promise.all(
      selectedModels.map(async (model) => {
        try {
          const res = await fetch('http://localhost:8000/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: session.id, query, model })
          });
          const data = await res.json();
          setResponses(prev => ({ ...prev, [model]: data.answer || data.error }));
        } catch (err) {
          setResponses(prev => ({ ...prev, [model]: 'Failed to fetch response.' }));
        }
      })
    );

    setIsQuerying(false);
  };

  return (
    <div style={{ marginBottom: '3rem' }}>
      <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.5rem', backgroundColor: 'var(--color-bg)' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={20} /> Ask Repository
        </h3>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {MODELS.map(model => (
            <button
              key={model.id}
              onClick={() => toggleModel(model.id)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 500,
                border: `1px solid ${selectedModels.includes(model.id) ? model.color : 'var(--color-border)'}`,
                backgroundColor: selectedModels.includes(model.id) ? `${model.color}15` : 'transparent',
                color: selectedModels.includes(model.id) ? model.color : 'var(--color-gray-500)',
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.25rem'
              }}
            >
              {selectedModels.includes(model.id) && <Sparkles size={14} />}
              {model.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleAsk} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., How does the authentication system work?"
            disabled={isQuerying}
            style={{
              width: '100%', padding: '1.25rem 4rem 1.25rem 1.5rem', fontSize: '1rem',
              borderRadius: '8px', border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-gray-100)', outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-fg)'; e.target.style.backgroundColor = 'var(--color-bg)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.backgroundColor = 'var(--color-gray-100)'; }}
          />
          <button 
            type="submit" 
            disabled={isQuerying || !query.trim() || selectedModels.length === 0}
            style={{
              position: 'absolute', right: '0.75rem', padding: '0.75rem',
              backgroundColor: 'var(--color-fg)', color: 'var(--color-bg)',
              border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'opacity 0.2s',
              opacity: (isQuerying || !query.trim() || selectedModels.length === 0) ? 0.5 : 1
            }}
          >
            <Send size={18} />
          </button>
        </form>

        <AnimatePresence>
          {Object.keys(responses).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`, gap: '1.5rem' }}
            >
              {Object.entries(responses).map(([modelId, answer]) => {
                const model = MODELS.find(m => m.id === modelId);
                return (
                  <div key={modelId} style={{ border: `1px solid ${model?.color}40`, borderRadius: '8px', padding: '1.5rem', backgroundColor: `${model?.color}05` }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: model?.color, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles size={16} /> {model?.name}
                    </h4>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-800)', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      <ReactMarkdown>{answer}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

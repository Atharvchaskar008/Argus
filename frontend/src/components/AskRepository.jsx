import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useRepo } from '../context/RepoContext';
import ProviderSelector from './ProviderSelector';

const EXAMPLES = [
  "Explain repository architecture",
  "Show security weaknesses",
  "What should I fix first?",
  "Which dependency is most risky",
  "Explain authentication flow"
];

export default function AskRepository() {
  const { session } = useRepo();
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const handleAsk = async (text) => {
    const finalQuery = typeof text === 'string' ? text : query;
    if (!finalQuery.trim() || !session) return;

    setIsQuerying(true);
    setResponse(null);
    setError(null);
    setQuery(finalQuery);

    try {
      const res = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, query: finalQuery, model: selectedModel })
      });
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResponse(data.answer);
      }
    } catch (err) {
      setError({ reason: "Failed to connect to backend", suggested_fix: "Check your network connection." });
    }

    setIsQuerying(false);
  };

  return (
    <div style={{ marginBottom: '4rem' }}>
      <h3 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '2rem', color: '#000000', borderBottom: '2px solid #000000', paddingBottom: '1rem' }}>
        Ask Repository
      </h3>
      
      <div style={{ border: '1px solid #000000', padding: '3rem', backgroundColor: '#FFFFFF' }}>
        
        <ProviderSelector selectedModel={selectedModel} onSelect={setSelectedModel} />

        <form onSubmit={(e) => { e.preventDefault(); handleAsk(query); }} style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about the codebase..."
            disabled={isQuerying}
            style={{
              width: '100%', padding: '1.5rem 5rem 1.5rem 1.5rem', fontSize: '18px',
              borderRadius: '0', border: '1px solid #000000',
              backgroundColor: '#F5F5F5', outline: 'none', color: '#000000',
              transition: 'background-color 0.2s'
            }}
            onFocus={(e) => { e.target.style.backgroundColor = '#FFFFFF'; }}
            onBlur={(e) => { e.target.style.backgroundColor = '#F5F5F5'; }}
          />
          <button 
            type="submit" 
            disabled={isQuerying || !query.trim()}
            style={{
              position: 'absolute', right: '1rem', padding: '1rem 1.5rem',
              backgroundColor: '#000000', color: '#FFFFFF',
              border: 'none', borderRadius: '0', cursor: 'pointer', transition: 'opacity 0.2s',
              opacity: (isQuerying || !query.trim()) ? 0.5 : 1
            }}
          >
            {isQuerying ? <span style={{ fontSize: '15px' }}>...</span> : <Send size={20} />}
          </button>
        </form>

        {/* Example Chips */}
        {!response && !error && !isQuerying && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {EXAMPLES.map((ex, i) => (
              <button 
                key={i} 
                onClick={() => handleAsk(ex)}
                style={{ 
                  padding: '0.75rem 1.5rem', border: '1px solid #E5E5E5', backgroundColor: 'transparent',
                  color: '#404040', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.target.style.borderColor = '#000000'; e.target.style.color = '#000000'; }}
                onMouseLeave={e => { e.target.style.borderColor = '#E5E5E5'; e.target.style.color = '#404040'; }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ padding: '2rem', border: '1px solid #dc2626', backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '18px', marginBottom: '1rem' }}>
                <AlertCircle size={20} /> Request Failed
              </div>
              <div style={{ fontSize: '18px', lineHeight: 1.6 }}>
                <div><strong>Provider:</strong> {error.provider || 'System'}</div>
                <div><strong>Reason:</strong> {error.reason || (typeof error === 'string' ? error : 'Unknown error')}</div>
                {error.suggested_fix && <div><strong>Suggested Fix:</strong> {error.suggested_fix}</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Response State */}
        <AnimatePresence>
          {response && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#000000' }}>
                <Sparkles size={24} />
                <h4 style={{ fontSize: '20px', fontWeight: 600 }}>Response</h4>
              </div>
              <div className="font-mono" style={{ fontSize: '15px', color: '#000000', lineHeight: 1.8, borderLeft: '2px solid #000000', paddingLeft: '2rem' }}>
                <ReactMarkdown>{response}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

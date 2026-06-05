import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import { useRepo } from '../context/RepoContext';

export default function LandingExperience() {
  const [url, setUrl] = useState('');
  const { startAnalysis, isAnalyzing } = useRepo();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      startAnalysis(url.trim());
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}
      >
        <h1 style={{ fontSize: '3rem', fontWeight: 300, marginBottom: '1rem', letterSpacing: '-0.03em' }}>
          Code Intelligence,<br/>
          <span style={{ fontWeight: 600 }}>Simplified.</span>
        </h1>
        <p style={{ color: 'var(--color-gray-500)', marginBottom: '3rem', fontSize: '1.125rem' }}>
          Enter a GitHub repository URL to generate a comprehensive AI-powered architecture, security, and maintainability report.
        </p>

        <form onSubmit={handleSubmit} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={20} style={{ position: 'absolute', left: '1.5rem', color: 'var(--color-gray-400)' }} />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/organization/repository"
            disabled={isAnalyzing}
            className="font-mono"
            style={{
              width: '100%',
              padding: '1.25rem 4rem 1.25rem 3.5rem',
              fontSize: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-fg)'; e.target.style.boxShadow = '0 0 0 1px var(--color-fg)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
          />
          <button 
            type="submit" 
            disabled={isAnalyzing || !url.trim()}
            style={{
              position: 'absolute', right: '0.5rem',
              padding: '0.75rem',
              backgroundColor: url.trim() ? 'var(--color-fg)' : 'transparent',
              color: url.trim() ? 'var(--color-bg)' : 'var(--color-gray-400)',
              border: 'none', borderRadius: '6px',
              cursor: url.trim() && !isAnalyzing ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
          >
            {isAnalyzing ? <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>...</span> : <ArrowRight size={20} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

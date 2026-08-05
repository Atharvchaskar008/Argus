import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRepo } from '../context/RepoContext';
import Arrow from './Arrow';

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
        style={{ maxWidth: '700px', width: '100%', textAlign: 'center' }}
      >
        <h1 style={{ fontSize: '56px', fontWeight: 600, marginBottom: '1.5rem', letterSpacing: '-0.03em', color: '#000000', lineHeight: 1.1 }}>
          Understand Any Repository
        </h1>
        <p style={{ color: '#404040', marginBottom: '4rem', fontSize: '18px', fontWeight: 400, lineHeight: 1.5 }}>
          Security intelligence, architecture understanding, and AI-powered repository conversations.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/organization/repository"
            disabled={isAnalyzing}
            className="font-mono"
            style={{
              width: '100%',
              padding: '1.25rem 1.5rem',
              fontSize: '18px',
              borderRadius: '0',
              border: '1px solid #000000',
              backgroundColor: '#FFFFFF',
              color: '#000000',
              outline: 'none',
              textAlign: 'center',
              transition: 'background-color 0.2s',
            }}
            onFocus={(e) => { e.target.style.backgroundColor = '#F5F5F5'; }}
            onBlur={(e) => { e.target.style.backgroundColor = '#FFFFFF'; }}
          />
          <button 
            type="submit" 
            disabled={isAnalyzing || !url.trim()}
            style={{
              padding: '1.25rem 3rem',
              fontSize: '18px',
              fontWeight: 600,
              backgroundColor: url.trim() && !isAnalyzing ? '#000000' : '#F5F5F5',
              color: url.trim() && !isAnalyzing ? '#FFFFFF' : '#A0A0A0',
              border: url.trim() && !isAnalyzing ? '1px solid #000000' : '1px solid #E5E5E5',
              borderRadius: '0',
              cursor: url.trim() && !isAnalyzing ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              width: 'fit-content'
            }}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Repository'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

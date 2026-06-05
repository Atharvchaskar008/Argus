import React, { useState } from 'react';
import { Activity, GitBranch, Terminal } from 'lucide-react';
import { useRepo } from '../context/RepoContext';
import ActivityCenter from './ActivityCenter';

export default function Layout({ children }) {
  const { sessionState, isAnalyzing } = useRepo();
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        position: 'sticky', top: 0, zIndex: 100, 
        height: '72px', display: 'flex', alignItems: 'center', 
        padding: '0 2rem', backgroundColor: 'rgba(255, 255, 255, 0.9)', 
        backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--color-border)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
          <Activity size={24} />
          RepoSense
        </div>
        <div style={{ flex: 1 }} />
        {sessionState && sessionState.github && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-gray-500)' }}>
              <GitBranch size={16} />
              <span className="font-mono">{sessionState.github.full_name}</span>
              {isAnalyzing && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '1rem', color: '#2563eb' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#2563eb', display: 'inline-block' }} />
                  Analyzing
                </span>
              )}
            </div>
            <button 
              onClick={() => setIsActivityOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', border: '1px solid var(--color-border)',
                borderRadius: '6px', backgroundColor: 'transparent',
                cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                color: 'var(--color-fg)', transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-gray-100)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <Terminal size={16} />
              Logs
            </button>
          </div>
        )}
      </header>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      <ActivityCenter isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} />
    </div>
  );
}

import React, { useState } from 'react';
import { Activity, Terminal, ArrowLeft } from 'lucide-react';
import { useRepo } from '../context/RepoContext';
import ActivityCenter from './ActivityCenter';

export default function Layout({ children }) {
  const { session, sessionState, isAnalyzing, resetSession } = useRepo();
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  const scrollTo = (id) => {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(id);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 100; // offset for sticky header
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#000000' }}>
      <header style={{ 
        position: 'sticky', top: 0, zIndex: 100, 
        height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', backgroundColor: '#FFFFFF', 
        borderBottom: '1px solid #000000' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {(session || sessionState) && (
            <button
              onClick={resetSession}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.4rem 0.8rem', border: '1px solid #000000',
                backgroundColor: '#000000', color: '#FFFFFF',
                cursor: 'pointer', fontSize: '14px', fontWeight: 500,
                borderRadius: '4px', transition: 'all 0.2s'
              }}
              title="Return to Home / New Search"
            >
              <ArrowLeft size={16} />
              Back to Search
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.02em', color: '#000000' }}>
            <Activity size={24} />
            RepoSense
          </div>
        </div>
        
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', fontSize: '15px', fontWeight: 500, color: '#404040' }}>
          <span onClick={() => scrollTo('top')} style={{ cursor: 'pointer', color: '#000000' }}>Repositories</span>
          <span onClick={() => scrollTo('security')} style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#000000'} onMouseLeave={e => e.target.style.color = '#404040'}>Security</span>
          <span onClick={() => scrollTo('intelligence')} style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#000000'} onMouseLeave={e => e.target.style.color = '#404040'}>Intelligence</span>
          <span onClick={() => scrollTo('architecture')} style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#000000'} onMouseLeave={e => e.target.style.color = '#404040'}>Architecture</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', fontSize: '15px', fontWeight: 500, color: '#404040' }}>
          {sessionState && sessionState.github && (
            <button 
              onClick={() => setIsActivityOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', border: '1px solid #000000',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer', fontSize: '15px', fontWeight: 500,
                color: '#000000', transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            >
              <Terminal size={16} />
              Activity
            </button>
          )}
        </div>
      </header>
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      <ActivityCenter isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} />
    </div>
  );
}

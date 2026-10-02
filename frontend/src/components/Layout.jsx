import React, { useState, useRef, useEffect } from 'react';
import { Activity, Terminal, ArrowLeft, LogOut, ChevronDown, Lock, ExternalLink, X } from 'lucide-react';
import { useRepo } from '../context/RepoContext';
import { useAuth } from '../context/AuthContext';
import ActivityCenter from './ActivityCenter';

function GitHubIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function Layout({ children }) {
  const { session, sessionState, isAnalyzing, resetSession } = useRepo();
  const { user, isAuthenticated, login, logout, authError, clearAuthError } = useAuth();
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollTo = (id) => {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(id);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#000000' }}>
      {authError && (
        <div style={{
          backgroundColor: '#000000',
          color: '#FFFFFF',
          padding: '0.6rem 2rem',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>GitHub Authentication Notice: <strong>{authError}</strong>. Ensure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are configured in .env</span>
          <button onClick={clearAuthError} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

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
          <div 
            onClick={resetSession}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.75rem', 
              fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.02em', 
              color: '#000000', cursor: 'pointer' 
            }}
          >
            <Activity size={24} />
            Argus
          </div>
        </div>
        
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', fontSize: '15px', fontWeight: 500, color: '#404040' }}>
          <span onClick={() => scrollTo('top')} style={{ cursor: 'pointer', color: '#000000' }}>Repositories</span>
          <span onClick={() => scrollTo('security')} style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#000000'} onMouseLeave={e => e.target.style.color = '#404040'}>Security</span>
          <span onClick={() => scrollTo('intelligence')} style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#000000'} onMouseLeave={e => e.target.style.color = '#404040'}>Intelligence</span>
          <span onClick={() => scrollTo('architecture')} style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#000000'} onMouseLeave={e => e.target.style.color = '#404040'}>Architecture</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '15px', fontWeight: 500 }}>
          {sessionState && sessionState.github && (
            <button 
              onClick={() => setIsActivityOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', border: '1px solid #000000',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer', fontSize: '14px', fontWeight: 500,
                color: '#000000', transition: 'background-color 0.2s',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            >
              <Terminal size={16} />
              Activity
            </button>
          )}

          {/* GitHub Authentication Header Widget */}
          {isAuthenticated && user ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.35rem 0.75rem',
                  border: '1px solid #000000',
                  backgroundColor: isUserMenuOpen ? '#F5F5F5' : '#FFFFFF',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                }}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <GitHubIcon size={20} />
                )}
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#000000' }}>
                  {user.name || user.login}
                </span>
                <ChevronDown size={14} color="#666" />
              </button>

              {isUserMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '260px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #000000',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    borderRadius: '4px',
                    zIndex: 200,
                    padding: '0.75rem 0',
                  }}
                >
                  <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #EEEEEE' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#000000' }}>{user.name || user.login}</div>
                    <div style={{ fontSize: '12px', color: '#666666' }}>@{user.login}</div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '12px', color: '#444' }}>
                      <span><strong>{user.public_repos}</strong> public</span>
                      {user.total_private_repos !== undefined && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Lock size={11} />
                          <strong>{user.total_private_repos}</strong> private
                        </span>
                      )}
                    </div>
                  </div>

                  {user.html_url && (
                    <a
                      href={user.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 1rem',
                        fontSize: '13px',
                        color: '#000000',
                        textDecoration: 'none',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                    >
                      <span>View GitHub Profile</span>
                      <ExternalLink size={13} color="#888" />
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 1rem',
                      fontSize: '13px',
                      color: '#D32F2F',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s',
                      borderTop: '1px solid #EEEEEE',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF5F5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={login}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.5rem 1rem',
                border: '1px solid #000000',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#222222';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#000000';
              }}
            >
              <GitHubIcon size={16} color="#FFFFFF" />
              Sign In with GitHub
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

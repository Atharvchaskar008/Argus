import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Globe, Star, Search, RefreshCw, FolderGit2 } from 'lucide-react';
import { useRepo } from '../context/RepoContext';
import { useAuth } from '../context/AuthContext';

function GitHubIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function LandingExperience() {
  const [url, setUrl] = useState('');
  const [inputTab, setInputTab] = useState('custom'); // 'custom' | 'picker'
  const [repoSearch, setRepoSearch] = useState('');
  const { startAnalysis, isAnalyzing } = useRepo();
  const { user, isAuthenticated, repos, isLoadingRepos, fetchRepos, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated && repos.length === 0) {
      fetchRepos();
    }
  }, [isAuthenticated, fetchRepos, repos.length]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      startAnalysis(url.trim());
    }
  };

  const handleSelectRepo = (selectedRepo) => {
    const targetUrl = selectedRepo.html_url || `https://github.com/${selectedRepo.full_name}`;
    setUrl(targetUrl);
    startAnalysis(targetUrl);
  };

  const filteredRepos = repos.filter((r) =>
    (r.full_name || r.name || '').toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.language || '').toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: '780px', width: '100%', textAlign: 'center' }}
      >
        <h1 style={{ fontSize: '56px', fontWeight: 600, marginBottom: '1.5rem', letterSpacing: '-0.03em', color: '#000000', lineHeight: 1.1 }}>
          Understand Any Repository
        </h1>
        <p style={{ color: '#404040', marginBottom: '3rem', fontSize: '18px', fontWeight: 400, lineHeight: 1.5 }}>
          Autonomous security intelligence, architecture reverse-engineering, and AST dependency graphs.
        </p>

        {isAuthenticated ? (
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              onClick={() => setInputTab('custom')}
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: '14px',
                fontWeight: 600,
                border: '1px solid #000000',
                backgroundColor: inputTab === 'custom' ? '#000000' : '#FFFFFF',
                color: inputTab === 'custom' ? '#FFFFFF' : '#000000',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
            >
              Enter Repository URL
            </button>
            <button
              onClick={() => {
                setInputTab('picker');
                if (repos.length === 0) fetchRepos();
              }}
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: '14px',
                fontWeight: 600,
                border: '1px solid #000000',
                backgroundColor: inputTab === 'picker' ? '#000000' : '#FFFFFF',
                color: inputTab === 'picker' ? '#FFFFFF' : '#000000',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
              }}
            >
              <FolderGit2 size={16} />
              Choose From My Repositories ({repos.length || (isLoadingRepos ? '...' : 0)})
            </button>
          </div>
        ) : null}

        {inputTab === 'picker' && isAuthenticated ? (
          <div style={{
            border: '1px solid #000000',
            backgroundColor: '#FFFFFF',
            textAlign: 'left',
            padding: '1.25rem',
            borderRadius: '4px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                border: '1px solid #CCCCCC',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                backgroundColor: '#FAFAFA'
              }}>
                <Search size={16} color="#666" style={{ marginRight: '0.5rem' }} />
                <input
                  type="text"
                  placeholder="Filter by repository name or language..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    backgroundColor: 'transparent',
                    fontSize: '14px'
                  }}
                />
              </div>
              <button
                onClick={fetchRepos}
                disabled={isLoadingRepos}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #000000',
                  backgroundColor: '#FFFFFF',
                  cursor: isLoadingRepos ? 'wait' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '4px'
                }}
                title="Refresh Repositories"
              >
                <RefreshCw size={14} className={isLoadingRepos ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {isLoadingRepos && repos.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                  Loading repositories from GitHub...
                </div>
              ) : filteredRepos.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                  No repositories found matching "{repoSearch}".
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => handleSelectRepo(repo)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      border: '1px solid #E5E5E5',
                      borderRadius: '4px',
                      cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      backgroundColor: '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5F5F5';
                      e.currentTarget.style.borderColor = '#000000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E5E5E5';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '15px' }}>
                        {repo.private ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', backgroundColor: '#000000', color: '#FFF', padding: '1px 6px', borderRadius: '3px' }}>
                            <Lock size={10} /> Private
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', backgroundColor: '#EFEFEF', color: '#333', padding: '1px 6px', borderRadius: '3px' }}>
                            <Globe size={10} /> Public
                          </span>
                        )}
                        <span>{repo.full_name}</span>
                      </div>
                      {repo.description && (
                        <div style={{ fontSize: '13px', color: '#666', maxWidth: '520px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {repo.description}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '13px', color: '#555' }}>
                      {repo.language && (
                        <span style={{ backgroundColor: '#F0F0F0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                          {repo.language}
                        </span>
                      )}
                      {repo.stars > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Star size={13} fill="#FFA000" color="#FFA000" />
                          {repo.stars}
                        </span>
                      )}
                      <button
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: '#000000',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Analyze
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
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
                borderRadius: '4px',
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
                borderRadius: '4px',
                cursor: url.trim() && !isAnalyzing ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                width: 'fit-content'
              }}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Repository'}
            </button>
          </form>
        )}

        {!isAuthenticated && (
          <div style={{
            marginTop: '3.5rem',
            padding: '1rem 1.5rem',
            border: '1px dashed #A0A0A0',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFA',
            fontSize: '14px',
            color: '#333333'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
              <Lock size={18} color="#000" />
              <span>
                Want to analyze <strong>private repositories</strong> and unlock higher GitHub API rate limits?
              </span>
            </div>
            <button
              onClick={login}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 1rem',
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <GitHubIcon size={14} color="#FFF" />
              Sign In with GitHub
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

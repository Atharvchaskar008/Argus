import React from 'react';
import { motion } from 'framer-motion';
import { useRepo } from '../context/RepoContext';

export default function RepositoryOverview() {
  const { sessionState } = useRepo();
  if (!sessionState?.summary) return null;

  const { summary, code_quality, findings, recommendations } = sessionState;

  return (
    <motion.div id="security" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
      
      {/* Overview Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', alignItems: 'center' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 600, color: '#000000', margin: 0, letterSpacing: '-0.02em' }}>Repository Overview</h2>
        <p style={{ fontSize: '18px', color: '#404040', maxWidth: '800px', lineHeight: 1.6 }}>{summary.purpose}</p>
        
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '3rem', padding: '1.5rem 4rem', border: '1px solid #000000', backgroundColor: '#FFFFFF' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', color: '#404040', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Security Score</div>
            <div style={{ fontSize: '40px', fontWeight: 600, color: '#000000', lineHeight: 1 }}>{code_quality?.score || 0}<span style={{ fontSize: '20px', color: '#A3A3A3' }}>/100</span></div>
          </div>
          <div style={{ width: '1px', height: '60px', backgroundColor: '#E5E5E5' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', color: '#404040', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Blast Radius</div>
            <div style={{ fontSize: '40px', fontWeight: 600, color: '#000000', lineHeight: 1 }}>{sessionState?.impact?.blast_radius || 0}<span style={{ fontSize: '16px', color: '#A3A3A3' }}> modules</span></div>
          </div>
          <div style={{ width: '1px', height: '60px', backgroundColor: '#E5E5E5' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', color: '#404040', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Risk Level</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#000000', lineHeight: 1.4 }}>{summary.risk_level}</div>
          </div>
        </div>
      </div>

      {/* Blast Radius Impact Analysis */}
      {sessionState?.impact && (
        <div>
          <h3 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '2rem', color: '#000000', borderBottom: '2px solid #000000', paddingBottom: '1rem' }}>
            Blast Radius Impact Analysis
          </h3>
          <div style={{ padding: '2rem', border: '1px solid #000000', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ fontSize: '18px', color: '#404040', lineHeight: 1.6 }}>
              <strong>Target Module Evaluated:</strong> <span className="font-mono" style={{ backgroundColor: '#F5F5F5', padding: '0.2rem 0.6rem', border: '1px solid #E5E5E5' }}>{sessionState.impact.target || 'Core Architecture'}</span>
            </div>
            <div style={{ fontSize: '18px', color: '#404040', lineHeight: 1.6 }}>
              <strong>Blast Radius:</strong> Changes to this target module directly or indirectly impact <strong>{sessionState.impact.blast_radius || 0} downstream modules</strong> across the graph.
            </div>
            {sessionState.impact.human_readable && sessionState.impact.human_readable.length > 0 && (
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#000000', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Affected Downstream Components:</div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {sessionState.impact.human_readable.map((mod, idx) => (
                    <span key={idx} style={{ padding: '0.5rem 1rem', border: '1px solid #000000', backgroundColor: '#F5F5F5', fontSize: '15px', fontWeight: 500, color: '#000000' }}>
                      ⚡ {mod}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Critical Findings - Report Style */}
      <div>
        <h3 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '2rem', color: '#000000', borderBottom: '2px solid #000000', paddingBottom: '1rem' }}>
          Security Findings
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {findings?.map((f, i) => (
            <div key={i} style={{ padding: '2rem', border: '1px solid #000000', backgroundColor: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '20px', fontWeight: 600, color: '#000000', margin: 0 }}>{f.title}</h4>
                <span style={{ padding: '0.35rem 1rem', backgroundColor: '#000000', color: '#FFFFFF', fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {f.severity || 'High'} Severity
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem', fontSize: '18px', color: '#404040', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, color: '#000000' }}>Description</div>
                <div>{f.description || 'Vulnerability detected in source code patterns.'}</div>
                
                <div style={{ fontWeight: 600, color: '#000000' }}>Impact</div>
                <div>{f.impact || 'Can lead to unauthorized access or data leakage if exploited.'}</div>
                
                <div style={{ fontWeight: 600, color: '#000000' }}>Components</div>
                <div><span className="font-mono" style={{ backgroundColor: '#F5F5F5', padding: '0.2rem 0.5rem', border: '1px solid #E5E5E5', fontSize: '15px' }}>{f.file}</span></div>
                
                <div style={{ fontWeight: 600, color: '#000000' }}>Fix</div>
                <div>{f.fix || 'Review and refactor the component to eliminate the vulnerability.'}</div>
                
                <div style={{ fontWeight: 600, color: '#000000' }}>References</div>
                <div><a href="#" style={{ color: '#000000', textDecoration: 'underline' }}>{f.references || 'CWE-20: Improper Input Validation'}</a></div>
              </div>
            </div>
          ))}
          {(!findings || findings.length === 0) && (
            <div style={{ fontSize: '18px', color: '#404040', padding: '3rem', border: '1px dashed #000000', textAlign: 'center' }}>
              No critical issues found during analysis.
            </div>
          )}
        </div>
      </div>

      {/* Top Recommended Fixes */}
      <div>
        <h3 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '2rem', color: '#000000', borderBottom: '2px solid #000000', paddingBottom: '1rem' }}>
          Top Recommended Fixes
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {recommendations?.map((r, i) => (
            <div key={i} style={{ padding: '1.5rem 2rem', border: '1px solid #E5E5E5', backgroundColor: '#F5F5F5', fontSize: '18px', color: '#000000', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#A3A3A3', fontSize: '20px' }}>0{i+1}</span>
              <span style={{ lineHeight: 1.6 }}>{r}</span>
            </div>
          ))}
        </div>
      </div>

    </motion.div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';
import { useRepo } from '../context/RepoContext';

export default function RepositoryOverview() {
  const { sessionState } = useRepo();
  if (!sessionState?.summary) return null;

  const { summary, code_quality, findings, recommendations } = sessionState;

  const getScoreColor = (score) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#ca8a04';
    return '#dc2626';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Score Card */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `4px solid ${getScoreColor(code_quality?.score || 0)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: getScoreColor(code_quality?.score || 0) }}>
            {code_quality?.grade || '?'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Code Quality</h3>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>Score: {code_quality?.score || 0}/100</p>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>Risk: {summary.risk_level}</p>
          </div>
        </div>

        {/* Critical Issues */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} color="#dc2626" /> Security & Issues
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {findings?.slice(0, 3).map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem' }}>
                <AlertTriangle size={14} color="#d97706" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                <span><span style={{ fontWeight: 500 }}>{f.title}</span> - {f.file}</span>
              </div>
            ))}
            {(!findings || findings.length === 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontSize: '0.875rem' }}>
                <CheckCircle size={16} /> No critical issues found
              </div>
            )}
          </div>
        </div>

        {/* Top Fixes/Recs */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench size={18} color="#2563eb" /> Recommendations
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--color-gray-800)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recommendations?.slice(0, 3).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

      </div>

      <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-gray-100)', borderRadius: '8px', fontSize: '1rem', lineHeight: 1.6 }}>
        <span style={{ fontWeight: 600 }}>Summary:</span> {summary.purpose}
      </div>
    </motion.div>
  );
}

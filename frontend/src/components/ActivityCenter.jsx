import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Cpu } from 'lucide-react';
import { useRepo } from '../context/RepoContext';

export default function ActivityCenter({ isOpen, onClose }) {
  const { sessionState, logs } = useRepo();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: '#000', zIndex: 200
            }}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px',
              backgroundColor: 'var(--color-bg)', zIndex: 210,
              borderLeft: '1px solid var(--color-border)',
              display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Terminal size={18} />
                Activity Center
              </h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-500)' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Agents
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sessionState?.active_agents?.length > 0 ? (
                  sessionState.active_agents.map((agent, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <Cpu size={16} style={{ marginTop: '0.125rem', color: agent.state === 'RUNNING' ? '#2563eb' : 'var(--color-gray-500)' }} />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{agent.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{agent.action || agent.state}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>No active agents.</div>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Execution Stream
              </h4>
              {logs.map((log, idx) => (
                <div key={idx} className="font-mono" style={{
                  fontSize: '0.75rem',
                  padding: '0.5rem',
                  backgroundColor: log.level === 'error' ? '#fef2f2' : (log.level === 'warn' ? '#fffbeb' : 'var(--color-gray-100)'),
                  color: log.level === 'error' ? '#dc2626' : (log.level === 'warn' ? '#d97706' : 'var(--color-gray-800)'),
                  borderRadius: '4px',
                  borderLeft: `2px solid ${log.level === 'error' ? '#dc2626' : (log.level === 'warn' ? '#d97706' : 'var(--color-gray-300)')}`
                }}>
                  <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>[{log.agent || 'System'}]</span>
                  {log.message}
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-400)' }}>Awaiting logs...</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

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
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000', zIndex: 200 }}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: '450px',
              backgroundColor: '#FFFFFF', zIndex: 210, borderLeft: '1px solid #000000',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '20px', fontWeight: 600, color: '#000000' }}>
                <Terminal size={20} /> Analysis Activity
              </h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000000' }}><X size={24} /></button>
            </div>

            <div style={{ padding: '1.5rem', borderBottom: '1px solid #000000', backgroundColor: '#F5F5F5' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#404040', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Agent Stream
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sessionState?.active_agents?.length > 0 ? (
                  sessionState.active_agents.map((agent, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <Cpu size={18} style={{ marginTop: '0.125rem', color: '#000000' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#000000' }}>{agent.name}</div>
                        <div style={{ fontSize: '15px', color: '#404040' }}>{agent.action || agent.state}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '15px', color: '#404040' }}>No active agents.</div>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#000000', color: '#FFFFFF' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#A3A3A3', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Execution Stream
              </h4>
              {logs.map((log, idx) => (
                <div key={idx} className="font-mono" style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '0.5rem', color: log.level === 'error' ? '#ff8080' : (log.level === 'warn' ? '#ffd080' : '#D4D4D4') }}>
                  <span style={{ fontWeight: 600, marginRight: '0.5rem', color: '#FFFFFF' }}>[{log.agent || 'System'}]</span>
                  {log.message}
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ fontSize: '13px', color: '#A3A3A3', fontFamily: 'JetBrains Mono, monospace' }}>Awaiting logs...</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

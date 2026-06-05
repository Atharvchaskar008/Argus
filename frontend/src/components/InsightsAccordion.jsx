import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../context/RepoContext';

const AccordionItem = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '1rem', overflow: 'hidden' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: 'var(--color-bg)', border: 'none', cursor: 'pointer',
          fontSize: '1rem', fontWeight: 600, color: 'var(--color-fg)'
        }}
      >
        {title}
        {isOpen ? <ChevronUp size={20} color="var(--color-gray-500)" /> : <ChevronDown size={20} color="var(--color-gray-500)" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function InsightsAccordion() {
  const { sessionState } = useRepo();
  if (!sessionState) return null;

  const { summary, structure, maintainability } = sessionState;

  return (
    <div style={{ marginBottom: '3rem' }}>
      <AccordionItem title="Architecture Insights" defaultOpen={true}>
        <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '1rem' }}>{summary?.architecture}</p>
          {structure && (
            <div style={{ backgroundColor: 'var(--color-gray-100)', padding: '1rem', borderRadius: '4px' }}>
              <strong>Layout Pattern:</strong> {structure.layout_pattern}<br/>
              <strong>Top Directories:</strong> {structure.top_level_directories?.join(', ')}
            </div>
          )}
        </div>
      </AccordionItem>

      <AccordionItem title="Maintainability & Code Quality">
        <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {maintainability?.insights?.map((ins, i) => <li key={i}>{ins}</li>)}
          </ul>
        </div>
      </AccordionItem>
    </div>
  );
}

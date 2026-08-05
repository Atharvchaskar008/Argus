import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRepo } from '../context/RepoContext';
import Mermaid from './Mermaid';
import ReactMarkdown from 'react-markdown';

export default function ArchitectureDiagram() {
  const { sessionState } = useRepo();
  const [activeTab, setActiveTab] = useState('c4');
  const [activeSubTab, setActiveSubTab] = useState('level_1_context');
  
  if (!sessionState?.architecture_graph) {
    return null;
  }

  const { c4_models, flow_diagrams, markdown_summary } = sessionState.architecture_graph;

  const tabStyle = (isActive) => ({
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    borderBottom: isActive ? '2px solid #000000' : '2px solid transparent',
    color: isActive ? '#000000' : '#888888',
    fontWeight: isActive ? 600 : 400,
    fontSize: '16px',
    transition: 'all 0.2s',
  });

  const subTabStyle = (isActive) => ({
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    backgroundColor: isActive ? '#000000' : '#F5F5F5',
    color: isActive ? '#FFFFFF' : '#404040',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  });

  const renderContent = () => {
    if (activeTab === 'c4' && c4_models) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {Object.keys(c4_models).map(key => (
              <div 
                key={key} 
                style={subTabStyle(activeSubTab === key)}
                onClick={() => setActiveSubTab(key)}
              >
                {key.replace(/_/g, ' ').toUpperCase()}
              </div>
            ))}
          </div>
          <div style={{ border: '1px solid #E5E5E5', padding: '2rem', backgroundColor: '#FAFAFA' }}>
            {c4_models[activeSubTab] ? <Mermaid chart={c4_models[activeSubTab]} /> : <p>No diagram available.</p>}
          </div>
        </div>
      );
    }
    
    if (activeTab === 'flows' && flow_diagrams) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {Object.keys(flow_diagrams).map(key => (
              <div 
                key={key} 
                style={subTabStyle(activeSubTab === key)}
                onClick={() => setActiveSubTab(key)}
              >
                {key.replace(/_/g, ' ').toUpperCase()}
              </div>
            ))}
          </div>
          <div style={{ border: '1px solid #E5E5E5', padding: '2rem', backgroundColor: '#FAFAFA' }}>
            {flow_diagrams[activeSubTab] ? <Mermaid chart={flow_diagrams[activeSubTab]} /> : <p>No diagram available.</p>}
          </div>
        </div>
      );
    }
    
    if (activeTab === 'summary' && markdown_summary) {
      return (
        <div style={{ padding: '2rem', border: '1px solid #E5E5E5', backgroundColor: '#FAFAFA', width: '100%', lineHeight: '1.6' }}>
          <ReactMarkdown>{markdown_summary}</ReactMarkdown>
        </div>
      );
    }
    
    return <p>Data not available for this section.</p>;
  };

  return (
    <div id="architecture" style={{ padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <h3 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '2rem', color: '#000000' }}>System Architecture</h3>
      
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', width: '100%', borderBottom: '1px solid #E5E5E5' }}>
        <div style={tabStyle(activeTab === 'c4')} onClick={() => { setActiveTab('c4'); setActiveSubTab(Object.keys(c4_models || {})[0]); }}>
          C4 Models
        </div>
        <div style={tabStyle(activeTab === 'flows')} onClick={() => { setActiveTab('flows'); setActiveSubTab(Object.keys(flow_diagrams || {})[0]); }}>
          Flow Diagrams
        </div>
        <div style={tabStyle(activeTab === 'summary')} onClick={() => setActiveTab('summary')}>
          Architecture Summary
        </div>
      </div>
      
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ width: '100%' }}
      >
        {renderContent()}
      </motion.div>
    </div>
  );
}

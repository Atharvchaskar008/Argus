import React from 'react';
import { motion } from 'framer-motion';
import { Database, FileCode, Cpu, Shield, BrainCircuit, MessageSquareText } from 'lucide-react';

const flowItems = [
  { id: 'repo', icon: Database, label: 'Repository', desc: 'Source Code & History' },
  { id: 'parser', icon: FileCode, label: 'Repository Parser', desc: 'AST & Topology Extraction' },
  { id: 'engine', icon: Cpu, label: 'Analysis Engine', desc: 'Dependency & Security Scanners' },
  { id: 'intel', icon: Shield, label: 'Intelligence Layer', desc: 'Context Aggregation' },
  { id: 'llm', icon: BrainCircuit, label: 'LLM Provider', desc: 'Semantic Understanding' },
  { id: 'insights', icon: MessageSquareText, label: 'Insights & Answers', desc: 'Actionable Intelligence' },
];

export default function ArchitectureDiagram() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div style={{ padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h3 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '3rem', color: '#000000' }}>System Architecture</h3>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '600px' }}
      >
        {flowItems.map((item, index) => (
          <React.Fragment key={item.id}>
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.015 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%',
                padding: '1.5rem 2rem', border: '1px solid #000000', borderRadius: '0',
                backgroundColor: '#FFFFFF', cursor: 'default'
              }}
            >
              <div style={{ padding: '1rem', backgroundColor: '#F5F5F5', border: '1px solid #000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <item.icon size={24} color="#000000" />
              </div>
              <div>
                <h4 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '0.25rem' }}>{item.label}</h4>
                <p style={{ fontSize: '15px', color: '#404040', margin: 0 }}>{item.desc}</p>
              </div>
            </motion.div>
            
            {index < flowItems.length - 1 && (
              <motion.div 
                variants={itemVariants}
                style={{ height: '2rem', width: '1px', backgroundColor: '#000000' }}
              />
            )}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}

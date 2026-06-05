import React from 'react';
import { motion } from 'framer-motion';
import RepositoryOverview from './RepositoryOverview';
import ArchitectureDiagram from './ArchitectureDiagram';
import AskRepository from './AskRepository';

export default function Workspace() {
  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '6rem' }}>
      <RepositoryOverview />
      <ArchitectureDiagram />
      <AskRepository />
    </div>
  );
}

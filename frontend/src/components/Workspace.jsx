import React from 'react';
import RepositoryOverview from './RepositoryOverview';
import InsightsAccordion from './InsightsAccordion';
import AskRepository from './AskRepository';

export default function Workspace() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <RepositoryOverview />
      <AskRepository />
      <InsightsAccordion />
    </div>
  );
}

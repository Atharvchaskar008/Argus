import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { RepoProvider, useRepo } from './context/RepoContext';
import Layout from './components/Layout';
import LandingExperience from './components/LandingExperience';
import Workspace from './components/Workspace';

function AppContent() {
  const { session, sessionState } = useRepo();

  return (
    <Layout>
      {!session && !sessionState ? <LandingExperience /> : <Workspace />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <RepoProvider>
        <AppContent />
      </RepoProvider>
    </AuthProvider>
  );
}

export default App;

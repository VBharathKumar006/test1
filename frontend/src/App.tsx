import React, { useState } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { OverviewPage } from './pages/OverviewPage';
import { ChatPage } from './pages/ChatPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { UploadPage } from './pages/UploadPage';
import { ConflictsPage } from './pages/ConflictsPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('overview');

  return (
    <MainLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {currentTab === 'overview' && <OverviewPage onNavigate={(tab) => setCurrentTab(tab)} />}
      {currentTab === 'chat' && <ChatPage />}
      {currentTab === 'documents' && <DocumentsPage />}
      {currentTab === 'upload' && <UploadPage onUploadSuccess={() => setCurrentTab('documents')} />}
      {currentTab === 'conflicts' && <ConflictsPage />}
      {currentTab === 'evaluation' && <EvaluationPage />}
      {currentTab === 'settings' && <SettingsPage />}
    </MainLayout>
  );
};

export default App;


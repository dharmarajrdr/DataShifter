import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BeetelAgentHeader, BeetelSessionSidebar, BeetelChatCanvas, BeetelSchemaDiffModal } from '../components/ai';
import { SAMPLE_AGENT_SESSIONS } from '../components/ai/beetelSampleData';
import { useNotification } from '../contexts/NotificationContext';
import { aiApi } from '../services/aiApi';

const BeetelAgentPage = () => {
  const navigate = useNavigate();
  const notification = useNotification();
  const [sessions, setSessions] = useState(SAMPLE_AGENT_SESSIONS);
  const [selectedSessionId, setSelectedSessionId] = useState(SAMPLE_AGENT_SESSIONS[0].id);
  const [selectedProvider, setSelectedProvider] = useState('Anthropic Claude 3.5 Sonnet');
  const [showDiffModal, setShowDiffModal] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const res = await aiApi.listSessions();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      if (list.length > 0) {
        setSessions(list.map((s, idx) => ({ ...SAMPLE_AGENT_SESSIONS[idx % SAMPLE_AGENT_SESSIONS.length], ...s })));
        setSelectedSessionId(list[0].id);
      }
    } catch { /* use default sample sessions */ }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const activeSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  const handleNewSession = () => {
    const newId = `sess-${Date.now()}`;
    const newSess = {
      id: newId,
      title: 'New Natural Language Query',
      preview: 'Awaiting your instructions...',
      headerTitle: 'New Architecture Exploration',
      userMessage: '',
      agentMessage: 'Hello! I am Beetel, your DataShifter autonomous copilot. Tell me what pipeline, CDC sync, or UDF transformation you would like to build.',
      spec: null,
    };
    setSessions([newSess, ...sessions]);
    setSelectedSessionId(newId);
    notification.info('New Beetel session started');
  };

  const handleDeployPipeline = () => {
    notification.success(`Pipeline "${activeSession?.title}" deployed to production cluster successfully.`);
  };

  const handleSendMessage = (msg) => {
    const updated = {
      ...activeSession,
      userMessage: msg,
      agentMessage: `Analyzing requirement: "${msg}". Synthesized schema transformations and verified DAG dependencies.`,
    };
    setSessions(prev => prev.map(s => s.id === activeSession.id ? updated : s));
    notification.info('Beetel Agent analyzed request');
  };

  return (
    <div id="beetel-agent-page" className="ds-beetel-agent-page max-w-7xl mx-auto pb-8 flex flex-col gap-4">
      <BeetelAgentHeader
        engineLabel={selectedProvider.replace('Anthropic ', '').replace('OpenAI ', '').replace('Google ', '')}
        onNewSession={handleNewSession}
        onConfigureKeys={() => navigate('/settings')}
      />
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <BeetelSessionSidebar
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
          onSelectSession={setSelectedSessionId}
        />
        <BeetelChatCanvas
          session={activeSession}
          onOpenSchemaDiff={() => setShowDiffModal(true)}
          onDeployPipeline={handleDeployPipeline}
          onSendMessage={handleSendMessage}
        />
      </div>
      <BeetelSchemaDiffModal
        isOpen={showDiffModal}
        sessionTitle={activeSession?.title}
        onClose={() => setShowDiffModal(false)}
      />
    </div>
  );
};

export default BeetelAgentPage;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { BeetelAgentHeader, BeetelSessionSidebar, BeetelChatWorkspace } from '../components/ai';
import { ErrorPage } from './ErrorPage';
import { aiApi } from '../services/aiApi';

const BeetelAgentPage = () => {
  const [searchParams] = useSearchParams();
  const { sessionId: routeSessionId } = useParams();
  const navigate = useNavigate();
  const hasAutoSelectedRef = useRef(false);

  const initialContextType = searchParams.get('contextType') || 'NONE';
  const initialContextEntityId = searchParams.get('entityId') || '';
  const initialContextEntityName = searchParams.get('entityName') || '';

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(routeSessionId || null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    setSelectedSessionId(routeSessionId || null);
    setAccessDenied(false);
  }, [routeSessionId]);

  const fetchOverview = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const [sessRes, keyRes] = await Promise.all([aiApi.listSessions(), aiApi.getKeyPoolStatus()]);
      const list = sessRes.data || [];
      setSessions(list);
      setKeyStatus(keyRes.data || null);
      if (list.length > 0 && !routeSessionId && !hasAutoSelectedRef.current && initialContextType === 'NONE') {
        hasAutoSelectedRef.current = true;
        setSelectedSessionId(list[0].id);
        navigate(`/beetel/${list[0].id}`, { replace: true });
      }
    } catch { /* ignore */ }
    finally { setLoadingSessions(false); }
  }, [routeSessionId, initialContextType, navigate]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const handleNewChat = () => {
    hasAutoSelectedRef.current = true;
    setAccessDenied(false);
    setSelectedSessionId(null);
    navigate('/beetel');
  };

  const handleSessionCreated = (newSession) => {
    if (!newSession) return;
    hasAutoSelectedRef.current = true;
    setAccessDenied(false);
    setSelectedSessionId(newSession.id);
    if (routeSessionId !== newSession.id) navigate(`/beetel/${newSession.id}`, { replace: true });
    setSessions(prev => {
      const exists = prev.some(s => s.id === newSession.id);
      return exists ? prev.map(s => s.id === newSession.id ? newSession : s) : [newSession, ...prev];
    });
  };

  if (accessDenied) return <ErrorPage status={403} />;

  return (
    <div id="beetel-agent-page" className="ds-beetel-agent-page flex flex-col h-[calc(100vh-64px)]">
      <BeetelAgentHeader keyStatus={keyStatus} onNewChat={handleNewChat} onConfigureKeys={() => navigate('/profile')} />
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 flex-1 min-h-0">
        <BeetelSessionSidebar sessions={sessions} selectedSessionId={selectedSessionId} loading={loadingSessions} onSelectSession={(id) => { hasAutoSelectedRef.current = true; setSelectedSessionId(id); navigate(`/beetel/${id}`); }} />
        <BeetelChatWorkspace sessionId={selectedSessionId} onSessionCreated={handleSessionCreated} onAccessDenied={() => setAccessDenied(true)} initialContextType={initialContextType} initialContextEntityId={initialContextEntityId} initialContextEntityName={initialContextEntityName} />
      </div>
    </div>
  );
};

export default BeetelAgentPage;

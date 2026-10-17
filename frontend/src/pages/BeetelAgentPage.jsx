import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BeetelAgentHeader, BeetelChatCanvas, BeetelSessionSidebar, BeetelShareModal } from '../components/ai';
import { useNotification } from '../contexts/NotificationContext';
import { aiApi } from '../services/aiApi';

const BeetelAgentPage = () => {
  const { sessionId } = useParams(), navigate = useNavigate(), notification = useNotification();
  const [sessions, setSessions] = useState([]), [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]), [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false), [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false), [showShareModal, setShowShareModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('Anthropic Claude 3.5 Sonnet');

  const loadSessions = useCallback(async () => {
    try {
      const res = await aiApi.listSessions();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setSessions(list);
      if (list.length > 0 && !sessionId) navigate(`/beetel/${list[0].id}`, { replace: true });
    } catch (e) { notification.error(e?.message || 'Failed to load AI sessions'); }
  }, [sessionId, navigate, notification]);
  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (!sessionId) {
      if (sessions.length > 0) navigate(`/beetel/${sessions[0].id}`, { replace: true });
      else { setActiveSession(null); setMessages([]); }
      return;
    }
    setLoading(true);
    aiApi.getSession(sessionId).then(res => {
      const s = res?.data || res;
      setActiveSession(s); setMessages(s?.messages || []);
      setHasMore(Boolean(s?.hasMoreMessages ?? (s?.messages?.length >= 15)));
    }).catch(e => notification.error(e?.message || 'Failed to load conversation')).finally(() => setLoading(false));
  }, [sessionId, sessions, navigate, notification]);

  const handleLoadOlder = useCallback(async () => {
    const oldest = messages.find(m => m.id && !String(m.id).startsWith('u-'));
    if (!sessionId || !oldest || !hasMore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const d = (await aiApi.getSessionMessages(sessionId, { beforeMessageId: oldest.id, limit: 15 }))?.data || {};
      setHasMore(Boolean(d?.hasMoreMessages));
      const b = Array.isArray(d?.messages) ? d.messages : (Array.isArray(d) ? d : []);
      if (b.length) setMessages(p => [...b.filter(m => !p.some(x => x.id === m.id)), ...p]);
    } catch {} finally { setLoadingOlder(false); }
  }, [sessionId, messages, hasMore, loadingOlder]);

  const handleNewSession = async () => {
    try {
      const s = (await aiApi.createSession({ title: 'New Conversation' }))?.data || {};
      setSessions(p => [s, ...p]); navigate(`/beetel/${s.id}`); notification.info('New Beetel session started');
    } catch (e) { notification.error(e?.message || 'Failed to create session'); }
  };

  const handleSendMessage = async (msg) => {
    let sid = sessionId;
    if (!sid) {
      try {
        const s = (await aiApi.createSession({ title: msg.slice(0, 32) }))?.data || {};
        sid = s.id; setSessions(p => [s, ...p]); navigate(`/beetel/${sid}`);
      } catch { notification.error('Could not initiate session'); return; }
    }
    setMessages(p => [...p, { id: 'u-' + Date.now(), role: 'USER', content: msg }]);
    setSending(true);
    try {
      const ast = (await aiApi.sendMessage({ sessionId: sid, message: msg }))?.data;
      if (ast) setMessages(p => [...p, ast]);
      setSessions(p => p.map(s => s.id === sid ? { ...s, preview: msg } : s));
    } catch (e) { notification.error(e?.message || 'AI synthesis failed'); }
    finally { setSending(false); }
  };

  const handlePlanDecision = async (planId, approve) => {
    try {
      const upd = (approve ? await aiApi.confirmPlan(planId) : await aiApi.rejectPlan(planId))?.data;
      setMessages(p => p.map(m => m.plan?.id === planId ? { ...m, plan: upd?.plan || { ...m.plan, status: approve ? 'COMPLETED' : 'REJECTED' } } : m));
      notification.success(approve ? 'Plan approved & executed' : 'Plan rejected');
    } catch (e) { notification.error(e?.message || 'Plan decision failed'); }
  };

  return (
    <div id="beetel-agent-page" className="ds-beetel-agent-page w-full max-w-7xl mx-auto h-[calc(100vh-7rem)] min-h-[550px] flex flex-col gap-4">
      <BeetelAgentHeader className="shrink-0" engineLabel={selectedProvider.replace('Anthropic ', '').replace('OpenAI ', '').replace('Google ', '')} onNewSession={handleNewSession} onConfigureKeys={() => navigate('/settings/api-keys')} />
      <div className="w-full flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <BeetelSessionSidebar sessions={sessions} selectedSessionId={sessionId} selectedProvider={selectedProvider} onProviderChange={setSelectedProvider} onSelectSession={(id) => navigate(`/beetel/${id}`)} />
        <BeetelChatCanvas session={activeSession} messages={messages} loading={loading} sending={sending} hasMore={hasMore} loadingOlder={loadingOlder} onLoadOlder={handleLoadOlder} onShareClick={() => setShowShareModal(true)} onConfirmPlan={(id) => handlePlanDecision(id, true)} onRejectPlan={(id) => handlePlanDecision(id, false)} onSendMessage={handleSendMessage} />
      </div>
      <BeetelShareModal isOpen={showShareModal} session={activeSession} onClose={() => setShowShareModal(false)} onSessionUpdated={(upd) => { setActiveSession(upd); setSessions(p => p.map(s => s.id === upd.id ? upd : s)); }} />
    </div>
  );
};

export default BeetelAgentPage;

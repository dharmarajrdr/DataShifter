import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../constants/design';
import { FRSC, FRBC } from '../constants/layouts';
import { AGENT } from '../constants/literals';
import { PageHeader, Button } from '../components/common';
import { BeetelIcon } from '../components/layout/Icons';
import BeetelChatWorkspace from '../components/ai/BeetelChatWorkspace';
import { ErrorPage } from './ErrorPage';
import { aiApi } from '../services/aiApi';

const POOL_LABELS = {
  USER: { label: 'Using Personal API Keys', bg: '#E1F5EE', text: '#0F6E56' },
  ORG: { label: 'Using Organization API Keys', bg: '#E6F1FB', text: '#185FA5' },
  SYSTEM: { label: 'Using System Groq Pool', bg: COLORS.accent.purpleLight, text: COLORS.accent.purpleText },
  OLLAMA_FALLBACK: { label: 'Using Local Ollama Fallback', bg: '#FAEEDA', text: '#854F0B' },
};

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
      const [sessRes, keyRes] = await Promise.all([
        aiApi.listSessions(),
        aiApi.getKeyPoolStatus(),
      ]);
      const list = sessRes.data || [];
      setSessions(list);
      setKeyStatus(keyRes.data || null);
      if (
        list.length > 0 &&
        !routeSessionId &&
        !hasAutoSelectedRef.current &&
        initialContextType === 'NONE'
      ) {
        hasAutoSelectedRef.current = true;
        setSelectedSessionId(list[0].id);
        navigate(`/beetel/${list[0].id}`, { replace: true });
      }
    } catch {
      // ignore initial load error
    } finally {
      setLoadingSessions(false);
    }
  }, [routeSessionId, initialContextType, navigate]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

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
    if (routeSessionId !== newSession.id) {
      navigate(`/beetel/${newSession.id}`, { replace: true });
    }
    setSessions(prev => {
      const exists = prev.some(s => s.id === newSession.id);
      if (exists) {
        return prev.map(s => (s.id === newSession.id ? newSession : s));
      }
      return [newSession, ...prev];
    });
  };

  const poolBadge = POOL_LABELS[keyStatus?.activePool] || POOL_LABELS.SYSTEM;

  if (accessDenied) {
    return <ErrorPage status={403} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <PageHeader
        title={AGENT.title}
        subtitle={AGENT.subtitle}
        actions={
          <div style={{ ...FRSC, gap: SPACING.sm }}>
            <div
              onClick={() => navigate('/profile')}
              title="Click to configure your personal LLM API keys"
              style={{
                ...FRSC,
                gap: '6px',
                padding: '5px 10px',
                borderRadius: BORDER_RADIUS.full,
                background: poolBadge.bg,
                color: poolBadge.text,
                fontSize: FONT.size.xs,
                fontWeight: FONT.weight.medium,
                cursor: 'pointer',
              }}
            >
              <BeetelIcon color={poolBadge.text} size={13} />
              <span>{poolBadge.label}</span>
            </div>
            <Button size="sm" onClick={handleNewChat}>
              {AGENT.newChat}
            </Button>
          </div>
        }
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: SPACING.md,
        flex: 1,
        minHeight: 0,
      }}>
        {/* Left Sidebar: Session History */}
        <div style={{
          border: `1px solid ${COLORS.border.light}`,
          borderRadius: BORDER_RADIUS.lg,
          background: COLORS.background.primary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            ...FRBC,
            padding: `${SPACING.sm} ${SPACING.md}`,
            borderBottom: `1px solid ${COLORS.border.light}`,
            background: COLORS.background.secondary,
          }}>
            <span style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold, color: COLORS.text.secondary, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Conversations
            </span>
            <span style={{ fontSize: '11px', color: COLORS.text.tertiary }}>
              {sessions.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: SPACING.xs }}>
            {loadingSessions ? (
              <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, padding: SPACING.sm }}>
                Loading conversations...
              </p>
            ) : sessions.length === 0 ? (
              <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, padding: SPACING.sm, textAlign: 'center' }}>
                No conversations yet. Start chatting or upload a <code>.md</code> spec!
              </p>
            ) : (
              sessions.map(sess => {
                const active = sess.id === selectedSessionId;
                const isShared = Boolean(sess.isShared || sess.shared || (sess.sharedMembers && sess.sharedMembers.length > 0));
                const memberCount = 1 + (sess.sharedMembers?.length || 0);
                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      hasAutoSelectedRef.current = true;
                      setSelectedSessionId(sess.id);
                      navigate(`/beetel/${sess.id}`);
                    }}
                    style={{
                      ...FRBC,
                      gap: SPACING.xs,
                      padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: BORDER_RADIUS.md,
                      marginBottom: '3px',
                      cursor: 'pointer',
                      background: active ? COLORS.accent.purpleLight : 'transparent',
                      color: active ? COLORS.accent.purpleText : COLORS.text.primary,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ ...FRSC, gap: '5px' }}>
                        <p style={{
                          fontSize: FONT.size.xs,
                          fontWeight: active ? FONT.weight.semibold : FONT.weight.medium,
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                        }}>
                          {sess.title || 'New Conversation'}
                        </p>
                        {isShared && (
                          <span
                            title="Shared conversation"
                            style={{
                              ...FRSC,
                              gap: '4px',
                              fontSize: '9px',
                              fontWeight: FONT.weight.semibold,
                              padding: '1px 6px',
                              borderRadius: BORDER_RADIUS.full,
                              background: '#E1F5EE',
                              color: '#0F6E56',
                              flexShrink: 0,
                            }}
                          >
                            <i className="fa-solid fa-users" style={{ fontSize: '8px' }} />
                            <span>{memberCount}</span>
                          </span>
                        )}
                      </div>
                      {sess.contextType && sess.contextType !== 'NONE' && (
                        <span style={{
                          display: 'inline-block',
                          fontSize: '10px',
                          color: COLORS.text.secondary,
                          marginTop: '2px',
                        }}>
                          {sess.contextType}: {sess.contextEntityName || sess.contextEntityId}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat Workspace */}
        <BeetelChatWorkspace
          sessionId={selectedSessionId}
          onSessionCreated={handleSessionCreated}
          onAccessDenied={() => setAccessDenied(true)}
          initialContextType={initialContextType}
          initialContextEntityId={initialContextEntityId}
          initialContextEntityName={initialContextEntityName}
        />
      </div>
    </div>
  );
};

export default BeetelAgentPage;

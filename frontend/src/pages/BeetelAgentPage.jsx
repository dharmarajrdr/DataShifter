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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', gap: SPACING.md }}>
      {/* Premium Hero Header Banner */}
      <div style={{
        ...FRBC,
        flexWrap: 'wrap',
        gap: SPACING.md,
        padding: `${SPACING.md} ${SPACING.lg}`,
        borderRadius: BORDER_RADIUS.lg,
        background: 'linear-gradient(135deg, #261F5E 0%, #4A3FB0 52%, #197A6B 100%)',
        boxShadow: '0 8px 24px rgba(59, 48, 145, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle decorative radial glow */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '140px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ ...FRSC, gap: SPACING.md, zIndex: 1 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.14)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BeetelIcon color="#FFFFFF" size={22} />
          </div>
          <div>
            <div style={{ ...FRSC, gap: '8px', marginBottom: '2px' }}>
              <h1 style={{
                margin: 0,
                fontSize: FONT.size.xl,
                fontWeight: FONT.weight.semibold,
                color: '#FFFFFF',
                letterSpacing: '-0.2px',
              }}>
                {AGENT.title}
              </h1>
              <span style={{
                ...FRSC,
                gap: '5px',
                padding: '2px 8px',
                borderRadius: BORDER_RADIUS.pill,
                background: 'rgba(29, 158, 117, 0.28)',
                border: '1px solid rgba(159, 225, 203, 0.45)',
                color: '#D2F7E9',
                fontSize: '10px',
                fontWeight: FONT.weight.semibold,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#4ADE80',
                  boxShadow: '0 0 6px #4ADE80',
                }} />
                Agentic Copilot
              </span>
            </div>
            <p style={{
              margin: 0,
              fontSize: FONT.size.sm,
              color: 'rgba(255, 255, 255, 0.82)',
            }}>
              {AGENT.subtitle}
            </p>
          </div>
        </div>

        <div style={{ ...FRSC, gap: SPACING.sm, zIndex: 1 }}>
          <div
            onClick={() => navigate('/profile')}
            title="Click to configure your personal LLM API keys"
            style={{
              ...FRSC,
              gap: '7px',
              padding: '6px 12px',
              borderRadius: BORDER_RADIUS.pill,
              background: 'rgba(255, 255, 255, 0.13)',
              border: '1px solid rgba(255, 255, 255, 0.24)',
              color: '#FFFFFF',
              fontSize: FONT.size.xs,
              fontWeight: FONT.weight.medium,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
            }}
          >
            <i className="fa-solid fa-key" style={{ fontSize: '11px', color: '#A7F3D0' }} />
            <span>{poolBadge.label}</span>
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            style={{
              ...FRSC,
              gap: '6px',
              padding: '7px 14px',
              borderRadius: BORDER_RADIUS.md,
              border: '1px solid rgba(255, 255, 255, 0.9)',
              background: '#FFFFFF',
              color: '#3C3489',
              fontSize: FONT.size.sm,
              fontWeight: FONT.weight.semibold,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.16)',
            }}
          >
            <i className="fa-solid fa-plus" style={{ fontSize: '11px' }} />
            <span>{AGENT.newChat}</span>
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '268px 1fr',
        gap: SPACING.md,
        flex: 1,
        minHeight: 0,
      }}>
        {/* Left Sidebar: Session History */}
        <div style={{
          border: '1px solid #DFDDF7',
          borderRadius: BORDER_RADIUS.lg,
          background: COLORS.background.primary,
          boxShadow: '0 4px 16px rgba(83, 74, 183, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            ...FRBC,
            padding: '11px 14px',
            background: 'linear-gradient(135deg, #352C7E 0%, #534AB7 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
          }}>
            <div style={{ ...FRSC, gap: '8px' }}>
              <span style={{
                width: 22,
                height: 22,
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.16)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <i className="fa-solid fa-comments" style={{ fontSize: '11px', color: '#E0E7FF' }} />
              </span>
              <span style={{
                fontSize: FONT.size.xs,
                fontWeight: FONT.weight.semibold,
                color: '#FFFFFF',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}>
                Conversations
              </span>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: FONT.weight.semibold,
              padding: '2px 8px',
              borderRadius: BORDER_RADIUS.pill,
              background: 'rgba(255, 255, 255, 0.18)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.24)',
            }}>
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
                      padding: '9px 11px',
                      borderRadius: BORDER_RADIUS.md,
                      marginBottom: '4px',
                      cursor: 'pointer',
                      background: active
                        ? 'linear-gradient(135deg, #F3F2FF 0%, #EEEDFE 100%)'
                        : 'transparent',
                      border: active
                        ? '1px solid #C8C4F5'
                        : '1px solid transparent',
                      boxShadow: active ? '0 2px 6px rgba(83, 74, 183, 0.08)' : 'none',
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

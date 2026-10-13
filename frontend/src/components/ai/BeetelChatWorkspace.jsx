import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import { FRSC, FRBC } from '../../constants/layouts';
import { AGENT } from '../../constants/literals';
import { Button, BarLoader, SpinnerLoader, SkeletonLoader } from '../common';
import { BeetelIcon } from '../layout/Icons';
import { useAuth } from '../../contexts/AuthContext';
import { aiApi } from '../../services/aiApi';
import { pipelineApi, workflowApi, connectionApi, udfApi } from '../../services/api';
import BeetelMarkdownRenderer from './BeetelMarkdownRenderer';
import { ErrorPage } from '../../pages/ErrorPage';

const SAMPLE_MD_SPEC = `# Orders & Customers Migration Specification

## Goal
Create a data migration pipeline and workflow for migrating e-commerce Orders and Customers from Oracle Production to Cloud Spanner.

## Source & Target Connections
- **Source Connection**: Oracle production
- **Target Connection**: Spanner US-East

## Tables & Write Modes
1. \`ORA_CUSTOMERS\` -> \`spn_customers\` (Write Mode: \`UPSERT\`)
2. \`ORA_ORDERS\` -> \`spn_orders\` (Write Mode: \`UPSERT\`)

## Column Transformations
- Trim whitespace on \`NOTES\`
- Convert \`ORDER_DATE\` to \`yyyy-MM-dd\`
- Chunk size: \`10000\`, ignore exceptions: \`true\`
`;

const PLAN_STATUS_STYLES = {
  PENDING_CONFIRMATION: { bg: '#FAEEDA', text: '#854F0B', border: '#F0D090', label: 'Awaiting Confirmation' },
  APPROVED: { bg: '#E6F1FB', text: '#185FA5', border: '#B5D4F4', label: 'Approved' },
  EXECUTING: { bg: '#E6F1FB', text: '#185FA5', border: '#B5D4F4', label: 'Executing...' },
  COMPLETED: { bg: '#E1F5EE', text: '#0F6E56', border: '#9FE1CB', label: 'Executed Successfully' },
  REJECTED: { bg: '#F1EFE8', text: '#5F5E5A', border: '#D3D1C7', label: 'Cancelled' },
  FAILED: { bg: '#FCEBEB', text: '#A32D2D', border: '#F7C1C1', label: 'Execution Failed' },
};

const PlanConfirmationCard = ({ plan, onConfirm, onReject, busyPlanId }) => {
  if (!plan) return null;
  const style = PLAN_STATUS_STYLES[plan.status] || PLAN_STATUS_STYLES.PENDING_CONFIRMATION;
  const isBusy = busyPlanId === plan.id;

  return (
    <div style={{
      marginTop: SPACING.sm,
      border: `1px solid ${style.border}`,
      borderRadius: BORDER_RADIUS.lg,
      background: '#fff',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      {/* Card Header */}
      <div style={{
        ...FRBC,
        padding: `${SPACING.sm} ${SPACING.md}`,
        background: style.bg,
        borderBottom: `1px solid ${style.border}`,
      }}>
        <div style={{ ...FRSC, gap: SPACING.xs }}>
          <BeetelIcon color={style.text} size={15} />
          <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: style.text }}>
            {plan.title || `${AGENT.name} Execution Plan`}
          </span>
        </div>
        <span style={{
          fontSize: '10px',
          fontWeight: FONT.weight.semibold,
          padding: '2px 8px',
          borderRadius: BORDER_RADIUS.full,
          background: '#fff',
          color: style.text,
          border: `1px solid ${style.border}`,
        }}>
          {isBusy ? 'Executing...' : style.label}
        </span>
      </div>
      {isBusy && <BarLoader />}

      {/* Summary */}
      <div style={{ padding: SPACING.md }}>
        {plan.summary && (
          <div style={{ margin: `0 0 ${SPACING.sm} 0`, color: COLORS.text.primary }}>
            <BeetelMarkdownRenderer content={plan.summary} />
          </div>
        )}

        {/* Steps List */}
        {Array.isArray(plan.steps) && plan.steps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: SPACING.sm }}>
            <p style={{
              fontSize: '11px',
              fontWeight: FONT.weight.semibold,
              color: COLORS.text.tertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              margin: 0,
            }}>
              Execution Steps ({plan.steps.length})
            </p>
            {plan.steps.map((step, idx) => {
              const stepDone = step.status === 'COMPLETED';
              const stepFailed = step.status === 'FAILED';
              return (
                <div
                  key={idx}
                  style={{
                    padding: `${SPACING.xs} ${SPACING.sm}`,
                    borderRadius: BORDER_RADIUS.md,
                    background: COLORS.background.secondary,
                    border: `1px solid ${COLORS.border.light}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: SPACING.xs,
                  }}
                >
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: stepDone ? '#0F6E56' : stepFailed ? '#A32D2D' : COLORS.accent.purpleLight,
                    color: stepDone || stepFailed ? '#fff' : COLORS.accent.purpleText,
                    fontSize: '11px',
                    fontWeight: FONT.weight.semibold,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}>
                    {stepDone ? (
                      <i className="fa-solid fa-check" style={{ fontSize: '10px' }} />
                    ) : stepFailed ? (
                      <i className="fa-solid fa-exclamation" style={{ fontSize: '10px' }} />
                    ) : (
                      step.stepNumber || idx + 1
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...FRBC, gap: SPACING.xs }}>
                      <span style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium, color: COLORS.text.primary }}>
                        {step.title}
                      </span>
                      {step.toolName && (
                        <code style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: BORDER_RADIUS.sm,
                          background: '#fff',
                          color: COLORS.accent.purpleText,
                          border: `1px solid ${COLORS.border.light}`,
                        }}>
                          {step.toolName}
                        </code>
                      )}
                    </div>
                    {step.description && (
                      <div style={{ fontSize: '11px', color: COLORS.text.secondary, margin: '2px 0 0 0' }}>
                        <BeetelMarkdownRenderer content={step.description} />
                      </div>
                    )}
                    {step.output && (
                      <p style={{
                        fontSize: '11px',
                        color: stepFailed ? '#A32D2D' : '#0F6E56',
                        margin: '4px 0 0 0',
                        fontFamily: FONT.mono,
                      }}>
                        {step.output}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Execution result or error */}
        {plan.executionResult && (
          <div style={{
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.md,
            background: '#E1F5EE',
            color: '#0F6E56',
            fontSize: FONT.size.xs,
            marginBottom: SPACING.xs,
          }}>
            {plan.executionResult}
          </div>
        )}
        {plan.errorMessage && (
          <div style={{
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.md,
            background: '#FCEBEB',
            color: '#A32D2D',
            fontSize: FONT.size.xs,
            marginBottom: SPACING.xs,
          }}>
            {plan.errorMessage}
          </div>
        )}

        {/* Confirm / Reject buttons */}
        {plan.status === 'PENDING_CONFIRMATION' && (
          <div style={{
            ...FRSC,
            justifyContent: 'flex-end',
            gap: SPACING.xs,
            paddingTop: SPACING.xs,
            borderTop: `1px solid ${COLORS.border.light}`,
          }}>
            <Button
              size="sm"
              variant="secondary"
              disabled={isBusy}
              onClick={() => onReject(plan.id)}
            >
              Reject Plan
            </Button>
            <Button
              size="sm"
              disabled={isBusy}
              onClick={() => onConfirm(plan.id)}
            >
              {isBusy ? 'Executing...' : 'Approve & Execute Plan'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const parseLlmErrorDetails = (rawText) => {
  const raw = String(rawText || 'Unknown error');
  const attemptsPrefix = 'All configured LLM keys/providers failed. Attempts:';
  const hasAttempts = raw.includes(attemptsPrefix);

  const parseSingleAttempt = (segment) => {
    const trimmed = segment.trim();
    const colonIdx = trimmed.indexOf(':');
    let providerLabel = 'LLM Provider';
    let rest = trimmed;
    if (colonIdx > 0 && colonIdx < 48) {
      providerLabel = trimmed.slice(0, colonIdx).trim();
      rest = trimmed.slice(colonIdx + 1).trim();
    }

    let statusCode = null;
    const statusMatch = rest.match(/^(\d{3})\s*-\s*([\s\S]*)$/);
    if (statusMatch) {
      statusCode = statusMatch[1];
      rest = statusMatch[2].trim();
    }

    let cleanMessage = rest;
    let errorCode = null;
    let errorType = null;

    // Extract JSON message even if the JSON string was truncated
    if (rest.startsWith('{')) {
      try {
        const parsed = JSON.parse(rest);
        const errObj = parsed?.error || parsed;
        if (errObj?.message) cleanMessage = errObj.message;
        if (errObj?.code) errorCode = errObj.code;
        if (errObj?.type) errorType = errObj.type;
      } catch {
        const msgMatch = rest.match(/"message"\s*:\s*"([^"]+)/);
        const codeMatch = rest.match(/"code"\s*:\s*"([^"]+)/);
        const typeMatch = rest.match(/"type"\s*:\s*"([^"]+)/);
        if (msgMatch) cleanMessage = msgMatch[1];
        if (codeMatch) errorCode = codeMatch[1];
        if (typeMatch) errorType = typeMatch[1];
      }
    }

    let badgeLabel = statusCode ? `HTTP ${statusCode}` : 'Failed';
    if (statusCode === '429' || errorCode === 'rate_limit_exceeded') {
      badgeLabel = statusCode === '413' ? 'Token Limit (413)' : 'Rate Limit (429)';
    } else if (statusCode === '413' || cleanMessage.toLowerCase().includes('request too large')) {
      badgeLabel = 'Request Too Large (413)';
    } else if (statusCode === '401' || statusCode === '403') {
      badgeLabel = 'Auth Error';
    } else if (statusCode === '404') {
      badgeLabel = 'Model Not Found (404)';
    } else if (cleanMessage.toLowerCase().includes('not reachable')) {
      badgeLabel = 'Offline';
    }

    return {
      providerLabel,
      statusCode,
      badgeLabel,
      message: cleanMessage,
      errorCode,
      errorType,
    };
  };

  if (hasAttempts) {
    const afterPrefix = raw.slice(raw.indexOf(attemptsPrefix) + attemptsPrefix.length).trim();
    const segments = afterPrefix.split(/\s+\|\s+/).filter(Boolean);
    return {
      title: 'All configured LLM providers failed to respond',
      attempts: segments.map(parseSingleAttempt),
      raw,
    };
  }

  return {
    title: 'Request could not be completed',
    attempts: [parseSingleAttempt(raw)],
    raw,
  };
};

const BeetelErrorCard = ({ content, onRetry, sending }) => {
  const [showRaw, setShowRaw] = useState(false);
  const parsed = parseLlmErrorDetails(content);

  return (
    <div style={{
      border: '1px solid #F5B7B1',
      borderRadius: BORDER_RADIUS.lg,
      background: '#FFF8F8',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(163, 45, 45, 0.06)',
    }}>
      {/* Error Header */}
      <div style={{
        ...FRBC,
        gap: SPACING.xs,
        padding: `8px ${SPACING.md}`,
        background: '#FCEBEB',
        borderBottom: '1px solid #F5B7B1',
      }}>
        <div style={{ ...FRSC, gap: '6px' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ color: '#A32D2D', fontSize: '14px' }} />
          <span style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold, color: '#791F1F' }}>
            {parsed.title}
          </span>
        </div>

        {onRetry && (
          <button
            type="button"
            disabled={sending}
            onClick={onRetry}
            style={{
              ...FRSC,
              gap: '5px',
              padding: '3px 10px',
              borderRadius: BORDER_RADIUS.full,
              border: '1px solid #D98880',
              background: '#fff',
              color: '#791F1F',
              fontSize: '11px',
              fontWeight: FONT.weight.semibold,
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.6 : 1,
            }}
          >
            <i className="fa-solid fa-rotate-right" style={{ fontSize: '10px' }} />
            <span>Retry</span>
          </button>
        )}
      </div>

      {/* Parsed Provider Attempts */}
      <div style={{ padding: SPACING.sm, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {parsed.attempts.map((att, idx) => (
          <div
            key={idx}
            style={{
              padding: `6px ${SPACING.sm}`,
              borderRadius: BORDER_RADIUS.md,
              background: '#fff',
              border: '1px solid #F7C1C1',
            }}
          >
            <div style={{ ...FRBC, gap: SPACING.xs, marginBottom: '3px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
                {att.providerLabel}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: FONT.weight.semibold,
                padding: '1px 7px',
                borderRadius: BORDER_RADIUS.full,
                background: '#FCEBEB',
                color: '#A32D2D',
                border: '1px solid #F5B7B1',
              }}>
                {att.badgeLabel}
              </span>
            </div>
            <p style={{
              margin: 0,
              fontSize: FONT.size.xs,
              color: COLORS.text.secondary,
              lineHeight: 1.45,
              wordBreak: 'break-word',
            }}>
              {att.message}
            </p>
          </div>
        ))}

        {/* Footer controls */}
        <div style={{ ...FRBC, paddingTop: '2px' }}>
          <span style={{ fontSize: '11px', color: '#8A3B3B' }}>
            Tip: Switch Model to Local Ollama or retry in a few seconds.
          </span>
          <button
            type="button"
            onClick={() => setShowRaw(prev => !prev)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#791F1F',
              fontSize: '11px',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {showRaw ? 'Hide technical details' : 'Technical details'}
          </button>
        </div>

        {showRaw && (
          <pre style={{
            margin: '4px 0 0 0',
            padding: '8px',
            borderRadius: BORDER_RADIUS.sm,
            background: '#2D1B1B',
            color: '#FADBD8',
            fontSize: '10px',
            fontFamily: FONT.mono,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {parsed.raw}
          </pre>
        )}
      </div>
    </div>
  );
};

const deriveInitialsFromName = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const UserAvatar = ({ initials, name, color, size = 30, style = {} }) => {
  const displayInitials = initials || deriveInitialsFromName(name);
  return (
    <div
      title={name || 'Organization Member'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color || COLORS.brand.primary,
        color: '#fff',
        fontSize: Math.max(10, Math.round(size * 0.38)),
        fontWeight: FONT.weight.semibold,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        userSelect: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        ...style,
      }}
    >
      {displayInitials}
    </div>
  );
};

const BeetelAvatar = ({ size = 30, isSystem = false }) => (
  <div
    title={isSystem ? `${AGENT.name} Executor` : AGENT.name}
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: isSystem ? '#E1F5EE' : COLORS.accent.purpleLight,
      border: `1px solid ${isSystem ? '#9FE1CB' : COLORS.border.light}`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    <BeetelIcon color={isSystem ? '#0F6E56' : COLORS.accent.purpleText} size={Math.round(size * 0.52)} />
  </div>
);

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatMessageDateTime = (createdAt) => {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  const month = MONTHS_SHORT[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const rawHours = d.getHours();
  const ampm = rawHours >= 12 ? 'PM' : 'AM';
  const hours12 = String(rawHours % 12 || 12).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return {
    dateLine: `${month}-${day}`,
    timeLine: `${hours12}:${minutes} ${ampm}`,
  };
};

const ShareConversationModal = ({
  open,
  onClose,
  session,
  onSessionUpdated,
}) => {
  const [orgMembers, setOrgMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [shareError, setShareError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedIds([]);
    setShareError(null);
    setLoadingMembers(true);
    aiApi.listOrgMembers()
      .then(res => setOrgMembers(res.data || []))
      .catch(e => setShareError(e?.message || 'Failed to load organization members'))
      .finally(() => setLoadingMembers(false));
  }, [open]);

  if (!open || !session) return null;

  const ownerUserId = session.ownerUserId || session.owner?.userId;
  const existingSharedIds = new Set((session.sharedMembers || []).map(m => m.userId));

  const filteredMembers = orgMembers.filter(m => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (m.fullName && m.fullName.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.roleName && m.roleName.toLowerCase().includes(q))
    );
  });

  const toggleSelect = (userId) => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleGrantAccess = async () => {
    if (selectedIds.length === 0 || submitting) return;
    setSubmitting(true);
    setShareError(null);
    try {
      const res = await aiApi.shareSession(session.id, selectedIds);
      const updated = res?.data || res;
      if (updated) {
        onSessionUpdated(updated);
      }
      setSelectedIds([]);
      onClose();
    } catch (e) {
      setShareError(e?.message || 'Failed to share conversation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: SPACING.md,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#fff',
          borderRadius: BORDER_RADIUS.lg,
          border: `1px solid ${COLORS.border.light}`,
          boxShadow: '0 16px 40px rgba(0,0,0,0.16)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '82vh',
        }}
      >
        {/* Modal Header */}
        <div style={{
          ...FRBC,
          padding: `${SPACING.md} ${SPACING.lg}`,
          background: COLORS.brand.primary,
          borderBottom: `1px solid ${COLORS.brand.primaryDark}`,
          color: '#FFFFFF',
        }}>
          <div style={{ ...FRSC, gap: SPACING.sm }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '9px',
              background: 'rgba(255, 255, 255, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className="fa-solid fa-user-plus" style={{ fontSize: '13px', color: '#FFFFFF' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: FONT.size.base, fontWeight: FONT.weight.semibold, color: '#FFFFFF' }}>
                Share Conversation
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: FONT.size.xs, color: 'rgba(255, 255, 255, 0.78)' }}>
                {session.title || 'Conversation'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: '7px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.12)',
              fontSize: '13px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        {(loadingMembers || submitting) && <BarLoader />}

        {/* Notice Banner */}
        <div style={{
          padding: `${SPACING.sm} ${SPACING.lg}`,
          background: '#FAEEDA',
          borderBottom: '1px solid #F0D090',
          fontSize: '11px',
          color: '#854F0B',
          lineHeight: 1.45,
        }}>
          <strong>Permanent Organization Access:</strong> Selected members from your organization can view and contribute to this conversation and approve execution plans. Once granted, access <strong>cannot be revoked</strong>.
        </div>

        {/* Search Input */}
        <div style={{ padding: `${SPACING.sm} ${SPACING.lg}`, borderBottom: `1px solid ${COLORS.border.light}` }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search organization members by name or email..."
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: BORDER_RADIUS.md,
              border: `1px solid ${COLORS.border.light}`,
              fontSize: FONT.size.xs,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Member List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: `${SPACING.xs} ${SPACING.lg}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          {loadingMembers ? (
            <div style={{ padding: `${SPACING.xs} 0` }}>
              <SkeletonLoader
                variant="table-row"
                count={4}
                height="46px"
                style={{ borderRadius: BORDER_RADIUS.md }}
              />
            </div>
          ) : filteredMembers.length === 0 ? (
            <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, textAlign: 'center', padding: SPACING.md }}>
              No matching members found in your organization.
            </p>
          ) : (
            filteredMembers.map(member => {
              const isOwner = member.userId === ownerUserId;
              const isAlreadyShared = existingSharedIds.has(member.userId);
              const isLocked = isOwner || isAlreadyShared;
              const isChecked = isLocked || selectedIds.includes(member.userId);

              return (
                <div
                  key={member.userId}
                  onClick={() => {
                    if (!isLocked) toggleSelect(member.userId);
                  }}
                  style={{
                    ...FRBC,
                    gap: SPACING.sm,
                    padding: '8px 10px',
                    borderRadius: BORDER_RADIUS.md,
                    border: `1px solid ${
                      isChecked && !isLocked
                        ? COLORS.brand.primary
                        : COLORS.border.light
                    }`,
                    background: isLocked
                      ? COLORS.background.secondary
                      : isChecked
                      ? COLORS.accent.purpleLight
                      : '#fff',
                    cursor: isLocked ? 'default' : 'pointer',
                  }}
                >
                  <div style={{ ...FRSC, gap: SPACING.sm, minWidth: 0, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isLocked}
                      onChange={() => {
                        if (!isLocked) toggleSelect(member.userId);
                      }}
                      style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                    />
                    <UserAvatar
                      initials={member.displayInitials}
                      name={member.fullName}
                      color={member.avatarColor}
                      size={30}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ ...FRSC, gap: '6px' }}>
                        <span style={{
                          fontSize: FONT.size.xs,
                          fontWeight: FONT.weight.semibold,
                          color: COLORS.text.primary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {member.fullName}
                        </span>
                        {member.roleName && (
                          <span style={{
                            fontSize: '10px',
                            color: COLORS.text.tertiary,
                            background: COLORS.background.secondary,
                            padding: '1px 6px',
                            borderRadius: BORDER_RADIUS.full,
                          }}>
                            {member.roleName}
                          </span>
                        )}
                      </div>
                      {member.email && (
                        <p style={{
                          margin: '1px 0 0 0',
                          fontSize: '11px',
                          color: COLORS.text.secondary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {member.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {isOwner ? (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: FONT.weight.semibold,
                      padding: '2px 8px',
                      borderRadius: BORDER_RADIUS.full,
                      background: COLORS.accent.purpleLight,
                      color: COLORS.accent.purpleText,
                    }}>
                      Owner
                    </span>
                  ) : isAlreadyShared ? (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: FONT.weight.semibold,
                      padding: '2px 8px',
                      borderRadius: BORDER_RADIUS.full,
                      background: '#E1F5EE',
                      color: '#0F6E56',
                    }}>
                      Access Granted
                    </span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {shareError && (
          <div style={{
            margin: `0 ${SPACING.lg}`,
            padding: '6px 10px',
            borderRadius: BORDER_RADIUS.sm,
            background: '#FCEBEB',
            color: '#A32D2D',
            fontSize: '11px',
          }}>
            {shareError}
          </div>
        )}

        {/* Modal Footer */}
        <div style={{
          ...FRBC,
          padding: `${SPACING.sm} ${SPACING.lg}`,
          borderTop: `1px solid ${COLORS.border.light}`,
          background: COLORS.background.secondary,
        }}>
          <span style={{ fontSize: '11px', color: COLORS.text.secondary }}>
            {selectedIds.length > 0
              ? `${selectedIds.length} member${selectedIds.length > 1 ? 's' : ''} selected`
              : 'Select members to grant permanent access'}
          </span>
          <div style={{ ...FRSC, gap: SPACING.xs }}>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedIds.length === 0 || submitting}
              onClick={handleGrantAccess}
            >
              {submitting ? 'Sharing...' : 'Grant Access'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BeetelChatWorkspace = ({
  sessionId: externalSessionId = null,
  onSessionCreated = () => {},
  onAccessDenied = null,
  initialContextType = 'NONE',
  initialContextEntityId = null,
  initialContextEntityName = null,
  compact = false,
}) => {
  const { user: currentUser } = useAuth();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contextType, setContextType] = useState(initialContextType || 'NONE');
  const [contextEntityId, setContextEntityId] = useState(initialContextEntityId || '');
  const [contextEntityName, setContextEntityName] = useState(initialContextEntityName || '');
  const [pipelines, setPipelines] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [connections, setConnections] = useState([]);
  const [udfs, setUdfs] = useState([]);

  const [input, setInput] = useState('');
  const [preferredProvider, setPreferredProvider] = useState(''); // '' = Auto, 'OLLAMA', 'GROQ'
  const [mdFile, setMdFile] = useState(null); // { name, content, size }
  const [loadingSession, setLoadingSession] = useState(Boolean(externalSessionId));
  const [sending, setSending] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState(null);
  const [error, setError] = useState(null);
  const [sessionAccessDenied, setSessionAccessDenied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Sync when route/context props change (e.g. in split panel)
  useEffect(() => {
    if (initialContextType && initialContextType !== 'NONE') {
      setContextType(initialContextType);
    }
    if (initialContextEntityId) {
      setContextEntityId(initialContextEntityId);
    }
    if (initialContextEntityName) {
      setContextEntityName(initialContextEntityName);
    }
  }, [initialContextType, initialContextEntityId, initialContextEntityName]);

  // Load available pipelines, workflows, connections & UDFs for context selector
  useEffect(() => {
    pipelineApi.getAll().then(res => setPipelines(res.data || [])).catch(() => {});
    workflowApi.getAll().then(res => setWorkflows(res.data || [])).catch(() => {});
    connectionApi.getAll().then(res => setConnections(res.data || [])).catch(() => {});
    udfApi.getAll().then(res => setUdfs(res.data || [])).catch(() => {});
  }, []);

  // Resolve entity name when ID or list changes, and auto-select first entity if none chosen yet
  useEffect(() => {
    if (contextType === 'PIPELINE') {
      if (contextEntityId) {
        const found = pipelines.find(p => String(p.id) === String(contextEntityId));
        if (found) setContextEntityName(found.name);
      } else if (pipelines.length > 0) {
        setContextEntityId(pipelines[0].id);
        setContextEntityName(pipelines[0].name);
      }
    } else if (contextType === 'WORKFLOW') {
      if (contextEntityId) {
        const found = workflows.find(w => String(w.id) === String(contextEntityId));
        if (found) setContextEntityName(found.name);
      } else if (workflows.length > 0) {
        setContextEntityId(workflows[0].id);
        setContextEntityName(workflows[0].name);
      }
    } else if (contextType === 'CONNECTION') {
      if (contextEntityId) {
        const found = connections.find(c => String(c.id) === String(contextEntityId));
        if (found) setContextEntityName(found.name);
      } else if (connections.length > 0) {
        setContextEntityId(connections[0].id);
        setContextEntityName(connections[0].name);
      }
    } else if (contextType === 'UDF') {
      if (contextEntityId) {
        const found = udfs.find(u => String(u.id) === String(contextEntityId));
        if (found) setContextEntityName(found.name);
      } else if (udfs.length > 0) {
        setContextEntityId(udfs[0].id);
        setContextEntityName(udfs[0].name);
      }
    } else if (contextType === 'NONE') {
      setContextEntityId('');
      setContextEntityName('');
    }
  }, [contextType, contextEntityId, pipelines, workflows, connections, udfs]);

  // Load existing session metadata + messages if externalSessionId is selected
  const loadSessionMessages = useCallback(async (sid) => {
    if (!sid) {
      setSession(null);
      setMessages([]);
      setSessionAccessDenied(false);
      setLoadingSession(false);
      setError(null);
      return;
    }
    try {
      setLoadingSession(true);
      setSessionAccessDenied(false);
      setError(null);
      const res = await aiApi.getSession(sid);
      const sessData = res?.data || res;
      if (sessData) {
        setSession(sessData);
        setMessages(sessData.messages || []);
        if (sessData.contextType) {
          setContextType(sessData.contextType);
          setContextEntityId(sessData.contextEntityId || '');
          setContextEntityName(sessData.contextEntityName || '');
        }
      }
    } catch (e) {
      if (
        e?.status === 403 ||
        e?.status === 404 ||
        /AiChatSession not found|access denied|don't have permission/i.test(e?.message || '')
      ) {
        setSessionAccessDenied(true);
        if (onAccessDenied) onAccessDenied();
        return;
      }
      setError(e?.message || 'Failed to load conversation messages');
    } finally {
      setLoadingSession(false);
    }
  }, [onAccessDenied]);

  useEffect(() => {
    loadSessionMessages(externalSessionId);
  }, [externalSessionId, loadSessionMessages]);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMdFile({
        name: file.name,
        content: String(ev.target?.result || ''),
        size: file.size,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSampleSpec = () => {
    setMdFile({
      name: 'orders-migration-spec.md',
      content: SAMPLE_MD_SPEC,
      size: SAMPLE_MD_SPEC.length,
    });
    if (!input.trim()) {
      setInput('Please analyze this Markdown specification, check if any connection or table details are missing, and generate an execution plan.');
    }
  };

  const handleSend = async (customPrompt = null) => {
    const textToSend = customPrompt !== null ? customPrompt : input;
    if ((!textToSend.trim() && !mdFile) || sending) return;

    setSending(true);
    setError(null);

    const optimisticUserMsg = {
      id: 'temp-user-' + Date.now(),
      role: 'USER',
      senderUserId: currentUser?.id || null,
      senderName: currentUser?.fullName || 'You',
      senderInitials: currentUser?.displayInitials || deriveInitialsFromName(currentUser?.fullName),
      senderAvatarColor: currentUser?.avatarColor || COLORS.brand.primary,
      content: textToSend.trim() || (mdFile ? `Uploaded Markdown specification: ${mdFile.name}` : ''),
      markdownAttachmentName: mdFile?.name || null,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticUserMsg]);
    if (customPrompt === null) setInput('');
    const attachedMd = mdFile;
    setMdFile(null);

    try {
      const payload = {
        sessionId: externalSessionId || session?.id || null,
        message: optimisticUserMsg.content,
        contextType,
        contextEntityId: contextEntityId || null,
        contextEntityName: contextEntityName || null,
        markdownAttachment: attachedMd?.content || null,
        markdownFileName: attachedMd?.name || null,
        preferredProvider: preferredProvider || null,
      };
      const res = await aiApi.sendMessage(payload);
      const data = res?.data || res;
      if (data?.session) {
        setSession(data.session);
        onSessionCreated(data.session);
      } else if (data?.sessionId) {
        const sessObj = {
          ...(session || {}),
          id: data.sessionId,
          title: session?.title || textToSend.trim().slice(0, 48) || (attachedMd?.name ? `Spec: ${attachedMd.name}` : 'New Conversation'),
          ownerUserId: session?.ownerUserId || currentUser?.id,
          isShared: Boolean(session?.isShared),
          sharedMembers: session?.sharedMembers || [],
          contextType,
          contextEntityId: contextEntityId || null,
          contextEntityName: contextEntityName || null,
        };
        setSession(sessObj);
        onSessionCreated(sessObj);
      }
      const assistantMsg = data?.assistantMessage || (data?.role ? data : null);
      if (assistantMsg) {
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (e) {
      setError(e?.message || 'Beetel encountered an error processing your request.');
    } finally {
      setSending(false);
    }
  };

  const handleConfirmPlan = async (planId) => {
    setBusyPlanId(planId);
    setError(null);
    try {
      const res = await aiApi.confirmPlan(planId);
      const msgData = res?.data || res;
      const updatedPlan = msgData?.plan || msgData;
      setMessages(prev => {
        const updated = prev.map(m => (m.plan?.id === planId ? { ...m, plan: updatedPlan } : m));
        if (msgData?.role && msgData?.content) {
          return [...updated, { ...msgData, plan: null }];
        }
        return updated;
      });
    } catch (e) {
      setError(e?.message || 'Plan execution failed');
    } finally {
      setBusyPlanId(null);
    }
  };

  const handleRejectPlan = async (planId) => {
    setBusyPlanId(planId);
    setError(null);
    try {
      const res = await aiApi.rejectPlan(planId);
      const msgData = res?.data || res;
      const updatedPlan = msgData?.plan || msgData;
      setMessages(prev => {
        const updated = prev.map(m => (m.plan?.id === planId ? { ...m, plan: updatedPlan } : m));
        if (msgData?.role && msgData?.content) {
          return [...updated, { ...msgData, plan: null }];
        }
        return updated;
      });
    } catch (e) {
      setError(e?.message || 'Failed to reject plan');
    } finally {
      setBusyPlanId(null);
    }
  };

  const quickPrompts = [
    {
      label: 'Generate from .md Spec',
      action: () => handleLoadSampleSpec(),
    },
    {
      label: 'Debug Active Context',
      action: () =>
        handleSend(
          contextType !== 'NONE' && contextEntityName
            ? `Inspect ${contextType.toLowerCase()} "${contextEntityName}" and diagnose any failed rows, schema mismatches, or bottlenecks.`
            : 'Check my pipelines and connections for any errors or failed statuses and suggest fixes.'
        ),
    },
    {
      label: 'Plan New Pipeline',
      action: () =>
        handleSend(
          'I want to create a new pipeline. List my available source and target connections and help me plan the migration.'
        ),
    },
  ];

  const activeSessionId = externalSessionId || session?.id || null;
  const isSessionShared = Boolean(
    session?.isShared || session?.shared || (session?.sharedMembers && session.sharedMembers.length > 0)
  );
  const participants = [
    ...(session?.owner ? [session.owner] : []),
    ...(session?.sharedMembers || []),
  ];

  if (sessionAccessDenied) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: COLORS.background.primary,
        border: compact ? 'none' : `1px solid ${COLORS.border.light}`,
        borderRadius: compact ? 0 : BORDER_RADIUS.lg,
        overflow: 'auto',
      }}>
        <ErrorPage status={403} compact={compact} />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: COLORS.background.primary,
      border: compact ? 'none' : '1px solid #DFDDF7',
      borderRadius: compact ? 0 : BORDER_RADIUS.lg,
      boxShadow: compact ? 'none' : '0 4px 16px rgba(83, 74, 183, 0.06)',
      overflow: 'hidden',
    }}>
      {/* Context & Sharing Header Bar */}
      <div style={{
        ...FRBC,
        flexWrap: 'wrap',
        gap: SPACING.xs,
        padding: compact ? '8px 12px' : '9px 16px',
        background: COLORS.brand.primary,
        borderBottom: `1px solid ${COLORS.brand.primaryDark}`,
      }}>
        <div style={{ ...FRSC, gap: SPACING.xs, flexWrap: 'wrap' }}>
          <span style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold, color: '#FFFFFF' }}>
            Context:
          </span>
          <select
            value={contextType}
            onChange={e => {
              const nextType = e.target.value;
              setContextType(nextType);
              if (nextType === 'PIPELINE' && pipelines.length > 0) {
                setContextEntityId(pipelines[0].id);
                setContextEntityName(pipelines[0].name);
              } else if (nextType === 'WORKFLOW' && workflows.length > 0) {
                setContextEntityId(workflows[0].id);
                setContextEntityName(workflows[0].name);
              } else if (nextType === 'CONNECTION' && connections.length > 0) {
                setContextEntityId(connections[0].id);
                setContextEntityName(connections[0].name);
              } else if (nextType === 'UDF' && udfs.length > 0) {
                setContextEntityId(udfs[0].id);
                setContextEntityName(udfs[0].name);
              } else {
                setContextEntityId('');
                setContextEntityName('');
              }
            }}
            style={{
              padding: '4px 8px',
              borderRadius: BORDER_RADIUS.sm,
              border: `1px solid ${COLORS.border.light}`,
              fontSize: FONT.size.xs,
              fontWeight: FONT.weight.medium,
              background: '#FFFFFF',
              color: COLORS.text.primary,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="NONE">Global Workspace</option>
            <option value="PIPELINE">Pipeline</option>
            <option value="WORKFLOW">Workflow</option>
            <option value="CONNECTION">Connection</option>
            <option value="UDF">UDF</option>
          </select>

          {contextType === 'PIPELINE' && (
            <select
              value={contextEntityId}
              onChange={e => setContextEntityId(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: BORDER_RADIUS.sm,
                border: `1px solid ${COLORS.border.light}`,
                fontSize: FONT.size.xs,
                fontWeight: FONT.weight.medium,
                background: '#FFFFFF',
                color: COLORS.text.primary,
                maxWidth: compact ? '150px' : '220px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Select pipeline...</option>
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          )}

          {contextType === 'WORKFLOW' && (
            <select
              value={contextEntityId}
              onChange={e => setContextEntityId(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: BORDER_RADIUS.sm,
                border: `1px solid ${COLORS.border.light}`,
                fontSize: FONT.size.xs,
                fontWeight: FONT.weight.medium,
                background: '#FFFFFF',
                color: COLORS.text.primary,
                maxWidth: compact ? '150px' : '220px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Select workflow...</option>
              {workflows.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.status})
                </option>
              ))}
            </select>
          )}

          {contextType === 'CONNECTION' && (
            <select
              value={contextEntityId}
              onChange={e => setContextEntityId(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: BORDER_RADIUS.sm,
                border: `1px solid ${COLORS.border.light}`,
                fontSize: FONT.size.xs,
                fontWeight: FONT.weight.medium,
                background: '#FFFFFF',
                color: COLORS.text.primary,
                maxWidth: compact ? '150px' : '220px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Select connection...</option>
              {connections.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.dbType || c.type})
                </option>
              ))}
            </select>
          )}

          {contextType === 'UDF' && (
            <select
              value={contextEntityId}
              onChange={e => setContextEntityId(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: BORDER_RADIUS.sm,
                border: `1px solid ${COLORS.border.light}`,
                fontSize: FONT.size.xs,
                fontWeight: FONT.weight.medium,
                background: '#FFFFFF',
                color: COLORS.text.primary,
                maxWidth: compact ? '150px' : '220px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Select UDF...</option>
              {udfs.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} (v{u.version || '1.0.0'})
                </option>
              ))}
            </select>
          )}

          <span style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold, color: '#FFFFFF', marginLeft: '4px' }}>
            Model:
          </span>
          <select
            value={preferredProvider}
            onChange={e => setPreferredProvider(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: BORDER_RADIUS.sm,
              border: `1px solid ${COLORS.border.light}`,
              fontSize: FONT.size.xs,
              fontWeight: FONT.weight.medium,
              background: '#FFFFFF',
              color: COLORS.text.primary,
              outline: 'none',
              cursor: 'pointer',
            }}
            title="Choose LLM provider or Auto Failover"
          >
            <option value="">Auto (Groq / Ollama)</option>
            <option value="OLLAMA">Local Ollama (gemma4:12b)</option>
            <option value="GROQ">Groq Cloud</option>
          </select>
        </div>

        {/* Share & Upload .md Spec controls */}
        <div style={{ ...FRSC, gap: '7px', flexWrap: 'wrap' }}>
          {activeSessionId && (
            <div style={{ ...FRSC, gap: '7px' }}>
              {isSessionShared && (
                <div
                  style={{
                    ...FRSC,
                    gap: '5px',
                    padding: '3px 9px',
                    borderRadius: BORDER_RADIUS.pill,
                    background: '#E1F5EE',
                    border: '1px solid #9FE1CB',
                    color: '#0F6E56',
                    fontSize: '11px',
                    fontWeight: FONT.weight.semibold,
                  }}
                  title={`Shared with ${(session?.sharedMembers || []).map(m => m.fullName).join(', ')}`}
                >
                  <i className="fa-solid fa-users" style={{ fontSize: '10px' }} />
                  <span>Shared ({participants.length})</span>
                </div>
              )}

              {participants.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {participants.slice(0, 4).map((p, idx) => (
                    <UserAvatar
                      key={p.userId || idx}
                      initials={p.displayInitials}
                      name={`${p.fullName}${p.isOwner ? ' (Owner)' : ' (Shared)'}`}
                      color={p.avatarColor}
                      size={23}
                      style={{
                        marginLeft: idx === 0 ? 0 : '-6px',
                        border: '1.5px solid #FFFFFF',
                      }}
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                style={{
                  ...FRSC,
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: BORDER_RADIUS.sm,
                  border: `1px solid ${COLORS.accent.purpleLight}`,
                  background: COLORS.accent.purpleLight,
                  color: COLORS.accent.purpleText,
                  fontSize: FONT.size.xs,
                  fontWeight: FONT.weight.semibold,
                  cursor: 'pointer',
                }}
                title="Share this conversation with members of your organization"
              >
                <i className="fa-solid fa-user-plus" style={{ fontSize: '10px' }} />
                <span>Share</span>
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...FRSC,
              gap: '5px',
              padding: '4px 10px',
              borderRadius: BORDER_RADIUS.sm,
              border: `1px solid ${COLORS.border.light}`,
              background: '#FFFFFF',
              color: COLORS.text.primary,
              fontSize: FONT.size.xs,
              fontWeight: FONT.weight.medium,
              cursor: 'pointer',
            }}
          >
            <i className="fa-regular fa-file-lines" style={{ fontSize: '11px' }} />
            <span>{AGENT.uploadMarkdown}</span>
          </button>
        </div>
      </div>
      {(loadingSession || sending || Boolean(busyPlanId)) && <BarLoader />}

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: SPACING.md,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.md,
      }}>
        {loadingSession ? (
          <SpinnerLoader
            size="md"
            message="Loading conversation..."
            height="100%"
          />
        ) : messages.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            maxWidth: '460px',
            padding: SPACING.lg,
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: COLORS.accent.purpleLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
            }}>
              <BeetelIcon color={COLORS.accent.purpleText} size={22} />
            </div>
            <h3 style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.semibold, margin: '0 0 6px 0' }}>
              Hi, I&apos;m {AGENT.name}
            </h3>
            <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Upload a Markdown (<code>.md</code>) specification to generate pipelines and workflows, or select a pipeline, workflow, connection, or UDF above to debug errors and optimize mappings.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={qp.action}
                  style={{
                    padding: '6px 12px',
                    borderRadius: BORDER_RADIUS.full,
                    border: `1px solid ${COLORS.border.medium}`,
                    background: COLORS.background.secondary,
                    color: COLORS.text.primary,
                    fontSize: FONT.size.xs,
                    cursor: 'pointer',
                  }}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, msgIdx) => {
            const isUser = msg.role === 'USER';
            const isSystem = msg.role === 'SYSTEM';
            const isError = msg.role === 'ERROR';
            const isAudit = msg.role === 'AUDIT';

            if (isAudit) {
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '2px 0',
                  }}
                >
                  <div
                    style={{
                      ...FRSC,
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: BORDER_RADIUS.full,
                      background: COLORS.background.secondary,
                      border: `1px solid ${COLORS.border.light}`,
                      color: COLORS.text.secondary,
                      fontSize: '11px',
                    }}
                  >
                    <i className="fa-solid fa-user-check" style={{ fontSize: '10px', color: '#0F6E56' }} />
                    <BeetelMarkdownRenderer content={msg.content} />
                  </div>
                </div>
              );
            }

            const msgTime = formatMessageDateTime(msg.createdAt);

            if (isError) {
              const prevUserMsg = [...messages.slice(0, msgIdx)]
                .reverse()
                .find(m => m.role === 'USER' && m.content);
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: SPACING.xs,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                    minWidth: '46px',
                  }}>
                    <BeetelAvatar size={30} />
                    {msgTime && (
                      <div style={{
                        marginTop: '4px',
                        fontSize: '9px',
                        lineHeight: 1.25,
                        color: COLORS.text.tertiary,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}>
                        <div>{msgTime.dateLine}</div>
                        <div>{msgTime.timeLine}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ width: compact ? '90%' : '82%' }}>
                    <BeetelErrorCard
                      content={msg.content}
                      sending={sending}
                      onRetry={prevUserMsg ? () => handleSend(prevUserMsg.content) : null}
                    />
                  </div>
                </div>
              );
            }

            const isCurrentUserSender =
              isUser &&
              currentUser?.id &&
              msg.senderUserId &&
              String(msg.senderUserId) === String(currentUser.id);
            const senderDisplayName = isUser
              ? msg.senderName
                ? isCurrentUserSender
                  ? `${msg.senderName} (You)`
                  : msg.senderName
                : isCurrentUserSender
                ? `${currentUser?.fullName || 'You'}`
                : 'Organization Member'
              : isSystem
              ? `${AGENT.name} Executor`
              : AGENT.name;

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: SPACING.xs,
                }}
              >
                {/* Sender Display Picture (DP) + date-time below it */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                  minWidth: '46px',
                }}>
                  {isUser ? (
                    <UserAvatar
                      initials={msg.senderInitials || (isCurrentUserSender ? currentUser?.displayInitials : null)}
                      name={msg.senderName || (isCurrentUserSender ? currentUser?.fullName : 'Member')}
                      color={msg.senderAvatarColor || (isCurrentUserSender ? currentUser?.avatarColor : COLORS.brand.primary)}
                      size={30}
                    />
                  ) : (
                    <BeetelAvatar size={30} isSystem={isSystem} />
                  )}
                  {msgTime && (
                    <div style={{
                      marginTop: '4px',
                      fontSize: '9px',
                      lineHeight: 1.25,
                      color: COLORS.text.tertiary,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}>
                      <div>{msgTime.dateLine}</div>
                      <div>{msgTime.timeLine}</div>
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: compact ? '88%' : '78%',
                  minWidth: 0,
                }}>
                  {isUser && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: FONT.weight.semibold,
                      color: COLORS.text.secondary,
                      marginBottom: '3px',
                      paddingRight: '2px',
                      textAlign: 'right',
                    }}>
                      {senderDisplayName}
                    </span>
                  )}

                  <div style={{
                    width: '100%',
                    padding: `${SPACING.sm} ${SPACING.md}`,
                    borderRadius: BORDER_RADIUS.lg,
                    background: isUser
                      ? COLORS.brand.primary
                      : isSystem
                      ? '#E1F5EE'
                      : COLORS.background.secondary,
                    color: isUser ? '#fff' : COLORS.text.primary,
                    border: isUser ? 'none' : `1px solid ${COLORS.border.light}`,
                    boxSizing: 'border-box',
                  }}>
                    {!isUser && (
                      <div style={{ ...FRBC, gap: SPACING.xs, marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: FONT.weight.semibold,
                          color: isSystem ? '#0F6E56' : COLORS.accent.purpleText,
                        }}>
                          {senderDisplayName}
                        </span>
                        {msg.providerUsed && (
                          <span style={{ fontSize: '10px', color: COLORS.text.tertiary }}>
                            {msg.providerUsed}{msg.modelUsed ? ` · ${msg.modelUsed}` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {msg.markdownAttachmentName && (
                      <div style={{
                        ...FRSC,
                        gap: '6px',
                        padding: '4px 8px',
                        marginBottom: '6px',
                        borderRadius: BORDER_RADIUS.sm,
                        background: isUser ? 'rgba(255,255,255,0.16)' : '#fff',
                        fontSize: '11px',
                      }}>
                        <i className="fa-solid fa-paperclip" style={{ fontSize: '11px' }} />
                        <span style={{ fontWeight: FONT.weight.medium }}>{msg.markdownAttachmentName}</span>
                      </div>
                    )}

                    <BeetelMarkdownRenderer content={msg.content} isUser={isUser} />

                    {msg.plan && (
                      <PlanConfirmationCard
                        plan={msg.plan}
                        onConfirm={handleConfirmPlan}
                        onReject={handleRejectPlan}
                        busyPlanId={busyPlanId}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {sending && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.xs,
          }}>
            <BeetelAvatar size={30} />
            <div style={{
              ...FRSC,
              gap: '8px',
              padding: `${SPACING.xs} ${SPACING.md}`,
              borderRadius: BORDER_RADIUS.lg,
              background: COLORS.background.secondary,
              border: `1px solid ${COLORS.border.light}`,
              fontSize: FONT.size.xs,
              color: COLORS.text.secondary,
            }}>
              <SpinnerLoader size={14} height="auto" style={{ width: 'auto', padding: 0 }} />
              <span>{AGENT.name} is analyzing context and tools...</span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACING.xs }}>
            <BeetelAvatar size={30} />
            <div style={{ width: compact ? '90%' : '82%' }}>
              <BeetelErrorCard
                content={error}
                sending={sending}
                onRetry={() => {
                  const lastUser = [...messages].reverse().find(m => m.role === 'USER' && m.content);
                  if (lastUser) handleSend(lastUser.content);
                }}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attached Markdown Preview Banner */}
      {mdFile && (
        <div style={{
          ...FRBC,
          padding: `6px ${SPACING.md}`,
          background: COLORS.accent.purpleLight,
          borderTop: `1px solid ${COLORS.border.light}`,
        }}>
          <div style={{ ...FRSC, gap: SPACING.xs }}>
            <span style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold, color: COLORS.accent.purpleText }}>
              Attached Spec: {mdFile.name}
            </span>
            <span style={{ fontSize: '11px', color: COLORS.text.secondary }}>
              ({Math.max(1, Math.round(mdFile.size / 1024))} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMdFile(null)}
            style={{
              ...FRSC,
              gap: '4px',
              border: 'none',
              background: 'transparent',
              color: COLORS.accent.purpleText,
              fontSize: FONT.size.xs,
              cursor: 'pointer',
              fontWeight: FONT.weight.semibold,
            }}
          >
            <span>Remove</span>
            <i className="fa-solid fa-xmark" style={{ fontSize: '11px' }} />
          </button>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          padding: SPACING.sm,
          borderTop: `1px solid ${COLORS.border.light}`,
          background: '#fff',
          display: 'flex',
          gap: SPACING.xs,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          rows={compact ? 2 : 2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={AGENT.placeholder}
          style={{
            flex: 1,
            resize: 'none',
            padding: '8px 10px',
            borderRadius: BORDER_RADIUS.md,
            border: `1px solid ${COLORS.border.light}`,
            fontSize: FONT.size.sm,
            fontFamily: FONT.family,
            outline: 'none',
          }}
        />
        <Button type="submit" disabled={sending || (!input.trim() && !mdFile)}>
          {sending ? (
            <span style={{ ...FRSC, gap: '6px' }}>
              <SpinnerLoader size={13} color="#FFFFFF" height="auto" style={{ width: 'auto', padding: 0 }} />
              <span>Sending</span>
            </span>
          ) : (
            'Send'
          )}
        </Button>
      </form>

      {/* Share Conversation Modal */}
      <ShareConversationModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        session={session}
        onSessionUpdated={(updatedSess) => {
          setSession(updatedSess);
          if (Array.isArray(updatedSess.messages)) {
            setMessages(updatedSess.messages);
          }
          onSessionCreated(updatedSess);
        }}
      />
    </div>
  );
};

export default BeetelChatWorkspace;

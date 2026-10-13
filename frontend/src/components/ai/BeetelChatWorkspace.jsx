import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import { FRSC, FRBC } from '../../constants/layouts';
import { AGENT } from '../../constants/literals';
import { Button } from '../common';
import { BeetelIcon } from '../layout/Icons';
import { aiApi } from '../../services/aiApi';
import { pipelineApi, workflowApi } from '../../services/api';
import BeetelMarkdownRenderer from './BeetelMarkdownRenderer';

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
          {style.label}
        </span>
      </div>

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
                    {stepDone ? '✓' : stepFailed ? '!' : (step.stepNumber || idx + 1)}
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

const BeetelChatWorkspace = ({
  sessionId: externalSessionId = null,
  onSessionCreated = () => {},
  initialContextType = 'NONE',
  initialContextEntityId = null,
  initialContextEntityName = null,
  compact = false,
}) => {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contextType, setContextType] = useState(initialContextType || 'NONE');
  const [contextEntityId, setContextEntityId] = useState(initialContextEntityId || '');
  const [contextEntityName, setContextEntityName] = useState(initialContextEntityName || '');
  const [pipelines, setPipelines] = useState([]);
  const [workflows, setWorkflows] = useState([]);

  const [input, setInput] = useState('');
  const [preferredProvider, setPreferredProvider] = useState(''); // '' = Auto, 'OLLAMA', 'GROQ'
  const [mdFile, setMdFile] = useState(null); // { name, content, size }
  const [sending, setSending] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState(null);
  const [error, setError] = useState(null);

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

  // Load available pipelines & workflows for context selector
  useEffect(() => {
    pipelineApi.getAll().then(res => setPipelines(res.data || [])).catch(() => {});
    workflowApi.getAll().then(res => setWorkflows(res.data || [])).catch(() => {});
  }, []);

  // Resolve entity name when ID or list changes
  useEffect(() => {
    if (contextType === 'PIPELINE' && contextEntityId) {
      const found = pipelines.find(p => String(p.id) === String(contextEntityId));
      if (found) setContextEntityName(found.name);
    } else if (contextType === 'WORKFLOW' && contextEntityId) {
      const found = workflows.find(w => String(w.id) === String(contextEntityId));
      if (found) setContextEntityName(found.name);
    } else if (contextType === 'NONE') {
      setContextEntityId('');
      setContextEntityName('');
    }
  }, [contextType, contextEntityId, pipelines, workflows]);

  // Load existing session messages if externalSessionId is selected
  const loadSessionMessages = useCallback(async (sid) => {
    if (!sid) {
      setSession(null);
      setMessages([]);
      return;
    }
    try {
      const res = await aiApi.getSessionMessages(sid);
      setMessages(res.data || []);
    } catch (e) {
      setError(e?.message || 'Failed to load conversation messages');
    }
  }, []);

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
          id: data.sessionId,
          title: textToSend.trim().slice(0, 48) || (attachedMd?.name ? `Spec: ${attachedMd.name}` : 'New Conversation'),
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: COLORS.background.primary,
      border: compact ? 'none' : `1px solid ${COLORS.border.light}`,
      borderRadius: compact ? 0 : BORDER_RADIUS.lg,
      overflow: 'hidden',
    }}>
      {/* Context Bar */}
      <div style={{
        ...FRBC,
        flexWrap: 'wrap',
        gap: SPACING.xs,
        padding: `${SPACING.xs} ${SPACING.md}`,
        background: COLORS.background.secondary,
        borderBottom: `1px solid ${COLORS.border.light}`,
      }}>
        <div style={{ ...FRSC, gap: SPACING.xs, flexWrap: 'wrap' }}>
          <span style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>
            Context:
          </span>
          <select
            value={contextType}
            onChange={e => {
              setContextType(e.target.value);
              setContextEntityId('');
              setContextEntityName('');
            }}
            style={{
              padding: '4px 8px',
              borderRadius: BORDER_RADIUS.sm,
              border: `1px solid ${COLORS.border.light}`,
              fontSize: FONT.size.xs,
              background: '#fff',
              color: COLORS.text.primary,
            }}
          >
            <option value="NONE">Global Workspace</option>
            <option value="PIPELINE">Pipeline</option>
            <option value="WORKFLOW">Workflow</option>
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
                background: '#fff',
                color: COLORS.text.primary,
                maxWidth: compact ? '150px' : '220px',
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
                background: '#fff',
                color: COLORS.text.primary,
                maxWidth: compact ? '150px' : '220px',
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

          <span style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.medium, color: COLORS.text.secondary, marginLeft: '4px' }}>
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
              background: '#fff',
              color: COLORS.text.primary,
            }}
            title="Choose LLM provider or Auto Failover"
          >
            <option value="">Auto (Groq / Ollama)</option>
            <option value="OLLAMA">Local Ollama (gemma4:12b)</option>
            <option value="GROQ">Groq Cloud</option>
          </select>
        </div>

        {/* Upload .md Spec button */}
        <div style={{ ...FRSC, gap: '6px' }}>
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
              gap: '4px',
              padding: '4px 8px',
              borderRadius: BORDER_RADIUS.sm,
              border: `1px solid ${COLORS.border.medium}`,
              background: '#fff',
              color: COLORS.text.primary,
              fontSize: FONT.size.xs,
              cursor: 'pointer',
            }}
          >
            <span>📄</span>
            <span>{AGENT.uploadMarkdown}</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: SPACING.md,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.md,
      }}>
        {messages.length === 0 ? (
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
              Upload a Markdown (<code>.md</code>) specification to generate pipelines and workflows, or select a pipeline/workflow above to debug errors and optimize mappings.
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
          messages.map((msg) => {
            const isUser = msg.role === 'USER';
            const isSystem = msg.role === 'SYSTEM';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: compact ? '92%' : '82%',
                  padding: `${SPACING.sm} ${SPACING.md}`,
                  borderRadius: BORDER_RADIUS.lg,
                  background: isUser
                    ? COLORS.brand.primary
                    : isSystem
                    ? '#E1F5EE'
                    : COLORS.background.secondary,
                  color: isUser ? '#fff' : COLORS.text.primary,
                  border: isUser ? 'none' : `1px solid ${COLORS.border.light}`,
                }}>
                  {!isUser && (
                    <div style={{ ...FRBC, gap: SPACING.xs, marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: FONT.weight.semibold,
                        color: isSystem ? '#0F6E56' : COLORS.accent.purpleText,
                      }}>
                        {isSystem ? `${AGENT.name} Executor` : AGENT.name}
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
                      <span>📎</span>
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
            );
          })
        )}

        {sending && (
          <div style={{
            alignSelf: 'flex-start',
            padding: `${SPACING.xs} ${SPACING.md}`,
            borderRadius: BORDER_RADIUS.lg,
            background: COLORS.background.secondary,
            border: `1px solid ${COLORS.border.light}`,
            fontSize: FONT.size.xs,
            color: COLORS.text.secondary,
          }}>
            {AGENT.name} is analyzing context and tools...
          </div>
        )}

        {error && (
          <div style={{
            padding: `${SPACING.xs} ${SPACING.sm}`,
            borderRadius: BORDER_RADIUS.md,
            background: '#FCEBEB',
            color: '#A32D2D',
            fontSize: FONT.size.xs,
          }}>
            {error}
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
              border: 'none',
              background: 'transparent',
              color: COLORS.accent.purpleText,
              fontSize: FONT.size.xs,
              cursor: 'pointer',
              fontWeight: FONT.weight.semibold,
            }}
          >
            Remove ✕
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
          {sending ? '...' : 'Send'}
        </Button>
      </form>
    </div>
  );
};

export default BeetelChatWorkspace;

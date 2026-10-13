import React, { useState } from 'react';
import { Button } from '../common';
import { COLORS, FONT, BORDER_RADIUS, SPACING } from '../../constants/design';
import { FRBC, FRSC, FCSS } from '../../constants/layouts';
import { notifyHubApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const TestSendModal = ({ channels = [], templates = [], pipelines = [], onClose, onSent }) => {
  const notification = useNotification();

  const [pipelineId, setPipelineId] = useState('');
  const [templateName, setTemplateName] = useState(templates[0]?.name || 'pipeline-failure-alert');
  const [priority, setPriority] = useState('HIGH');
  const [errorMessage, setErrorMessage] = useState('Database replication socket timeout on port 5432');
  const [errorType, setErrorType] = useState('DATABASE_TIMEOUT');
  const [actionUrl, setActionUrl] = useState('http://localhost:3000/pipelines');

  // Multi-select channel configuration IDs
  const [selectedChannelIds, setSelectedChannelIds] = useState(channels.map(c => c.id));
  const [sending, setSending] = useState(false);

  const toggleChannel = (id) => {
    setSelectedChannelIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (selectedChannelIds.length === 0) {
      notification.error('Please select at least one channel configuration to send to.');
      return;
    }

    const selectedPipeline = pipelines.find(p => p.id === pipelineId);

    setSending(true);
    try {
      const payload = {
        pipelineId: pipelineId || undefined,
        pipelineName: selectedPipeline ? selectedPipeline.name : 'Manual Test Pipeline',
        templateName,
        priority,
        errorMessage,
        errorType,
        actionUrl,
        targetChannelConfigIds: selectedChannelIds,
        parameters: {
          rowsProcessed: 125000,
          totalRows: 500000,
          triggerSource: 'NotifyHub UI Manual Test Console',
        },
      };

      await notifyHubApi.sendNotification(payload);
      notification.success('Notification successfully queued and sent to selected channels!');
      if (onSent) onSent();
      onClose();
    } catch (err) {
      notification.error(err.message || 'Failed to dispatch notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: COLORS.background.primary,
        borderRadius: BORDER_RADIUS.lg,
        width: 680,
        maxWidth: '92vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          ...FRBC,
          padding: `${SPACING.lg} ${SPACING.xl}`,
          borderBottom: `1px solid ${COLORS.border.light}`,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: FONT.size.xl, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
              Send Test Notification
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: FONT.size.sm, color: COLORS.text.secondary }}>
              Select template, context parameters, and choose exact recipient channels.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '20px', color: COLORS.text.tertiary, padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} style={{ padding: SPACING.xl, display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
          {/* Target Channel Configurations Selector */}
          <div>
            <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, marginBottom: '4px' }}>
              Select Destination Channels ({selectedChannelIds.length} selected) *
            </label>
            <p style={{ margin: '0 0 8px', fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
              Choose which team or pipeline channel configuration should receive this alert.
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: SPACING.xs,
              maxHeight: 160, overflowY: 'auto', background: COLORS.background.secondary,
              padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, border: `1px solid ${COLORS.border.light}`,
            }}>
              {channels.map(ch => {
                const checked = selectedChannelIds.includes(ch.id);
                return (
                  <label
                    key={ch.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 10px', borderRadius: BORDER_RADIUS.sm,
                      background: checked ? '#fff' : 'transparent',
                      border: `1px solid ${checked ? COLORS.brand.primary : COLORS.border.light}`,
                      fontSize: FONT.size.xs, cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChannel(ch.id)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: FONT.weight.medium, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ch.name}
                      </p>
                      <span style={{ fontSize: '10px', color: COLORS.text.tertiary }}>
                        {ch.channelType} {ch.pipelineId ? `• pipeline:${ch.pipelineId}` : '• Org Global'}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Template & Pipeline Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.md }}>
            <div>
              <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                Notification Template
              </label>
              <select
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                style={{
                  width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                  borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                  fontSize: FONT.size.sm, background: '#fff',
                }}
              >
                {templates.map(t => (
                  <option key={t.id || t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                Simulated Pipeline (optional)
              </label>
              <select
                value={pipelineId}
                onChange={e => setPipelineId(e.target.value)}
                style={{
                  width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                  borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                  fontSize: FONT.size.sm, background: '#fff',
                }}
              >
                <option value="">None (Generic Org Alert)</option>
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority & Error Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.md }}>
            <div>
              <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                Priority Severity
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                style={{
                  width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                  borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                  fontSize: FONT.size.sm, background: '#fff',
                }}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                Error Type Code
              </label>
              <input
                type="text"
                value={errorType}
                onChange={e => setErrorType(e.target.value)}
                style={{
                  width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                  borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                  fontSize: FONT.size.sm,
                }}
              />
            </div>
          </div>

          {/* Error Message */}
          <div>
            <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
              Error Message
            </label>
            <textarea
              rows={3}
              value={errorMessage}
              onChange={e => setErrorMessage(e.target.value)}
              style={{
                width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                fontSize: FONT.size.sm, fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Action Link */}
          <div>
            <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
              Action URL (e.g. Pipeline View URL)
            </label>
            <input
              type="text"
              value={actionUrl}
              onChange={e => setActionUrl(e.target.value)}
              style={{
                width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                fontSize: FONT.size.sm,
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ ...FRBC, paddingTop: SPACING.xs, borderTop: `1px solid ${COLORS.border.light}` }}>
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={sending}>
              {sending ? 'Dispatching...' : 'Dispatch Alert Now'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestSendModal;

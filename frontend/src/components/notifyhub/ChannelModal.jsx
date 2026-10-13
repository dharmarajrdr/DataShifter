import React, { useState, useEffect } from 'react';
import { Button } from '../common';
import { COLORS, FONT, BORDER_RADIUS, SPACING } from '../../constants/design';
import { FRBC, FRSC, FCSS } from '../../constants/layouts';
import { notifyHubApi, pipelineApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const ChannelModal = ({ channel, pipelines = [], onClose, onSave }) => {
  const notification = useNotification();
  const isEdit = !!channel;

  const [name, setName] = useState(channel?.name || '');
  const [channelType, setChannelType] = useState(channel?.channelType || 'SLACK');
  const [enabled, setEnabled] = useState(channel ? channel.enabled : true);

  // Configuration fields
  const [emailTo, setEmailTo] = useState('');
  const [emailFrom, setEmailFrom] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [customHeaders, setCustomHeaders] = useState('{}');
  const [selectedFields, setSelectedFields] = useState([]);
  const [availableWebhookFields, setAvailableWebhookFields] = useState([]);

  // Whitelisting options
  const [whitelistMode, setWhitelistMode] = useState('ALL'); // 'ALL', 'SPECIFIC', 'WHITELIST'
  const [singlePipelineId, setSinglePipelineId] = useState('');
  const [whitelistedPipelineIds, setWhitelistedPipelineIds] = useState([]);

  const [localPipelines, setLocalPipelines] = useState(pipelines || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pipelines && pipelines.length > 0) {
      setLocalPipelines(pipelines);
    } else {
      pipelineApi.getAll()
        .then(res => {
          if (res.data) setLocalPipelines(res.data);
        })
        .catch(() => {});
    }
  }, [pipelines]);

  useEffect(() => {
    // Load available webhook fields
    notifyHubApi.getWebhookFields()
      .then(res => {
        if (res.data) setAvailableWebhookFields(res.data);
      })
      .catch(() => {});

    if (channel) {
      try {
        const parsed = JSON.parse(channel.configJson || '{}');
        if (channel.channelType === 'EMAIL') {
          setEmailTo(Array.isArray(parsed.to) ? parsed.to.join(', ') : (parsed.to || ''));
          setEmailFrom(parsed.from || '');
        } else if (channel.channelType === 'SLACK' || channel.channelType === 'TEAMS') {
          setWebhookUrl(parsed.webhookUrl || '');
        } else if (channel.channelType === 'CLIQ') {
          setWebhookUrl(parsed.webhookUrl || '');
          setAuthToken(parsed.authToken || '');
        } else if (channel.channelType === 'WEBHOOK') {
          setWebhookUrl(parsed.endpointUrl || parsed.url || '');
          setCustomHeaders(parsed.headers ? JSON.stringify(parsed.headers, null, 2) : '{}');
          setSelectedFields(parsed.selectedFields || []);
        }
      } catch (e) {
        console.error('Failed to parse channel config', e);
      }

      if (channel.pipelineId) {
        setWhitelistMode('SPECIFIC');
        setSinglePipelineId(channel.pipelineId);
      } else if (channel.allowedPipelinesJson) {
        try {
          const list = JSON.parse(channel.allowedPipelinesJson);
          setWhitelistMode('WHITELIST');
          setWhitelistedPipelineIds(list || []);
        } catch (e) {
          setWhitelistMode('ALL');
        }
      } else {
        setWhitelistMode('ALL');
      }
    }
  }, [channel]);

  const toggleField = (key) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const togglePipelineWhitelist = (pid) => {
    setWhitelistedPipelineIds(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      notification.error('Channel configuration name is required.');
      return;
    }

    let config = {};
    if (channelType === 'EMAIL') {
      if (!emailTo.trim()) {
        notification.error('At least one recipient email address is required.');
        return;
      }
      config = {
        to: emailTo.split(/[,;\s]+/).filter(Boolean),
        from: emailFrom.trim() || undefined,
      };
    } else if (channelType === 'SLACK' || channelType === 'TEAMS') {
      if (!webhookUrl.trim()) {
        notification.error('Webhook URL is required.');
        return;
      }
      config = { webhookUrl: webhookUrl.trim() };
    } else if (channelType === 'CLIQ') {
      if (!webhookUrl.trim()) {
        notification.error('Cliq webhook URL is required.');
        return;
      }
      config = {
        webhookUrl: webhookUrl.trim(),
        authToken: authToken.trim() || undefined,
      };
    } else if (channelType === 'WEBHOOK') {
      if (!webhookUrl.trim()) {
        notification.error('Endpoint URL is required.');
        return;
      }
      let headers = {};
      try {
        headers = customHeaders ? JSON.parse(customHeaders) : {};
      } catch (err) {
        notification.error('Custom headers must be valid JSON.');
        return;
      }
      config = {
        endpointUrl: webhookUrl.trim(),
        headers,
        selectedFields: selectedFields.length > 0 ? selectedFields : undefined,
      };
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        channelType,
        enabled,
        config,
        pipelineId: whitelistMode === 'SPECIFIC' ? singlePipelineId : null,
        allowedPipelineIds: whitelistMode === 'WHITELIST' ? whitelistedPipelineIds : null,
      };

      if (isEdit) {
        await notifyHubApi.updateChannel(channel.id, payload);
        notification.success(`Updated channel "${name}" successfully`);
      } else {
        await notifyHubApi.createChannel(payload);
        notification.success(`Created channel "${name}" successfully`);
      }
      onSave();
      onClose();
    } catch (err) {
      notification.error(err.message || 'Failed to save channel');
    } finally {
      setSaving(false);
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
        width: 620,
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
              {isEdit ? 'Edit Channel Configuration' : 'Create Channel Configuration'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: FONT.size.sm, color: COLORS.text.secondary }}>
              Configure a dedicated notification destination for your team or pipeline.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: COLORS.text.tertiary, padding: '4px 8px',
            }}
          >
            <i className="fa-solid fa-xmark" style={{ fontSize: '16px' }} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: SPACING.xl, display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
          {/* Channel Name & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: SPACING.md }}>
            <div>
              <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: SPACING.xxs }}>
                Configuration Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Core Dev Team Slack, Ops Alerts"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                  borderRadius: BORDER_RADIUS.md, border: `1px solid ${COLORS.border.medium}`,
                  fontSize: FONT.size.base, outline: 'none',
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: SPACING.xxs }}>
                Status
              </label>
              <select
                value={enabled ? 'true' : 'false'}
                onChange={e => setEnabled(e.target.value === 'true')}
                style={{
                  width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                  borderRadius: BORDER_RADIUS.md, border: `1px solid ${COLORS.border.medium}`,
                  fontSize: FONT.size.base, outline: 'none', background: '#fff',
                }}
              >
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>

          {/* Channel Type */}
          <div>
            <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: SPACING.xs }}>
              Channel Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: SPACING.xs }}>
              {[
                { type: 'SLACK', label: 'Slack', icon: 'fa-brands fa-slack' },
                { type: 'EMAIL', label: 'Email', icon: 'fa-solid fa-envelope' },
                { type: 'TEAMS', label: 'Teams', icon: 'fa-solid fa-people-group' },
                { type: 'CLIQ', label: 'Cliq', icon: 'fa-solid fa-comments' },
                { type: 'WEBHOOK', label: 'Webhook', icon: 'fa-solid fa-network-wired' },
              ].map(({ type, label, icon }) => {
                const selected = channelType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setChannelType(type)}
                    style={{
                      padding: `${SPACING.sm} ${SPACING.xs}`,
                      borderRadius: BORDER_RADIUS.md,
                      border: `1.5px solid ${selected ? COLORS.brand.primary : COLORS.border.light}`,
                      background: selected ? COLORS.brand.primaryLight : COLORS.background.secondary,
                      color: selected ? COLORS.brand.primaryDark : COLORS.text.primary,
                      fontSize: FONT.size.sm,
                      fontWeight: selected ? FONT.weight.semibold : FONT.weight.regular,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <i className={icon} style={{ fontSize: '15px' }} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type Specific Fields */}
          <div style={{
            background: COLORS.background.secondary,
            padding: SPACING.md,
            borderRadius: BORDER_RADIUS.md,
            border: `1px solid ${COLORS.border.light}`,
          }}>
            {channelType === 'EMAIL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                <div>
                  <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                    Recipient Emails (comma-separated) *
                  </label>
                  <input
                    type="text"
                    placeholder="dev@company.com, alerts@company.com"
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    style={{
                      width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                      fontSize: FONT.size.sm,
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                    From Address (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="notifications@company.com"
                    value={emailFrom}
                    onChange={e => setEmailFrom(e.target.value)}
                    style={{
                      width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                      fontSize: FONT.size.sm,
                    }}
                  />
                </div>
              </div>
            )}

            {(channelType === 'SLACK' || channelType === 'TEAMS') && (
              <div>
                <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                  {channelType === 'SLACK' ? 'Slack Incoming Webhook URL *' : 'Microsoft Teams Webhook URL *'}
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  style={{
                    width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                    borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                    fontSize: FONT.size.sm,
                  }}
                  required
                />
              </div>
            )}

            {channelType === 'CLIQ' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                <div>
                  <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                    Zoho Cliq Incoming Webhook URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://cliq.zoho.com/api/v2/channelsbyname/alerts/message"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    style={{
                      width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                      fontSize: FONT.size.sm,
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                    Auth Token (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Zoho-authtoken value"
                    value={authToken}
                    onChange={e => setAuthToken(e.target.value)}
                    style={{
                      width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                      fontSize: FONT.size.sm,
                    }}
                  />
                </div>
              </div>
            )}

            {channelType === 'WEBHOOK' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
                <div>
                  <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                    Endpoint URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.external-service.com/webhooks/datashifter"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    style={{
                      width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                      fontSize: FONT.size.sm,
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                    Custom HTTP Headers (JSON format)
                  </label>
                  <textarea
                    rows={3}
                    placeholder={'{\n  "X-Webhook-Secret": "secret-token",\n  "Authorization": "Bearer ..."\n}'}
                    value={customHeaders}
                    onChange={e => setCustomHeaders(e.target.value)}
                    style={{
                      width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                      fontSize: FONT.size.xs, fontFamily: 'monospace',
                    }}
                  />
                </div>

                {/* GraphQL-style Field Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '4px' }}>
                    Payload Field Selection (GraphQL-style):
                  </label>
                  <p style={{ margin: '0 0 8px', fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
                    Choose exactly which attributes to send in the webhook body.
                  </p>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px',
                    maxHeight: 140, overflowY: 'auto', background: '#fff',
                    padding: SPACING.xs, borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.light}`,
                  }}>
                    {availableWebhookFields.map(field => (
                      <label
                        key={field.key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          fontSize: FONT.size.xs, cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFields.length === 0 ? field.defaultIncluded : selectedFields.includes(field.key)}
                          onChange={() => toggleField(field.key)}
                        />
                        <span style={{ fontWeight: FONT.weight.medium }}>{field.key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pipeline Access & Whitelisting Control */}
          <div style={{
            background: COLORS.background.primary,
            padding: SPACING.md,
            borderRadius: BORDER_RADIUS.md,
            border: `1px solid ${COLORS.border.medium}`,
          }}>
            <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, marginBottom: '2px' }}>
              Invocation Access & Pipeline Whitelisting
            </label>
            <p style={{ margin: '0 0 10px', fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
              Prevent unauthorized pipelines from invoking this channel configuration.
            </p>

            <div style={{ display: 'flex', gap: SPACING.sm, marginBottom: SPACING.md }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: FONT.size.sm, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="whitelistMode"
                  value="ALL"
                  checked={whitelistMode === 'ALL'}
                  onChange={() => setWhitelistMode('ALL')}
                />
                All Org Pipelines
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: FONT.size.sm, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="whitelistMode"
                  value="WHITELIST"
                  checked={whitelistMode === 'WHITELIST'}
                  onChange={() => setWhitelistMode('WHITELIST')}
                />
                Whitelist Multiple
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: FONT.size.sm, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="whitelistMode"
                  value="SPECIFIC"
                  checked={whitelistMode === 'SPECIFIC'}
                  onChange={() => setWhitelistMode('SPECIFIC')}
                />
                Single Pipeline Locked
              </label>
            </div>

            {whitelistMode === 'SPECIFIC' && (
              <div>
                <select
                  value={singlePipelineId}
                  onChange={e => setSinglePipelineId(e.target.value)}
                  style={{
                    width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                    borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                    fontSize: FONT.size.sm, background: '#fff',
                  }}
                  required
                >
                  <option value="">Select pipeline to lock to...</option>
                  {localPipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
                </select>
                {localPipelines.length === 0 && (
                  <p style={{ margin: '6px 0 0', fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                    No pipelines available in this organization yet.
                  </p>
                )}
              </div>
            )}

            {whitelistMode === 'WHITELIST' && (
              <div style={{
                maxHeight: 140, overflowY: 'auto', background: COLORS.background.secondary,
                padding: SPACING.xs, borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.light}`,
                display: 'flex', flexDirection: 'column', gap: '4px',
              }}>
                {localPipelines.length === 0 ? (
                  <p style={{ margin: 0, padding: SPACING.xs, fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
                    No pipelines found in this organization to whitelist.
                  </p>
                ) : (
                  localPipelines.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: FONT.size.xs, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={whitelistedPipelineIds.includes(p.id)}
                        onChange={() => togglePipelineWhitelist(p.id)}
                      />
                      <span style={{ fontWeight: FONT.weight.medium }}>{p.name}</span>
                      <span style={{ color: COLORS.text.tertiary }}>({p.id})</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ ...FRBC, paddingTop: SPACING.xs, borderTop: `1px solid ${COLORS.border.light}` }}>
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Channel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChannelModal;

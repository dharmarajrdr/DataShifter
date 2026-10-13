import React, { useState, useEffect } from 'react';
import { Button, MultiSelectDropdown, Toggle } from '../common';
import { COLORS, FONT, BORDER_RADIUS, SPACING } from '../../constants/design';
import { FRBC, FRSC, FCSS } from '../../constants/layouts';
import { notifyHubApi, pipelineApi, workflowApi, connectionApi, udfApi } from '../../services/api';
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

  // Whitelisting options: list of selected resource tokens / IDs
  const [selectedResources, setSelectedResources] = useState(['ALL']); // 'ALL' or array of keys/IDs
  const [availableResources, setAvailableResources] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch all platform resources for whitelist dropdown
    Promise.all([
      pipelineApi.getAll().catch(() => ({ data: [] })),
      workflowApi.getAll().catch(() => ({ data: [] })),
      connectionApi.getAll().catch(() => ({ data: [] })),
      udfApi.getAll().catch(() => ({ data: [] })),
    ]).then(([pipeRes, wfRes, connRes, udfRes]) => {
      const pipes = Array.isArray(pipeRes) ? pipeRes : (pipeRes?.data || []);
      const wfs = Array.isArray(wfRes) ? wfRes : (wfRes?.data || []);
      const conns = Array.isArray(connRes) ? connRes : (connRes?.data || []);
      const udfs = Array.isArray(udfRes) ? udfRes : (udfRes?.data || []);

      const groupedOptions = [
        // Category headers & wildcard options
        { isHeader: true, label: 'Global Platform Scopes' },
        { value: 'ALL', label: 'All Resources (Entire Platform)', sublabel: 'Allows pipelines, workflows, udfs, connections, setup, and Beetel' },
        { value: 'RESOURCE:WORKFLOW', label: 'All Workflows', sublabel: 'Allows all workflow orchestrations' },
        { value: 'RESOURCE:PIPELINE', label: 'All Pipelines', sublabel: 'Allows all data pipelines' },
        { value: 'RESOURCE:UDF', label: 'All UDFs', sublabel: 'Allows all User-Defined transformation functions' },
        { value: 'RESOURCE:CONNECTION', label: 'All Database Connections', sublabel: 'Allows all source and target connectors' },
        { value: 'RESOURCE:SETUP', label: 'All Organization Setup', sublabel: 'Allows system quotas, billing, and settings updates' },
        { value: 'RESOURCE:BEETEL', label: 'All Beetel AI Agent', sublabel: 'Allows autonomous Beetel sessions and plans' },

        // Workflows items
        ...(wfs.length > 0 ? [{ isHeader: true, label: `Specific Workflows (${wfs.length})` }] : []),
        ...wfs.map(w => ({ value: w.id, label: w.name, sublabel: `Workflow • ${w.id}` })),

        // Pipelines items
        ...(pipes.length > 0 ? [{ isHeader: true, label: `Specific Pipelines (${pipes.length})` }] : []),
        ...pipes.map(p => ({ value: p.id, label: p.name, sublabel: `Pipeline • ${p.id}` })),

        // UDF items
        ...(udfs.length > 0 ? [{ isHeader: true, label: `Specific UDFs (${udfs.length})` }] : []),
        ...udfs.map(u => ({ value: u.id, label: u.name, sublabel: `UDF JAR • ${u.id}` })),

        // Connection items
        ...(conns.length > 0 ? [{ isHeader: true, label: `Specific Connections (${conns.length})` }] : []),
        ...conns.map(c => ({ value: c.id, label: c.name, sublabel: `${c.type || 'Connection'} • ${c.id}` })),
      ];

      setAvailableResources(groupedOptions);
    });
  }, []);

  useEffect(() => {
    // Load available webhook fields
    notifyHubApi.getWebhookFields()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (list.length > 0) setAvailableWebhookFields(list);
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

      // Restore allowed resources from channel
      if (channel.allowedResourcesJson) {
        try {
          const list = JSON.parse(channel.allowedResourcesJson);
          setSelectedResources(Array.isArray(list) && list.length > 0 ? list : ['ALL']);
        } catch (e) {
          setSelectedResources(['ALL']);
        }
      } else if (channel.pipelineId) {
        setSelectedResources([channel.pipelineId]);
      } else if (channel.allowedPipelinesJson) {
        try {
          const list = JSON.parse(channel.allowedPipelinesJson);
          setSelectedResources(Array.isArray(list) && list.length > 0 ? list : ['ALL']);
        } catch (e) {
          setSelectedResources(['ALL']);
        }
      } else {
        setSelectedResources(['ALL']);
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
        allowedResources: selectedResources.length > 0 ? selectedResources : ['ALL'],
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: SPACING.md, alignItems: 'center' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 100 }}>
              <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: SPACING.xxs }}>
                Status
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '38px' }}>
                <Toggle checked={enabled} onChange={setEnabled} />
                <span style={{
                  fontSize: FONT.size.xs,
                  fontWeight: FONT.weight.medium,
                  color: enabled ? COLORS.status.connected : COLORS.text.tertiary,
                }}>
                  {enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
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
              Resource Whitelist & Invocation Access Control
            </label>
            <p style={{ margin: '0 0 10px', fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
              Allow all resources across the organization, entire resource types (e.g. all workflows, all pipelines, all UDFs, etc.), or specific resource items.
            </p>

            <div>
              <MultiSelectDropdown
                options={availableResources}
                value={selectedResources}
                onChange={setSelectedResources}
                placeholder="Select resources to authorize..."
                searchPlaceholder="Search all resources (workflows, pipelines, udfs, connections...)"
                emptyMessage="No matching platform resources found."
              />
              <div style={{ margin: '8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: COLORS.text.tertiary }}>
                <span>
                  {selectedResources.includes('ALL')
                    ? 'Global access: Channel can be invoked by any pipeline, workflow, UDF, connector, or Beetel agent.'
                    : `${selectedResources.length} resource scope(s) or item(s) whitelisted.`}
                </span>
                {!selectedResources.includes('ALL') && (
                  <button
                    type="button"
                    onClick={() => setSelectedResources(['ALL'])}
                    style={{ background: 'none', border: 'none', color: COLORS.brand.primary, cursor: 'pointer', padding: 0, fontSize: '11px' }}
                  >
                    Reset to All Resources
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ ...FRBC, paddingTop: SPACING.xs, borderTop: `1px solid ${COLORS.border.light}` }}>
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }} />
                  Saving...
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Create Channel'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChannelModal;

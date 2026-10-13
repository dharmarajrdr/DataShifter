import React, { useState, useEffect } from 'react';
import { PageHeader, Button, StatusBadge, ConfirmationModal, Loader } from '../components/common';
import { COLORS, FONT, BORDER_RADIUS, SPACING } from '../constants/design';
import { FRBC, FRSC, FCSS } from '../constants/layouts';
import { notifyHubApi, pipelineApi } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import ChannelModal from '../components/notifyhub/ChannelModal';
import TemplateModal from '../components/notifyhub/TemplateModal';
import TestSendModal from '../components/notifyhub/TestSendModal';

const NotifyHubPage = () => {
  const notification = useNotification();

  const [activeTab, setActiveTab] = useState('channels'); // 'channels', 'templates', 'logs'
  const [channels, setChannels] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showTestSendModal, setShowTestSendModal] = useState(false);

  // Delete confirmations
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'channel' or 'template'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [channelTypeFilter, setChannelTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [chRes, tmplRes, logsRes, pipeRes] = await Promise.all([
        notifyHubApi.listChannels().catch(() => ({ data: [] })),
        notifyHubApi.listTemplates().catch(() => ({ data: [] })),
        notifyHubApi.getLogs().catch(() => ({ data: [] })),
        pipelineApi.getAll().catch(() => ({ data: [] })),
      ]);

      setChannels(Array.isArray(chRes) ? chRes : (chRes.data || []));
      setTemplates(Array.isArray(tmplRes) ? tmplRes : (tmplRes.data || []));
      setLogs(Array.isArray(logsRes) ? logsRes : (logsRes.data || []));
      setPipelines(Array.isArray(pipeRes) ? pipeRes : (pipeRes.data || []));
    } catch (err) {
      console.error('Failed to load NotifyHub data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!itemToDelete || !deleteType) return;
    setDeleting(true);
    try {
      if (deleteType === 'channel') {
        await notifyHubApi.deleteChannel(itemToDelete.id);
        notification.success(`Deleted channel "${itemToDelete.name}" successfully`);
      } else {
        await notifyHubApi.deleteTemplate(itemToDelete.id);
        notification.success(`Deleted template "${itemToDelete.name}" successfully`);
      }
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      setDeleteType(null);
      loadData();
    } catch (err) {
      notification.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteChannel = (channel) => {
    setItemToDelete(channel);
    setDeleteType('channel');
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTemplate = (template) => {
    setItemToDelete(template);
    setDeleteType('template');
    setShowDeleteConfirm(true);
  };

  const filteredChannels = channels.filter(ch => {
    if (channelTypeFilter !== 'ALL' && ch.channelType !== channelTypeFilter) return false;
    if (searchQuery && !ch.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredTemplates = templates.filter(t => {
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: SPACING.xxxl }}>
      {/* Page Header */}
      <div style={{ ...FRBC, marginBottom: SPACING.lg }}>
        <div>
          <h1 style={{ margin: 0, fontSize: FONT.size.xxl, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
            NotifyHub
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: FONT.size.sm, color: COLORS.text.secondary }}>
            Centralized notification manager for channels (Email, Slack, Teams, Cliq, Webhooks), reusable templates, and failure alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: SPACING.sm }}>
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh NotifyHub data"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} style={{ fontSize: '13px' }} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => setShowTestSendModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-bell" style={{ fontSize: '13px' }} />
            <span>Test & Send Alert</span>
          </Button>

          {activeTab === 'channels' && (
            <Button
              variant="primary"
              onClick={() => { setEditingChannel(null); setShowChannelModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fa-solid fa-plus" style={{ fontSize: '12px' }} />
              <span>New Channel</span>
            </Button>
          )}

          {activeTab === 'templates' && (
            <Button
              variant="primary"
              onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fa-solid fa-plus" style={{ fontSize: '12px' }} />
              <span>New Template</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div style={{
        ...FRBC,
        borderBottom: `1px solid ${COLORS.border.light}`,
        marginBottom: SPACING.xl,
        paddingBottom: SPACING.xs,
      }}>
        <div style={{ display: 'flex', gap: SPACING.md }}>
          {[
            { key: 'channels', label: `Channels (${channels.length})` },
            { key: 'templates', label: `Templates (${templates.length})` },
            { key: 'logs', label: `Delivery Logs (${logs.length})` },
          ].map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: `${SPACING.xs} ${SPACING.sm}`,
                  fontSize: FONT.size.base,
                  fontWeight: active ? FONT.weight.semibold : FONT.weight.regular,
                  color: active ? COLORS.brand.primary : COLORS.text.secondary,
                  borderBottom: active ? `2px solid ${COLORS.brand.primary}` : '2px solid transparent',
                  marginBottom: '-5px',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: SPACING.sm, alignItems: 'center' }}>
          {activeTab === 'channels' && (
            <select
              value={channelTypeFilter}
              onChange={e => setChannelTypeFilter(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: BORDER_RADIUS.md,
                border: `1px solid ${COLORS.border.medium}`, fontSize: FONT.size.xs,
                background: '#fff',
              }}
            >
              <option value="ALL">All Types</option>
              <option value="SLACK">Slack</option>
              <option value="EMAIL">Email</option>
              <option value="TEAMS">Teams</option>
              <option value="CLIQ">Cliq</option>
              <option value="WEBHOOK">Webhook</option>
            </select>
          )}

          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: BORDER_RADIUS.md,
              border: `1px solid ${COLORS.border.medium}`, fontSize: FONT.size.xs,
              outline: 'none', width: 180,
            }}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <Loader message="Loading NotifyHub configurations..." height="40vh" />
      ) : (
        <>
          {/* TAB CONTENT: CHANNELS */}
          {activeTab === 'channels' && (
            <div>
              {filteredChannels.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: `${SPACING.xxxl} ${SPACING.xl}`,
                  background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.lg,
                  border: `1px dashed ${COLORS.border.medium}`,
                }}>
                  <p style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, color: COLORS.text.primary, margin: 0 }}>
                    No notification channels configured
                  </p>
                  <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '4px' }}>
                Add your team's Slack, Email, Microsoft Teams, Zoho Cliq or custom Webhook endpoints.
              </p>
              <Button
                variant="primary"
                onClick={() => { setEditingChannel(null); setShowChannelModal(true); }}
                style={{ marginTop: SPACING.md }}
              >
                + Create Channel Configuration
              </Button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: SPACING.md }}>
              {filteredChannels.map(ch => {
                let parsedConfig = {};
                try { parsedConfig = JSON.parse(ch.configJson || '{}'); } catch(e) {}
                let whitelistInfo = 'All pipelines in organization';
                if (ch.pipelineId) {
                  whitelistInfo = `Locked to pipeline: ${ch.pipelineId}`;
                } else if (ch.allowedPipelinesJson) {
                  try {
                    const ids = JSON.parse(ch.allowedPipelinesJson);
                    whitelistInfo = `Whitelisted pipelines (${ids.length}): ${ids.join(', ')}`;
                  } catch(e) {}
                }

                return (
                  <div
                    key={ch.id}
                    style={{
                      background: COLORS.background.primary,
                      border: `1px solid ${COLORS.border.light}`,
                      borderRadius: BORDER_RADIUS.lg,
                      padding: SPACING.lg,
                      display: 'flex', flexDirection: 'column', gap: SPACING.sm,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ ...FRBC }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: BORDER_RADIUS.pill,
                          fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold,
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: ch.channelType === 'SLACK' ? '#4A154B15' :
                                      ch.channelType === 'EMAIL' ? '#2563EB15' :
                                      ch.channelType === 'TEAMS' ? '#6264A715' :
                                      ch.channelType === 'CLIQ' ? '#1D9E7515' : '#D85A3015',
                          color: ch.channelType === 'SLACK' ? '#4A154B' :
                                 ch.channelType === 'EMAIL' ? '#2563EB' :
                                 ch.channelType === 'TEAMS' ? '#6264A7' :
                                 ch.channelType === 'CLIQ' ? '#0F6E56' : '#A32D2D',
                        }}>
                          <i className={
                            ch.channelType === 'SLACK' ? 'fa-brands fa-slack' :
                            ch.channelType === 'EMAIL' ? 'fa-solid fa-envelope' :
                            ch.channelType === 'TEAMS' ? 'fa-solid fa-people-group' :
                            ch.channelType === 'CLIQ' ? 'fa-solid fa-comments' :
                            'fa-solid fa-network-wired'
                          } style={{ fontSize: '11px' }} />
                          {ch.channelType}
                        </span>
                        <h4 style={{ margin: 0, fontSize: FONT.size.base, fontWeight: FONT.weight.semibold }}>
                          {ch.name}
                        </h4>
                      </div>

                      <StatusBadge status={ch.enabled ? 'CONNECTED' : 'PAUSED'} />
                    </div>

                    <div style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {ch.channelType === 'EMAIL' && (
                        <div><strong>Recipients:</strong> {Array.isArray(parsedConfig.to) ? parsedConfig.to.join(', ') : parsedConfig.to || '—'}</div>
                      )}
                      {(ch.channelType === 'SLACK' || ch.channelType === 'TEAMS' || ch.channelType === 'CLIQ' || ch.channelType === 'WEBHOOK') && (
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <strong>URL:</strong> {parsedConfig.webhookUrl || parsedConfig.endpointUrl || parsedConfig.url || '—'}
                        </div>
                      )}
                      <div>
                        <strong>Access:</strong> <span style={{ color: COLORS.brand.primary }}>{whitelistInfo}</span>
                      </div>
                    </div>

                    <div style={{ ...FRBC, marginTop: 'auto', paddingTop: SPACING.sm, borderTop: `1px solid ${COLORS.border.light}` }}>
                      <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                        ID: {ch.id.slice(0, 8)}...
                      </span>

                      <div style={{ display: 'flex', gap: SPACING.xs }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => { setEditingChannel(ch); setShowChannelModal(true); }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => confirmDeleteChannel(ch)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: TEMPLATES */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
          {filteredTemplates.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: `${SPACING.xxxl} ${SPACING.xl}`,
              background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.lg,
              border: `1px dashed ${COLORS.border.medium}`,
            }}>
              <p style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, color: COLORS.text.primary, margin: 0 }}>
                No custom templates created yet
              </p>
              <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '4px' }}>
                Default templates are active. Create custom templates to standardize alert messaging for your team.
              </p>
              <Button
                variant="primary"
                onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}
                style={{ marginTop: SPACING.md }}
              >
                + Create Notification Template
              </Button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: SPACING.md }}>
              {filteredTemplates.map(tmpl => (
                <div
                  key={tmpl.id}
                  style={{
                    background: COLORS.background.primary,
                    border: `1px solid ${COLORS.border.light}`,
                    borderRadius: BORDER_RADIUS.lg,
                    padding: SPACING.lg,
                    display: 'flex', flexDirection: 'column', gap: SPACING.sm,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ ...FRBC }}>
                    <h4 style={{ margin: 0, fontSize: FONT.size.base, fontWeight: FONT.weight.semibold }}>
                      {tmpl.name}
                    </h4>
                    <span style={{
                      padding: '2px 8px', borderRadius: BORDER_RADIUS.pill,
                      fontSize: FONT.size.xs, background: COLORS.background.secondary,
                      color: COLORS.text.secondary,
                    }}>
                      {tmpl.eventType || 'CUSTOM'}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: FONT.size.xs, color: COLORS.text.secondary, minHeight: 18 }}>
                    {tmpl.description || 'No description provided'}
                  </p>

                  <div style={{
                    background: COLORS.background.secondary,
                    padding: SPACING.xs, borderRadius: BORDER_RADIUS.sm,
                    fontSize: FONT.size.xs, fontFamily: 'monospace',
                    maxHeight: 70, overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {tmpl.bodyTemplate}
                  </div>

                  <div style={{ ...FRBC, marginTop: 'auto', paddingTop: SPACING.sm, borderTop: `1px solid ${COLORS.border.light}` }}>
                    <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                      Subject: {tmpl.subjectTemplate ? tmpl.subjectTemplate.slice(0, 24) + '...' : 'Default'}
                    </span>

                    <div style={{ display: 'flex', gap: SPACING.xs }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setEditingTemplate(tmpl); setShowTemplateModal(true); }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => confirmDeleteTemplate(tmpl)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: DELIVERY LOGS */}
      {activeTab === 'logs' && (
        <div style={{
          background: COLORS.background.primary,
          border: `1px solid ${COLORS.border.light}`,
          borderRadius: BORDER_RADIUS.lg,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: FONT.size.sm }}>
            <thead>
              <tr style={{ background: COLORS.background.secondary, borderBottom: `1px solid ${COLORS.border.light}` }}>
                <th style={{ padding: `${SPACING.sm} ${SPACING.md}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Status</th>
                <th style={{ padding: `${SPACING.sm} ${SPACING.md}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Channel</th>
                <th style={{ padding: `${SPACING.sm} ${SPACING.md}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Type</th>
                <th style={{ padding: `${SPACING.sm} ${SPACING.md}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Pipeline</th>
                <th style={{ padding: `${SPACING.sm} ${SPACING.md}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Template</th>
                <th style={{ padding: `${SPACING.sm} ${SPACING.md}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Attempts</th>
                <th style={{ padding: `${SPACING.sm} ${SPACING.md}`, fontWeight: FONT.weight.medium, color: COLORS.text.secondary }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: SPACING.xl, textAlign: 'center', color: COLORS.text.secondary }}>
                    No delivery audit logs recorded yet. Use "Test & Send Alert" above to trigger a notification.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${COLORS.border.light}` }}>
                    <td style={{ padding: `${SPACING.sm} ${SPACING.md}` }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: BORDER_RADIUS.pill,
                        fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold,
                        background: log.status === 'SENT' ? COLORS.status.successLight :
                                    log.status === 'FAILED' ? COLORS.status.errorLight : COLORS.status.warningLight,
                        color: log.status === 'SENT' ? COLORS.status.successText :
                               log.status === 'FAILED' ? COLORS.status.errorText : COLORS.status.warningText,
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: `${SPACING.sm} ${SPACING.md}`, fontWeight: FONT.weight.medium }}>
                      {log.channelName}
                    </td>
                    <td style={{ padding: `${SPACING.sm} ${SPACING.md}` }}>
                      {log.channelType}
                    </td>
                    <td style={{ padding: `${SPACING.sm} ${SPACING.md}`, color: COLORS.text.secondary }}>
                      {log.pipelineId || 'Global (Org)'}
                    </td>
                    <td style={{ padding: `${SPACING.sm} ${SPACING.md}` }}>
                      {log.templateName || 'pipeline-failure-alert'}
                    </td>
                    <td style={{ padding: `${SPACING.sm} ${SPACING.md}` }}>
                      {log.attemptCount}
                    </td>
                    <td style={{ padding: `${SPACING.sm} ${SPACING.md}`, color: COLORS.text.tertiary }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      {/* MODALS */}
      {showChannelModal && (
        <ChannelModal
          channel={editingChannel}
          pipelines={pipelines}
          onClose={() => { setShowChannelModal(false); setEditingChannel(null); }}
          onSave={loadData}
        />
      )}

      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
          onSave={loadData}
        />
      )}

      {showTestSendModal && (
        <TestSendModal
          channels={channels}
          templates={templates}
          pipelines={pipelines}
          onClose={() => setShowTestSendModal(false)}
          onSent={() => { setActiveTab('logs'); loadData(); }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmationModal
          title={`Delete ${deleteType === 'channel' ? 'Channel' : 'Template'}`}
          message={`Are you sure you want to permanently delete "${itemToDelete?.name}"?`}
          confirmLabel={deleting ? 'Deleting...' : 'Delete'}
          danger
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteConfirm(false); setItemToDelete(null); }}
        />
      )}
    </div>
  );
};

export default NotifyHubPage;

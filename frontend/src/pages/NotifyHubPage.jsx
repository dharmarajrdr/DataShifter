import React, { useState, useEffect } from 'react';
import { PageHeader, Button, StatusBadge, ConfirmationModal, Loader } from '../components/common';
import { COLORS, FONT, BORDER_RADIUS, SPACING } from '../constants/design';
import { FRBC, FRSC, FCSS } from '../constants/layouts';
import { notifyHubApi, pipelineApi } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import ChannelModal from '../components/notifyhub/ChannelModal';
import TemplateModal from '../components/notifyhub/TemplateModal';
import EventListenerModal, { EVENT_CATALOG } from '../components/notifyhub/EventListenerModal';

const NotifyHubPage = () => {
  const notification = useNotification();

  const [activeTab, setActiveTab] = useState('listeners'); // 'listeners', 'channels', 'templates'
  const [channels, setChannels] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [listeners, setListeners] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showListenerModal, setShowListenerModal] = useState(false);
  const [editingListener, setEditingListener] = useState(null);

  // Delete confirmations
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'channel', 'template', 'listener'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [channelTypeFilter, setChannelTypeFilter] = useState('ALL');
  const [listenerResourceFilter, setListenerResourceFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [chRes, tmplRes, listRes, pipeRes] = await Promise.all([
        notifyHubApi.listChannels().catch(() => ({ data: [] })),
        notifyHubApi.listTemplates().catch(() => ({ data: [] })),
        notifyHubApi.listListeners().catch(() => ({ data: [] })),
        pipelineApi.getAll().catch(() => ({ data: [] })),
      ]);

      setChannels(Array.isArray(chRes) ? chRes : (chRes.data || []));
      setTemplates(Array.isArray(tmplRes) ? tmplRes : (tmplRes.data || []));
      setListeners(Array.isArray(listRes) ? listRes : (listRes.data || []));
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
      } else if (deleteType === 'template') {
        await notifyHubApi.deleteTemplate(itemToDelete.id);
        notification.success(`Deleted template "${itemToDelete.name}" successfully`);
      } else if (deleteType === 'listener') {
        await notifyHubApi.deleteListener(itemToDelete.id);
        notification.success(`Deleted event listener "${itemToDelete.name}" successfully`);
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

  const confirmDeleteListener = (listener) => {
    setItemToDelete(listener);
    setDeleteType('listener');
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

  const filteredListeners = listeners.filter(l => {
    if (listenerResourceFilter !== 'ALL' && l.resourceType !== listenerResourceFilter) return false;
    if (searchQuery) {
      const matchName = l.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchKey = l.eventKey?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchName && !matchKey) return false;
    }
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
            Centralized notification manager for channels, reusable templates, and multi-resource event listeners.
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

          {activeTab === 'listeners' && (
            <Button
              variant="primary"
              onClick={() => { setEditingListener(null); setShowListenerModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fa-solid fa-plus" style={{ fontSize: '12px' }} />
              <span>New Event Listener</span>
            </Button>
          )}

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
            { key: 'listeners', label: `Event Listeners (${listeners.length})` },
            { key: 'channels', label: `Channels (${channels.length})` },
            { key: 'templates', label: `Templates (${templates.length})` },
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
          {activeTab === 'listeners' && (
            <select
              value={listenerResourceFilter}
              onChange={e => setListenerResourceFilter(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: BORDER_RADIUS.md,
                border: `1px solid ${COLORS.border.medium}`, fontSize: FONT.size.xs,
                background: '#fff',
              }}
            >
              <option value="ALL">All Resources</option>
              <option value="PIPELINE">Pipeline</option>
              <option value="WORKFLOW">Workflow</option>
              <option value="UDF">UDF</option>
              <option value="CONNECTION">Connection</option>
              <option value="SETUP">Setup</option>
              <option value="BEETEL">Beetel</option>
            </select>
          )}

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
          {/* TAB CONTENT: EVENT LISTENERS */}
          {activeTab === 'listeners' && (
            <div>
              {filteredListeners.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: `${SPACING.xxxl} ${SPACING.xl}`,
                  background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.lg,
                  border: `1px dashed ${COLORS.border.medium}`,
                }}>
                  <p style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium, color: COLORS.text.primary, margin: 0 }}>
                    No event listeners configured
                  </p>
                  <p style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, marginTop: '4px' }}>
                    Listen to platform lifecycle events (pipeline completed, udf removed, connection edited, setup updates, beetel plan, etc.) and configure notification delivery.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => { setEditingListener(null); setShowListenerModal(true); }}
                    style={{ marginTop: SPACING.md }}
                  >
                    + Add Event Listener
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: SPACING.md }}>
                  {filteredListeners.map(l => {
                    const matchedChannel = channels.find(c => c.id === l.channelId);
                    const matchedTemplate = templates.find(t => t.id === l.templateId);
                    const cat = EVENT_CATALOG.find(c => c.resourceType === l.resourceType);

                    return (
                      <div
                        key={l.id}
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
                              background: COLORS.brand.primary + '15',
                              color: COLORS.brand.primary,
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                            }}>
                              <i className={cat?.icon || 'fa-solid fa-bell'} style={{ fontSize: '11px' }} />
                              {l.resourceType}
                            </span>
                            <h4 style={{ margin: 0, fontSize: FONT.size.base, fontWeight: FONT.weight.semibold }}>
                              {l.name}
                            </h4>
                          </div>

                          <StatusBadge status={l.enabled ? 'ACTIVE' : 'PAUSED'} />
                        </div>

                        <div style={{
                          padding: '6px 10px', borderRadius: BORDER_RADIUS.sm,
                          background: COLORS.background.secondary,
                          fontSize: FONT.size.xs, fontFamily: 'monospace',
                          color: COLORS.text.primary, fontWeight: FONT.weight.semibold,
                        }}>
                          on "{l.resourceType.toLowerCase()}" "{l.eventAction.toLowerCase()}" <span style={{ color: COLORS.text.tertiary, fontWeight: 'normal' }}>({l.eventKey})</span>
                        </div>

                        {l.description && (
                          <p style={{ margin: 0, fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
                            {l.description}
                          </p>
                        )}

                        <div style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, display: 'flex', flexDirection: 'column', gap: '4px', marginTop: 'auto' }}>
                          <div>
                            <strong>Channel:</strong>{' '}
                            {matchedChannel ? (
                              <span>{matchedChannel.name} ({matchedChannel.channelType})</span>
                            ) : (
                              <span style={{ color: COLORS.status.error }}>Missing / Deleted channel ({l.channelId.slice(0, 8)}...)</span>
                            )}
                          </div>
                          <div>
                            <strong>Template:</strong>{' '}
                            {matchedTemplate ? matchedTemplate.name : 'Built-in Standard Format'}
                          </div>
                          <div>
                            <strong>Monitored Resources:</strong>{' '}
                            {(() => {
                              let resources = ['ALL'];
                              if (l.targetResourceIdsJson) {
                                try {
                                  const parsed = JSON.parse(l.targetResourceIdsJson);
                                  if (Array.isArray(parsed) && parsed.length > 0) resources = parsed;
                                } catch (e) {}
                              } else if (l.filterResourceId) {
                                resources = [l.filterResourceId];
                              }
                              if (resources.includes('ALL')) {
                                return <span style={{ color: COLORS.brand.primary }}>All {l.resourceType.toLowerCase()}s (*)</span>;
                              }
                              return <span>{resources.length} specific {l.resourceType.toLowerCase()}(s)</span>;
                            })()}
                          </div>
                        </div>

                        <div style={{ ...FRBC, paddingTop: SPACING.sm, borderTop: `1px solid ${COLORS.border.light}` }}>
                          <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                            ID: {l.id.slice(0, 8)}...
                          </span>

                          <div style={{ display: 'flex', gap: SPACING.xs }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => { setEditingListener(l); setShowListenerModal(true); }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => confirmDeleteListener(l)}
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
                let whitelistInfo = 'All platform resources (entire organization)';
                if (ch.allowedResourcesJson) {
                  try {
                    const resList = JSON.parse(ch.allowedResourcesJson);
                    if (resList.includes('ALL')) {
                      whitelistInfo = 'All platform resources';
                    } else {
                      whitelistInfo = `Whitelisted scopes (${resList.length}): ${resList.join(', ')}`;
                    }
                  } catch(e) {}
                } else if (ch.pipelineId) {
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

      {showListenerModal && (
        <EventListenerModal
          listener={editingListener}
          channels={channels}
          templates={templates}
          onClose={() => { setShowListenerModal(false); setEditingListener(null); }}
          onSave={loadData}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={`Delete ${deleteType === 'channel' ? 'Channel' : 'Template'}`}
        message={`Are you sure you want to permanently delete "${itemToDelete?.name}"? This action cannot be undone.`}
        color={COLORS.status.error}
        onClose={() => {
          if (!deleting) {
            setShowDeleteConfirm(false);
            setItemToDelete(null);
          }
        }}
        actions={[
          {
            label: 'Cancel',
            variant: 'secondary',
            onClick: () => {
              setShowDeleteConfirm(false);
              setItemToDelete(null);
            },
            disabled: deleting,
          },
          {
            label: deleting ? 'Deleting...' : 'Delete',
            variant: 'danger',
            onClick: handleDelete,
            disabled: deleting,
            loading: deleting,
          },
        ]}
      />
    </div>
  );
};

export default NotifyHubPage;

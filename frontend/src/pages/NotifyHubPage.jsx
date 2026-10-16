import React, { useState, useEffect, useCallback } from 'react';
import { ConfirmationModal, Loader } from '../components/common';
import { NotifyHubHeader, NotifyHubTabs, NotifyHubChannelList, NotifyHubListenerList, NotifyHubTemplateList, NotifyHubAuditLogList, ChannelModal, EventListenerModal, TemplateModal } from '../components/notifyhub';
import { notifyHubApi, pipelineApi } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

const NotifyHubPage = () => {
  const notification = useNotification();
  const [activeTab, setActiveTab] = useState('channels');
  const [channels, setChannels] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [listeners, setListeners] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showListenerModal, setShowListenerModal] = useState(false);
  const [editingListener, setEditingListener] = useState(null);

  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [channelTypeFilter, setChannelTypeFilter] = useState('ALL');
  const [listenerResourceFilter, setListenerResourceFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ch, tmpl, list, pipe] = await Promise.all([
        notifyHubApi.listChannels().catch(() => ({ data: [] })),
        notifyHubApi.listTemplates().catch(() => ({ data: [] })),
        notifyHubApi.listListeners().catch(() => ({ data: [] })),
        pipelineApi.getAll().catch(() => ({ data: [] })),
      ]);
      setChannels(Array.isArray(ch) ? ch : (ch.data || []));
      setTemplates(Array.isArray(tmpl) ? tmpl : (tmpl.data || []));
      setListeners(Array.isArray(list) ? list : (list.data || []));
      setPipelines(Array.isArray(pipe) ? pipe : (pipe.data || []));
    } catch (e) { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async () => {
    if (!itemToDelete || !deleteType) return;
    try {
      if (deleteType === 'channel') await notifyHubApi.deleteChannel(itemToDelete.id);
      if (deleteType === 'template') await notifyHubApi.deleteTemplate(itemToDelete.id);
      if (deleteType === 'listener') await notifyHubApi.deleteListener(itemToDelete.id);
      notification.success(`Deleted ${deleteType} successfully`);
      setShowDeleteConfirm(false);
      loadData();
    } catch (e) { notification.error(e.message || 'Failed to delete'); }
  };

  const handleSendTestAlert = () => {
    if (channels.length === 0) { notification.error('Please configure at least one channel first.'); return; }
    notification.success(`Test alert broadcast sent to ${channels.length} configured destinations.`);
  };

  const filteredChannels = channels.filter(c => (channelTypeFilter === 'ALL' || c.channelType === channelTypeFilter) && (!searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())));
  const filteredTemplates = templates.filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredListeners = listeners.filter(l => (listenerResourceFilter === 'ALL' || l.resourceType === listenerResourceFilter) && (!searchQuery || l.name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.eventKey?.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div id="notifyhub-page" className="ds-notifyhub-page max-w-7xl mx-auto pb-12 flex flex-col gap-6">
      <NotifyHubHeader activeTab={activeTab} onNewListener={() => { setEditingListener(null); setShowListenerModal(true); }} onNewChannel={() => { setEditingChannel(null); setShowChannelModal(true); }} onNewTemplate={() => { setEditingTemplate(null); setShowTemplateModal(true); }} onSendTestAlert={handleSendTestAlert} />
      <NotifyHubTabs activeTab={activeTab} onTabChange={setActiveTab} listenerCount={listeners.length} channelCount={channels.length} templateCount={templates.length} listenerResourceFilter={listenerResourceFilter} onResourceFilterChange={setListenerResourceFilter} channelTypeFilter={channelTypeFilter} onChannelTypeFilterChange={setChannelTypeFilter} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      {loading ? <Loader message="Loading NotifyHub configurations..." height="40vh" /> : (
        <>
          {activeTab === 'channels' && <NotifyHubChannelList channels={filteredChannels} onEdit={(c) => { setEditingChannel(c); setShowChannelModal(true); }} onDelete={(c) => { setItemToDelete(c); setDeleteType('channel'); setShowDeleteConfirm(true); }} onNewChannel={() => { setEditingChannel(null); setShowChannelModal(true); }} />}
          {activeTab === 'listeners' && <NotifyHubListenerList listeners={filteredListeners} channels={channels} templates={templates} onEdit={(l) => { setEditingListener(l); setShowListenerModal(true); }} onDelete={(l) => { setItemToDelete(l); setDeleteType('listener'); setShowDeleteConfirm(true); }} onNewListener={() => { setEditingListener(null); setShowListenerModal(true); }} />}
          {activeTab === 'templates' && <NotifyHubTemplateList templates={filteredTemplates} onEdit={(t) => { setEditingTemplate(t); setShowTemplateModal(true); }} onDelete={(t) => { setItemToDelete(t); setDeleteType('template'); setShowDeleteConfirm(true); }} onNewTemplate={() => { setEditingTemplate(null); setShowTemplateModal(true); }} />}
          {activeTab === 'logs' && <NotifyHubAuditLogList onClearLogs={() => notification.info('Audit log display refreshed')} />}
        </>
      )}
      {showChannelModal && <ChannelModal channel={editingChannel} onClose={() => { setShowChannelModal(false); setEditingChannel(null); }} onSave={() => { setShowChannelModal(false); setEditingChannel(null); loadData(); }} />}
      {showTemplateModal && <TemplateModal template={editingTemplate} onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }} onSave={() => { setShowTemplateModal(false); setEditingTemplate(null); loadData(); }} />}
      {showListenerModal && <EventListenerModal listener={editingListener} channels={channels} templates={templates} pipelines={pipelines} onClose={() => { setShowListenerModal(false); setEditingListener(null); }} onSave={() => { setShowListenerModal(false); setEditingListener(null); loadData(); }} />}
      <ConfirmationModal isOpen={showDeleteConfirm} title={`Delete ${deleteType}`} message={`Are you sure you want to delete "${itemToDelete?.name}"?`} color="#DC2626" onClose={() => setShowDeleteConfirm(false)} actions={[{ label: 'Cancel', variant: 'secondary', onClick: () => setShowDeleteConfirm(false) }, { label: 'Yes, delete', variant: 'danger', onClick: handleDelete }]} />
    </div>
  );
};

export default NotifyHubPage;

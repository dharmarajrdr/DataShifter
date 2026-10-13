import React, { useState } from 'react';
import { Button, Toggle } from '../common';
import { COLORS, FONT, BORDER_RADIUS, SPACING } from '../../constants/design';
import { FRBC } from '../../constants/layouts';
import { notifyHubApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

export const EVENT_CATALOG = [
  // PIPELINE
  {
    resourceType: 'PIPELINE',
    resourceName: 'Pipeline',
    icon: 'fa-solid fa-diagram-project',
    events: [
      { action: 'COMPLETED', label: 'on pipeline completed', key: 'pipeline.completed', description: 'Triggered when a data pipeline run finishes processing all tables successfully.' },
      { action: 'FAILED', label: 'on pipeline failed', key: 'pipeline.failed', description: 'Triggered when a pipeline errors out or encounters fatal replication failure.' },
      { action: 'STARTED', label: 'on pipeline started', key: 'pipeline.started', description: 'Triggered when a pipeline execution run begins.' },
      { action: 'PAUSED', label: 'on pipeline paused', key: 'pipeline.paused', description: 'Triggered when a pipeline run is paused by a user or threshold alert.' },
      { action: 'REMOVED', label: 'on pipeline removed', key: 'pipeline.removed', description: 'Triggered when a pipeline definition is deleted.' },
    ],
  },
  // WORKFLOW
  {
    resourceType: 'WORKFLOW',
    resourceName: 'Workflow',
    icon: 'fa-solid fa-network-wired',
    events: [
      { action: 'COMPLETED', label: 'on workflow completed', key: 'workflow.completed', description: 'Triggered when all stages and pipelines in a workflow conclude successfully.' },
      { action: 'FAILED', label: 'on workflow failed', key: 'workflow.failed', description: 'Triggered when any node or dependency within the workflow fails.' },
      { action: 'STARTED', label: 'on workflow started', key: 'workflow.started', description: 'Triggered when workflow DAG execution begins.' },
      { action: 'REMOVED', label: 'on workflow removed', key: 'workflow.removed', description: 'Triggered when a workflow orchestration is deleted.' },
    ],
  },
  // UDF
  {
    resourceType: 'UDF',
    resourceName: 'User-Defined Functions (UDF)',
    icon: 'fa-solid fa-code',
    events: [
      { action: 'CREATED', label: 'on udf uploaded', key: 'udf.created', description: 'Triggered when a custom transformation JAR or UDF script is registered.' },
      { action: 'EDITED', label: 'on udf updated', key: 'udf.edited', description: 'Triggered when an existing UDF library is updated or re-uploaded.' },
      { action: 'REMOVED', label: 'on udf removed', key: 'udf.removed', description: 'Triggered when a custom UDF library is deleted from the platform.' },
    ],
  },
  // CONNECTION
  {
    resourceType: 'CONNECTION',
    resourceName: 'Database Connection',
    icon: 'fa-solid fa-database',
    events: [
      { action: 'CREATED', label: 'on connection created', key: 'connection.created', description: 'Triggered when a new source or target connector is added.' },
      { action: 'EDITED', label: 'on connection edited', key: 'connection.edited', description: 'Triggered when credentials, host, or parameters are modified.' },
      { action: 'REMOVED', label: 'on connection removed', key: 'connection.removed', description: 'Triggered when a database connection configuration is deleted.' },
      { action: 'FAILED', label: 'on connection test failed', key: 'connection.failed', description: 'Triggered when scheduled health check or connection verification fails.' },
    ],
  },
  // SETUP
  {
    resourceType: 'SETUP',
    resourceName: 'Organization Setup & Config',
    icon: 'fa-solid fa-sliders',
    events: [
      { action: 'UPDATED', label: 'on setup updates', key: 'setup.updated', description: 'Triggered when org quotas, rate limits, or system configurations change.' },
      { action: 'ALERT', label: 'on threshold exceeded', key: 'setup.threshold', description: 'Triggered when billing threshold or resource limit is approached.' },
    ],
  },
  // BEETEL
  {
    resourceType: 'BEETEL',
    resourceName: 'Beetel AI Agent',
    icon: 'fa-solid fa-robot',
    events: [
      { action: 'COMPLETED', label: 'on beetel plan completed', key: 'beetel.completed', description: 'Triggered when Beetel AI finishes automated investigation or pipeline generation.' },
      { action: 'FAILED', label: 'on beetel action failed', key: 'beetel.failed', description: 'Triggered when Beetel agent fails during tool execution or LLM rate limits.' },
      { action: 'SESSION_CREATED', label: 'on beetel session started', key: 'beetel.session_created', description: 'Triggered when a user opens an autonomous assistant session.' },
    ],
  },
];

const EventListenerModal = ({ listener, channels = [], templates = [], onClose, onSave }) => {
  const notification = useNotification();
  const isEdit = !!listener;

  // Flattened event lookup
  const allEvents = EVENT_CATALOG.flatMap(cat =>
    cat.events.map(ev => ({
      ...ev,
      categoryName: cat.resourceName,
      resourceType: cat.resourceType,
    }))
  );

  // Format standard readable listener name from event
  const formatEventName = (ev) => {
    if (!ev) return '';
    // e.g. "on pipeline completed" -> "On Pipeline Completed"
    return ev.label
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const initialEvent = allEvents.find(e => e.key === (listener?.eventKey || 'pipeline.completed')) || allEvents[0];

  const [selectedEventKey, setSelectedEventKey] = useState(
    listener?.eventKey || initialEvent?.key || 'pipeline.completed'
  );
  const [name, setName] = useState(
    listener?.name || formatEventName(initialEvent)
  );
  const [description, setDescription] = useState(listener?.description || '');
  const [channelId, setChannelId] = useState(listener?.channelId || channels[0]?.id || '');
  const [templateId, setTemplateId] = useState(listener?.templateId || '');
  const [enabled, setEnabled] = useState(listener ? listener.enabled : true);
  const [saving, setSaving] = useState(false);

  // Auto-generate / update listener name whenever the event changes
  const handleEventChange = (newKey) => {
    setSelectedEventKey(newKey);
    const ev = allEvents.find(e => e.key === newKey);
    if (ev) {
      setName(formatEventName(ev));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      notification.error('Listener name is required');
      return;
    }
    if (!channelId) {
      notification.error('Please choose a notification channel to dispatch alerts to.');
      return;
    }

    const matchedEvent = allEvents.find(e => e.key === selectedEventKey) || allEvents[0];

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        resourceType: matchedEvent.resourceType,
        eventAction: matchedEvent.action,
        eventKey: matchedEvent.key,
        channelId,
        templateId: templateId || undefined,
        enabled,
      };

      if (isEdit) {
        await notifyHubApi.updateListener(listener.id, payload);
        notification.success(`Updated listener "${name}" successfully`);
      } else {
        await notifyHubApi.createListener(payload);
        notification.success(`Created event listener "${name}" successfully`);
      }
      onSave();
      onClose();
    } catch (err) {
      notification.error(err.message || 'Failed to save event listener');
    } finally {
      setSaving(false);
    }
  };

  const currentEvent = allEvents.find(e => e.key === selectedEventKey);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: COLORS.background.primary,
        borderRadius: BORDER_RADIUS.lg,
        width: 580, maxWidth: '95vw',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          ...FRBC, padding: `${SPACING.lg} ${SPACING.xl}`,
          borderBottom: `1px solid ${COLORS.border.light}`,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: FONT.size.xl, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
              {isEdit ? 'Edit Event Listener' : 'Add Event Listener'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: FONT.size.sm, color: COLORS.text.secondary }}>
              Listen to platform lifecycle events and dispatch alerts to configured channels.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.text.tertiary, padding: '4px 8px' }}
          >
            <i className="fa-solid fa-xmark" style={{ fontSize: '16px' }} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} style={{ padding: SPACING.xl, display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
          {/* Event Picker */}
          <div>
            <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '4px' }}>
              Select Event to Listen to *
            </label>
            <select
              value={selectedEventKey}
              onChange={e => handleEventChange(e.target.value)}
              style={{
                width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                fontSize: FONT.size.sm, background: '#fff',
              }}
            >
              {EVENT_CATALOG.map(cat => (
                <optgroup key={cat.resourceType} label={cat.resourceName}>
                  {cat.events.map(ev => (
                    <option key={ev.key} value={ev.key}>
                      {ev.label} ({ev.key})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {currentEvent && (
              <p style={{ margin: '6px 0 0', fontSize: FONT.size.xs, color: COLORS.text.secondary }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: '4px', color: COLORS.brand.primary }} />
                {currentEvent.description}
              </p>
            )}
          </div>

          {/* Listener Name & Enabled */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: SPACING.md, alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                Listener Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Notify DevOps on pipeline failure"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                  borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                  fontSize: FONT.size.sm,
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 90 }}>
              <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
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

          {/* Destination Channel */}
          <div>
            <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
              Destination Notification Channel *
            </label>
            <select
              value={channelId}
              onChange={e => setChannelId(e.target.value)}
              style={{
                width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                fontSize: FONT.size.sm, background: '#fff',
              }}
              required
            >
              <option value="">Select channel...</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>
                  {ch.name} ({ch.channelType})
                </option>
              ))}
            </select>
            {channels.length === 0 && (
              <p style={{ margin: '4px 0 0', fontSize: FONT.size.xs, color: COLORS.status.error }}>
                No notification channels configured yet. Please configure a channel first.
              </p>
            )}
          </div>

          {/* Reusable Template */}
          <div>
            <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
              Reusable Notification Template (optional)
            </label>
            <select
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              style={{
                width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                fontSize: FONT.size.sm, background: '#fff',
              }}
            >
              <option value="">Default Standard Format (Built-in)</option>
              {templates.map(tmpl => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
            <p style={{ margin: '4px 0 0', fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
              Templates format the message body with dynamic variables for this event.
            </p>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
              Notes / Description (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Alerts core team slack channel on failures"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{
                width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                fontSize: FONT.size.sm,
              }}
            />
          </div>

          {/* Footer Buttons */}
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
                isEdit ? 'Save Changes' : 'Create Listener'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventListenerModal;

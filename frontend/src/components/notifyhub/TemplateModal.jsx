import React, { useState, useEffect } from 'react';
import { Button } from '../common';
import { COLORS, FONT, BORDER_RADIUS, SPACING } from '../../constants/design';
import { FRBC, FRSC, FCSS } from '../../constants/layouts';
import { notifyHubApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const TemplateModal = ({ template, onClose, onSave }) => {
  const notification = useNotification();
  const isEdit = !!template;

  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [eventType, setEventType] = useState(template?.eventType || 'PIPELINE_FAILED');
  const [channelType, setChannelType] = useState(template?.channelType || 'ALL');
  const [subjectTemplate, setSubjectTemplate] = useState(template?.subjectTemplate || '[ALERT] Pipeline {{pipeline_name}} status: {{priority}}');
  const [bodyTemplate, setBodyTemplate] = useState(
    template?.bodyTemplate ||
    'Pipeline {{pipeline_name}} (ID: {{pipeline_id}}) encountered an issue at {{timestamp}}.\n\nError Message:\n{{error_message}}\n\nPriority: {{priority}}\nAction: View pipeline at {{action_url}}'
  );

  // Active target field for chip click insertion
  const [activeField, setActiveField] = useState('body'); // 'subject' or 'body'
  const [preview, setPreview] = useState(null);
  const [placeholders, setPlaceholders] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    notifyHubApi.getPlaceholders()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (list.length > 0) setPlaceholders(list);
      })
      .catch(() => {});
  }, []);

  // Update live preview whenever subject or body changes
  useEffect(() => {
    const timer = setTimeout(() => {
      notifyHubApi.previewTemplate({
        name: name || 'Preview Template',
        subjectTemplate,
        bodyTemplate,
      })
        .then(res => {
          const data = res?.data || res;
          if (data) setPreview(data);
        })
        .catch(() => {});
    }, 250);

    return () => clearTimeout(timer);
  }, [name, subjectTemplate, bodyTemplate]);

  const insertPlaceholder = (ph) => {
    const tag = `{{${ph}}}`;
    if (activeField === 'subject') {
      setSubjectTemplate(prev => prev + tag);
    } else {
      setBodyTemplate(prev => prev + tag);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      notification.error('Template name is required.');
      return;
    }
    if (!bodyTemplate.trim()) {
      notification.error('Body template is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        eventType,
        channelType,
        subjectTemplate: subjectTemplate.trim() || undefined,
        bodyTemplate: bodyTemplate.trim(),
      };

      if (isEdit) {
        await notifyHubApi.updateTemplate(template.id, payload);
        notification.success(`Updated template "${name}" successfully`);
      } else {
        await notifyHubApi.createTemplate(payload);
        notification.success(`Created template "${name}" successfully`);
      }
      onSave();
      onClose();
    } catch (err) {
      notification.error(err.message || 'Failed to save template');
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
        width: 920,
        maxWidth: '95vw',
        maxHeight: '92vh',
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
              {isEdit ? 'Edit Notification Template' : 'Create Notification Template'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: FONT.size.sm, color: COLORS.text.secondary }}>
              Design modular templates with dynamic variables and immediate live preview.
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

        {/* 2-Column Layout: Editor on left, Preview on right */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: SPACING.lg, padding: SPACING.xl }}>
            {/* Left Column: Form & Editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: SPACING.md }}>
                <div>
                  <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                    Template Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., pipeline-failure-alert"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{
                      width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: BORDER_RADIUS.md, border: `1px solid ${COLORS.border.medium}`,
                      fontSize: FONT.size.sm, outline: 'none',
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={e => setEventType(e.target.value)}
                    style={{
                      width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                      borderRadius: BORDER_RADIUS.md, border: `1px solid ${COLORS.border.medium}`,
                      fontSize: FONT.size.sm, background: '#fff',
                    }}
                  >
                    <option value="PIPELINE_FAILED">Pipeline Failed</option>
                    <option value="PIPELINE_SUCCESS">Pipeline Success</option>
                    <option value="PIPELINE_WARNING">Pipeline Warning</option>
                    <option value="PIPELINE_STOPPED">Pipeline Stopped</option>
                    <option value="CUSTOM">Custom Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  placeholder="Summary of when this template is sent"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{
                    width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                    borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                    fontSize: FONT.size.sm,
                  }}
                />
              </div>

              {/* Dynamic Variable Chips */}
              <div style={{
                background: COLORS.background.secondary,
                padding: SPACING.sm,
                borderRadius: BORDER_RADIUS.md,
                border: `1px solid ${COLORS.border.light}`,
              }}>
                <div style={{ ...FRBC, marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
                      Available Variables
                    </span>
                    <span
                      title="Click any variable chip below to insert it at your cursor in the chosen field (Subject or Body)"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: COLORS.text.tertiary, cursor: 'help', fontSize: '11px',
                      }}
                    >
                      <i className="fa-solid fa-circle-info" />
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: COLORS.text.secondary }}>Insert into:</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setActiveField('subject')}
                        style={{
                          padding: '2px 8px', fontSize: FONT.size.xs, borderRadius: BORDER_RADIUS.pill,
                          border: 'none', cursor: 'pointer',
                          background: activeField === 'subject' ? COLORS.brand.primary : COLORS.background.tertiary,
                          color: activeField === 'subject' ? '#fff' : COLORS.text.secondary,
                          fontWeight: activeField === 'subject' ? FONT.weight.semibold : FONT.weight.regular,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Subject
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveField('body')}
                        style={{
                          padding: '2px 8px', fontSize: FONT.size.xs, borderRadius: BORDER_RADIUS.pill,
                          border: 'none', cursor: 'pointer',
                          background: activeField === 'body' ? COLORS.brand.primary : COLORS.background.tertiary,
                          color: activeField === 'body' ? '#fff' : COLORS.text.secondary,
                          fontWeight: activeField === 'body' ? FONT.weight.semibold : FONT.weight.regular,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Body
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {placeholders.map(ph => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertPlaceholder(ph)}
                      style={{
                        padding: '3px 8px',
                        background: COLORS.background.primary,
                        border: `1px solid ${COLORS.border.medium}`,
                        borderRadius: BORDER_RADIUS.pill,
                        fontSize: FONT.size.xs,
                        cursor: 'pointer',
                        color: COLORS.brand.primaryDark,
                        fontWeight: FONT.weight.medium,
                      }}
                    >
                      +{ph}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Template */}
              <div>
                <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                  Subject Template (Email / Titles)
                </label>
                <input
                  type="text"
                  value={subjectTemplate}
                  onFocus={() => setActiveField('subject')}
                  onChange={e => setSubjectTemplate(e.target.value)}
                  style={{
                    width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                    borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                    fontSize: FONT.size.sm, outline: 'none',
                  }}
                />
              </div>

              {/* Body Template */}
              <div>
                <label style={{ display: 'block', fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, marginBottom: '2px' }}>
                  Body Template *
                </label>
                <textarea
                  rows={6}
                  value={bodyTemplate}
                  onFocus={() => setActiveField('body')}
                  onChange={e => setBodyTemplate(e.target.value)}
                  style={{
                    width: '100%', padding: `${SPACING.xs} ${SPACING.sm}`,
                    borderRadius: BORDER_RADIUS.sm, border: `1px solid ${COLORS.border.medium}`,
                    fontSize: FONT.size.sm, outline: 'none', fontFamily: 'inherit',
                  }}
                  required
                />
              </div>
            </div>

            {/* Right Column: Live Rendered Preview */}
            <div style={{
              background: COLORS.background.secondary,
              borderRadius: BORDER_RADIUS.md,
              border: `1px solid ${COLORS.border.light}`,
              padding: SPACING.md,
              display: 'flex',
              flexDirection: 'column',
              gap: SPACING.md,
            }}>
              <div style={{ ...FRBC }}>
                <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
                  Live Preview
                </span>
                <span style={{ fontSize: FONT.size.xs, color: COLORS.status.successText, background: COLORS.status.successLight, padding: '2px 8px', borderRadius: BORDER_RADIUS.pill }}>
                  Sample Pipeline Context
                </span>
              </div>

              {/* Preview Content */}
              <div style={{
                background: '#fff',
                borderRadius: BORDER_RADIUS.sm,
                border: `1px solid ${COLORS.border.light}`,
                padding: SPACING.md,
                display: 'flex',
                flexDirection: 'column',
                gap: SPACING.sm,
                flex: 1,
              }}>
                <div>
                  <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, display: 'block' }}>Subject:</span>
                  <p style={{ margin: '2px 0 0', fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: COLORS.text.primary }}>
                    {preview?.sampleSubject || subjectTemplate}
                  </p>
                </div>

                <div style={{ height: '1px', background: COLORS.border.light }} />

                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, display: 'block' }}>Message Body:</span>
                  <div style={{
                    marginTop: '4px',
                    fontSize: FONT.size.sm,
                    color: COLORS.text.secondary,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                  }}>
                    {preview?.sampleBody || bodyTemplate}
                  </div>
                </div>
              </div>

              {/* Detected Placeholders */}
              <div style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}>
                Detected variables in this template:{' '}
                <span style={{ color: COLORS.text.primary, fontWeight: FONT.weight.medium }}>
                  {preview?.availablePlaceholders?.join(', ') || 'none'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ ...FRBC, padding: `${SPACING.md} ${SPACING.xl}`, borderTop: `1px solid ${COLORS.border.light}` }}>
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
                isEdit ? 'Save Changes' : 'Create Template'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateModal;

import React, { useState } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import { FRSC, FRBC, FREC } from '../../constants/layouts';
import { Button } from '../common';
import { CloseIcon } from '../layout/Icons';
import { namespaceApi } from '../../services/api';

const PRESET_COLORS = [
  '#534AB7', '#1D9E75', '#D85A30', '#D4537E', '#378ADD',
  '#639922', '#BA7517', '#888780', '#A32D2D',
];

const CreateNamespaceModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    if (!name.trim()) { setError('Namespace name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await namespaceApi.create({ name: name.trim(), description, color });
      onCreated(res.data);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to create namespace');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: COLORS.background.primary, borderRadius: BORDER_RADIUS.lg,
          width: '420px', border: `1px solid ${COLORS.border.light}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ ...FRBC, padding: `${SPACING.md} ${SPACING.lg}`, borderBottom: `1px solid ${COLORS.border.light}` }}>
          <p style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium }}>Create namespace</p>
          <span onClick={onClose} style={{ cursor: 'pointer' }}><CloseIcon /></span>
        </div>

        <div style={{ padding: SPACING.lg }}>
          {/* Name */}
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g., Payments, Analytics, Customer-360"
              autoFocus
              style={{
                width: '100%', padding: `${SPACING.xs} 10px`,
                border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md,
                fontSize: FONT.size.md, boxSizing: 'border-box',
              }}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleCreate(); }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>Description (optional)</label>
            <input
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What pipelines belong in this namespace?"
              style={{
                width: '100%', padding: `${SPACING.xs} 10px`,
                border: `1px solid ${COLORS.border.light}`, borderRadius: BORDER_RADIUS.md,
                fontSize: FONT.size.md, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Color picker */}
          <div style={{ marginBottom: SPACING.md }}>
            <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>Color</label>
            <div style={{ ...FRSC, gap: '8px' }}>
              {PRESET_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c,
                    cursor: 'pointer',
                    border: color === c ? '3px solid ' + c : '2px solid transparent',
                    outline: color === c ? `2px solid ${COLORS.background.primary}` : 'none',
                    outlineOffset: '-4px',
                    transition: 'all 0.1s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{
            ...FRSC, gap: SPACING.xs, padding: `${SPACING.xs} ${SPACING.sm}`,
            background: COLORS.background.secondary, borderRadius: BORDER_RADIUS.md,
            marginBottom: SPACING.md,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '2px', background: color }} />
            <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium, color: COLORS.text.primary }}>
              {name || 'Namespace preview'}
            </span>
            {description && (
              <span style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary }}> — {description}</span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: COLORS.status.errorLight, color: COLORS.status.errorText,
              padding: `${SPACING.xs} ${SPACING.sm}`, borderRadius: BORDER_RADIUS.md,
              fontSize: FONT.size.xs, marginBottom: SPACING.sm,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ ...FREC, gap: SPACING.xs, paddingTop: SPACING.sm, borderTop: `1px solid ${COLORS.border.light}` }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreate} style={saving ? { opacity: 0.6 } : {}}>
              {saving ? 'Creating...' : 'Create namespace'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNamespaceModal;
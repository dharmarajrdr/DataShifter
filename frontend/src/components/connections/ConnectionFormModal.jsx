import React, { useState } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import { FRSC, FRBC, FREC } from '../../constants/layouts';
import { Button } from '../common';
import { CloseIcon } from '../layout/Icons';

/* ================================================================
   DATABASE TYPE DEFINITIONS — fields vary per type
   ================================================================ */
const DB_TYPES = [
  { value: 'ORACLE', label: 'Oracle', defaultPort: 1521 },
  { value: 'POSTGRESQL', label: 'PostgreSQL', defaultPort: 5432 },
  { value: 'SPANNER', label: 'Google Cloud Spanner', defaultPort: null },
];

/**
 * Returns which fields are relevant for each DB type.
 * Fields not in the list are hidden.
 */
const getFieldConfig = (dbType) => {
  switch (dbType) {
    case 'ORACLE':
      return {
        hostLabel: 'Host',
        hostPlaceholder: 'oracle-prod.company.com',
        showPort: true,
        databaseLabel: 'Database / SID',
        databasePlaceholder: 'ORCL',
        showSchema: true,
        schemaLabel: 'Schema',
        schemaPlaceholder: 'PROD_SCHEMA',
        showCredentials: true,
        showServiceAccountKey: false,
      };
    case 'POSTGRESQL':
      return {
        hostLabel: 'Host',
        hostPlaceholder: 'pg-prod.company.com',
        showPort: true,
        databaseLabel: 'Database name',
        databasePlaceholder: 'mydb',
        showSchema: true,
        schemaLabel: 'Schema',
        schemaPlaceholder: 'public',
        schemaDefault: 'public',
        showCredentials: true,
        showServiceAccountKey: false,
      };
    case 'SPANNER':
      return {
        hostLabel: 'Instance path',
        hostPlaceholder: 'projects/my-project/instances/my-instance',
        hostHint: 'Format: projects/{project}/instances/{instance}',
        showPort: false,
        databaseLabel: 'Database name',
        databasePlaceholder: 'orders-db',
        showSchema: false,
        showCredentials: false,
        showServiceAccountKey: true,
      };
    default:
      return {
        hostLabel: 'Host',
        hostPlaceholder: 'hostname',
        showPort: true,
        databaseLabel: 'Database',
        databasePlaceholder: '',
        showSchema: true,
        schemaLabel: 'Schema',
        schemaPlaceholder: '',
        showCredentials: true,
        showServiceAccountKey: false,
      };
  }
};

const INITIAL = {
  name: '', dbType: 'ORACLE', host: '', port: 1521,
  databaseName: '', schemaName: '', username: '', password: '',
};

const Field = ({ label, required, children, hint }) => (
  <div style={{ marginBottom: SPACING.sm }}>
    <label style={{ fontSize: FONT.size.sm, color: COLORS.text.secondary, display: 'block', marginBottom: SPACING.xxs }}>
      {label} {required && <span style={{ color: COLORS.status.error }}>*</span>}
    </label>
    {children}
    {hint && <p style={{ fontSize: '10px', color: COLORS.text.tertiary, marginTop: '2px' }}>{hint}</p>}
  </div>
);

const inputStyle = {
  width: '100%', padding: `${SPACING.xs} 10px`, border: `1px solid ${COLORS.border.light}`,
  borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.md, boxSizing: 'border-box',
  background: COLORS.background.primary,
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'auto',
};

const ConnectionFormModal = ({ connection, onClose, onSave }) => {
  const isEdit = !!connection;
  const [form, setForm] = useState(isEdit ? {
    name: connection.name || '', dbType: connection.dbType || 'ORACLE',
    host: connection.host || '', port: connection.port || 1521,
    databaseName: connection.databaseName || connection.schema || '',
    schemaName: connection.schemaName || connection.schema || '',
    username: '', password: '',
  } : { ...INITIAL });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleDbTypeChange = (dbType) => {
    const def = DB_TYPES.find(d => d.value === dbType);
    const fieldConfig = getFieldConfig(dbType);
    setForm(prev => ({
      ...prev,
      dbType,
      port: def?.defaultPort || prev.port,
      schemaName: fieldConfig.schemaDefault || '',
      // Clear credentials when switching to/from Spanner
      username: dbType === 'SPANNER' ? '' : prev.username,
      password: '',
    }));
  };

  const handleSubmit = async () => {
    // Validations
    if (!form.name.trim()) { setError('Connection name is required'); return; }
    if (!form.host.trim()) { setError('Host is required'); return; }
    if (form.dbType !== 'SPANNER' && !form.databaseName.trim()) { setError('Database name is required'); return; }
    if (form.dbType !== 'SPANNER' && !form.username.trim() && !isEdit) { setError('Username is required'); return; }
    if (form.dbType !== 'SPANNER' && !form.password.trim() && !isEdit) { setError('Password is required'); return; }

    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const fieldConfig = getFieldConfig(form.dbType);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: COLORS.background.primary, borderRadius: BORDER_RADIUS.lg,
        width: '520px', maxHeight: '85vh', overflow: 'auto',
        border: `1px solid ${COLORS.border.light}`,
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ ...FRBC, padding: `${SPACING.md} ${SPACING.lg}`, borderBottom: `1px solid ${COLORS.border.light}` }}>
          <p style={{ fontSize: FONT.size.lg, fontWeight: FONT.weight.medium }}>
            {isEdit ? 'Edit connection' : 'New connection'}
          </p>
          <span onClick={onClose} style={{ cursor: 'pointer' }}><CloseIcon /></span>
        </div>

        <div style={{ padding: SPACING.lg }}>
          {/* DB Type — Dropdown */}
          <Field label="Database type" required>
            <select value={form.dbType} onChange={e => handleDbTypeChange(e.target.value)} style={selectStyle}>
              {DB_TYPES.map(db => (
                <option key={db.value} value={db.value}>{db.label}</option>
              ))}
            </select>
          </Field>

          {/* Connection name */}
          <Field label="Connection name" required>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle}
              placeholder={`e.g., ${form.dbType === 'SPANNER' ? 'Spanner US-East' : form.dbType === 'POSTGRESQL' ? 'PostgreSQL production' : 'Oracle production'}`} />
          </Field>

          {/* Host */}
          <Field label={fieldConfig.hostLabel} required hint={fieldConfig.hostHint}>
            <input value={form.host} onChange={e => set('host', e.target.value)} style={inputStyle}
              placeholder={fieldConfig.hostPlaceholder} />
          </Field>

          {/* Port + Database (side by side for JDBC-based types) */}
          {fieldConfig.showPort ? (
            <div style={{ ...FRSC, gap: SPACING.sm }}>
              <div style={{ width: '100px' }}>
                <Field label="Port" required>
                  <input type="number" value={form.port} onChange={e => set('port', parseInt(e.target.value) || '')}
                    style={{ ...inputStyle, width: '100px' }} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label={fieldConfig.databaseLabel} required>
                  <input value={form.databaseName} onChange={e => set('databaseName', e.target.value)} style={inputStyle}
                    placeholder={fieldConfig.databasePlaceholder} />
                </Field>
              </div>
            </div>
          ) : (
            <Field label={fieldConfig.databaseLabel} required>
              <input value={form.databaseName} onChange={e => set('databaseName', e.target.value)} style={inputStyle}
                placeholder={fieldConfig.databasePlaceholder} />
            </Field>
          )}

          {/* Schema (Oracle, PostgreSQL) */}
          {fieldConfig.showSchema && (
            <Field label={fieldConfig.schemaLabel}
              hint={form.dbType === 'POSTGRESQL' ? 'Defaults to "public" if left empty' : null}>
              <input value={form.schemaName} onChange={e => set('schemaName', e.target.value)} style={inputStyle}
                placeholder={fieldConfig.schemaPlaceholder} />
            </Field>
          )}

          {/* Username + Password (Oracle, PostgreSQL) */}
          {fieldConfig.showCredentials && (
            <>
              <Field label="Username" required={!isEdit}>
                <input value={form.username} onChange={e => set('username', e.target.value)} style={inputStyle}
                  placeholder="db_user" />
              </Field>
              <Field label="Password" required={!isEdit}>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} style={inputStyle}
                  placeholder={isEdit ? '(leave blank to keep current)' : 'Enter password'} />
              </Field>
            </>
          )}

          {/* Service account key (Spanner) */}
          {fieldConfig.showServiceAccountKey && (
            <Field label="Service account JSON key" hint="Paste the full JSON key or leave blank for Application Default Credentials">
              <textarea value={form.password} onChange={e => set('password', e.target.value)}
                rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: FONT.size.xs }}
                placeholder='{"type": "service_account", ...}' />
            </Field>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: COLORS.status.errorLight, color: COLORS.status.errorText,
              padding: `${SPACING.xs} ${SPACING.sm}`, borderRadius: BORDER_RADIUS.md, fontSize: FONT.size.xs, marginBottom: SPACING.sm }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ ...FREC, gap: SPACING.xs, paddingTop: SPACING.sm, borderTop: `1px solid ${COLORS.border.light}` }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} style={saving ? { opacity: 0.6 } : {}}>
              {saving ? 'Saving...' : (isEdit ? 'Update connection' : 'Create connection')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionFormModal;
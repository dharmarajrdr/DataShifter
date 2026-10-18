import React, { useState } from 'react';
import { Button } from '../common';
import { CloseIcon } from '../layout/Icons';
import { useNotification } from '../../contexts/NotificationContext';
import { DB_TYPES, getFieldConfig, INITIAL_FORM } from './connectionFormConstants';
import ConnectionFormFields from './ConnectionFormFields';

export const ConnectionFormModal = ({ connection, onClose, onSave }) => {
  const notification = useNotification();
  const isEdit = !!connection;
  const [form, setForm] = useState(isEdit ? {
    name: connection.name || '', dbType: connection.dbType || 'ORACLE',
    host: connection.host || '', port: connection.port || 1521,
    databaseName: connection.databaseName || connection.schema || '',
    schemaName: connection.schemaName || connection.schema || '',
    username: '', password: '',
  } : { ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleDbTypeChange = (dbType) => {
    const def = DB_TYPES.find((d) => d.value === dbType);
    const fieldConfig = getFieldConfig(dbType);
    setForm((prev) => ({
      ...prev, dbType, port: def?.defaultPort || prev.port,
      schemaName: fieldConfig.schemaDefault || '',
      username: dbType === 'SPANNER' ? '' : prev.username, password: '',
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return notification.error('Connection name is required');
    if (!form.host.trim()) return notification.error(form.dbType === 'S3' ? 'AWS Region is required' : 'Host is required');
    if (form.dbType !== 'SPANNER' && form.dbType !== 'S3' && !form.databaseName.trim()) return notification.error('Database name is required');
    const isAws = form.dbType === 'S3';
    if (form.dbType !== 'SPANNER' && !form.username.trim() && !isEdit) {
      return notification.error(isAws ? 'AWS Access Key ID is required' : 'Username is required');
    }
    if (form.dbType !== 'SPANNER' && !form.password.trim() && !isEdit) {
      return notification.error(isAws ? 'AWS Secret Access Key is required' : 'Password is required');
    }

    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      notification.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const fieldConfig = getFieldConfig(form.dbType);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <h3 className="text-base font-semibold text-slate-900">{isEdit ? `Edit connection: ${connection.name}` : 'New connection'}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <ConnectionFormFields form={form} set={set} onDbTypeChange={handleDbTypeChange} fieldConfig={fieldConfig} isEdit={isEdit} />
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : (isEdit ? 'Update connection' : 'Create connection')}</Button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionFormModal;
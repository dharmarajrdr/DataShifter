import React from 'react';
import { DB_TYPES } from './connectionFormConstants';

export const ConnectionFormFields = ({ form, set, onDbTypeChange, fieldConfig, isEdit }) => {
  return (
    <div className="space-y-3.5">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Database type <span className="text-rose-500">*</span></label>
        <select value={form.dbType} onChange={(e) => onDbTypeChange(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
          {DB_TYPES.map((db) => (<option key={db.value} value={db.value}>{db.label}</option>))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Connection name <span className="text-rose-500">*</span></label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={`e.g., ${form.dbType === 'SPANNER' ? 'Spanner US-East' : 'PostgreSQL production'}`} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">{fieldConfig.hostLabel} <span className="text-rose-500">*</span></label>
        <input value={form.host} onChange={(e) => set('host', e.target.value)} placeholder={fieldConfig.hostPlaceholder} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
        {fieldConfig.hostHint && <p className="text-[10px] text-slate-400 mt-1">{fieldConfig.hostHint}</p>}
      </div>

      {fieldConfig.showPort ? (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Port <span className="text-rose-500">*</span></label>
            <input type="number" value={form.port} onChange={(e) => set('port', parseInt(e.target.value, 10) || '')} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">{fieldConfig.databaseLabel} <span className="text-rose-500">*</span></label>
            <input value={form.databaseName} onChange={(e) => set('databaseName', e.target.value)} placeholder={fieldConfig.databasePlaceholder} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{fieldConfig.databaseLabel} <span className="text-rose-500">*</span></label>
          <input value={form.databaseName} onChange={(e) => set('databaseName', e.target.value)} placeholder={fieldConfig.databasePlaceholder} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
        </div>
      )}

      {fieldConfig.showSchema && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{fieldConfig.schemaLabel}</label>
          <input value={form.schemaName} onChange={(e) => set('schemaName', e.target.value)} placeholder={fieldConfig.schemaPlaceholder} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
        </div>
      )}

      {fieldConfig.showCredentials && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{fieldConfig.usernameLabel || 'Username'} {!isEdit && <span className="text-rose-500">*</span>}</label>
            <input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder={fieldConfig.usernamePlaceholder || 'db_user'} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{fieldConfig.passwordLabel || 'Password'} {!isEdit && <span className="text-rose-500">*</span>}</label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={isEdit ? '(keep current)' : (fieldConfig.passwordPlaceholder || 'Enter password')} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
          </div>
        </div>
      )}

      {fieldConfig.showServiceAccountKey && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Service account JSON key</label>
          <textarea value={form.password} onChange={(e) => set('password', e.target.value)} rows={3} placeholder='{"type": "service_account", ...}' className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y" />
        </div>
      )}
    </div>
  );
};

export default ConnectionFormFields;

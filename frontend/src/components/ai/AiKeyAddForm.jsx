import React from 'react';
import { Button } from '../common';
import { GROQ_MODELS } from './aiKeyConstants';

export const AiKeyAddForm = ({
  provider, onProviderChange, label, onLabelChange,
  apiKey, onApiKeyChange, baseUrl, onBaseUrlChange,
  modelName, onModelNameChange, saving, onSubmit, onCancel,
}) => {
  return (
    <form onSubmit={onSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            <option value="GROQ">Groq Cloud (Fast Inference)</option>
            <option value="OLLAMA">Ollama (Local / Self-Hosted)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={provider === 'GROQ' ? 'e.g. Groq Key #1' : 'e.g. Local Ollama'}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      {provider === 'GROQ' ? (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Groq API Key <span className="text-rose-600">*</span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="gsk_..."
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
            required
          />
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Ollama Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => onBaseUrlChange(e.target.value)}
            placeholder="http://localhost:11434"
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Default Model</label>
        {provider === 'GROQ' ? (
          <select
            value={modelName}
            onChange={(e) => onModelNameChange(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            {GROQ_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <input
            type="text"
            value={modelName}
            onChange={(e) => onModelNameChange(e.target.value)}
            placeholder="gemma4:12b or llama3.2"
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
          />
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" size="sm" disabled={saving}>
          {saving ? 'Saving Key...' : 'Save API Key'}
        </Button>
      </div>
    </form>
  );
};

export default AiKeyAddForm;


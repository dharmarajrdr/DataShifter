import { useEffect, useState, useCallback } from 'react';
import { aiApi } from '../../services/aiApi';
import { Button, BarLoader } from '../common';
import { useNotification } from '../../contexts/NotificationContext';
import AiKeyCard from './AiKeyCard';
import AiKeyAddForm from './AiKeyAddForm';

const AiKeyManagerSection = ({ scope = 'USER', canEdit = true, style = {} }) => {
  const notification = useNotification();
  const [poolStatus, setPoolStatus] = useState(null); const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false); const [provider, setProvider] = useState('GROQ');
  const [label, setLabel] = useState(''); const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(''); const [modelName, setModelName] = useState('openai/gpt-oss-120b');
  const [saving, setSaving] = useState(false); const [testingId, setTestingId] = useState(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aiApi.getKeyPoolStatus();
      setPoolStatus(res.data || null);
    } catch (e) { notification.error(e?.message || 'Could not load AI key pool status'); }
    finally { setLoading(false); }
  }, [notification]);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  const keys = scope === 'USER' ? (poolStatus?.userKeys || []) : (poolStatus?.orgKeys || []);

  const handleProviderChange = (p) => {
    setProvider(p);
    setBaseUrl(p === 'OLLAMA' ? 'http://localhost:11434' : 'https://api.groq.com/openai');
    setModelName(p === 'OLLAMA' ? (poolStatus?.defaultOllamaModel || 'gemma4:12b') : (poolStatus?.defaultGroqModel || 'openai/gpt-oss-120b'));
  };

  const handleAddKey = async (e) => {
    e.preventDefault();
    if (provider === 'GROQ' && !apiKey.trim()) { notification.error('Please enter a Groq API key'); return; }
    setSaving(true);
    try {
      await aiApi.createKey({ scope, provider, label: label.trim() || `${provider} Key #${keys.length + 1}`, apiKey: apiKey.trim(), baseUrl: baseUrl.trim() || undefined, modelName: modelName.trim() || undefined, priorityOrder: keys.length, isActive: true });
      setLabel(''); setApiKey(''); setShowAddForm(false);
      notification.success('AI API key added successfully');
      await loadStatus();
    } catch (err) { notification.error(err?.message || 'Failed to add key'); }
    finally { setSaving(false); }
  };

  const handleTestKey = async (id) => {
    setTestingId(id);
    try {
      const res = await aiApi.testKey(id);
      const data = res?.data;
      if (data?.success) {
        notification.success(`Verified: Connected successfully (${data.latencyMs ?? 0}ms)`);
      } else {
        notification.error(data?.message ? `Test Failed: ${data.message}` : 'Test failed');
      }
      await loadStatus();
    } catch (err) {
      notification.error(err?.message ? `Test Failed: ${err.message}` : 'Test failed');
    } finally { setTestingId(null); }
  };

  return (
    <div style={style} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs mt-6 space-y-4">
      {(loading || saving || Boolean(testingId)) && <BarLoader />}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Beetel AI — {scope === 'USER' ? 'Personal LLM API Keys' : 'Organization Shared LLM API Keys'}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Organization keys are shared across members. Supports automatic multi-key failover.</p>
        </div>
        {canEdit && !showAddForm && <Button variant="primary" size="sm" onClick={() => setShowAddForm(true)}>+ Add API Key</Button>}
      </div>

      {poolStatus && (
        <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2 border border-slate-200">
          <span>Active Key Resolution: <strong className="text-slate-900">{poolStatus.activeScope}</strong> ({poolStatus.userKeyCount} User · {poolStatus.orgKeyCount} Org · {poolStatus.systemKeyCount} System)</span>
          <span>Local Ollama: <strong className={poolStatus.ollamaAvailable ? 'text-emerald-700' : 'text-slate-400'}>{poolStatus.ollamaAvailable ? 'Detected' : 'Offline'}</strong></span>
        </div>
      )}

      {showAddForm && canEdit && (
        <AiKeyAddForm provider={provider} onProviderChange={handleProviderChange} label={label} onLabelChange={setLabel} apiKey={apiKey} onApiKeyChange={setApiKey} baseUrl={baseUrl} onBaseUrlChange={setBaseUrl} modelName={modelName} onModelNameChange={setModelName} saving={saving} onSubmit={handleAddKey} onCancel={() => setShowAddForm(false)} />
      )}

      <div className="space-y-2.5">
        {keys.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No {scope === 'USER' ? 'personal' : 'organization'} LLM keys configured yet.</p>
        ) : (
          keys.map((k, idx) => (
            <AiKeyCard key={k.id} keyItem={k} index={idx} canEdit={canEdit} isTesting={testingId === k.id} onTest={handleTestKey} onReset={(id) => aiApi.resetKeyHealth(id).then(() => { notification.success('Key health reset'); loadStatus(); }).catch(e => notification.error(e?.message || 'Reset failed'))} onToggleActive={(kItem) => aiApi.updateKey(kItem.id, { isActive: !kItem.isActive }).then(() => { notification.success(kItem.isActive ? 'Key disabled' : 'Key enabled'); loadStatus(); }).catch(e => notification.error(e?.message || 'Update failed'))} onDelete={(id) => aiApi.deleteKey(id).then(() => { notification.success('Key deleted'); loadStatus(); }).catch(e => notification.error(e?.message || 'Delete failed'))} />
          ))
        )}
      </div>
    </div>
  );
};

export default AiKeyManagerSection;

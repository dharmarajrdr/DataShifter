import { useEffect, useState } from 'react';
import { BORDER_RADIUS, COLORS, FONT, SPACING } from '../../constants/design';
import { FRBC, FRSC } from '../../constants/layouts';
import { AGENT } from '../../constants/literals';
import { aiApi } from '../../services/aiApi';
import { Button, BarLoader, SkeletonLoader } from '../common';

const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

const STATUS_BADGE = {
  ACTIVE: { bg: '#E6F4EA', color: '#0F6E56', label: 'Active' },
  RATE_LIMITED: { bg: '#FEF3C7', color: '#92400E', label: 'Cooldown (Rate Limited)' },
  EXPIRED: { bg: '#FEE2E2', color: '#A32D2D', label: 'Invalid / Expired' },
  FAILED: { bg: '#FEE2E2', color: '#A32D2D', label: 'Failed' },
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: `1px solid ${COLORS.border.light}`,
  borderRadius: BORDER_RADIUS.md,
  fontSize: FONT.size.sm,
  boxSizing: 'border-box',
  background: '#fff',
  outline: 'none',
};

const AiKeyManagerSection = ({ scope = 'USER', canEdit = true, style = {} }) => {
  const [poolStatus, setPoolStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [provider, setProvider] = useState('GROQ');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('openai/gpt-oss-120b');
  const [priorityOrder, setPriorityOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await aiApi.getKeyPoolStatus();
      setPoolStatus(res.data || null);
    } catch (e) {
      setErrorMsg(e?.message || 'Could not load AI key pool status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const keys = scope === 'USER' ? (poolStatus?.userKeys || []) : (poolStatus?.orgKeys || []);

  const handleProviderChange = (nextProvider) => {
    setProvider(nextProvider);
    if (nextProvider === 'OLLAMA') {
      setBaseUrl('http://localhost:11434');
      setModelName(poolStatus?.defaultOllamaModel || 'gemma4:12b');
    } else {
      setBaseUrl('https://api.groq.com/openai');
      setModelName(poolStatus?.defaultGroqModel || 'openai/gpt-oss-120b');
    }
  };

  const handleAddKey = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (provider === 'GROQ' && !apiKey.trim()) {
      setErrorMsg('Please enter a Groq API key');
      return;
    }
    setSaving(true);
    try {
      await aiApi.createKey({
        scope,
        provider,
        label: label.trim() || `${provider} Key #${keys.length + 1}`,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
        modelName: modelName.trim() || undefined,
        priorityOrder: Number(priorityOrder) || keys.length,
        isActive: true,
      });
      setLabel('');
      setApiKey('');
      setShowAddForm(false);
      await loadStatus();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to add key');
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async (id) => {
    setTestingId(id);
    try {
      const res = await aiApi.testKey(id);
      setTestResults(prev => ({ ...prev, [id]: res.data }));
      await loadStatus();
    } catch (err) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: err?.message || 'Test failed' } }));
    } finally {
      setTestingId(null);
    }
  };

  const handleResetKey = async (id) => {
    try {
      await aiApi.resetKeyHealth(id);
      await loadStatus();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to reset key status');
    }
  };

  const handleToggleActive = async (k) => {
    try {
      await aiApi.updateKey(k.id, { isActive: !k.isActive });
      await loadStatus();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to update key');
    }
  };

  const handleDeleteKey = async (id) => {
    try {
      await aiApi.deleteKey(id);
      await loadStatus();
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to delete key');
    }
  };

  return (
    <div style={{
      padding: SPACING.lg,
      background: COLORS.background.primary,
      border: `1px solid ${COLORS.border.light}`,
      borderRadius: BORDER_RADIUS.lg,
      marginTop: SPACING.lg,
      overflow: 'hidden',
      ...style,
    }}>
      {(loading || saving || Boolean(testingId)) && (
        <div style={{ margin: `-${SPACING.lg} -${SPACING.lg} ${SPACING.md} -${SPACING.lg}` }}>
          <BarLoader />
        </div>
      )}
      <div style={{ ...FRBC, marginBottom: SPACING.sm }}>
        <div style={{ width: '75%' }}>
          <div style={{ ...FRSC, gap: SPACING.xs }}>
            <p style={{ fontSize: FONT.size.base, fontWeight: FONT.weight.medium, margin: 0 }}>
              {AGENT.name} AI — {scope === 'USER' ? 'Personal LLM API Keys' : 'Organization Shared LLM API Keys'}
            </p>
            {poolStatus?.activeScope === scope && (
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '999px',
                background: '#EEF2FF',
                color: '#4338CA',
                fontWeight: FONT.weight.medium,
              }}>
                Active Pool
              </span>
            )}
          </div>
          <p style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '3px', marginBottom: 0 }}>
            {scope === 'USER'
              ? 'Your personal Groq / Ollama keys take highest priority and automatically rotate if a key hits rate limits or expires. When configured, system keys are bypassed.'
              : 'Organization keys are shared across members who have not configured personal keys. Supports automatic multi-key failover.'}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" variant={showAddForm ? 'secondary' : 'primary'} onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add API Key'}
          </Button>
        )}
      </div>

      {/* Hierarchy Status Banner */}
      {poolStatus && (
        <div style={{
          ...FRBC,
          padding: '8px 12px',
          background: COLORS.background.secondary,
          borderRadius: BORDER_RADIUS.md,
          marginBottom: SPACING.md,
          fontSize: FONT.size.xs,
          color: COLORS.text.secondary,
          flexWrap: 'wrap',
          gap: SPACING.xs,
        }}>
          <span>
            Active Key Resolution: <strong>{poolStatus.activeScope}</strong>
            {' '}({poolStatus.userKeyCount} User · {poolStatus.orgKeyCount} Org · {poolStatus.systemKeyCount} System)
          </span>
          <span>
            Local Ollama: <strong style={{ color: poolStatus.ollamaAvailable ? '#0F6E56' : COLORS.text.tertiary }}>
              {poolStatus.ollamaAvailable ? 'Detected' : 'Offline'}
            </strong>
          </span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '8px 12px',
          background: '#FEE2E2',
          color: '#A32D2D',
          borderRadius: BORDER_RADIUS.md,
          fontSize: FONT.size.xs,
          marginBottom: SPACING.md,
        }}>
          {errorMsg}
        </div>
      )}

      {/* Add Key Form */}
      {showAddForm && canEdit && (
        <form onSubmit={handleAddKey} style={{
          padding: SPACING.md,
          background: COLORS.background.secondary,
          border: `1px solid ${COLORS.border.light}`,
          borderRadius: BORDER_RADIUS.md,
          marginBottom: SPACING.md,
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING.sm,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm }}>
            <div>
              <label style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, display: 'block', marginBottom: '3px' }}>
                Provider
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                style={inputStyle}
              >
                <option value="GROQ">Groq Cloud (Fast Inference)</option>
                <option value="OLLAMA">Ollama (Local / Self-Hosted)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, display: 'block', marginBottom: '3px' }}>
                Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={provider === 'GROQ' ? 'e.g. Groq Key #1' : 'e.g. Local Ollama'}
                style={inputStyle}
              />
            </div>
          </div>

          {provider === 'GROQ' ? (
            <div>
              <label style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, display: 'block', marginBottom: '3px' }}>
                Groq API Key <span style={{ color: '#A32D2D' }}>*</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                style={{ ...inputStyle, fontFamily: 'monospace' }}
                required
              />
            </div>
          ) : (
            <div>
              <label style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, display: 'block', marginBottom: '3px' }}>
                Ollama Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: SPACING.sm }}>
            <div>
              <label style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, display: 'block', marginBottom: '3px' }}>
                Model Name
              </label>
              {provider === 'GROQ' ? (
                <select value={modelName} onChange={(e) => setModelName(e.target.value)} style={inputStyle}>
                  {GROQ_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="gemma4:12b"
                  style={inputStyle}
                />
              )}
            </div>
            <div>
              <label style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, display: 'block', marginBottom: '3px' }}>
                Rotation Order
              </label>
              <input
                type="number"
                min="0"
                value={priorityOrder}
                onChange={(e) => setPriorityOrder(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ ...FRSC, justifyContent: 'flex-end', gap: SPACING.xs, marginTop: '4px' }}>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving...' : 'Save Key'}
            </Button>
          </div>
        </form>
      )}

      {/* Configured Keys List */}
      {loading ? (
        <SkeletonLoader
          variant="table-row"
          count={2}
          height="54px"
          style={{ borderRadius: BORDER_RADIUS.md }}
        />
      ) : keys.length === 0 ? (
        <p style={{ fontSize: FONT.size.xs, color: COLORS.text.tertiary, margin: 0 }}>
          No {scope === 'USER' ? 'personal' : 'organization'} LLM keys configured yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
          {keys.map((k, idx) => {
            const badge = STATUS_BADGE[k.status] || STATUS_BADGE.ACTIVE;
            const testRes = testResults[k.id];
            return (
              <div key={k.id} style={{
                padding: '10px 12px',
                border: `1px solid ${COLORS.border.light}`,
                borderRadius: BORDER_RADIUS.md,
                background: k.isActive ? '#fff' : COLORS.background.secondary,
                opacity: k.isActive ? 1 : 0.7,
              }}>
                <div style={{ ...FRBC, gap: SPACING.sm, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ ...FRSC, gap: SPACING.xs, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: FONT.size.xs, fontWeight: FONT.weight.semibold, color: COLORS.text.secondary }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.medium }}>
                        {k.label}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: BORDER_RADIUS.sm,
                        background: k.provider === 'GROQ' ? '#F3E8FF' : '#E0F2FE',
                        color: k.provider === 'GROQ' ? '#6B21A8' : '#0369A1',
                        fontWeight: FONT.weight.medium,
                      }}>
                        {k.provider}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: BORDER_RADIUS.sm,
                        background: badge.bg,
                        color: badge.color,
                        fontWeight: FONT.weight.medium,
                      }}>
                        {badge.label}
                      </span>
                    </div>
                    <div style={{ fontSize: FONT.size.xs, color: COLORS.text.secondary, marginTop: '3px', fontFamily: 'monospace' }}>
                      {k.provider === 'GROQ' ? k.maskedKey : k.baseUrl} · Model: {k.modelName}
                    </div>
                    {k.lastError && k.status !== 'ACTIVE' && (
                      <div style={{ fontSize: '11px', color: '#A32D2D', marginTop: '3px' }}>
                        Last error: {k.lastError}
                      </div>
                    )}
                    {testRes && (
                      <div style={{
                        fontSize: '11px',
                        color: testRes.success ? '#0F6E56' : '#A32D2D',
                        marginTop: '3px',
                      }}>
                        {testRes.success
                          ? `Verified (${testRes.latencyMs}ms)`
                          : `Test failed: ${testRes.message}`}
                      </div>
                    )}
                  </div>

                  {canEdit && (
                    <div style={{ ...FRSC, gap: '6px' }}>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={testingId === k.id}
                        onClick={() => handleTestKey(k.id)}
                      >
                        {testingId === k.id ? 'Testing...' : 'Test'}
                      </Button>
                      {k.status !== 'ACTIVE' && (
                        <Button type="button" size="sm" variant="secondary" onClick={() => handleResetKey(k.id)}>
                          Reset
                        </Button>
                      )}
                      <Button type="button" size="sm" variant="secondary" onClick={() => handleToggleActive(k)}>
                        {k.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button type="button" size="sm" variant="danger" onClick={() => handleDeleteKey(k.id)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AiKeyManagerSection;

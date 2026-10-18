import React from 'react';

export const ChannelTypeConfigFields = ({
  channelType, webhookUrl, setWebhookUrl,
  authToken, setAuthToken, emailTo, setEmailTo,
  emailFrom, setEmailFrom, customHeaders, setCustomHeaders,
}) => {
  return (
    <div className="space-y-3.5 pt-1">
      {channelType === 'EMAIL' ? (
        <>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Recipients (To) <span className="text-rose-600">*</span></label>
            <input type="text" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="ops-team@acme.com, alerts@acme.com" className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600" />
            <p className="text-[10px] text-slate-400 mt-1">Separate multiple email addresses with commas.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sender Email (From - Optional)</label>
            <input type="email" value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} placeholder="datashifter-alerts@acme.com" className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600" />
          </div>
        </>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {channelType === 'WEBHOOK' ? 'Endpoint URL' : 'Incoming Webhook URL'} <span className="text-rose-600">*</span>
          </label>
          <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder={channelType === 'SLACK' ? 'https://hooks.slack.com/services/...' : channelType === 'TEAMS' ? 'https://outlook.office.com/webhook/...' : 'https://api.acme.com/alerts/webhook'} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 font-mono text-[11px]" />
        </div>
      )}

      {channelType === 'CLIQ' && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Bot Auth Token (Optional)</label>
          <input type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="zcliq_auth_token_..." className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 font-mono text-[11px]" />
        </div>
      )}

      {channelType === 'WEBHOOK' && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Headers (JSON)</label>
          <textarea rows={3} value={customHeaders} onChange={(e) => setCustomHeaders(e.target.value)} placeholder='{"Authorization": "Bearer token", "X-Custom": "val"}' className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 font-mono text-[11px]" />
        </div>
      )}
    </div>
  );
};

export default ChannelTypeConfigFields;

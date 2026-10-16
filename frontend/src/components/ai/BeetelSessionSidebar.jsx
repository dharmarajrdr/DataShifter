import React from 'react';

export const BeetelSessionSidebar = ({
  id = 'beetel-session-sidebar',
  sessions = [],
  selectedSessionId,
  selectedProvider = 'Anthropic Claude 3.5 Sonnet',
  onProviderChange = () => {},
  onSelectSession,
}) => {
  return (
    <div id={id} className="card bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-[600px] shadow-xs">
      <div className="overflow-hidden flex flex-col">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sessions</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {sessions.length} saved
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-2 overflow-y-auto pr-0.5 flex-1 max-h-[460px]">
          {sessions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              <i className="fa-regular fa-comments text-base mb-1 block text-slate-300" />
              <span>No conversations yet</span>
            </div>
          ) : (
            sessions.map((sess) => {
              const active = sess.id === selectedSessionId;
              return (
                <div
                  key={sess.id}
                  id={`session-item-${sess.id}`}
                  onClick={() => onSelectSession(sess.id)}
                  className={`p-2.5 rounded-lg cursor-pointer transition border text-left ${
                    active ? 'bg-indigo-50/80 border-indigo-200' : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`text-xs truncate ${active ? 'font-bold text-indigo-700' : 'font-semibold text-slate-800'}`}>
                    {sess.title || 'Untitled Session'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {sess.preview || sess.lastMessage || 'Awaiting instructions...'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200 mt-auto">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">LLM Provider</label>
        <select
          id={`${id}-llm-provider`}
          value={selectedProvider}
          onChange={(e) => onProviderChange(e.target.value)}
          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
        >
          <option value="Anthropic Claude 3.5 Sonnet">Anthropic Claude 3.5 Sonnet</option>
          <option value="OpenAI GPT-4o">OpenAI GPT-4o</option>
          <option value="Google Gemini 1.5 Pro">Google Gemini 1.5 Pro</option>
          <option value="Local Ollama (Llama 3.2)">Local Ollama (Llama 3.2)</option>
        </select>
      </div>
    </div>
  );
};

export default BeetelSessionSidebar;

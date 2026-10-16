import React, { useState } from 'react';
import BeetelPipelineSpecCard from './BeetelPipelineSpecCard';

export const BeetelChatCanvas = ({
  session,
  userInitials = 'DR',
  onOpenSchemaDiff,
  onDeployPipeline,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('Add PII masking for customer email and credit card columns before writing to Snowflake');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const headerTitle = session?.headerTitle || session?.title || 'Postgres to Snowflake CDC Pipeline Architecture';

  return (
    <div className="card bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-xs">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-600 fill-indigo-600 shrink-0" viewBox="0 0 24 24">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="font-bold text-xs text-slate-800 truncate">
            Session: {headerTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onOpenSchemaDiff} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shadow-xs">
            View Schema Diff
          </button>
          <button type="button" onClick={onDeployPipeline} className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs">
            Deploy Pipeline
          </button>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
        {session?.userMessage && (
          <div className="flex gap-3 max-w-[82%]">
            <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-3 text-xs leading-relaxed text-slate-800">
              {session.userMessage}
            </div>
          </div>
        )}

        {session?.agentMessage && (
          <div className="flex gap-3 max-w-[88%] ml-auto flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2z" />
              </svg>
            </div>
            <div className="bg-white border border-indigo-200 rounded-2xl rounded-tr-xs p-4 text-xs leading-relaxed text-slate-900 shadow-xs">
              <p className="text-slate-800">{session.agentMessage}</p>
              <BeetelPipelineSpecCard spec={session.spec} onApply={onDeployPipeline} />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3.5 border-t border-slate-200 bg-white flex gap-2.5">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask Beetel Agent to synthesize, debug, or validate pipelines..."
          className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600"
        />
        <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shrink-0 transition-colors shadow-xs">
          <span>Send</span>
          <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default BeetelChatCanvas;

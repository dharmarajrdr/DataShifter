import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import BeetelPlanCard from './BeetelPlanCard';
import BeetelCanvasHeader from './BeetelCanvasHeader';
import BeetelMarkdownRenderer from './BeetelMarkdownRenderer';

const renderAuditText = (t) => String(t || '').split(/(\*\*.*?\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i} className="font-semibold text-slate-800">{p.slice(2, -2)}</strong> : p));

export const BeetelChatCanvas = ({
  session, messages = [], loading = false, sending = false, userInitials = 'DR',
  hasMore = false, loadingOlder = false, onLoadOlder, onShareClick, onConfirmPlan, onRejectPlan, onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const endRef = useRef(null), listRef = useRef(null), scrollSnapshotRef = useRef(null), isPrependRef = useRef(false);

  useEffect(() => {
    if (isPrependRef.current) { isPrependRef.current = false; return; }
    endRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, sending]);

  useLayoutEffect(() => {
    if (scrollSnapshotRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight - scrollSnapshotRef.current.prevHeight + scrollSnapshotRef.current.prevTop;
      scrollSnapshotRef.current = null;
    }
  }, [messages]);

  const handleScroll = (e) => {
    if (e.currentTarget.scrollTop <= 40 && hasMore && !loadingOlder && onLoadOlder) {
      scrollSnapshotRef.current = { prevHeight: e.currentTarget.scrollHeight, prevTop: e.currentTarget.scrollTop };
      isPrependRef.current = true; onLoadOlder();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;
    onSendMessage(inputText.trim()); setInputText('');
  };

  return (
    <div className="card bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full shadow-xs">
      <BeetelCanvasHeader session={session} onShareClick={onShareClick} />
      <div ref={listRef} onScroll={handleScroll} className="flex-1 min-h-0 p-5 overflow-y-auto flex flex-col gap-4">
        {loadingOlder && (<div id="beetel-loading-older" className="flex items-center justify-center gap-2 py-1 text-[11px] text-slate-400 shrink-0"><i className="fa-solid fa-circle-notch fa-spin text-indigo-500" /><span>Loading older messages...</span></div>)}
        {loading ? (<div className="flex items-center justify-center h-full text-xs text-slate-400">Loading conversation messages...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-xl mb-3"><i className="fa-solid fa-robot" /></div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Beetel Agent is ready</p>
            <p className="text-xs text-slate-500 max-w-sm">Ask Beetel to synthesize continuous pipelines, diagnose schema bottlenecks, or generate custom UDF bytecode.</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            if (m.role === 'AUDIT' || m.role === 'SYSTEM' || /granted access to/i.test(m.content || '')) {
              return (
                <div key={m.id || idx} className="beetel-audit-message w-full flex justify-center my-1 select-none">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] text-slate-600 shadow-2xs text-center max-w-md">
                    <i className="fa-solid fa-user-check text-[10px] text-emerald-600" />
                    <span>{renderAuditText(m.content)}</span>
                  </div>
                </div>
              );
            }
            const isUser = m.role === 'USER';
            return (
              <div key={m.id || idx} className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse text-right' : 'mr-auto flex-row text-left'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${isUser ? 'bg-slate-300 text-slate-800' : 'bg-indigo-600 text-white'}`}>{isUser ? (m.senderInitials || userInitials) : <i className="fa-solid fa-robot text-xs" />}</div>
                <div className={`rounded-2xl p-3.5 text-xs leading-relaxed text-left ${isUser ? 'bg-indigo-50/80 border border-indigo-200 text-indigo-950 rounded-tr-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs'}`}>
                  <BeetelMarkdownRenderer content={m.content} isUser={isUser} />
                  {m.plan && <BeetelPlanCard plan={m.plan} onConfirm={onConfirmPlan} onReject={onRejectPlan} />}
                </div>
              </div>
            );
          })
        )}
        {sending && (
          <div className="flex items-start gap-2.5 mr-auto max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0"><i className="fa-solid fa-robot text-xs" /></div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 text-xs text-slate-500 italic flex items-center gap-2"><i className="fa-solid fa-circle-notch fa-spin text-indigo-600" /><span>Beetel is analyzing catalog and synthesizing...</span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-3.5 border-t border-slate-200 bg-white flex gap-2.5">
        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Ask Beetel Agent to synthesize, debug, or validate pipelines..." className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600" disabled={sending} />
        <button type="submit" disabled={sending || !inputText.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shrink-0 transition-colors shadow-xs">
          <span>Send</span><i className="fa-solid fa-paper-plane text-[10px]" />
        </button>
      </form>
    </div>
  );
};

export default BeetelChatCanvas;

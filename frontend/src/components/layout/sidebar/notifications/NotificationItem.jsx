import React from 'react';
import { Link } from 'react-router-dom';

const getIcon = (type) => {
  if (type === 'danger') return (<div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5"><i className="fa-solid fa-circle-exclamation text-xs" /></div>);
  if (type === 'warning') return (<div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5"><i className="fa-solid fa-triangle-exclamation text-xs" /></div>);
  if (type === 'invite') return (<div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5"><i className="fa-solid fa-user-plus text-xs" /></div>);
  return (<div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5"><i className="fa-solid fa-bell text-xs" /></div>);
};

export const NotificationItem = ({ item, onRespond, onDismiss, responding, onClose }) => {
  return (
    <div className={`p-2.5 rounded-xl border transition-all ${item.isUnread ? 'bg-white border-indigo-200 shadow-xs' : 'bg-slate-50/70 border-slate-200'}`}>
      <div className="flex gap-2.5">
        {getIcon(item.type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-0.5">
            <span className="text-xs font-bold text-slate-900 leading-tight truncate">{item.title}</span>
            <div className="inline-flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-slate-400 whitespace-nowrap">{item.time}</span>
              {item.isUnread && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 ring-2 ring-indigo-100 shrink-0" />}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug mt-0.5">{item.desc}</p>
          {item.meta && (
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{item.meta.tag}</span>
              {item.meta.sub && <span className="truncate">{item.meta.sub}</span>}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            {item.category === 'invitations' ? (
              <>
                <button type="button" onClick={() => onRespond(item.invId, 'ACCEPT')} disabled={responding === item.invId} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50">
                  {responding === item.invId ? 'Joining...' : 'Accept'}
                </button>
                <button type="button" onClick={() => onRespond(item.invId, 'REJECT')} disabled={responding === item.invId} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium rounded-md transition-colors disabled:opacity-50">
                  Decline
                </button>
              </>
            ) : (
              <>
                {item.actionLink && (
                  <Link to={item.actionLink} onClick={onClose} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-md transition-colors">
                    View Pipeline
                  </Link>
                )}
                <button type="button" onClick={() => onDismiss(item.id)} className="px-2 py-1 text-slate-400 hover:text-slate-600 text-[11px] font-medium rounded-md transition-colors">
                  Dismiss
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;

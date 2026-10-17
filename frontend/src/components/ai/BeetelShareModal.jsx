import React, { useState, useEffect } from 'react';
import { Button } from '../common';
import { CloseIcon } from '../layout/Icons';
import { aiApi } from '../../services/aiApi';
import { useNotification } from '../../contexts/NotificationContext';

export const BeetelShareModal = ({ isOpen, onClose, session, onSessionUpdated, currentUser }) => {
  const notification = useNotification();
  const [members, setMembers] = useState([]), [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState(''), [loading, setLoading] = useState(false), [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !session?.id) { setSearch(''); setSelectedIds([]); return; }
    setLoading(true);
    const q = search.trim();
    aiApi.listOrgMembers(q || undefined, q ? undefined : 5)
      .then((res) => setMembers(res?.data || res || []))
      .catch((e) => notification?.error?.(e?.message || 'Failed to load members'))
      .finally(() => setLoading(false));
  }, [isOpen, session?.id, search]);

  if (!isOpen || !session) return null;
  const existingShared = new Set((session.sharedMembers || []).map((m) => m.userId));
  const myUserId = currentUser?.id || currentUser?.userId || (() => {
    try { return JSON.parse(localStorage.getItem('ds_user') || 'null')?.id; } catch { return null; }
  })() || session?.ownerUserId || session?.owner?.userId || session?.userId;
  const myUserEmail = currentUser?.email || (() => {
    try { return JSON.parse(localStorage.getItem('ds_user') || 'null')?.email; } catch { return null; }
  })() || session?.owner?.email || session?.ownerEmail;

  const filtered = members.filter((m) => {
    if (myUserId && (String(m.userId) === String(myUserId) || String(m.id) === String(myUserId))) return false;
    if (myUserEmail && m.email && m.email.toLowerCase() === myUserEmail.toLowerCase()) return false;
    if (session?.ownerUserId && String(m.userId) === String(session.ownerUserId)) return false;
    if (session?.owner?.userId && String(m.userId) === String(session.owner.userId)) return false;
    return true;
  });
  const shareableMembers = search.trim() ? filtered : filtered.slice(0, 5);

  const handleShare = async () => {
    if (selectedIds.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await aiApi.shareSession(session.id, selectedIds);
      if (onSessionUpdated) onSessionUpdated(res?.data || res);
      notification.success('Conversation shared with selected members');
      onClose();
    } catch (e) { notification.error(e?.message || 'Failed to share'); }
    finally { setSubmitting(false); }
  };

  const toggleSelect = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Share Conversation</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{session.title || 'Untitled Session'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"><CloseIcon /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-2">
          <input id="beetel-share-search-input" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team members by name or email..." className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-surface-50 focus:bg-white focus:outline-none focus:border-indigo-600 mb-3" />
          {loading ? <div className="py-8 text-center text-xs text-slate-400">Loading members...</div> : shareableMembers.length === 0 ? <div className="py-8 text-center text-xs text-slate-400">No members found.</div> : (
            shareableMembers.map((m) => {
              const isShared = existingShared.has(m.userId);
              const isChecked = isShared || selectedIds.includes(m.userId);
              return (
                <label key={m.userId} className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer ${isChecked ? 'bg-indigo-50/70 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input type="checkbox" checked={isChecked} disabled={isShared} onChange={() => toggleSelect(m.userId)} className="accent-indigo-600" />
                    <div className="truncate"><div className="font-semibold text-slate-900 truncate">{m.fullName || m.email}</div><div className="text-[11px] text-slate-500 truncate">{m.email}</div></div>
                  </div>
                  {isShared && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Shared</span>}
                </label>
              );
            })
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={selectedIds.length === 0 || submitting} onClick={handleShare}>{submitting ? 'Sharing...' : `Share (${selectedIds.length})`}</Button>
        </div>
      </div>
    </div>
  );
};

export default BeetelShareModal;

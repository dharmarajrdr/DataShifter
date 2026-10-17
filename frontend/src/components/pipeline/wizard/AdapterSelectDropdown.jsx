import React, { useEffect, useMemo, useRef, useState } from 'react';
import { OracleIcon, PostgresIcon } from '../../layout/Icons';

const renderLogo = (dbType) => {
  const base = 'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border';
  if (dbType === 'ORACLE') return <div className={`${base} bg-rose-50 border-rose-200`}><OracleIcon size={18} /></div>;
  if (dbType === 'POSTGRESQL') return <div className={`${base} bg-emerald-50 border-emerald-200`}><PostgresIcon size={18} /></div>;
  if (dbType === 'S3') return <div className={`${base} bg-amber-50 border-amber-200 text-amber-600`}><i className="fa-solid fa-cloud text-xs" /></div>;
  if (dbType === 'KAFKA') return <div className={`${base} bg-indigo-50 border-indigo-200 text-indigo-600`}><i className="fa-solid fa-share-nodes text-xs" /></div>;
  if (dbType === 'SNOWFLAKE') return <div className={`${base} bg-sky-50 border-sky-200 text-sky-600`}><i className="fa-solid fa-snowflake text-xs" /></div>;
  return <div className={`${base} bg-slate-50 border-slate-200 text-slate-600`}><i className="fa-solid fa-folder-open text-xs" /></div>;
};

export const AdapterSelectDropdown = ({ id = 'adapter-select', label, adapters = [], selectedId, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropRef = useRef(null);
  const selected = adapters.find((a) => a.id === selectedId) || adapters[0];

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? adapters.filter((a) => a.name.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q) || a.badge.toLowerCase().includes(q)) : adapters;
  }, [adapters, search]);

  return (
    <div id={id} ref={dropRef} className="relative w-full mb-4">
      {label && <label id={`${id}-label`} className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>}
      <button
        id={`${id}-trigger`}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <div className="flex items-center gap-3 text-left min-w-0">
          {renderLogo(selected?.dbType)}
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span className="truncate">{selected?.name}</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded">{selected?.badge}</span>
            </div>
            <div className="text-[11px] text-slate-500 truncate">{selected?.sub}</div>
          </div>
        </div>
        <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <div id={`${id}-menu`} className={`absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden ${open ? 'block' : 'hidden'}`}>
        <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <i className="fa-solid fa-magnifying-glass text-slate-400 text-xs pl-1" />
          <input
            id={`${id}-search-input`}
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search adapter name, protocol, or technology..."
            className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
          />
          {search && <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 text-xs px-1">✕</button>}
        </div>

        <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
          {filtered.map((adp) => (
            <div
              key={adp.id}
              id={`${id}-card-${adp.id}`}
              onClick={() => { onSelect(adp.id); setOpen(false); setSearch(''); }}
              className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${adp.id === selected?.id ? 'bg-indigo-50/70 text-indigo-950' : 'hover:bg-slate-50 text-slate-800'}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {renderLogo(adp.dbType)}
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                    <span>{adp.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-normal">{adp.badge}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{adp.sub}</div>
                </div>
              </div>
              {adp.id === selected?.id && <i className="fa-solid fa-check text-indigo-600 text-xs shrink-0" />}
            </div>
          ))}
          {filtered.length === 0 && <div className="py-4 text-center text-xs text-slate-400">No matching adapters found</div>}
        </div>
      </div>
    </div>
  );
};

export default AdapterSelectDropdown;


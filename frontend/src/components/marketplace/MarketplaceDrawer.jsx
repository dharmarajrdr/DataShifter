import { useEffect, useState } from 'react';
import { Badge, Button } from '../common';
import { DrawerReferencedPipelines } from './DrawerReferencedPipelines';

/** Slide-over drawer displaying connector details and specifications (<= 100 lines). */
export const MarketplaceDrawer = ({
  id = 'marketplace-drawer', className = '', adapter, isOpen = false, onClose, onToggleInstall,
}) => {
  const [refCount, setRefCount] = useState(0);
  useEffect(() => { setRefCount(adapter?.referencedPipelines?.length || adapter?.refCount || 0); }, [adapter]);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen || !adapter) return null;
  const isBlocked = Boolean(adapter.installed && (refCount > 0 || (adapter.refCount || 0) > 0));

  return (
    <div
      id={`${id}-backdrop`} role="dialog" aria-modal="true" aria-labelledby="drawer-adapter-name"
      className="fixed inset-0 !mt-0 m-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end transition-opacity"
      style={{ marginTop: 0 }} onClick={onClose}
    >
      <div id={id} className={`w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 ${className}`} onClick={(e) => e.stopPropagation()}>
        <div id="drawer-header" className="p-6 border-b border-surface-200 flex items-start justify-between">
          <div id="drawer-title-row" className="flex items-center gap-3">
            <div id="drawer-avatar" className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm select-none ${adapter.bg}`}>{adapter.avatarText}</div>
            <div>
              <h2 id="drawer-adapter-name" className="text-base font-bold text-slate-900">{adapter.name}</h2>
              <p id="drawer-adapter-meta" className="text-xs text-slate-500">{adapter.author} • {adapter.version}</p>
            </div>
          </div>
          <button id="drawer-close-btn" type="button" onClick={onClose} aria-label="Close details" className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div id="drawer-body" className="p-6 space-y-5 text-xs text-slate-600 flex-1">
          <div id="drawer-status-box" className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Status:</span>
              <Badge variant={adapter.installed ? 'primary' : 'neutral'} size="sm">{adapter.installed ? 'Installed' : 'Available'}</Badge>
            </div>
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">{adapter.role}</span>
          </div>

          <div id="drawer-desc-section" className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">Overview</h3>
            <p className="leading-relaxed text-slate-600">{adapter.desc}</p>
          </div>

          <div id="drawer-features-section" className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">Key Capabilities</h3>
            <div className="grid grid-cols-2 gap-2">
              {adapter.features?.map((f, i) => (<div key={i} className="p-2 bg-slate-50 rounded border border-slate-100 text-slate-700 font-medium">✓ {f}</div>))}
            </div>
          </div>

          <DrawerReferencedPipelines adapter={adapter} onCountChange={setRefCount} />

          {adapter.permissions && (
            <details id="drawer-permissions-section" className="group rounded-lg border border-slate-200 p-4 transition-colors open:bg-white open:border-slate-300">
              <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-slate-900 select-none list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2"><i className="fa fa-shield text-blue-500" /><span>Required Database Privileges</span></div>
                <span className="text-slate-400 text-[10px] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <pre className="mt-2 p-2 bg-slate-900 text-slate-200 rounded font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">{adapter.permissions}</pre>
            </details>
          )}
        </div>

        <div id="drawer-footer" className="p-4 px-6 border-t border-surface-200 bg-slate-50 flex items-center justify-between gap-3">
          <Button
            id="drawer-install-btn" variant={adapter.installed ? 'secondary' : 'primary'} size="sm"
            disabled={isBlocked} title={isBlocked ? `Cannot uninstall: Referenced by ${refCount} pipeline(s)` : undefined}
            onClick={() => !isBlocked && onToggleInstall(adapter.id)}
          >
            {isBlocked && (
              <svg id="drawer-lock-icon" className="w-3.5 h-3.5 mr-1.5 inline-block text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" />
              </svg>
            )}
            {adapter.installed ? 'Uninstall Adapter' : 'Install Adapter'}
          </Button>
          <div className="flex items-center gap-2">
            <Button id="drawer-close-action-btn" variant="ghost" size="sm" onClick={onClose}>Close</Button>
            <Button id="drawer-configure-btn" variant="primary" size="sm" onClick={() => { window.location.href = '/connections'; }}>Configure</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceDrawer;

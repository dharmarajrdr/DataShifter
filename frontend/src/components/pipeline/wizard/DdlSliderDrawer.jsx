import React, { useState, useEffect } from 'react';
import { parseDdlColumns } from '../../../utils/ddlParser';

export const DdlSliderDrawer = ({ isOpen, onClose, entityName, ddlSql, onSave }) => {
  const [val, setVal] = useState(ddlSql || '');

  useEffect(() => {
    setVal(ddlSql || '');
  }, [ddlSql, isOpen]);

  const handleTemplate = () => {
    const name = entityName || 'CUSTOMERS';
    setVal(`CREATE TABLE ${name} (\n  ID NUMBER(10) PRIMARY KEY,\n  NAME VARCHAR2(100) NOT NULL,\n  EMAIL VARCHAR2(255),\n  STATUS VARCHAR2(20),\n  UPDATED_AT TIMESTAMP\n);`);
  };

  const cols = parseDdlColumns(val).length;

  return (
    <>
      <div
        id="ddl-drawer-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(2px)', zIndex: 1040, opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none', transition: 'opacity 0.3s ease',
        }}
      />
      <div
        id="ddl-drawer-panel"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 500,
          maxWidth: 'calc(100vw - 40px)', background: '#ffffff', zIndex: 1050,
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.18)', display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="px-5 py-4 bg-indigo-600 text-white flex items-center justify-between shrink-0">
          <div>
            <h4 className="text-sm font-semibold">DDL Schema: {entityName || 'Entity'}</h4>
            <p className="text-[11px] text-indigo-100/80">Schema definition for offline CDC parsing</p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">✕</button>
        </div>
        <div className="flex-1 p-5 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Table DDL Statement (SQL)</span>
            <button type="button" onClick={handleTemplate} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md">Insert Template</button>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 shadow-inner flex flex-col h-[340px]">
            <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5 font-mono"><span className="w-2 h-2 rounded-full bg-emerald-400" />SQL DDL</span>
              <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">{cols} column{cols === 1 ? '' : 's'}</span>
            </div>
            <textarea
              id="ddl-drawer-sql-textarea"
              rows={12}
              spellCheck="false"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full flex-1 p-3 text-xs font-mono bg-transparent text-emerald-400 focus:outline-none resize-none leading-relaxed"
              placeholder="CREATE TABLE SCHEMA.TABLE (&#10;  ID NUMBER PRIMARY KEY,&#10;  NAME VARCHAR2(100)&#10;);"
            />
          </div>
          <p className="text-[11px] text-slate-500 bg-slate-50 p-3 border rounded-xl">DataShifter parses this DDL when trail files do not yet exist on disk to populate the column mapping board.</p>
        </div>
        <div className="px-5 py-3.5 bg-slate-50 border-t flex items-center justify-end gap-2.5 shrink-0">
          <button type="button" onClick={onClose} className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/70 border rounded-lg">Cancel</button>
          <button type="button" onClick={() => { onSave(val); onClose(); }} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">Save Schema DDL</button>
        </div>
      </div>
    </>
  );
};

export default DdlSliderDrawer;

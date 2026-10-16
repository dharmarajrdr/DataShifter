import React from 'react';
import { Button } from '../common';
import { CloseIcon } from '../layout/Icons';

export const BeetelSchemaDiffModal = ({ isOpen, onClose, sessionTitle = 'Schema Diff' }) => {
  if (!isOpen) return null;

  const diffRows = [
    { sourceCol: 'order_id (BIGINT)', targetCol: 'ORDER_ID (NUMBER(38,0))', status: 'Mapped', type: 'match' },
    { sourceCol: 'customer_email (VARCHAR(255))', targetCol: 'CUSTOMER_EMAIL (VARCHAR - SHA256)', status: 'PII Masked', type: 'transform' },
    { sourceCol: 'total_amount (NUMERIC(10,2))', targetCol: 'TOTAL_AMOUNT (FLOAT)', status: 'Cast Float', type: 'transform' },
    { sourceCol: 'created_at (TIMESTAMPTZ)', targetCol: 'INGESTED_AT (TIMESTAMP_NTZ)', status: 'Auto Inferred', type: 'match' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Schema Difference & Inference</h3>
            <p className="text-xs text-slate-500 mt-0.5">{sessionTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="px-3 py-2.5">Source Aurora Column</th>
                <th className="px-3 py-2.5">Target Snowflake Column</th>
                <th className="px-3 py-2.5 text-right">Inference State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {diffRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-slate-800">{row.sourceCol}</td>
                  <td className="px-3 py-2.5 text-slate-800">{row.targetCol}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      row.type === 'match' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end shrink-0 bg-slate-50">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default BeetelSchemaDiffModal;

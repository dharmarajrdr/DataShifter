import React, { useState, useEffect, useMemo } from 'react';
import { CloseIcon } from '../layout/Icons';
import { connectionApi } from '../../services/api';
import { ErrorPage } from '../../pages/ErrorPage';
import SchemaTableItem from './SchemaTableItem';

export const SchemaDrawer = ({ connectionId, connectionName, onClose }) => {
  const [tables, setTables] = useState([]);
  const [expandedTable, setExpandedTable] = useState(null);
  const [columns, setColumns] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    connectionApi.listTables(connectionId)
      .then((res) => { setTables(res.data || []); setLoading(false); })
      .catch((err) => {
        setError(err.message || 'Failed to load tables');
        setErrorStatus(err.status || err?.response?.status || 500);
        setLoading(false);
      });
  }, [connectionId]);

  const toggleTable = async (tableName) => {
    if (expandedTable === tableName) return setExpandedTable(null);
    setExpandedTable(tableName);
    if (!columns[tableName]) {
      try {
        const res = await connectionApi.getTableMetadata(connectionId, tableName);
        setColumns((prev) => ({ ...prev, [tableName]: res.data?.columns || [] }));
      } catch {
        setColumns((prev) => ({ ...prev, [tableName]: [] }));
      }
    }
  };

  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? tables.filter((t) => t.toLowerCase().includes(q)) : tables;
  }, [tables, search]);

  return (
    <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Schema browser</h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">{connectionName}</p>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <CloseIcon />
        </button>
      </div>

      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${tables.length} tables...`}
          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading schema...</div>
        ) : error ? (
          <ErrorPage status={errorStatus || 500} compact message={error} missingPermission={errorStatus === 403 ? 'connection:browse_schema' : undefined} showBack={false} showHome={false} />
        ) : filteredTables.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">{search ? 'No matching tables' : 'No tables found'}</div>
        ) : (
          filteredTables.map((table) => (
            <SchemaTableItem key={table} table={table} isExpanded={expandedTable === table} onToggle={toggleTable} columns={columns} />
          ))
        )}
      </div>

      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0 flex justify-between items-center text-xs text-slate-500">
        <span>{filteredTables.length} {filteredTables.length === 1 ? 'table' : 'tables'} in schema</span>
        <button type="button" onClick={onClose} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Close</button>
      </div>
    </div>
  );
};

export default SchemaDrawer;
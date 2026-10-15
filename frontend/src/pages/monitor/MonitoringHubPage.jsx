import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelineApi } from '../../services/api';
import { ApiGuard, BarLoader, Button } from '../../components/common';
import { MonitoringHubKpi } from '../../components/monitor/MonitoringHubKpi';
import { MonitoringHubGrid } from '../../components/monitor/MonitoringHubGrid';

/**
 * Central Live Stream & Batch Pipeline Monitoring Hub Page (<= 100 lines).
 */
export const MonitoringHubPage = ({ id = 'monitoring-hub-page' }) => {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchPipelines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pipelineApi.getAll();
      setPipelines(res.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPipelines(); }, [fetchPipelines]);

  const filtered = useMemo(() => {
    return pipelines.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.namespace || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [pipelines, search, statusFilter]);

  const statusOptions = ['ALL', 'RUNNING', 'PAUSED', 'STOPPED', 'FAILED'];

  return (
    <ApiGuard error={error} loading={loading} loadingComponent={<div id={`${id}-loading`} className="p-6"><BarLoader /></div>}>
      <div id={id} className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
        <div id={`${id}-header`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 id={`${id}-title`} className="text-xl font-bold text-slate-900 tracking-tight">Pipeline Monitoring Hub</h1>
            <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-1">Real-time health, CDC replication checkpoints, and telemetry streams across all pipelines.</p>
          </div>
          <Button id={`${id}-refresh-btn`} variant="secondary" size="sm" onClick={fetchPipelines}>
            Refresh Telemetry
          </Button>
        </div>

        <MonitoringHubKpi id={`${id}-kpis`} pipelines={pipelines} />

        <div id={`${id}-toolbar`} className="bg-white border border-slate-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
          <input
            id={`${id}-search-input`}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active pipelines by name or namespace..."
            className="w-full sm:max-w-xs text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div id={`${id}-status-filters`} className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {statusOptions.map((opt) => (
              <button
                key={opt}
                id={`${id}-filter-${opt.toLowerCase()}`}
                type="button"
                onClick={() => setStatusFilter(opt)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  statusFilter === opt
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <MonitoringHubGrid id={`${id}-grid`} pipelines={filtered} navigate={navigate} />
      </div>
    </ApiGuard>
  );
};

export default MonitoringHubPage;

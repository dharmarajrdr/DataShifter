import React from 'react';
import { Workflow, Columns, Shield, Calendar, HardDrive } from 'lucide-react';

export const UdfDependencies = ({ jar, activeTab = 'deps' }) => {
  if (!jar) return null;

  if (activeTab === 'meta') {
    return (
      <div id="udf-meta-container" className="bg-white border border-surface-200 rounded-xl p-5 shadow-subtle flex flex-col gap-3.5 text-xs">
        <div id="udf-meta-item-pkg" className="flex items-center justify-between py-1 border-b border-surface-100">
          <span id="udf-meta-label-pkg" className="text-content-secondary font-medium">Package Root</span>
          <span id="udf-meta-val-pkg" className="font-mono text-content-primary">com.datashifter.udf</span>
        </div>
        <div id="udf-meta-item-jdk" className="flex items-center justify-between py-1 border-b border-surface-100">
          <span id="udf-meta-label-jdk" className="text-content-secondary font-medium">Target JDK Specification</span>
          <span id="udf-meta-val-jdk" className="text-content-primary font-medium">Java SE 17 (LTS) / Java 21</span>
        </div>
        <div id="udf-meta-item-sha" className="flex items-center justify-between py-1 border-b border-surface-100">
          <span id="udf-meta-label-sha" className="text-content-secondary font-medium">SHA-256 Checksum</span>
          <span id="udf-meta-val-sha" className="font-mono text-[11px] text-content-secondary truncate max-w-xs">
            {jar.checksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
          </span>
        </div>
        <div id="udf-meta-item-date" className="flex items-center justify-between py-1">
          <span id="udf-meta-label-date" className="text-content-secondary font-medium">Last Introspected</span>
          <span id="udf-meta-val-date" className="text-content-primary tabular-nums">
            {jar.updatedAt ? new Date(jar.updatedAt).toLocaleString() : 'Not published'}
          </span>
        </div>
      </div>
    );
  }

  const pipelines = Number(jar.pipelineCount || 0);
  const columns = Number(jar.columnCount || 0);

  return (
    <div id="udf-deps-container" className="flex flex-col gap-3">
      <div id="udf-deps-stat-cards" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div id="udf-dep-stat-pipelines" className="bg-white border border-surface-200 rounded-xl p-4 shadow-subtle flex items-center gap-3">
          <div id="udf-dep-icon-wrap-pipe" className="w-9 h-9 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center">
            <Workflow id="udf-dep-stat-pipe-icon" className="w-4 h-4" />
          </div>
          <div id="udf-dep-stat-pipe-info">
            <p id="udf-dep-stat-pipe-count" className="text-lg font-semibold text-content-primary tabular-nums">{pipelines}</p>
            <p id="udf-dep-stat-pipe-label" className="text-xs text-content-secondary">Referencing Pipelines</p>
          </div>
        </div>

        <div id="udf-dep-stat-cols" className="bg-white border border-surface-200 rounded-xl p-4 shadow-subtle flex items-center gap-3">
          <div id="udf-dep-icon-wrap-cols" className="w-9 h-9 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center">
            <Columns id="udf-dep-stat-cols-icon" className="w-4 h-4" />
          </div>
          <div id="udf-dep-stat-cols-info">
            <p id="udf-dep-stat-cols-count" className="text-lg font-semibold text-content-primary tabular-nums">{columns}</p>
            <p id="udf-dep-stat-cols-label" className="text-xs text-content-secondary">Transformed Columns</p>
          </div>
        </div>
      </div>

      <div id="udf-deps-card" className="bg-white border border-surface-200 rounded-xl p-4 shadow-subtle text-xs">
        <div id="udf-deps-header" className="flex items-center justify-between pb-3 border-b border-surface-100">
          <span id="udf-deps-heading" className="font-semibold text-content-primary">Dependency Locks & Safety Guard</span>
          <span id={`udf-deps-guard-status`} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${pipelines > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {pipelines > 0 ? 'Deletion Locked' : 'Safe to Remove'}
          </span>
        </div>
        <p id="udf-deps-guard-desc" className="text-content-secondary mt-2.5 leading-relaxed">
          {pipelines > 0
            ? `This JAR is currently loaded by ${pipelines} active pipeline(s). To protect in-flight data migrations from runtime ClassNotFoundExceptions, artifact deletion is automatically disabled until pipelines unbind all UDF references.`
            : 'No pipelines or transformation mappings currently depend on this compiled binary. Deletion is unlocked.'}
        </p>
      </div>
    </div>
  );
};

export default UdfDependencies;

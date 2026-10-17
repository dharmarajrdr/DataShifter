import React from 'react';
import TargetConnectionField from './TargetConnectionField';

/**
 * Real-world credentials & storage parameters for Target Adapter (<= 100 lines).
 */
export const WizardTargetFields = ({
  id = 'wizard-target-fields',
  adapter = 's3-writer',
  config,
  setConfig,
  connections = [],
}) => {
  if (adapter === 'postgres-writer' || adapter === 'oracle-writer') {
    return <TargetConnectionField id={id} adapter={adapter} config={config} setConfig={setConfig} connections={connections} />;
  }

  if (adapter === 's3-writer') {
    const s3Conns = connections.filter((c) => (c.dbType || '').toUpperCase() === 'S3');
    return (
      <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">AWS Connection *</label>
            <span className="text-[11px] text-slate-500 font-medium">
              {s3Conns.length} connection{s3Conns.length === 1 ? '' : 's'} available
            </span>
          </div>
          <select
            id={`${id}-s3-conn-select`}
            className="w-full max-w-[320px] px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={config.target || ''}
            onChange={(e) => setConfig({ ...config, target: e.target.value })}
          >
            <option value="">Select AWS S3 Connection...</option>
            {s3Conns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          {s3Conns.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              No AWS connections configured. Store AWS credentials in Connections.
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">AWS Region</label>
            <select id={`${id}-s3-region`} className="w-full max-w-[320px] px-2.5 py-1.5 text-xs border rounded-lg bg-white" value={config.s3Region || 'us-east-1'} onChange={(e) => setConfig({ ...config, s3Region: e.target.value })}>
              <option value="us-east-1">us-east-1 (N. Virginia)</option>
              <option value="us-west-2">us-west-2 (Oregon)</option>
              <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">S3 Bucket Name &amp; Base Prefix</label>
            <input id={`${id}-s3-bucket`} className="w-full max-w-[320px] px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.s3Bucket || ''} onChange={(e) => setConfig({ ...config, s3Bucket: e.target.value })} placeholder="datashifter-analytics-lake/raw" />
          </div>
        </div>
      </div>
    );
  }

  if (adapter === 'kafka-writer') {
    return (
      <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bootstrap Servers</label>
            <input id={`${id}-kafka-servers`} className="w-full max-w-[320px] px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.kafkaBootstrap || ''} onChange={(e) => setConfig({ ...config, kafkaBootstrap: e.target.value })} placeholder="broker1.corp:9092,broker2.corp:9092" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Topic</label>
            <input id={`${id}-kafka-topic`} className="w-full max-w-[320px] px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.kafkaTopic || ''} onChange={(e) => setConfig({ ...config, kafkaTopic: e.target.value })} placeholder="cdc-events-stream" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Snowflake Account Identifier</label>
          <input id={`${id}-sf-account`} className="w-full max-w-[320px] px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.snowflakeAccount || ''} onChange={(e) => setConfig({ ...config, snowflakeAccount: e.target.value })} placeholder="xy12345.us-east-1" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse &amp; Database</label>
          <input id={`${id}-sf-db`} className="w-full max-w-[320px] px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.snowflakeDatabase || ''} onChange={(e) => setConfig({ ...config, snowflakeDatabase: e.target.value })} placeholder="COMPUTE_WH.ANALYTICS_DB" />
        </div>
      </div>
    </div>
  );
};

export default WizardTargetFields;

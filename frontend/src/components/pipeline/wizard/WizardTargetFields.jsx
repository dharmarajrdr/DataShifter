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
    return (
      <div id={id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">AWS Access Key ID</label>
            <input id={`${id}-s3-key`} type="password" className="w-full max-w-[320px] px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.s3AccessKey || ''} onChange={(e) => setConfig({ ...config, s3AccessKey: e.target.value })} placeholder="AKIAIOSFODNN7EXAMPLE" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">AWS Secret Access Key</label>
            <input id={`${id}-s3-secret`} type="password" className="w-full max-w-[320px] px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-white" value={config.s3SecretKey || ''} onChange={(e) => setConfig({ ...config, s3SecretKey: e.target.value })} placeholder="••••••••••••••••••••••••" />
          </div>
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

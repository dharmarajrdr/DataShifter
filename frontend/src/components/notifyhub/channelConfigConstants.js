export const CHANNEL_TYPES = [
  { value: 'SLACK', label: 'Slack Webhook', tag: '#', tagCls: 'bg-[#FDF2F8] text-[#DB2777]', sub: 'Slack Incoming Webhook' },
  { value: 'EMAIL', label: 'Email (SMTP)', tag: '@', tagCls: 'bg-[#FFFBEB] text-[#D97706]', sub: 'SMTP Relay' },
  { value: 'TEAMS', label: 'Microsoft Teams', tag: 'MS', tagCls: 'bg-purple-50 text-purple-700', sub: 'MS Teams Webhook' },
  { value: 'CLIQ', label: 'Zoho Cliq', tag: 'CQ', tagCls: 'bg-teal-50 text-teal-700', sub: 'Zoho Cliq Webhook' },
  { value: 'WEBHOOK', label: 'Custom HTTP Webhook', tag: 'WH', tagCls: 'bg-[#EEF2FF] text-[#4F46E5]', sub: 'Custom Webhook' },
];

export const GLOBAL_RESOURCE_SCOPES = [
  { isHeader: true, label: 'Global Platform Scopes' },
  { value: 'ALL', label: 'All Resources (Entire Platform)', sublabel: 'Allows all workflows, pipelines, udfs, connections' },
  { value: 'RESOURCE:WORKFLOW', label: 'All Workflows', sublabel: 'Allows all workflow orchestrations' },
  { value: 'RESOURCE:PIPELINE', label: 'All Pipelines', sublabel: 'Allows all data pipelines' },
  { value: 'RESOURCE:UDF', label: 'All UDFs', sublabel: 'Allows all User-Defined transformation functions' },
  { value: 'RESOURCE:CONNECTION', label: 'All Database Connections', sublabel: 'Allows all connectors' },
];

export const parseChannelConfig = (channel) => {
  if (!channel?.configJson) return {};
  try { return JSON.parse(channel.configJson); } catch { return {}; }
};

import React from 'react';

export const NotifyHubTabFilters = ({
  id,
  activeTab,
  listenerResourceFilter,
  onResourceFilterChange,
  channelTypeFilter,
  onChannelTypeFilterChange,
}) => {
  return (
    <div id={`${id}-select-group`} className="flex items-center gap-2 self-end sm:self-auto">
      {activeTab === 'listeners' && (
        <select
          id={`${id}-filter-resource`}
          aria-label="Filter listeners by resource"
          value={listenerResourceFilter}
          onChange={(e) => onResourceFilterChange(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="ALL">All Resources</option>
          <option value="PIPELINE">Pipeline Events</option>
          <option value="WORKFLOW">Workflow Events</option>
          <option value="UDF">UDF Events</option>
          <option value="CONNECTION">Connection Events</option>
          <option value="SETUP">System Setup</option>
          <option value="BEETEL">Beetel AI</option>
        </select>
      )}

      {activeTab === 'channels' && (
        <select
          id={`${id}-filter-channel-type`}
          aria-label="Filter by channel destination type"
          value={channelTypeFilter}
          onChange={(e) => onChannelTypeFilterChange(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="ALL">All Channel Types</option>
          <option value="SLACK">Slack</option>
          <option value="EMAIL">Email SMTP</option>
          <option value="TEAMS">Microsoft Teams</option>
          <option value="CLIQ">Zoho Cliq</option>
          <option value="WEBHOOK">Custom Webhooks</option>
        </select>
      )}
    </div>
  );
};

export default NotifyHubTabFilters;

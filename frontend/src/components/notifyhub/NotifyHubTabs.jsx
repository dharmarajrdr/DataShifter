import React from 'react';

export const NotifyHubTabs = ({
  id = 'notifyhub-tabs',
  activeTab,
  onTabChange,
  listenerCount = 0,
  channelCount = 0,
  templateCount = 0,
  listenerResourceFilter,
  onResourceFilterChange,
  channelTypeFilter,
  onChannelTypeFilterChange,
  searchQuery,
  onSearchChange,
}) => {
  const tabs = [
    { key: 'channels', label: `Channels (${channelCount})`, icon: 'fa-solid fa-bullhorn' },
    { key: 'listeners', label: `Event Listeners (${listenerCount})`, icon: 'fa-solid fa-bolt' },
    { key: 'templates', label: `Alert Templates (${templateCount})`, icon: 'fa-solid fa-envelope-open-text' },
    { key: 'logs', label: 'Dispatch Audit Logs', icon: 'fa-solid fa-clock-rotate-left' },
  ];

  return (
    <div id={id} className="ds-notifyhub-tabs flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-3 mb-5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`${id}-tab-${tab.key}`}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                active ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <i className={`${tab.icon} text-xs`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {activeTab === 'listeners' && (
          <select
            id={`${id}-filter-resource`}
            value={listenerResourceFilter}
            onChange={(e) => onResourceFilterChange(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="ALL">All Resources</option>
            <option value="PIPELINE">Pipeline</option>
            <option value="WORKFLOW">Workflow</option>
            <option value="UDF">UDF</option>
            <option value="CONNECTION">Connection</option>
            <option value="SETUP">Setup</option>
            <option value="BEETEL">Beetel</option>
          </select>
        )}

        {activeTab === 'channels' && (
          <select
            id={`${id}-filter-channel-type`}
            value={channelTypeFilter}
            onChange={(e) => onChannelTypeFilterChange(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="ALL">All Types</option>
            <option value="SLACK">Slack</option>
            <option value="EMAIL">Email</option>
            <option value="TEAMS">Teams</option>
            <option value="CLIQ">Cliq</option>
            <option value="WEBHOOK">Webhook</option>
          </select>
        )}

        {activeTab !== 'logs' && (
          <div className="relative">
            <input
              id={`${id}-search`}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="text-xs pl-7 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white w-48 focus:outline-none focus:border-indigo-600"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-[10px]" />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotifyHubTabs;

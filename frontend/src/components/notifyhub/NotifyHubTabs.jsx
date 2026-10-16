import React from 'react';
import NotifyHubTabFilters from './NotifyHubTabFilters';

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
    {
      key: 'channels',
      label: `Channels (${channelCount})`,
      icon: (
        <svg className="w-4 h-4 stroke-current fill-none shrink-0" strokeWidth="2" viewBox="0 0 24 24">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ),
    },
    {
      key: 'listeners',
      label: `Event Listeners (${listenerCount})`,
      icon: (
        <svg className="w-4 h-4 stroke-current fill-none shrink-0" strokeWidth="2" viewBox="0 0 24 24">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      key: 'templates',
      label: `Alert Templates (${templateCount})`,
      icon: (
        <svg className="w-4 h-4 stroke-current fill-none shrink-0" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
    {
      key: 'logs',
      label: 'Dispatch Audit Logs',
      icon: (
        <svg className="w-4 h-4 stroke-current fill-none shrink-0" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 14 14" />
        </svg>
      ),
    },
  ];

  return (
    <div id={id} className="ds-notifyhub-tabs flex items-center justify-between flex-wrap gap-4 border-b border-slate-200">
      <div className="flex items-center gap-[18px] overflow-x-auto">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`${id}-tab-${tab.key}`}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`py-2 text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 -mb-[1px] whitespace-nowrap ${
                active ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 hover:text-slate-900 border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <NotifyHubTabFilters
        id={id}
        activeTab={activeTab}
        listenerResourceFilter={listenerResourceFilter}
        onResourceFilterChange={onResourceFilterChange}
        channelTypeFilter={channelTypeFilter}
        onChannelTypeFilterChange={onChannelTypeFilterChange}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />
    </div>
  );
};

export default NotifyHubTabs;

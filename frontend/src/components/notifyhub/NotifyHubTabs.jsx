import React from 'react';
import NotifyHubTabFilters from './NotifyHubTabFilters';

export const NotifyHubTabs = ({
  id = 'notifyhub-tabs',
  activeTab,
  onTabChange,
  listenerCount = 0,
  channelCount = 0,
  templateCount = 0,
  logCount = 0,
  listenerResourceFilter,
  onResourceFilterChange,
  channelTypeFilter,
  onChannelTypeFilterChange,
  searchQuery,
  onSearchChange,
}) => {
  const tabs = [
    { key: 'channels', label: 'Channels', count: channelCount },
    { key: 'listeners', label: 'Event Listeners', count: listenerCount },
    { key: 'templates', label: 'Alert Templates', count: templateCount },
    { key: 'logs', label: 'Dispatch Audit Logs', count: logCount },
  ];

  return (
    <div id={`${id}-card`} className="bg-white border border-slate-200 rounded-xl p-4 shadow-subtle space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            id={`${id}-search`}
            type="text"
            placeholder="Search channels, listeners, templates, or logs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <NotifyHubTabFilters
          id={id}
          activeTab={activeTab}
          listenerResourceFilter={listenerResourceFilter}
          onResourceFilterChange={onResourceFilterChange}
          channelTypeFilter={channelTypeFilter}
          onChannelTypeFilterChange={onChannelTypeFilterChange}
        />
      </div>

      <div id={id} role="tablist" className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`${id}-tab-${tab.key}`}
              role="tab"
              aria-selected={isSelected}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                isSelected
                  ? 'bg-brand text-white shadow-subtle'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isSelected ? 'bg-brand-700/50 text-white' : 'bg-slate-200/80 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NotifyHubTabs;

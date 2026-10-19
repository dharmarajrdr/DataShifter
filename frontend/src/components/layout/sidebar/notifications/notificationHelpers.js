export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Recent';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (isNaN(diff) || diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const filterNotifications = (items = [], activeTab = 'all') => {
  if (activeTab === 'all') return items;
  return items.filter((item) => item.category === activeTab);
};

export const countUnreadByCategory = (items = []) => ({
  all: items.length,
  alerts: items.filter((i) => i.category === 'alerts').length,
  invitations: items.filter((i) => i.category === 'invitations').length,
  system: items.filter((i) => i.category === 'system').length,
});

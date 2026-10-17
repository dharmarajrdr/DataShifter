import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import BeetelSplitPanel from '../ai/BeetelSplitPanel';
import { Header } from './header';
import { Sidebar } from './sidebar';

/**
 * App layout shell with responsive collapsible sidebar and minimal header bar.
 */
export const AppLayout = ({ id = 'app-root-layout', className = '' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div id={id} className={`flex min-h-screen bg-surface-50 ${className}`}>
      <Sidebar
        id="main-sidebar"
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <div
        id="app-main-container"
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out
          ${isCollapsed ? 'ml-16' : 'ml-60'}`}
      >
        <Header
          id="main-top-header"
          isSidebarCollapsed={isCollapsed}
          onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
        />
        <main
          id="main-content-viewport"
          className="flex-1 p-6 overflow-y-auto h-[calc(100vh-50px)] max-h-[calc(100vh-50px)]"
          style={{
            height: 'calc(100vh - 50px)',
            maxHeight: 'calc(100vh - 50px)',
          }}
        >
          <div className="w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <BeetelSplitPanel />
    </div>
  );
};

export default AppLayout;

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { SIDEBAR_WIDTH, SPACING } from '../../constants/design';

const AppLayout = () => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <Sidebar />
    <div style={{
      marginLeft: SIDEBAR_WIDTH,
      flex: 1,
      padding: SPACING.xl,
      minWidth: 0,
      backgroundColor: '#fff'
    }}>
      <Outlet />
    </div>
  </div>
);

export default AppLayout;

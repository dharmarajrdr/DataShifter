import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, permission }) => {
  const { isAuthenticated, hasOrg, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasOrg && location.pathname !== '/onboard') {
    return <Navigate to="/onboard" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6B6B6B' }}>
        <p style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Access denied</p>
        <p style={{ fontSize: '14px' }}>You don't have permission to access this page.</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
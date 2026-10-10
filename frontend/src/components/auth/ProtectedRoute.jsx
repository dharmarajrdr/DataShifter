import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

import { ForbiddenPage } from '../../pages/ErrorPage';

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
      <ForbiddenPage
        missingPermission={permission}
        message="You don't have permission to access this page."
      />
    );
  }

  return children;
};

export default ProtectedRoute;
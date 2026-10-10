import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

import { ForbiddenPage } from '../../pages/ErrorPage';

const ProtectedRoute = ({ children, permission, anyOf }) => {
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

  if (anyOf && anyOf.length > 0 && !anyOf.some(p => hasPermission(p))) {
    return (
      <ForbiddenPage
        missingPermission={anyOf.join(' or ')}
        message="You don't have permission to access this page."
      />
    );
  }

  return children;
};

export default ProtectedRoute;
import React from 'react';
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from '../../pages/ErrorPage';

/**
 * Wraps page content with automatic error/loading handling.
 *
 * @example
 *   const [data, setData] = useState(null);
 *   const [error, setError] = useState(null);
 *   const [loading, setLoading] = useState(true);
 *
 *   return (
 *     <ApiGuard error={error} loading={loading} onRetry={fetchData}>
 *       <div>Your page content here — only renders when no error and not loading</div>
 *     </ApiGuard>
 *   );
 */
const ApiGuard = ({ error, loading, onRetry, loadingComponent, children }) => {
  if (error) {
    const status = Number(error.status || error?.response?.status) || 0;
    const message = error.message || error?.response?.data?.message;
    const missingPermission = error.info?.missingPermission || error?.response?.data?.info?.missingPermission;
    const details = error.details || error?.response?.data?.details;

    if (status === 403) {
      return (
        <ForbiddenPage
          message={message}
          missingPermission={missingPermission}
          details={details}
        />
      );
    }

    if (status === 404) {
      return (
        <NotFoundPage
          message={message}
          onRetry={onRetry}
          details={details}
        />
      );
    }

    if (status >= 500 || status === 0) {
      return (
        <ServerErrorPage
          message={message}
          onRetry={onRetry}
          details={details}
        />
      );
    }

    return (
      <ServerErrorPage
        title="Something went wrong"
        message={message}
        onRetry={onRetry}
        details={details}
      />
    );
  }

  if (loading) return loadingComponent || null;
  return <>{children}</>;
};

export default ApiGuard;
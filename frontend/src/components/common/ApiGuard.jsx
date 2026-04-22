import ErrorState from './ErrorState';

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
  if (error?.status === 403) return <ErrorState type="permission-denied" description={error.message} />;
  if (error?.status === 0)   return <ErrorState type="network-error" onRetry={onRetry} />;
  if (error?.status >= 500)  return <ErrorState type="server-down" onRetry={onRetry} />;
  if (error)                 return <ErrorState type="generic" description={error.message} onRetry={onRetry} />;
  if (loading)               return loadingComponent || null;
  return <>{children}</>;
};

export default ApiGuard;
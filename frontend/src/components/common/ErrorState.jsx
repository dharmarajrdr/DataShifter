import React from 'react';
import ErrorPage from '../../pages/ErrorPage';

const TYPE_TO_STATUS = {
  'permission-denied': 403,
  'not-found': 404,
  'server-down': 500,
  'network-error': 500,
  'generic': 500,
};

/**
 * Backward-compatible ErrorState wrapper that delegates directly to ErrorPage.
 */
const ErrorState = ({
  type = 'generic',
  title,
  description,
  details,
  onRetry,
  showHome = true,
  showBack = true,
  actions,
  ...rest
}) => {
  const status = TYPE_TO_STATUS[type] || 500;
  return (
    <ErrorPage
      status={status}
      title={title}
      message={description}
      details={details}
      onRetry={onRetry}
      showHome={showHome}
      showBack={showBack}
      actions={actions}
      {...rest}
    />
  );
};

export default ErrorState;
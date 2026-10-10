import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import PopupNotification from '../components/common/PopupNotification';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    ({ type = 'info', title, message, duration = 4000, position = 'bottom-right' }) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newNotification = { id, type, title, message, duration, position };
      setNotifications((prev) => [...prev, newNotification]);
      return id;
    },
    []
  );

  const success = useCallback((message, title, options = {}) => {
    return notify({ type: 'success', message, title, ...options });
  }, [notify]);

  const error = useCallback((message, title, options = {}) => {
    return notify({ type: 'error', message, title, ...options });
  }, [notify]);

  const info = useCallback((message, title, options = {}) => {
    return notify({ type: 'info', message, title, ...options });
  }, [notify]);

  const warning = useCallback((message, title, options = {}) => {
    return notify({ type: 'warning', message, title, ...options });
  }, [notify]);

  const contextValue = useMemo(
    () => ({ notify, success, error, info, warning, dismiss }),
    [notify, success, error, info, warning, dismiss]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {/* Render active notifications */}
      {notifications.map((n, index) => {
        // Offset multiple stacked notifications
        const offset = index * 64;
        return (
          <div
            key={n.id}
            style={{
              position: 'fixed',
              bottom: `calc(var(--notification-position-bottom, 20px) + ${offset}px)`,
              right: 'var(--notification-position-right, 20px)',
              zIndex: 'var(--notification-z-index, 9999)',
              maxWidth: 'var(--notification-max-width, 420px)',
              width: 'calc(100% - 40px)',
            }}
          >
            <PopupNotification
              type={n.type}
              title={n.title}
              message={n.message}
              duration={n.duration}
              position={n.position}
              onDismiss={() => dismiss(n.id)}
            />
          </div>
        );
      })}
    </NotificationContext.Provider>
  );
};

const fallbackNotification = {
  notify: () => '',
  success: () => '',
  error: () => '',
  info: () => '',
  warning: () => '',
  dismiss: () => { },
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    return fallbackNotification;
  }
  return context;
};

export default NotificationContext;

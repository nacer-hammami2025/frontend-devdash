import React from 'react';
import {
  FaSpinner,
  FaTasks,
  FaComments,
  FaEnvelope,
  FaCheck,
  FaTrash,
  FaEye
} from 'react-icons/fa';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'task':
      return FaTasks;
    case 'comment':
      return FaComments;
    case 'mention':
      return FaEnvelope;
    default:
      return FaTasks;
  }
};

const NotificationList = ({
  notifications,
  loading,
  onActionClick,
  formatTimeAgo
}) => {
  if (loading) {
    return (
      <div className="notifications-loading">
        <FaSpinner className="icon-spin" />
        <p>Chargement des notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="notifications-empty">
        <FaCheck className="icon" />
        <p>Aucune notification</p>
      </div>
    );
  }

  return (
    <div className="notifications-list">
      {notifications.map(notification => {
        const Icon = getNotificationIcon(notification.type);

        return (
          <div
            key={notification.id}
            className={`notification-item ${notification.read ? 'read' : 'unread'}`}
          >
            <div className="notification-icon">
              <Icon className="icon" />
            </div>

            <div className="notification-content">
              <div className="notification-header">
                <span className="notification-title">
                  {notification.title}
                </span>
                <span className="notification-time">
                  {formatTimeAgo(notification.createdAt)}
                </span>
              </div>

              <p className="notification-message">
                {notification.message}
              </p>

              {notification.metadata && (
                <div className="notification-metadata">
                  {notification.metadata.project && (
                    <span className="metadata-item">
                      Projet: {notification.metadata.project}
                    </span>
                  )}
                  {notification.metadata.task && (
                    <span className="metadata-item">
                      Tâche: {notification.metadata.task}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="notification-actions">
              {!notification.read && (
                <button
                  className="action-button"
                  onClick={() => onActionClick(notification, 'markAsRead')}
                  title="Marquer comme lu"
                >
                  <FaEye className="icon" />
                </button>
              )}
              <button
                className="action-button delete"
                onClick={() => onActionClick(notification, 'delete')}
                title="Supprimer"
              >
                <FaTrash className="icon" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationList;

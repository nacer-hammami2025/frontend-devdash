import React, { useState, useEffect } from 'react';
import { 
  FaBell, 
  FaEnvelope, 
  FaCheck, 
  FaTimes,
  FaTrash,
  FaCheckCircle,
  FaExclamationCircle
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import API from '../api';
import NotificationList from '../components/notifications/NotificationList';
import NotificationFilters from '../components/notifications/NotificationFilters';
import NotificationBadge from '../components/notifications/NotificationBadge';
import { useNotifications } from '../hooks/useNotifications';
import '../styles/Notifications.css';

const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    filters,
    setFilters,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loading,
    error
  } = useNotifications();

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  const handleActionClick = async (notification, action) => {
    switch (action) {
      case 'markAsRead':
        await markAsRead(notification.id);
        break;
      case 'delete':
        await deleteNotification(notification.id);
        break;
      default:
        if (notification.actionUrl) {
          // Rediriger vers l'URL d'action
          window.location.href = notification.actionUrl;
        }
    }
  };

  if (error) {
    return (
      <div className="notifications-error">
        <FaExclamationCircle className="icon" />
        <p>Une erreur est survenue lors du chargement des notifications.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>
          <FaBell className="icon" />
          Notifications
          {unreadCount > 0 && (
            <NotificationBadge count={unreadCount} />
          )}
        </h1>
        <div className="notifications-actions">
          {unreadCount > 0 && (
            <button 
              className="button button-secondary"
              onClick={markAllAsRead}
            >
              <FaCheck className="icon" />
              Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      <NotificationFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <NotificationList
        notifications={notifications}
        loading={loading}
        onActionClick={handleActionClick}
        formatTimeAgo={(date) => formatDistanceToNow(new Date(date), {
          addSuffix: true,
          locale: fr
        })}
      />
    </div>
  );
};

export default NotificationsPage;

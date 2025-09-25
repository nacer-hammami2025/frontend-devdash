import { useState, useEffect, useCallback } from 'react';
import API from '../api';

const POLLING_INTERVAL = 30000; // 30 secondes

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    date: 'all'
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const response = await API.get('/notifications', { params: filters });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      setError('Erreur lors du chargement des notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await API.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await API.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      setUnreadCount(prev => 
        notifications.find(n => n.id === notificationId && !n.read)
          ? Math.max(0, prev - 1)
          : prev
      );
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  // Polling pour les nouvelles notifications
  useEffect(() => {
    const pollInterval = setInterval(fetchNotifications, POLLING_INTERVAL);
    return () => clearInterval(pollInterval);
  }, [fetchNotifications]);

  // Chargement initial
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Écoute des WebSocket pour les notifications en temps réel
  useEffect(() => {
    const ws = new WebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:3000');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        setNotifications(prev => [data.notification, ...prev]);
        if (!data.notification.read) {
          setUnreadCount(prev => prev + 1);
        }
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    filters,
    setFilters,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
};

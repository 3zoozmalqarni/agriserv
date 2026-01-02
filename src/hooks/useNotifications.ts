import { useState, useEffect } from 'react';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  related_id?: string;
  related_type?: string;
  read: boolean;
  created_at: string;
}

const STORAGE_KEY = 'lab_notifications';

const getStoredNotifications = (): Notification[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing notifications:', error);
      return [];
    }
  }
  return [];
};

const saveNotifications = (notifications: Notification[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
};

let cachedNotifications: Notification[] | null = null;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (!cachedNotifications) {
      cachedNotifications = getStoredNotifications();
    }
    return cachedNotifications;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = getStoredNotifications();
      cachedNotifications = data;
      setNotifications(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('فشل في تحميل التنبيهات');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const allNotifications = getStoredNotifications();
      const updated = allNotifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      cachedNotifications = updated;
      setNotifications(updated);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const allNotifications = getStoredNotifications();
      const updated = allNotifications.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      cachedNotifications = updated;
      setNotifications(updated);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    relatedId?: string,
    relatedType?: string
  ) => {
    try {
      const newNotification: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        title,
        message,
        type,
        related_id: relatedId,
        related_type: relatedType,
        read: false,
        created_at: new Date().toISOString(),
      };

      const allNotifications = getStoredNotifications();
      const updated = [newNotification, ...allNotifications];
      saveNotifications(updated);
      cachedNotifications = updated;
      setNotifications(updated);
    } catch (err) {
      console.error('Error creating notification:', err);
    }
  };

  useEffect(() => {
    if (!cachedNotifications || cachedNotifications.length === 0) {
      fetchNotifications();
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    refresh: fetchNotifications,
  };
}

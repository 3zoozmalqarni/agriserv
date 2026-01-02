interface User {
  id: string;
  role: string;
  [key: string]: any;
}

interface Notification {
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
const USERS_STORAGE_KEY = 'lab_users';

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

const getStoredUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing users:', error);
      return [];
    }
  }
  return [];
};

const createNotification = (
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  relatedId?: string,
  relatedType?: string
) => {
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
};

export async function notifyAllUsers(
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  relatedId?: string,
  relatedType?: string
) {
  try {
    const users = getStoredUsers();

    if (!users || users.length === 0) {
      console.warn('No users found');
      return;
    }

    users.forEach((user: User) => {
      createNotification(user.id, title, message, type, relatedId, relatedType);
    });

    console.log('Successfully notified all users');
  } catch (error) {
    console.error('Error notifying all users:', error);
  }
}

export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  relatedId?: string,
  relatedType?: string
) {
  try {
    createNotification(userId, title, message, type, relatedId, relatedType);
    console.log('Successfully notified user:', userId);
  } catch (error) {
    console.error('Error notifying user:', error);
  }
}

export async function notifyByRole(
  role: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  relatedId?: string,
  relatedType?: string
) {
  try {
    const users = getStoredUsers();
    const filteredUsers = users.filter((user: User) => user.role === role);

    if (!filteredUsers || filteredUsers.length === 0) {
      console.warn('No users found with role:', role);
      return;
    }

    filteredUsers.forEach((user: User) => {
      createNotification(user.id, title, message, type, relatedId, relatedType);
    });

    console.log(`Successfully notified users with role: ${role}`);
  } catch (error) {
    console.error('Error notifying users by role:', error);
  }
}

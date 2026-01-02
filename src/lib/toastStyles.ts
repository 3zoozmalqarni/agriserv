import toast from 'react-hot-toast';

const baseStyle = {
  color: 'white',
  fontWeight: 'bold',
  padding: '16px',
  borderRadius: '8px',
};

export const toastStyles = {
  success: {
    ...baseStyle,
    background: '#61bf69',
  },
  error: {
    ...baseStyle,
    background: '#ef4444',
  },
  warning: {
    ...baseStyle,
    background: '#f18700',
  },
  info: {
    ...baseStyle,
    background: '#458ac9',
  },
  primary: {
    ...baseStyle,
    background: '#458ac9',
  },
  secondary: {
    ...baseStyle,
    background: '#61bf69',
  },
};

export const showToast = {
  success: (message: string, duration = 2000) => {
    toast.success(message, {
      duration,
      style: toastStyles.success,
    });
  },
  error: (message: string, duration = 3000) => {
    toast.error(message, {
      duration,
      style: toastStyles.error,
    });
  },
  warning: (message: string, duration = 2500) => {
    toast(message, {
      duration,
      icon: '⚠️',
      style: toastStyles.warning,
    });
  },
  info: (message: string, duration = 2000) => {
    toast(message, {
      duration,
      icon: 'ℹ️',
      style: toastStyles.info,
    });
  },
  primary: (message: string, duration = 2000) => {
    toast.success(message, {
      duration,
      style: toastStyles.primary,
    });
  },
  secondary: (message: string, duration = 2000) => {
    toast.success(message, {
      duration,
      style: toastStyles.secondary,
    });
  },
};

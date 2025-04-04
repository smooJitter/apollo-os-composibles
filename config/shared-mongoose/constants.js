// /constants/meta.constants.js

// 1. Status Meta
const STATUS_META = {
    draft: {
      label: 'Draft',
      type: 'content',
      icon: '📝',
      color: '#9e9e9e',
      transitionsTo: ['review']
    },
    review: {
      label: 'In Review',
      type: 'content',
      icon: '🔍',
      color: '#ff9800',
      transitionsTo: ['published', 'archived']
    },
    published: {
      label: 'Published',
      type: 'content',
      icon: '✅',
      color: '#4caf50',
      transitionsTo: ['archived']
    },
    archived: {
      label: 'Archived',
      type: 'content',
      icon: '🗃️',
      color: '#607d8b',
      isFinal: true
    }
  };
  
  // 2. Role Meta
  const ROLE_META = {
    admin: {
      label: 'Administrator',
      permissions: ['*'],
      color: '#e53935',
      icon: '🛡️'
    },
    editor: {
      label: 'Editor',
      permissions: ['edit', 'publish'],
      color: '#1e88e5',
      icon: '✏️'
    },
    viewer: {
      label: 'Viewer',
      permissions: ['read'],
      color: '#607d8b',
      icon: '👁️'
    }
  };
  
  // 3. Payment Method Meta
  const PAYMENT_METHODS_META = {
    credit_card: {
      label: 'Credit Card',
      icon: '💳'
    },
    paypal: {
      label: 'PayPal',
      icon: '🅿️'
    },
    crypto: {
      label: 'Crypto',
      icon: '₿',
      experimental: true
    }
  };
  
  // 4. Notification Type Meta
  const NOTIFICATION_TYPES_META = {
    info: {
      label: 'Info',
      color: '#2196f3',
      severity: 1
    },
    success: {
      label: 'Success',
      color: '#4caf50',
      severity: 0
    },
    warning: {
      label: 'Warning',
      color: '#ff9800',
      severity: 2
    },
    error: {
      label: 'Error',
      color: '#f44336',
      severity: 3
    }
  };
  
  // 5. Task Priority Meta
  const PRIORITY_META = {
    low: {
      label: 'Low',
      icon: '🟢',
      value: 1
    },
    medium: {
      label: 'Medium',
      icon: '🟠',
      value: 2
    },
    high: {
      label: 'High',
      icon: '🔴',
      value: 3
    }
  };
  
  // Enum Extractors (optional)
  const STATUS_ENUMS = Object.keys(STATUS_META);
  const ROLE_ENUMS = Object.keys(ROLE_META);
  const PAYMENT_METHOD_ENUMS = Object.keys(PAYMENT_METHODS_META);
  const NOTIFICATION_ENUMS = Object.keys(NOTIFICATION_TYPES_META);
  const PRIORITY_ENUMS = Object.keys(PRIORITY_META);
  
  // Exports
  module.exports = {
    STATUS_META,
    STATUS_ENUMS,
    ROLE_META,
    ROLE_ENUMS,
    PAYMENT_METHODS_META,
    PAYMENT_METHOD_ENUMS,
    NOTIFICATION_TYPES_META,
    NOTIFICATION_ENUMS,
    PRIORITY_META,
    PRIORITY_ENUMS
  };
  
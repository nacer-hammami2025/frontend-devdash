import React from 'react';

const NotificationBadge = ({ count }) => {
  const displayCount = count > 99 ? '99+' : count;
  
  return (
    <span className="notification-badge" data-count={displayCount}>
      {displayCount}
    </span>
  );
};

export default NotificationBadge;

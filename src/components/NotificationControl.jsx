import React from 'react';
import Tooltip from './Tooltip';

const NotificationControl = ({ 
  label, 
  checked, 
  onChange, 
  disabled, 
  tooltip,
  children 
}) => {
  const control = (
    <div className="notification-control">
      <label className="control-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <span className="label-text">{label}</span>
      </label>
      {children && (
        <div className={`control-children ${disabled ? 'disabled' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );

  return tooltip ? (
    <Tooltip text={tooltip}>{control}</Tooltip>
  ) : control;
};

export default NotificationControl;

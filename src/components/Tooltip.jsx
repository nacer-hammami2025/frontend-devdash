import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

const Tooltip = ({ text, children }) => {
  return (
    <div className="tooltip">
      {children}
      <div className="tooltip-content">
        <FaInfoCircle className="icon" /> {text}
      </div>
    </div>
  );
};

export default Tooltip;

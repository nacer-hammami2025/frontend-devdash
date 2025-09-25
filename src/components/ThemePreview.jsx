import React from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemePreview = ({ theme, onSelect }) => {
  return (
    <div className="theme-previews">
      <div
        className={`theme-preview ${theme === 'light' ? 'active' : ''}`}
        onClick={() => onSelect('light')}
      >
        <div className="theme-preview-header light">
          <FaSun className="theme-icon" />
          <span>Thème clair</span>
        </div>
        <div className="theme-preview-content light">
          <div className="preview-window">
            <div className="preview-toolbar" />
            <div className="preview-sidebar" />
            <div className="preview-main" />
          </div>
        </div>
      </div>

      <div
        className={`theme-preview ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => onSelect('dark')}
      >
        <div className="theme-preview-header dark">
          <FaMoon className="theme-icon" />
          <span>Thème sombre</span>
        </div>
        <div className="theme-preview-content dark">
          <div className="preview-window">
            <div className="preview-toolbar" />
            <div className="preview-sidebar" />
            <div className="preview-main" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePreview;

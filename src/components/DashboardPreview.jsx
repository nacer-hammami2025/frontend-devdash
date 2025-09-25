import React from 'react';
import { FaGripVertical } from 'react-icons/fa';

const DashboardPreview = ({ layout, onDragEnd }) => {
  return (
    <div className="dashboard-preview">
      {Array.from(layout.entries())
        .sort((a, b) => a[1].position - b[1].position)
        .filter(([_, settings]) => settings.visible)
        .map(([widgetId, settings]) => (
          <div
            key={widgetId}
            className="dashboard-preview-item"
            draggable="true"
            onDragStart={(e) => e.dataTransfer.setData('text/plain', widgetId)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const draggedId = e.dataTransfer.getData('text/plain');
              onDragEnd(draggedId, widgetId);
            }}
          >
            <div className="preview-item-header">
              <FaGripVertical className="drag-handle" />
              <span className="preview-item-title">
                {widgetId === 'projects' && 'Vue des projets'}
                {widgetId === 'tasks' && 'Vue des tâches'}
                {widgetId === 'activities' && 'Activités récentes'}
              </span>
            </div>
            <div className="preview-item-content">
              {/* Simuler le contenu du widget */}
              <div className="preview-placeholder">
                {widgetId === 'projects' && (
                  <div className="preview-grid">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="preview-card" />
                    ))}
                  </div>
                )}
                {widgetId === 'tasks' && (
                  <div className="preview-list">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="preview-line" />
                    ))}
                  </div>
                )}
                {widgetId === 'activities' && (
                  <div className="preview-activity">
                    {[1, 2].map(i => (
                      <div key={i} className="preview-activity-item" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default DashboardPreview;

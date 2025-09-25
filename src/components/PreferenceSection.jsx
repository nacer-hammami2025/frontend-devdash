import React from 'react';

const PreferenceSection = ({ icon: Icon, title, description, children }) => {
  return (
    <section className="preference-section">
      <div className="preference-section-header">
        <h3>
          {Icon && <Icon className="icon" />}
          {title}
        </h3>
        {description && (
          <p className="preference-section-description">{description}</p>
        )}
      </div>
      <div className="preference-section-content">
        {children}
      </div>
    </section>
  );
};

export default PreferenceSection;

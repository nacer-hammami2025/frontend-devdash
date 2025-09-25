import React from 'react';
import {
  FaFilter,
  FaTasks,
  FaComments,
  FaBell,
  FaCalendar,
  FaEnvelope,
  FaCheck,
  FaEye
} from 'react-icons/fa';

const NotificationFilters = ({ filters, onFilterChange }) => {
  const typeOptions = [
    { value: 'all', label: 'Toutes', icon: FaBell },
    { value: 'task', label: 'Tâches', icon: FaTasks },
    { value: 'comment', label: 'Commentaires', icon: FaComments },
    { value: 'mention', label: 'Mentions', icon: FaEnvelope }
  ];

  const statusOptions = [
    { value: 'all', label: 'Tous', icon: FaFilter },
    { value: 'unread', label: 'Non lus', icon: FaEye },
    { value: 'read', label: 'Lus', icon: FaCheck }
  ];

  const dateOptions = [
    { value: 'all', label: 'Tout' },
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' }
  ];

  return (
    <div className="notification-filters">
      <div className="filters-group">
        <h3>
          <FaBell className="icon" />
          Type
        </h3>
        <div className="filter-buttons">
          {typeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              className={`filter-button ${filters.type === value ? 'active' : ''}`}
              onClick={() => onFilterChange({ type: value })}
            >
              <Icon className="icon" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="filters-group">
        <h3>
          <FaFilter className="icon" />
          Statut
        </h3>
        <div className="filter-buttons">
          {statusOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              className={`filter-button ${filters.status === value ? 'active' : ''}`}
              onClick={() => onFilterChange({ status: value })}
            >
              <Icon className="icon" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="filters-group">
        <h3>
          <FaCalendar className="icon" />
          Période
        </h3>
        <select
          className="date-filter"
          value={filters.date}
          onChange={(e) => onFilterChange({ date: e.target.value })}
        >
          {dateOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default NotificationFilters;

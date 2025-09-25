import { useState } from 'react';
import {
  FaBell,
  FaCog,
  FaColumns,
  FaPalette,
  FaSpinner,
  FaUndo
} from 'react-icons/fa';
import ConfirmDialog from '../components/ConfirmDialog';
import Tooltip from '../components/Tooltip';
import { usePreferences } from '../hooks/usePreferences';
import '../styles/Preferences.css';

const UserPreferences = () => {
  const {
    preferences,
    setPreferences,
    loading,
    error,
    saveStatus,
    savePreferences,
    loadPreferences
  } = usePreferences();

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    onConfirm: null
  });

  const defaultPreferences = {
    theme: 'light',
    notifications: {
      email: { enabled: true, frequency: 'immediate' },
      push: {
        enabled: true,
        types: {
          taskAssigned: true,
          taskUpdated: true,
          commentAdded: true,
          projectInvite: true,
          deadlineApproaching: true,
          mention: true
        }
      }
    },
    dashboardLayout: new Map([
      ['projects', { visible: true, position: 0 }],
      ['tasks', { visible: true, position: 1 }],
      ['activities', { visible: true, position: 2 }]
    ])
  };

  const handlePreferenceChange = (section, subsection, value) => {
    setPreferences(prev => {
      const newPreferences = { ...prev };
      if (subsection) {
        newPreferences[section][subsection] = value;
      } else {
        newPreferences[section] = value;
      }
      return newPreferences;
    });
  };

  const handleNotificationTypeChange = (type, value) => {
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        push: {
          ...prev.notifications.push,
          types: {
            ...prev.notifications.push.types,
            [type]: value
          }
        }
      }
    }));
  };

  const handleDashboardLayoutChange = (widgetId, changes) => {
    setPreferences(prev => {
      const newLayout = new Map(prev.dashboardLayout);
      newLayout.set(widgetId, {
        ...newLayout.get(widgetId),
        ...changes
      });
      return {
        ...prev,
        dashboardLayout: newLayout
      };
    });
  };

  const handleSave = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Enregistrer les préférences',
      message: 'Voulez-vous enregistrer ces modifications ? Cela affectera immédiatement votre interface.',
      confirmText: 'Enregistrer',
      variant: 'info',
      onConfirm: async () => {
        await savePreferences(preferences);
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleReset = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Réinitialiser les préférences',
      message: 'Voulez-vous réinitialiser toutes vos préférences ? Cette action ne peut pas être annulée.',
      confirmText: 'Réinitialiser',
      variant: 'danger',
      onConfirm: () => {
        setPreferences(defaultPreferences);
        savePreferences(defaultPreferences);
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  return (
    <div className="preferences-container">
      <div className="preferences-header">
        <h2>
          <FaCog className="icon" />
          Préférences
        </h2>
      </div>

      {loading ? (
        <div className="loading-state">
          <FaSpinner className="icon-spin" />
          <span>Chargement des préférences...</span>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          {error}
        </div>
      ) : saveStatus.message && (
        <div className={`alert ${saveStatus.message.includes('Erreur') ? 'alert-error' : 'alert-success'}`}>
          {saveStatus.message}
        </div>
      )}

      <div className="preferences-content">
        <section className="preference-section">
          <h3>
            <FaPalette className="icon" />
            Apparence
          </h3>
          <div className="theme-selector">
            <label>Thème</label>
            <select
              value={preferences.theme}
              onChange={(e) => handlePreferenceChange('theme', null, e.target.value)}
            >
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
          </div>
        </section>

        <section className="preference-section">
          <h3>
            <FaBell className="icon" />
            Notifications
          </h3>

          <div className="notification-group">
            <h4>Notifications par email</h4>
            <div className="preference-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.notifications.email.enabled}
                  onChange={(e) => handlePreferenceChange('notifications', 'email', {
                    ...preferences.notifications.email,
                    enabled: e.target.checked
                  })}
                />
                Activer les notifications par email
              </label>
            </div>

            <div className="preference-item">
              <label>Fréquence</label>
              <select
                value={preferences.notifications.email.frequency}
                onChange={(e) => handlePreferenceChange('notifications', 'email', {
                  ...preferences.notifications.email,
                  frequency: e.target.value
                })}
                disabled={!preferences.notifications.email.enabled}
              >
                <option value="immediate">Immédiate</option>
                <option value="daily">Résumé quotidien</option>
                <option value="weekly">Résumé hebdomadaire</option>
              </select>
            </div>
          </div>

          <div className="notification-group">
            <h4>Notifications push</h4>
            <div className="preference-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.notifications.push.enabled}
                  onChange={(e) => handlePreferenceChange('notifications', 'push', {
                    ...preferences.notifications.push,
                    enabled: e.target.checked
                  })}
                />
                Activer les notifications push
              </label>
            </div>

            <div className="notification-types">
              {Object.entries(preferences.notifications.push.types).map(([type, enabled]) => (
                <div key={type} className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => handleNotificationTypeChange(type, e.target.checked)}
                      disabled={!preferences.notifications.push.enabled}
                    />
                    {type === 'taskAssigned' && 'Tâche assignée'}
                    {type === 'taskUpdated' && 'Tâche mise à jour'}
                    {type === 'commentAdded' && 'Nouveau commentaire'}
                    {type === 'projectInvite' && 'Invitation à un projet'}
                    {type === 'deadlineApproaching' && 'Échéance proche'}
                    {type === 'mention' && 'Mention dans un commentaire'}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="preference-section">
          <h3>
            <FaColumns className="icon" />
            Disposition du tableau de bord
          </h3>
          <div className="dashboard-layout">
            {Array.from(preferences.dashboardLayout.entries()).map(([widgetId, settings]) => (
              <div key={widgetId} className="widget-preference">
                <div className="widget-header">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.visible}
                      onChange={(e) => handleDashboardLayoutChange(widgetId, {
                        visible: e.target.checked
                      })}
                    />
                    {widgetId === 'projects' && 'Vue des projets'}
                    {widgetId === 'tasks' && 'Vue des tâches'}
                    {widgetId === 'activities' && 'Activités récentes'}
                  </label>
                </div>
                {settings.visible && (
                  <div className="widget-position">
                    <label>Position</label>
                    <input
                      type="number"
                      min="0"
                      value={settings.position}
                      onChange={(e) => handleDashboardLayoutChange(widgetId, {
                        position: parseInt(e.target.value)
                      })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="preferences-actions">
          <Tooltip text="Réinitialiser toutes les préférences par défaut">
            <button
              className="button reset-button"
              onClick={handleReset}
              disabled={loading || saveStatus.saving}
            >
              <FaUndo className="icon" />
              Réinitialiser
            </button>
          </Tooltip>

          <button
            className="button button-primary"
            onClick={handleSave}
            disabled={loading || saveStatus.saving}
          >
            {saveStatus.saving ? (
              <>
                <FaSpinner className="icon-spin" />
                Enregistrement...
              </>
            ) : 'Enregistrer les préférences'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false })}
      />
    </div>
  );
};

export default UserPreferences;

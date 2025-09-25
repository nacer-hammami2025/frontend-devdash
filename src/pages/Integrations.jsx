import React from 'react';
import { 
  FaGithub, 
  FaGitlab, 
  FaSlack, 
  FaGoogle,
  FaJira,
  FaTrello,
  FaDiscord,
  FaBitbucket,
  FaPlus,
  FaCheck,
  FaCog,
  FaSync,
  FaExclamationCircle
} from 'react-icons/fa';
import { useGitIntegration } from '../hooks/useGitIntegration';
import { useSlackIntegration } from '../hooks/useSlackIntegration';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import '../styles/Integrations.css';

const IntegrationsPage = () => {
  const github = useGitIntegration('github');
  const gitlab = useGitIntegration('gitlab');
  const slack = useSlackIntegration();
  const googleCalendar = useGoogleCalendar();

  const integrations = [
    {
      id: 'github',
      name: 'GitHub',
      icon: FaGithub,
      connected: github.connected,
      loading: github.loading,
      error: github.error,
      onConnect: github.connect,
      onDisconnect: github.disconnect,
      status: github.connected ? `${github.repositories.length} repositories connectés` : null
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      icon: FaGitlab,
      connected: gitlab.connected,
      loading: gitlab.loading,
      error: gitlab.error,
      onConnect: gitlab.connect,
      onDisconnect: gitlab.disconnect,
      status: gitlab.connected ? `${gitlab.repositories.length} repositories connectés` : null
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: FaSlack,
      connected: slack.connected,
      loading: false,
      error: null,
      onConnect: slack.connect,
      onDisconnect: slack.disconnect,
      status: slack.connected ? `${slack.channels.length} canaux disponibles` : null
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      icon: FaGoogle,
      connected: googleCalendar.connected,
      loading: googleCalendar.loading,
      error: googleCalendar.error,
      onConnect: googleCalendar.connect,
      onDisconnect: googleCalendar.disconnect,
      status: googleCalendar.connected ? 'Calendrier synchronisé' : null
    }
  ];

  return (
    <div className="integrations-page">
      <header className="integrations-header">
        <h1>Intégrations</h1>
        <p>Connectez vos outils préférés à DevDash</p>
      </header>

      <div className="integrations-grid">
        {integrations.map(integration => (
          <div 
            key={integration.id} 
            className={`integration-card ${integration.connected ? 'connected' : ''}`}
          >
            <div className="integration-header">
              <integration.icon className="integration-icon" />
              <h2>{integration.name}</h2>
            </div>

            <div className="integration-status">
              {integration.loading ? (
                <div className="loading-status">
                  <FaSync className="icon-spin" />
                  Chargement...
                </div>
              ) : integration.error ? (
                <div className="error-status">
                  <FaExclamationCircle className="icon" />
                  {integration.error}
                </div>
              ) : integration.connected ? (
                <div className="connected-status">
                  <FaCheck className="icon" />
                  {integration.status || 'Connecté'}
                </div>
              ) : (
                <div className="disconnected-status">
                  <FaPlus className="icon" />
                  Non connecté
                </div>
              )}
            </div>

            <div className="integration-actions">
              {integration.connected ? (
                <>
                  <button 
                    className="button button-secondary"
                    onClick={() => integration.onDisconnect()}
                  >
                    Déconnecter
                  </button>
                  <button className="button button-icon">
                    <FaCog />
                  </button>
                </>
              ) : (
                <button 
                  className="button button-primary"
                  onClick={() => integration.onConnect()}
                  disabled={integration.loading}
                >
                  Connecter
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Intégrations à venir */}
        <div className="integration-card coming-soon">
          <div className="integration-header">
            <FaJira className="integration-icon" />
            <h2>Jira</h2>
          </div>
          <div className="coming-soon-label">Bientôt disponible</div>
        </div>

        <div className="integration-card coming-soon">
          <div className="integration-header">
            <FaTrello className="integration-icon" />
            <h2>Trello</h2>
          </div>
          <div className="coming-soon-label">Bientôt disponible</div>
        </div>

        <div className="integration-card coming-soon">
          <div className="integration-header">
            <FaDiscord className="integration-icon" />
            <h2>Discord</h2>
          </div>
          <div className="coming-soon-label">Bientôt disponible</div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;

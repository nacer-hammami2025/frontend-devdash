import { useState, useEffect, useCallback } from 'react';
import API from '../api';

export const useSlackIntegration = () => {
  const [connected, setConnected] = useState(false);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [notifications, setNotifications] = useState({
    taskCreated: true,
    taskCompleted: true,
    taskAssigned: true,
    commentAdded: true,
    projectCreated: true,
    projectCompleted: true,
    milestoneReached: true,
    deadlineApproaching: true
  });

  // Vérifier la connexion
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await API.get('/integrations/slack/status');
        setConnected(response.data.connected);
        if (response.data.connected) {
          const channelsResponse = await API.get('/integrations/slack/channels');
          setChannels(channelsResponse.data);
          setSelectedChannel(channelsResponse.data.defaultChannel);
        }
      } catch (err) {
        console.error('Error checking Slack connection:', err);
      }
    };

    checkConnection();
  }, []);

  // Connexion à Slack
  const connect = async () => {
    try {
      const response = await API.post('/integrations/slack/connect');
      window.location.href = response.data.authUrl;
    } catch (err) {
      throw new Error('Erreur de connexion à Slack');
    }
  };

  // Déconnexion de Slack
  const disconnect = async () => {
    try {
      await API.post('/integrations/slack/disconnect');
      setConnected(false);
      setChannels([]);
      setSelectedChannel(null);
    } catch (err) {
      throw new Error('Erreur de déconnexion de Slack');
    }
  };

  // Envoyer un message
  const sendMessage = async (message, channel = selectedChannel) => {
    try {
      await API.post('/integrations/slack/message', {
        channel,
        message
      });
    } catch (err) {
      throw new Error('Erreur d\'envoi du message');
    }
  };

  // Mettre à jour les préférences de notification
  const updateNotificationPreferences = async (preferences) => {
    try {
      await API.put('/integrations/slack/notifications', preferences);
      setNotifications(preferences);
    } catch (err) {
      throw new Error('Erreur de mise à jour des préférences');
    }
  };

  // Créer un canal dédié au projet
  const createProjectChannel = async (projectId, channelName) => {
    try {
      const response = await API.post('/integrations/slack/channels/create', {
        projectId,
        channelName
      });
      setChannels(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw new Error('Erreur de création du canal');
    }
  };

  // Inviter des membres
  const inviteToChannel = async (channelId, emails) => {
    try {
      await API.post('/integrations/slack/channels/invite', {
        channelId,
        emails
      });
    } catch (err) {
      throw new Error('Erreur d\'invitation des membres');
    }
  };

  // Formater et envoyer une notification de tâche
  const sendTaskNotification = async (task, type) => {
    if (!notifications[type]) return;

    const message = formatTaskMessage(task, type);
    await sendMessage(message);
  };

  // Formater et envoyer une notification de projet
  const sendProjectNotification = async (project, type) => {
    if (!notifications[type]) return;

    const message = formatProjectMessage(project, type);
    await sendMessage(message);
  };

  // Formattage des messages
  const formatTaskMessage = (task, type) => {
    const messages = {
      taskCreated: `🆕 Nouvelle tâche créée: *${task.title}*\nAssignée à: ${task.assignee}`,
      taskCompleted: `✅ Tâche terminée: *${task.title}*\nComplétée par: ${task.completedBy}`,
      taskAssigned: `👤 Tâche assignée: *${task.title}*\nNouvelle assignation: ${task.assignee}`,
      commentAdded: `💬 Nouveau commentaire sur *${task.title}*\nPar: ${task.commentAuthor}`
    };

    return messages[type] || `Mise à jour de la tâche: *${task.title}*`;
  };

  const formatProjectMessage = (project, type) => {
    const messages = {
      projectCreated: `🚀 Nouveau projet créé: *${project.name}*\nPar: ${project.creator}`,
      projectCompleted: `🎉 Projet terminé: *${project.name}*`,
      milestoneReached: `🏁 Jalon atteint dans *${project.name}*: ${project.milestone}`,
      deadlineApproaching: `⚠️ Échéance proche pour *${project.name}*: ${project.deadline}`
    };

    return messages[type] || `Mise à jour du projet: *${project.name}*`;
  };

  return {
    connected,
    channels,
    selectedChannel,
    notifications,
    setSelectedChannel,
    connect,
    disconnect,
    sendMessage,
    updateNotificationPreferences,
    createProjectChannel,
    inviteToChannel,
    sendTaskNotification,
    sendProjectNotification
  };
};

import { useState, useEffect, useCallback } from 'react';
import API from '../api';

export const useGoogleCalendar = () => {
  const [connected, setConnected] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vérifier la connexion
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await API.get('/integrations/google/calendar/status');
        setConnected(response.data.connected);
        if (response.data.connected) {
          await loadCalendars();
        }
      } catch (err) {
        setError('Erreur de connexion à Google Calendar');
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  // Charger les calendriers
  const loadCalendars = async () => {
    try {
      const response = await API.get('/integrations/google/calendar/list');
      setCalendars(response.data);
      if (response.data.length > 0) {
        setSelectedCalendar(response.data[0].id);
      }
    } catch (err) {
      setError('Erreur de chargement des calendriers');
    }
  };

  // Connecter Google Calendar
  const connect = async () => {
    try {
      const response = await API.post('/integrations/google/calendar/connect');
      window.location.href = response.data.authUrl;
    } catch (err) {
      throw new Error('Erreur de connexion à Google Calendar');
    }
  };

  // Déconnecter Google Calendar
  const disconnect = async () => {
    try {
      await API.post('/integrations/google/calendar/disconnect');
      setConnected(false);
      setCalendars([]);
      setSelectedCalendar(null);
    } catch (err) {
      throw new Error('Erreur de déconnexion de Google Calendar');
    }
  };

  // Créer un événement
  const createEvent = async (eventData) => {
    try {
      const response = await API.post('/integrations/google/calendar/events', {
        calendarId: selectedCalendar,
        ...eventData
      });
      setEvents(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw new Error('Erreur de création de l\'événement');
    }
  };

  // Créer un événement depuis une tâche
  const createEventFromTask = async (task) => {
    const eventData = {
      summary: `[DevDash] ${task.title}`,
      description: task.description,
      start: {
        dateTime: task.startDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: task.dueDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: task.assignees.map(assignee => ({ email: assignee.email })),
      reminders: {
        useDefault: true
      },
      metadata: {
        taskId: task.id,
        projectId: task.projectId
      }
    };

    return await createEvent(eventData);
  };

  // Créer un événement depuis un jalon
  const createEventFromMilestone = async (milestone) => {
    const eventData = {
      summary: `[DevDash] Jalon: ${milestone.title}`,
      description: milestone.description,
      start: {
        dateTime: milestone.dueDate,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(new Date(milestone.dueDate).getTime() + 3600000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: milestone.teamMembers.map(member => ({ email: member.email })),
      reminders: {
        useDefault: true,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 }
        ]
      },
      metadata: {
        milestoneId: milestone.id,
        projectId: milestone.projectId
      }
    };

    return await createEvent(eventData);
  };

  // Mettre à jour un événement
  const updateEvent = async (eventId, eventData) => {
    try {
      const response = await API.put(`/integrations/google/calendar/events/${eventId}`, {
        calendarId: selectedCalendar,
        ...eventData
      });
      setEvents(prev => prev.map(event => 
        event.id === eventId ? response.data : event
      ));
      return response.data;
    } catch (err) {
      throw new Error('Erreur de mise à jour de l\'événement');
    }
  };

  // Supprimer un événement
  const deleteEvent = async (eventId) => {
    try {
      await API.delete(`/integrations/google/calendar/events/${eventId}`, {
        params: { calendarId: selectedCalendar }
      });
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (err) {
      throw new Error('Erreur de suppression de l\'événement');
    }
  };

  // Synchroniser les événements
  const syncEvents = async (startDate, endDate) => {
    try {
      const response = await API.get('/integrations/google/calendar/events', {
        params: {
          calendarId: selectedCalendar,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString()
        }
      });
      setEvents(response.data);
    } catch (err) {
      throw new Error('Erreur de synchronisation des événements');
    }
  };

  return {
    connected,
    loading,
    error,
    calendars,
    selectedCalendar,
    events,
    setSelectedCalendar,
    connect,
    disconnect,
    createEvent,
    createEventFromTask,
    createEventFromMilestone,
    updateEvent,
    deleteEvent,
    syncEvents
  };
};

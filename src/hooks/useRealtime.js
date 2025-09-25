import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';

export const useRealtime = () => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState(new Map());
  const [currentActivity, setCurrentActivity] = useState(new Map());

  useEffect(() => {
    socketRef.current = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    // Gestion de la connexion
    socketRef.current.on('connect', () => {
      setConnected(true);
      console.log('Connected to realtime server');
    });

    // Gestion des utilisateurs actifs
    socketRef.current.on('users:active', (users) => {
      setActiveUsers(new Map(users));
    });

    // Gestion des activités en cours
    socketRef.current.on('activity:update', (activities) => {
      setCurrentActivity(new Map(activities));
    });

    // Nettoyage à la déconnexion
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const emitActivity = (activityType, data) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('activity:new', {
        type: activityType,
        data,
        timestamp: Date.now()
      });
    }
  };

  const joinProject = (projectId) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('project:join', projectId);
    }
  };

  const leaveProject = (projectId) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('project:leave', projectId);
    }
  };

  const startTaskEdit = (taskId) => {
    emitActivity('task:editing', { taskId });
  };

  const stopTaskEdit = (taskId) => {
    emitActivity('task:edit:complete', { taskId });
  };

  const sendComment = (taskId, comment) => {
    emitActivity('task:comment', { taskId, comment });
  };

  return {
    connected,
    activeUsers,
    currentActivity,
    emitActivity,
    joinProject,
    leaveProject,
    startTaskEdit,
    stopTaskEdit,
    sendComment
  };
};

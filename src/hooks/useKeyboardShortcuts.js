import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_SHORTCUTS = {
  // Navigation
  'g d': '/', // Go to Dashboard
  'g p': '/projects', // Go to Projects
  'g s': '/security', // Go to Security
  'g t': '/tasks', // Go to Tasks
  'g a': '/activity', // Go to Activity
  'g m': '/me', // Go to Profile
  
  // Actions
  'n p': '/projects/new', // New Project
  'n t': '/tasks/new', // New Task
  'n b': '/projects/board/new', // New Board
  
  // Projet
  '1': 'view-kanban', // Vue Kanban
  '2': 'view-list', // Vue Liste
  '3': 'view-calendar', // Vue Calendrier
  
  // Global
  '?': '/shortcuts', // Show shortcuts help
  '/': 'search', // Focus search
  'esc': 'close', // Close modals
  'ctrl+s': 'save', // Sauvegarder
  'ctrl+z': 'undo', // Annuler
  'ctrl+shift+z': 'redo', // Rétablir
  'r': 'refresh', // Rafraîchir la vue
  'f': 'filter', // Focus filtres
  'm': 'menu', // Toggle menu
};

export function useKeyboardShortcuts(customShortcuts = {}) {
  const navigate = useNavigate();
  const shortcuts = { ...DEFAULT_SHORTCUTS, ...customShortcuts };

  const handleKeyPress = useCallback((event) => {
    // Ignore si l'utilisateur est en train de taper dans un input
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.isContentEditable) {
      return;
    }

    let keys = [];

    // Ajout des modificateurs
    if (event.ctrlKey) keys.push('ctrl');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');
    if (event.metaKey) keys.push('meta');

    // Ajout de la touche principale
    keys.push(event.key.toLowerCase());

    // Construction de la combinaison de touches
    const combination = keys.join(' ');

    // Recherche d'un raccourci correspondant
    for (const [shortcut, action] of Object.entries(shortcuts)) {
      if (shortcut === combination) {
        event.preventDefault();
        handleShortcut(action);
        break;
      }
    }
  }, [shortcuts, navigate]);

  const handleShortcut = useCallback((action) => {
    if (typeof action === 'string') {
      if (action.startsWith('/')) {
        // Navigation
        navigate(action);
      } else {
        // Actions spéciales
        switch (action) {
          case 'search':
            document.querySelector('#search-input')?.focus();
            break;
          case 'close':
            // Fermer les modaux ou les panneaux ouverts
            document.querySelector('.modal-close')?.click();
            break;
          default:
            // Action personnalisée
            if (typeof shortcuts[action] === 'function') {
              shortcuts[action]();
            }
        }
      }
    } else if (typeof action === 'function') {
      action();
    }
  }, [navigate, shortcuts]);

  useEffect(() => {
    // Ajout du gestionnaire d'événements
    document.addEventListener('keydown', handleKeyPress);

    // Nettoyage
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Retourne une fonction pour enregistrer de nouveaux raccourcis
  const registerShortcut = useCallback((key, action) => {
    shortcuts[key] = action;
  }, [shortcuts]);

  // Retourne les raccourcis actuels
  const getShortcuts = useCallback(() => {
    return { ...shortcuts };
  }, [shortcuts]);

  return {
    registerShortcut,
    getShortcuts
  };
}

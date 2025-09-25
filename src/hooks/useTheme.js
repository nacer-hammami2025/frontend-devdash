import { useCallback, useEffect, useState } from 'react';

/*
  useTheme hook
  - Persiste le thème sélectionné (localStorage: devdash-theme)
  - Applique data-theme sur <html> (document.documentElement.dataset.theme)
  - Gère mode dark existant (suppose classe .dark déjà gérée ailleurs si besoin)
  - Fournit: theme, setTheme(themeName), availableThemes
*/

const STORAGE_KEY = 'devdash-theme';
const DEFAULT_THEME = 'default';

const THEMES = [
  { key: 'default', label: 'Bleu Pro', color: '#2563eb', contrast: 'AA+' },
  { key: 'emerald', label: 'Émeraude', color: '#059669', contrast: 'AA' },
  { key: 'indigo', label: 'Indigo Profond', color: '#4f46e5', contrast: 'AA+' },
  { key: 'amber', label: 'Ambre Énergie', color: '#d97706', contrast: 'AA' },
  { key: 'rose', label: 'Rose Punch', color: '#e11d48', contrast: 'AA+' },
  { key: 'slate', label: 'Slate Neutre', color: '#334155', contrast: 'AAA' }
];

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved || DEFAULT_THEME;
  });

  const applyTheme = useCallback((t) => {
    const root = document.documentElement;
    if (t === 'default') {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = t;
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) { /* ignore */ }
  }, [theme, applyTheme]);

  const setTheme = useCallback((t) => {
    // Ajouter classe de transition courte
    const root = document.documentElement;
    if (!root.classList.contains('theme-transition')) {
      root.classList.add('theme-transition');
      // Retrait après la durée d'animation
      setTimeout(() => { root.classList.remove('theme-transition'); }, 260);
    }
    setThemeState(t);
  }, []);

  return { theme, setTheme, themes: THEMES };
}

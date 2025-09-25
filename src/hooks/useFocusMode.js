import { useCallback, useEffect, useState } from 'react';

/*
  useFocusMode
  - Mode "mono" désature/neutralise la plupart des accents pour réduire charge cognitive
  - Stockage localStorage key: devdash-focus-mode ('mono' | 'off')
  - Applique data-focus="mono" sur <html> pour activer styles globaux
*/

const STORAGE_KEY = 'devdash-focus-mode';

export function useFocusMode() {
  const [mode, setMode] = useState(() => {
    if (typeof window === 'undefined') return 'off';
    return localStorage.getItem(STORAGE_KEY) || 'off';
  });

  const apply = useCallback((m) => {
    const root = document.documentElement;
    if (m === 'mono') {
      root.dataset.focus = 'mono';
    } else {
      if (root.dataset.focus === 'mono') delete root.dataset.focus;
    }
  }, []);

  useEffect(() => {
    apply(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { }
  }, [mode, apply]);

  const toggle = () => {
    const root = document.documentElement;
    if (!root.classList.contains('focus-transition')) {
      root.classList.add('focus-transition');
      setTimeout(() => root.classList.remove('focus-transition'), 320);
    }
    setMode(m => m === 'mono' ? 'off' : 'mono');
  };

  return { focusMode: mode, setFocusMode: setMode, toggleFocusMode: toggle };
}

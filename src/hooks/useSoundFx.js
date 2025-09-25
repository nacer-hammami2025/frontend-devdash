import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusMode } from './useFocusMode';

/*
  useSoundFx
  Objectif: fournir des petits sons UI optionnels (hover, click, success) sans dépendances lourdes.
  Caractéristiques:
  - Opt-in: désactivé par défaut (respect sobriété + accessibilité)
  - Persistance: localStorage key 'devdash-sound'
  - Respecte prefers-reduced-motion => force disable (cohérence avec users sensibles)
  - Debounce/ratelimit: empêche spam sur hover (min interval entre sons identiques)
  - Préchargement léger: génère des Audio() à partir de Data URI (pas de fichiers externes nécessaires)
  - Fournit utilitaires: playHover, playClick, playSuccess

  Améliorations futures possibles:
  - Charger packs sonores custom (thème audio)
  - Spatialisation WebAudio si nécessaire
  - Désactivation automatique en mode focus strict
*/

const STORAGE_KEY = 'devdash-sound';

// Petits blips générés (sine/triangle) encodés en base64 (data URI WAV simple).
// Pour simplicité ici: on utilise quelques data URIs de brefs sons (placeholders).
// (Remplaçables plus tard par génération dynamique WebAudio pour taille nulle).
const SOUNDS = {
  hover: 'data:audio/wav;base64,UklGRpQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YYwAAAAA/////wAAAP7+/v7+/v7+/v39/f39/f3+/v7+/v7/////AAAAP///',
  click: 'data:audio/wav;base64,UklGRtQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YaQAAAAA/////wAAAP7+/v39/f3+/v7+/v7+/v7+/v39/f3+/v7/////AAAAP///',
  success: 'data:audio/wav;base64,UklGRuQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YcQAAAAA/////wAAAP7+/v39/f39/f7+/v7+/v39/f39/f7/////AAAAP///'
};

export function useSoundFx() {
  const { focusMode } = useFocusMode();
  const [enabled, setEnabled] = useState(false);
  const audioRefs = useRef({});
  const lastPlayedRef = useRef({});
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Charger état
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'on' && !reducedMotion) {
        setEnabled(true);
      }
    } catch {/* ignore */ }
  }, [reducedMotion]);

  // Préparer Audio quand activé
  useEffect(() => {
    if (enabled) {
      for (const key of Object.keys(SOUNDS)) {
        if (!audioRefs.current[key]) {
          const a = new Audio(SOUNDS[key]);
          a.preload = 'auto';
          audioRefs.current[key] = a;
        }
      }
    }
  }, [enabled]);

  // Force mute if focus mode mono
  const active = enabled && focusMode !== 'mono';

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off'); } catch {/* ignore */ }
  }, [enabled]);

  const play = useCallback((key) => {
    if (!active) return;
    const now = performance.now();
    const minInterval = key === 'hover' ? 120 : 80; // ms
    const last = lastPlayedRef.current[key] || 0;
    if (now - last < minInterval) return;
    lastPlayedRef.current[key] = now;
    const a = audioRefs.current[key];
    if (a) {
      try {
        a.currentTime = 0;
        // Utiliser play() sans await pour ne pas bloquer UI
        a.play().catch(() => { });
      } catch {/* ignore */ }
    }
  }, [active]);

  const playHover = useCallback(() => play('hover'), [play]);
  const playClick = useCallback(() => play('click'), [play]);
  const playSuccess = useCallback(() => play('success'), [play]);

  return { enabled: active, rawEnabled: enabled, focusMode, toggle, playHover, playClick, playSuccess };
}

export default useSoundFx;

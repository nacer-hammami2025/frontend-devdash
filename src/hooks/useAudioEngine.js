import { useCallback, useEffect, useRef, useState } from 'react';
import AudioEngine from '../audio/audioEngine';
import { useFocusMode } from './useFocusMode';
import { useTheme } from './useTheme';

/*
  useAudioEngine
  - Gère initialisation WebAudio après interaction utilisateur (policy autoplay)
  - Démarre pad ambient si autorisé
  - Fournit API earcon(type)
  - Mute auto en mode focus 'mono'
*/

const STORE_KEY = 'devdash-audio-advanced';

export function useAudioEngine() {
  const { theme, themes } = useTheme();
  const { focusMode } = useFocusMode();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const accentRef = useRef('#2563eb');

  useEffect(() => {
    const t = themes.find(t => t.key === theme);
    if (t) accentRef.current = t.color;
  }, [theme, themes]);

  useEffect(() => {
    try { const saved = localStorage.getItem(STORE_KEY); if (saved === 'on') setEnabled(true); } catch { }
  }, []);

  const init = useCallback(() => {
    if (!enabled) return;
    const ok = AudioEngine.init();
    if (ok) {
      setReady(true);
      if (focusMode !== 'mono') AudioEngine.startAmbient(accentRef.current);
    }
  }, [enabled, focusMode]);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem(STORE_KEY, next ? 'on' : 'off'); } catch { }
  }, [enabled]);

  // React to focus mode changes
  useEffect(() => {
    if (!ready) return;
    if (focusMode === 'mono') {
      AudioEngine.stopAmbient();
    } else if (enabled) {
      AudioEngine.startAmbient(accentRef.current);
    }
  }, [focusMode, enabled, ready]);

  // Theme change retune ambient
  useEffect(() => {
    if (!ready || focusMode === 'mono') return; // future: smooth retune
    AudioEngine.stopAmbient();
    AudioEngine.startAmbient(accentRef.current);
  }, [theme, ready, focusMode]);

  const earcon = useCallback((type) => {
    if (!ready || focusMode === 'mono') return;
    AudioEngine.earcon(type, accentRef.current);
  }, [ready, focusMode]);
  // active: reflète l'état effectif (muet si focus mono)
  const active = enabled && focusMode !== 'mono';

  return { enabled, active, toggle, init, ready, earcon, focusMode };
}

export default useAudioEngine;

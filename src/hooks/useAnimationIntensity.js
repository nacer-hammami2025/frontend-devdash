import { useCallback, useEffect, useState } from 'react';

/*
  useAnimationIntensity
  ------------------------------------------------------------------
  Préférence unique (0..100) utilisée comme macro-paramètre pour l'animation dynamique.
  Traduction interne vers un facteur normalisé 0..1 puis pondération dans:
    - Nombre de filaments
    - Vitesse de déplacement
    - Longueur des traces
    - Opacité / largeur des strokes

  Règles choisies:
    - Min pratique 10 (éviter rendu complètement vide + confusion utilisateur)
    - Défaut 70 = sweet spot visuel.

  Futur possible:
    - Séparer en deux sliders: "Complexité" vs "Luminosité".
    - Ajouter adaptation automatique (si tabs/CPU -> réduire).
*/

const KEY = 'devdash-anim-intensity';

export function useAnimationIntensity() {
  const [value, setValue] = useState(70);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved != null) {
        const n = parseInt(saved, 10);
        if (!isNaN(n)) setValue(Math.min(100, Math.max(0, n)));
      }
    } catch { }
  }, []);

  const set = useCallback((v) => {
    const clamped = Math.min(100, Math.max(0, v));
    setValue(clamped);
    try { localStorage.setItem(KEY, String(clamped)); } catch { }
  }, []);

  const factor = value / 100; // 0..1

  return { value, set, factor };
}

export default useAnimationIntensity;
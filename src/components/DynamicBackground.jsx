import { useEffect, useState } from 'react';
import { BACKGROUNDS, ORDER } from "../backgrounds/registry.jsx";
import { useAnimationIntensity } from '../hooks/useAnimationIntensity';

/*
  DynamicBackground
  ------------------------------------------------------------
  Sélectionne une variante d'arrière-plan animée parmi un registre.

  Fonctionnalités:
    - Persistance sélection (localStorage: devdash-bg-variant)
    - Rotation manuelle ou automatique (future option)
    - Passe intensityFactor à chaque impl.
    - Respect prefers-reduced-motion => fallback statique.
*/

const KEY = 'devdash-bg-variant';

export default function DynamicBackground({ className = '' }) {
  const { factor } = useAnimationIntensity();
  const [variant, setVariant] = useState(() => {
    try { return localStorage.getItem(KEY) || 'neural'; } catch { return 'neural'; }
  });

  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => { try { localStorage.setItem(KEY, variant); } catch { } }, [variant]);

  const CycleButton = () => (
    <button
      onClick={() => {
        const idx = ORDER.indexOf(variant);
        const next = ORDER[(idx + 1) % ORDER.length];
        setVariant(next);
      }}
      className="absolute top-3 left-3 z-30 text-[10px] uppercase tracking-wide px-2 py-1 rounded bg-[var(--color-surface)]/70 backdrop-blur border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"
      aria-label="Changer l'arrière-plan"
    >BG: {variant}</button>
  );

  if (reduced) {
    return (
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_45%_40%,rgba(var(--color-accent-rgb,37,99,235),0.15),transparent_70%)] ${className}`} aria-hidden="true">
        <CycleButton />
      </div>
    );
  }

  const Renderer = BACKGROUNDS[variant] || BACKGROUNDS.neural;
  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden="true">
      <Renderer intensityFactor={factor} />
      <CycleButton />
    </div>
  );
}

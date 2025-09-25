import { useTheme } from '../hooks/useTheme';

/*
  ThemeAsset
  ------------------------------------------------------------------
  Objectif: fournir des visuels (logo / empty states / illustrations légères)
  générés dynamiquement et harmonisés sur la couleur d'accent du thème.

  Avantages:
  - Pas de multiples fichiers d'images à maintenir.
  - S'adapte instantanément lors d'un changement de thème.
  - Léger (SVG inline) + accessible.

  API:
    <ThemeAsset type="logo" variant="mark|full" size={64} />
    <ThemeAsset type="empty" name="projects" />

  Extension future:
    - Ajouter un registre d'assets nommé (diagram, onboarding, etc.)
    - Support d'un paramètre "tone" (plus clair / alt) selon mode focus.
*/

function getAccent() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-base').trim();
  return accent || '#2563eb';
}

export default function ThemeAsset({ type = 'logo', variant = 'mark', size = 64, className = '', name }) {
  const { theme } = useTheme();
  const accent = getAccent();

  // Palette dérivée simple (tints)
  function tint(hex, f = 0.2) {
    try {
      let h = hex.replace('#', '');
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const n = parseInt(h, 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      const nr = Math.min(255, Math.round(r + (255 - r) * f));
      const ng = Math.min(255, Math.round(g + (255 - g) * f));
      const nb = Math.min(255, Math.round(b + (255 - b) * f));
      return `rgb(${nr},${ng},${nb})`;
    } catch { return hex; }
  }

  if (type === 'logo') {
    if (variant === 'mark') {
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label={`Logo DevDash thème ${theme}`}>
          <defs>
            <linearGradient id="g-accent" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
              <stop offset="100%" stopColor={tint(accent, 0.4)} stopOpacity="0.85" />
            </linearGradient>
            <radialGradient id="g-pulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={tint(accent, 0.6)} stopOpacity="0.9" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="30" fill="url(#g-pulse)" />
          <path d="M14 34c4-8 6-12 8-12 3 0 5 14 8 14 3 0 5-20 8-20s6 28 8 28c2 0 4-6 8-12" fill="none" stroke="url(#g-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="32" r="6" fill={accent} opacity="0.9" />
        </svg>
      );
    }
    // variant full (wordmark stylisé minimal)
    if (variant === 'full') {
      return (
        <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 8 }} aria-label={`Logo complet DevDash thème ${theme}`}>
          <ThemeAsset type="logo" variant="mark" size={Math.round(size * 0.75)} />
          <span style={{
            fontSize: Math.round(size * 0.42),
            fontWeight: 600,
            background: `linear-gradient(90deg, ${accent}, ${tint(accent, 0.35)})`,
            WebkitBackgroundClip: 'text',
            color: 'transparent'
          }}>DevDash</span>
        </div>
      );
    }
  }

  if (type === 'empty') {
    // Minimal symbol variant (placeholder)
    // TODO: registry pattern future
    // const REGISTRY = { projects: <svg>...</svg>, tasks: <svg>...</svg> }
    // return REGISTRY[name] || default
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label={`Illustration ${name || 'vide'} thème ${theme}`}>
        <defs>
          <linearGradient id="g-empty" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={tint(accent, 0.55)} />
            <stop offset="100%" stopColor={accent} />
          </linearGradient>
        </defs>
        <rect x="6" y="10" width="52" height="44" rx="8" fill="none" stroke={accent} strokeWidth="2.5" strokeDasharray="6 6" />
        <circle cx="26" cy="28" r="8" fill="url(#g-empty)" opacity="0.9" />
        <rect x="34" y="22" width="14" height="4" rx="2" fill={tint(accent, 0.35)} />
        <rect x="34" y="30" width="18" height="4" rx="2" fill={tint(accent, 0.15)} />
        <rect x="18" y="42" width="28" height="4" rx="2" fill={tint(accent, 0.5)} />
      </svg>
    );
  }

  return null;
}
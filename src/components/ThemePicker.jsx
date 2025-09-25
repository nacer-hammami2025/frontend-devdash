import { useState } from 'react';
import AudioEngine from '../audio/audioEngine';
import { useAnimationIntensity } from '../hooks/useAnimationIntensity';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useFocusMode } from '../hooks/useFocusMode';
import { useSoundFx } from '../hooks/useSoundFx';
import { useTheme } from '../hooks/useTheme';

/*
  ThemePicker
  - Affiche une grille de palettes (mini preview multi-tons)
  - Navigation clavier (tab -> chaque carte bouton radio)
  - Accessible: role="radiogroup" + aria-checked
*/

const SHADES = ["accent", "accent-hover", "success", "warning"]; // simple preview mix

export default function ThemePicker({ onChange }) {
  const { theme, setTheme, themes } = useTheme();
  const { focusMode, toggleFocusMode } = useFocusMode();
  const { enabled: soundEnabled, rawEnabled, toggle: toggleSound, playHover, playClick, playSuccess, focusMode: fm } = useSoundFx();
  const audioAdv = useAudioEngine();
  const animIntensity = useAnimationIntensity();
  const [ambientVol, setAmbientVol] = useState(() => {
    try { const v = localStorage.getItem('devdash-ambient-vol'); return v ? parseInt(v, 10) : 70; } catch { return 70; }
  });

  const ambientVolFactor = ambientVol / 100; // 0..1
  // Apply ambient volume to engine when ready & enabled (but not in focus mono)
  if (audioAdv.ready && audioAdv.enabled && audioAdv.focusMode !== 'mono') {
    try { AudioEngine.setAmbientLevel(0.05 + ambientVolFactor * 0.95); } catch { }
  }
  const [open, setOpen] = useState(false);

  const select = (key) => {
    setTheme(key);
    onChange?.(key);
    setOpen(false);
    playSuccess();
    if (audioAdv.ready) audioAdv.earcon('select');
  };

  return (
    <div className="relative inline-block text-left" onMouseEnter={playHover}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); playClick(); }}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 shadow-sm"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="flex -space-x-1">
          {themes.slice(0, 4).map(t => (
            <span key={t.key} className={`h-3 w-3 rounded-full ring-1 ring-white/50 shadow ${t.key === theme ? 'opacity-100' : 'opacity-40'}`} style={{ background: t.color }} />
          ))}
        </span>
        <span className="text-[11px] uppercase tracking-wide opacity-70">{themes.find(t => t.key === theme)?.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 max-h-[70vh] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl p-3 flex flex-col gap-3 z-40" role="radiogroup" aria-label="Sélection du thème">
          <div className="grid grid-cols-2 gap-3">
            {themes.map(t => (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={t.key === theme}
                onClick={() => select(t.key)}
                onMouseEnter={playHover}
                className={`group relative flex flex-col items-start gap-2 p-3 rounded-lg border text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 ${t.key === theme ? 'border-[var(--color-accent)] bg-[var(--color-surface-alt)]' : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-md shadow-inner" style={{ background: t.color }} />
                  <span className="text-xs font-medium leading-none text-[var(--color-text)]">{t.label}</span>
                </div>
                <div className="flex gap-1">
                  {SHADES.map(s => (
                    <span key={s} className="h-3 w-3 rounded-full opacity-80 ring-1 ring-black/5" style={{ background: s === 'accent' ? t.color : t.key === 'slate' ? '#64748b' : t.color }} />
                  ))}
                </div>
                {t.contrast && <span className="absolute top-1.5 right-1.5 text-[9px] px-1 py-[1px] rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">{t.contrast}</span>}
                {t.key === theme && <span className="absolute -top-2 -left-2 bg-[var(--color-accent)] text-white text-[10px] px-1.5 py-[2px] rounded shadow">Actif</span>}
              </button>
            ))}
          </div>
          <div className="mt-1 pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-[var(--color-text)] leading-tight">Mode Focus</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">Réduit distraction (mono)</span>
            </div>
            <button
              type="button"
              onClick={() => { toggleFocusMode(); playClick(); if (audioAdv.ready) audioAdv.earcon('toggle'); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${focusMode === 'mono' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'}`}
              aria-pressed={focusMode === 'mono'}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${focusMode === 'mono' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="-mt-1 pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-[var(--color-text)] leading-tight">Sons UI {fm === 'mono' && <span className="ml-1 px-1 py-[1px] rounded bg-[var(--color-border)] text-[8px] uppercase tracking-wide">mutés</span>}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">Discrets (hover/clic){fm === 'mono' && ' – préférences conservées'}</span>
            </div>
            <button
              type="button"
              onClick={() => { toggleSound(); playClick(); if (audioAdv.ready) audioAdv.earcon('toggle'); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${(rawEnabled) ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'} ${fm === 'mono' ? 'opacity-60' : ''}`}
              aria-pressed={rawEnabled}
              aria-label={fm === 'mono' ? 'Sons UI (préférence, temporairement muets en focus)' : 'Basculer sons UI'}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${rawEnabled ? 'translate-x-6' : 'translate-x-1'} ${fm === 'mono' ? 'ring-2 ring-[var(--color-border)]' : ''}`} />
            </button>
          </div>
          <div className="-mt-1 pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-[var(--color-text)] leading-tight">Ambiance Audio {focusMode === 'mono' && <span className="ml-1 px-1 py-[1px] rounded bg-[var(--color-border)] text-[8px] uppercase tracking-wide">mutée</span>}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">Pad adaptatif{focusMode === 'mono' && ' – relancera à la sortie focus'}</span>
            </div>
            <button
              type="button"
              onClick={() => { audioAdv.toggle(); if (!audioAdv.ready) audioAdv.init(); playClick(); if (audioAdv.active) audioAdv.earcon('toggle'); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${(audioAdv.enabled) ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'} ${focusMode === 'mono' ? 'opacity-60' : ''}`}
              aria-pressed={audioAdv.enabled}
              aria-label={focusMode === 'mono' ? 'Ambiance Audio (préférence, temporairement mutée en focus)' : 'Basculer ambiance audio'}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${audioAdv.enabled ? 'translate-x-6' : 'translate-x-1'} ${focusMode === 'mono' ? 'ring-2 ring-[var(--color-border)]' : ''}`} />
            </button>
          </div>
          { /* Sliders section */}
          <div className="mt-2 space-y-4 border-t pt-3 border-[var(--color-border)]">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--color-text)]">Intensité Animation</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{animIntensity.value}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={animIntensity.value}
                onChange={(e) => animIntensity.set(parseInt(e.target.value, 10))}
                className="w-full accent-[var(--color-accent)] cursor-pointer"
                aria-label="Régler l'intensité de l'animation de fond"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--color-text)]">Volume Ambiance</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{ambientVol}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={ambientVol}
                onChange={(e) => { const v = parseInt(e.target.value, 10); setAmbientVol(v); try { localStorage.setItem('devdash-ambient-vol', String(v)); } catch { }; if (audioAdv.ready) { AudioEngine.setAmbientLevel(0.05 + (v / 100) * 0.95); } }}
                className="w-full accent-[var(--color-accent)] cursor-pointer"
                aria-label="Régler le volume de l'ambiance audio"
              />
            </div>
          </div>
          <div className="-mt-2 text-[10px] text-[var(--color-text-muted)] leading-snug">
            {focusMode === 'mono' ? 'Mode Focus actif : audio temporairement muet, vos préférences sont conservées.' : (
              audioAdv.enabled ? (audioAdv.ready ? 'Ambiance active. Changement de thème = ré-harmonisation.' : 'Clique pour initialiser (nécessite interaction).') : 'Active un paysage sonore subtil lié au thème.'
            )}
          </div>
        </div>
      )}
    </div>
  );
}

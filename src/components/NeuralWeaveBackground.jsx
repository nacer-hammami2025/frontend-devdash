import { useEffect, useRef } from 'react';
import AudioEngine from '../audio/audioEngine';

/*
  NeuralWeaveBackground (expérimental)
  ------------------------------------------------------------
  Concept: Un "tissage neural" vivant — un champ de flux vectoriel dérivé d'une noise simplex
  multi-octave, sur lequel circulent des filaments lumineux adaptatifs, créant l’impression
  d’un réseau cognitif actif. L'intensité et la teinte réagissent au thème et à l'activité
  utilisateur (mouvements, focus) sans tomber dans le bruit visuel.

  Caractéristiques uniques:
  - Multi-couches: base haze (diffuse), filaments (paths courbes), pulses (points), overlay grid subtle.
  - Flow Field dynamique recalculé progressivement (stabilité > mode entièrement aléatoire)
  - Variation lente de la direction via interpolation (evite flicker abrupt)
  - Couleurs dérivées des CSS vars (accent) + dérivation HSL pour gradient interne.
  - Parallax léger (pointer) pour profondeur.
  - Adaptatif densité selon devicePixelRatio & taille viewport.
  - Auto-pause quand onglet caché.
  - Respect prefers-reduced-motion (rend version statique minimaliste).

  Fallback: si performance faible (>= 40ms frame moyenne sur 2s) -> degrade mode (moins de filaments).

  NOTE: Cette implémentation se veut élégante & inédite, mais reste légère et améliorable.
  Intensité & Audio Réactivité:
    - intensityFactor (0..1) module densité, vitesse, longueur, luminosité.
    - energySmoothRef (0..1) dérivée de l'analyse FFT audio -> accentue dynamique.
    - Formule générale: param = base * f(intensityFactor) * (1 + energy*k)

  Extension future:
    - Multi-bandes -> color shift ou pulsations de grille.
    - Cache canvas hors-écran pour post-traitement (bloom léger via composite).
*/

export default function NeuralWeaveBackground({ className = '', performanceSample = 180, intensityFactor = 0.7 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const frameTimesRef = useRef([]);
  const degradeRef = useRef(false);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const energyRef = useRef(0);
  const energySmoothRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) return; // static fallback handled by markup below
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      canvas.width = canvas.offsetWidth * DPR;
      canvas.height = canvas.offsetHeight * DPR;
      ctx.scale(DPR, DPR);
    }
    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    // Simplex-like pseudo noise (fast hash-based gradient noise)
    function hash(x, y, seed = 0) {
      let h = x * 374761393 + y * 668265263 + seed * 700001;
      h = (h ^ (h >> 13)) * 1274126177;
      return ((h ^ (h >> 16)) >>> 0) / 4294967295; // 0..1
    }
    function noise(x, y, t) {
      const i = Math.floor(x), j = Math.floor(y);
      const fx = x - i, fy = y - j;
      let v = 0;
      const o = [[0, 0], [1, 0], [0, 1], [1, 1]];
      for (let k = 0; k < 4; k++) {
        const [ox, oy] = o[k];
        const g = hash(i + ox, j + oy, Math.floor(t * 0.1));
        const wx = 1 - Math.abs(fx - ox);
        const wy = 1 - Math.abs(fy - oy);
        v += g * wx * wy;
      }
      return v;
    }

    // Flow field parameters
    const field = { cols: 0, rows: 0, scale: 80, vectors: [], t: 0 };

    function buildField() {
      field.cols = Math.ceil(canvas.offsetWidth / field.scale) + 2;
      field.rows = Math.ceil(canvas.offsetHeight / field.scale) + 2;
      field.vectors = new Array(field.cols * field.rows).fill(0).map((_, idx) => {
        return { a: Math.random() * Math.PI * 2, dx: 0, dy: 0 };
      });
    }
    buildField();

    const filaments = [];
    const filamentCount = () => {
      const base = degradeRef.current ? 18 : 38;
      const scaled = base * (0.4 + intensityFactor * 0.9); // range ~0.4x..1.3x
      return Math.round(scaled);
    };

    function spawnFilament() {
      const x = Math.random() * canvas.offsetWidth;
      const y = Math.random() * canvas.offsetHeight;
      filaments.push({ x, y, life: 0, max: 700 + Math.random() * 400, path: [] });
    }
    for (let i = 0; i < filamentCount(); i++) spawnFilament();

    function sampleField(x, y) {
      const c = Math.floor(x / field.scale);
      const r = Math.floor(y / field.scale);
      if (c < 0 || r < 0 || c >= field.cols || r >= field.rows) return { x: 0, y: 0 };
      const v = field.vectors[r * field.cols + c];
      return { x: Math.cos(v.a), y: Math.sin(v.a) };
    }

    function updateField(dt) {
      // energy sampling (throttle inside getEnergy)
      const e = AudioEngine.getEnergy ? AudioEngine.getEnergy() : 0;
      // smooth (attack rapide, decay lent)
      energySmoothRef.current = e > energySmoothRef.current ? (energySmoothRef.current + (e - energySmoothRef.current) * 0.4) : (energySmoothRef.current * 0.94 + e * 0.06);
      field.t += dt * 0.00025 * (1 + energySmoothRef.current * 1.5);
      for (let r = 0; r < field.rows; r++) {
        for (let c = 0; c < field.cols; c++) {
          const idx = r * field.cols + c;
          const v = field.vectors[idx];
          const nx = noise(c * 0.9 + field.t * 0.8, r * 0.9 + field.t * 0.8, field.t);
          const ny = noise(c * 0.9 - field.t * 0.6, r * 0.9 - field.t * 0.6, field.t + 5.123);
          const targetAngle = (nx - ny) * Math.PI * 2;
          // Lerp angle pour stabilité
          const da = (targetAngle - v.a + Math.PI * 3) % (Math.PI * 2) - Math.PI; // shortest path
          v.a += da * (0.05 + energySmoothRef.current * 0.05);
        }
      }
    }

    function evolveFilaments(dt) {
      const baseSpeed = (degradeRef.current ? 38 : 52) * (0.55 + intensityFactor * 0.9);
      const speed = baseSpeed * (1 + energySmoothRef.current * 0.9);
      for (const f of filaments) {
        f.life += dt;
        if (f.life > f.max) {
          // respawn
          f.x = Math.random() * canvas.offsetWidth;
          f.y = Math.random() * canvas.offsetHeight;
          f.life = 0; f.max = 700 + Math.random() * 400; f.path = [];
        }
        const flow = sampleField(f.x, f.y);
        f.x += flow.x * speed * dt / 1000 + (Math.random() - 0.5) * 0.4;
        f.y += flow.y * speed * dt / 1000 + (Math.random() - 0.5) * 0.4;
        // wrap
        if (f.x < 0) f.x += canvas.offsetWidth; else if (f.x > canvas.offsetWidth) f.x -= canvas.offsetWidth;
        if (f.y < 0) f.y += canvas.offsetHeight; else if (f.y > canvas.offsetHeight) f.y -= canvas.offsetHeight;
        f.path.push({ x: f.x, y: f.y });
        const maxLen = 40 + Math.floor(intensityFactor * 30) + Math.floor(energySmoothRef.current * 25);
        if (f.path.length > maxLen) f.path.shift();
      }
    }

    function drawBackground() {
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-base').trim() || '#0ea5e9';
      const energy = energySmoothRef.current;
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      ctx.globalCompositeOperation = 'source-over';
      const grd = ctx.createLinearGradient(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      grd.addColorStop(0, hexToRGBA(accent, 0.05 + energy * 0.06));
      grd.addColorStop(1, hexToRGBA(accent, 0.015 + energy * 0.03));
      ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      ctx.save();
      const px = (pointerRef.current.x - 0.5) * 40;
      const py = (pointerRef.current.y - 0.5) * 40;
      ctx.translate(px, py);
      ctx.globalAlpha = 0.06 + energy * 0.04;
      const step = 70;
      ctx.beginPath();
      for (let x = -step * 2; x < canvas.offsetWidth + step * 2; x += step) { ctx.moveTo(x, -step * 2); ctx.lineTo(x, canvas.offsetHeight + step * 2); }
      for (let y = -step * 2; y < canvas.offsetHeight + step * 2; y += step) { ctx.moveTo(-step * 2, y); ctx.lineTo(canvas.offsetWidth + step * 2, y); }
      ctx.strokeStyle = hexToRGBA(accent, 0.12 + energy * 0.08);
      ctx.lineWidth = 0.5; ctx.stroke(); ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      for (const f of filaments) {
        if (f.path.length < 2) continue;
        const alpha = Math.min(1, f.life / 400) * (1 - f.life / f.max);
        ctx.lineWidth = (degradeRef.current ? 1 : 1 + intensityFactor * 0.6 + energy * 0.5);
        ctx.strokeStyle = accent;
        ctx.globalAlpha = alpha * (0.30 + intensityFactor * 0.25 + energy * 0.35);
        ctx.beginPath();
        for (let i = 0; i < f.path.length; i++) { const p = f.path[i]; if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const f of filaments) {
        const p = f.path[f.path.length - 1]; if (!p) continue;
        const alpha = (1 - f.life / f.max);
        ctx.fillStyle = hexToRGBA(accent, (0.12 + intensityFactor * 0.15 + energy * 0.2) * alpha);
        ctx.beginPath(); ctx.arc(p.x, p.y, (degradeRef.current ? 1.3 : 1.2 + intensityFactor * 0.7) + energy * 1.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    let last = performance.now();
    function loop(now) {
      const dt = now - last; last = now;
      updateField(dt);
      evolveFilaments(dt);
      drawBackground();

      // Collect perf
      frameTimesRef.current.push(dt);
      if (frameTimesRef.current.length > performanceSample) {
        const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        if (avg > 40 && !degradeRef.current) {
          degradeRef.current = true; // reduce complexity
        }
        frameTimesRef.current = [];
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    function onPointer(e) {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = (e.clientX - rect.left) / rect.width;
      pointerRef.current.y = (e.clientY - rect.top) / rect.height;
    }
    window.addEventListener('pointermove', onPointer);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(rafRef.current);
      else { last = performance.now(); rafRef.current = requestAnimationFrame(loop); }
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('pointermove', onPointer);
      ro.disconnect();
    };
  }, [reducedMotion, performanceSample, intensityFactor]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {!reducedMotion && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}
      {reducedMotion && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_40%,rgba(var(--color-accent-rgb,37,99,235),0.18),transparent_70%)]" />
      )}
      <div className="absolute inset-0 mix-blend-plus-lighter opacity-[0.55] pointer-events-none" style={{ background: "radial-gradient(circle at 60% 65%,rgba(255,255,255,0.08),transparent 70%)" }} />
    </div>
  );
}

function hexToRGBA(hex, alpha = 1) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const num = parseInt(h, 16);
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

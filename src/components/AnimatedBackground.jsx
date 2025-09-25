import { useEffect, useRef } from 'react';

/**
 * AnimatedBackground
 * Effet combiné:
 * 1. Gradient fluide animé (CSS custom properties)
 * 2. Particules connectées (canvas) réactives au mouvement de la souris
 *
 * Performance:
 * - Désactivation auto si prefers-reduced-motion
 * - Throttle du pointer
 * - Pause quand l'onglet est caché (visibilitychange)
 * - Canvas resize debounced
 *
 * Thème:
 * - Utilise les variables CSS existantes (accent, focus-ring, border) pour dériver les couleurs
 */
export default function AnimatedBackground({ className = '' }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const lastMoveRef = useRef(0);
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Gradient animé via CSS variables
  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const root = document.documentElement;
    function animate() {
      frame += 0.5; // vitesse
      // Mouvement sin/cos pour générer 2 points dynamiques
      const a = (Math.sin(frame / 60) + 1) / 2; // 0..1
      const b = (Math.cos(frame / 47) + 1) / 2;
      root.style.setProperty('--login-grad-x1', `${20 + a * 60}%`);
      root.style.setProperty('--login-grad-y1', `${20 + b * 60}%`);
      root.style.setProperty('--login-grad-x2', `${80 - b * 60}%`);
      root.style.setProperty('--login-grad-y2', `${80 - a * 60}%`);
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reducedMotion]);

  // Particules
  useEffect(() => {
    if (reducedMotion) return; // respect
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    let height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const density = Math.min(60, Math.round((width * height) / 40000)); // adaptatif

    particlesRef.current = Array.from({ length: density }).map(() => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 1 + Math.random() * 1.5
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-base').trim() || '#0ea5e9';
      const accentRGBA = hexToRGBA(accent, 0.5);
      const lineRGBA = hexToRGBA(accent, 0.10);

      const ptr = pointerRef.current;

      // Update & draw particles
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        else if (p.x > canvas.offsetWidth) { p.x = canvas.offsetWidth; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        else if (p.y > canvas.offsetHeight) { p.y = canvas.offsetHeight; p.vy *= -1; }

        // légère attraction vers pointeur actif
        if (ptr.active) {
          const dx = ptr.x - p.x;
          const dy = ptr.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            p.vx += (dx / dist) * 0.002;
            p.vy += (dy / dist) * 0.002;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = accentRGBA;
        ctx.fill();
      }

      // Draw lines
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const a = particlesRef.current[i];
          const b = particlesRef.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 75 * 75) {
            const alpha = 1 - dist2 / (75 * 75);
            ctx.strokeStyle = hexToRGBA(accent, alpha * 0.25);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // pointer aura
      if (ptr.active) {
        const grd = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, 80);
        grd.addColorStop(0, accentRGBA);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(ptr.x, ptr.y, 80, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    function onMove(e) {
      const now = performance.now();
      if (now - lastMoveRef.current < 16) return; // ~60fps throttle
      lastMoveRef.current = now;
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = (e.clientX - rect.left);
      pointerRef.current.y = (e.clientY - rect.top);
    }
    function onEnter() { pointerRef.current.active = true; }
    function onLeave() { pointerRef.current.active = false; }

    function resize() {
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeObserver._t);
      resizeObserver._t = setTimeout(resize, 120);
    });
    resizeObserver.observe(canvas);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(rafRef.current);
      else rafRef.current = requestAnimationFrame(draw);
    });

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerenter', onEnter);
    canvas.addEventListener('pointerleave', onLeave);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerenter', onEnter);
      canvas.removeEventListener('pointerleave', onLeave);
      resizeObserver.disconnect();
    };
  }, [reducedMotion]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0 animated-login-gradient" />
      {!reducedMotion && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-[rgba(255,255,255,0.04)] dark:bg-[rgba(0,0,0,0.15)] mix-blend-normal" />
    </div>
  );
}

function hexToRGBA(hex, alpha = 1) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

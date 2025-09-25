import { useEffect, useRef } from 'react';

/*
  ParticleField
  ------------------------------------------------------------------
  Variante évoquant un espace de "nodes" DevDash (activités / tâches) connectés par
  une légère respiration. Moins organique que NeuralWeave, plus structurel.
*/
export default function ParticleField({ intensity = 0.7, className = '' }) {
  const canvasRef = useRef(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (reduced) return; const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d');
    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);
    const nodes = []; const COUNT = Math.round(40 + intensity * 70);
    for (let i = 0; i < COUNT; i++) nodes.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: 1 + Math.random() * 2, o: Math.random(), vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15 });
    let t = 0, raf;
    function loop() {
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-base').trim() || '#0ea5e9';
      for (const n of nodes) {
        n.x += n.vx * (0.5 + intensity); n.y += n.vy * (0.5 + intensity);
        if (n.x < 0) n.x += canvas.width; else if (n.x > canvas.width) n.x -= canvas.width;
        if (n.y < 0) n.y += canvas.height; else if (n.y > canvas.height) n.y -= canvas.height;
      }
      // draw links
      ctx.globalAlpha = 0.15 + intensity * 0.15;
      ctx.strokeStyle = accent; ctx.lineWidth = 0.6;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y; const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110 + intensity * 70) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
      }
      // nodes
      ctx.globalAlpha = 0.5 + intensity * 0.4;
      for (const n of nodes) {
        ctx.beginPath(); ctx.fillStyle = accent; ctx.arc(n.x, n.y, n.r + Math.sin(t + n.o) * 0.4 * intensity, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [intensity, reduced]);
  return <div className={`absolute inset-0 ${className}`} aria-hidden="true"><canvas ref={canvasRef} className="w-full h-full" /></div>;
}

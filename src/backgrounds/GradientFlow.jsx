import { useEffect, useRef } from 'react';

/*
  GradientFlow
  ------------------------------------------------------------------
  Animation douce basée sur plusieurs gradients radiaux en translation / scale
  pilotés par sinusoïdes lissées. Sert de variante plus sobre que NeuralWeave.
*/
export default function GradientFlow({ intensity = 0.7, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf; let t = 0;
    function loop() {
      t += 0.008 + intensity * 0.01;
      const a1 = Math.sin(t * 0.9) * 40; const a2 = Math.cos(t * 0.7) * 55; const a3 = Math.sin(t * 0.5 + 1) * 50;
      el.style.background = `radial-gradient(circle at ${50 + a1}% ${50 + a2}%, var(--color-accent-base)11, transparent 70%),radial-gradient(circle at ${50 - a2}% ${50 - a3}%, var(--color-accent-base)18, transparent 72%),radial-gradient(circle at ${50 + a3}% ${50 - a1}%, var(--color-accent-base)10, transparent 75%)`;
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [intensity]);
  return <div ref={ref} className={`absolute inset-0 transition-opacity duration-700 ${className}`} style={{ background: "radial-gradient(circle at 50% 50%, var(--color-accent-base)15, transparent 70%)", mixBlendMode: 'plus-lighter', opacity: 0.9 }} aria-hidden="true" />;
}

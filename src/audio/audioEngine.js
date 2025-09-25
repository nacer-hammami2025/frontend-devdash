/*
  audioEngine (expérimental)
  ------------------------------------------------------------------
  Rôle
    Fournir une couche audio unifiée pour DevDash:
      - Pad ambient adaptatif (couleur -> échelle musicale) créant un paysage discret.
      - Earcons (petits sons d'UI) harmonisés sur l'accent pour cohérence identitaire.
      - Analyseur (FFT) servant de pont énergie -> animation (NeuralWeave).

  Architecture
    ctx(AudioContext)
      -> masterGain (volume global)
         -> uiGain (earcons)
         -> ambientGain (pad évolutif)
         -> DynamicsCompressor (soft limiter / smoothing transitoires)
            -> AnalyserNode (énergie normalisée)
               -> destination

  Points clés
    - init() protégé (idempotent), appelé après interaction utilisateur (policy autoplay).
    - colorToScale(): convertit teinte accent -> racine + set d'intervalles (modes simples).
    - startAmbient(): construit 3 oscillateurs saw + filtre low-pass évolution lente.
    - getEnergy(): extrait une moyenne normalisée bass-mid (bins 2..32) pour cohérence visuelle.
    - setVolume / setAmbientLevel: nouveaux contrôles pour sliders UI.

  Limites & pistes futures
    - Pas encore de crossfade entre thèmes (stop/start simple).
    - Pas de gestion de latence ou scheduling MIDI.
    - Ajouter éventuellement une reverb convolution légère + random seed tonal.
*/

const AudioEngine = (() => {
  let ctx = null;
  let masterGain, uiGain, ambientGain;
  let masterLevel = 0.85;
  let ambientLevel = 0.35;
  let started = false;
  let ambientNodes = [];
  let lastEarconAt = 0;
  let analyser, analyserData, analyserLast = 0;

  function init() {
    if (started) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      uiGain = ctx.createGain();
      ambientGain = ctx.createGain();
      masterGain.gain.value = masterLevel;
      uiGain.gain.value = 0.9;
      ambientGain.gain.value = ambientLevel;
      uiGain.connect(masterGain);
      ambientGain.connect(masterGain);
      // Analyser
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserData = new Uint8Array(analyser.frequencyBinCount);

      // Soft limiter
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 18;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      masterGain.connect(compressor).connect(analyser).connect(ctx.destination);
      started = true;
      return true;
    } catch (e) {
      console.warn('Audio init failed', e); return false;
    }
  }

  function colorToScale(accentHex) {
    // Convert HEX -> H (approx) -> choose scale pattern
    let h = 0;
    try {
      let c = accentHex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const r = parseInt(c.slice(0, 2), 16) / 255;
      const g = parseInt(c.slice(2, 4), 16) / 255;
      const b = parseInt(c.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const d = max - min;
      if (d === 0) h = 0; else if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    } catch { }
    const SCALES = [[0, 3, 7, 10], [0, 2, 5, 9], [0, 4, 7, 11], [0, 2, 3, 7, 9]];
    const idx = Math.floor((h / 360) * SCALES.length) % SCALES.length;
    return { root: 220 * Math.pow(2, (h % 60) / 60), intervals: SCALES[idx] };
  }

  function earcon(type = 'select', accent = '#2563eb') {
    if (!started) return;
    const now = ctx.currentTime;
    if (now - lastEarconAt < 0.08) return; // spam guard
    lastEarconAt = now;
    const { root, intervals } = colorToScale(accent);
    const base = root * 2; // octave up
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    let interval;
    switch (type) {
      case 'success': interval = intervals[2] || 7; break;
      case 'toggle': interval = intervals[1] || 3; break;
      case 'select':
      default: interval = intervals[Math.floor(Math.random() * intervals.length)] || 0; break;
    }
    const freq = base * Math.pow(2, interval / 12);
    osc.type = type === 'success' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);
    // Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain).connect(uiGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  function startAmbient(accent = '#2563eb') {
    if (!started) return;
    // Simple evolving pad: 3 detuned oscillators with slow filter sweep
    stopAmbient();
    const { root } = colorToScale(accent);
    const base = root;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.7;

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = base * (i === 0 ? 1 : (i === 1 ? Math.pow(2, 3 / 12) : Math.pow(2, 7 / 12)));
      osc.detune.value = (i - 1) * 5;
      const gain = ctx.createGain();
      gain.gain.value = 0.0;
      osc.connect(gain).connect(filter).connect(ambientGain);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.14 / (i + 1), now + 3 + i * 0.5);
      osc.start();
      ambientNodes.push({ osc, gain });
    }
    // Slow sweep
    const now = ctx.currentTime;
    filter.frequency.exponentialRampToValueAtTime(2200, now + 18);
  }

  function stopAmbient() {
    if (!started) return;
    const now = ctx.currentTime;
    ambientNodes.forEach(n => {
      try {
        n.gain.gain.cancelScheduledValues(now);
        n.gain.gain.setTargetAtTime(0, now, 1.2);
        n.osc.stop(now + 2.5);
      } catch { }
    });
    ambientNodes = [];
  }

  function setVolume(v) {
    // v: 0..1 (master) - transition lissée pour éviter clicks
    masterLevel = Math.min(1, Math.max(0, v));
    if (masterGain) masterGain.gain.linearRampToValueAtTime(masterLevel, ctx.currentTime + 0.15);
  }

  function setAmbientLevel(v) {
    ambientLevel = Math.min(1, Math.max(0, v));
    if (ambientGain) ambientGain.gain.linearRampToValueAtTime(ambientLevel, ctx.currentTime + 0.3);
  }

  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function getEnergy() {
    if (!started || !analyser) return 0;
    const now = performance.now();
    if (now - analyserLast < 50) return analyserLastEnergy; // throttle sampling
    analyser.getByteFrequencyData(analyserData);
    // Focus sur les basses-mid (bins 2..32) pour pad
    let sum = 0, count = 0;
    for (let i = 2; i < 32 && i < analyserData.length; i++) { sum += analyserData[i]; count++; }
    const avg = sum / (count || 1); // 0..255
    const norm = avg / 255; // 0..1
    analyserLast = now;
    analyserLastEnergy = norm;
    return norm;
  }

  return { init, earcon, startAmbient, stopAmbient, suspend, resume, isStarted: () => started, getEnergy, setVolume, setAmbientLevel };
})();

export default AudioEngine;

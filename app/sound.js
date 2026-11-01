/* CleanFrame interface sounds. Synthesised with Web Audio: no audio files, no network. */
(function () {
  'use strict';
  var Ctx = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, wet = null, bus = null, busWet = null, noiseBuf = null, failed = false;
  var palette = 'glass', level = 'normal', last = {};
  var LEVELS = { soft: 0.45, normal: 0.8, bold: 1.25 };
  var TRIM = { glass: {move: 3.2, edge: 2.99, select: 0.95, back: 1.15, launch: 0.98, home: 0.85}, felt: {move: 2.82, edge: 1.26, select: 0.78, back: 0.8, launch: 0.86, home: 0.6}, air: {move: 6.1, edge: 7.24, select: 2.51, back: 2.02, launch: 2.24, home: 0.57}};
  var GAP = { move: 38, edge: 120, select: 60, back: 60, launch: 250, home: 900 };

  function init() {
    var comp, rev, len, ir, ch, d, i;
    if (ctx || failed) return ctx;
    if (!Ctx) { failed = true; return null; }
    try {
      ctx = new Ctx();
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.12;
      master = ctx.createGain(); master.gain.value = LEVELS[level];
      master.connect(comp); comp.connect(ctx.destination);
      // A small generated room so chimes have a soft tail.
      rev = ctx.createConvolver(); len = Math.floor(ctx.sampleRate * 0.9);
      ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (ch = 0; ch < 2; ch++) { d = ir.getChannelData(ch); for (i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      rev.buffer = ir; wet = ctx.createGain(); wet.gain.value = 0.22; wet.connect(rev); rev.connect(master);
      len = Math.floor(ctx.sampleRate * 0.6); noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      d = noiseBuf.getChannelData(0); for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { failed = true; ctx = null; }
    return ctx;
  }

  function out(node, send) { node.connect(bus); if (send) node.connect(busWet); }
  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  /* A pitched voice: f = frequency, at = seconds from now, o = options. */
  function tone(f, at, o) {
    var t = ctx.currentTime + (at || 0), osc = ctx.createOscillator(), g = ctx.createGain(), node = g, lp;
    o = o || {};
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || 0.12));
    if (o.detune) osc.detune.value = o.detune;
    osc.connect(g);
    if (o.lp) { lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; g.connect(lp); node = lp; }
    env(g, t, o.gain || 0.2, o.attack || 0.004, o.decay || 0.2);
    out(node, o.wet);
    osc.start(t); osc.stop(t + (o.attack || 0.004) + (o.decay || 0.2) + 0.05);
  }
  /* A filtered breath of noise, optionally sweeping. */
  function air(at, o) {
    var t = ctx.currentTime + (at || 0), src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), dur;
    o = o || {}; dur = (o.attack || 0.004) + (o.decay || 0.05);
    src.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = o.q || 1.2;
    bp.frequency.setValueAtTime(o.f || 2000, t);
    if (o.to) bp.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    src.connect(bp); bp.connect(g);
    env(g, t, o.gain || 0.1, o.attack || 0.004, o.decay || 0.05);
    out(g, o.wet);
    src.start(t); src.stop(t + dur + 0.05);
  }
  function bell(f, at, gain, decay, wetSend) {
    tone(f, at, { gain: gain, decay: decay, wet: wetSend });
    tone(f * 2.76, at, { gain: gain * 0.18, decay: decay * 0.35, wet: wetSend });
  }
  function mallet(f, at, gain, decay) {
    tone(f, at, { gain: gain, decay: decay, attack: 0.003, wet: true });
    tone(f * 3.93, at, { gain: gain * 0.12, decay: decay * 0.18, attack: 0.002 });
    air(at, { f: f * 2, q: 2, gain: gain * 0.25, decay: 0.012 });
  }

  var PALETTES = {
    /* Glass: clear, bright taps and chimes. */
    glass: {
      move: function () { bell(2093, 0, 0.07, 0.07); },
      edge: function () { tone(660, 0, { gain: 0.06, decay: 0.06, to: 520, glide: 0.06 }); },
      select: function () { bell(1047, 0, 0.12, 0.25, true); bell(1568, 0.06, 0.11, 0.35, true); },
      back: function () { bell(1568, 0, 0.09, 0.18, true); bell(1047, 0.06, 0.08, 0.28, true); },
      launch: function () { bell(1319, 0, 0.12, 0.3, true); bell(1568, 0.045, 0.12, 0.3, true); bell(2093, 0.09, 0.13, 0.6, true); air(0, { f: 1500, to: 6000, q: 0.8, gain: 0.05, attack: 0.02, decay: 0.2 }); },
      home: function () { [523, 659, 784, 988].forEach(function (f, i) { tone(f, i * 0.07, { gain: 0.08, attack: 0.03, decay: 1.4, wet: true }); tone(f * 2, i * 0.07, { gain: 0.018, attack: 0.02, decay: 0.6, wet: true }); }); }
    },
    /* Felt: warm, woody mallets, like a soft marimba. */
    felt: {
      move: function () { mallet(784, 0, 0.09, 0.06); },
      edge: function () { tone(196, 0, { gain: 0.14, decay: 0.08, lp: 600 }); air(0, { f: 400, q: 1, gain: 0.05, decay: 0.03 }); },
      select: function () { mallet(587, 0, 0.16, 0.3); mallet(880, 0.07, 0.14, 0.4); },
      back: function () { mallet(880, 0, 0.13, 0.25); mallet(587, 0.07, 0.12, 0.35); },
      launch: function () { [587, 740, 880, 1175].forEach(function (f, i) { mallet(f, i * 0.05, 0.14, i === 3 ? 0.7 : 0.25); }); },
      home: function () { mallet(147, 0, 0.18, 1.2); mallet(294, 0.02, 0.12, 1.1); mallet(440, 0.09, 0.12, 1.1); mallet(740, 0.18, 0.1, 1.3); }
    },
    /* Air: barely there, breath and soft pads. */
    air: {
      move: function () { air(0, { f: 3200, q: 2.5, gain: 0.07, attack: 0.003, decay: 0.04 }); },
      edge: function () { air(0, { f: 500, q: 1.5, gain: 0.1, attack: 0.003, decay: 0.07 }); },
      select: function () { air(0, { f: 1200, to: 3500, q: 1.6, gain: 0.08, attack: 0.01, decay: 0.12 }); tone(1319, 0.02, { gain: 0.05, attack: 0.02, decay: 0.3, wet: true }); },
      back: function () { air(0, { f: 3500, to: 1000, q: 1.6, gain: 0.08, attack: 0.01, decay: 0.12 }); tone(988, 0.02, { gain: 0.045, attack: 0.02, decay: 0.25, wet: true }); },
      launch: function () { air(0, { f: 400, to: 5000, q: 0.9, gain: 0.12, attack: 0.03, decay: 0.32, wet: true }); tone(880, 0.05, { gain: 0.05, attack: 0.08, decay: 0.5, to: 1760, glide: 0.3, wet: true }); },
      home: function () { [220, 330, 440, 554].forEach(function (f, i) { tone(f, 0, { gain: 0.06, attack: 0.25, decay: 1.6, detune: i % 2 ? 6 : -6, lp: 2400, wet: true }); }); air(0, { f: 800, to: 2400, q: 0.7, gain: 0.04, attack: 0.3, decay: 0.8, wet: true }); }
    }
  };

  function play(name) {
    var p = PALETTES[palette], now = Date.now();
    if (palette === 'off' || !p || !p[name]) return false;
    if (last[name] && now - last[name] < GAP[name]) return false;
    if (!init()) return false;
    last[name] = now;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      bus = ctx.createGain(); bus.gain.value = TRIM[palette][name]; bus.connect(master);
      busWet = ctx.createGain(); busWet.gain.value = TRIM[palette][name]; busWet.connect(wet);
      p[name](); return true;
    }
    catch (e) { return false; }
  }
  function configure(p, l) {
    if (p === 'off' || PALETTES[p]) palette = p;
    if (LEVELS[l]) level = l;
    if (master) master.gain.value = LEVELS[level];
  }
  function suspend() { try { if (ctx && ctx.state === 'running' && ctx.suspend) ctx.suspend(); } catch (e) {} }

  window.FrameSound = { play: play, configure: configure, suspend: suspend, palettes: ['glass', 'felt', 'air'], levels: ['soft', 'normal', 'bold'] };
}());

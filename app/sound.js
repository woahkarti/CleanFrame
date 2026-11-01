/* CleanFrame interface sounds. Synthesised with Web Audio: no audio files, no network. */
(function () {
  'use strict';
  var Ctx = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, wet = null, bus = null, busWet = null, noiseBuf = null, failed = false;
  var palette = 'glass', level = 'normal', last = {};
  var LEVELS = { soft: 0.45, normal: 0.8, bold: 1.25 };
  var GAP = { move: 38, edge: 120, select: 60, back: 60, launch: 250, home: 900 };
  var CUES = ['move', 'edge', 'select', 'back', 'launch', 'home'];

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
  /* bright: 1 = full marimba click and overtone; lower values give a rounder, felted strike. */
  function mallet(f, at, gain, decay, bright) {
    var b = bright === undefined ? 1 : bright;
    tone(f, at, { gain: gain, decay: decay, attack: 0.003 + (1 - b) * 0.004, wet: true, lp: b < 1 ? 900 + 2600 * b : 0 });
    tone(f * 3.93, at, { gain: gain * 0.12 * b, decay: decay * 0.18, attack: 0.002 });
    air(at, { f: f * 2, q: 2, gain: gain * 0.25 * b, decay: 0.012 });
  }

  /* Every sound, by name. Palettes and custom mixes pick one per cue. */
  var LIB = {
    'glass.move': function () { bell(2093, 0, 0.07, 0.07); },
    'glass.edge': function () { tone(660, 0, { gain: 0.06, decay: 0.06, to: 520, glide: 0.06 }); },
    'glass.select': function () { bell(1047, 0, 0.12, 0.25, true); bell(1568, 0.06, 0.11, 0.35, true); },
    'glass.back': function () { bell(1568, 0, 0.09, 0.18, true); bell(1047, 0.06, 0.08, 0.28, true); },
    'glass.launch': function () { bell(1319, 0, 0.12, 0.3, true); bell(1568, 0.045, 0.12, 0.3, true); bell(2093, 0.09, 0.13, 0.6, true); air(0, { f: 1500, to: 6000, q: 0.8, gain: 0.05, attack: 0.02, decay: 0.2 }); },
    'glass.home': function () { [523, 659, 784, 988].forEach(function (f, i) { tone(f, i * 0.07, { gain: 0.08, attack: 0.03, decay: 1.4, wet: true }); tone(f * 2, i * 0.07, { gain: 0.018, attack: 0.02, decay: 0.6, wet: true }); }); },

    'felt.move': function () { mallet(784, 0, 0.09, 0.06); },
    'felt.edge': function () { tone(196, 0, { gain: 0.14, decay: 0.08, lp: 600 }); air(0, { f: 400, q: 1, gain: 0.05, decay: 0.03 }); },
    'felt.select': function () { mallet(587, 0, 0.16, 0.3); mallet(880, 0.07, 0.14, 0.4); },
    'felt.back': function () { mallet(880, 0, 0.13, 0.25); mallet(587, 0.07, 0.12, 0.35); },
    'felt.launch': function () { [587, 740, 880, 1175].forEach(function (f, i) { mallet(f, i * 0.05, 0.14, i === 3 ? 0.7 : 0.25); }); },
    'felt.home': function () { mallet(147, 0, 0.18, 1.2); mallet(294, 0.02, 0.12, 1.1); mallet(440, 0.09, 0.12, 1.1); mallet(740, 0.18, 0.1, 1.3); },

    'air.move': function () { air(0, { f: 3200, q: 2.5, gain: 0.07, attack: 0.003, decay: 0.04 }); },
    'air.edge': function () { air(0, { f: 500, q: 1.5, gain: 0.1, attack: 0.003, decay: 0.07 }); },
    'air.select': function () { air(0, { f: 1200, to: 3500, q: 1.6, gain: 0.08, attack: 0.01, decay: 0.12 }); tone(1319, 0.02, { gain: 0.05, attack: 0.02, decay: 0.3, wet: true }); },
    'air.back': function () { air(0, { f: 3500, to: 1000, q: 1.6, gain: 0.08, attack: 0.01, decay: 0.12 }); tone(988, 0.02, { gain: 0.045, attack: 0.02, decay: 0.25, wet: true }); },
    'air.launch': function () { air(0, { f: 400, to: 5000, q: 0.9, gain: 0.12, attack: 0.03, decay: 0.32, wet: true }); tone(880, 0.05, { gain: 0.05, attack: 0.08, decay: 0.5, to: 1760, glide: 0.3, wet: true }); },
    'air.home': function () { [220, 330, 440, 554].forEach(function (f, i) { tone(f, 0, { gain: 0.06, attack: 0.25, decay: 1.6, detune: i % 2 ? 6 : -6, lp: 2400, wet: true }); }); air(0, { f: 800, to: 2400, q: 0.7, gain: 0.04, attack: 0.3, decay: 0.8, wet: true }); },

    /* Round 2 (2026-10-31): softer, lower felt moves. */
    'felt.move.soft': function () { mallet(523, 0, 0.09, 0.07, 0.55); },
    'felt.move.low': function () { mallet(392, 0, 0.09, 0.08, 0.45); },
    'felt.move.deep': function () { mallet(330, 0, 0.09, 0.09, 0.3); },
    'felt.select.low': function () { mallet(440, 0, 0.14, 0.28, 0.6); mallet(659, 0.07, 0.12, 0.36, 0.6); },
    /* Round 2: quieter launch ideas. */
    'launch.bloom': function () { tone(440, 0, { gain: 0.12, attack: 0.025, decay: 0.45, lp: 1800, wet: true }); tone(880, 0.01, { gain: 0.025, attack: 0.02, decay: 0.25, wet: true }); },
    'launch.step': function () { mallet(392, 0, 0.12, 0.2, 0.55); mallet(587, 0.08, 0.12, 0.4, 0.55); },
    'launch.breath': function () { mallet(440, 0, 0.1, 0.18, 0.5); air(0.02, { f: 600, to: 2200, q: 1.1, gain: 0.06, attack: 0.04, decay: 0.18, wet: true }); },
    'launch.hush': function () { air(0, { f: 300, to: 1400, q: 0.9, gain: 0.08, attack: 0.05, decay: 0.22, wet: true }); tone(294, 0.02, { gain: 0.06, attack: 0.04, decay: 0.3, lp: 900 }); },
    /* Round 2: back ideas. */
    'back.felt.low': function () { mallet(587, 0, 0.11, 0.22, 0.6); mallet(392, 0.07, 0.11, 0.32, 0.6); },
    'back.felt.single': function () { mallet(330, 0, 0.13, 0.25, 0.45); },
    'back.drop': function () { tone(523, 0, { gain: 0.1, attack: 0.006, decay: 0.2, to: 392, glide: 0.12, lp: 1400 }); air(0, { f: 1200, q: 2, gain: 0.03, decay: 0.012 }); },
    'back.hush': function () { air(0, { f: 1400, to: 350, q: 0.9, gain: 0.08, attack: 0.02, decay: 0.16 }); }
  };
  /* Loudness trims, measured offline so each sound sits at its target level. */
  var TRIM = {
    'glass.move': 3.2, 'glass.edge': 2.99, 'glass.select': 0.95, 'glass.back': 1.15, 'glass.launch': 0.98, 'glass.home': 0.85,
    'felt.move': 2.82, 'felt.edge': 1.26, 'felt.select': 0.78, 'felt.back': 0.8, 'felt.launch': 0.86, 'felt.home': 0.6,
    'air.move': 6.1, 'air.edge': 7.24, 'air.select': 2.51, 'air.back': 2.02, 'air.launch': 2.24, 'air.home': 0.57,
    'felt.move.soft': 1.82, 'felt.move.low': 1.86, 'felt.move.deep': 1.8, 'felt.select.low': 0.8, 'launch.bloom': 1.38, 'launch.step': 0.85, 'launch.breath': 4.47, 'launch.hush': 1.8, 'back.felt.low': 0.83, 'back.felt.single': 2.66, 'back.drop': 3.59, 'back.hush': 6.76
  };
  var PALETTES = {};
  ['glass', 'felt', 'air'].forEach(function (p) { PALETTES[p] = {}; CUES.forEach(function (c) { PALETTES[p][c] = p + '.' + c; }); });
  PALETTES.mix = { move: 'felt.move.soft', edge: 'felt.edge', select: 'felt.select.low', back: 'felt.back', launch: 'launch.bloom', home: 'air.home' };

  function sound(id) {
    if (!LIB[id] || !init()) return false;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      bus = ctx.createGain(); bus.gain.value = TRIM[id] || 1; bus.connect(master);
      busWet = ctx.createGain(); busWet.gain.value = TRIM[id] || 1; busWet.connect(wet);
      LIB[id](); return true;
    } catch (e) { return false; }
  }
  function play(name) {
    var p = PALETTES[palette], now = Date.now();
    if (palette === 'off' || !p || !p[name]) return false;
    if (last[name] && now - last[name] < GAP[name]) return false;
    last[name] = now;
    return sound(p[name]);
  }
  function configure(p, l) {
    if (p === 'off' || PALETTES[p]) palette = p;
    if (LEVELS[l]) level = l;
    if (master) master.gain.value = LEVELS[level];
  }
  function mix(map) { CUES.forEach(function (c) { if (map && LIB[map[c]]) PALETTES.mix[c] = map[c]; }); }
  function suspend() { try { if (ctx && ctx.state === 'running' && ctx.suspend) ctx.suspend(); } catch (e) {} }

  window.FrameSound = { play: play, sound: sound, configure: configure, mix: mix, suspend: suspend, sounds: Object.keys(LIB), trim: TRIM, palettes: ['glass', 'felt', 'air'], levels: ['soft', 'normal', 'bold'] };
}());

// Musik ambient generatif (WebAudio, tanpa file): pad pelan + nada jarang, nuansa ikut depo.
// Kebayoran = hangat & lembut (A minor, lowpass rendah). Kapuk = jernih & dingin (D mayor, lebih terang + delay).
const THEMES = {
  kebayoran: { root: 220, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 15], [-4, 3, 10], [-2, 5, 12], [-5, 2, 9]], wave: 'sine', cutoff: 900, delay: 0.55, fb: 0.42, mood: 'hangat' },
  kapuk: { root: 293.66, scale: [0, 2, 4, 7, 9], chords: [[0, 7, 16], [-3, 4, 12], [-5, 2, 11], [-7, 0, 9]], wave: 'triangle', cutoff: 2200, delay: 0.38, fb: 0.5, mood: 'jernih' },
};
const hz = (root, semis) => root * Math.pow(2, semis / 12);

let ctx = null, master = null, bus = null, timer = null, on = false, vol = 0.5, depot = 'kebayoran', step = 0;
const KEY = 'sm_music';
const saved = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
vol = saved().vol ?? 0.5;

function build(theme) {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = theme.cutoff; lp.Q.value = 0.4;
  const dl = ctx.createDelay(2); dl.delayTime.value = theme.delay;
  const fb = ctx.createGain(); fb.gain.value = theme.fb;
  const wet = ctx.createGain(); wet.gain.value = 0.5;
  bus = ctx.createGain();
  bus.connect(lp); lp.connect(master);
  lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(master);
}

function tone(freq, t, dur, peak, type) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.value = freq; o.detune.value = (Math.random() - 0.5) * 8;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + dur * 0.4);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.1);
}

function tick() {
  if (!on || !ctx) return;
  const th = THEMES[depot];
  const t = ctx.currentTime + 0.05;
  const chord = th.chords[step % th.chords.length];
  chord.forEach((s, i) => tone(hz(th.root, s - 12), t + i * 0.25, 9, 0.05, th.wave));
  if (Math.random() < 0.7) {
    const n = th.scale[Math.floor(Math.random() * th.scale.length)] + (Math.random() < 0.5 ? 12 : 24);
    tone(hz(th.root, n), t + 1.5 + Math.random() * 3, 5, 0.03, 'sine');
  }
  step++;
}

export const music = {
  get: () => ({ on, vol }),
  async start(d) {
    depot = THEMES[d] ? d : 'kebayoran';
    if (on) return;
    build(THEMES[depot]);
    await ctx.resume();
    on = true; step = 0;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(vol, ctx.currentTime + 3);
    tick(); timer = setInterval(tick, 6500);
    localStorage.setItem(KEY, JSON.stringify({ vol }));
  },
  stop() {
    if (!on) return;
    on = false; clearInterval(timer);
    const m = master; const c = ctx;
    m.gain.cancelScheduledValues(c.currentTime);
    m.gain.setValueAtTime(m.gain.value, c.currentTime);
    m.gain.linearRampToValueAtTime(0, c.currentTime + 1.2);
    setTimeout(() => { try { m.disconnect(); } catch { /* sudah lepas */ } }, 1500);
  },
  setVol(v) {
    vol = v; localStorage.setItem(KEY, JSON.stringify({ vol }));
    if (on && master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.2);
  },
};

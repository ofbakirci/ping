/* PING — audio.js
 * Every sound is synthesized with the Web Audio API. No audio files.
 * The delay tails are the only "music" (§9). Volumes are modest by design:
 * the ping plays hundreds of times and must never annoy.
 */
window.AUDIO = (function () {
  'use strict';

  let ctx = null;
  let master = null, delay = null, feedback = null, wetLP = null;
  const MASTER = 0.9;

  // Initialise on the first user gesture (browser autoplay policy / iOS unlock).
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(ctx.destination);

    // Feedback delay: a submarine-in-a-cathedral tail, lowpassed on the wet path.
    delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.28;
    feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    wetLP = ctx.createBiquadFilter();
    wetLP.type = 'lowpass';
    wetLP.frequency.value = 1200;
    delay.connect(wetLP);
    wetLP.connect(feedback);
    feedback.connect(delay);   // the regenerating loop
    wetLP.connect(master);     // wet out

    if (ctx.state === 'suspended') ctx.resume();
  }

  // A sine voice with an exponential gain envelope; optionally fed to the delay.
  function voice(type, f0, f1, glide, peak, attack, release, start, wet) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, start);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, start + glide);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + release);
    osc.connect(g);
    g.connect(master);
    if (wet) g.connect(delay);
    osc.start(start);
    osc.stop(start + release + 0.05);
    return osc;
  }

  // Ping: sine 440 → 180Hz over 0.5s, with the delay tail.
  function ping() {
    if (!ctx) return;
    voice('sine', 440, 180, 0.5, 0.2, 0.012, 0.5, ctx.currentTime, true);
  }

  // Drifter revealed: a faint detuned-saw blip, 80ms, low-passed. Subliminal dread.
  function drifter() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.06, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    lp.connect(g); g.connect(master);
    for (let i = 0; i < 2; i++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 220 * (i ? 1.013 : 1);   // slight detune
      o.connect(lp);
      o.start(now); o.stop(now + 0.09);
    }
  }

  // Death: silence cuts in for 400ms, then a single 55Hz thud + noise transient.
  function death() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const thud = now + 0.4;
    // cut all sound (incl. delay tails) to silence, then restore for the thud
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.setValueAtTime(0.0001, thud);
    master.gain.linearRampToValueAtTime(MASTER, thud + 0.01);

    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(55, thud);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, thud);
    g.gain.exponentialRampToValueAtTime(0.6, thud + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, thud + 0.4);
    osc.connect(g); g.connect(master);
    osc.start(thud); osc.stop(thud + 0.45);

    // tiny noise-burst transient (~30ms)
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const nb = ctx.createBufferSource(); nb.buffer = buf;
    const ng = ctx.createGain(); ng.gain.value = 0.25;
    nb.connect(ng); ng.connect(master);
    nb.start(thud);
  }

  // Level complete: a perfect fifth (220 then 330Hz), long release, through the delay.
  function complete() {
    if (!ctx) return;
    const now = ctx.currentTime;
    voice('sine', 220, 220, 0, 0.18, 0.04, 1.6, now, true);
    voice('sine', 330, 330, 0, 0.16, 0.04, 1.8, now + 0.18, true);
  }

  // WebView-safe lifecycle: suspend on hide, resume on show.
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  return { init, ping, drifter, death, complete, suspend, resume };
})();

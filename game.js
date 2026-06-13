/* PING — game.js
 * Vanilla canvas + Web Audio. No frameworks, no build step.
 * Built in the order of PING_BUILD_SPEC.md §14.
 */
(function () {
  'use strict';

  // ───────────────────────── constants ─────────────────────────
  const VW = 1000, VH = 1600;            // virtual authoring space (portrait)

  const C_BG = '#0A0A0C';
  const C_FG = '#F2EDE4';
  const C_HAZARD = '#FF4444';

  // Ping
  const PING_SPEED = 620;                // units/sec
  const PING_MAX_R = 560;                // units
  const PING_COOLDOWN = 0.9;             // sec
  const TAP_MS = 180;                    // < this (and < TAP_MOVE) = a tap
  const TAP_MOVE = 12;                   // screen px

  // Reveal / fade (seconds)
  const WALL_FADE = 2.4;
  const PLAYER_BLOOM = 2.4;

  // Player
  const PLAYER_R = 7;
  const PLAYER_SPEED = 260;              // units/sec
  const PLAYER_BASE_A = 0.25;            // resting opacity
  const ACCEL_TAU = 0.16;               // velocity smoothing while steering
  const COAST_TAU = 0.10;               // ~0.3s coast to stop on release
  const APPROACH_K = 6;                 // taper speed within ~43u of target

  const DEV = /(?:\?|&)dev(?:&|=|$)/.test(location.search);

  // ───────────────────────── math helpers ─────────────────────────
  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  // ease-out cubic fade from `a` down to 0 over progress p (0..1)
  const fadeCubic = (a, p) => { const q = 1 - clamp01(p); return a * q * q * q; };

  // ───────────────────────── DOM ─────────────────────────
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d', { alpha: false });
  const elHud = document.getElementById('hud');
  const elFps = document.getElementById('fps');

  // ───────────────────────── viewport / letterbox ─────────────────────────
  // S = CSS px per virtual unit; offX/offY = letterbox offset in CSS px; dpr backing scale.
  let S = 1, offX = 0, offY = 0, dpr = 1;

  function resize() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    S = Math.min(cssW / VW, cssH / VH);   // uniform scale, fit
    offX = (cssW - VW * S) / 2;
    offY = (cssH - VH * S) / 2;
  }

  // pointer (CSS px) -> virtual units
  const toVX = (cx) => (cx - offX) / S;
  const toVY = (cy) => (cy - offY) / S;

  // ───────────────────────── state ─────────────────────────
  const STATE = { TITLE: 'title', ENTER: 'enter', PLAY: 'play', DIE: 'die', COMPLETE: 'complete' };
  let state = STATE.PLAY;                 // stage 1 boots straight into play; title arrives in stage 8
  let levelIndex = 0;
  let level = null;
  let curMaxR = PING_MAX_R;               // per-level ping radius (HUSH halves it)
  let t = 0;                              // game clock (seconds)
  let paused = false;

  const player = { x: VW / 2, y: VH / 2, vx: 0, vy: 0, lastPingT: -999, bloomT: -999, alive: true };

  // ───────────────────────── input ─────────────────────────
  const ptr = { down: false, id: -1, startX: 0, startY: 0, curX: 0, curY: 0, startT: 0, moved: false, holding: false };

  function onDown(e) {
    if (state !== STATE.PLAY) return;
    ptr.down = true;
    ptr.id = e.pointerId;
    ptr.startX = ptr.curX = e.clientX;
    ptr.startY = ptr.curY = e.clientY;
    ptr.startT = t;
    ptr.moved = false;
    ptr.holding = false;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onMove(e) {
    if (!ptr.down || e.pointerId !== ptr.id) return;
    ptr.curX = e.clientX;
    ptr.curY = e.clientY;
    const dx = ptr.curX - ptr.startX, dy = ptr.curY - ptr.startY;
    if (dx * dx + dy * dy > TAP_MOVE * TAP_MOVE) ptr.moved = true;
  }

  function onUp(e) {
    if (!ptr.down || e.pointerId !== ptr.id) return;
    const dt = t - ptr.startT;
    const wasTap = !ptr.holding && !ptr.moved && dt < TAP_MS / 1000;
    if (wasTap) tryPing();
    ptr.down = false;
    ptr.id = -1;
    ptr.holding = false;
    ptr.moved = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  // tap → ping (filled in stage 2; here it only records cadence)
  function tryPing() {
    if (t - player.lastPingT < PING_COOLDOWN) return;
    player.lastPingT = t;
    player.bloomT = t;
    // stage 2: spawn wavefront + audio + haptics
  }

  // ───────────────────────── player movement ─────────────────────────
  function updatePlayer(dt) {
    // Holding begins once the press exceeds tap thresholds.
    if (ptr.down && (ptr.moved || (t - ptr.startT) > TAP_MS / 1000)) ptr.holding = true;

    let dvx = 0, dvy = 0;
    if (ptr.holding) {
      const tx = toVX(ptr.curX), ty = toVY(ptr.curY);
      const ex = tx - player.x, ey = ty - player.y;
      const dist = Math.hypot(ex, ey);
      if (dist > 0.001) {
        const speed = Math.min(PLAYER_SPEED, dist * APPROACH_K); // ease near target
        dvx = ex / dist * speed;
        dvy = ey / dist * speed;
      }
    }
    // Smooth velocity toward desired (steering-through-water inertia).
    const tau = ptr.holding ? ACCEL_TAU : COAST_TAU;
    const k = 1 - Math.exp(-dt / tau);
    player.vx += (dvx - player.vx) * k;
    player.vy += (dvy - player.vy) * k;
    if (!ptr.holding && Math.hypot(player.vx, player.vy) < 1.5) { player.vx = 0; player.vy = 0; }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // stage 3: wall collision goes here
  }

  // ───────────────────────── level loading ─────────────────────────
  function loadLevel(i) {
    levelIndex = i;
    level = window.LEVELS[i];
    curMaxR = level.pingRadius || PING_MAX_R;
    player.x = level.start[0];
    player.y = level.start[1];
    player.vx = player.vy = 0;
    player.lastPingT = -999;
    player.bloomT = -999;
    player.alive = true;
    ptr.down = false; ptr.holding = false; ptr.moved = false;
    if (elHud) { elHud.textContent = level.name; elHud.hidden = false; }
    // stage 2/4/5: reset walls/drifters/exit/pings reveal state
  }

  // ───────────────────────── update ─────────────────────────
  function update(dt) {
    if (state === STATE.PLAY) {
      updatePlayer(dt);
    }
  }

  // ───────────────────────── render ─────────────────────────
  function setWorld() {
    ctx.setTransform(S * dpr, 0, 0, S * dpr, offX * dpr, offY * dpr);
  }

  function drawPlayer() {
    // Bloom: full opacity after a ping, decaying back to base over 2.4s.
    const bloom = fadeCubic(1, (t - player.bloomT) / PLAYER_BLOOM);
    let a = PLAYER_BASE_A + (1 - PLAYER_BASE_A) * bloom;
    if (!player.alive) a = 0;
    if (a <= 0.001) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = C_FG;
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawDevGeometry() {
    if (!DEV || !level) return;
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = C_FG;
    ctx.lineWidth = 2 / S;
    ctx.beginPath();
    for (const w of level.walls) { ctx.moveTo(w[0], w[1]); ctx.lineTo(w[2], w[3]); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function render() {
    // clear (identity transform, device px)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    setWorld();
    drawDevGeometry();
    drawPlayer();
  }

  // ───────────────────────── main loop ─────────────────────────
  let last = 0;
  let fpsAccum = 0, fpsFrames = 0, fpsShown = 0;

  function frame(ts) {
    requestAnimationFrame(frame);
    const now = ts / 1000;
    if (paused) { last = now; return; }
    let dt = now - last;
    last = now;
    if (dt > 0.05) dt = 0.05;             // clamp after stalls / tab switches
    if (dt < 0) dt = 0;
    t += dt;

    update(dt);
    render();

    if (DEV) {
      fpsAccum += dt; fpsFrames++;
      if (fpsAccum >= 0.5) {
        fpsShown = Math.round(fpsFrames / fpsAccum);
        fpsAccum = 0; fpsFrames = 0;
        elFps.textContent = fpsShown + ' fps';
      }
    }
  }

  // ───────────────────────── lifecycle ─────────────────────────
  function onVisibility() {
    if (document.hidden) {
      paused = true;
      if (window.AUDIO) window.AUDIO.suspend();
    } else {
      paused = false;
      if (window.AUDIO) window.AUDIO.resume();
    }
  }

  function init() {
    resize();
    if (DEV) elFps.hidden = false;

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    // belt-and-braces: kill context menu / gestures the CSS doesn't catch
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    loadLevel(0);
    requestAnimationFrame(frame);
  }

  init();
})();

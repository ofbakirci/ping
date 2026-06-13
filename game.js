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

  // shortest distance from point (px,py) to segment (x1,y1)-(x2,y2)
  function distToSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let tt = len2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
    tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
    const cx = x1 + tt * dx, cy = y1 + tt * dy;
    return Math.hypot(px - cx, py - cy);
  }

  // Portion of segment lying within radius r of (cx,cy). Writes [ax,ay,bx,by]
  // into `out` and returns true, or returns false if no part is inside.
  function clipSegToCircle(x1, y1, x2, y2, cx, cy, r, out) {
    const dx = x2 - x1, dy = y2 - y1;
    const a = dx * dx + dy * dy;
    if (a < 1e-9) {                                   // degenerate (point)
      if ((x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy) <= r * r) {
        out[0] = x1; out[1] = y1; out[2] = x2; out[3] = y2; return true;
      }
      return false;
    }
    const fx = x1 - cx, fy = y1 - cy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return false;                       // segment line misses circle
    const sq = Math.sqrt(disc);
    let lo = (-b - sq) / (2 * a), hi = (-b + sq) / (2 * a);
    if (lo < 0) lo = 0;
    if (hi > 1) hi = 1;
    if (lo > hi) return false;                         // inside-interval is off the segment
    out[0] = x1 + dx * lo; out[1] = y1 + dy * lo;
    out[2] = x1 + dx * hi; out[3] = y1 + dy * hi;
    return true;
  }

  // haptics — never throw where the API is missing (iOS Safari)
  function buzz(p) { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (_) {} } }

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

  // Ping wavefronts. Pooled — lifetime (~0.9s) ≈ cooldown, so very few are ever live.
  const pings = [];
  for (let i = 0; i < 4; i++) pings.push({ x: 0, y: 0, birth: 0, maxR: PING_MAX_R, id: 0, active: false });
  let pingSeq = 0;

  // Runtime walls: each carries its own reveal state (set on first contact per ping).
  // { x1,y1,x2,y2, litT, litPing, oX,oY,oBirth,oMaxR }  — no per-frame allocations.
  let walls = [];
  const _clip = [0, 0, 0, 0];   // scratch for clipSegToCircle, reused every draw

  // ───────────────────────── input ─────────────────────────
  const ptr = { down: false, id: -1, startX: 0, startY: 0, curX: 0, curY: 0, startT: 0, moved: false, holding: false };

  function onDown(e) {
    window.AUDIO.init();                 // unlock AudioContext on first gesture
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

  // tap → ping. During cooldown the void does not acknowledge you: nothing happens.
  function tryPing() {
    if (t - player.lastPingT < PING_COOLDOWN) return;
    player.lastPingT = t;
    player.bloomT = t;
    spawnPing(player.x, player.y, curMaxR);
    window.AUDIO.ping();
    buzz(8);
  }

  function spawnPing(x, y, maxR) {
    let p = pings.find((q) => !q.active) || pings[0];
    p.x = x; p.y = y; p.birth = t; p.maxR = maxR; p.id = ++pingSeq; p.active = true;
  }

  // Expand wavefronts and reveal surfaces on first contact (per ping).
  function updatePings() {
    for (const p of pings) {
      if (!p.active) continue;
      const r = (t - p.birth) * PING_SPEED;
      // walls
      for (const w of walls) {
        if (w.litPing === p.id) continue;                 // already revealed by this ping
        const d = distToSeg(p.x, p.y, w.x1, w.y1, w.x2, w.y2);
        if (d <= p.maxR && r >= d) {
          w.litT = t; w.litPing = p.id;
          w.oX = p.x; w.oY = p.y; w.oBirth = p.birth; w.oMaxR = p.maxR;
        }
      }
      // stage 4/5: drifters + exit contact
      if (r >= p.maxR) p.active = false;                  // ring dies at max radius
    }
  }

  // ───────────────────────── collision ─────────────────────────
  // Resolve a moving circle {x,y,vx,vy} of radius `rad` against all wall
  // segments: push out of penetration and slide (drop the into-wall velocity
  // component). A few passes settle concave corners without jitter.
  function collide(o, rad) {
    for (let pass = 0; pass < 3; pass++) {
      let hit = false;
      for (const w of walls) {
        const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
        const len2 = dx * dx + dy * dy;
        let tt = len2 > 0 ? ((o.x - w.x1) * dx + (o.y - w.y1) * dy) / len2 : 0;
        tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
        const cx = w.x1 + tt * dx, cy = w.y1 + tt * dy;
        let nx = o.x - cx, ny = o.y - cy;
        let d = Math.hypot(nx, ny);
        if (d >= rad) continue;
        if (d > 1e-6) { nx /= d; ny /= d; }
        else {                                   // dead-centre on the line: use its normal
          const L = Math.sqrt(len2) || 1;
          nx = -dy / L; ny = dx / L;
          if (o.vx * nx + o.vy * ny > 0) { nx = -nx; ny = -ny; }
        }
        o.x += nx * (rad - d);                    // depenetrate
        o.y += ny * (rad - d);
        const vn = o.vx * nx + o.vy * ny;         // slide: kill inward velocity only
        if (vn < 0) { o.vx -= vn * nx; o.vy -= vn * ny; }
        hit = true;
      }
      if (!hit) break;
    }
    // Hard safety: never sail off the playfield into the void.
    o.x = clamp(o.x, rad, VW - rad);
    o.y = clamp(o.y, rad, VH - rad);
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
    collide(player, PLAYER_R);
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

    walls = level.walls.map((w) => ({
      x1: w[0], y1: w[1], x2: w[2], y2: w[3],
      litT: -1, litPing: -1, oX: 0, oY: 0, oBirth: 0, oMaxR: 0
    }));
    for (const p of pings) p.active = false;
    // stage 4/5: reset drifters / exit reveal state
  }

  // ───────────────────────── update ─────────────────────────
  function update(dt) {
    if (state === STATE.PLAY) {
      updatePlayer(dt);
      updatePings();
    }
  }

  // ───────────────────────── render ─────────────────────────
  function setWorld() {
    ctx.setTransform(S * dpr, 0, 0, S * dpr, offX * dpr, offY * dpr);
  }

  function drawWall(w) {
    if (w.litT < 0) return;
    const p = (t - w.litT) / WALL_FADE;
    if (p >= 1) return;
    // Sweep clip: only the portion the ring has already passed (and within range),
    // frozen at max radius once the ring dies — keeps walls from popping ahead of it.
    const rNow = Math.min((t - w.oBirth) * PING_SPEED, w.oMaxR);
    if (!clipSegToCircle(w.x1, w.y1, w.x2, w.y2, w.oX, w.oY, rNow, _clip)) return;
    // glow pass (6px, faint) then the line (2px). No shadowBlur — layered strokes only.
    ctx.lineCap = 'round';
    ctx.strokeStyle = C_FG;
    ctx.globalAlpha = fadeCubic(0.08, p);
    ctx.lineWidth = 6 / S;
    ctx.beginPath(); ctx.moveTo(_clip[0], _clip[1]); ctx.lineTo(_clip[2], _clip[3]); ctx.stroke();
    ctx.globalAlpha = fadeCubic(0.85, p);
    ctx.lineWidth = 2 / S;
    ctx.beginPath(); ctx.moveTo(_clip[0], _clip[1]); ctx.lineTo(_clip[2], _clip[3]); ctx.stroke();
  }

  function drawWalls() {
    for (const w of walls) drawWall(w);
    ctx.globalAlpha = 1;
  }

  function drawPings() {
    ctx.strokeStyle = C_FG;
    ctx.lineWidth = 1.5 / S;
    for (const p of pings) {
      if (!p.active) continue;
      const r = (t - p.birth) * PING_SPEED;
      if (r <= 0 || r > p.maxR) continue;
      ctx.globalAlpha = 0.9 * (1 - r / p.maxR);          // 0.9 at birth → 0 at max radius
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    // Bloom: blooms to full after a ping, decaying back to base over 2.4s.
    const bloom = fadeCubic(1, (t - player.bloomT) / PLAYER_BLOOM);
    // Cooldown indicator: the resting glow dims slightly while you can't ping.
    const onCooldown = (t - player.lastPingT) < PING_COOLDOWN;
    const base = PLAYER_BASE_A * (onCooldown ? 0.85 : 1);
    let a = base + (1 - PLAYER_BASE_A) * bloom;
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
    drawWalls();
    drawPings();
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

  if (DEV) {
    window.PING_DEBUG = {
      ping: () => tryPing(),
      pingAt: (x, y) => { player.x = x; player.y = y; player.lastPingT = -999; tryPing(); },
      load: (i) => loadLevel(i),
      // Manual stepper — drives the sim under rAF throttling (headless/background tab).
      step: (dt, n) => { n = n || 1; for (let k = 0; k < n; k++) { t += dt; update(dt); } render(); },
      setHold: (on, x, y) => { ptr.down = !!on; ptr.holding = !!on; if (on) { ptr.curX = x; ptr.curY = y; ptr.startT = t - 1; } },
      get: () => ({ player, pings, walls }),
      state: () => ({
        t, state, level: level && level.name,
        activePings: pings.filter((p) => p.active).length,
        litWalls: walls.filter((w) => w.litT >= 0 && (t - w.litT) < WALL_FADE).length,
        totalWalls: walls.length,
        player: { x: Math.round(player.x), y: Math.round(player.y) }
      })
    };
  }

  init();
})();

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

  // Drifters
  const DRIFTER_R = 14;
  const DRIFTER_FADE = 1.2;             // red flash fade (a glimpse, not a study)
  const DRIFTER_PATROL = 40;            // units/sec idle patrol
  const DRIFTER_HUNT = 120;             // units/sec toward the echo
  const DRIFTER_HUNT_TIME = 3;          // seconds it hunts where you were

  // Exit
  const EXIT_R = 22;
  const EXIT_FADE = 5;                  // stays visible 5s (wants to be found)
  const EXIT_PULSE = 1.2;              // sine pulse period

  // Flow timings (seconds)
  const ENTER_CHAR = 0.07;             // per-character type-in of the level name
  const ENTER_HOLD = 0.7;
  const ENTER_FADE = 0.5;
  const DIE_TIME = 1.0;                // level restarts 1s after death
  const CW_WASH = 0.8;                 // completion: the great ping washes outward
  const CW_HOLD = 1.5;                 // ...holds the fully-revealed level
  const CW_FADE = 1.0;                 // ...then fades to black
  const WASH_R = 2000;                 // covers the whole field from any exit point
  const STORE_KEY = 'ping.v1';         // versioned save key (§14)

  // Title-screen atmospheric ping: a slow wavefront on a 6s loop, revealing nothing.
  const TITLE_PERIOD = 6;
  const TITLE_LIFE = 3.6;
  const TITLE_R = 950;

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
  const elBanner = document.getElementById('banner');
  const elTitle = document.getElementById('title');
  const elLevels = document.getElementById('levels');

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
  let state = STATE.PLAY;
  let stateStart = 0;                     // game-clock time the current state began
  let levelIndex = 0;
  let level = null;
  let curMaxR = PING_MAX_R;               // per-level ping radius (HUSH halves it)
  let t = 0;                              // game clock (seconds)
  let paused = false;
  let unlocked = 1;                       // number of unlocked levels (persisted)
  let titleBirth = 0;                     // birth time of the current title-screen ping

  function setState(s) { state = s; stateStart = t; }

  // ───────────────────────── progression (localStorage) ─────────────────────────
  function loadUnlocked() {
    try {
      const v = parseInt(localStorage.getItem(STORE_KEY), 10);
      unlocked = (v >= 1 && v <= 99) ? v : 1;
    } catch (_) { unlocked = 1; }
  }
  function saveUnlocked() {
    try { localStorage.setItem(STORE_KEY, String(unlocked)); } catch (_) {}
  }

  const player = { x: VW / 2, y: VH / 2, vx: 0, vy: 0, lastPingT: -999, bloomT: -999, alive: true };

  // Ping wavefronts. Pooled — lifetime (~0.9s) ≈ cooldown, so very few are ever live.
  const pings = [];
  for (let i = 0; i < 4; i++) pings.push({ x: 0, y: 0, birth: 0, maxR: PING_MAX_R, id: 0, active: false });
  let pingSeq = 0;

  // Runtime walls: each carries its own reveal state (set on first contact per ping).
  // { x1,y1,x2,y2, litT, litPing, oX,oY,oBirth,oMaxR }  — no per-frame allocations.
  let walls = [];
  const _clip = [0, 0, 0, 0];   // scratch for clipSegToCircle, reused every draw

  // Runtime drifters: { x,y,vx,vy, path, wp, huntUntil, huntX,huntY, litT, litPing }
  let drifters = [];
  let exit = null;              // { x, y, litT, litPing }

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
      // drifters: flash + provoke on first contact (within range)
      for (const dr of drifters) {
        if (dr.litPing === p.id) continue;
        const near = Math.hypot(p.x - dr.x, p.y - dr.y) - DRIFTER_R;
        if (near <= p.maxR && r >= near) {
          dr.litT = t; dr.litPing = p.id;
          dr.huntUntil = t + DRIFTER_HUNT_TIME;          // hunt where you were
          dr.huntX = p.x; dr.huntY = p.y;
          window.AUDIO.drifter();
        }
      }
      // exit: reveal (or re-reveal) on contact — it stays lit 5s, pulsing
      if (exit && exit.litPing !== p.id) {
        const near = Math.hypot(p.x - exit.x, p.y - exit.y) - EXIT_R;
        if (near <= p.maxR && r >= near) { exit.litT = t; exit.litPing = p.id; }
      }
      if (r >= p.maxR) p.active = false;                  // ring dies at max radius
    }
  }

  // Drifters: patrol at 40 u/s; when provoked, hunt the ping's origin at 120 u/s
  // for 3s, then return to patrol. They respect walls (slide via depenetration).
  function updateDrifters(dt) {
    for (const dr of drifters) {
      let tx, ty, speed;
      if (t < dr.huntUntil) {
        tx = dr.huntX; ty = dr.huntY; speed = DRIFTER_HUNT;
      } else {
        if (Math.hypot(dr.path[dr.wp][0] - dr.x, dr.path[dr.wp][1] - dr.y) < 10) {
          dr.wp = (dr.wp + 1) % dr.path.length;
        }
        tx = dr.path[dr.wp][0]; ty = dr.path[dr.wp][1]; speed = DRIFTER_PATROL;
      }
      const ex = tx - dr.x, ey = ty - dr.y, d = Math.hypot(ex, ey);
      if (d > 1e-4) {
        const step = Math.min(speed * dt, d);
        dr.x += ex / d * step; dr.y += ey / d * step;
      }
      collide(dr, DRIFTER_R);
    }
  }

  // Contact with a drifter is death.
  function checkDeath() {
    if (!player.alive) return;
    const rr = (PLAYER_R + DRIFTER_R) * (PLAYER_R + DRIFTER_R);
    for (const dr of drifters) {
      const dx = dr.x - player.x, dy = dr.y - player.y;
      if (dx * dx + dy * dy < rr) { triggerDeath(); return; }
    }
  }

  function checkExit() {
    if (!player.alive || !exit) return;
    const dx = exit.x - player.x, dy = exit.y - player.y;
    const rr = PLAYER_R + EXIT_R;
    if (dx * dx + dy * dy < rr * rr) triggerComplete();
  }

  // ───────────────────────── flow / state transitions ─────────────────────────
  // Death: the dot extinguishes, sound cuts to silence then a single low thud,
  // and the level restarts after 1s. No flash, no GAME OVER. The dark takes you.
  function triggerDeath() {
    if (state !== STATE.PLAY) return;
    player.alive = false;
    setState(STATE.DIE);
    window.AUDIO.death();
    buzz(40);
  }

  // Level complete: unlock the next, then play the great-ping wash.
  function triggerComplete() {
    if (state !== STATE.PLAY) return;
    unlocked = Math.max(unlocked, Math.min(window.LEVELS.length, levelIndex + 2));
    saveUnlocked();
    setState(STATE.COMPLETE);
    window.AUDIO.complete();
    buzz([20, 60, 20]);
  }

  function startEnter(i) {
    loadLevel(i);
    player.alive = true;
    setState(STATE.ENTER);
  }

  function nextLevel() {
    const n = levelIndex + 1;
    if (n < window.LEVELS.length) startEnter(n);
    else goTitle();
  }

  function setBanner(text, alpha) {
    if (!elBanner) return;
    elBanner.textContent = text;
    elBanner.style.opacity = alpha;
  }

  // ENTER: type the level name onto the void, hold, fade, then play.
  function updateEnter() {
    const name = level.name;
    const e = t - stateStart;
    const typeEnd = name.length * ENTER_CHAR;
    if (e < typeEnd + ENTER_HOLD) {
      const chars = Math.min(name.length, Math.floor(e / ENTER_CHAR) + 1);
      setBanner(name.slice(0, chars), 1);
    } else if (e < typeEnd + ENTER_HOLD + ENTER_FADE) {
      setBanner(name, 1 - (e - typeEnd - ENTER_HOLD) / ENTER_FADE);
    } else {
      setBanner('', 0);
      setState(STATE.PLAY);
    }
  }

  function updateDie() {
    if (t - stateStart >= DIE_TIME) {
      loadLevel(levelIndex);
      player.alive = true;
      setState(STATE.PLAY);
    }
  }

  function updateComplete() {
    if (t - stateStart >= CW_WASH + CW_HOLD + CW_FADE) nextLevel();
  }

  // ───────────────────────── title screen + level select ─────────────────────────
  function goTitle() {
    setState(STATE.TITLE);
    if (elHud) elHud.hidden = true;
    setBanner('', 0);
    buildLevelList();
    if (elTitle) elTitle.hidden = false;
    titleBirth = t;
  }

  function buildLevelList() {
    if (!elLevels) return;
    elLevels.textContent = '';
    for (let i = 0; i < window.LEVELS.length; i++) {
      const li = document.createElement('li');
      li.textContent = window.LEVELS[i].name;
      if (i >= unlocked) {
        li.classList.add('locked');                 // 20% opacity, not selectable
      } else {
        li.addEventListener('click', () => selectLevel(i));
      }
      elLevels.appendChild(li);
    }
  }

  function selectLevel(i) {
    if (state !== STATE.TITLE) return;
    window.AUDIO.init();                             // unlock audio on this gesture
    if (elTitle) elTitle.hidden = true;
    startEnter(i);
  }

  // Slow wavefront across the void on a 6s loop — pure atmosphere.
  function updateTitle() {
    if (t - titleBirth >= TITLE_PERIOD) titleBirth = t;
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
    drifters = (level.drifters || []).map((d) => ({
      x: d.path[0][0], y: d.path[0][1], vx: 0, vy: 0,
      path: d.path, wp: 0, huntUntil: -1, huntX: 0, huntY: 0, litT: -1, litPing: -1
    }));
    exit = { x: level.exit[0], y: level.exit[1], litT: -1, litPing: -1 };
    for (const p of pings) p.active = false;
  }

  // ───────────────────────── update ─────────────────────────
  function update(dt) {
    if (state === STATE.PLAY) {
      updatePlayer(dt);
      updateDrifters(dt);
      updatePings();
      checkDeath();
      checkExit();
    } else if (state === STATE.ENTER) {
      updateEnter();
    } else if (state === STATE.DIE) {
      updateDie();
    } else if (state === STATE.COMPLETE) {
      updateComplete();
    } else if (state === STATE.TITLE) {
      updateTitle(dt);
    }
  }

  // ───────────────────────── render ─────────────────────────
  function setWorld() {
    ctx.setTransform(S * dpr, 0, 0, S * dpr, offX * dpr, offY * dpr);
  }

  // A revealed line: 6px faint glow pass + 2px line. No shadowBlur — layered strokes.
  function strokeRevealed(ax, ay, bx, by, a) {
    ctx.strokeStyle = C_FG; ctx.lineCap = 'round';
    ctx.globalAlpha = a * (0.08 / 0.85); ctx.lineWidth = 6 / S;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.globalAlpha = a; ctx.lineWidth = 2 / S;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }

  function strokeRing(cx, cy, r, a) {
    ctx.strokeStyle = C_FG; ctx.lineCap = 'round';
    ctx.globalAlpha = a * 0.2; ctx.lineWidth = 6 / S;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a; ctx.lineWidth = 2 / S;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  function drawWall(w) {
    if (w.litT < 0) return;
    const p = (t - w.litT) / WALL_FADE;
    if (p >= 1) return;
    // Sweep clip: only the portion the ring has already passed (and within range),
    // frozen at max radius once the ring dies — keeps walls from popping ahead of it.
    const rNow = Math.min((t - w.oBirth) * PING_SPEED, w.oMaxR);
    if (!clipSegToCircle(w.x1, w.y1, w.x2, w.y2, w.oX, w.oY, rNow, _clip)) return;
    strokeRevealed(_clip[0], _clip[1], _clip[2], _clip[3], fadeCubic(0.85, p));
  }

  function drawWalls() {
    for (const w of walls) drawWall(w);
    ctx.globalAlpha = 1;
  }

  function drawExit() {
    if (!exit || exit.litT < 0) return;
    const age = t - exit.litT;
    if (age >= EXIT_FADE) return;
    let a = 0.7 + 0.2 * Math.sin(2 * Math.PI * age / EXIT_PULSE);   // 50%..90% pulse
    if (age > EXIT_FADE - 0.8) a *= (EXIT_FADE - age) / 0.8;        // gentle tail-out
    strokeRing(exit.x, exit.y, EXIT_R, a);
    ctx.globalAlpha = 1;
  }

  // The signature reward: a great ping from the exit washes the whole level
  // visible in cream, holds, then fades to black.
  function renderComplete() {
    const e = t - stateStart;
    let washR, wallA, ringA = 0;
    if (e < CW_WASH) {
      const x = e / CW_WASH, eo = 1 - (1 - x) * (1 - x) * (1 - x);  // ease-out
      washR = WASH_R * eo; wallA = 0.95; ringA = 0.9 * (1 - x);
    } else if (e < CW_WASH + CW_HOLD) {
      washR = WASH_R; wallA = 0.95;
    } else {
      washR = WASH_R; wallA = 0.95 * (1 - (e - CW_WASH - CW_HOLD) / CW_FADE);
    }
    for (const w of walls) {
      if (clipSegToCircle(w.x1, w.y1, w.x2, w.y2, exit.x, exit.y, washR, _clip)) {
        strokeRevealed(_clip[0], _clip[1], _clip[2], _clip[3], wallA);
      }
    }
    const ea = 0.7 + 0.2 * Math.sin(2 * Math.PI * e / EXIT_PULSE);
    strokeRing(exit.x, exit.y, EXIT_R, ea * (wallA / 0.95));
    if (ringA > 0) strokeRing(exit.x, exit.y, washR, ringA);
    ctx.globalAlpha = 0.6 * (wallA / 0.95);                         // where you were
    ctx.fillStyle = C_FG;
    ctx.beginPath(); ctx.arc(player.x, player.y, PLAYER_R, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawDrifters() {
    for (const dr of drifters) {
      if (dr.litT < 0) continue;
      const p = (t - dr.litT) / DRIFTER_FADE;
      if (p >= 1) continue;
      const a = fadeCubic(0.9, p);
      ctx.fillStyle = C_HAZARD;
      ctx.globalAlpha = a * 0.16;                          // faint glow disc
      ctx.beginPath(); ctx.arc(dr.x, dr.y, DRIFTER_R * 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;                                 // body
      ctx.beginPath(); ctx.arc(dr.x, dr.y, DRIFTER_R, 0, Math.PI * 2); ctx.fill();
    }
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
    for (const w of walls) { ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); }
    ctx.stroke();
    if (exit) {
      ctx.beginPath(); ctx.arc(exit.x, exit.y, EXIT_R, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = C_HAZARD;
    for (const dr of drifters) {
      ctx.beginPath(); ctx.arc(dr.x, dr.y, DRIFTER_R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    // clear (identity transform, device px)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    setWorld();
    drawDevGeometry();
    if (state === STATE.TITLE) {
      drawTitlePing();
    } else if (state === STATE.COMPLETE) {
      renderComplete();
    } else {
      drawWalls();
      drawExit();
      drawDrifters();
      drawPings();
      drawPlayer();
    }
  }

  function drawTitlePing() {
    const age = t - titleBirth;
    if (age > TITLE_LIFE) return;
    const x = age / TITLE_LIFE;
    const r = TITLE_R * x;
    if (r <= 1) return;
    ctx.strokeStyle = C_FG;
    ctx.lineWidth = 1.5 / S;
    ctx.globalAlpha = 0.45 * (1 - x);
    ctx.beginPath();
    ctx.arc(VW / 2, VH / 2, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
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
    // Lock the screen down completely: no context menu, pinch-zoom, double-tap
    // zoom, scroll or pull-to-refresh — the void owns the whole surface.
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    loadUnlocked();
    goTitle();
    requestAnimationFrame(frame);

    // PWA: register the service worker over http(s) only (file:// can't, and
    // attempting it there would throw). Failures are non-fatal.
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    }
  }

  if (DEV) {
    window.PING_DEBUG = {
      ping: () => tryPing(),
      pingAt: (x, y) => { player.x = x; player.y = y; player.lastPingT = -999; tryPing(); },
      load: (i) => loadLevel(i),
      enter: (i) => startEnter(i),
      play: () => setState(STATE.PLAY),
      complete: () => triggerComplete(),
      die: () => triggerDeath(),
      teleport: (x, y) => { player.x = x; player.y = y; },
      revealAll: () => {
        for (const w of walls) { w.litT = t; w.litPing = -99; w.oX = w.x1; w.oY = w.y1; w.oBirth = t - 10; w.oMaxR = 4000; }
        if (exit) { exit.litT = t; exit.litPing = -99; }
        render();
      },
      // Manual stepper — drives the sim under rAF throttling (headless/background tab).
      step: (dt, n) => { n = n || 1; for (let k = 0; k < n; k++) { t += dt; update(dt); } render(); },
      setHold: (on, x, y) => { ptr.down = !!on; ptr.holding = !!on; if (on) { ptr.curX = x; ptr.curY = y; ptr.startT = t - 1; } },
      get: () => ({ player, pings, walls, drifters, exit }),
      state: () => ({
        t, state, unlocked, levelIndex, level: level && level.name,
        activePings: pings.filter((p) => p.active).length,
        litWalls: walls.filter((w) => w.litT >= 0 && (t - w.litT) < WALL_FADE).length,
        totalWalls: walls.length,
        player: { x: Math.round(player.x), y: Math.round(player.y) },
        drifters: drifters.map((dr) => ({
          x: Math.round(dr.x), y: Math.round(dr.y),
          hunting: t < dr.huntUntil, lit: dr.litT >= 0 && (t - dr.litT) < DRIFTER_FADE
        }))
      })
    };
  }

  init();
})();

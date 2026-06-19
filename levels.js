/* PING — level data.
 * Virtual authoring space: 1000 x 1600 units (portrait).
 * walls: [x1,y1,x2,y2] line segments. drifters: { path: [[x,y],...] } looping patrol.
 * Difficulty comes from architecture and placement only — never speed or timers.
 * (Corridor/spiral wall lists were generated with tools/gen_levels.js.)
 */
window.LEVELS = [
  {
    // 1. BREATH — no hazards. A Z corridor with two turns. Teaches: ping, look, move.
    name: 'BREATH',
    start: [250, 1450],
    exit: [750, 185],
    walls: [
      [140, 1490, 360, 1490], [360, 1490, 360, 1160], [360, 1160, 860, 1160],
      [860, 1160, 860, 110], [860, 110, 640, 110], [640, 110, 640, 940],
      [640, 940, 140, 940], [140, 940, 140, 1490]
    ],
    drifters: []
  },

  {
    // 2. DOORS — no hazards. A wall with three gaps; only the left leads on.
    // Teaches: pings are a budget of attention.
    name: 'DOORS',
    start: [500, 1450],
    exit: [230, 210],
    walls: [
      [40, 80, 960, 80], [960, 80, 960, 1560], [960, 1560, 40, 1560], [40, 1560, 40, 80],
      // divider with three gaps: [180,280] (open), [460,560], [720,820]
      [40, 1000, 180, 1000], [280, 1000, 460, 1000], [560, 1000, 720, 1000], [820, 1000, 960, 1000],
      // middle gap -> sealed pocket (dead end)
      [460, 1000, 460, 620], [560, 1000, 560, 620], [460, 620, 560, 620],
      // right gap -> sealed pocket (dead end)
      [720, 1000, 720, 620], [820, 1000, 820, 620], [720, 620, 820, 620]
    ],
    drifters: []
  },

  {
    // 3. FIRST — one drifter patrolling far from the route. Teaches: red means fear.
    name: 'FIRST',
    start: [180, 1420],
    exit: [180, 220],
    walls: [
      [60, 100, 940, 100], [940, 100, 940, 1500], [940, 1500, 60, 1500], [60, 1500, 60, 100],
      [700, 300, 700, 1300],          // walls off the drifter's chamber (open top & bottom)
      [60, 820, 420, 820]             // baffle: a small detour toward the middle
    ],
    drifters: [
      { path: [[820, 1200], [820, 400]] }
    ]
  },

  {
    // 4. BAIT — one drifter plugs the only gap. You must ping, lure it off the echo,
    // and slip through. Teaches the core risk economy. (Requires the echo-hunt.)
    name: 'BAIT',
    start: [180, 1350],
    exit: [840, 700],
    walls: [
      [40, 80, 960, 80], [960, 80, 960, 1560], [960, 1560, 40, 1560], [40, 1560, 40, 80],
      [560, 80, 560, 785], [560, 815, 560, 1560]    // wall with a 30u gap at y[785,815]
    ],
    drifters: [
      { path: [[550, 799], [550, 801]] }            // sits in the gap, plugging it
    ]
  },

  {
    // 5. TEETH — narrow zigzag corridor, one drifter patrolling inside it.
    name: 'TEETH',
    start: [150, 1440],
    exit: [850, 270],
    walls: [
      [225, 1480, 225, 1255], [225, 1255, 925, 1255], [925, 1255, 925, 805], [925, 805, 225, 805],
      [225, 805, 225, 655], [225, 655, 925, 655], [925, 655, 925, 220], [75, 1480, 75, 1105],
      [75, 1105, 775, 1105], [775, 1105, 775, 955], [775, 955, 75, 955], [75, 955, 75, 505],
      [75, 505, 775, 505], [775, 505, 775, 220], [225, 1480, 75, 1480], [925, 220, 775, 220]
    ],
    drifters: [
      { path: [[150, 1180], [850, 1180], [850, 880], [150, 880]] }
    ]
  },

  {
    // 6. CHOIR — open room, three drifters, sparse walls. Pure positioning.
    name: 'CHOIR',
    start: [500, 1400],
    exit: [500, 250],
    walls: [
      [60, 100, 940, 100], [940, 100, 940, 1500], [940, 1500, 60, 1500], [60, 1500, 60, 100],
      [300, 520, 300, 760], [700, 840, 700, 1080], [400, 1150, 600, 1150]
    ],
    drifters: [
      { path: [[250, 1100], [250, 450]] },
      { path: [[750, 1100], [750, 450]] },
      { path: [[330, 800], [670, 800]] }
    ]
  },

  {
    // 7. THROAT — long inward spiral toward a near-center exit; a drifter patrols the lane.
    name: 'THROAT',
    start: [150, 1380],
    exit: [450, 780],
    walls: [
      [210, 1430, 210, 190], [210, 190, 810, 190], [810, 190, 810, 1220], [810, 1220, 360, 1220],
      [360, 1220, 360, 340], [360, 340, 660, 340], [660, 340, 660, 1070], [660, 1070, 510, 1070],
      [510, 1070, 510, 430], [90, 1430, 90, 70], [90, 70, 930, 70], [930, 70, 930, 1340],
      [930, 1340, 240, 1340], [240, 1340, 240, 220], [240, 220, 780, 220], [780, 220, 780, 1190],
      [780, 1190, 390, 1190], [390, 1190, 390, 430], [210, 1430, 90, 1430], [510, 430, 390, 430]
    ],
    drifters: [
      // Patrols the open spiral lane (inset from both wall rings so collision
      // never jams it in a corner). Lane runs ~x[300,750], ~y[290,1280].
      { path: [[300, 1280], [750, 1280], [750, 290], [450, 290], [450, 740]] }
    ]
  },

  {
    // 8. LIARS — one exit. You rise up a central spine toward a grand, wide chamber
    // at the top that SCREAMS "exit" — open, symmetric, inviting. It is sealed: a dead
    // end. The true exit is a humble side gap two-thirds of the way up, easy to ping
    // straight past on your way to the lie. Cruelty through architecture, not mechanics.
    name: 'LIARS',
    start: [500, 1430],
    exit: [820, 560],
    walls: [
      [60, 100, 940, 100], [940, 100, 940, 1500], [940, 1500, 60, 1500], [60, 1500, 60, 100],

      // Central rising spine (the obvious path up). Left wall solid; right wall solid
      // EXCEPT a thin gap at y[700,760] — the only true way out.
      [380, 1380, 380, 460], [620, 1380, 620, 760], [620, 700, 620, 460],

      // The GRAND LIE: a wide bright chamber crowning the top of the spine. Symmetric,
      // beckoning — and sealed. Its only mouth is the spine you climbed; there is no
      // way out of it. The eye is drawn straight here.
      [380, 460, 180, 460], [180, 460, 180, 240], [180, 240, 820, 240],
      [820, 240, 820, 460], [820, 460, 620, 460],

      // The humble TRUTH: a cramped dogleg reached through the gap at y[700,760].
      // Slip right through the gap into a low corridor (y[700,760], x[620,900]); the
      // corridor's ceiling has a second opening at x[760,900] that climbs into the
      // pocket holding the real exit [820,560]. Two humble gaps, easily ping-skipped.
      // Corridor floor:
      [620, 760, 900, 760],
      // Corridor ceiling with a gap at x[760,900] (open up into the pocket):
      [620, 700, 760, 700],
      // Pocket walls: far-right, top cap, and left divider down to the ceiling gap.
      [900, 760, 900, 460], [900, 460, 740, 460], [740, 460, 740, 700]
    ],
    drifters: []
  },

  {
    // 9. SWARM — five drifters, generous space. Ping discipline under pressure.
    name: 'SWARM',
    start: [500, 1430],
    exit: [500, 180],
    walls: [
      [60, 100, 940, 100], [940, 100, 940, 1500], [940, 1500, 60, 1500], [60, 1500, 60, 100],
      [60, 1050, 320, 1050], [680, 520, 940, 520], [430, 820, 570, 820]
    ],
    drifters: [
      { path: [[200, 1250], [200, 560]] },
      { path: [[800, 1250], [800, 580]] },
      { path: [[330, 950], [670, 950]] },
      { path: [[330, 380], [670, 380]] },
      { path: [[450, 680], [600, 680]] }
    ]
  },

  {
    // 10. HUSH — the finale. Long corridor, four drifters, and the ping radius is halved.
    // You see less. You remember more.
    name: 'HUSH',
    start: [150, 1450],
    exit: [850, 160],
    pingRadius: 280,
    walls: [
      [235, 1500, 235, 1335], [235, 1335, 935, 1335], [935, 1335, 935, 915], [935, 915, 235, 915],
      [235, 915, 235, 835], [235, 835, 935, 835], [935, 835, 935, 415], [935, 415, 235, 415],
      [235, 415, 235, 335], [235, 335, 935, 335], [935, 335, 935, 120], [65, 1500, 65, 1165],
      [65, 1165, 765, 1165], [765, 1165, 765, 1085], [765, 1085, 65, 1085], [65, 1085, 65, 665],
      [65, 665, 765, 665], [765, 665, 765, 585], [765, 585, 65, 585], [65, 585, 65, 165],
      [65, 165, 765, 165], [765, 165, 765, 120], [235, 1500, 65, 1500], [935, 120, 765, 120]
    ],
    drifters: [
      { path: [[150, 1250], [850, 1250]] },
      { path: [[850, 1000], [150, 1000]] },
      { path: [[150, 750], [850, 750]] },
      { path: [[850, 500], [150, 500]] }
    ]
  }
];

/* ───────────────────────── procedural levels ─────────────────────────
 * The ten above are hand-authored. Past them, PING keeps going forever: levels are
 * generated on demand in the same grammar (clean orthogonal corridors, real routes,
 * guaranteed solvable) with procedural one-word names. The player never sees a seam —
 * the level column just continues. Difficulty climbs through architecture, drifter
 * count and a tightening ping budget; never through speed or timers (there is no clock).
 *
 * Determinism: level N always generates identically (seeded PRNG), so a player's
 * progress and a shared "I reached LEVEL 38" mean the same level every time.
 */
(function () {
  'use strict';
  var VW = 1000, VH = 1600, PLAYER_R = 7, DRIFTER_R = 14;
  var AUTHORED = window.LEVELS.length;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function distToSeg(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    var t = l2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }
  function clearance(x, y, walls) {
    var m = 1e9;
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      var d = distToSeg(x, y, w[0], w[1], w[2], w[3]);
      if (d < m) m = d;
    }
    return m;
  }
  // Grid BFS: can the player walk start -> exit? (same model as tools/validate.js)
  function solvable(level) {
    var G = 12, cols = Math.ceil(VW / G), rows = Math.ceil(VH / G);
    var free = new Uint8Array(cols * rows);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      free[r * cols + c] = clearance(c * G + G / 2, r * G + G / 2, level.walls) >= PLAYER_R ? 1 : 0;
    }
    function nf(c0, r0) {
      if (c0 >= 0 && c0 < cols && r0 >= 0 && r0 < rows && free[r0 * cols + c0]) return [c0, r0];
      for (var rad = 1; rad < 10; rad++) for (var dr = -rad; dr <= rad; dr++) for (var dc = -rad; dc <= rad; dc++) {
        var c = c0 + dc, rr = r0 + dr;
        if (c >= 0 && c < cols && rr >= 0 && rr < rows && free[rr * cols + c]) return [c, rr];
      }
      return null;
    }
    var s = nf(Math.floor(level.start[0] / G), Math.floor(level.start[1] / G));
    var e = nf(Math.floor(level.exit[0] / G), Math.floor(level.exit[1] / G));
    if (!s || !e) return false;
    var q = [s[1] * cols + s[0]], seen = new Uint8Array(cols * rows);
    seen[q[0]] = 1; var tgt = e[1] * cols + e[0];
    while (q.length) {
      var cur = q.pop(); if (cur === tgt) return true;
      var cc = cur % cols, rr2 = (cur - cc) / cols;
      var nb = [[cc + 1, rr2], [cc - 1, rr2], [cc, rr2 + 1], [cc, rr2 - 1]];
      for (var k = 0; k < 4; k++) {
        var nc = nb[k][0], nr = nb[k][1];
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        var idx = nr * cols + nc;
        if (free[idx] && !seen[idx]) { seen[idx] = 1; q.push(idx); }
      }
    }
    return false;
  }

  // Carve a spanning maze (recursive backtracker) and render unconnected cell edges
  // as wall segments. A spanning maze is connected by construction → always solvable;
  // a few random extra openings add the multi-route feel of the authored levels.
  function carve(seed) {
    var rnd = mulberry32(seed);
    var GW = 4 + Math.floor(rnd() * 3);        // 4..6 columns
    var GH = 6 + Math.floor(rnd() * 4);        // 6..9 rows
    var M = 70;
    var cw = (VW - 2 * M) / GW, ch = (VH - 2 * M) / GH;
    var cellX = function (c) { return M + c * cw; };
    var cellY = function (r) { return M + r * ch; };
    var idx = function (c, r) { return r * GW + c; };
    var visited = new Uint8Array(GW * GH);
    var wallS = [], wallE = [];
    for (var r = 0; r < GH; r++) { wallS.push(new Uint8Array(GW).fill(1)); wallE.push(new Uint8Array(GW).fill(1)); }
    var stack = [[0, GH - 1]]; visited[idx(0, GH - 1)] = 1;
    while (stack.length) {
      var cell = stack[stack.length - 1], c = cell[0], rr = cell[1];
      var nbrs = [];
      if (rr > 0 && !visited[idx(c, rr - 1)]) nbrs.push([c, rr - 1, 'N']);
      if (rr < GH - 1 && !visited[idx(c, rr + 1)]) nbrs.push([c, rr + 1, 'S']);
      if (c > 0 && !visited[idx(c - 1, rr)]) nbrs.push([c - 1, rr, 'W']);
      if (c < GW - 1 && !visited[idx(c + 1, rr)]) nbrs.push([c + 1, rr, 'E']);
      if (!nbrs.length) { stack.pop(); continue; }
      var pick = nbrs[Math.floor(rnd() * nbrs.length)], nc = pick[0], nr = pick[1], dir = pick[2];
      if (dir === 'N') wallS[rr - 1][c] = 0;
      if (dir === 'S') wallS[rr][c] = 0;
      if (dir === 'E') wallE[rr][c] = 0;
      if (dir === 'W') wallE[rr][nc] = 0;
      visited[idx(nc, nr)] = 1; stack.push([nc, nr]);
    }
    var extra = Math.floor(rnd() * 3);
    for (var x2 = 0; x2 < extra; x2++) {
      var ec = Math.floor(rnd() * GW), er = Math.floor(rnd() * GH);
      if (rnd() < 0.5 && er < GH - 1) wallS[er][ec] = 0; else if (ec < GW - 1) wallE[er][ec] = 0;
    }
    var walls = [[M, M, VW - M, M], [VW - M, M, VW - M, VH - M], [VW - M, VH - M, M, VH - M], [M, VH - M, M, M]];
    for (var rr3 = 0; rr3 < GH; rr3++) for (var c3 = 0; c3 < GW; c3++) {
      if (wallS[rr3][c3] && rr3 < GH - 1) walls.push([cellX(c3), cellY(rr3 + 1), cellX(c3 + 1), cellY(rr3 + 1)]);
      if (wallE[rr3][c3] && c3 < GW - 1) walls.push([cellX(c3 + 1), cellY(rr3), cellX(c3 + 1), cellY(rr3 + 1)]);
    }
    // Degree of each cell = how many of its 4 edges are open. A cell with degree <= 1
    // is a dead-end stub: the worst place to strand a drifter (you have to enter the
    // pocket to reveal it, and there's no room to dodge). build() avoids these.
    function degree(c, r) {
      var d = 0;
      if (r > 0 && !wallS[r - 1][c]) d++;             // north edge open
      if (r < GH - 1 && !wallS[r][c]) d++;            // south edge open
      if (c > 0 && !wallE[r][c - 1]) d++;             // west edge open
      if (c < GW - 1 && !wallE[r][c]) d++;            // east edge open
      return d;
    }
    return {
      GW: GW, GH: GH, cw: cw, ch: ch, walls: walls, cellX: cellX, cellY: cellY,
      degree: degree,
      start: [cellX(0) + cw / 2, cellY(GH - 1) + ch / 2],
      exit: [cellX(GW - 1) + cw / 2, cellY(0) + ch / 2]
    };
  }

  var SYL_A = ['AB','BR','CR','DR','FR','GR','HA','KE','LO','MA','NE','OR','PE','QU','SE','TH','VE','WR','ZE','SH','CL','SL','TR','VR'];
  var SYL_B = ['AKE','ASH','ELL','ORE','INE','OON','ULL','ASP','ICE','OLD','USK','ARN','EEP','OWL','IRE','UMB','END','ALT','OSS','URN','EAL','IGHT','AUNT','OAM'];
  function genName(rnd) {
    return (SYL_A[Math.floor(rnd() * SYL_A.length)] + SYL_B[Math.floor(rnd() * SYL_B.length)]).toUpperCase();
  }

  // Build the n-th procedural level (n = 0 means the first level after the authored set).
  function build(n) {
    for (var attempt = 0; attempt < 14; attempt++) {
      var seed = ((n + 1) * 2654435761 ^ (attempt * 40503)) >>> 0;
      var rnd = mulberry32(seed);
      var L = carve(seed);
      var diff = n;
      var nDrift = Math.min(6, 1 + Math.floor(diff / 2));
      var cells = [];
      for (var r = 0; r < L.GH; r++) for (var c = 0; c < L.GW; c++) cells.push([c, r]);
      for (var i = cells.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var tmp = cells[i]; cells[i] = cells[j]; cells[j] = tmp; }
      var exitC = L.GW - 1, exitR = 0;                 // exit always sits top-right
      var drifters = [];
      for (var k = 0; k < cells.length && drifters.length < nDrift; k++) {
        var cc = cells[k][0], rr = cells[k][1];
        var x = L.cellX(cc) + L.cw / 2, y = L.cellY(rr) + L.ch / 2;
        if (clearance(x, y, L.walls) < DRIFTER_R + 4) continue;
        if (Math.hypot(x - L.start[0], y - L.start[1]) < 200) continue;   // never crowd the spawn
        if (L.degree(cc, rr) <= 1) continue;          // no dead-end stubs — nowhere to dodge
        // Keep clear of the exit: not the exit cell, not an orthogonal neighbour of it.
        var manhExit = Math.abs(cc - exitC) + Math.abs(rr - exitR);
        if (manhExit <= 1) continue;
        if (Math.hypot(x - L.exit[0], y - L.exit[1]) < 200) continue;     // doorstep guard (distance)
        var p2 = [x, y];
        var adj = [[cc, rr - 1], [cc, rr + 1], [cc - 1, rr], [cc + 1, rr]];
        for (var a = 0; a < adj.length; a++) {
          var ac = adj[a][0], ar = adj[a][1];
          if (ac < 0 || ac >= L.GW || ar < 0 || ar >= L.GH) continue;
          var nx = L.cellX(ac) + L.cw / 2, ny = L.cellY(ar) + L.ch / 2;
          if (clearance(nx, ny, L.walls) >= DRIFTER_R + 4 && clearance((x + nx) / 2, (y + ny) / 2, L.walls) >= DRIFTER_R) { p2 = [nx, ny]; break; }
        }
        drifters.push({ path: [[x, y], p2] });
      }
      var lvl = { name: genName(rnd), start: L.start, exit: L.exit, walls: L.walls, drifters: drifters, procedural: true };
      // Tightening ping budget — unlimited at first, then scarce. The dot dims as you spend it.
      var budget = diff < 3 ? 0 : Math.max(6, 16 - Math.floor(diff / 2));
      if (budget > 0) lvl.pingBudget = budget;
      // Occasional half-light level past the deep end (echoes HUSH).
      if (diff >= 8 && (n % 3 === 2)) lvl.pingRadius = Math.round(280 + rnd() * 120);
      if (solvable(lvl)) return lvl;
    }
    return null;   // (statistically never happens; caller falls back gracefully)
  }

  // Cache so a level isn't regenerated every title-screen build or replay.
  var cache = {};
  // Public accessor: getLevel(globalIndex) — authored for index < AUTHORED, else procedural.
  window.AUTHORED_COUNT = AUTHORED;
  window.getLevel = function (i) {
    if (i < AUTHORED) return window.LEVELS[i];
    var n = i - AUTHORED;
    if (!cache[n]) cache[n] = build(n) || window.LEVELS[AUTHORED - 1];
    return cache[n];
  };
  window.getLevelName = function (i) {
    return window.getLevel(i).name;
  };
})();

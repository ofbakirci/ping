/* PING level validator — headless solvability + clearance checks.
 * Grid BFS over the 1000x1600 space, treating a cell blocked if any wall
 * segment passes within PLAYER_R of its center. Confirms start can reach exit,
 * and (optionally) that a "decoy" point is a genuine dead end.
 * Usage: node tools/validate.js            (validates window.LEVELS in levels.js)
 *        node tools/validate.js <file.js>  (validates LEVELS in another file)
 */
'use strict';
const fs = require('fs');

const VW = 1000, VH = 1600, PLAYER_R = 7, DRIFTER_R = 14;

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function clearance(x, y, walls) {
  let m = 1e9;
  for (const w of walls) m = Math.min(m, distToSeg(x, y, w[0], w[1], w[2], w[3]));
  return m;
}

// Grid BFS. cell = G units. A cell is free if its center clears every wall by >= PLAYER_R.
function reachable(level, G) {
  G = G || 12;
  const cols = Math.ceil(VW / G), rows = Math.ceil(VH / G);
  const free = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * G + G / 2, y = r * G + G / 2;
    free[r * cols + c] = clearance(x, y, level.walls) >= PLAYER_R ? 1 : 0;
  }
  const cellOf = (x, y) => [Math.min(cols - 1, Math.max(0, Math.floor(x / G))),
                            Math.min(rows - 1, Math.max(0, Math.floor(y / G)))];
  const [sc, sr] = cellOf(level.start[0], level.start[1]);
  const [ec, er] = cellOf(level.exit[0], level.exit[1]);
  // Snap start/exit to nearest free cell if they sit just inside a wall's radius.
  function nearestFree(c0, r0) {
    if (free[r0 * cols + c0]) return [c0, r0];
    for (let rad = 1; rad < 8; rad++)
      for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
        const c = c0 + dc, r = r0 + dr;
        if (c >= 0 && c < cols && r >= 0 && r < rows && free[r * cols + c]) return [c, r];
      }
    return null;
  }
  const s = nearestFree(sc, sr), e = nearestFree(ec, er);
  if (!s || !e) return { ok: false, reason: !s ? 'start blocked' : 'exit blocked', free, cols, rows, G };
  const q = [s[1] * cols + s[0]];
  const seen = new Uint8Array(cols * rows);
  seen[q[0]] = 1;
  const tgt = e[1] * cols + e[0];
  let found = false;
  while (q.length) {
    const cur = q.pop();
    if (cur === tgt) { found = true; break; }
    const c = cur % cols, r = (cur - c) / cols;
    const nb = [[c+1,r],[c-1,r],[c,r+1],[c,r-1]];
    for (const [nc, nr] of nb) {
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const idx = nr * cols + nc;
      if (free[idx] && !seen[idx]) { seen[idx] = 1; q.push(idx); }
    }
  }
  return { ok: found, reason: found ? '' : 'no path start->exit', seen, free, cols, rows, G };
}

module.exports = { reachable, clearance, distToSeg, VW, VH, PLAYER_R, DRIFTER_R };

// Check one level for solvability + drifter clearance. Returns problems found.
function checkLevel(lv, tag, verbose) {
  let fails = 0;
  const res = reachable(lv);
  if (!res.ok) { console.log(`  x ${tag}: ${res.reason}`); fails++; }
  else if (verbose) console.log(`  ok ${tag}: solvable`);
  (lv.drifters || []).forEach((d, j) => d.path.forEach((p, k) => {
    const cl = clearance(p[0], p[1], lv.walls);
    if (cl < DRIFTER_R) { console.log(`    ! ${tag} drifter${j} wp${k} [${p}] clearance ${cl.toFixed(1)} < ${DRIFTER_R}`); fails++; }
  }));
  return fails;
}

if (require.main === module) {
  // Args: [file.js] [--proc N]. --proc sweeps the first N procedural levels too
  // (uses window.getLevel from the IIFE) and prints a difficulty summary at samples.
  const argv = process.argv.slice(2);
  const procIdx = argv.indexOf('--proc');
  const procN = procIdx >= 0 ? parseInt(argv[procIdx + 1], 10) || 500 : 0;
  const file = argv.find((a, i) => a !== '--proc' && argv[i - 1] !== '--proc') || 'levels.js';
  const code = fs.readFileSync(file, 'utf8');
  const win = {};
  new Function('window', code)(win);
  const L = win.LEVELS;
  let fails = 0;
  L.forEach((lv, i) => { fails += checkLevel(lv, `L${i + 1} ${lv.name}`, true); });
  console.log(fails ? `\n${fails} problem(s) in authored levels.` : `\nAll ${L.length} authored levels valid.`);

  if (procN > 0 && typeof win.getLevel === 'function') {
    const AUTH = win.AUTHORED_COUNT || L.length;
    console.log(`\nSweeping procedural levels ${AUTH + 1}..${AUTH + procN} (global)…`);
    let pfails = 0;
    const samples = new Set([1, Math.round(procN / 4), Math.round(procN / 2), Math.round(3 * procN / 4), procN]);
    for (let g = AUTH; g < AUTH + procN; g++) {
      const lv = win.getLevel(g);
      if (!lv) { console.log(`  x L${g + 1}: build returned null`); pfails++; continue; }
      pfails += checkLevel(lv, `L${g + 1} ${lv.name}`, false);
      if (samples.has(g - AUTH + 1)) {
        console.log(`  L${g + 1} ${lv.name}: walls=${lv.walls.length} drifters=${(lv.drifters || []).length}` +
          ` budget=${lv.pingBudget || '∞'} radius=${lv.pingRadius || 560}`);
      }
    }
    console.log(pfails ? `\n${pfails} problem(s) across ${procN} procedural levels.`
                       : `\nAll ${procN} procedural levels solvable, drifters clear.`);
    fails += pfails;
  }
  process.exit(fails ? 1 : 0);
}

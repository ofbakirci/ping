/* One-off authoring helper (NOT shipped). Generates tube-corridor wall segment
 * lists from a centreline polyline + half-width, using mitred offsets so corners
 * are clean with no gaps. Run: node tools/gen_levels.js
 */
function norm(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
function cross(ax, ay, bx, by) { return ax * by - ay * bx; }

function intersect(px, py, dx, dy, qx, qy, ex, ey) {
  const den = cross(dx, dy, ex, ey);
  if (Math.abs(den) < 1e-6) return [px, py];        // parallel → fall back
  const t = cross(qx - px, qy - py, ex, ey) / den;
  return [px + dx * t, py + dy * t];
}

function offsetVertex(prev, cur, next, h, side) {
  if (!prev) { const [dx, dy] = norm(cur[0], cur[1], next[0], next[1]); return [cur[0] - dy * side * h, cur[1] + dx * side * h]; }
  if (!next) { const [dx, dy] = norm(prev[0], prev[1], cur[0], cur[1]); return [cur[0] - dy * side * h, cur[1] + dx * side * h]; }
  const [d1x, d1y] = norm(prev[0], prev[1], cur[0], cur[1]);
  const [d2x, d2y] = norm(cur[0], cur[1], next[0], next[1]);
  const p1x = cur[0] - d1y * side * h, p1y = cur[1] + d1x * side * h;
  const p2x = cur[0] - d2y * side * h, p2y = cur[1] + d2x * side * h;
  return intersect(p1x, p1y, d1x, d1y, p2x, p2y, d2x, d2y);
}

function bank(c, h, side) {
  const out = [];
  for (let i = 0; i < c.length; i++) out.push(offsetVertex(c[i - 1], c[i], c[i + 1], h, side));
  return out;
}

function tube(c, h) {
  const L = bank(c, h, +1), R = bank(c, h, -1);
  const walls = [];
  const r = (n) => Math.round(n);
  for (let i = 0; i < L.length - 1; i++) walls.push([r(L[i][0]), r(L[i][1]), r(L[i + 1][0]), r(L[i + 1][1])]);
  for (let i = 0; i < R.length - 1; i++) walls.push([r(R[i][0]), r(R[i][1]), r(R[i + 1][0]), r(R[i + 1][1])]);
  walls.push([r(L[0][0]), r(L[0][1]), r(R[0][0]), r(R[0][1])]);                          // start cap
  walls.push([r(L[L.length - 1][0]), r(L[L.length - 1][1]), r(R[R.length - 1][0]), r(R[R.length - 1][1])]); // end cap
  return walls;
}

// Inward square-spiral centreline (involute of a rectangle): uniform lane spacing.
function spiral(sx, sy, vLen, hLen, step, minLeg) {
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // up, right, down, left (clockwise)
  const pts = [[sx, sy]];
  let x = sx, y = sy, di = 0, leg = 0;
  while (true) {
    const len = (di % 2 === 0 ? vLen : hLen) - step * Math.floor(leg / 2);
    if (len < minLeg) break;
    x += dirs[di][0] * len; y += dirs[di][1] * len;
    pts.push([Math.round(x), Math.round(y)]);
    di = (di + 1) % 4; leg++;
  }
  return pts;
}

const TEETH = [[150, 1480], [150, 1180], [850, 1180], [850, 880], [150, 880], [150, 580], [850, 580], [850, 220]];
const THROAT = spiral(150, 1430, 1300, 720, 150, 220);
const HUSH = [[150, 1500], [150, 1250], [850, 1250], [850, 1000], [150, 1000], [150, 750], [850, 750], [850, 500], [150, 500], [150, 250], [850, 250], [850, 120]];

function emit(name, c, h) { console.log(name + ' = ' + JSON.stringify(tube(c, h))); }
emit('TEETH', TEETH, 75);
emit('THROAT', THROAT, 60);
emit('HUSH', HUSH, 85);

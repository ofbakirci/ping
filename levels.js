/* PING — level data.
 * Virtual authoring space: 1000 x 1600 units (portrait).
 * walls: [x1,y1,x2,y2] line segments. drifters: { path: [[x,y],...] } looping patrol.
 * Difficulty comes from architecture and placement only — never speed or timers.
 */
window.LEVELS = [
  {
    // 1. BREATH — no hazards. A Z corridor with two turns. Teaches: ping, look, move.
    name: 'BREATH',
    start: [250, 1450],
    exit: [750, 185],
    walls: [
      [140, 1490, 360, 1490],
      [360, 1490, 360, 1160],
      [360, 1160, 860, 1160],
      [860, 1160, 860, 110],
      [860, 110, 640, 110],
      [640, 110, 640, 940],
      [640, 940, 140, 940],
      [140, 940, 140, 1490]
    ],
    drifters: []
  }
];

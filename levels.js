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
      { path: [[810, 1220], [360, 1220], [360, 340], [660, 340]] }
    ]
  },

  {
    // 8. LIARS — one exit. A grand central chamber feels like the way out; it is a dead
    // end. The real exit is a side gap low in the corridor. Cruelty through architecture.
    name: 'LIARS',
    start: [500, 1430],
    exit: [870, 1190],
    walls: [
      [60, 100, 940, 100], [940, 100, 940, 1500], [940, 1500, 60, 1500], [60, 1500, 60, 100],
      [60, 300, 400, 300], [600, 300, 940, 300],       // grand top chamber floor (corridor mouth open)
      [400, 300, 400, 1500],                           // corridor left wall
      [600, 300, 600, 1150], [600, 1230, 600, 1500],   // corridor right wall, humble gap y[1150,1230]
      [600, 1150, 940, 1150], [600, 1230, 940, 1230]   // side passage to the true exit
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
      { path: [[200, 1250], [200, 520]] },
      { path: [[800, 1250], [800, 520]] },
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

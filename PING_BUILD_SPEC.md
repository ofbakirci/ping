# PING — Build Specification

You are building **PING**, a minimalist sonar-navigation game for mobile and desktop browsers. This document is the brief, the design bible, and the acceptance test. Where it is specific, follow it exactly. Where it is silent, choose the most restrained option available. Restraint is the aesthetic. When in doubt, do less, but do it perfectly.

**One-sentence pitch:** a game you play by remembering what you just saw.

---

## 1. Non-negotiables

- **Vanilla stack.** Plain HTML + CSS + JavaScript. HTML5 Canvas for rendering. Web Audio API for sound. **No frameworks, no libraries, no build step, no npm.** The deliverable is a folder that works when you open `index.html`, and deploys to any static host by drag-and-drop.
- **Zero assets.** No images, no audio files, no font files. Everything is drawn with code and synthesized with code. System monospace font stack only: `ui-monospace, 'SF Mono', 'Cascadia Mono', 'Roboto Mono', Menlo, monospace`.
- **File structure:** `index.html`, `style.css`, `game.js`, `levels.js`, `audio.js`, plus a deployment shell: `manifest.json` and `sw.js` (see §14). Seven files. If you feel the urge to add an eighth, resist it.
- **60fps on a mid-range phone.** `requestAnimationFrame` loop, delta-time based movement (never frame-count based), `devicePixelRatio`-aware canvas sizing. No per-frame allocations in the hot loop — reuse objects and arrays.
- **Works identically with touch and mouse.** Use Pointer Events (`pointerdown/move/up`), not separate touch/mouse handlers.

---

## 2. The world

- The screen is **black**: `#0A0A0C`. Not a texture, not a gradient. Black.
- The level is invisible geometry: walls (line segments), one exit, hazards, and the player.
- Nothing is visible until light touches it. Light comes from exactly one source: the player's ping.

### Coordinate system
Levels are authored in a virtual space of **1000 × 1600 units (portrait)**. At runtime, fit this into the viewport with letterboxing — uniform scale, centered. On wide/desktop screens the playfield sits centered with black on both sides (invisible letterboxing — the void extends naturally; do not draw borders).

---

## 3. Core mechanic — the ping

This is the entire game. Get it right before anything else exists.

1. Player taps (a press shorter than **180ms** with less than **12px** of movement = a tap).
2. A circular **wavefront** expands from the **player's position** (not the finger position) at **620 units/second**, up to a max radius of **560 units**, then dies.
3. The wavefront itself is rendered as a thin ring: 1.5px stroke, cream `#F2EDE4`, opacity easing from 0.9 at birth to 0 at max radius. The ring is the *only* thing that moves across the dark.
4. **Reveal rule:** when the wavefront crosses a wall segment, that segment (only the portion within ping range) lights up at the moment the front passes it, then fades. Fade: opacity 0.85 → 0 over **2.4 seconds**, ease-out cubic. Walls are drawn as 2px cream lines with a subtle glow (a second pass: same line at 6px width, 8% opacity — that's the entire "glow engine," do not use canvas shadowBlur, it kills mobile performance).
5. The wavefront passes through walls (it's information, not physics) but reveals each surface only on first contact per ping.
6. **Ping cooldown: 0.9 seconds.** During cooldown, nothing happens on tap — no error sound, no shake, nothing. The void doesn't acknowledge you.

### The risk economy (this is what makes it a game, not a toy)
Every ping **broadcasts your position**. Hazards within ping radius become *attracted to the point the ping originated from* for 3 seconds (see §5). The player's central tension: you cannot see without telling the dark where you are.

---

## 4. The player

- A small cream dot, radius 7 units, **always faintly visible** at 25% opacity — the one mote of light in the world. After a ping, the player dot blooms to full opacity and decays back to 25% over 2.4s (synced with wall fade).
- **Movement:** press and hold (>180ms or >12px movement) and the player drifts toward the pointer. Spring-damper feel: max speed **260 units/sec**, accelerating toward the finger, with mild inertia — it should feel like steering a thing through water, not dragging an icon. Release and the player coasts to a stop over ~0.3s.
- The player **collides with walls** — slides along them smoothly (resolve collision by projecting velocity along the wall tangent; no sticky corners, no jitter).
- Walls never kill. Hazards kill on contact (player circle vs hazard circle).

---

## 5. Hazards — "drifters"

- Dark-adapted creatures. Circles of radius 14 units. Invisible like everything else; when a wavefront crosses one, it flashes **red `#FF4444`** and fades over **1.2s** (faster than walls — a glimpse, not a study).
- **Idle behavior:** slow patrol drift along a per-hazard waypoint path (defined in level data) at 40 units/sec.
- **Provoked behavior:** when a ping's wavefront touches a drifter, it abandons patrol and moves toward the *ping's origin point* at **120 units/sec** for **3 seconds**, then returns to patrol. It hunts where you *were*. A player who pings and immediately moves is safe; a player who pings and hesitates dies.
- Drifters pass through walls? **No.** They respect walls and slide along them — otherwise spatial reasoning collapses.
- Contact with the player: death. See §8.

---

## 6. The exit

- A circle of radius 22 units. When a wavefront crosses it, it reveals as a cream **pulsing ring** (slow 1.2s sine pulse between 50% and 90% opacity) and — exception to all fade rules — **stays visible for 5 seconds** instead of 2.4. The exit is the one thing in the dark that wants to be found.
- Player touches exit → level complete.

---

## 7. Levels

`levels.js` exports an array of level objects:

```js
{
  name: "BREATH",            // one word, uppercase, evocative
  start: [x, y],
  exit: [x, y],
  walls: [ [x1,y1,x2,y2], ... ],
  drifters: [ { path: [[x,y],[x,y],...] }, ... ]  // patrol waypoints, loops
}
```

**Ship 10 levels.** Author them yourself with real care — this is level *design*, not level generation:

1. **BREATH** — no hazards. One corridor with two turns. Teaches: ping, look, move.
2. **DOORS** — no hazards. A wall with three gaps, only one leads on. Teaches: pings are a budget of attention.
3. **FIRST** — one drifter patrolling far from the route. Teaches: red means fear.
4. **BAIT** — one drifter directly between start and exit. Player must ping, sidestep, and let it hunt the echo. Teaches the core risk economy.
5. **TEETH** — narrow zigzag corridor, one drifter patrolling inside it.
6. **CHOIR** — open room, three drifters, sparse walls. Pure positioning.
7. **THROAT** — long spiral toward a center exit, drifter patrolling the spiral lane.
8. **LIARS** — two exits revealed... no. One exit, but a dead-end chamber shaped to *feel* like the way out. Cruelty through architecture, not mechanics.
9. **SWARM** — five drifters, generous space. Ping discipline under pressure.
10. **HUSH** — the finale: long level, four drifters, and the ping max radius is **halved** (level may override `pingRadius`). You see less. You remember more.

Difficulty must come from architecture and drifter placement — never from speed increases or timers. There is no clock in this game.

---

## 8. Death, completion, progression

- **Death:** instant. The screen does NOT flash. Instead: all sound cuts to silence for 400ms, the player dot extinguishes, then a single low thud (see §9), then the level restarts after 1s. Deaths are unlimited and frictionless. No lives, no score penalty, no "GAME OVER" screen. The dark simply takes you and you try again.
- **Level complete:** the exit ring expands outward like a final great ping that washes the *entire* level geometry visible in cream, holds 1.5s — the player finally sees where they were — then fades to black and the next level name types itself on screen. This reveal is the game's signature reward moment. Make it beautiful.
- **Progression:** unlocked levels stored in `localStorage`. A minimal level-select on the title screen: the ten level names in a monospace column, locked ones at 20% opacity.

---

## 9. Audio — all synthesized, Web Audio API

Create `audio.js` with an `AudioContext` initialized on first user gesture (browser autoplay policy).

- **Ping:** sine oscillator, 440Hz → 180Hz exponential pitch drop over 0.5s, with a feedback delay (delayTime 0.28s, feedback gain 0.35, lowpass at 1200Hz on the wet path) for a submarine-in-a-cathedral tail. Volume modest: this sound plays hundreds of times; it must never annoy.
- **Wall reveal:** nothing. Silence. The world doesn't speak.
- **Drifter revealed:** a faint detuned saw blip, 80ms, low-passed at 600Hz. Barely there. Subliminal dread.
- **Death:** 55Hz sine thud, 0.4s decay, with a tiny noise-burst transient.
- **Level complete:** two sine notes, a perfect fifth (220Hz then 330Hz), long release, through the same delay. Not a fanfare. A resolution.
- **No music.** The delay tails are the score.

---

## 10. UI & screens

- **Title screen:** black void. The word `PING` in monospace, cream, letter-spaced wide, centered. Below it, smaller: `tap to look. hold to move. the dark listens.` Then the level column. That's all. A single ping wavefront slowly expands and dies across the title screen on a 6s loop, revealing nothing — pure atmosphere.
- **In-game HUD:** almost nothing. Level name in the top-left at 30% opacity, 11px monospace. A ping-cooldown indicator: the player dot itself dims slightly during cooldown — that IS the indicator. No bars, no icons, no pause button (tapping does nothing the game doesn't define; backgrounding the tab auto-pauses via `visibilitychange`).
- **No tutorials, no popups, no settings menu, no sound toggle UI** (mute follows the device). Levels 1–2 *are* the tutorial.

---

## 11. Feel checklist — the difference between done and good

- Wavefront expansion must be silky. If the ring stutters, nothing else matters.
- Player movement must feel like steering, not dragging. Tune the spring until it does.
- Wall fade curves: ease-out, never linear. Linear fades look like a bug.
- Tap vs hold detection must be flawless. A tap that accidentally moves the player, or a hold that accidentally pings, breaks the game's grammar.
- Disable every default browser behavior: `touch-action: none`, no scroll, no pinch-zoom, no text selection, no long-press context menu, no pull-to-refresh. Lock it down completely.
- `viewport-fit=cover` and safe-area awareness so it owns the whole screen on notched phones.
- Re-fit the letterbox on `resize` and `orientationchange` without losing game state.
- Haptics where the platform allows: `navigator.vibrate(8)` on ping, `vibrate(40)` on death, `vibrate([20,60,20])` on level complete — behind a feature check so iOS Safari silently skips it. Never let a missing API throw.

## 12. What NOT to do

- No particles, no screen shake, no chromatic aberration, no scanlines, no CRT filters, no vignette. The aesthetic is void + light, full stop.
- No third color beyond `#0A0A0C` / `#F2EDE4` / `#FF4444`.
- No emoji, anywhere, ever.
- No score, no stars, no timers, no combos, no daily rewards. This game respects the player.
- No canvas `shadowBlur`. Fake all glows with layered strokes.

## 13. Acceptance criteria

1. Opens from `index.html` with zero console errors, no network requests.
2. Runs at 60fps on screen sizes from 360×640 to 2560×1440.
3. All 10 levels completable; level 4 (BAIT) genuinely requires using the echo-hunt mechanic.
4. Tap/hold grammar never misfires across 50 consecutive inputs.
5. Progress persists across reloads.
6. Audio works on iOS Safari (context resumed on first gesture).
7. A stranger handed a phone with level 1 open understands the game within 20 seconds, untaught.
8. Installable as a PWA; after first load it runs fully offline (airplane-mode test).

## 14. Pocket-proofing — the port path

This ships as a website today and becomes a store app later with **zero rewrite**. Make these choices now so that stays true:

- **PWA shell:** `manifest.json` (name `PING`, `background_color` and `theme_color` `#0A0A0C`, `display: fullscreen`, portrait orientation, icon = an inline SVG data-URI of a cream ring on black — still zero asset files) and `sw.js`, a dead-simple cache-first service worker with a versioned cache key that precaches all seven files. Result: installable from the browser, runs offline, full screen, no browser chrome.
- **Relative paths everywhere.** No leading-slash URLs, no CDN, no external requests of any kind. This is exactly what lets the same folder drop into a Capacitor wrapper for the App Store / Play Store later without touching a line of game code.
- **WebView-safe lifecycle:** suspend the `AudioContext` on `visibilitychange` hide, resume on show. The first-gesture audio unlock from §9 already covers iOS.
- **Versioned storage key:** `ping.v1` — so a future update can migrate saves instead of nuking them.
- **Dev mode:** a `?dev` query param reveals all level geometry at 15% opacity and overlays an FPS counter. For level authoring and testing only. Mention it nowhere in the UI.

Build it in this order: canvas + loop + player movement → ping wavefront + wall reveal → collision → drifters → exit + level flow → audio → levels 1–10 → title screen → PWA shell (§14) → polish pass against §11. Test on a real phone viewport at every stage.

Now go. The dark is waiting.

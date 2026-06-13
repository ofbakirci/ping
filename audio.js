/* PING — audio.js
 * All sound is synthesized with the Web Audio API. No audio files.
 * (Stage 6 fills in the synthesis; this stub defines the interface so the
 *  game can call it safely from any stage.)
 */
window.AUDIO = (function () {
  'use strict';
  return {
    init() {},
    ping() {},
    drifter() {},
    death() {},
    complete() {},
    suspend() {},
    resume() {}
  };
})();

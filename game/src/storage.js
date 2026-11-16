// The best score, kept in the browser between visits. Storage can be switched off or full, so
// every read and write is guarded and the game plays on without it.
(function (LK) {
  'use strict';

  /** Each mode keeps its own best: a gale score is not a normal one. */
  function keyFor(mode) {
    return mode === 'gale' ? 'lamplight-best-gale' : 'lamplight-best';
  }

  function loadBest(mode) {
    try {
      const value = Number(window.localStorage.getItem(keyFor(mode)));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(score, mode) {
    try {
      window.localStorage.setItem(keyFor(mode), String(score));
    } catch (e) {
      /* storage unavailable: the best score lasts this visit only */
    }
  }

  LK.loadBest = loadBest;
  LK.saveBest = saveBest;
})((globalThis.LK = globalThis.LK || {}));

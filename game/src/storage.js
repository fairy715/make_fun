// The best score, kept in the browser between visits. Storage can be switched off or full, so
// every read and write is guarded and the game plays on without it.
(function (LK) {
  'use strict';

  const KEY = 'lamplight-best';

  function loadBest() {
    try {
      const value = Number(window.localStorage.getItem(KEY));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(score) {
    try {
      window.localStorage.setItem(KEY, String(score));
    } catch (e) {
      /* storage unavailable: the best score lasts this visit only */
    }
  }

  LK.loadBest = loadBest;
  LK.saveBest = saveBest;
})((globalThis.LK = globalThis.LK || {}));

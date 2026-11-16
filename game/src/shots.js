// The screenshot scenes behind ?shot=title|play|upgrade|end. Each one plays the real rules forward
// with the computer keeper from a fixed seed, so the frame is what that moment of a real game
// looks like, and the same address always gives the same frame.
//   title:   the title screen over the demo bay      (&t= seconds of demo)
//   play:    a night in progress with its HUD        (&seed= &night= &t= seconds into the night)
//   upgrade: the improvement choice after a night    (&seed= &nights= nights played first)
//   end:     the game-over report of a whole run     (&seed= &skill=)
(function (LK) {
  'use strict';

  function playNight(game, pilot, seconds, withEffects) {
    const night = game.night;
    const steps = Math.round(seconds / LK.STEP);
    for (let i = 0; i < steps && !night.over; i++) {
      const events = LK.stepNight(game.run, night, LK.autopilotInput(pilot, night, LK.STEP), LK.STEP);
      if (withEffects) {
        LK.spawnEffects(game.fx, events);
        LK.updateEffects(game.fx, LK.STEP);
      }
      game.time += LK.STEP;
    }
    return night;
  }

  /** Plays whole nights with the computer keeper, taking an upgrade after each, as a player would. */
  function playNights(game, pilot, count, pickRng) {
    for (let n = 0; n < count; n++) {
      game.night = LK.startNight(game.run);
      playNight(game, pilot, 600, false);
      if (game.run.trust <= 0) return false;
      if (LK.advanceRun(game.run) === null) return true;
      LK.takeUpgrade(game.run, LK.autopilotPick(LK.offerUpgrades(game.run, game.run.rng), game.run, pickRng));
    }
    return true;
  }

  function prepareShot(game, shot, params) {
    const seed = Number(params.get('seed') || 1);
    game.fx = LK.createEffects();
    if (shot === 'title') {
      const steps = Math.round(Number(params.get('t') || 12) / LK.STEP);
      for (let i = 0; i < steps; i++) {
        const a = game.attract;
        const events = LK.stepNight(a.run, a.night, LK.autopilotInput(a.pilot, a.night, LK.STEP), LK.STEP);
        LK.spawnEffects(a.fx, events);
        a.fx.texts = [];
        LK.updateEffects(a.fx, LK.STEP);
        game.time += LK.STEP;
      }
      game.mode = 'title';
      return;
    }
    game.run = LK.createRun(seed, params.get('mode') || 'normal');
    game.view = LK.createView(seed);
    const pilot = LK.createAutopilot(params.get('skill') || 'expert', seed);
    const pickRng = LK.createRng(seed + 99);
    if (shot === 'play') {
      const nights = Number(params.get('night') || 5) - 1;
      playNights(game, pilot, nights, pickRng);
      game.night = LK.startNight(game.run);
      playNight(game, pilot, Number(params.get('t') || 30), true);
      game.mode = 'play';
      game.modeAge = 10;
      return;
    }
    if (shot === 'upgrade') {
      playNights(game, pilot, Number(params.get('nights') || 3) - 1, pickRng);
      game.night = LK.startNight(game.run);
      playNight(game, pilot, 600, false);
      LK.advanceRun(game.run);
      game.offer = LK.offerUpgrades(game.run, game.run.rng);
      game.hover = 1;
      game.mode = 'upgrade';
      game.modeAge = 2;
      return;
    }
    // end: a whole run until the lamp goes dark (or the season is won).
    const won = playNights(game, pilot, LK.NIGHTS.length, pickRng);
    game.mode = won && game.run.trust > 0 ? 'victory' : 'gameover';
    game.modeAge = 3;
    const mode = game.run.mode;
    game.bests[mode] = Math.max(game.bests[mode], game.run.score + Number(params.get('best') || 0));
  }

  LK.prepareShot = prepareShot;
})((globalThis.LK = globalThis.LK || {}));

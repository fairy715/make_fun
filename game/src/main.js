// Lamplight Keeper: the page's game loop. It holds which screen is up (title, play, pause, dawn
// report, upgrade choice, game over, victory), steps the rules at a fixed rate, and draws.
(function (LK) {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const status = document.getElementById('status');

  const game = {
    mode: 'title',
    run: null,
    night: null,
    view: null,
    fx: LK.createEffects(),
    time: 0,
    modeAge: 0,
    offer: [],
    hover: -1,
    bests: { normal: LK.loadBest('normal'), gale: LK.loadBest('gale') },
    lastMode: 'gale',
    attract: null,
    frozen: false,
  };

  function announce(words) {
    if (status) status.textContent = words;
  }

  // ---- canvas size ---------------------------------------------------------------------------

  let scale = 1;
  function fitCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fit = Math.min(window.innerWidth / LK.VIEW.width, window.innerHeight / LK.VIEW.height);
    canvas.style.width = `${Math.floor(LK.VIEW.width * fit)}px`;
    canvas.style.height = `${Math.floor(LK.VIEW.height * fit)}px`;
    scale = dpr * Math.max(fit, 0.5);
    canvas.width = Math.round(LK.VIEW.width * scale);
    canvas.height = Math.round(LK.VIEW.height * scale);
  }

  // ---- the title screen's demo bay -------------------------------------------------------------

  function newAttract() {
    const run = LK.createRun(20251118);
    run.nightIndex = 2;
    return { run, night: LK.startNight(run), pilot: LK.createAutopilot('skilled', 7), view: LK.createView(20251118), fx: LK.createEffects() };
  }

  function stepAttract(dt) {
    const a = game.attract;
    const events = LK.stepNight(a.run, a.night, LK.autopilotInput(a.pilot, a.night, dt), dt);
    LK.spawnEffects(a.fx, events);
    a.fx.texts = []; // the demo shows sparks and spray, but no score words under the title
    a.fx.shake = 0;
    LK.updateEffects(a.fx, dt);
    if (a.night.over || a.run.trust <= 1) game.attract = newAttract();
  }

  // ---- moving between screens -------------------------------------------------------------------

  function setMode(mode) {
    game.mode = mode;
    game.modeAge = 0;
  }

  function startGame(mode) {
    const seed = Math.floor(Math.random() * 1e9);
    game.lastMode = mode || game.lastMode;
    game.run = LK.createRun(seed, game.lastMode);
    game.view = LK.createView(seed);
    game.fx = LK.createEffects();
    beginNight();
  }

  function beginNight() {
    game.night = LK.startNight(game.run);
    setMode('play');
    LK.playSound('nightStart');
    announce(`Night ${game.night.index + 1}: ${game.night.def.name}. ${game.night.def.news}`);
  }

  function endRun(mode) {
    const runMode = game.run.mode;
    if (game.run.score > game.bests[runMode]) {
      game.bests[runMode] = game.run.score;
      LK.saveBest(game.run.score, runMode);
    }
    setMode(mode);
    LK.setFocusHum(false);
    LK.playSound(mode === 'victory' ? 'victory' : 'gameOver');
    announce(mode === 'victory' ? `The season is safe. Final score ${game.run.score}.` : `The lamp goes dark. Final score ${game.run.score}.`);
  }

  function chooseUpgrade(index) {
    const id = game.offer[index];
    if (!id) return;
    LK.takeUpgrade(game.run, id);
    LK.playSound('pick');
    beginNight();
  }

  function rectIndexAt(rects, p) {
    if (!p) return -1;
    return rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  }

  function cardAt(p) {
    return rectIndexAt(LK.cardRects(), p);
  }

  // ---- one fixed step ---------------------------------------------------------------------------

  function update(dt) {
    game.time += dt;
    game.modeAge += dt;
    const presses = LK.drainPresses(input);
    const pressed = (...keys) => presses.keys.some((k) => keys.includes(k));
    const clicked = presses.clicks.length > 0;
    if (pressed('m')) LK.toggleMute();

    if (game.mode === 'title') {
      stepAttract(dt);
      const buttons = LK.titleButtons();
      game.hover = rectIndexAt(buttons, input.pointer);
      let chosen = null;
      for (const p of presses.clicks) {
        const index = rectIndexAt(buttons, p);
        // A click anywhere else starts the mode played last (the gale the first time).
        chosen = index >= 0 ? buttons[index].mode : game.lastMode;
      }
      if (pressed('enter', ' ', '1', 'g')) chosen = 'gale';
      if (pressed('c', '2')) chosen = 'normal';
      if (chosen) {
        LK.playSound('click');
        startGame(chosen);
      }
      return;
    }

    if (game.mode === 'play') {
      if (pressed('p', 'escape')) {
        setMode('paused');
        LK.setFocusHum(false);
        return;
      }
      const events = LK.stepNight(game.run, game.night, LK.readKeeper(input), dt);
      LK.spawnEffects(game.fx, events);
      LK.playEvents(events);
      LK.updateEffects(game.fx, dt);
      LK.setFocusHum(game.night.lamp.focused);
      for (const e of events) {
        if (e.type === 'gameOver') endRun('gameover');
        if (e.type === 'nightClear') {
          LK.setFocusHum(false);
          if (e.last) endRun('victory');
          else {
            setMode('dawn');
            announce(`Dawn. Night ${game.night.index + 1} survived.`);
          }
        }
      }
      return;
    }

    LK.updateEffects(game.fx, dt);

    if (game.mode === 'paused') {
      if (clicked || pressed('p', 'escape')) setMode('play');
    } else if (game.mode === 'dawn') {
      if (game.modeAge > 1 && (clicked || pressed('enter', ' '))) {
        LK.advanceRun(game.run);
        game.offer = LK.offerUpgrades(game.run, game.run.rng);
        LK.playSound('click');
        setMode('upgrade');
        announce('Choose an improvement: ' + game.offer.map((id, i) => `${i + 1} ${LK.upgradeById(id).name}`).join(', '));
      }
    } else if (game.mode === 'upgrade') {
      game.hover = cardAt(input.pointer);
      if (game.modeAge > 0.4) {
        for (const p of presses.clicks) {
          const index = cardAt(p);
          if (index >= 0) return chooseUpgrade(index);
        }
        for (const key of ['1', '2', '3']) if (pressed(key)) return chooseUpgrade(Number(key) - 1);
      }
    } else if (game.mode === 'gameover' || game.mode === 'victory') {
      if (game.modeAge > 1.2 && pressed('t')) {
        LK.playSound('click');
        setMode('title');
      } else if (game.modeAge > 1.2 && (clicked || pressed('r', 'enter'))) {
        LK.playSound('click');
        startGame(game.run.mode);
      }
    }
  }

  // ---- drawing -------------------------------------------------------------------------------

  function render() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, LK.VIEW.width, LK.VIEW.height);
    if (game.mode === 'title') {
      const a = game.attract;
      LK.drawNight(ctx, a.view, a.night, game.time, a.fx, 0.86);
      LK.drawTitle(ctx, game.time, game.bests, game.hover);
      return;
    }
    const shake = game.fx.shake;
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    let darkness = 0.86;
    if (game.mode === 'dawn' || game.mode === 'upgrade') darkness = Math.max(0.45, 0.86 - (game.mode === 'upgrade' ? 1 : game.modeAge) * 0.4);
    if (game.mode === 'victory') darkness = Math.max(0.25, 0.86 - game.modeAge * 0.3);
    LK.drawNight(ctx, game.view, game.night, game.time, game.fx, darkness);
    ctx.restore();
    if (game.mode === 'play' || game.mode === 'paused') {
      LK.drawHud(ctx, game.run, game.night, input.touch);
      if (game.modeAge < 3.4 && game.mode === 'play') LK.drawNightBanner(ctx, game.night, game.modeAge);
    }
    if (game.mode === 'paused') LK.drawPause(ctx);
    if (game.mode === 'dawn') LK.drawDawnReport(ctx, game.run, game.night, game.time);
    if (game.mode === 'upgrade') LK.drawUpgradeChoice(ctx, game.run, game.offer, game.hover, game.time);
    if (game.mode === 'gameover') LK.drawGameOver(ctx, game.run, game.bests[game.run.mode], game.time);
    if (game.mode === 'victory') LK.drawVictory(ctx, game.run, game.bests[game.run.mode], game.time);
  }

  // ---- start -------------------------------------------------------------------------------------

  const input = LK.createInput(canvas);
  window.addEventListener('resize', fitCanvas);
  fitCanvas();
  game.attract = newAttract();

  const shot = new URLSearchParams(window.location.search).get('shot');
  if (shot && LK.prepareShot) {
    LK.prepareShot(game, shot, new URLSearchParams(window.location.search));
    game.frozen = true;
    render();
    window.LK_SHOT_READY = true;
  }

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    if (!game.frozen) {
      while (acc >= LK.STEP) {
        update(LK.STEP);
        acc -= LK.STEP;
      }
      render();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  LK.game = game;
})((globalThis.LK = globalThis.LK || {}));

// The screens around the nights: the title, each night's opening banner, the dawn report, the
// choice of an upgrade, the dark ending, the season won, and the pause card.
(function (LK) {
  'use strict';

  const SERIF = "Georgia, 'Times New Roman', serif";

  function veil(ctx, alpha) {
    ctx.fillStyle = `rgba(2, 6, 16, ${alpha})`;
    ctx.fillRect(0, 0, LK.VIEW.width, LK.VIEW.height);
  }

  function title(ctx, words, y, size, color) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${size}px ${SERIF}`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.strokeText(words, LK.VIEW.width / 2, y);
    ctx.fillStyle = color;
    ctx.fillText(words, LK.VIEW.width / 2, y);
  }

  function line(ctx, words, y, size, color, style) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${style || ''} ${size}px ${SERIF}`;
    ctx.fillStyle = color;
    ctx.fillText(words, LK.VIEW.width / 2, y);
  }

  function prompt(ctx, words, y, time) {
    const a = 0.8 + 0.2 * Math.sin(time * 3);
    line(ctx, words, y, 22, `rgba(255, 227, 154, ${a})`, 'bold');
  }

  /** A large call-to-action plate: what to click, readable even on a thumbnail. */
  function plate(ctx, words, y, size, time) {
    ctx.font = `bold ${size}px ${SERIF}`;
    const w = ctx.measureText(words).width + 80;
    const h = size + 34;
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
    ctx.fillStyle = 'rgba(52, 38, 14, 0.92)';
    ctx.strokeStyle = `rgba(255, 214, 140, ${0.65 + 0.35 * pulse})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(LK.VIEW.width / 2 - w / 2, y - h / 2, w, h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe39a';
    ctx.fillText(words, LK.VIEW.width / 2, y + 2);
  }

  /** The two mode buttons under the title; main.js tests clicks against these. */
  function titleButtons() {
    const w = 400;
    const h = 124;
    const cx = LK.VIEW.width / 2;
    return [
      { mode: 'gale', x: cx - w - 20, y: 236, w, h, label: 'GALE WATCH', sub: 'The full storm · score x1.5 · Enter · 1' },
      { mode: 'normal', x: cx + 20, y: 236, w, h, label: 'CALM WATCH', sub: 'Gentler seas to learn the lamp · C · 2' },
    ];
  }

  function drawTitle(ctx, time, bests, hover) {
    const w = LK.VIEW.width;
    const g = ctx.createLinearGradient(0, 0, 0, 420);
    g.addColorStop(0, 'rgba(2, 6, 16, 0.8)');
    g.addColorStop(1, 'rgba(2, 6, 16, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, 420);
    title(ctx, 'LAMPLIGHT KEEPER', 96, 104, '#ffe2a0');
    line(ctx, 'Seven nights. One lamp. Bring every ship home.', 176, 30, 'rgba(240, 240, 230, 0.95)', 'italic');
    titleButtons().forEach((b, i) => {
      const on = hover === i;
      const pulse = 0.5 + 0.5 * Math.sin(time * 3 + i * 1.5);
      ctx.fillStyle = on ? 'rgba(60, 46, 24, 0.95)' : 'rgba(16, 22, 34, 0.92)';
      ctx.strokeStyle = b.mode === 'gale' ? `rgba(255, 140, 110, ${0.6 + 0.4 * pulse})` : `rgba(255, 214, 140, ${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = on ? 5 : 4;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 16);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold 50px ${SERIF}`;
      ctx.fillStyle = b.mode === 'gale' ? '#ffb39a' : '#ffe39a';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + 50);
      ctx.font = `18px ${SERIF}`;
      ctx.fillStyle = 'rgba(235, 235, 225, 0.85)';
      ctx.fillText(b.sub, b.x + b.w / 2, b.y + 96);
      const best = bests[b.mode] || 0;
      if (best > 0) {
        ctx.font = `bold 20px ${SERIF}`;
        ctx.fillStyle = 'rgba(255, 227, 154, 0.9)';
        ctx.fillText(`Best ${best.toLocaleString('en-US')}`, b.x + b.w / 2, b.y + b.h + 22);
      }
    });
    plate(ctx, 'CLICK A WATCH TO START', 432, 40, time);
    LK.hudPanel(ctx, w / 2 - 330, 486, 660, 150);
    const rows = [
      ['Mouse', 'swing the beam: lit ships steer clear of rocks'],
      ['Hold left button', 'focus the beam: farther, faster ships, burns oil'],
      ['Space / right click', 'foghorn: every ship drops anchor'],
      ['A / D', 'swing the beam by keyboard     P pause     M sound'],
    ];
    rows.forEach(([key, text], i) => {
      const y = 512 + i * 32;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = `bold 18px ${SERIF}`;
      ctx.fillStyle = '#ffd36b';
      ctx.fillText(key, w / 2 - 120, y);
      ctx.textAlign = 'left';
      ctx.font = `17px ${SERIF}`;
      ctx.fillStyle = 'rgba(235, 235, 225, 0.92)';
      ctx.fillText(text, w / 2 - 102, y);
    });
  }

  function drawNightBanner(ctx, night, age) {
    const fade = Math.min(1, age / 0.4, Math.max(0, (3.2 - age) / 0.6));
    if (fade <= 0) return;
    ctx.save();
    ctx.globalAlpha = fade;
    const y = 250;
    const g = ctx.createLinearGradient(0, y - 70, 0, y + 70);
    g.addColorStop(0, 'rgba(2, 6, 16, 0)');
    g.addColorStop(0.5, 'rgba(2, 6, 16, 0.7)');
    g.addColorStop(1, 'rgba(2, 6, 16, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 70, LK.VIEW.width, 140);
    line(ctx, `NIGHT ${night.index + 1}`, y - 34, 20, '#ffd36b', 'bold');
    title(ctx, night.def.name, y + 4, 48, '#fff3d6');
    line(ctx, night.def.news, y + 46, 18, 'rgba(235, 235, 225, 0.9)', 'italic');
    ctx.restore();
  }

  function drawDawnReport(ctx, run, night, time) {
    veil(ctx, 0.55);
    title(ctx, `Dawn breaks: night ${night.index + 1} survived`, 170, 46, '#ffe2a0');
    const c = night.counts;
    const rows = [`Ships home: ${c.docked} of ${c.merchants}`, `Wrecked: ${c.wrecked}${c.rescued ? `  (lifeboats saved ${c.rescued} crews)` : ''}`];
    if (c.chased) rows.push(`Hunters driven off: ${c.chased}`);
    if (c.repelled) rows.push(`The thing below sent back: ${c.repelled} times`);
    rows.push(`Night bonus: +${night.result.bonus}`);
    if (night.result.flawless) rows.push(`Flawless watch: +${night.result.flawlessBonus}`);
    rows.forEach((r, i) => line(ctx, r, 250 + i * 34, 21, 'rgba(240, 240, 230, 0.95)'));
    line(ctx, `Score ${run.score.toLocaleString('en-US')}`, 270 + rows.length * 34, 26, '#ffd36b', 'bold');
    prompt(ctx, 'Click to choose an improvement', 600, time);
  }

  /** Where the three upgrade cards sit; main.js tests clicks against these. */
  function cardRects() {
    const w = 350;
    const h = 350;
    const gap = 36;
    const left = LK.VIEW.width / 2 - (w * 3 + gap * 2) / 2;
    return [0, 1, 2].map((i) => ({ x: left + i * (w + gap), y: 206, w, h }));
  }

  function drawIcon(ctx, icon, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale || 1, scale || 1);
    ctx.strokeStyle = '#ffd36b';
    ctx.fillStyle = '#ffd36b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (icon === 'lens') {
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === 'flame') {
      ctx.moveTo(0, -20);
      ctx.quadraticCurveTo(16, 0, 0, 20);
      ctx.quadraticCurveTo(-16, 0, 0, -20);
      ctx.fill();
    } else if (icon === 'gear') {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
    } else if (icon === 'drop') {
      ctx.moveTo(0, -20);
      ctx.quadraticCurveTo(18, 6, 0, 18);
      ctx.quadraticCurveTo(-18, 6, 0, -20);
      ctx.stroke();
    } else if (icon === 'horn') {
      ctx.moveTo(-16, -6);
      ctx.lineTo(4, -16);
      ctx.lineTo(4, 16);
      ctx.lineTo(-16, 6);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, 0, 10, -0.8, 0.8);
      ctx.stroke();
    } else if (icon === 'buoy') {
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ff6b5e';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.78;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
        ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17);
        ctx.stroke();
      }
    } else if (icon === 'eye') {
      ctx.moveTo(-20, 0);
      ctx.quadraticCurveTo(0, -18, 20, 0);
      ctx.quadraticCurveTo(0, 18, -20, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === 'anchor') {
      ctx.moveTo(0, -18);
      ctx.lineTo(0, 16);
      ctx.moveTo(-10, -8);
      ctx.lineTo(10, -8);
      ctx.moveTo(-16, 6);
      ctx.quadraticCurveTo(0, 26, 16, 6);
      ctx.stroke();
    } else if (icon === 'heart') {
      ctx.moveTo(0, 16);
      ctx.bezierCurveTo(-24, 0, -10, -20, 0, -6);
      ctx.bezierCurveTo(10, -20, 24, 0, 0, 16);
      ctx.fill();
    } else {
      ctx.arc(-4, -4, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(5, 5);
      ctx.lineTo(18, 18);
      ctx.stroke();
    }
    ctx.restore();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let lineText = '';
    for (const word of words) {
      const test = lineText ? lineText + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && lineText) {
        ctx.fillText(lineText, x, y);
        lineText = word;
        y += lineHeight;
      } else {
        lineText = test;
      }
    }
    ctx.fillText(lineText, x, y);
  }

  function drawUpgradeChoice(ctx, run, offer, hover, time) {
    veil(ctx, 0.66);
    title(ctx, 'CHOOSE AN UPGRADE', 78, 76, '#ffe2a0');
    line(ctx, `The lamp room, before night ${run.nightIndex + 1}: ${LK.NIGHTS[run.nightIndex].name}`, 150, 26, 'rgba(240, 240, 230, 0.92)', 'italic');
    cardRects().forEach((rect, i) => {
      const id = offer[i];
      if (!id) return;
      const up = LK.upgradeById(id);
      const lift = hover === i ? -8 : 0;
      ctx.fillStyle = hover === i ? 'rgba(44, 56, 76, 0.97)' : 'rgba(16, 26, 42, 0.94)';
      ctx.strokeStyle = hover === i ? '#ffd36b' : 'rgba(255, 214, 140, 0.55)';
      ctx.lineWidth = hover === i ? 5 : 3;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y + lift, rect.w, rect.h, 18);
      ctx.fill();
      ctx.stroke();
      drawIcon(ctx, up.icon, rect.x + rect.w / 2, rect.y + 86 + lift, 2.6);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff3d6';
      ctx.font = `bold 36px ${SERIF}`;
      ctx.fillText(up.name, rect.x + rect.w / 2, rect.y + 182 + lift);
      ctx.fillStyle = 'rgba(235, 235, 225, 0.9)';
      ctx.font = `19px ${SERIF}`;
      wrapText(ctx, up.text, rect.x + rect.w / 2, rect.y + 228 + lift, rect.w - 44, 26);
      const owned = run.upgrades[id] || 0;
      ctx.fillStyle = '#ffd36b';
      ctx.font = `bold 20px ${SERIF}`;
      ctx.fillText(`${owned ? `Owned ${owned} / ${up.max}   ·   ` : ''}Click or press ${i + 1}`, rect.x + rect.w / 2, rect.y + rect.h - 28 + lift);
    });
    line(ctx, `Trust ${run.trust} / ${run.maxTrust}        Score ${run.score.toLocaleString('en-US')}`, 618, 34, '#ffd36b', 'bold');
    void time;
  }

  function statRows(run) {
    const t = run.totals;
    return [
      `Ships brought home: ${t.docked}`,
      `Ships lost: ${t.wrecked}    Plundered: ${t.plundered}    Crews rescued: ${t.rescued}`,
      `Hunters driven off: ${t.chased}    The thing below repelled: ${t.repelled}`,
      `Best combo: x${run.bestCombo.toFixed(2)}    Flawless nights: ${t.flawless}`,
    ];
  }

  /** The end card both endings share: the big score, the run's numbers, and how to play again. */
  function endCard(ctx, run, best, time, again) {
    line(ctx, 'FINAL SCORE', 232, 34, 'rgba(255, 227, 154, 0.95)', 'bold');
    title(ctx, run.score.toLocaleString('en-US'), 318, 124, '#ffd36b');
    statRows(run).forEach((r, i) => line(ctx, r, 400 + i * 29, 19, 'rgba(244, 244, 234, 0.94)'));
    line(ctx, `${run.score >= best && run.score > 0 ? 'A new best watch!' : `Best watch: ${best.toLocaleString('en-US')}`}   ·   ${modeLine(run)}`, 524, 22, 'rgba(255, 227, 154, 0.92)', 'bold');
    plate(ctx, again, 596, 40, time);
    line(ctx, 'click or press R   ·   T for the title', 650, 19, 'rgba(235, 235, 225, 0.85)');
  }

  function drawGameOver(ctx, run, best, time) {
    veil(ctx, 0.74);
    title(ctx, 'THE LAMP GOES DARK', 84, 84, '#ff9c8a');
    line(ctx, `The harbour lost its trust on night ${run.nightIndex + 1}: ${LK.NIGHTS[run.nightIndex].name}`, 160, 24, 'rgba(240, 240, 230, 0.92)', 'italic');
    endCard(ctx, run, best, time, 'KEEP WATCH AGAIN');
  }

  function modeLine(run) {
    return run.mode === 'gale' ? 'Gale watch · score x1.5' : 'Calm watch';
  }

  function drawVictory(ctx, run, best, time) {
    const g = ctx.createLinearGradient(0, 0, 0, LK.VIEW.height);
    g.addColorStop(0, 'rgba(255, 170, 110, 0.35)');
    g.addColorStop(0.5, 'rgba(60, 40, 70, 0.55)');
    g.addColorStop(1, 'rgba(2, 6, 16, 0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LK.VIEW.width, LK.VIEW.height);
    title(ctx, 'THE SEASON IS SAFE', 84, 84, '#ffe2a0');
    line(ctx, 'Seven nights kept. The first light of spring reaches the bay.', 160, 24, 'rgba(250, 240, 225, 0.96)', 'italic');
    endCard(ctx, run, best, time, 'BEGIN A NEW SEASON');
  }

  function drawPause(ctx) {
    veil(ctx, 0.55);
    title(ctx, 'PAUSED', 300, 56, '#ffe2a0');
    line(ctx, 'Press P or click to keep watch', 360, 20, 'rgba(235, 235, 225, 0.9)');
  }

  LK.drawTitle = drawTitle;
  LK.drawNightBanner = drawNightBanner;
  LK.drawDawnReport = drawDawnReport;
  LK.drawUpgradeChoice = drawUpgradeChoice;
  LK.drawGameOver = drawGameOver;
  LK.drawVictory = drawVictory;
  LK.drawPause = drawPause;
  LK.cardRects = cardRects;
  LK.titleButtons = titleButtons;
})((globalThis.LK = globalThis.LK || {}));

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

  function drawTitle(ctx, time, best) {
    const w = LK.VIEW.width;
    const g = ctx.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, 'rgba(2, 6, 16, 0.75)');
    g.addColorStop(1, 'rgba(2, 6, 16, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, 300);
    title(ctx, 'LAMPLIGHT KEEPER', 120, 72, '#ffe2a0');
    line(ctx, 'Seven nights. One lamp. Bring every ship home.', 178, 22, 'rgba(235, 235, 225, 0.9)', 'italic');
    LK.hudPanel(ctx, w / 2 - 300, 222, 600, 176);
    const rows = [
      ['Mouse', 'swing the beam: lit ships steer clear of rocks'],
      ['Hold left button', 'focus the beam: farther, faster ships, burns oil'],
      ['Space / right click', 'foghorn: every ship drops anchor'],
      ['A / D', 'swing the beam by keyboard     P pause     M sound'],
    ];
    rows.forEach(([key, text], i) => {
      const y = 254 + i * 36;
      ctx.textAlign = 'right';
      ctx.font = `bold 17px ${SERIF}`;
      ctx.fillStyle = '#ffd36b';
      ctx.fillText(key, w / 2 - 110, y);
      ctx.textAlign = 'left';
      ctx.font = `16px ${SERIF}`;
      ctx.fillStyle = 'rgba(235, 235, 225, 0.9)';
      ctx.fillText(text, w / 2 - 92, y);
    });
    prompt(ctx, 'Click to light the lamp', 440, time);
    if (best > 0) line(ctx, `Best watch: ${best.toLocaleString('en-US')}`, 476, 16, 'rgba(235, 235, 225, 0.7)');
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
    const w = 300;
    const h = 250;
    const gap = 36;
    const left = LK.VIEW.width / 2 - (w * 3 + gap * 2) / 2;
    return [0, 1, 2].map((i) => ({ x: left + i * (w + gap), y: 250, w, h }));
  }

  function drawIcon(ctx, icon, x, y) {
    ctx.save();
    ctx.translate(x, y);
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
    veil(ctx, 0.6);
    title(ctx, 'The lamp room: choose one improvement', 150, 40, '#ffe2a0');
    line(ctx, `Night ${run.nightIndex + 1} comes next: ${LK.NIGHTS[run.nightIndex].name}`, 200, 19, 'rgba(235, 235, 225, 0.85)', 'italic');
    cardRects().forEach((rect, i) => {
      const id = offer[i];
      if (!id) return;
      const up = LK.upgradeById(id);
      const lift = hover === i ? -8 : 0;
      ctx.fillStyle = hover === i ? 'rgba(40, 52, 70, 0.95)' : 'rgba(16, 26, 42, 0.92)';
      ctx.strokeStyle = hover === i ? '#ffd36b' : 'rgba(255, 214, 140, 0.4)';
      ctx.lineWidth = hover === i ? 3 : 1.5;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y + lift, rect.w, rect.h, 14);
      ctx.fill();
      ctx.stroke();
      drawIcon(ctx, up.icon, rect.x + rect.w / 2, rect.y + 60 + lift);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff3d6';
      ctx.font = `bold 24px ${SERIF}`;
      ctx.fillText(up.name, rect.x + rect.w / 2, rect.y + 118 + lift);
      ctx.fillStyle = 'rgba(235, 235, 225, 0.85)';
      ctx.font = `17px ${SERIF}`;
      wrapText(ctx, up.text, rect.x + rect.w / 2, rect.y + 158 + lift, rect.w - 40, 24);
      const owned = run.upgrades[id] || 0;
      ctx.fillStyle = 'rgba(255, 214, 140, 0.7)';
      ctx.font = `14px ${SERIF}`;
      ctx.fillText(`${owned ? `Owned ${owned} / ${up.max}   ·   ` : ''}Press ${i + 1}`, rect.x + rect.w / 2, rect.y + rect.h - 24 + lift);
    });
    line(ctx, `Trust ${run.trust} / ${run.maxTrust}     Score ${run.score.toLocaleString('en-US')}`, 560, 18, 'rgba(235, 235, 225, 0.75)');
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

  function drawGameOver(ctx, run, best, time) {
    veil(ctx, 0.72);
    title(ctx, 'THE LAMP GOES DARK', 160, 64, '#ff9c8a');
    line(ctx, `The harbour lost its trust on night ${run.nightIndex + 1}: ${LK.NIGHTS[run.nightIndex].name}`, 220, 20, 'rgba(235, 235, 225, 0.9)', 'italic');
    statRows(run).forEach((r, i) => line(ctx, r, 290 + i * 34, 20, 'rgba(240, 240, 230, 0.92)'));
    line(ctx, `Final score ${run.score.toLocaleString('en-US')}`, 450, 34, '#ffd36b', 'bold');
    line(ctx, run.score >= best && run.score > 0 ? 'A new best watch!' : `Best watch: ${best.toLocaleString('en-US')}`, 494, 18, 'rgba(235, 235, 225, 0.8)');
    prompt(ctx, 'Click or press R to keep watch again', 580, time);
  }

  function drawVictory(ctx, run, best, time) {
    const g = ctx.createLinearGradient(0, 0, 0, LK.VIEW.height);
    g.addColorStop(0, 'rgba(255, 170, 110, 0.35)');
    g.addColorStop(0.5, 'rgba(60, 40, 70, 0.55)');
    g.addColorStop(1, 'rgba(2, 6, 16, 0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LK.VIEW.width, LK.VIEW.height);
    title(ctx, 'THE SEASON IS SAFE', 160, 64, '#ffe2a0');
    line(ctx, 'Seven nights kept. The first light of spring reaches the bay.', 220, 21, 'rgba(250, 240, 225, 0.95)', 'italic');
    statRows(run).forEach((r, i) => line(ctx, r, 290 + i * 34, 20, 'rgba(250, 245, 235, 0.95)'));
    line(ctx, `Final score ${run.score.toLocaleString('en-US')}`, 450, 34, '#ffd36b', 'bold');
    line(ctx, run.score >= best ? 'A new best watch!' : `Best watch: ${best.toLocaleString('en-US')}`, 494, 18, 'rgba(250, 240, 225, 0.85)');
    prompt(ctx, 'Click or press R to begin a new season', 580, time);
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
})((globalThis.LK = globalThis.LK || {}));

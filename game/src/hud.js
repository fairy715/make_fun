// The keeper's instruments: night and trust at the top left, score and combo in the middle, the
// oil gauge at the top right; ships home and lifeboats at the bottom left, the foghorn at the
// bottom right. On a touch screen two round buttons stand in for the mouse buttons.
(function (LK) {
  'use strict';

  const SERIF = "Georgia, 'Times New Roman', serif";

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(6, 14, 26, 0.72)';
    ctx.strokeStyle = 'rgba(255, 214, 140, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
  }

  function heart(ctx, x, y, size, filled) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.35);
    ctx.bezierCurveTo(x, y, x - size * 0.55, y, x - size * 0.55, y + size * 0.35);
    ctx.bezierCurveTo(x - size * 0.55, y + size * 0.65, x, y + size * 0.8, x, y + size);
    ctx.bezierCurveTo(x, y + size * 0.8, x + size * 0.55, y + size * 0.65, x + size * 0.55, y + size * 0.35);
    ctx.bezierCurveTo(x + size * 0.55, y, x, y, x, y + size * 0.35);
    ctx.closePath();
    ctx.fillStyle = filled ? '#ff6b5e' : 'rgba(255, 255, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = filled ? '#ffb3a8' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  function drawHud(ctx, run, night, touch) {
    const { width, height } = LK.VIEW;
    ctx.save();
    ctx.textBaseline = 'middle';

    // Night and trust.
    panel(ctx, 16, 14, 300, 62);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd98a';
    ctx.font = `bold 20px ${SERIF}`;
    ctx.fillText(`Night ${night.index + 1} of ${LK.NIGHTS.length}`, 30, 34);
    ctx.fillStyle = 'rgba(230, 230, 220, 0.75)';
    ctx.font = `italic 14px ${SERIF}`;
    ctx.fillText(night.def.name, 30, 58);
    for (let i = 0; i < run.maxTrust; i++) heart(ctx, 196 + i * 20, 26, 16, i < run.trust);
    if (run.mode === 'gale') {
      ctx.fillStyle = '#ff9c7a';
      ctx.font = `bold 13px ${SERIF}`;
      ctx.fillText('GALE  x1.5', 196, 60);
    }

    // Score and combo.
    panel(ctx, width / 2 - 120, 14, 240, 62);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3d6';
    ctx.font = `bold 28px ${SERIF}`;
    ctx.fillText(run.score.toLocaleString('en-US'), width / 2, 38);
    ctx.font = `13px ${SERIF}`;
    ctx.fillStyle = run.combo > 1 ? '#ffd36b' : 'rgba(230, 230, 220, 0.6)';
    ctx.fillText(run.combo > 1 ? `Combo x${run.combo.toFixed(2)}` : 'Score', width / 2, 62);

    // Oil gauge.
    const lamp = night.lamp;
    panel(ctx, width - 276, 14, 260, 62);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(230, 230, 220, 0.8)';
    ctx.font = `bold 14px ${SERIF}`;
    ctx.fillText(lamp.focused ? 'OIL  (focused beam)' : 'OIL', width - 262, 32);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(width - 262, 46, 232, 14);
    const share = lamp.oil / lamp.oilMax;
    const oil = ctx.createLinearGradient(width - 262, 0, width - 30, 0);
    oil.addColorStop(0, '#c9822b');
    oil.addColorStop(1, '#ffd36b');
    ctx.fillStyle = share < 0.2 ? '#d9534f' : oil;
    ctx.fillRect(width - 262, 46, 232 * share, 14);
    ctx.strokeStyle = 'rgba(255, 214, 140, 0.4)';
    ctx.strokeRect(width - 262, 46, 232, 14);

    // Ships home and lifeboats.
    panel(ctx, 16, height - 58, 250, 44);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8f4ff';
    ctx.font = `bold 17px ${SERIF}`;
    ctx.fillText(`Ships home ${night.counts.docked} / ${night.counts.merchants}`, 30, height - 36);
    if (run.lifeboats > 0) {
      ctx.fillStyle = '#8ff0c0';
      ctx.font = `14px ${SERIF}`;
      ctx.fillText(`Lifeboats ${run.lifeboats}`, 180, height - 36);
    }

    // Foghorn.
    const ready = night.hornCooldown <= 0;
    panel(ctx, width - 216, height - 58, 200, 44);
    const cx = width - 190;
    const cy = height - 36;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = ready ? '#ffd36b' : '#8aa0b8';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - night.hornCooldown / night.stats.hornCooldown));
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = ready ? '#ffe39a' : 'rgba(230, 230, 220, 0.6)';
    ctx.font = `bold 15px ${SERIF}`;
    ctx.fillText(ready ? 'Foghorn ready' : 'Foghorn…', cx + 22, cy - 6);
    ctx.font = `11px ${SERIF}`;
    ctx.fillStyle = 'rgba(230, 230, 220, 0.6)';
    ctx.fillText('Space / right click', cx + 22, cy + 10);

    if (touch) drawTouchButtons(ctx, lamp, ready);
    ctx.restore();
  }

  /** The two touch buttons, where touch input looks for them. */
  const TOUCH_BUTTONS = {
    focus: { x: 90, y: 560, r: 52, label: 'FOCUS' },
    horn: { x: 1190, y: 560, r: 52, label: 'HORN' },
  };

  function drawTouchButtons(ctx, lamp, hornReady) {
    for (const key of Object.keys(TOUCH_BUTTONS)) {
      const b = TOUCH_BUTTONS[key];
      const active = key === 'focus' ? lamp.focused : hornReady;
      ctx.fillStyle = active ? 'rgba(255, 214, 140, 0.35)' : 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = 'rgba(255, 214, 140, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff3d6';
      ctx.font = `bold 16px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillText(b.label, b.x, b.y);
    }
  }

  LK.SERIF = SERIF;
  LK.TOUCH_BUTTONS = TOUCH_BUTTONS;
  LK.drawHud = drawHud;
  LK.hudPanel = panel;
})((globalThis.LK = globalThis.LK || {}));

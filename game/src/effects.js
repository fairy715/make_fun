// Short-lived feedback: sparks when a ship docks, debris and spray when one sinks, floating score
// text, ripples, and a little screen shake. Turned from the rule events by spawnEffects().
(function (LK) {
  'use strict';

  function createEffects() {
    return { particles: [], texts: [], rings: [], shake: 0, seed: 1 };
  }

  function rand(fx) {
    fx.seed = (fx.seed * 16807) % 2147483647;
    return fx.seed / 2147483647;
  }

  function burst(fx, x, y, count, color, speed, life, gravity) {
    for (let i = 0; i < count; i++) {
      const a = rand(fx) * Math.PI * 2;
      const s = speed * (0.3 + rand(fx) * 0.9);
      fx.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + rand(fx) * 0.6), max: life, color, size: 1.5 + rand(fx) * 2.5, gravity: gravity || 0 });
    }
  }

  function text(fx, x, y, words, color, size) {
    fx.texts.push({ x, y, words, color, size: size || 20, life: 1.6, max: 1.6 });
  }

  function ring(fx, x, y, color, radius, life) {
    fx.rings.push({ x, y, color, radius, life, max: life });
  }

  /** Turns rule events into effects. */
  function spawnEffects(fx, events) {
    for (const e of events) {
      if (e.type === 'dock') {
        burst(fx, e.x, e.y, 26, '#ffd36b', 90, 1.1);
        text(fx, e.x, e.y - 22, `+${e.points}` + (e.combo > 1 ? `  x${e.combo.toFixed(2).replace(/0$/, '')}` : ''), '#ffe39a', 22);
        if (e.quick) text(fx, e.x, e.y - 46, 'Mail on time!', '#9fe0ff', 16);
        ring(fx, e.x, e.y, 'rgba(255, 220, 120, 0.8)', 46, 0.8);
      } else if (e.type === 'wreck') {
        burst(fx, e.x, e.y, 34, '#cfe6ff', 120, 1.2);
        burst(fx, e.x, e.y, 18, '#7a5236', 70, 1.8);
        text(fx, e.x, e.y - 24, e.cause === 'cannon' ? 'Sunk by cannon!' : e.cause === 'monster' ? 'Dragged under!' : 'Wrecked!', '#ff8a7a', 20);
        ring(fx, e.x, e.y, 'rgba(220, 240, 255, 0.7)', 60, 1.0);
        fx.shake = Math.max(fx.shake, 10);
      } else if (e.type === 'rescued') {
        text(fx, e.x, e.y - 46, 'Lifeboat rescue!', '#8ff0c0', 18);
      } else if (e.type === 'plunder') {
        burst(fx, e.x, e.y, 22, '#ffb26b', 80, 1.0);
        text(fx, e.x, e.y - 24, 'Plundered!', '#ff8a7a', 20);
        fx.shake = Math.max(fx.shake, 6);
      } else if (e.type === 'chased') {
        text(fx, e.x, e.y - 24, `${e.kind === 'pirate' ? 'Raiders flee' : 'Smuggler flees'}  +${e.points}`, '#b7f08f', 20);
        ring(fx, e.x, e.y, 'rgba(180, 255, 140, 0.7)', 50, 0.7);
      } else if (e.type === 'cannon') {
        burst(fx, e.x, e.y, 10, '#ffcf7a', 60, 0.4);
        burst(fx, e.x, e.y, 8, '#8c8c8c', 30, 1.2);
      } else if (e.type === 'splash') {
        burst(fx, e.x, e.y, 10, '#cfe6ff', 50, 0.6);
        ring(fx, e.x, e.y, 'rgba(200, 230, 255, 0.5)', 18, 0.5);
      } else if (e.type === 'monsterRise') {
        ring(fx, e.x, e.y, 'rgba(120, 255, 160, 0.6)', 90, 1.4);
      } else if (e.type === 'monsterRepelled') {
        burst(fx, e.x, e.y, 30, '#9ff7c0', 110, 1.0);
        text(fx, e.x, e.y - 30, `Back to the deep!  +${e.points}`, '#9ff7c0', 20);
      } else if (e.type === 'monsterGrab') {
        burst(fx, e.x, e.y, 40, '#2f6b4a', 100, 1.4);
        fx.shake = Math.max(fx.shake, 14);
      } else if (e.type === 'spotted') {
        ring(fx, e.x, e.y, 'rgba(255, 240, 200, 0.45)', 40, 0.6);
      } else if (e.type === 'horn') {
        ring(fx, LK.LIGHTHOUSE.x, LK.LIGHTHOUSE.y, 'rgba(255, 230, 170, 0.5)', 900, 1.6);
      }
    }
  }

  function updateEffects(fx, dt) {
    for (const p of fx.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-2.2 * dt);
      p.vy = p.vy * Math.exp(-2.2 * dt) + p.gravity * dt;
      p.life -= dt;
    }
    fx.particles = fx.particles.filter((p) => p.life > 0);
    for (const t of fx.texts) {
      t.y -= 26 * dt;
      t.life -= dt;
    }
    fx.texts = fx.texts.filter((t) => t.life > 0);
    for (const r of fx.rings) r.life -= dt;
    fx.rings = fx.rings.filter((r) => r.life > 0);
    fx.shake = Math.max(0, fx.shake - 30 * dt);
  }

  function drawEffects(ctx, fx) {
    for (const r of fx.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 6 + r.radius * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of fx.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.textAlign = 'center';
    for (const t of fx.texts) {
      ctx.globalAlpha = Math.min(1, t.life / 0.5);
      ctx.font = `bold ${t.size}px Georgia, 'Times New Roman', serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.strokeText(t.words, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.words, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  LK.createEffects = createEffects;
  LK.spawnEffects = spawnEffects;
  LK.updateEffects = updateEffects;
  LK.drawEffects = drawEffects;
})((globalThis.LK = globalThis.LK || {}));

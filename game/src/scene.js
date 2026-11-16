// The bay at night, drawn once into an offscreen canvas: the sea's deep gradient, the coast, the
// rocky cape under the lighthouse and the two quays with their little towns. The lit parts (the
// tower, lanterns and windows) are drawn every frame on top of the dark, in render.js.
(function (LK) {
  'use strict';

  function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  function drawSea(ctx, rng) {
    const { width, height } = LK.VIEW;
    const sea = ctx.createLinearGradient(0, 0, 0, height);
    sea.addColorStop(0, '#04101f');
    sea.addColorStop(0.55, '#0a2440');
    sea.addColorStop(1, '#10345a');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, width, height);
    // Swell: long soft streaks across the water.
    for (let i = 0; i < 260; i++) {
      const x = rng.range(-40, width);
      const y = rng.range(0, height);
      const len = rng.range(18, 70);
      ctx.strokeStyle = `rgba(140, 190, 235, ${rng.range(0.025, 0.07).toFixed(3)})`;
      ctx.lineWidth = rng.range(1, 2.2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len / 2, y - rng.range(1, 4), x + len, y);
      ctx.stroke();
    }
  }

  function rockyBlob(ctx, cx, cy, r, rng, points) {
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2;
      const rr = r * rng.range(0.9, 1.06);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawLand(ctx, rng) {
    const { width, height } = LK.VIEW;
    const cape = LK.CAPE;
    // Surf around every shore.
    ctx.save();
    ctx.shadowColor = 'rgba(190, 220, 255, 0.35)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#16211b';
    rockyBlob(ctx, cape.x, cape.y + 6, cape.r + 2, rng, 40);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, 640);
    ctx.bezierCurveTo(60, 632, 110, 690, 230, 704);
    ctx.lineTo(260, height);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(width, height);
    ctx.lineTo(width, 640);
    ctx.bezierCurveTo(width - 60, 632, width - 110, 690, width - 230, 704);
    ctx.lineTo(width - 260, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Grass and stone texture on the land.
    const grass = ctx.createRadialGradient(cape.x, cape.y + 20, 20, cape.x, cape.y + 20, cape.r);
    grass.addColorStop(0, '#2a3b2c');
    grass.addColorStop(1, '#16211b');
    ctx.fillStyle = grass;
    rockyBlob(ctx, cape.x, cape.y + 14, cape.r - 14, rng, 36);
    ctx.fill();
    for (let i = 0; i < 70; i++) {
      const a = rng.range(Math.PI * 1.05, Math.PI * 1.95);
      const d = rng.range(cape.r - 22, cape.r + 2);
      ctx.fillStyle = `rgba(90, 100, 96, ${rng.range(0.3, 0.7).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(cape.x + Math.cos(a) * d, cape.y + Math.sin(a) * d, rng.range(3, 8), rng.range(2, 5), rng.range(0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
    // A winding path up to the tower.
    ctx.strokeStyle = 'rgba(160, 140, 105, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cape.x + 40, height);
    ctx.bezierCurveTo(cape.x + 60, 690, cape.x - 30, 690, cape.x, 668);
    ctx.stroke();
  }

  function drawQuay(ctx, harbor, rng) {
    const dir = harbor.id === 0 ? 1 : -1;
    // Stone breakwater curling out from the shore toward the harbour mouth.
    ctx.strokeStyle = '#4a4f55';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(harbor.x - dir * 120, 628);
    ctx.quadraticCurveTo(harbor.x - dir * 30, 600, harbor.gateX - dir * 22, harbor.gateY - 6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200, 210, 220, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Wooden piers.
    ctx.fillStyle = '#5b4330';
    for (let i = 0; i < 3; i++) {
      const px = harbor.x - dir * 10 + dir * i * 34;
      ctx.fillRect(px - 4, 640, 8, 44);
    }
    // Rooftops of the harbour town.
    for (let i = 0; i < 7; i++) {
      const hx = harbor.x - dir * (20 + i * 26) + rng.range(-5, 5);
      const hy = 694 + rng.range(-6, 10);
      ctx.fillStyle = rng.pick(['#3b2b26', '#2f2d36', '#40322a', '#2b3330']);
      ctx.fillRect(hx - 11, hy - 9, 22, 18);
      ctx.fillStyle = rng.pick(['#5a2f2a', '#4b4a52', '#5d4630']);
      ctx.beginPath();
      ctx.moveTo(hx - 13, hy - 8);
      ctx.lineTo(hx, hy - 17);
      ctx.lineTo(hx + 13, hy - 8);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** The static night bay for a seed, as an offscreen canvas. */
  function createBackdrop(seed) {
    const canvas = makeCanvas(LK.VIEW.width, LK.VIEW.height);
    const ctx = canvas.getContext('2d');
    const rng = LK.createRng(LK.hashSeed('bay:' + seed));
    drawSea(ctx, rng);
    drawLand(ctx, rng);
    for (const harbor of LK.HARBORS) drawQuay(ctx, harbor, rng);
    return canvas;
  }

  /** Window lights of the harbour towns, drawn above the dark (positions from the same seed). */
  function townLights(seed) {
    const rng = LK.createRng(LK.hashSeed('lights:' + seed));
    const lights = [];
    for (const harbor of LK.HARBORS) {
      const dir = harbor.id === 0 ? 1 : -1;
      for (let i = 0; i < 7; i++) {
        if (rng.chance(0.75)) lights.push({ x: harbor.x - dir * (20 + i * 26) + rng.range(-6, 6), y: 694 + rng.range(-4, 8), flicker: rng.range(0, 6.28) });
      }
      lights.push({ x: harbor.gateX - dir * 22, y: harbor.gateY - 6, flicker: 0, beacon: true });
    }
    return lights;
  }

  LK.makeCanvas = makeCanvas;
  LK.createBackdrop = createBackdrop;
  LK.townLights = townLights;
})((globalThis.LK = globalThis.LK || {}));

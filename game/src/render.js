// Draws a night: the bay, rocks and ships, then the dark laid over everything with the beam, the
// lanterns and the town cut out of it, then what glows above the dark (beam haze, fog, outlines
// of rocks the beam has passed, lanterns, the thing below, the lighthouse itself).
(function (LK) {
  'use strict';

  function createView(seed) {
    return {
      backdrop: LK.createBackdrop(seed),
      lights: LK.townLights(seed),
      shade: LK.makeCanvas(LK.VIEW.width, LK.VIEW.height),
    };
  }

  // ---- the water and what sits in it -------------------------------------------------------

  function drawSwell(ctx, time) {
    ctx.strokeStyle = 'rgba(170, 210, 255, 0.07)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      const y = (i * 29 + time * 6) % 600;
      const x = ((i * 173) % 1280) + Math.sin(time * 0.4 + i) * 30;
      ctx.beginPath();
      ctx.moveTo(x - 40, y);
      ctx.quadraticCurveTo(x, y - 4, x + 40, y);
      ctx.stroke();
    }
  }

  function drawReef(ctx, reef, time) {
    // Surf breaking on the rocks.
    ctx.strokeStyle = 'rgba(210, 235, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(reef.x, reef.y, reef.r + 4 + Math.sin(time * 2 + reef.x) * 2, 0, Math.PI * 2);
    ctx.stroke();
    for (const rock of reef.rocks) {
      ctx.fillStyle = '#3b4148';
      ctx.beginPath();
      ctx.ellipse(reef.x + rock.dx, reef.y + rock.dy, rock.r, rock.r * 0.78, rock.tilt, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5c646d';
      ctx.beginPath();
      ctx.ellipse(reef.x + rock.dx - rock.r * 0.2, reef.y + rock.dy - rock.r * 0.25, rock.r * 0.55, rock.r * 0.4, rock.tilt, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function icebergPath(ctx, ice) {
    ctx.beginPath();
    ice.corners.forEach((c, i) => {
      const a = ice.spin + (i / ice.corners.length) * Math.PI * 2;
      const x = ice.x + Math.cos(a) * c;
      const y = ice.y + Math.sin(a) * c;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }

  function drawIceberg(ctx, ice) {
    ctx.fillStyle = '#b9dbe8';
    icebergPath(ctx, ice);
    ctx.fill();
    ctx.fillStyle = '#e8f6fb';
    ctx.save();
    ctx.translate(-4, -4);
    ctx.scale(1, 1);
    icebergPath(ctx, { ...ice, corners: ice.corners.map((c) => c * 0.6) });
    ctx.fill();
    ctx.restore();
  }

  function drawWake(ctx, ship) {
    if (ship.wake.length < 2) return;
    ctx.lineCap = 'round';
    for (let i = 1; i < ship.wake.length; i++) {
      const a = ship.wake[i - 1];
      const b = ship.wake[i];
      ctx.strokeStyle = `rgba(220, 240, 255, ${(0.25 * i) / ship.wake.length})`;
      ctx.lineWidth = 1 + (ship.r * 0.5 * i) / ship.wake.length;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  function hullPath(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(r * 1.5, 0);
    ctx.quadraticCurveTo(r * 0.6, -r * 0.75, -r, -r * 0.6);
    ctx.lineTo(-r * 1.1, 0);
    ctx.lineTo(-r, r * 0.6);
    ctx.quadraticCurveTo(r * 0.6, r * 0.75, r * 1.5, 0);
    ctx.closePath();
  }

  function drawShip(ctx, ship, time) {
    const r = ship.r;
    const type = ship.type;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.heading + Math.sin(time * 2 + ship.bob) * 0.04);
    ctx.fillStyle = type.hull;
    hullPath(ctx, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#8a6a48';
    ctx.fillRect(-r * 0.7, -r * 0.35, r * 1.5, r * 0.7);
    ctx.fillStyle = type.sail;
    if (ship.kind === 'steamer') {
      ctx.fillStyle = '#c9c1b2';
      ctx.fillRect(-r * 0.6, -r * 0.45, r * 1.0, r * 0.9);
      ctx.fillStyle = '#b43c2e';
      ctx.beginPath();
      ctx.arc(-r * 0.05, 0, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-r * 0.05, 0, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (ship.kind === 'clipper') {
      for (const off of [-0.55, 0.05, 0.6]) {
        ctx.beginPath();
        ctx.ellipse(r * off, 0, r * 0.22, r * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (ship.kind === 'pirate') {
      for (const off of [-0.5, 0.35]) {
        ctx.beginPath();
        ctx.ellipse(r * off, 0, r * 0.26, r * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#a32020';
      ctx.fillRect(-r * 0.62, -r * 0.08, r * 1.1, r * 0.16);
      // Gun ports.
      ctx.fillStyle = '#d9a441';
      for (const off of [-0.5, 0, 0.5]) {
        ctx.fillRect(r * off - 1.5, -r * 0.62, 3, 3);
        ctx.fillRect(r * off - 1.5, r * 0.55, 3, 3);
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(r * 0.7, 0);
      ctx.lineTo(-r * 0.5, -r * 0.8);
      ctx.lineTo(-r * 0.5, r * 0.8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBall(ctx, ball) {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- the dark and the light ---------------------------------------------------------------

  function beamPath(ctx, lamp, reachScale) {
    const { x, y } = LK.LIGHTHOUSE;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, lamp.reach * reachScale, lamp.angle - lamp.halfWidth, lamp.angle + lamp.halfWidth);
    ctx.closePath();
  }

  function cutLight(ctx, x, y, radius, strength) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawShade(view, night, time, darkness) {
    const { width, height } = LK.VIEW;
    const ctx = view.shade.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = `rgba(2, 5, 14, ${darkness})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-out';
    if (night) {
      const lamp = night.lamp;
      const { x, y } = LK.LIGHTHOUSE;
      // Three passes, each a little wider and fainter, feather the beam's edges.
      for (const [widen, strength] of [[1.22, 0.3], [1.1, 0.45], [1, 1]]) {
        const g = ctx.createRadialGradient(x, y, 30, x, y, lamp.reach);
        g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
        g.addColorStop(0.7, `rgba(0, 0, 0, ${0.9 * strength})`);
        g.addColorStop(1, `rgba(0, 0, 0, ${0.3 * strength})`);
        ctx.fillStyle = g;
        beamPath(ctx, { ...lamp, halfWidth: lamp.halfWidth * widen }, 1);
        ctx.fill();
      }
      for (const ship of night.ships) {
        if (ship.state !== 'sail' && ship.state !== 'fleeing') continue;
        if (ship.harbor) cutLight(ctx, ship.x, ship.y, 26, 0.55);
        if (ship.flash > 0) cutLight(ctx, ship.x, ship.y, 70, ship.flash * 3);
      }
    }
    cutLight(ctx, LK.LIGHTHOUSE.x, LK.LIGHTHOUSE.y, 120, 0.95);
    for (const light of view.lights) cutLight(ctx, light.x, light.y, light.beacon ? 40 : 30, 0.45 + 0.08 * Math.sin(time * 3 + light.flicker));
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawBeamHaze(ctx, lamp, time) {
    const { x, y } = LK.LIGHTHOUSE;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const warm = lamp.focused ? '255, 228, 150' : '255, 196, 110';
    const peak = lamp.focused ? 0.5 : 0.38;
    for (const [widen, share] of [[1.15, 0.35], [1, 1]]) {
      const g = ctx.createRadialGradient(x, y, 10, x, y, lamp.reach);
      g.addColorStop(0, `rgba(${warm}, ${peak * share})`);
      g.addColorStop(0.6, `rgba(${warm}, ${peak * share * 0.45})`);
      g.addColorStop(1, `rgba(${warm}, 0)`);
      ctx.fillStyle = g;
      beamPath(ctx, { ...lamp, halfWidth: lamp.halfWidth * widen }, 1);
      ctx.fill();
    }
    // Dust motes drifting in the light.
    ctx.fillStyle = 'rgba(255, 240, 200, 0.35)';
    for (let i = 0; i < 24; i++) {
      const d = ((i * 97 + time * 30) % lamp.reach) + 20;
      const a = lamp.angle + Math.sin(i * 12.9 + time * 0.3) * lamp.halfWidth * 0.9;
      ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.6, 1.6);
    }
    ctx.restore();
  }

  function drawFog(ctx, night, time) {
    // Each bank is a handful of soft puffs that roll around its centre.
    for (const f of night.fogs) {
      for (let k = 0; k < 6; k++) {
        const a = f.phase + k * 1.05 + time * 0.07;
        const d = f.r * (0.25 + 0.35 * ((k * 37) % 10) / 10);
        const px = f.x + Math.cos(a) * d;
        const py = f.y + Math.sin(a) * d * 0.6;
        const pr = f.r * (0.45 + 0.08 * (k % 3));
        const g = ctx.createRadialGradient(px, py, 4, px, py, pr);
        g.addColorStop(0, 'rgba(176, 192, 210, 0.1)');
        g.addColorStop(0.6, 'rgba(176, 192, 210, 0.05)');
        g.addColorStop(1, 'rgba(176, 192, 210, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      }
    }
  }

  /** Rocks the beam passed over stay outlined for a while, fading. */
  function drawRevealed(ctx, night) {
    const linger = night.stats.revealLinger;
    for (const o of night.reefs.concat(night.icebergs)) {
      if (o.reveal <= 0) continue;
      ctx.strokeStyle = `rgba(255, 226, 160, ${(0.32 * o.reveal) / linger})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawLanterns(ctx, night, time) {
    for (const ship of night.ships) {
      if (ship.state !== 'sail' && ship.state !== 'fleeing') continue;
      if (ship.kind === 'smuggler') continue;
      const color = ship.kind === 'pirate' ? 'rgba(255, 70, 50, 0.85)' : 'rgba(255, 230, 150, 0.95)';
      const bx = ship.x - Math.cos(ship.heading) * ship.r * 0.7;
      const by = ship.y - Math.sin(ship.heading) * ship.r * 0.7;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(bx, by, 2.4 + Math.sin(time * 5 + ship.bob) * 0.4, 0, Math.PI * 2);
      ctx.fill();
      if (ship.harbor && ship.guide <= 0 && Math.abs(ship.drift) > 0.35 && ship.y > 0) {
        ctx.font = 'bold 16px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 170, 120, 0.9)';
        ctx.fillText('?', ship.x, ship.y - ship.r - 8 + Math.sin(time * 4 + ship.bob) * 2);
      }
      if (ship.halt > 0) {
        ctx.strokeStyle = 'rgba(255, 230, 170, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // A lit smuggler or raider shows how close it is to giving up.
    for (const ship of night.ships) {
      if (ship.harbor || ship.state !== 'sail' || ship.exposed <= 0) continue;
      const needed = ship.kind === 'pirate' ? LK.PIRATE.exposeTime : night.stats.exposeTime;
      ctx.strokeStyle = '#b7f08f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, ship.r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, ship.exposed / needed));
      ctx.stroke();
    }
  }

  function drawMonster(ctx, m, night, time) {
    if (m.state === 'lurk' || m.state === 'rest') {
      // Only a slow ripple betrays it.
      const k = (time * 0.6 + m.id) % 1;
      ctx.strokeStyle = `rgba(150, 220, 190, ${0.16 * (1 - k)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, 14 + 30 * k, 8 + 18 * k, m.heading, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    const rise = m.state === 'rise' ? 1 - Math.max(0, m.timer) / LK.MONSTER.riseTime : Math.max(0, m.timer) / 1.3;
    ctx.save();
    ctx.translate(m.x, m.y);
    // Warning rings.
    ctx.strokeStyle = `rgba(120, 255, 170, ${0.5 * rise})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const k = (time * 1.4 + i * 0.5) % 1;
      ctx.beginPath();
      ctx.arc(0, 0, 20 + 50 * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Tentacles curling out of the water.
    ctx.strokeStyle = `rgba(26, 70, 52, ${0.9 * rise})`;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.sin(time * 1.5 + i) * 0.3;
      ctx.lineWidth = 7 - i * 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
      ctx.quadraticCurveTo(Math.cos(a + 0.6) * 34 * rise, Math.sin(a + 0.6) * 34 * rise, Math.cos(a + 0.2) * 46 * rise, Math.sin(a + 0.2) * 46 * rise);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(20, 52, 40, ${0.95 * rise})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22 * rise + 6, 16 * rise + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes.
    ctx.shadowColor = '#7dffb0';
    ctx.shadowBlur = 16;
    ctx.fillStyle = `rgba(150, 255, 180, ${rise})`;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 8, -4, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05140c';
    for (const side of [-1, 1]) ctx.fillRect(side * 8 - 0.8, -6.5, 1.6, 5);
    // How close the light is to driving it off.
    if (m.state === 'rise' && m.lightOn > 0) {
      ctx.strokeStyle = '#ffe39a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, m.lightOn / LK.MONSTER.repelTime));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLighthouse(ctx, lamp, time) {
    const { x, y } = LK.LIGHTHOUSE;
    // Tower, seen from above and a little to the south: striped, tapering up to the lamp room.
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 10, y + 62, 26, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    const stripes = ['#f1ece2', '#b8332b', '#f1ece2', '#b8332b'];
    for (let i = 0; i < 4; i++) {
      const top = y + 8 + i * 13;
      const wTop = 11 + i * 1.6;
      const wBottom = 11 + (i + 1) * 1.6;
      ctx.fillStyle = stripes[i];
      ctx.beginPath();
      ctx.moveTo(x - wTop, top);
      ctx.lineTo(x + wTop, top);
      ctx.lineTo(x + wBottom, top + 13);
      ctx.lineTo(x - wBottom, top + 13);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#2b2f36';
    ctx.fillRect(x - 13, y + 3, 26, 6);
    // The lamp room glowing.
    const glow = ctx.createRadialGradient(x, y - 2, 2, x, y - 2, 40);
    glow.addColorStop(0, 'rgba(255, 245, 200, 1)');
    glow.addColorStop(0.3, 'rgba(255, 210, 120, 0.6)');
    glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 40, y - 42, 80, 80);
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(x, y - 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2f36';
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 8);
    ctx.lineTo(x, y - 17);
    ctx.lineTo(x + 10, y - 8);
    ctx.closePath();
    ctx.fill();
    if (lamp) {
      // The lens points down the beam.
      ctx.strokeStyle = 'rgba(255, 250, 220, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 2);
      ctx.lineTo(x + Math.cos(lamp.angle) * 12, y - 2 + Math.sin(lamp.angle) * 12);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTownLights(ctx, view, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const light of view.lights) {
      const r = light.beacon ? 34 : 24;
      const g = ctx.createRadialGradient(light.x, light.y, 1, light.x, light.y, r);
      g.addColorStop(0, light.beacon ? 'rgba(120, 230, 150, 0.35)' : 'rgba(255, 190, 100, 0.3)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(light.x - r, light.y - r, r * 2, r * 2);
    }
    ctx.restore();
    for (const light of view.lights) {
      const a = 0.75 + 0.25 * Math.sin(time * 3 + light.flicker);
      ctx.fillStyle = light.beacon ? `rgba(120, 220, 140, ${a})` : `rgba(255, 210, 120, ${a})`;
      if (light.beacon) {
        ctx.beginPath();
        ctx.arc(light.x, light.y, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(light.x - 3, light.y - 3, 4, 4);
      }
    }
  }

  /**
   * The whole night frame. night may be null (the title screen's quiet bay), darkness sets how
   * dark the sea is (dawn lifts it), fx the effects to draw.
   */
  function drawNight(ctx, view, night, time, fx, darkness) {
    ctx.drawImage(view.backdrop, 0, 0);
    drawSwell(ctx, time);
    if (night) {
      for (const reef of night.reefs) drawReef(ctx, reef, time);
      for (const ice of night.icebergs) drawIceberg(ctx, ice);
      for (const ship of night.ships) if (ship.state === 'sail' || ship.state === 'fleeing') drawWake(ctx, ship);
      for (const ship of night.ships) if (ship.state === 'sail' || ship.state === 'fleeing') drawShip(ctx, ship, time);
      for (const ball of night.balls) drawBall(ctx, ball);
    }
    drawShade(view, night, time, darkness === undefined ? 0.86 : darkness);
    ctx.drawImage(view.shade, 0, 0);
    if (night) {
      drawBeamHaze(ctx, night.lamp, time);
      drawFog(ctx, night, time);
      drawRevealed(ctx, night);
      drawLanterns(ctx, night, time);
      for (const m of night.monsters) drawMonster(ctx, m, night, time);
      for (const ball of night.balls) {
        ctx.fillStyle = 'rgba(255, 190, 90, 0.8)';
        ctx.fillRect(ball.x - 1.5, ball.y - 1.5, 3, 3);
      }
    }
    drawTownLights(ctx, view, time);
    drawLighthouse(ctx, night ? night.lamp : null, time);
    if (fx) LK.drawEffects(ctx, fx);
  }

  LK.createView = createView;
  LK.drawNight = drawNight;
  LK.drawShip = drawShip;
  LK.drawBeamHaze = drawBeamHaze;
  LK.beamPath = beamPath;
})((globalThis.LK = globalThis.LK || {}));

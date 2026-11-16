// Every sound is made on the spot with the Web Audio API: no sound files. The sea's hush, the
// harbour bell, rocks and cannon, the foghorn's low note, the growl of the thing below, and short
// tunes for dawn, defeat and victory. The browser only allows sound after the first click or key.
(function (LK) {
  'use strict';

  const audio = { ctx: null, master: null, muted: false, hum: null, sea: null };

  function readMuted() {
    try {
      return window.localStorage.getItem('lamplight-muted') === '1';
    } catch (e) {
      return false;
    }
  }

  function writeMuted(value) {
    try {
      window.localStorage.setItem('lamplight-muted', value ? '1' : '0');
    } catch (e) {
      /* storage may be off: sound still toggles for this visit */
    }
  }

  /** Starts the audio graph on the first gesture; safe to call again. */
  function unlockAudio() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.muted = readMuted();
    audio.master.gain.value = audio.muted ? 0 : 0.6;
    audio.master.connect(audio.ctx.destination);
    startSea();
    startHum();
  }

  function toggleMute() {
    audio.muted = !audio.muted;
    writeMuted(audio.muted);
    if (audio.master) audio.master.gain.setTargetAtTime(audio.muted ? 0 : 0.6, audio.ctx.currentTime, 0.05);
    return audio.muted;
  }

  function noiseBuffer(seconds) {
    const ctx = audio.ctx;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = brown * 3.5;
    }
    return buffer;
  }

  /** The sea: looping brown noise, low-passed, its loudness swelling slowly like waves. */
  function startSea() {
    const ctx = audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(4);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    const gain = ctx.createGain();
    gain.gain.value = 0.16;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const depth = ctx.createGain();
    depth.gain.value = 0.08;
    lfo.connect(depth).connect(gain.gain);
    src.connect(filter).connect(gain).connect(audio.master);
    src.start();
    lfo.start();
    audio.sea = gain;
  }

  /** A faint hum that rises while the beam is focused. */
  function startHum() {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 110;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(audio.master);
    osc.start();
    audio.hum = gain;
  }

  function setFocusHum(on) {
    if (!audio.hum) return;
    audio.hum.gain.setTargetAtTime(on ? 0.05 : 0, audio.ctx.currentTime, 0.08);
  }

  function tone(freq, start, length, type, volume, slideTo) {
    const ctx = audio.ctx;
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(audio.master);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }

  function noise(start, length, volume, cutoff, type) {
    const ctx = audio.ctx;
    const t = ctx.currentTime + start;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(length + 0.1);
    const filter = ctx.createBiquadFilter();
    filter.type = type || 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(filter).connect(gain).connect(audio.master);
    src.start(t);
    src.stop(t + length + 0.1);
  }

  const SOUNDS = {
    dock() {
      tone(988, 0, 0.9, 'sine', 0.2);
      tone(1482, 0, 0.6, 'sine', 0.08);
      tone(1318, 0.12, 0.8, 'sine', 0.12);
    },
    wreck() {
      noise(0, 0.7, 0.5, 900);
      tone(90, 0, 0.5, 'sine', 0.35, 40);
      noise(0.1, 1.2, 0.2, 2400, 'bandpass');
    },
    horn() {
      tone(98, 0, 1.7, 'sawtooth', 0.12);
      tone(147, 0, 1.7, 'sawtooth', 0.07);
      tone(73.5, 0.05, 1.6, 'sine', 0.2);
    },
    cannon() {
      noise(0, 0.35, 0.4, 600);
      tone(70, 0, 0.3, 'sine', 0.3, 35);
    },
    splash() {
      noise(0, 0.3, 0.15, 3000, 'bandpass');
    },
    monsterRise() {
      tone(55, 0, 1.4, 'sawtooth', 0.12, 41);
      tone(58, 0.05, 1.3, 'sawtooth', 0.08, 44);
      noise(0, 1.2, 0.12, 300);
    },
    monsterRepelled() {
      tone(330, 0, 0.5, 'triangle', 0.15, 110);
      noise(0, 0.6, 0.2, 1500, 'bandpass');
    },
    monsterGrab() {
      tone(45, 0, 1.0, 'sawtooth', 0.2, 30);
      noise(0, 1.0, 0.4, 700);
    },
    chased() {
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.25, 'triangle', 0.12));
    },
    plunder() {
      tone(220, 0, 0.4, 'square', 0.08, 110);
      noise(0, 0.3, 0.2, 1200);
    },
    spotted() {
      tone(1760, 0, 0.18, 'sine', 0.04);
    },
    trustLost() {
      tone(196, 0.15, 0.6, 'triangle', 0.15, 147);
    },
    rescued() {
      [659, 880].forEach((f, i) => tone(f, i * 0.1, 0.3, 'sine', 0.12));
    },
    arrive() {
      tone(587, 0, 0.5, 'sine', 0.03);
    },
    nightStart() {
      [0, 0.45, 0.9].forEach((t) => tone(523, t, 1.2, 'sine', 0.12));
    },
    nightClear() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.9, 'triangle', 0.12));
    },
    pick() {
      tone(784, 0, 0.2, 'triangle', 0.15);
      tone(1175, 0.08, 0.4, 'triangle', 0.12);
    },
    click() {
      tone(660, 0, 0.08, 'square', 0.05);
    },
    gameOver() {
      [392, 349, 311, 262].forEach((f, i) => tone(f, i * 0.3, 0.8, 'triangle', 0.14));
    },
    victory() {
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.14, 0.7, 'triangle', 0.13));
    },
  };

  /** Plays a named sound if sound is on. */
  function play(name) {
    if (!audio.ctx || audio.muted || !SOUNDS[name]) return;
    SOUNDS[name]();
  }

  /** The sounds for a step's rule events. */
  function playEvents(events) {
    const heard = new Set();
    for (const e of events) {
      const name = e.type === 'trustLost' ? 'trustLost' : e.type;
      if (heard.has(name)) continue;
      heard.add(name);
      play(name);
    }
  }

  LK.unlockAudio = unlockAudio;
  LK.toggleMute = toggleMute;
  LK.playSound = play;
  LK.playEvents = playEvents;
  LK.setFocusHum = setFocusHum;
  LK.isMuted = () => audio.muted;
})((globalThis.LK = globalThis.LK || {}));

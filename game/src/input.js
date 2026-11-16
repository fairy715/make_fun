// Mouse, keyboard and touch, turned into the keeper's intent: where the beam should point, whether
// it is focused, the foghorn, and clicks and keys for the screens. Pointer positions are mapped
// into the game's own 1280 x 720 field, whatever size the canvas is shown at.
(function (LK) {
  'use strict';

  function createInput(canvas) {
    const input = {
      pointer: null, // last pointer position in field coordinates
      mouseFocus: false,
      keyFocus: false,
      touchFocus: false,
      hornQueued: false,
      turnLeft: false,
      turnRight: false,
      clicks: [], // field positions of presses, for the screens
      keys: [], // key presses, for the screens
      touch: false,
    };

    function toField(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * LK.VIEW.width,
        y: ((event.clientY - rect.top) / rect.height) * LK.VIEW.height,
      };
    }

    function touchButtonAt(p) {
      for (const key of Object.keys(LK.TOUCH_BUTTONS)) {
        const b = LK.TOUCH_BUTTONS[key];
        if (Math.hypot(p.x - b.x, p.y - b.y) < b.r) return key;
      }
      return null;
    }

    const touchFocusIds = new Set();

    canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      LK.unlockAudio();
      const p = toField(event);
      if (event.pointerType === 'touch') {
        input.touch = true;
        const button = touchButtonAt(p);
        if (button === 'focus') {
          touchFocusIds.add(event.pointerId);
          input.touchFocus = true;
          return;
        }
        if (button === 'horn') {
          input.hornQueued = true;
          return;
        }
      }
      input.pointer = p;
      input.clicks.push(p);
      if (event.button === 2) input.hornQueued = true;
      else if (event.pointerType !== 'touch') input.mouseFocus = true;
    });

    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch' && touchFocusIds.has(event.pointerId)) return;
      input.pointer = toField(event);
    });

    function release(event) {
      if (touchFocusIds.delete(event.pointerId)) input.touchFocus = touchFocusIds.size > 0;
      if (event.button === 0 || event.pointerType === 'mouse') input.mouseFocus = false;
    }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    window.addEventListener('keydown', (event) => {
      LK.unlockAudio();
      const key = event.key.toLowerCase();
      if ([' ', 'arrowleft', 'arrowright', 'arrowup'].includes(key)) event.preventDefault();
      if (event.repeat) return;
      if (key === ' ') input.hornQueued = true;
      if (key === 'a' || key === 'arrowleft') input.turnLeft = true;
      if (key === 'd' || key === 'arrowright') input.turnRight = true;
      if (key === 'w' || key === 'arrowup' || key === 'shift') input.keyFocus = true;
      input.keys.push(key);
    });

    window.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') input.turnLeft = false;
      if (key === 'd' || key === 'arrowright') input.turnRight = false;
      if (key === 'w' || key === 'arrowup' || key === 'shift') input.keyFocus = false;
    });

    window.addEventListener('blur', () => {
      input.mouseFocus = false;
      input.keyFocus = false;
      input.turnLeft = false;
      input.turnRight = false;
    });

    return input;
  }

  /**
   * The keeper's intent for this step. Keyboard turning takes over the aim while a turn key is held;
   * otherwise the beam follows the pointer.
   */
  function readKeeper(input) {
    const turn = (input.turnRight ? 1 : 0) - (input.turnLeft ? 1 : 0);
    const horn = input.hornQueued;
    input.hornQueued = false;
    return {
      aim: turn === 0 && input.pointer ? LK.aimAt(input.pointer.x, input.pointer.y) : null,
      turn,
      focus: input.mouseFocus || input.keyFocus || input.touchFocus,
      horn,
    };
  }

  /** Takes the clicks and keys queued since the last call. */
  function drainPresses(input) {
    const presses = { clicks: input.clicks, keys: input.keys };
    input.clicks = [];
    input.keys = [];
    return presses;
  }

  LK.createInput = createInput;
  LK.readKeeper = readKeeper;
  LK.drainPresses = drainPresses;
})((globalThis.LK = globalThis.LK || {}));

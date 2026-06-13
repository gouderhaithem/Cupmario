// Fixed-timestep game loop (accumulator pattern). update() runs at a fixed dt
// so physics is frame-rate independent; render() runs once per animation frame.

/** Logic ticks per second. Physics constants are tuned for this rate. */
export const FPS = 60;
const STEP_MS = 1000 / FPS;
/** Cap accumulated time so a backgrounded tab can't trigger a huge catch-up. */
const MAX_FRAME_MS = 250;

export interface Loop {
  stop: () => void;
}

/**
 * Start a fixed-timestep loop. `update` is called zero or more times per frame
 * to consume accumulated time; `render` is called once per frame.
 */
export function startLoop(update: () => void, render: () => void): Loop {
  let raf = 0;
  let last = performance.now();
  let acc = 0;

  const frame = (now: number): void => {
    acc += Math.min(now - last, MAX_FRAME_MS);
    last = now;
    while (acc >= STEP_MS) {
      update();
      acc -= STEP_MS;
    }
    render();
    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return { stop: () => cancelAnimationFrame(raf) };
}

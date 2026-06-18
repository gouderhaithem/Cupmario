// Render-scoped art-style context. The sprite modules keep their original
// public function names (render.ts is style-agnostic); each one checks
// `isCuphead()` at the top and delegates to its rubber-hose variant. This keeps
// the dispatch out of render.ts and leaves the mario path completely untouched.
//
// `draw()` calls setRenderStyle() once per frame before painting anything.

import type { Style } from '../types';

let currentStyle: Style = 'cuphead';
let boilEnabled = true;

/** Set the active style for this frame. Boil (line wobble) is off under reduced motion. */
export function setRenderStyle(style: Style, reducedMotion: boolean): void {
  currentStyle = style;
  boilEnabled = !reducedMotion;
}

/** True when the rubber-hose (cuphead) sprite path should be used. */
export function isCuphead(): boolean {
  return currentStyle === 'cuphead';
}

/** True when outlines should "boil" (jitter frame-to-frame); false under reduced motion. */
export function boilOn(): boolean {
  return boilEnabled;
}

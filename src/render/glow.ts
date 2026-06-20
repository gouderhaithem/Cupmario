// Cached radial-glow sprites. Creating a CanvasGradient every frame (one per
// firefly / mote / halo) churns the GC and stutters on mobile. A glow whose
// colour profile is fixed and whose only per-frame change is position/alpha can
// instead be pre-rendered once to a small offscreen canvas and blitted with
// drawImage — no per-frame allocation. Keyed by (radius + stops), so identical
// glows share one sprite for the life of the page.

const cache = new Map<string, HTMLCanvasElement>();

/** Colour stops for a radial gradient: `[offset 0..1, css colour]`. */
export type GlowStop = readonly [number, string];

/**
 * Return a cached `radius*2` square canvas holding a radial glow (centre →
 * edge per `stops`). Blit it centred with `ctx.drawImage(sprite, cx - r, cy - r)`;
 * set `ctx.globalAlpha` beforehand for per-instance fade.
 */
export function glowSprite(radius: number, stops: readonly GlowStop[]): HTMLCanvasElement {
  const r = Math.max(1, Math.ceil(radius));
  const key = `${r}|${stops.map((s) => `${s[0]}:${s[1]}`).join(',')}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = r * 2;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (g) {
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    for (const [offset, colour] of stops) grd.addColorStop(offset, colour);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  }
  cache.set(key, c);
  return c;
}

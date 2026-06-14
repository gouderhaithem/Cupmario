# Manual Test Plan — Phase 13 (Tune & Verify)

Play the game at **http://localhost:5173** (`npm run dev` if it's down) and walk
this list top to bottom. Tick boxes as you go; jot feel notes in the **13.1**
section at the bottom — those become `constants.ts` / level-JSON tuning.

> Goal of this pass: confirm 13.2–13.4 work, smoke-test that nothing in the V1
> slice broke, and capture how the game _feels_ so we can tune it.

---

## 0. Controls (reference)

- **Move:** ← → / A D · **Jump:** Space / ↑ / W · **Down (duck / fast-fall):** ↓ / S
- **Shoot:** (your shoot key) · **Dash:** (dash key) · **Super/EX:** (super key) · **Switch weapon:** (switch key)
- **Parry:** jump into a pink bolt / pink orb · **Pause:** Esc / P
- On menus: any of Space/Enter/→/↑/W advances · **Down** opens Stage Select.

---

## 1. New this phase — verify the 13.2 / 13.3 / 13.4 work

### 13.2 — Breather-card label (the bug we fixed)

- [ ] Clear **Level 1** by reaching the flag → card reads **"LEVEL 1 CLEAR!"** and the next line says **"NEXT · LEVEL 2"**.
- [ ] Play into **ROOTKIT** and beat it → breather card reads **"ROOTKIT DOWN!"** and the next line points to the correct next stage (**"NEXT · LEVEL 3"**), **not** a stale "LEVEL 2 / NEXT 3".
- [ ] Coins / score / grade / time on the card all look right.

### 13.3 — Reduced-motion toggle

- [ ] Pause (Esc) → menu now lists **RESUME / DIFFICULTY / VOLUME / REDUCED MOTION / QUIT**.
- [ ] Set **REDUCED MOTION: ON** (←/→ or Space on that row), resume, take a hit / stomp an enemy → **no screen shake**.
- [ ] With it ON, the **film-grain + vignette are gone** (image looks flat/clean).
- [ ] Toggle it **OFF** → shake + grain/vignette return. The setting **survives a page reload**.

### 13.4 — Difficulty modes

- [ ] Open **Stage Select** (Down from the title) → footer shows **DIFFICULTY: NORMAL** and a "← → DIFFICULTY" hint.
- [ ] Press ←/→ → it cycles **ASSIST ↔ NORMAL** only. **EXPERT is hidden/locked** (you haven't cleared the campaign yet).
- [ ] Difficulty can also be changed in the **pause menu**, and the choice **survives a reload**.
- [ ] **ASSIST:** start a run → extra HP pip in the HUD; incoming bolts are visibly slower; clearing a stage caps the grade at **A** (no S/S+).
- [ ] **EXPERT unlock:** after a full campaign clear (see §3), Expert appears in the cycle. On Expert, enemy bolts are **faster** and boss attacks **telegraph for less time**.

---

## 2. Core-mechanics smoke (did anything regress?)

- [ ] **Run/jump/duck:** movement feels responsive; duck slows you + squashes the sprite; fast-fall (down in air) drops faster.
- [ ] **Coyote time / jump buffer:** you can still jump a hair after leaving a ledge, and a slightly-early jump press still fires on landing.
- [ ] **Coins:** pickup counts up; HUD coin counter matches.
- [ ] **Enemies:** walkers patrol + turn at walls/ledges; **stomp** kills + bounces (+ combo if chained); side/below contact costs HP.
- [ ] **Spitter / Turret / Flyer:** they fire/patrol as expected; their bolts hurt.
- [ ] **`?` / weapon blocks:** bump from below → coin / mushroom; block becomes spent.
- [ ] **Mushroom:** grants the next weapon; weapon HUD shows `name x/total`; **switch weapon** cycles them.
- [ ] **Crumbling + moving platforms:** crumbles fall shortly after you stand on them; movers carry you and you don't tunnel through.
- [ ] **Checkpoints:** touching one re-lights it; dying respawns you there (not level start).
- [ ] **Pit death / fall:** falling in a pit costs a life; respawn is correct.
- [ ] **Lives → game over:** losing all lives shows the game-over screen with coins/score.
- [ ] **Best score** persists across a reload.

### Combat depth

- [ ] **Dash** gives i-frames (dash through a bolt unharmed mid-dash); has a cooldown.
- [ ] **Parry:** jumping into a **pink** bolt/orb bounces you, fills a Super card, grants brief i-frames.
- [ ] **Charge gun:** holding fire charges; released shot is bigger/stronger.
- [ ] **EX move (1 card)** fires; **MEGABLAST** at a full 5-card meter triggers the white flash.
- [ ] **Parry-traversal orbs:** the L2 pink-orb gap is crossable by parrying mid-air.

### Bosses

- [ ] **READY? → FIGHT!** intro card shows; boss waits before attacking.
- [ ] HP bar + per-phase pips deplete; phases transition.
- [ ] Attacks **telegraph** before firing (flash/warning line).
- [ ] **`laserSweep`:** you can survive by ducking under the beam **or** standing on a platform.
- [ ] **Death = instant retry** on the boss (no life cost); "RETRY!" pops.
- [ ] Boss KO → **WALLOP! / A KNOCKOUT!** card → breather/win.

---

## 3. Full-campaign run (pacing + Expert unlock)

Play the whole sequence in one sitting on **Normal**:

`L1 · L2 · ROOTKIT · L3 · SPECTRA · THE OVERCLOCK`

- [ ] Run levels that lead into a boss **funnel straight into the arena** (no menu in between).
- [ ] Finishing **THE OVERCLOCK** shows the **win screen** (SYSTEM PURGED!) with final grade/score/time.
- [ ] After the win, **EXPERT** is now selectable in the difficulty cycle.
- [ ] **Boss Rush** (from Stage Select) plays all three bosses back-to-back.

---

## 4. Audio / pause sanity

- [ ] Music plays during `play` and boss fights; **stops** on every screen change (title, levelup, game over, win, pause-quit).
- [ ] SFX fire for jump / coin / stomp / die / levelup / win without clipping or overlapping long tones.
- [ ] **Volume** slider in pause changes loudness live and persists across reload.
- [ ] Pausing freezes gameplay; resuming doesn't make Pip drift from held keys.

---

## 13.1 — Feel notes (fill this in — drives tuning)

Rate 1–5 (1 = bad, 5 = great) and add a sentence. These map to `constants.ts`.

| Thing to feel                                          | Rating | Notes / what felt off |
| ------------------------------------------------------ | ------ | --------------------- |
| **L2 parry-gap** — reliably crossable?                 |        |                       |
| **`laserSweep` window** — duck/platform timing fair?   |        |                       |
| **Boss HP** — too spongy / too fragile?                |        |                       |
| **Boss attack cadence** — too fast / too slow?         |        |                       |
| **Boss telegraph length** — enough warning?            |        |                       |
| **Jump height / gravity** — floaty or heavy?           |        |                       |
| **Run speed / accel / friction** — snappy or sluggish? |        |                       |
| **Dash distance + cooldown**                           |        |                       |
| **Level time limit** (75s) — too tight / too loose?    |        |                       |
| **Overall difficulty curve** L1→OVERCLOCK              |        |                       |
| **Expert mode** — meaningfully harder, still fair?     |        |                       |

**Anything broken / confusing / annoying (free-form):**

-
-
- ---mak

When this is filled in, hand it back and I'll fold the findings into
`constants.ts` / the level JSON to close **13.1**, then move on to **Phase 14**.

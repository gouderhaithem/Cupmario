# Plan: Full shared-world online co-op

Upgrade the existing "live-partner" co-op (parallel worlds, ghost partner) into a
**true shared world**: one world both players live in — same enemies, coins, and
**one shared boss** both damage, advancing together. This is the NSMB-style co-op.

Status: **planned, not yet implemented.** The live-partner model (engine/net.ts,
engine/lobby.ts, game/coop.ts, state.coop) ships today and stays the fallback
until this lands.

## Why it's big

Measured coupling: ~27 files read `state.player` / `state.keys`; the per-player
*controller* fields (`combo`, `shootLatch`/`dashLatch`/`jumpLatch`/`superLatch`/
`parryLatch`, `shootCd`, `coyote`, `jumpBuffer`, `jumping`, `wallJumpLock`,
`switchLatch`, `charge`, `weapons`, `weaponIdx`, `superCards`, `dashTap`,
`aimX`/`aimY`) live on the *global* `state`. Two players need two of each — so
those fields must move into a per-player struct threaded through the systems.

## Architecture: host-authoritative full simulation

- **Host** runs the single, authoritative world: both players + all entities +
  physics, using the existing fixed-timestep loop.
- **Guest** sends only its inputs (Keys + aim + edge events) and renders the
  full-world snapshot the host broadcasts each tick. No simulation on the guest
  (client-side prediction for the guest's own Pip is a later polish, Phase E).
- Chosen over lockstep determinism: robust to any nondeterminism (Math.random in
  patterns/FX), no added input-delay coupling.

### Data model

Introduce a per-player **Pawn**; world state stays on `state`.

```
interface Pawn {
  player: Player;        // already exists (x/y/hp/face/dash… per player)
  keys: Keys;
  // controller/transient — moved off global state:
  jumpLatch, coyote, jumpBuffer, wallJumpLock, jumping: number/boolean;
  shootLatch, shootCd, dashLatch, dashTap, switchLatch: …;
  charge: number; weapons: WeaponId[]; weaponIdx: number;
  superLatch, superCards, parryLatch: …;
  combo: number;
  aimX, aimY: number;
  runHits, runParries, runSupers: number; // grade stats, per pawn
}
state.players: Pawn[]   // [p0] in single-player; [p0,p1] in co-op
```

Stays shared on `state`: level, enemies, projectiles, parryOrbs, mushrooms,
checkpoints, crumbles, movers, hazards, boss, coins[], score, coin count, lives,
camX, shake, hitstop, flash, burn, timeLeft, bossKo/bossIntro, frame, screen,
pops/puffs/sparks, options.

### Signature changes (thread a Pawn)

`updatePlayer(state, pawn)`, `updateDash(state, pawn)`, `updateWall(state, pawn)`,
`tryParry(state, pawn)`, `updateSuper(state, pawn)`, `bumpBlocks(state, pawn)`,
`currentWeapon(pawn)`, `fireWeapon(state, pawn, …)`, `aimVector(state, pawn)`.
Per-player interaction loops: enemy stomp/hurt, coin pickup, checkpoint touch,
mover/crumble carry, hazard contact, boss contact — iterate every pawn.

## Phases (each keeps build+tests green and single-player identical)

- **A — Controller refactor. ✅ DONE.** Extracted `Pawn` + `state.players=[pawn0]`
  in `state.ts`; the per-player fields are re-exposed as `state.X` via accessor
  proxies (`attachPawnProxies`) so the ~20 solo read/reset sites (render, hud,
  input, flow, enemy, boss, coin, checkpoint…) stayed untouched. Threaded an
  explicit `Pawn` through `player.ts`, `dash.ts`, `wall.ts`, `super.ts`,
  `parry.ts`, `blocks.ts`, `weapons.ts` (`currentWeapon(pawn)`); `main.ts` loops
  `state.players`. Tests updated (dash, wall) + new `player.pawn.test.ts`.
  Build green, 92 tests pass, boots clean, single-player unchanged.
  *Next: Phase B can add `players[1]` and a tethered camera. The proxies are a
  scaffold — once interaction sites (enemy/coin/etc.) iterate pawns, they can go.*
- **B — Multi-pawn world + tethered camera. ✅ DONE.** `addPawn`/`removeExtraPawns`
  in state.ts. Camera frames the pawn-group midpoint and tethers both to the
  viewport (guarded for >1 pawn, so solo is byte-identical). Renderer draws every
  pawn (pawn 0 = level skin, co-op pawns = `COOP_PARTNER_SKIN`). Non-lethal
  interactions iterate pawns: `coin`, `checkpoint`, `mushroom` (per-pawn weapon
  unlock), `mover`, `crumble`. Tests in `coop.pawn.test.ts`. 96 tests pass.
  **Deferred to Phase D (combat/rules):** enemy contact (stomp/hurt), projectile/
  hazard/orb/boss damage, and `hitPlayer`/`loseLife` are still pawn-0-only —
  these get made pawn-aware alongside the per-player-lives + respawn rules.
- **C — Networking → host-authoritative. ✅ DONE (needs live two-peer test).**
  Rewrote `coop.ts`: on connect both clients `addPawn` ([0]=host, [1]=guest);
  host runs the one sim and ships a `Snapshot` (types.ts) ~30 Hz; guest streams
  `{t:'input'}` and applies snapshots via `applySnapshot`, with `main.ts` gating
  out the guest's local sim (`coopIsGuest()`). Guest follows host stage changes.
  Dropped the live-partner ghost; both pawns now render as real players with
  P1/P2 tags. `CoopState` slimmed to `{active, role}`. Round-trip covered by
  `coop.snapshot.test.ts`. Build green, 99 tests, boots clean.
  **Caveats:** verified only by tests + boot — the actual two-peer handshake/feel
  is the user's manual test. Guest can't double-tap-dash (gesture isn't relayed;
  dash key works). Combat/flag still pawn-0 (Phase D) so only the host can take
  damage / clear; that's expected until D.
- **D — Combat + rules. ✅ DONE (shared lives interim).** `hitPlayer(state, pawn)`
  is pawn-aware; enemy contact, enemy bolts, beams, hazards, orbs, and boss
  contact all resolve per-pawn. Enemy/boss AI (`aimAt`, charger, bomber/turret/
  mortar/shooter, lumber track) targets the **nearest pawn** (`nearestPawn`).
  Stomp combo is per-pawn. `respawnExtraPawns` brings every pawn back beside
  pawn 0 on level load / boss entry / retry / death, so both spawn into the boss
  arena together. Either pawn reaching the flag clears; any pawn in a pit costs a
  life. **Shared boss now works: both fire into the one shared boss, combined
  damage, KO advances both** — the original report is fixed. 103 tests pass.
  **Per-player lives + two-player HUD — ✅ DONE (follow-up commit).** Each pawn
  has its own `lives` + `down` (spectator) flag; a fallen pawn spends its own
  life and respawns beside the partner, sits out when empty, and the run ends
  only when all are down (spectators skipped by sim/camera/render/damage; revive
  on next stage; boss revives a fallen pawn without resetting the shared boss).
  HUD shows a compact P1/P2 HP+lives card in co-op; snapshot carries per-pawn
  HUD state. Single-player unchanged. 109 tests.
  **Verified live by the user:** connection works (after the JSON-serialization
  fix), moving platforms/entities sync. Remaining: ongoing live playtest of the
  per-player-lives/HUD + latency feel; optional guest-side prediction.
- **E — Polish.** Guest-side prediction + interpolation, disconnect/host-migration,
  lobby copy, grade handling in co-op.

## Design decisions (locked with the user)

| Topic | Decision |
|-------|----------|
| Lives | **Per-player.** Each pawn owns its own life count. A pawn at 0 lives is "down"/spectating; the run continues while any pawn has lives. Game over only when **all** pawns are down. (Revive rule on stage advance: TBD in Phase D — likely revive downed pawn with 1 life on the next stage.) |
| Camera / separation | **Tether to one screen.** Camera frames both pawns; neither may leave the viewport away from the other (soft wall). No split-screen. |
| Level clear | **Either reaches the flag** clears it for both; both advance. |
| Death / respawn | **Respawn near the partner** after a brief beat, costing the dying pawn one of *its own* lives. Only a total wipe stalls; if the dying pawn has 0 lives left it stays down instead. |

## Risks

- Snapshot size/rate at 60fps — start ~20–30Hz + interpolation; optimize to deltas if needed.
- Guest input latency without prediction (Phase E mitigates).
- Grade/S-rank semantics undefined for 2 players — likely disable S-rank in co-op.

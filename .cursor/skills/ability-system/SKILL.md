---
name: ability-system
description: Hell bonus abilities — Portal, Divine Charge, Divine Wrath. All values from server_config.json. Use when implementing or tuning bonus abilities, proc chances, or ability unlocks.
---

# Ability System

Abilities unlock during Hell bonus and persist for the **entire bonus** (never lost). All values in `server_config.json` — no hardcoded gameplay numbers.

**Scope:** Abilities are **bonus-only**. Main-game combat uses the same movement model (see `angel-system`) but has no ability procs.

## Acquisition

| Trigger | Reward |
|---------|--------|
| Bonus start | `startingAbilitiesMin`–`startingAbilitiesMax` random abilities |
| Every `killsPerUnlock` demon kills (settled at **end of battle**) | `unlockAbilitiesMin`–`unlockAbilitiesMax` random abilities + `freespinsAwardedPerUnlock` |

Settlement is deferred until the board has no demons left. During the hunt the meter may show overflow (e.g. `32/30`); after settlement it shows the remainder (e.g. `2/30`). See `retrigger-system` skill.

Level-up can replace new ability (e.g. Portal L1 → L2).

## Portal

Injects demons **before spin**, before wave animation. No spawn on occupied cells or existing demons.

| Level | Normal | Multiplier |
|-------|--------|------------|
| 1 | 1 | 1 |
| 2 | 2 | 2 |

```json
"portal": { "1": { "normalDemons": 1, "multiplierDemons": 1 }, "2": { ... } }
```

VFX: Hell portals open, demons emerge.

## Divine Charge

Evaluated **per demon on the hunt path** (design-faithful). Server rolls independently for each path demon; client plays charge VFX when that step procs.

**Timing:** Charge happens **before** the angel flies to the next demon — **not** mid-flight. Angel holds position, charges up (~2.5s presentation), then high-speed launch to target with Matrix-style trail, heavy impact (shake, explosion, gore).

**Always guarantees loot** when it procs.

| Level | Chance | Loot multiplier |
|-------|--------|-----------------|
| 1 | 20% (configurable) | 5× |
| 2 | 20% (configurable) | 10× |

```json
"divineCharge": { "1": { "chance": 0.20, "lootMultiplier": 5 } }
```

### Server contract

Tag matching `heroPath` steps so client can sync presentation:

```json
{ "reel": 2, "row": 3, "banana": true, "divineChargeProc": true, "divineChargeLootMultiplier": 5 }
```

- Roll per path demon kill, not once per hunt action.
- Target is the demon on that path step (no random post-hunt extra kill).
- `divineChargeProc: true` only when charge procs for that step.
- Wrath may kill demons still on the planned path; those steps get `wrathPreKilled: true` then are **removed from `heroPath`**. `heroFinalPosition` is recalculated to the last real kill — angel never paths to wrath-pre-killed cells. Kill credit and loot stay on the wrath kill entry.

### Presentation reference

Diablo 2 Paladin Divine Charge: wind-up at standstill, then explosive rush to target. Charge VFX is woven into `animateHeroHunt` — not a separate post-hunt replay.

## Divine Wrath

Evaluated **when a demon is killed**. AoE divine strike destroys nearby demons instantly. Each Wrath kill guarantees loot.

| Level | Area | `radius` |
|-------|------|----------|
| 1 | 3×3 | 1 |
| 2 | 5×5 | 2 |

```json
"divineWrath": { "1": { "chance": 0.20, "radius": 1 } }
```

## Charge + Wrath Synergy

Same kill triggers both → **Charge first** (pre-flight wind-up, then launch). Wrath kills inherit Charge's loot multiplier.

Example: Charge 5× + Wrath kills 4 demons at 1 coin each → `4 × 5 = 20` (primary high-volatility combo).

## Config Root (example)

```json
{
  "killsPerUnlock": 20,
  "startingAbilitiesMin": 1, "startingAbilitiesMax": 2,
  "unlockAbilitiesMin": 1, "unlockAbilitiesMax": 2,
  "portal": {}, "divineCharge": {}, "divineWrath": {}
}
```

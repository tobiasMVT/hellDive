---
name: chest-system
description: Heaven/Hell chest drops, queued chestreward action, expanding reel chest rewards, and client chest presentation. Use when editing HellDive chest config, chestreward flow, or chest visuals.
---

# Chest System

HellDive chests are a Heaven/Hell bonus feature. Demons queue chest drops during combat; queued chests open only after the board is clear.

## Server Flow

```text
Demon kill
-> normal loot roll
-> chest drop roll
-> chest stored in heavenHell.bonus.pendingChests[]

Board clears
-> nextAction = chestreward
-> queued chests resolve in order
-> rewards apply immediately
-> resume freerespin or settle bonus
```

## Main Files

- `src/game-server/lib/chestSystem.js`
- `src/game-server/game-server/gameServerBonusActionMethods.js`
- `src/game-server/server_config.json`
- `src/game-client/client/clientActionMethods.js`
- `src/game-client/game-scene/gameSceneHeavenHellMethods.js`

## Config Surface

All config lives under `server_config.json > heavenHell > bonus`.

### Drop config

```json
"chests": {
  "initialReelCount": 1,
  "maxReels": 6,
  "dropChance": {
    "normal": 0.02,
    "multiplier": 0.08,
    "boss": 1.0
  },
  "respinChanceByReelCount": {
    "1": 0.5,
    "2": 0.4,
    "3": 0.3,
    "4": 0.2,
    "5": 0.1,
    "6": 0.05
  }
}
```

### Chest types

Each entry in `chestTypes` supports:

- `dropWeight`
- `presentation`
- `symbolWeights`
- `rewardTable`

`symbolWeights` contains all reveal symbols, including `respin` and `respinReel`.

`rewardTable` is keyed by symbol and usually contains weighted `{ value, weight }` arrays.

## State Shape

Persistent Heaven/Hell chest state lives in `gameState.heavenHell.bonus`:

- `pendingChests`
- `nextChestId`
- `chestsRewarded`
- `chestRewardResumeAction`

Per-action payloads:

- `chestEventsThisAction`
- `chestActionSummary`

Legacy mirror counters also stay synced on `gameState.bonusState`:

- `chestsPending`
- `chestsRewarded`

## Reward Rules

- `coin`, `diamond`: added to battlefield loot immediately
- `freeSpin`: added to `bonusState.finalFreespins` immediately
- `divineStrike`, `divineX`, `divineCharge`: applied to Heaven/Hell ability levels immediately
- `respin`, `respinReel`: continue chest sequence only, never grant loot directly

## Client Notes

`Client.js` decides when the chest action runs.

`gameSceneHeavenHellMethods.js` handles:

- chest drop highlight
- angel move-to-chest
- simple reel tick/reveal panels
- reward pop / battlefield landing
- final UI sync for freespins and abilities

Keep reward math on the server. Keep chest visuals in the scene.

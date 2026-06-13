# Heaven Hell

Owns the Hell bonus presentation layer.

## Owns

- Heaven/Hell background swap
- portal aura and ripple spawn
- angel portal dive / arrival / charge / wrath FX
- loot ground rendering and loot collect phase
- Heaven/Hell kill meter and ability panel

## Main Entry Points

- `updateHellDiveBackground(...)`
- `playHeavenHellBonusEntryPortalTransition(...)`
- `playHeavenHellRippleSpawn(...)`
- `syncHeavenHellLootGround(...)` / `renderHeavenHellLootGround(...)` (incremental add only)
- `clearHeavenHellLootGround(...)` (bonus exit + collect phase only)
- `playHeavenHellCollectPhase(...)`
- `updateHeavenHellAbilityText(...)`

## Shared State

- `heavenHellLootSprites`
- `heavenHellRenderedLootKeys`
- `heavenHellPortalAura`
- `_mainGamePortalSprite` / `_mainGamePortalMaskSprite` (main-game portal GIF behind reels)
- `_heavenHellMeterUi`
- `_heavenHellMeterRuntime`
- `_heavenHellActiveGameState`

## Main-Game Portal Background

Tuned via `gameClientConfig.layout.mainGamePortal`:

| Key | Purpose |
|-----|---------|
| `enabled` | Toggle portal GIF |
| `replaceDot` | When true, portal replaces the red kill dot |
| `anchor.reel/rowA/rowB/offsetX/offsetY` | Shared grid anchor for portal + soul FX |
| `dot.offsetX/Y`, `dot.radius` | Portal anchor fine-tune (red dot only when `replaceDot: false`) |
| `portal.offsetX/Y`, `portal.scale`, `portal.alpha`, `portal.depth` | Extra nudge, base size, opacity, draw order |
| `mask.enabled` | Set `true` for circular soft clip; `false` shows full GIF while tuning |
| `mask.radius` | Circular clip outer radius (px) |
| `mask.edgeSoftness` | 0–1 fade band width at mask edge |
| `mask.innerHold` | 0–1 solid opaque center fraction before fade |

Hidden during bonus (`isInBonusMode`). Animated with `gifuct-js` frame decoding into a Phaser canvas texture.

## Boundary

`Client.js` still decides when Heaven/Hell phases happen. This module only renders them.

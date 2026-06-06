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
- `renderHeavenHellLootGround(...)`
- `playHeavenHellCollectPhase(...)`
- `updateHeavenHellAbilityText(...)`

## Shared State

- `heavenHellLootSprites`
- `heavenHellPortalAura`
- `_heavenHellMeterUi`
- `_heavenHellMeterRuntime`
- `_heavenHellActiveGameState`

## Boundary

`Client.js` still decides when Heaven/Hell phases happen. This module only renders them.

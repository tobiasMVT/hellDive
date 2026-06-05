# HellDive Agent Guide

## Edit Scope

Allowed write scope:
- `src/game-server/**`
- `src/game-client/**`

Do not modify files outside these folders unless the user explicitly requests it (e.g. `.cursor/skills/` maintenance).
Read access is allowed anywhere.

## Domain Knowledge

Read `.cursor/skills/` for HellDive design and architecture. Start with `helldive-overview`, then open the system-specific skill as needed.

| Skill | When |
|-------|------|
| `helldive-overview` | New task, unsure where to look |
| `client-architecture` | Client.js, GameScene.js, segment flow |
| `combat-system` | Post-win combat, demon kills |
| `angel-system` | Angel position, Wild mechanic |
| `loot-system` | Drops, Collect Phase payout |
| `ability-system` | Portal, Divine Charge, Divine Wrath |
| `retrigger-system` | Kill meter, end-of-battle retrigger +2 FS, ability unlock settlement |

Also read `.md` files in `game-server` and `game-client`, and `GAME_SUMMARY.md` for prototype context.

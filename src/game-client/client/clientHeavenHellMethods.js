export function createClientHeavenHellMethods() {
  return {
    isHeavenHellEnabled(gameState = {}) {
      return gameState?.heavenHell && typeof gameState.heavenHell === "object";
    },

    async playHeavenHellCollectPhaseIfNeeded(gameState = {}) {
      if (!this.isHeavenHellEnabled(gameState) || gameState?.nextAction !== "spin") return;
      const settledDrops = Array.isArray(gameState?.heavenHell?.bonus?.lootGroundSettled)
        ? gameState.heavenHell.bonus.lootGroundSettled
        : [];
      if (settledDrops.length === 0) return false;
      await this.scene.playHeavenHellCollectPhase?.(gameState);
      return true;
    }
  };
}

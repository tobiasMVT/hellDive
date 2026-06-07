export function createClientHeavenHellMethods() {
  return {
    isHeavenHellEnabled(gameState = {}) {
      return gameState?.heavenHell && typeof gameState.heavenHell === "object";
    },

    hasPendingHeavenHellChests(gameState = {}) {
      if (!this.isHeavenHellEnabled(gameState)) {
        return false;
      }
      return (gameState?.heavenHell?.bonus?.pendingChests?.length || 0) > 0;
    },

    getHeavenHellAbilityUnlockEvents(gameState = {}) {
      if (!this.isHeavenHellEnabled(gameState) || gameState?.isBonus !== true) {
        return [];
      }
      const procs = Array.isArray(gameState?.heavenHell?.bonus?.abilityProcsThisAction)
        ? gameState.heavenHell.bonus.abilityProcsThisAction
        : [];
      return procs.filter((entry) =>
        entry &&
        (entry.type === "abilityUnlock" || entry.type === "abilityReward") &&
        typeof entry.ability === "string" &&
        entry.ability.length > 0
      );
    },

    getHeavenHellAbilityPresentationState(gameState = {}) {
      const unlockEvents = this.getHeavenHellAbilityUnlockEvents(gameState);
      if (unlockEvents.length === 0) {
        return gameState;
      }

      const presentationState = JSON.parse(JSON.stringify(gameState));
      const abilities = presentationState?.heavenHell?.bonus?.abilities;
      if (!abilities || typeof abilities !== "object") {
        return gameState;
      }

      unlockEvents.forEach((entry) => {
        const abilityKey = String(entry.ability || "");
        if (!abilityKey) return;
        abilities[abilityKey] = Math.max(0, Math.floor(Number(abilities[abilityKey] || 0)) - 1);
      });

      return presentationState;
    },

    async syncHeavenHellAbilityUi(gameState = {}, { allowRewardFx = true } = {}) {
      if (!this.isHeavenHellEnabled(gameState)) {
        return false;
      }

      const playedUnlockSequence = await this.scene.playHeavenHellAbilityUnlockSequence?.(gameState, {
        allowRewardFx
      });
      if (playedUnlockSequence) {
        return true;
      }

      this.scene.updateHeavenHellAbilityText?.(gameState, { allowRewardFx });
      return false;
    },

    async playHeavenHellCollectPhaseIfNeeded(gameState = {}) {
      if (!this.isHeavenHellEnabled(gameState) || gameState?.nextAction !== "spin") return;
      if (this.hasPendingHeavenHellChests(gameState)) return false;
      const settledDrops = Array.isArray(gameState?.heavenHell?.bonus?.lootGroundSettled)
        ? gameState.heavenHell.bonus.lootGroundSettled
        : [];
      if (settledDrops.length === 0) return false;
      await this.scene.playHeavenHellCollectPhase?.(gameState);
      return true;
    }
  };
}

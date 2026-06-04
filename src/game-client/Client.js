import SegmentFlowRunner from "../flow/SegmentFlowRunner";
import { buildSegmentFlow } from "./buildSegmentFlow";

const DEFAULT_FLOW_TIMING = {
  breathDelay: 200
};
const ACTION_BANANA_HUNT = "bananaHunt";
const ACTION_FREESPIN_BANANA_HUNT = "freespinbananaHunt";
const LEGACY_ACTION_BANANA_HUNT = "bananaHunt";
const LEGACY_ACTION_FREESPIN_BANANA_HUNT = "freespinbananaHunt";
// Client.js
export class Client {
  constructor(phaserScene, { setUiState, setClientState } = {}) {
    this.scene = phaserScene;
    // Backward compatibility: accept old setClientState name during migration.
    this.setUiState = setUiState || setClientState;
    this.segmentFlowRunner = new SegmentFlowRunner();
  }

  isHeavenHellEnabled(gameState = {}) {
    return gameState?.heavenHell && typeof gameState.heavenHell === "object";
  }

  shouldShowLegacyChargeMeter(gameState = {}) {
    if (!this.isHeavenHellEnabled(gameState)) return true;
    return gameState?.isBonus !== true;
  }

  buildMergeGunAreasFromPositions(rawPositions = []) {
    const positionsByKey = new Map();
    (Array.isArray(rawPositions) ? rawPositions : []).forEach((entry) => {
      const reel = Math.floor(Number(entry?.reel));
      const row = Math.floor(Number(entry?.row));
      if (!Number.isFinite(reel) || !Number.isFinite(row)) return;
      if (reel < 0 || row < 0) return;
      positionsByKey.set(`${reel},${row}`, { reel, row });
    });

    const remainingKeys = new Set(positionsByKey.keys());
    const areas = [];
    while (remainingKeys.size > 0) {
      const seedKey = remainingKeys.values().next().value;
      const queue = [seedKey];
      const areaPositions = [];
      remainingKeys.delete(seedKey);

      while (queue.length > 0) {
        const key = queue.shift();
        const position = positionsByKey.get(key);
        if (!position) continue;
        areaPositions.push(position);

        const neighbors = [
          `${position.reel - 1},${position.row}`,
          `${position.reel + 1},${position.row}`,
          `${position.reel},${position.row - 1}`,
          `${position.reel},${position.row + 1}`
        ];
        neighbors.forEach((neighborKey) => {
          if (!remainingKeys.has(neighborKey)) return;
          remainingKeys.delete(neighborKey);
          queue.push(neighborKey);
        });
      }

      areaPositions.sort((a, b) => (a.reel - b.reel) || (a.row - b.row));
      const id = `glue:${areaPositions.map((position) => `${position.reel},${position.row}`).join("|")}`;
      areas.push({
        id,
        positions: areaPositions
      });
    }

    return areas;
  }

  getMergeGunAreaSignature(rawAreas = []) {
    return this.buildMergeGunAreasFromPositions(
      (Array.isArray(rawAreas) ? rawAreas : []).flatMap((area) => area?.positions || [])
    )
      .map((area) => area.positions.map((position) => `${position.reel},${position.row}`).join("|"))
      .sort()
      .join("::");
  }

  getMergeGunAreasForDisplay(gameState = {}) {
    const featureState = gameState?.mergeGunFeature || {};
    const topLevelPersistentState =
      gameState?.mergeGunPersistentState && typeof gameState.mergeGunPersistentState === "object"
        ? gameState.mergeGunPersistentState
        : {};
    const explicitAreas = Array.isArray(featureState?.areas) && featureState.areas.length > 0
      ? featureState.areas
      : (
        Array.isArray(featureState?.persistentAreas) && featureState.persistentAreas.length > 0
          ? featureState.persistentAreas
          : (
            Array.isArray(topLevelPersistentState?.areas)
              ? topLevelPersistentState.areas
              : []
          )
      );
    const persistentPositions = Array.isArray(featureState?.persistentHighlightedPositions) && featureState.persistentHighlightedPositions.length > 0
      ? featureState.persistentHighlightedPositions
      : (
        Array.isArray(featureState?.highlightedPositions) && featureState.highlightedPositions.length > 0
          ? featureState.highlightedPositions
          : (
            Array.isArray(topLevelPersistentState?.highlightedPositions)
              ? topLevelPersistentState.highlightedPositions
              : []
          )
      );
    const fallbackAreas = this.buildMergeGunAreasFromPositions(persistentPositions);
    const explicitAreaCellCount = explicitAreas.reduce((sum, area) => (
      sum + (Array.isArray(area?.positions) ? area.positions.length : 0)
    ), 0);
    const fallbackAreaCellCount = fallbackAreas.reduce((sum, area) => sum + area.positions.length, 0);
    const explicitAreaSignature = this.getMergeGunAreaSignature(explicitAreas);
    const fallbackAreaSignature = this.getMergeGunAreaSignature(fallbackAreas);

    if (
      fallbackAreaCellCount > explicitAreaCellCount ||
      (
        fallbackAreas.length > 0 &&
        explicitAreas.length > 0 &&
        fallbackAreaSignature !== explicitAreaSignature
      )
    ) {
      return fallbackAreas;
    }
    return explicitAreas.length > 0 ? explicitAreas : fallbackAreas;
  }

  getBonusCollectedCountsBeforeAction(gameState = {}) {
    const normalizeCounts = (rawCounts = null) => {
      if (typeof this.scene?.getNormalizedBonusFruitCounts === "function") {
        return this.scene.getNormalizedBonusFruitCounts(rawCounts);
      }

      const normalized = {};
      Object.entries(rawCounts || {}).forEach(([symbol, rawCount]) => {
        const parsedSymbol = Number(symbol);
        const count = Math.max(0, Math.floor(Number(rawCount || 0) || 0));
        if (Number.isFinite(parsedSymbol) && count > 0) {
          normalized[String(parsedSymbol)] = count;
        }
      });
      return normalized;
    };

    const resolveSymbolId = (entry = null) => {
      if (typeof this.scene?.getCollectableBonusSymbolId === "function") {
        return this.scene.getCollectableBonusSymbolId(entry?.symbol ?? entry?.symbolId);
      }
      const parsed = Number(entry?.symbol ?? entry?.symbolId);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const beforeActionCounts = normalizeCounts(gameState?.bonusCollectedSymbols || {});
    (Array.isArray(gameState?.bonusCollectedThisAction) ? gameState.bonusCollectedThisAction : []).forEach((entry) => {
      const symbolId = resolveSymbolId(entry);
      if (symbolId === null) return;
      const centerMachineCollect =
        entry?.centerMachineCollect !== false &&
        (typeof this.scene?.isBonusCenterMachineCollectableSymbol !== "function" ||
          this.scene.isBonusCenterMachineCollectableSymbol(symbolId));
      if (!centerMachineCollect) return;

      const key = String(symbolId);
      const nextValue = Math.max(0, Number(beforeActionCounts[key] || 0) - 1);
      if (nextValue > 0) {
        beforeActionCounts[key] = nextValue;
      } else {
        delete beforeActionCounts[key];
      }
    });

    return beforeActionCounts;
  }

  syncBonusMysteryFeatureUi(gameState = {}, { consume = false } = {}) {
    const entries = Array.isArray(gameState?.bonusMysteryFeatureCollectedThisAction)
      ? gameState.bonusMysteryFeatureCollectedThisAction
      : [];
    let consumed = 0;
    if (consume && typeof this.scene?.consumeBonusMysteryFeatureCollections === "function") {
      consumed = this.scene.consumeBonusMysteryFeatureCollections(entries) || 0;
    }
    const pulse = consume && (entries.some((entry) => entry?.applied === true) || consumed > 0);
    const featureState = gameState?.bonusMysteryFeature || null;
    const displayState = !consume && featureState
      ? {
          ...featureState,
          collected: Math.max(
            0,
            Math.floor(Number(featureState.collected || 0)) -
              entries.filter((entry) => entry?.applied === true).length
          )
        }
      : featureState;
    this.scene.updateBonusMysteryMeter?.(displayState, {
      isBonus: gameState?.isBonus === true,
      pulse
    });
  }

  async playBonusMysteryFeatureCollectionsForAction(gameState = {}) {
    const entries = Array.isArray(gameState?.bonusMysteryFeatureCollectedThisAction)
      ? gameState.bonusMysteryFeatureCollectedThisAction
      : [];
    if (entries.length === 0 || typeof this.scene?.playBonusMysteryFeatureCollection !== "function") {
      this.syncBonusMysteryFeatureUi(gameState, { consume: true });
      return;
    }

    for (const entry of entries) {
      await this.scene.playBonusMysteryFeatureCollection(entry);
    }
    this.scene.updateBonusMysteryMeter?.(gameState?.bonusMysteryFeature || null, {
      isBonus: gameState?.isBonus === true,
      pulse: true
    });
  }

  hasMergeGunActivations(gameState = {}) {
    const actionState = gameState?.mergeGunFeatureThisAction || {};
    const activations = Array.isArray(actionState?.activations)
      ? actionState.activations
      : (
        Array.isArray(gameState?.mergeGunActivationsThisAction)
          ? gameState.mergeGunActivationsThisAction
          : []
      );
    return activations.length > 0;
  }

  async syncMergeGunFeatureUi(gameState = {}, { playActivation = false, suppressPreviewWhenActivationsPending = false } = {}) {
    const areas = this.getMergeGunAreasForDisplay(gameState);
    const mergeGunActionState = gameState?.mergeGunFeatureThisAction || {};
    const featureState = gameState?.mergeGunFeature || {};
    const collected = Math.max(0, Math.floor(Number(featureState?.collected || 0) || 0));
    const max = Math.max(0, Math.floor(Number(featureState?.max || 0) || 0));
    if (max > 0 && collected >= max) {
      this.scene.clearVisibleMergeGunFeatureSymbols?.();
    }
    const activations = Array.isArray(mergeGunActionState?.activations)
      ? mergeGunActionState.activations
      : (
        Array.isArray(gameState?.mergeGunActivationsThisAction)
          ? gameState.mergeGunActivationsThisAction
          : []
      );
    if (!playActivation && suppressPreviewWhenActivationsPending === true && activations.length > 0) {
      return;
    }
    if (playActivation && typeof this.scene?.playMergeGunActivations === "function") {
      await this.scene.playMergeGunActivations(
        activations,
        areas
      );
      return;
    }

    this.scene.syncMergeGunAreas?.(areas, {
      isBonus: gameState?.isBonus === true,
      showValues: false,
      preserveExistingOnEmpty: true
    });
  }

  async playFreespinSmashSymbolClear(gameState = {}) {
    if (typeof this.scene?.playFreespinSmashSymbolClear !== "function") {
      return false;
    }

    return this.scene.playFreespinSmashSymbolClear({
      heroPosition: gameState?.heroPosition || gameState?.bonusStageEvent?.heroPosition || null,
      heroFootprintSize: this.getHeroFootprintSizeBeforeStageEvent(gameState),
      weapon: gameState?.hero?.weapon || "staff"
    });
  }

  syncLightningBeeFeatureUi(gameState = {}, { consume = false } = {}) {
    const entries = Array.isArray(gameState?.lightningBeeFeatureCollectedThisAction)
      ? gameState.lightningBeeFeatureCollectedThisAction
      : [];
    let consumed = 0;
    if (consume && typeof this.scene?.consumeLightningBeeFeatureCollections === "function") {
      consumed = this.scene.consumeLightningBeeFeatureCollections(entries) || 0;
    }
    const pulse = consume && (entries.some((entry) => entry?.applied === true) || consumed > 0);
    const featureState = gameState?.lightningBeeFeature || null;
    const movementEntries = Array.isArray(gameState?.lightningBeeMovementsThisAction)
      ? gameState.lightningBeeMovementsThisAction
      : [];
    const collectedBeeIdsThisAction = new Set(
      entries
        .filter((entry) => entry?.applied === true)
        .map((entry) => Math.floor(Number(entry?.beeId ?? entry?.id)))
        .filter((id) => Number.isFinite(id))
    );
    const normalizeBoardBeeForDisplay = (entry = null, { useFromPosition = false } = {}) => {
      const reel = Math.floor(Number(useFromPosition ? entry?.fromReel : entry?.reel));
      const row = Math.floor(Number(useFromPosition ? entry?.fromRow : entry?.row));
      if (!Number.isFinite(reel) || !Number.isFinite(row)) return null;
      const beeId = Math.max(1, Math.floor(Number(entry?.beeId ?? entry?.id ?? 1)) || 1);
      return {
        id: beeId,
        beeId,
        reel,
        row,
        multiplierStep: Math.max(0, Math.floor(Number(entry?.fromMultiplierStep ?? entry?.multiplierStep ?? 0)) || 0),
        multiplier: Math.max(1, Math.floor(Number(entry?.fromMultiplier ?? entry?.multiplier ?? 1)) || 1)
      };
    };
    const mergeBoardBeeDisplayEntries = (...groups) => {
      const merged = [];
      const seen = new Set();
      groups.flat().forEach((entry) => {
        if (!entry) return;
        const id = Math.floor(Number(entry?.beeId ?? entry?.id));
        const key = Number.isFinite(id) ? `id:${id}` : `${entry.reel},${entry.row}`;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(entry);
      });
      return merged;
    };
    const movementBoardBees = movementEntries
      .map((entry) => normalizeBoardBeeForDisplay(entry, { useFromPosition: true }))
      .filter(Boolean);
    const collectedBoardBees = entries
      .map((entry) => normalizeBoardBeeForDisplay(entry))
      .filter(Boolean);
    const featureBoardBees = Array.isArray(featureState?.boardBees) ? featureState.boardBees : [];
    const boardBeesForDisplay = movementEntries.length > 0
      ? mergeBoardBeeDisplayEntries(movementBoardBees, collectedBoardBees)
      : mergeBoardBeeDisplayEntries(featureBoardBees, collectedBoardBees);
    const displayState = !consume && featureState
      ? {
          ...featureState,
          collectedBees: Array.isArray(featureState.collectedBees)
            ? featureState.collectedBees.filter((entry) => {
                const id = Math.floor(Number(entry?.beeId ?? entry?.id));
                return !Number.isFinite(id) || !collectedBeeIdsThisAction.has(id);
              })
            : featureState.collectedBees,
          boardBees: boardBeesForDisplay,
          collected: Math.max(
            0,
            Math.floor(Number(featureState.collected || 0)) -
              entries.filter((entry) => entry?.applied === true).length
          )
        }
      : featureState;
    this.scene.updateLightningBeeMeter?.(displayState, {
      isBonus: gameState?.isBonus === true,
      pulse
    });
  }

  async playLightningBeeFeatureCollectionsForAction(gameState = {}) {
    const allEntries = Array.isArray(gameState?.lightningBeeFeatureCollectedThisAction)
      ? gameState.lightningBeeFeatureCollectedThisAction
      : [];
    if (allEntries.length === 0 || typeof this.scene?.playLightningBeeFeatureCollection !== "function") {
      this.syncLightningBeeFeatureUi(gameState, { consume: true });
      return;
    }

    const entries = allEntries.filter((entry) => entry?.handledByLightningBeeMovement !== true);
    if (entries.length === 0) {
      this.scene.updateLightningBeeMeter?.(gameState?.lightningBeeFeature || null, {
        isBonus: gameState?.isBonus === true,
        pulse: allEntries.some((entry) => entry?.applied === true)
      });
      return;
    }

    for (const entry of entries) {
      await this.scene.playLightningBeeFeatureCollection(entry);
    }
    this.scene.updateLightningBeeMeter?.(gameState?.lightningBeeFeature || null, {
      isBonus: gameState?.isBonus === true,
      pulse: true
    });
  }

  getHeroFootprintSizeBeforeStageEvent(gameState = {}) {
    const stageEvent = gameState?.bonusStageEvent;
    if (stageEvent?.giantMonkeyActivated === true) {
      const previousFootprintSize = Math.max(
        1,
        Math.floor(Number(stageEvent?.previousHeroFootprintSize || 1))
      );
      if (Number.isFinite(previousFootprintSize)) {
        return previousFootprintSize;
      }
    }

    return Math.max(1, Math.floor(Number(gameState?.heroFootprintSize || 1)));
  }

  /**
   * Main entry point from the server/gameState.
   * @param {object} gameState - The state received from the game logic/server.
   */
  async reactOnResponse(gameState, clientState) {
    if (!this.scene) {
      console.warn('❌ Client.scene is undefined!');
      return;
    }
   
    this.scene.clearPendingFastForward?.();
    this.scene.resetActionBonusCollectionAnimationState?.();
    this.cancelActiveDelay();
    this.segmentFlowRunner.reset();
    this.syncBonusMysteryFeatureUi(gameState, { consume: false });
    this.syncLightningBeeFeatureUi(gameState, { consume: false });
    await this.syncMergeGunFeatureUi(gameState, {
      playActivation: false,
      suppressPreviewWhenActivationsPending: true
    });
    this.scene.updateHeavenHellAbilityText?.(gameState, { allowRewardFx: false });

    if (gameState.executedAction === "spin" || gameState.executedAction === "freespin") {
      this.scene.emitRoundStarted?.();
    }

    if (gameState.executedAction === 'spin') {
      // Mark that we're in a fresh spin action (prevents stale orbs from updating multiplier)
      this.scene.currentAction = 'spin';
      
      // Play spin click sound
      this.scene.playSpinClickSound();
      
      // Start main theme music on first spin
      this.scene.startMainTheme();
      
      // Check if we're coming from bonus mode ending (bonus game over)
      const comingFromBonus = gameState.pastAction === 'freespin' || 
                              gameState.pastAction === 'freerespin' || 
                              gameState.pastAction === ACTION_FREESPIN_BANANA_HUNT ||
                              gameState.pastAction === LEGACY_ACTION_FREESPIN_BANANA_HUNT;
      
      // Add delay to let player reflect on final bonus results
      if (comingFromBonus) {
        await this.waitForPresentation(2000);
      }
      
      // 0. Reset hero, multiplier, win displays for new spin
      this.scene.resetForNewSpin();
      this.scene.resetBonusFruitPile?.();
      
      // Hide freespin counter when back in main game
      this.scene.hideFreespinCounter();
      
      // Sync multiplier display with server state (should be 1 on new spin)
      this.scene.createOrUpdateHouse(gameState.multiplier || 1);
      if (this.shouldShowLegacyChargeMeter(gameState)) {
        this.scene.updateBananaMeter?.(gameState.bananaMeter ?? gameState.bananaMeterCount ?? 0);
      }
      this.scene.renderHeavenHellLootGround?.([]);
      this.scene.updateHeavenHellAbilityText?.(gameState);

      await this.runSegmentFlow(gameState);
    } else if (gameState.executedAction === 'trolltease') {
      // Troll feature is disabled in Thunderkong.
      this.scene.updateCountUp(gameState.twa || 0);
    } else if (gameState.executedAction === 'trollrush') {
      // Troll feature is disabled in Thunderkong.
      this.scene.updateCountUp(gameState.twa || 0);
    } else if (gameState.executedAction === 'respin') {
      // Mark action (allows orbs to update multiplier during respin)
      this.scene.currentAction = 'respin';
      
      // 1. Drop new symbols with gravity animation (existing + new symbols drop together)
      if (!gameState.reelsAfterDrop || !gameState.dropEvent) {
        this.scene.emitOutcomeRevealed?.();
        if (gameState.nextAction === "spin") {
          this.scene.emitRoundEnded?.();
        }
        return;
      }

      await this.runSegmentFlow(gameState);
    } else if (gameState.executedAction === ACTION_BANANA_HUNT || gameState.executedAction === LEGACY_ACTION_BANANA_HUNT) {
      // Mark action (allows orbs to update multiplier during banana hunt)
      this.scene.currentAction = ACTION_BANANA_HUNT;
      
      // Animate hero hunting bananas along the path
      if (gameState.heroPath && gameState.heroPath.length > 0) {
        const stepType = "destroy";
        const weapon = "staff";
        const bananaMeterLevel = gameState?.bananaMeter?.level ?? gameState?.bananaMeterLevel ?? 0;
        const finalMeterCount = Number(gameState?.bananaMeter?.count ?? gameState?.bananaMeterCount ?? 0);
        const sceneMeterCount = Number(this.scene?.currentBananaMeterCount);
        let meterStartCount = Number.isFinite(sceneMeterCount) ? sceneMeterCount : finalMeterCount;
        if (!Number.isFinite(sceneMeterCount)) {
          const bananasKilledThisHunt = Math.max(0, Number(gameState?.bananasKilled ?? 0) || 0);
          meterStartCount = Math.max(0, finalMeterCount - bananasKilledThisHunt);
        }
        meterStartCount = Math.min(meterStartCount, finalMeterCount);
        await this.scene.animateHeroHunt(
          gameState.heroPath, 
          gameState.affectedPositions, 
          gameState.orbDrops || [],
          gameState.multiplier || 1,
          gameState.totalBananasCollectedInSequence ?? gameState.totalBananasKilledInSequence ?? 0,
          stepType,
          weapon,
          null,
          bananaMeterLevel,
          false,
          {
            startCount: meterStartCount,
            finalCount: finalMeterCount,
            baseCountUpValue: Number(gameState?.prevTwa || 0)
          },
          {
            rushActive: gameState?.rushActive === true,
            bonusStage: Number(gameState?.bonusStage || 0),
            heroFootprintSize: Number(gameState?.heroFootprintSize || 1),
            giantMonkeyActive: gameState?.giantMonkeyActive === true,
            bonusEntryFreespins: gameState?.bonusWon?.enterBonusWith?.freespins || gameState?.bonusState?.finalFreespins || 5,
            mergeGunFeatureCollections: gameState?.mergeGunFeatureThisAction?.collected || gameState?.mergeGunFeatureCollectedThisAction || [],
            mergeGunActivations: gameState?.mergeGunFeatureThisAction?.activations || gameState?.mergeGunActivationsThisAction || [],
            mergeGunAreas: this.getMergeGunAreasForDisplay(gameState),
            bonusMysteryFeatureCollections: gameState?.bonusMysteryFeatureCollectedThisAction || [],
            lightningBeeFeatureCollections: gameState?.lightningBeeFeatureCollectedThisAction || []
          }
        );
        this.scene.syncHeroBonusForm?.(gameState?.heroFootprintSize || 1, false, gameState?.heroPosition || null);
      }
      await this.syncMergeGunFeatureUi(gameState, { playActivation: false });
      this.syncLightningBeeFeatureUi(gameState, { consume: true });
      
      // Reveal mystery symbols if any
      if (gameState.mysteryReveals && gameState.mysteryReveals.length > 0) {
        const stepType = gameState.hero?.step || "destroy";
        await this.scene.revealMysterySymbols(gameState.mysteryReveals, stepType);
      }
      
      // Clean up any lingering banana backplates after hunt
      this.scene.cleanupAllBackplates();
      
      // Update count-up at the end of action
      this.scene.updateCountUp(gameState.twa || 0);
    } else if (gameState.executedAction === 'bonustransition') {
      // Set lightning intensity to max (10) for freespins
      this.scene.lightningCount = 100;
      if (this.isHeavenHellEnabled(gameState)) {
        this.scene.clearMainGameSymbolsForHeavenHellBonus?.();
        await this.scene.playHeavenHellBonusEntryPortalTransition?.();
        this.scene.updateHellDiveBackground?.(gameState);
      }
      this.scene.startBonusMode();
      this.scene.syncBonusMultiplierFruits?.(gameState, { refreshVisuals: true });
      this.scene.resetBonusFruitPile?.(gameState?.bonusCollectedSymbols || {});
      this.scene.syncImmediateLowPositionBackplates?.(gameState?.bonusState?.immediateLowPositionLandings || []);

      // Show freespin counter (just the remaining number)
      const initialSpins = gameState.bonusState?.finalFreespins || gameState.bonusWon?.enterBonusWith?.freespins || 5;
      this.scene.updateFreespinCounter(initialSpins);
      if (this.shouldShowLegacyChargeMeter(gameState)) {
        this.scene.updateBananaMeter?.(gameState.bananaMeter ?? gameState.bananaMeterCount ?? 0);
      }
      this.syncBonusMysteryFeatureUi(gameState, { consume: false });
      this.syncLightningBeeFeatureUi(gameState, { consume: false });
      await this.syncMergeGunFeatureUi(gameState, { playActivation: false });
      if (this.isHeavenHellEnabled(gameState)) {
        this.scene.showHeavenHellPortalAura?.(gameState);
        this.scene.renderHeavenHellLootGround?.(gameState?.heavenHell?.bonus?.lootGround || []);
        this.scene.updateHeavenHellAbilityText?.(gameState);
      }

    } else if (gameState.executedAction === 'freespin') {
      if (this.isHeavenHellEnabled(gameState) && gameState?.dropEvent?.direction === "ripple") {
        this.scene.currentAction = 'freespin';
        this.scene.startBonusTheme?.();
        this.scene.updateFreespinCounter(gameState?.bonusState?.finalFreespins || 0, { deferRingConsume: true });
        this.scene.createOrUpdateHouse(gameState?.multiplier || 1);
        await this.scene.playHeavenHellRippleSpawn?.(gameState);
        this.scene.hideNonHeavenHellBonusSymbols?.(gameState);
        this.scene.renderHeavenHellLootGround?.(gameState?.heavenHell?.bonus?.lootGround || []);
        this.scene.updateHeavenHellAbilityText?.(gameState);
        this.scene.updateCountUp(gameState.twa || 0);
        if (gameState.nextAction === 'spin') {
          this.scene.resetLightningCount?.();
          this.scene.stopBonusTheme?.();
        }
        this.scene.emitOutcomeRevealed?.();
        if (gameState.nextAction === "spin") {
          this.scene.emitRoundEnded?.();
        }
        this.scene.updateHellDiveBackground?.(gameState);
        return;
      }
      // Mark that we're in a fresh freespin action (prevents stale orbs from updating multiplier)
      this.scene.currentAction = 'freespin';
      this.scene.currentHeroFootprintSize = this.getHeroFootprintSizeBeforeStageEvent(gameState);
      this.scene.startBonusTheme?.();
      
      // Freespin - drop new symbols
      
      // Check if this is the FIRST freespin (bonus just started)
      // Use pastAction to reliably detect first freespin after bonustransition
      const isFirstFreespin = gameState.pastAction === 'bonustransition';
      
      // On main-to-bonus entry, begin the charge/smash inside the user-started freespin action.
      if (isFirstFreespin && gameState.isBonus) {
        // Start bonus mode - fades out BONUS text and prevents tease during lightning
        this.scene.startBonusMode();
      }
      this.scene.syncBonusMultiplierFruits?.(gameState, { refreshVisuals: false });
      
      // Sync multiplier display with server state (resets each freespin)
      this.scene.createOrUpdateHouse(gameState.multiplier || 1);
      this.scene.syncBonusCollectedSymbolCounts?.(this.getBonusCollectedCountsBeforeAction(gameState));
      
      // Update freespin counter (just the remaining number)
      const remaining = gameState.bonusState?.finalFreespins || 0;
      this.scene.updateFreespinCounter(remaining, { deferRingConsume: true });
      if (this.shouldShowLegacyChargeMeter(gameState)) {
        this.scene.updateBananaMeter?.(gameState.bananaMeter ?? gameState.bananaMeterCount ?? 0);
      }
      
      // Clear old symbols with the ape smash at freespin action start. Falls back to the legacy slide if no board was available.
      const smashedOldSymbols = await this.playFreespinSmashSymbolClear(gameState);
      if (!smashedOldSymbols) {
        await this.scene.slideOutOldSymbols();
      }
      await this.scene.playBonusMysteryFeatureReleaseAfterKapow?.(
        gameState?.bonusMysteryFeatureReleaseThisAction || null,
        {
          allowFeatureBlockedLanding: false,
          bonusMysteryFeatureState: gameState?.bonusMysteryFeature || null
        }
      );
      await this.scene.playLightningBeeMovements?.(
        gameState?.lightningBeeMovementsThisAction || [],
        gameState?.lightningBeeFeature || null
      );

      // Drop new symbols (no timeSymbols during freespins - no bonus trigger)
      await this.scene.dropSymbols(gameState.reels, gameState.executedAction, "staff", [], null);
      if (this.isHeavenHellEnabled(gameState)) {
        this.scene.hideNonHeavenHellBonusSymbols?.(gameState);
      }
      await this.playBonusMysteryFeatureCollectionsForAction(gameState);
      await this.playLightningBeeFeatureCollectionsForAction(gameState);
      if (this.hasMergeGunActivations(gameState)) {
        await this.syncMergeGunFeatureUi(gameState, { playActivation: true });
      }
      await this.syncMergeGunFeatureUi(gameState, { playActivation: false });

      // Match main-game segment flow: barrel anticipation + burst (was only wired for spin/respin)
      if (Array.isArray(gameState.barrelBursts) && gameState.barrelBursts.length > 0) {
        await this.scene.playBarrelBurstAnimation?.(gameState.barrelBursts);
      }

      if (!this.isHeavenHellEnabled(gameState)) {
        await this.scene.collectBonusSymbolsThisAction?.(
          gameState?.bonusCollectedThisAction || [],
          gameState?.bonusCollectedSymbols || {},
          {
            playHighlight: Array.isArray(gameState?.clusters) && gameState.clusters.length > 0,
            clusters: gameState?.clusters || [],
            immediateLowPositionLandings: gameState?.bonusState?.immediateLowPositionLandings || []
          }
        );
      }
      const bonusEndPayout = gameState?.bonusEndPayout;
      const hasRainPayoutData =
        (bonusEndPayout?.landings?.length ?? 0) > 0 ||
        (bonusEndPayout?.phases?.length ?? 0) > 0 ||
        (bonusEndPayout?.lightningBeeFeature?.events?.length ?? 0) > 0;
      const immediateLowBackplateLandings = Array.isArray(gameState?.bonusState?.immediateLowPositionLandings)
        ? gameState.bonusState.immediateLowPositionLandings
        : [];
      const shouldCollectBackplatesOnly =
        gameState?.nextAction === 'spin' &&
        !hasRainPayoutData &&
        immediateLowBackplateLandings.length > 0;
      if (hasRainPayoutData || shouldCollectBackplatesOnly) {
        const finalTwa = Number(gameState?.twa || 0);
        let payoutTotalTwa = Number(bonusEndPayout?.totalTwa || 0);
        if (!(payoutTotalTwa > 0) && shouldCollectBackplatesOnly) {
          payoutTotalTwa = immediateLowBackplateLandings.reduce((sum, entry) => {
            const increment = Number(
              this.scene?.getImmediateLowSymbolValueTbm?.(entry?.symbol ?? entry?.symbolId) || 0
            );
            return sum + (Number.isFinite(increment) ? increment : 0);
          }, 0);
        }
        const baseTwa = Math.max(0, finalTwa - Math.max(0, payoutTotalTwa));
        await this.scene.playBonusEndPayout?.(bonusEndPayout, {
          baseTwa,
          finalTwa,
          betSize: gameState?.betSize,
          releaseBalloonsAfterKapow: false,
          allowFeatureBlockedBalloonLanding: false,
          bonusMysteryFeature: gameState?.bonusMysteryFeature,
          lightningBeeFeature: gameState?.lightningBeeFeature
        });
      } else {
        this.scene.updateCountUp(gameState.twa || 0);
      }
      
      // Check if bonus is ending (last freespin completed)
      if (gameState.nextAction === 'spin') {
        // Bonus is over - reset lightning intensity and start music transition
        this.scene.resetLightningCount();
        this.scene.stopBonusTheme();
      }
    } else if (gameState.executedAction === 'freerespin') {
      if (this.isHeavenHellEnabled(gameState) && gameState?.dropEvent?.direction === "ripple") {
        this.scene.currentAction = 'freerespin';
        this.scene.syncBonusMultiplierFruits?.(gameState, { refreshVisuals: false });
        await this.scene.playHeavenHellRippleSpawn?.(gameState);
        this.scene.hideNonHeavenHellBonusSymbols?.(gameState);
        this.scene.renderHeavenHellLootGround?.(gameState?.heavenHell?.bonus?.lootGround || []);
        this.scene.updateHeavenHellAbilityText?.(gameState);
        this.scene.updateCountUp(gameState.twa || 0);
        if (gameState.nextAction === 'spin') {
          this.scene.resetLightningCount?.();
          this.scene.stopBonusTheme?.();
        }
        this.scene.emitOutcomeRevealed?.();
        if (gameState.nextAction === "spin") {
          this.scene.emitRoundEnded?.();
        }
        this.scene.updateHellDiveBackground?.(gameState);
        return;
      }
      // Mark action (allows orbs to update multiplier during freerespin)
      this.scene.currentAction = 'freerespin';
      this.scene.currentHeroFootprintSize = this.getHeroFootprintSizeBeforeStageEvent(gameState);
      this.scene.syncBonusMultiplierFruits?.(gameState, { refreshVisuals: false });
      
      // Freerespin - same as respin but in bonus mode
      if (!gameState.reelsAfterDrop || !gameState.dropEvent) {
        this.scene.emitOutcomeRevealed?.();
        if (gameState.nextAction === "spin") {
          this.scene.emitRoundEnded?.();
        }
        return;
      }
      
      await this.scene.applyGravityAnimation(gameState.reelsAfterDrop, gameState.dropEvent, gameState.timeSymbols);
      if (this.isHeavenHellEnabled(gameState)) {
        this.scene.hideNonHeavenHellBonusSymbols?.(gameState);
      }
      await this.playBonusMysteryFeatureCollectionsForAction(gameState);
      await this.playLightningBeeFeatureCollectionsForAction(gameState);
      if (this.hasMergeGunActivations(gameState)) {
        await this.syncMergeGunFeatureUi(gameState, { playActivation: true });
      }
      await this.syncMergeGunFeatureUi(gameState, { playActivation: false });

      if (Array.isArray(gameState.barrelBursts) && gameState.barrelBursts.length > 0) {
        await this.scene.playBarrelBurstAnimation?.(gameState.barrelBursts);
      }

      if (!this.isHeavenHellEnabled(gameState)) {
        await this.scene.collectBonusSymbolsThisAction?.(
          gameState?.bonusCollectedThisAction || [],
          gameState?.bonusCollectedSymbols || {},
          {
            playHighlight: Array.isArray(gameState?.clusters) && gameState.clusters.length > 0,
            clusters: gameState?.clusters || [],
            immediateLowPositionLandings: gameState?.bonusState?.immediateLowPositionLandings || []
          }
        );
      }
      const bonusEndPayout = gameState?.bonusEndPayout;
      const hasRainPayoutData =
        (bonusEndPayout?.landings?.length ?? 0) > 0 ||
        (bonusEndPayout?.phases?.length ?? 0) > 0 ||
        (bonusEndPayout?.lightningBeeFeature?.events?.length ?? 0) > 0;
      const immediateLowBackplateLandings = Array.isArray(gameState?.bonusState?.immediateLowPositionLandings)
        ? gameState.bonusState.immediateLowPositionLandings
        : [];
      const shouldCollectBackplatesOnly =
        gameState?.nextAction === 'spin' &&
        !hasRainPayoutData &&
        immediateLowBackplateLandings.length > 0;
      if (hasRainPayoutData || shouldCollectBackplatesOnly) {
        const finalTwa = Number(gameState?.twa || 0);
        let payoutTotalTwa = Number(bonusEndPayout?.totalTwa || 0);
        if (!(payoutTotalTwa > 0) && shouldCollectBackplatesOnly) {
          payoutTotalTwa = immediateLowBackplateLandings.reduce((sum, entry) => {
            const increment = Number(
              this.scene?.getImmediateLowSymbolValueTbm?.(entry?.symbol ?? entry?.symbolId) || 0
            );
            return sum + (Number.isFinite(increment) ? increment : 0);
          }, 0);
        }
        const baseTwa = Math.max(0, finalTwa - Math.max(0, payoutTotalTwa));
        await this.scene.playBonusEndPayout?.(bonusEndPayout, {
          baseTwa,
          finalTwa,
          betSize: gameState?.betSize,
          releaseBalloonsAfterKapow: false,
          allowFeatureBlockedBalloonLanding: true,
          bonusMysteryFeature: gameState?.bonusMysteryFeature,
          lightningBeeFeature: gameState?.lightningBeeFeature
        });
      } else {
        this.scene.updateCountUp(gameState.twa || 0);
      }
      
      // Check if bonus is ending
      if (gameState.nextAction === 'spin') {
        this.scene.resetLightningCount();
        this.scene.stopBonusTheme();
      }
      
    } else if (gameState.executedAction === ACTION_FREESPIN_BANANA_HUNT || gameState.executedAction === LEGACY_ACTION_FREESPIN_BANANA_HUNT) {
      // Mark action (allows orbs to update multiplier during freespin banana hunt)
      this.scene.currentAction = ACTION_FREESPIN_BANANA_HUNT;
      this.scene.syncBonusMultiplierFruits?.(gameState, { refreshVisuals: false });
      
      // Freespin banana hunt - same as bananaHunt but in bonus mode
      if (gameState.heroPath && gameState.heroPath.length > 0) {
        const stepType = "destroy";
        const weapon = "staff";
        const bananaMeterLevel = gameState?.bananaMeter?.level ?? gameState?.bananaMeterLevel ?? 0;
        const finalMeterCount = Number(gameState?.bananaMeter?.count ?? gameState?.bananaMeterCount ?? 0);
        const bonusStageEvent = gameState?.bonusStageEvent;
        const currentHeroFootprintSize = Number(gameState?.heroFootprintSize || 1);
        const huntHeroFootprintSize = bonusStageEvent?.giantMonkeyActivated
          ? Number(bonusStageEvent?.previousHeroFootprintSize || 1)
          : currentHeroFootprintSize;
        const huntBonusStage = Number.isFinite(Number(bonusStageEvent?.previousStage))
          ? Number(bonusStageEvent.previousStage)
          : Number(gameState?.bonusStage || 0);
        const sceneMeterCount = Number(this.scene?.currentBananaMeterCount);
        let meterStartCount = Number.isFinite(sceneMeterCount) ? sceneMeterCount : finalMeterCount;
        if (!Number.isFinite(sceneMeterCount)) {
          const bananasKilledThisHunt = Math.max(0, Number(gameState?.bananasKilled ?? 0) || 0);
          meterStartCount = Math.max(0, finalMeterCount - bananasKilledThisHunt);
        }
        meterStartCount = Math.min(meterStartCount, finalMeterCount);
        
        await this.scene.animateHeroHunt(
          gameState.heroPath, 
          gameState.affectedPositions, 
          gameState.orbDrops || [],
          gameState.multiplier || 1,
          gameState.totalBananasCollectedInSequence ?? gameState.totalBananasKilledInSequence ?? 0,
          stepType,
          weapon,
          null,
          bananaMeterLevel,
          false,
          {
            startCount: meterStartCount,
            finalCount: finalMeterCount,
            baseCountUpValue: Number(gameState?.prevTwa || 0)
          },
          {
            rushActive: gameState?.rushActive === true,
            bonusStage: huntBonusStage,
            finalBonusStage: Number(gameState?.bonusStage || huntBonusStage || 0),
            heroFootprintSize: huntHeroFootprintSize,
            giantMonkeyActive: huntHeroFootprintSize > 1,
            mergeGunFeatureCollections: gameState?.mergeGunFeatureThisAction?.collected || gameState?.mergeGunFeatureCollectedThisAction || [],
            mergeGunActivations: gameState?.mergeGunFeatureThisAction?.activations || gameState?.mergeGunActivationsThisAction || [],
            mergeGunAreas: this.getMergeGunAreasForDisplay(gameState),
            bonusMysteryFeatureCollections: gameState?.bonusMysteryFeatureCollectedThisAction || [],
            lightningBeeFeatureCollections: gameState?.lightningBeeFeatureCollectedThisAction || []
          }
        );
        if (this.isHeavenHellEnabled(gameState)) {
          await this.scene.playHeavenHellDivineWrathAreaTelegraph?.(gameState);
          await this.scene.playHeavenHellDivineChargeSequence?.(gameState);
        }
        if (bonusStageEvent?.giantMonkeyActivated) {
          await this.scene.animateHeroGrowthExpansion?.(bonusStageEvent);
        } else {
          this.scene.syncHeroBonusForm?.(currentHeroFootprintSize, false, gameState?.heroPosition || null);
        }
      }
      await this.syncMergeGunFeatureUi(gameState, { playActivation: false });
      this.syncBonusMysteryFeatureUi(gameState, { consume: true });
      this.syncLightningBeeFeatureUi(gameState, { consume: true });
      if (!this.isHeavenHellEnabled(gameState)) {
        await this.scene.collectBonusSymbolsThisAction?.(
          gameState?.bonusCollectedThisAction || [],
          gameState?.bonusCollectedSymbols || {},
          {
            immediateLowPositionLandings: gameState?.bonusState?.immediateLowPositionLandings || []
          }
        );
      }
      
      // Reveal mystery symbols if any
      if (gameState.mysteryReveals && gameState.mysteryReveals.length > 0) {
        const stepType = gameState.hero?.step || "destroy";
        await this.scene.revealMysterySymbols(gameState.mysteryReveals, stepType);
      }

      const bonusStageEvent = gameState?.bonusStageEvent;
      if (bonusStageEvent && Number(bonusStageEvent.freespinsAwarded || 0) > 0) {
        this.scene.updateFreespinCounter(gameState.bonusState?.finalFreespins || 0);
      }
      if (bonusStageEvent?.giantMonkeyActivated && (!gameState.heroPath || gameState.heroPath.length === 0)) {
        await this.scene.animateHeroGrowthExpansion?.(bonusStageEvent);
      }
      
      this.scene.cleanupAllBackplates();
      
      this.scene.updateCountUp(gameState.twa || 0);
      if (this.isHeavenHellEnabled(gameState)) {
        this.scene.syncSpritesToReelState?.(gameState?.reels || {});
        this.scene.hideNonHeavenHellBonusSymbols?.(gameState);
        this.scene.renderHeavenHellLootGround?.(gameState?.heavenHell?.bonus?.lootGround || []);
        this.scene.updateHeavenHellAbilityText?.(gameState, { allowRewardFx: true });
      }
      
      // Check if bonus is ending
      if (gameState.nextAction === 'spin') {
        this.scene.resetLightningCount();
        this.scene.stopBonusTheme();
      }
      
    } else if (gameState.executedAction === 'chestreward') {
      // Chest rewards are disabled for Thunderkong.
    }

    if (this.shouldShowLegacyChargeMeter(gameState)) {
      this.scene.updateBananaMeter?.(gameState.bananaMeter ?? gameState.bananaMeterCount ?? 0);
    }

    if (gameState.executedAction === "freespin" || gameState.executedAction === "freerespin") {
      this.scene.emitOutcomeRevealed?.();
    }

    if (gameState.nextAction === "spin") {
      this.scene.emitRoundEnded?.();
    }

    this.scene.updateHellDiveBackground?.(gameState);

    // Note: Lightning count is now reset during bonus actions when nextAction === 'spin'
    // (lines 211-214, 230-233, 267-270) to ensure it happens before isBonus is reset
  }

  async runSegmentFlow(gameState, timing = DEFAULT_FLOW_TIMING) {
    const segments = buildSegmentFlow({
      gameState,
      scene: this.scene,
      timing,
      waitCancellable: (ms) => this.waitCancellable(ms),
      cancelActiveDelay: () => this.cancelActiveDelay()
    });

    if (!segments.length) {
      return false;
    }

    this.scene.clearPendingFastForward?.();
    this.segmentFlowRunner.setSegments(segments);

    try {
      await this.segmentFlowRunner.run();
    } finally {
      this.segmentFlowRunner.reset();
      this.cancelActiveDelay();
      this.scene.clearPendingFastForward?.();
    }

    return true;
  }

  waitCancellable(ms) {
    return this.waitForPresentation(ms);
  }

  cancelActiveDelay() {
    this.scene?.cancelSkippablePresentationWaits?.();
  }

  waitForPresentation(ms, options = {}) {
    if (this.scene?.waitForPresentation) {
      return this.scene.waitForPresentation(ms, {
        skippable: true,
        ...options
      });
    }

    return wait(ms);
  }

  requestFastForward() {
    this.segmentFlowRunner.requestSkip({
      fallbackSkipAction: () => {
        this.cancelActiveDelay();
        this.scene?.requestFastForward?.();
      }
    });
  }
}


export default Client


async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


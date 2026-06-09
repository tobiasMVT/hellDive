export function createGameServerFlowMethods(deps = {}) {
  const {
    ACTION_BANANA_HUNT,
    ACTION_FREESPIN_BANANA_HUNT,
    ACTION_TROLL_RUSH,
    ACTION_TROLL_TEASE,
    BASE_MONKEY_STATE,
    FALLBACK_TICKET,
    LEGACY_ACTION_BANANA_HUNT,
    LEGACY_ACTION_FREESPIN_BANANA_HUNT,
    MAX_ACTIONS_PER_ROUND,
    MAX_TICKET_SEARCH_ATTEMPTS,
    TROLL_FEATURE_ENABLED,
    isPlainObject,
    isPositiveNumber,
    resetGameState,
    serverConfig
  } = deps;

  return {
    async generateSingleRound({ betSize = 1, logRoundStart = false, ticketStrategy } = {}) {
      const gameState = structuredClone(serverConfig.gameState);
      resetGameState(gameState);
      const roundMeta = this.buildRoundMeta({ betSize, ticketStrategy });

      if (logRoundStart && !serverConfig.playBackEnd) {
        console.log(">>> Generating game round");
      }

      const roundStates = [];
      for (let i = 0; i < MAX_ACTIONS_PER_ROUND; i++) {
        const resp = await this.getResponse(gameState, betSize);
        resp.roundMeta = roundMeta;
        roundStates.push(structuredClone(resp));

        if (resp.nextAction === "spin") {
          return roundStates;
        }
      }

      if (serverConfig.devMode) {
        console.log(`Did not find valid gameround in ${MAX_ACTIONS_PER_ROUND} attempts`);
      }
      return [];
    },

    async generateRoundStates({ betSize = 1, ticketStrategy } = {}) {
      const strategy = this.resolveTicketStrategy(ticketStrategy);
      const bucket = serverConfig?.[strategy];
      const ticketModeEnabled =
        isPlainObject(bucket) && Object.values(bucket).some((weight) => isPositiveNumber(weight));

      if (!ticketModeEnabled) {
        return this.generateSingleRound({ betSize, logRoundStart: true, ticketStrategy: strategy });
      }

      const ticket = this.drawWeightedTicket(strategy);

      if (!serverConfig.playBackEnd) {
        console.log(`[DEV Tickets] Strategy "${strategy}" -> ticket "${ticket}"`);
      }

      for (let attempt = 1; attempt <= MAX_TICKET_SEARCH_ATTEMPTS; attempt++) {
        const roundStates = await this.generateSingleRound({ betSize, ticketStrategy: strategy });
        if (!roundStates.length) {
          continue;
        }

        if (this.isTicketMatch(ticket, roundStates)) {
          if (serverConfig.devMode) {
            console.log(`[DEV Tickets] Matched "${ticket}" in ${attempt} attempts`);
          }
          return roundStates;
        }
      }

      console.warn(
        `[DEV Tickets] Could not match "${ticket}" in ${MAX_TICKET_SEARCH_ATTEMPTS} attempts. Falling back to ${FALLBACK_TICKET}.`
      );

      for (let attempt = 1; attempt <= 100; attempt++) {
        const roundStates = await this.generateSingleRound({ betSize, ticketStrategy: strategy });
        if (this.isTicketMatch(FALLBACK_TICKET, roundStates)) {
          return roundStates;
        }
      }

      return [];
    },

    prepareResponseState(gameState) {
      gameState.prevTwa = gameState.twa;
      gameState.pastAction = gameState.executedAction;
      gameState.executedAction = gameState.nextAction;

      if (gameState.executedAction === LEGACY_ACTION_BANANA_HUNT) {
        gameState.executedAction = ACTION_BANANA_HUNT;
      } else if (gameState.executedAction === LEGACY_ACTION_FREESPIN_BANANA_HUNT) {
        gameState.executedAction = ACTION_FREESPIN_BANANA_HUNT;
      } else if (gameState.executedAction === ACTION_TROLL_TEASE) {
        gameState.executedAction = gameState.isBonus ? "freespin" : "spin";
      } else if (gameState.executedAction === ACTION_TROLL_RUSH) {
        gameState.executedAction = gameState.isBonus ? ACTION_FREESPIN_BANANA_HUNT : ACTION_BANANA_HUNT;
      }
      if (gameState.pastAction === LEGACY_ACTION_BANANA_HUNT) {
        gameState.pastAction = ACTION_BANANA_HUNT;
      } else if (gameState.pastAction === LEGACY_ACTION_FREESPIN_BANANA_HUNT) {
        gameState.pastAction = ACTION_FREESPIN_BANANA_HUNT;
      } else if (gameState.pastAction === ACTION_TROLL_TEASE || gameState.pastAction === ACTION_TROLL_RUSH) {
        gameState.pastAction = gameState.isBonus ? "freespin" : "spin";
      }
      this.normalizeRushState(gameState);

      gameState.collectedGoldPiles = null;
      gameState.bananaImpactWins = [];
      gameState.demonsKilledThisAction = 0;
      gameState.bonusStageEvent = null;
      gameState.bonusEndPayout = null;
      gameState.bonusMysteryFeatureReleaseThisAction = null;
      if (!gameState.trollRush || typeof gameState.trollRush !== "object") {
        gameState.trollRush = {};
      }
      gameState.trollRush.isTease = false;

      if (!gameState.bonusState) {
        gameState.bonusState = {
          initialFreespins: 0,
          finalFreespins: 0,
          initialDemonsKilled: 0,
          initialDemonsCollected: 0,
          finalDemonsKilled: 0,
          finalDemonsCollected: 0,
          collectedSymbolCounts: {},
          collectedSymbolsTotal: 0,
          immediateLowPositionLandings: [],
          chestsRewarded: 0,
          chestsPending: 0
        };
      }
      const normalizedInitialBonusKills =
        gameState.bonusState.initialDemonsCollected ?? gameState.bonusState.initialDemonsKilled ?? 0;
      const normalizedFinalBonusKills =
        gameState.bonusState.finalDemonsCollected ?? gameState.bonusState.finalDemonsKilled ?? 0;
      gameState.bonusState.initialDemonsKilled = normalizedInitialBonusKills;
      gameState.bonusState.finalDemonsKilled = normalizedFinalBonusKills;
      gameState.bonusState.initialDemonsCollected = normalizedInitialBonusKills;
      gameState.bonusState.finalDemonsCollected = normalizedFinalBonusKills;
      gameState.bonusState.initialFreespins = gameState.bonusState.finalFreespins;
      gameState.bonusState.initialDemonsKilled = gameState.bonusState.finalDemonsKilled;
      gameState.bonusState.initialDemonsCollected = gameState.bonusState.finalDemonsCollected;
      this.syncBonusCollectedSymbolsOnState(gameState);
      gameState.bonusCollectedThisAction = [];
      this.normalizeBonusMysteryFeatureState(gameState);
      gameState.bonusMysteryFeatureCollectedThisAction = [];
      this.normalizeLightningBeeFeatureState(gameState);
      gameState.lightningBeeFeatureCollectedThisAction = [];
      gameState.lightningBeeMovementsThisAction = [];
      this.normalizeMergeGunFeatureState(gameState);
      this.normalizeMergeGunFeatureActionState(gameState, { reset: true });
      this.clearCompletedMergeGunFeatureSymbols(gameState, gameState.reels);
      this.clearCompletedMergeGunFeatureSymbols(gameState, gameState.reelsBeforeDrop);
      this.clearCompletedMergeGunFeatureSymbols(gameState, gameState.reelsAfterDrop);
      this.clearCompletedLightningBeeFeatureSymbols(gameState, gameState.reels);
      this.clearCompletedLightningBeeFeatureSymbols(gameState, gameState.reelsBeforeDrop);
      this.clearCompletedLightningBeeFeatureSymbols(gameState, gameState.reelsAfterDrop);
      gameState.hero = { ...BASE_MONKEY_STATE };
      gameState.heroAngelStartMultiplier = Math.max(
        1,
        Math.floor(Number(gameState.heroAngelStartMultiplier || gameState.heroAngelNextMultiplier || 1) || 1)
      );
      gameState.heroAngelMultiplier = Number.isFinite(Number(gameState.heroAngelMultiplier))
        ? Math.max(1, Math.floor(Number(gameState.heroAngelMultiplier) || 1))
        : null;
      gameState.heroAngelNextMultiplier = Math.max(
        1,
        Math.floor(Number(gameState.heroAngelNextMultiplier || 1) || 1)
      );
      this.normalizeDemonMeter(gameState);
      this.normalizeBonusStageState(gameState);
      const heavenHellEnabled = this.isHeavenHellEnabled();
      if (heavenHellEnabled) {
        this.ensureHeavenHellState(gameState);
      }
      gameState.timeSymbols = [];
      gameState.barrelBursts = [];

      return { heavenHellEnabled };
    },

    runExecutedAction(gameState, betSize, context = {}) {
      if (gameState.executedAction === "spin") {
        this.handleSpinAction(gameState, betSize, context);
      } else if (gameState.executedAction === "respin") {
        this.handleRespinAction(gameState, betSize, context);
      } else if (gameState.executedAction === ACTION_BANANA_HUNT || gameState.executedAction === LEGACY_ACTION_BANANA_HUNT) {
        this.handleDemonHuntAction(gameState, context);
      } else if (gameState.executedAction === "bonustransition") {
        this.handleBonusTransitionAction(gameState, context);
      } else if (gameState.executedAction === "freespin") {
        return this.handleFreespinAction(gameState, betSize, context) === true;
      } else if (gameState.executedAction === "freerespin") {
        return this.handleFreerespinAction(gameState, betSize, context) === true;
      } else if (gameState.executedAction === ACTION_FREESPIN_BANANA_HUNT || gameState.executedAction === LEGACY_ACTION_FREESPIN_BANANA_HUNT) {
        this.handleFreespinDemonHuntAction(gameState, betSize, context);
      } else if (gameState.executedAction === "chestreward") {
        this.handleChestRewardAction(gameState, context);
      } else if (gameState.executedAction === ACTION_TROLL_TEASE) {
        this.handleTrollTeaseAction(gameState, context);
      } else if (gameState.executedAction === ACTION_TROLL_RUSH) {
        this.handleTrollRushAction(gameState, context);
      }

      return false;
    },

    finalizeResponseState(gameState) {
      if (gameState.tbm >= serverConfig.wincap) {
        const pendingChests = Array.isArray(gameState?.heavenHell?.bonus?.pendingChests)
          ? gameState.heavenHell.bonus.pendingChests
          : [];
        const pendingChestCount = pendingChests.length;
        const bonusState = pendingChestCount > 0 ? this.ensureHeavenHellState(gameState)?.bonus : null;
        const nextActionBeforeWinCap = gameState.nextAction;
        gameState.winAmount = serverConfig.wincap;
        gameState.twa = serverConfig.wincap * gameState.betSize;
        gameState.tbm = serverConfig.wincap;
        if (gameState.isBonus === true && pendingChestCount > 0) {
          if (bonusState && typeof bonusState.chestRewardResumeAction !== "string") {
            bonusState.chestRewardResumeAction =
              nextActionBeforeWinCap === "freerespin" || Number(gameState.bonusState?.finalFreespins || 0) > 0
                ? "freerespin"
                : "spin";
          }
          gameState.nextAction = "chestreward";
        } else {
          gameState.nextAction = "spin";
        }
      }

      if (
        TROLL_FEATURE_ENABLED &&
        (gameState.nextAction === "spin" || gameState.nextAction === "freespin") &&
        gameState.executedAction !== "bonustransition"
      ) {
        const isBonus = gameState.isBonus || false;
        const currentMultiplier = gameState.multiplier || 1;

        if (this.shouldTrollRush(isBonus, gameState.heroPosition, currentMultiplier) && !gameState.trollRush.isTease) {
          const teaseOdds = serverConfig.trollRushOdds?.teaseOdds || 50;
          const isTease = Math.random() * 100 < teaseOdds;

          if (isTease) {
            gameState.nextAction = ACTION_TROLL_TEASE;
          } else {
            gameState.nextAction = ACTION_TROLL_RUSH;
          }
        }
      }

      if (gameState.timeSymbols && gameState.timeSymbols.length > 0) {
        if (!gameState.collectedTimeSymbols) {
          gameState.collectedTimeSymbols = [];
        }

        gameState.timeSymbols.forEach((ts) => {
          gameState.collectedTimeSymbols.push({
            ...ts,
            action: gameState.executedAction
          });
        });
      }

      if (gameState.nextAction === "spin") {
        const mysteryWinTBM = gameState.rtpData?.mysteryWinTBM || 0;
        const mysteryRTP = gameState.rtpData?.mysteryRTP || 0;
        const mysteryWildRTP = gameState.rtpData?.mysteryWildRTP || 0;
        const normalWinTBM = (gameState.tbm || 0) - mysteryWinTBM;

        const collectedHammers = gameState.collectedTimeSymbols || [];
        const timeSymbolsTotal = collectedHammers.length;
        const timeSymbolsBonus = collectedHammers.filter((ts) => ts.bonus).length;
        const timeSymbolsSpin = collectedHammers.filter((ts) => ts.action === "spin" || ts.action === "freespin").length;
        const timeSymbolsRespin = collectedHammers.filter((ts) => ts.action === "respin" || ts.action === "freerespin").length;
        const timeSymbolsBonusSpin = collectedHammers.filter((ts) => ts.bonus && (ts.action === "spin" || ts.action === "freespin")).length;
        const timeSymbolsBonusRespin = collectedHammers.filter((ts) => ts.bonus && (ts.action === "respin" || ts.action === "freerespin")).length;

        gameState.roundSummary = {
          tbm: gameState.tbm,
          wasBonus: gameState.isBonus || false,
          mysteryWinTBM,
          mysteryRTP,
          mysteryWildRTP,
          normalWinTBM,
          clusterWinTBM: gameState.rtpData?.clusterWinTBM || 0,
          hero: {
            weapon: gameState.hero?.weapon || "staff",
            step: gameState.hero?.step || "destroy",
            necromancer: gameState.hero?.necromancer || 0
          },
          bonusDemonsKilled: (gameState.isBonus || false) ? (gameState.bonusState?.finalDemonsKilled || gameState.demonsKilled || 0) : 0,
          bonusDemonsCollected: (gameState.isBonus || false) ? (gameState.bonusState?.finalDemonsCollected || gameState.demonsCollected || 0) : 0,
          bananaMeterCount: gameState.bananaMeter?.count || 0,
          bananaMeterLevel: gameState.bananaMeter?.level || 0,
          bonusEnteredWith: (gameState.isBonus || false) ? gameState.bonusWon?.enterBonusWith : null,
          bonusTriggeredWith: (gameState.isBonus || false) ? gameState.bonusWon?.triggeredWith : null,
          timeSymbolsTotal,
          timeSymbolsBonus,
          timeSymbolsSpin,
          timeSymbolsRespin,
          timeSymbolsBonusSpin,
          timeSymbolsBonusRespin,
          heroAbilitiesApplied: gameState.rtpData?.heroAbilitiesApplied || false,
          trollRushTotal: gameState.rtpData?.trollRushTotal || 0,
          trollRushReal: gameState.rtpData?.trollRushReal || 0,
          trollRushTeases: gameState.rtpData?.trollRushTeases || 0,
          trollRushTotalMain: gameState.rtpData?.trollRushTotalMain || 0,
          trollRushTotalBonus: gameState.rtpData?.trollRushTotalBonus || 0,
          trollRushRealMain: gameState.rtpData?.trollRushRealMain || 0,
          trollRushRealBonus: gameState.rtpData?.trollRushRealBonus || 0,
          trollRushTeasesMain: gameState.rtpData?.trollRushTeasesMain || 0,
          trollRushTeasesBonus: gameState.rtpData?.trollRushTeasesBonus || 0,
          abilityContributionTBM: gameState.rtpData?.abilityContributionTBM || {
            divineX: 0,
            divineStrike: 0,
            divineCharge: 0,
            baseHunt: 0,
            other: 0
          },
          abilityProcCounts: gameState.rtpData?.abilityProcCounts || {
            divineX: 0,
            divineStrike: 0,
            divineCharge: 0
          },
          isComplete: true
        };

        if (serverConfig.devMode && timeSymbolsTotal > 0) {
          console.log("[FINAL SUMMARY] Collected hammers:", collectedHammers.length, collectedHammers);
          console.log("[FINAL SUMMARY] Stats:", {
            total: timeSymbolsTotal,
            bonus: timeSymbolsBonus,
            spin: timeSymbolsSpin,
            respin: timeSymbolsRespin,
            bonusSpin: timeSymbolsBonusSpin,
            bonusRespin: timeSymbolsBonusRespin
          });
        }
      } else {
        gameState.roundSummary = null;
      }

      if (Array.isArray(gameState.bananas)) {
        gameState.bananas = [...gameState.bananas];
      }
      this.normalizeDemonMeter(gameState);
      if (gameState.isBonus && gameState.bonusState) {
        gameState.bonusState.finalDemonsCollected = gameState.bananaMeter.count;
        gameState.bonusState.finalDemonsKilled = gameState.bananaMeter.count;
      }
      this.syncBonusCollectedSymbolsOnState(gameState);
      this.normalizeBonusMysteryFeatureState(gameState);
      this.normalizeLightningBeeFeatureState(gameState);

      return gameState;
    },

    getResponse(gameState, betSize) {
      const context = this.prepareResponseState(gameState);
      const returnedEarly = this.runExecutedAction(gameState, betSize, context);
      if (returnedEarly) {
        return gameState;
      }
      return this.finalizeResponseState(gameState);
    }
  };
}

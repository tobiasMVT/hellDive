export function createGameServerMainActionMethods(deps = {}) {
  const {
    ACTION_BANANA_HUNT,
    BASE_MONKEY_STATE,
    originalConfig,
    resetGameState,
    serverConfig
  } = deps;

  return {
    handleSpinAction(gameState, betSize, { heavenHellEnabled } = {}) {
      gameState.bucket = serverConfig.mathStyle;
      this.serverConfig = JSON.parse(JSON.stringify(originalConfig));
      this.serverConfig.symbolWeightsMain = { ...originalConfig.symbolWeightsMain };
      resetGameState(gameState);
      gameState.betSize = betSize;
      if (heavenHellEnabled) {
        this.ensureHeavenHellState(gameState);
      }

      gameState.heroPosition = null;
      gameState.skipWheel = false;
      const necromancerLevel = gameState.hero?.necromancer || 0;
      const necromancerSpawns = this.spawnNecromancerDemons(necromancerLevel, null, 1);
      gameState.necromancerSpawns = necromancerSpawns;

      gameState.reels = this.generateReels(
        this.serverConfig.symbolWeightsMain,
        serverConfig.area.width,
        serverConfig.area.height
      );

      if (necromancerSpawns.length > 0) {
        gameState.reels = this.placeNecromancerDemons(gameState.reels, necromancerSpawns);
      }

      const demonConfig = serverConfig.bananaSpawn || { minBananas: 1, maxBananas: 3, chance: 0.5 };
      gameState.reels = this.addDemons(gameState.reels, demonConfig, {
        gameState,
        heroPosition: null,
        heroFootprintSize: 1
      });

      const timeResult = this.injectTimeSymbols(gameState.reels, gameState.bonusWon?.won || false, null, gameState);
      gameState.reels = timeResult.reels;
      gameState.timeSymbols = [];
      gameState.gravity = this.decideGravity(gameState.reels);

      const multiplier = gameState.multiplier || 1;
      let result = this.processClusters(
        gameState.reels,
        betSize,
        serverConfig.minClusterSize || 4,
        multiplier,
        gameState.bananaMeter?.level,
        this.buildHeroFootprintState(gameState.heroPosition, gameState.heroFootprintSize || 1),
        true
      );
      if (!result.hasWins) {
        const fullBoardResult = this.resolveFullBoardClusterResult(
          gameState.reels,
          betSize,
          serverConfig.minClusterSize || 4,
          multiplier,
          gameState.bananaMeter?.level,
          this.buildHeroFootprintState(gameState.heroPosition, gameState.heroFootprintSize || 1),
          true
        );
        if (fullBoardResult?.hasWins) {
          result = fullBoardResult;
        }
      }
      let hasPendingBarrelRespin = false;

      if (result.hasWins) {
        gameState.clusters = result.clusters;
        gameState.winAmount = result.tbm;
        gameState.twa = (gameState.twa || 0) + result.twa;
        gameState.tbm = (gameState.tbm || 0) + result.tbm;

        if (!gameState.rtpData) gameState.rtpData = {};
        gameState.rtpData.clusterWinTBM = (gameState.rtpData.clusterWinTBM || 0) + result.tbm;

        gameState.reelsBeforeDrop = result.updatedReels;
        gameState.nextAction = "respin";
      } else {
        const barrelsOnBoard = this.getBarrelSymbolsOnBoard(gameState.reels);
        if (barrelsOnBoard.length > 0) {
          const barrelResult = this.triggerBarrelDemonBursts(gameState.reels, barrelsOnBoard, gameState);
          if (barrelResult.barrelBursts.length > 0) {
            gameState.reelsBeforeDrop = barrelResult.reels;
            hasPendingBarrelRespin = true;
          }
        }
      }

      if (!result.hasWins && hasPendingBarrelRespin) {
        gameState.clusters = [];
        gameState.winAmount = 0;
        gameState.reelsAfterDrop = null;
        gameState.nextAction = "respin";
      } else if (!result.hasWins && Object.values(gameState.reels).some((row) => row.some((sym) => this.isDemon(sym)))) {
        gameState.clusters = [];
        gameState.winAmount = 0;
        gameState.reelsBeforeDrop = null;
        gameState.nextAction = ACTION_BANANA_HUNT;
      } else if (!result.hasWins) {
        gameState.clusters = [];
        gameState.winAmount = 0;
        gameState.reelsBeforeDrop = null;
        gameState.reelsAfterDrop = null;

        if (this.shouldTriggerBonusFromDemonMeter(gameState)) {
          gameState.bonusTriggered = true;
          const triggeredWith = { ...BASE_MONKEY_STATE };
          gameState.hero = { ...BASE_MONKEY_STATE };
          gameState.bonusWon = this.rollBonusAbilities(BASE_MONKEY_STATE);
          this.syncBonusEntryFreespins(gameState);
          gameState.bonusWon.triggeredWith = triggeredWith;
          gameState.bgwe = true;
          gameState.bonusGameWonEvent = {
            source: "bananaMeterThreshold",
            action: gameState.executedAction || null
          };
          gameState.nextAction = "bonustransition";
        } else {
          gameState.nextAction = "spin";
        }
      }
    },

    handleRespinAction(gameState, betSize) {
      if (!gameState.reelsBeforeDrop) {
        console.error("❌ SERVER ERROR: reelsBeforeDrop is missing on respin!");
        gameState.reelsBeforeDrop = gameState.reels;
      }

      gameState.gravity = this.decideGravity(gameState.reelsBeforeDrop);
      const bonusAlreadyExists = gameState.bonusWon?.won || this.shouldTriggerBonusFromDemonMeter(gameState) || false;
      const timeSymbolConfig = this.resolveExplodingBarrelConfig(gameState) || {};
      const timeSymbolChance = bonusAlreadyExists ? 0 : (timeSymbolConfig.chancePerNewSymbolOnRespin ?? 2);
      const resolvedDemonSpawnConfig = this.resolveDemonSpawnConfig(serverConfig.bananaSpawn || {}, gameState);
      const respinDemonChance = bonusAlreadyExists
        ? 0
        : resolvedDemonSpawnConfig?.respinChance;

      const gravityResult = this.applyGravity(
        gameState.reelsBeforeDrop,
        this.serverConfig.symbolWeightsMain,
        gameState.gravity || "down",
        true,
        timeSymbolChance,
        1.0,
        respinDemonChance,
        this.buildHeroFootprintState(gameState.heroPosition, gameState.heroFootprintSize || 1)
      );

      gameState.dropEvent = gravityResult.dropEvent;
      gameState.reels = gravityResult.reels;
      gameState.reelsAfterDrop = gravityResult.reels;

      const newSymbolPositions = new Set();
      const direction = gravityResult.dropEvent.direction || "down";

      gravityResult.dropEvent.movements.forEach((movement) => {
        let isNewSymbol = false;

        if (direction === "down" || direction === "up") {
          isNewSymbol = movement.from >= this.height || movement.from < 0;
        } else if (direction === "left" || direction === "right") {
          isNewSymbol = movement.fromReel < 0 || movement.fromReel >= this.width;
        }

        if (isNewSymbol) {
          const targetReel = movement.toReel !== undefined ? movement.toReel : movement.reel;
          newSymbolPositions.add(`${targetReel},${movement.to}`);
        }
      });
      gameState.timeSymbols = [];

      const multiplier = gameState.multiplier || 1;
      let result = this.processClusters(
        gravityResult.reels,
        betSize,
        serverConfig.minClusterSize || 4,
        multiplier,
        gameState.bananaMeter?.level,
        this.buildHeroFootprintState(gameState.heroPosition, gameState.heroFootprintSize || 1),
        true
      );
      if (!result.hasWins) {
        const fullBoardResult = this.resolveFullBoardClusterResult(
          gravityResult.reels,
          betSize,
          serverConfig.minClusterSize || 4,
          multiplier,
          gameState.bananaMeter?.level,
          this.buildHeroFootprintState(gameState.heroPosition, gameState.heroFootprintSize || 1),
          true
        );
        if (fullBoardResult?.hasWins) {
          result = fullBoardResult;
        }
      }
      let pendingBarrelDropReels = null;

      const boostConfig = serverConfig.normalWinBoost || {};
      if (boostConfig.enabled && !result.hasWins && gameState.hero.step === "destroy") {
        if (Math.random() * 100 < (boostConfig.rerollChance || 50)) {
          const rerollResult = this.attemptNormalWinBoost(
            gravityResult.reels,
            newSymbolPositions,
            betSize,
            multiplier,
            boostConfig,
            this.buildHeroFootprintState(gameState.heroPosition, gameState.heroFootprintSize || 1),
            gameState.bananaMeter?.level,
            true
          );

          if (rerollResult.hasWins) {
            result = rerollResult.result;
            gameState.reels = rerollResult.reels;
            gameState.reelsAfterDrop = rerollResult.reels;

            gameState.dropEvent.movements.forEach((movement) => {
              const targetReel = movement.toReel !== undefined ? movement.toReel : movement.reel;
              const targetRow = movement.to;
              if (rerollResult.reels[targetReel] && rerollResult.reels[targetReel][targetRow] !== undefined) {
                movement.symbol = rerollResult.reels[targetReel][targetRow];
              }
            });
          }
        }
      }

      if (!result.hasWins) {
        const fullBoardResult = this.resolveFullBoardClusterResult(
          gameState.reels,
          betSize,
          serverConfig.minClusterSize || 4,
          multiplier,
          gameState.bananaMeter?.level,
          this.buildHeroFootprintState(gameState.heroPosition, gameState.heroFootprintSize || 1),
          true
        );
        if (fullBoardResult?.hasWins) {
          result = fullBoardResult;
        }
      }

      if (!result.hasWins) {
        const barrelsOnBoard = this.getBarrelSymbolsOnBoard(gravityResult.reels);
        if (barrelsOnBoard.length > 0) {
          const barrelResult = this.triggerBarrelDemonBursts(gravityResult.reels, barrelsOnBoard, gameState);
          if (barrelResult.barrelBursts.length > 0) {
            pendingBarrelDropReels = barrelResult.reels;
          }
        }
      }

      if (result.hasWins) {
        gameState.clusters = result.clusters;
        gameState.winAmount = result.tbm;
        gameState.twa = (gameState.twa || 0) + result.twa;
        gameState.tbm = (gameState.tbm || 0) + result.tbm;

        if (!gameState.rtpData) gameState.rtpData = {};
        gameState.rtpData.clusterWinTBM = (gameState.rtpData.clusterWinTBM || 0) + result.tbm;

        if (gameState.rtpData?.mysteryPositionRTP && gameState.rtpData.mysteryPositionRTP.length > 0) {
          let mysteryWinAmount = 0;
          let mysteryWildWinAmount = 0;

          result.clusters.forEach((cluster) => {
            let hasMysteryPosition = false;
            let hasMysteryWildPosition = false;

            cluster.positions.forEach((pos) => {
              const mysteryMatch = gameState.rtpData.mysteryPositionRTP.find(
                (mysteryPos) => mysteryPos.reel === pos.reel && mysteryPos.row === pos.row
              );
              if (mysteryMatch) {
                if (mysteryMatch.stepType === "mystery") {
                  hasMysteryPosition = true;
                } else if (mysteryMatch.stepType === "mysteryWild") {
                  hasMysteryWildPosition = true;
                }
              }
            });

            if (hasMysteryPosition) {
              mysteryWinAmount += cluster.tbm || 0;
            }
            if (hasMysteryWildPosition) {
              mysteryWildWinAmount += cluster.tbm || 0;
            }
          });

          if (!gameState.rtpData) {
            gameState.rtpData = {};
          }
          gameState.rtpData.mysteryWinTBM = (gameState.rtpData.mysteryWinTBM || 0) + mysteryWinAmount + mysteryWildWinAmount;
          gameState.rtpData.mysteryRTP = (gameState.rtpData.mysteryRTP || 0) + mysteryWinAmount;
          gameState.rtpData.mysteryWildRTP = (gameState.rtpData.mysteryWildRTP || 0) + mysteryWildWinAmount;
        }

        gameState.reelsBeforeDrop = result.updatedReels;
        gameState.nextAction = "respin";
      } else if (pendingBarrelDropReels) {
        gameState.clusters = [];
        gameState.winAmount = 0;
        gameState.reels = gravityResult.reels;
        gameState.reelsAfterDrop = gravityResult.reels;
        gameState.reelsBeforeDrop = pendingBarrelDropReels;

        if (gameState.rtpData) {
          gameState.rtpData.mysteryPositionRTP = [];
        }

        gameState.nextAction = "respin";
      } else if (Object.values(gravityResult.reels).some((row) => row.some((sym) => this.isDemon(sym)))) {
        gameState.clusters = [];
        gameState.winAmount = 0;
        gameState.reels = gravityResult.reels;
        gameState.reelsBeforeDrop = null;

        if (gameState.rtpData) {
          gameState.rtpData.mysteryPositionRTP = [];
        }

        gameState.nextAction = ACTION_BANANA_HUNT;
      } else {
        gameState.clusters = [];
        gameState.winAmount = 0;
        gameState.reels = gravityResult.reels;
        gameState.reelsBeforeDrop = null;

        if (gameState.rtpData) {
          gameState.rtpData.mysteryPositionRTP = [];
        }

        if (this.shouldTriggerBonusFromDemonMeter(gameState) && !gameState.bonusWon?.triggeredWith) {
          gameState.bonusTriggered = true;
          const triggeredWith = { ...BASE_MONKEY_STATE };
          gameState.bonusWon = this.rollBonusAbilities(BASE_MONKEY_STATE);
          this.syncBonusEntryFreespins(gameState);
          gameState.bonusWon.triggeredWith = triggeredWith;
          gameState.bgwe = true;
          gameState.bonusGameWonEvent = {
            source: "bananaMeterThreshold",
            action: gameState.executedAction || null
          };
          gameState.nextAction = "bonustransition";
        } else if (this.shouldTriggerBonusFromDemonMeter(gameState)) {
          gameState.bonusTriggered = true;
          this.syncBonusEntryFreespins(gameState);
          gameState.bgwe = true;
          gameState.bonusGameWonEvent = {
            source: "bananaMeterThreshold",
            action: gameState.executedAction || null
          };
          gameState.nextAction = "bonustransition";
        } else {
          gameState.nextAction = "spin";
        }
      }
    },

    handleDemonHuntAction(gameState, { heavenHellEnabled } = {}) {
      const stepType = "destroy";
      const weaponId = BASE_MONKEY_STATE.weapon;
      const heroPosition = gameState.heroPosition || null;
      let heavenHellPortalTriggered = false;

      const isTrollRush = gameState.trollRush && gameState.trollRush.isTrollRush;
      const reelsToHunt = isTrollRush ? gameState.reelsBeforeDrop : gameState.reels;

      const preHuntReels = JSON.parse(JSON.stringify(reelsToHunt || {}));
      const huntResult = this.executeDemonHunt(reelsToHunt, stepType, weaponId, heroPosition, gameState);

      if (!gameState.rtpData) {
        gameState.rtpData = {};
      }
      gameState.rtpData.heroAbilitiesApplied = false;

      gameState.reels = huntResult.reels;
      gameState.heroPath = huntResult.heroPath;
      gameState.affectedPositions = huntResult.affectedPositions;
      const demonsKilledThisAction = Number(huntResult.demonsKilled || 0);
      gameState.demonsKilledThisAction = demonsKilledThisAction;
      gameState.demonsKilled = Number(gameState.demonsKilled || 0) + demonsKilledThisAction;
      gameState.demonsCollected = Number(huntResult.demonsCollected || demonsKilledThisAction);
      gameState.orbDrops = huntResult.orbDrops;
      gameState.mysteryReveals = huntResult.mysteryReveals || [];
      gameState.heroPosition = huntResult.heroFinalPosition;
      gameState.heroAngelStartMultiplier = Math.max(
        1,
        Math.floor(Number(huntResult.heroAngelStartMultiplier ?? gameState.heroAngelNextMultiplier ?? 1) || 1)
      );
      gameState.heroAngelMultiplier = huntResult.heroAngelMultiplier ?? gameState.heroAngelMultiplier ?? null;
      gameState.heroAngelNextMultiplier = Math.max(
        1,
        Math.floor(Number(huntResult.heroAngelNextMultiplier ?? gameState.heroAngelNextMultiplier ?? 1) || 1)
      );
      gameState.bananaImpactWins = huntResult.heroPath?.filter((step) => Number(step?.impactWinTwa || 0) > 0) || [];
      if (!heavenHellEnabled) {
        const mergeGunCollections = this.collectMergeGunFeaturesFromHeroPath(gameState, gameState.reels, gameState.heroPath || []);
        this.triggerMergeGunActivations(
          gameState,
          mergeGunCollections,
          huntResult.heroFinalPosition,
          huntResult.heroFinalFootprintSize || gameState.heroFootprintSize || 1
        );
        this.collectBonusMysteryFeaturesFromHeroPath(gameState, gameState.reels, gameState.heroPath || []);
        this.collectLightningBeeFeaturesFromHeroPath(gameState, gameState.reels, gameState.heroPath || []);
      }
      const heavenHellPostHunt = heavenHellEnabled
        ? this.processHeavenHellPostHunt(gameState, huntResult, preHuntReels, { isBonus: false })
        : { totalKills: 0, weightedKills: 0, lootDrops: [] };
      if (heavenHellEnabled) {
        gameState.reels = huntResult.reels;
      }

      if (gameState.mysteryReveals.length > 0) {
        if (!gameState.rtpData) {
          gameState.rtpData = {};
        }
        gameState.rtpData.mysteryPositionRTP = gameState.mysteryReveals.map((reveal) => ({
          reel: reveal.reel,
          row: reveal.row,
          stepType
        }));
      }

      gameState.totalDemonsKilledInSequence = (gameState.totalDemonsKilledInSequence || 0) + demonsKilledThisAction;
      gameState.totalDemonsCollectedInSequence = (gameState.totalDemonsCollectedInSequence || 0) + gameState.demonsCollected;
      if (!heavenHellEnabled) {
        this.addDemonMeterProgress(gameState, gameState.demonsCollected);
        this.normalizeBonusStageState(gameState, { awardFreespins: true });
      }
      if (Number(huntResult.clusterWinTbm || 0) > 0) {
        gameState.winAmount = Number(huntResult.clusterWinTbm || 0);
        gameState.twa = (gameState.twa || 0) + Number(huntResult.clusterWinTwa || 0);
        gameState.tbm = (gameState.tbm || 0) + Number(huntResult.clusterWinTbm || 0);
        gameState.rtpData.clusterWinTBM = (gameState.rtpData.clusterWinTBM || 0) + Number(huntResult.clusterWinTbm || 0);
      } else {
        gameState.winAmount = 0;
      }
      if (this.shouldTriggerBonusFromDemonMeter(gameState)) {
        gameState.bonusTriggered = true;
      }
      if (heavenHellEnabled && heavenHellPostHunt.totalKills > 0) {
        const triggeredPortal = this.maybeTriggerHeavenHellPortal(gameState, heavenHellPostHunt.totalKills);
        if (triggeredPortal) {
          heavenHellPortalTriggered = true;
        }
      }

      if (isTrollRush && gameState.trollRush.trollPosition) {
        const reelsWithTrollsCleared = JSON.parse(JSON.stringify(huntResult.reels));

        gameState.trollRush.trollPosition.forEach((pos) => {
          const isHeroPosition = (pos.reel === huntResult.heroFinalPosition.reel && pos.row === huntResult.heroFinalPosition.row);
          if (!isHeroPosition) {
            reelsWithTrollsCleared[pos.reel][pos.row] = 0;
          }
        });

        gameState.reelsBeforeDrop = reelsWithTrollsCleared;
        gameState.clusters = [];
        gameState.nextAction = "respin";
        gameState.trollRush.isTrollRush = false;
      } else {
        let reelsAfterHuntStep = huntResult.reels;
        if ((stepType === "mystery" || stepType === "mysteryWild") && gameState.mysteryReveals.length > 0) {
          reelsAfterHuntStep = JSON.parse(JSON.stringify(huntResult.reels));
          gameState.mysteryReveals.forEach((reveal) => {
            reelsAfterHuntStep[reveal.reel][reveal.row] = reveal.revealTo;
          });
        }
        gameState.reels = reelsAfterHuntStep;
        gameState.reelsBeforeDrop = reelsAfterHuntStep;
        gameState.clusters = [];
        gameState.nextAction = "respin";
      }
      if (heavenHellPortalTriggered) {
        gameState.bgwe = true;
        gameState.bonusGameWonEvent = gameState.bonusGameWonEvent || {
          source: "heavenHellRandomTrigger",
          action: gameState.executedAction || null
        };
      }
    },

    handleBonusTransitionAction(gameState, { heavenHellEnabled } = {}) {
      gameState.nextAction = "freespin";
      gameState.isBonus = true;
      const hasValidHeroPos =
        gameState.heroPosition &&
        Number.isFinite(gameState.heroPosition.reel) &&
        Number.isFinite(gameState.heroPosition.row);
      if (!hasValidHeroPos) {
        gameState.heroPosition = serverConfig.heroStartingPosition || { reel: 4, row: 2 };
      }
      const entryFreespins = this.syncBonusEntryFreespins(gameState);
      gameState.bonusState.initialFreespins = entryFreespins;
      gameState.bonusState.finalFreespins = entryFreespins;
      gameState.bonusState.collectedSymbolCounts = {};
      gameState.bonusState.collectedSymbolsTotal = 0;
      gameState.bonusState.immediateLowPositionLandings = [];
      this.ensureBonusMultiplierFruitState(gameState);
      this.syncBonusCollectedSymbolsOnState(gameState);
      gameState.bonusCollectedThisAction = [];
      this.normalizeBonusMysteryFeatureState(gameState, { resetCollected: true });
      gameState.bonusMysteryFeatureCollectedThisAction = [];
      this.normalizeLightningBeeFeatureState(gameState, { resetCollected: true, resetMultiplier: true });
      gameState.lightningBeeFeatureCollectedThisAction = [];
      gameState.lightningBeeMovementsThisAction = [];
      this.normalizeMergeGunFeatureState(gameState, { resetCollected: true, resetAreas: true });
      this.normalizeMergeGunFeatureActionState(gameState, { reset: true });
      gameState.bonusEndPayout = null;
      gameState.hero = { ...BASE_MONKEY_STATE };
      this.normalizeBonusStageState(gameState);
      if (heavenHellEnabled) {
        const heavenHell = this.ensureHeavenHellState(gameState);
        heavenHell.portalTriggered = false;
        const hasPortalBonus = this.syncHeavenHellPortalBonusFlag(gameState);
        const heavenEntryFreespins = Math.max(
          1,
          Math.floor(Number(this.getHeavenHellConfig()?.bonus?.entryFreespins ?? 5) || 5)
        );
        gameState.bonusState.initialFreespins = heavenEntryFreespins;
        gameState.bonusState.finalFreespins = heavenEntryFreespins;
        heavenHell.bonus.globalMultiplier = 1;
        heavenHell.bonus.killsTotal = 0;
        heavenHell.bonus.killsTowardsUnlock = 0;
        heavenHell.bonus.nextAbilityKillThreshold = Math.max(
          20,
          Math.floor(Number(this.getHeavenHellConfig()?.bonus?.abilityUnlock?.killsPerUnlock ?? 20) || 20)
        );
        heavenHell.bonus.portalBonus = hasPortalBonus;
        heavenHell.bonus.abilities = { divineX: 0, divineStrike: 0, divineCharge: 0 };
        heavenHell.bonus.freerespinChain = 0;
        heavenHell.bonus.actionCount = 0;
        heavenHell.bonus.lootGround = [];
        heavenHell.bonus.abilityProcsThisAction = [];
        const entryUnlock = this.unlockRandomHeavenHellAbility(gameState, { entry: true });
        if (entryUnlock) {
          heavenHell.bonus.abilityProcsThisAction.push({ type: "entryUnlock", ...entryUnlock });
        }
        gameState.multiplier = 1;
        gameState.heroAngelStartMultiplier = 1;
        gameState.heroAngelMultiplier = null;
        gameState.heroAngelNextMultiplier = 1;
        gameState.heroPosition = serverConfig.heroStartingPosition || { reel: 4, row: 2 };
      }
    }
  };
}



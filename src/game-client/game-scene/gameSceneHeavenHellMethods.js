export function createGameSceneHeavenHellMethods(deps = {}) {
  const {
    DEPTH_HERO,
    DEPTH_HOUSE,
    DEPTH_SYMBOLS,
    GRID_OFFSET_X,
    GRID_OFFSET_Y,
    HERO_STAGE_TEXTURE_KEYS,
    Phaser,
    TROLL_SYMBOL_ID,
    clientConfig,
    getHeroScaleForFootprint,
    getSymbolScale
  } = deps;
  const SOUL_COLLECT_TRAIL_DEPTH = DEPTH_HOUSE + 1;
  const SOUL_COLLECT_ORB_DEPTH = DEPTH_HOUSE + 2;
  const SOUL_COLLECT_INTAKE_DEPTH = DEPTH_HOUSE + 3;

  return {
    clearHeavenHellRippleFx() {
        if (!Array.isArray(this.heavenHellRippleFx)) {
          this.heavenHellRippleFx = [];
          return;
        }
        this.heavenHellRippleFx.forEach((fx) => {
          if (fx && !fx.destroyed) fx.destroy();
        });
        this.heavenHellRippleFx = [];
      },

    clearHeavenHellDivineGroundFx({ fade = true } = {}) {
        if (!Array.isArray(this.heavenHellDivineGroundFx)) {
          this.heavenHellDivineGroundFx = [];
          return;
        }
        const fxList = this.heavenHellDivineGroundFx;
        this.heavenHellDivineGroundFx = [];
        fxList.forEach((fx) => {
          if (!fx || fx.destroyed) return;
          if (fade) {
            this.tweens.add({
              targets: fx,
              alpha: 0,
              duration: 420,
              ease: "Sine.easeOut",
              onComplete: () => fx.destroy()
            });
          } else {
            fx.destroy();
          }
        });
      },

    getHellDiveBackgroundTextureKey(gameState = {}) {
        const action = String(gameState?.executedAction || "");
        const leavingBonusAfterResolvedAction =
          (action === "freespin" || action === "freerespin") && gameState?.nextAction === "spin";
        return gameState?.isBonus === true && !leavingBonusAfterResolvedAction
          ? "helldive_hell_bonus_bg"
          : "helldive_heaven_bg";
      },

    updateHellDiveBackground(gameState = {}, { immediate = false, fade = true } = {}) {
        if (!this.mainBackground || this.mainBackground.destroyed || !this.textures) return;
        const desiredTexture = this.getHellDiveBackgroundTextureKey?.(gameState) || "helldive_heaven_bg";
        if (!this.textures.exists(desiredTexture)) return;
        if (this.mainBackground.texture?.key === desiredTexture) return;
        if (this._hellDiveBackgroundTargetTexture === desiredTexture) return;
    
        this._hellDiveBackgroundTargetTexture = desiredTexture;
    
        if (immediate || fade === false || !this.add || !this.tweens) {
          this.mainBackground.setTexture(desiredTexture);
          this._hellDiveBackgroundTargetTexture = null;
          return;
        }
    
        if (this._hellDiveBackgroundFade && !this._hellDiveBackgroundFade.destroyed) {
          this._hellDiveBackgroundFade.destroy();
        }
    
        const fadeImage = this.add.image(this.mainBackground.x, this.mainBackground.y, desiredTexture)
          .setOrigin(this.mainBackground.originX ?? 0, this.mainBackground.originY ?? 0)
          .setDepth((this.mainBackground.depth ?? 0) + 0.02)
          .setScale(this.mainBackground.scaleX || 1, this.mainBackground.scaleY || 1)
          .setAlpha(0);
        fadeImage.setScrollFactor?.(this.mainBackground.scrollFactorX ?? 1, this.mainBackground.scrollFactorY ?? 1);
        this._hellDiveBackgroundFade = fadeImage;
    
        this.tweens.add({
          targets: fadeImage,
          alpha: 1,
          duration: gameState?.nextAction === "spin" ? 720 : 520,
          ease: "Sine.easeInOut",
          onComplete: () => {
            if (this.mainBackground && !this.mainBackground.destroyed) {
              this.mainBackground.setTexture(desiredTexture);
            }
            if (fadeImage && !fadeImage.destroyed) {
              fadeImage.destroy();
            }
            if (this._hellDiveBackgroundFade === fadeImage) {
              this._hellDiveBackgroundFade = null;
            }
            if (this._hellDiveBackgroundTargetTexture === desiredTexture) {
              this._hellDiveBackgroundTargetTexture = null;
            }
          }
        });
      },

    showHeavenHellPortalAura(_gameState = {}) {
        const centerX = GRID_OFFSET_X + (clientConfig.area.width * 70) / 2;
        const centerY = GRID_OFFSET_Y + (clientConfig.area.height * 70) / 2;
        if (!this.heavenHellPortalAura || this.heavenHellPortalAura.destroyed) {
          this.heavenHellPortalAura = this.add.circle(centerX, centerY, 46, 0x6BC9FF, 0.08)
            .setDepth(DEPTH_HERO + 1);
        }
        this.heavenHellPortalAura.setPosition(centerX, centerY);
        this.heavenHellPortalAura.setVisible(true);
        this.tweens.killTweensOf(this.heavenHellPortalAura);
        this.tweens.add({
          targets: this.heavenHellPortalAura,
          alpha: 0.2,
          scale: 1.18,
          duration: 460,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
      },

    async playHeavenHellRippleSpawn(gameState = {}) {
        const rippleInjections = Array.isArray(gameState?.heavenHell?.bonus?.rippleInjectionsThisAction)
          ? gameState.heavenHell.bonus.rippleInjectionsThisAction
          : [];
    
        this.clearHeavenHellRippleFx?.();
    
        const isFreespinWave = gameState?.executedAction === "freespin";
        const waveTextureKey = isFreespinWave ? "helldive_divine_wave_tile" : "helldive_hell_wave_tile";
        const waveStyle = isFreespinWave
          ? {
              fill: 0xFFE8A3,
              hotFill: 0xFFF7D4,
              border: 0xFFD76A,
              hotBorder: 0xFFFFFF,
              spark: 0xFFF9DA,
              baseAlpha: 0.3,
              hotAlpha: 0.66,
              baseScale: 0.56,
              hotScale: 1.12,
              cleanScale: 1.04,
              borderAlpha: 0.62,
              hotBorderAlpha: 0.92,
              spinAngle: 11
            }
          : {
              fill: 0x5A0707,
              hotFill: 0x9D1010,
              border: 0xAA2418,
              hotBorder: 0xFF4A3D,
              spark: 0xFFB04D,
              baseAlpha: 0.32,
              hotAlpha: 0.58,
              baseScale: 0.62,
              hotScale: 1.16,
              cleanScale: 1.06,
              borderAlpha: 0.45,
              hotBorderAlpha: 0.9,
              spinAngle: 0
            };
    
        const occupied = new Set(rippleInjections.map((entry) => `${entry?.reel},${entry?.row}`));
        const cellSize = 70;
        const waveCells = [];
        for (let reel = 0; reel < clientConfig.area.width; reel++) {
          for (let row = 0; row < clientConfig.area.height; row++) {
            const symbol = gameState?.reels?.[reel]?.[row];
            if (symbol === "HOUSE" || symbol === clientConfig.symbolsMapping?.house) continue;
            const center = this.getGridCellCenter(reel, row);
            waveCells.push({ reel, row, center, diagonal: reel + (clientConfig.area.height - 1 - row) });
          }
        }
    
        const maxDiagonal = waveCells.reduce((max, cell) => Math.max(max, cell.diagonal), 0);
        const waveDuration = Math.max(360, (maxDiagonal + 1) * 38 + 190);
    
        this.syncSpritesToReelState(gameState?.reels || {});
        this.hideNonHeavenHellBonusSymbols(gameState);
    
        // Hide incoming demons until their server-provided spawn position is animated.
        rippleInjections.forEach((entry) => {
          const reel = Math.floor(Number(entry?.reel));
          const row = Math.floor(Number(entry?.row));
          const sprite = this.reelSprites?.[reel]?.[row];
          if (!sprite || sprite.destroyed) return;
          sprite.setAlpha(0);
          sprite.setScale((getSymbolScale(sprite.symbolKey) || 1) * 0.68);
        });
    
        const spawnOneDemon = (entry, delay = 0) => new Promise((resolve) => {
          const reel = Math.floor(Number(entry?.reel));
          const row = Math.floor(Number(entry?.row));
          if (!Number.isFinite(reel) || !Number.isFinite(row)) {
            resolve();
            return;
          }
          const center = this.getGridCellCenter(reel, row);
          const sprite = this.reelSprites?.[reel]?.[row];
          this.time.delayedCall(Math.max(0, delay), () => {
            const portalSprite = this.textures?.exists?.("helldive_portal_red")
              ? this.add.image(center.x, center.y, "helldive_portal_red").setScale(0.35).setAlpha(0.9)
              : null;
            if (portalSprite) portalSprite.setDepth(DEPTH_SYMBOLS + 8).setBlendMode(Phaser.BlendModes.ADD);
            const portalRing = this.add.circle(center.x, center.y, 12, 0xFF2C1F, 0.5)
              .setDepth(DEPTH_SYMBOLS + 8)
              .setBlendMode(Phaser.BlendModes.ADD);
            const ember = this.add.circle(center.x, center.y, 5, 0xFFB04D, 0.85)
              .setDepth(DEPTH_SYMBOLS + 9)
              .setBlendMode(Phaser.BlendModes.ADD);
            this.heavenHellRippleFx.push(portalRing, ember);
            if (portalSprite) this.heavenHellRippleFx.push(portalSprite);
            this.playSfx?.("banana_spawn", { volume: entry?.portalInjected ? 0.42 : 0.35 });
            this.tweens.add({
              targets: portalRing,
              scale: entry?.portalInjected ? 4.4 : 3.8,
              alpha: 0,
              duration: entry?.portalInjected ? 430 : 360,
              ease: "Cubic.easeOut",
              onComplete: () => portalRing.destroy()
            });
            if (portalSprite) {
              this.tweens.add({
                targets: portalSprite,
                scale: entry?.portalInjected ? 1.08 : 0.95,
                angle: entry?.portalInjected ? 130 : 85,
                alpha: 0,
                duration: entry?.portalInjected ? 460 : 380,
                ease: "Cubic.easeOut",
                onComplete: () => portalSprite.destroy()
              });
            }
            this.tweens.add({
              targets: ember,
              y: center.y - 18,
              scale: entry?.portalInjected ? 2.45 : 2.1,
              alpha: 0,
              duration: 320,
              ease: "Sine.easeOut",
              onComplete: () => ember.destroy()
            });
            if (sprite && !sprite.destroyed) {
              this.tweens.add({
                targets: sprite,
                alpha: 1,
                scaleX: (getSymbolScale(sprite.symbolKey) || 1) * 1.2,
                scaleY: (getSymbolScale(sprite.symbolKey) || 1) * 1.2,
                duration: 165,
                ease: "Back.easeOut",
                onComplete: () => {
                  this.tweens.add({
                    targets: sprite,
                    scaleX: getSymbolScale(sprite.symbolKey) || 1,
                    scaleY: getSymbolScale(sprite.symbolKey) || 1,
                    duration: 120,
                    ease: "Sine.easeOut",
                    onComplete: resolve
                  });
                }
              });
            } else {
              resolve();
            }
          });
        });
    
        // Portal ability demons punch in first, so Portal feels like a separate clustered injection.
        const portalEntries = rippleInjections.filter((entry) => entry?.portalInjected === true);
        const nonPortalEntries = rippleInjections.filter((entry) => entry?.portalInjected !== true);
        const portalSpawnPromises = portalEntries.map((entry, index) => spawnOneDemon(entry, 35 + index * 55));
    
        const wavePromise = new Promise((resolve) => {
          const waveStartDelay = portalEntries.length > 0 ? Math.min(260, 80 + portalEntries.length * 24) : 0;
    
          this.playSfx?.('symbolWave', {
            volume: isFreespinWave ? 0.45 : 0.35
          });
          waveCells.forEach((cell) => {
            const delay = waveStartDelay + cell.diagonal * 38;
            this.time.delayedCall(delay, () => {
              const hot = occupied.has(`${cell.reel},${cell.row}`);
              const tile = this.textures?.exists?.(waveTextureKey)
                ? this.add.image(cell.center.x, cell.center.y, waveTextureKey).setScale(waveStyle.baseScale)
                : this.add.rectangle(
                    cell.center.x,
                    cell.center.y,
                    cellSize - 5,
                    cellSize - 5,
                    hot ? waveStyle.hotFill : waveStyle.fill,
                    hot ? waveStyle.hotAlpha : waveStyle.baseAlpha
                  );
              tile
                .setDepth(DEPTH_SYMBOLS + 4)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setAlpha(hot ? waveStyle.hotAlpha : waveStyle.baseAlpha);
              if (isFreespinWave) {
                tile.setAngle(-waveStyle.spinAngle);
              }
              const border = this.add.rectangle(cell.center.x, cell.center.y, cellSize - 4, cellSize - 4)
                .setStrokeStyle(hot ? 3 : 2, hot ? waveStyle.hotBorder : waveStyle.border, hot ? waveStyle.hotBorderAlpha : waveStyle.borderAlpha)
                .setDepth(DEPTH_SYMBOLS + 5)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setScale(0.78);
              const spark = isFreespinWave
                ? this.add.circle(cell.center.x, cell.center.y, hot ? 8 : 5, waveStyle.spark, hot ? 0.38 : 0.24)
                    .setDepth(DEPTH_SYMBOLS + 6)
                    .setBlendMode(Phaser.BlendModes.ADD)
                : null;
              this.heavenHellRippleFx.push(tile, border);
              if (spark) this.heavenHellRippleFx.push(spark);
              const tweenTargets = spark ? [tile, border, spark] : [tile, border];
              this.tweens.add({
                targets: tweenTargets,
                scale: hot ? waveStyle.hotScale : waveStyle.cleanScale,
                alpha: hot ? 0.84 : (isFreespinWave ? 0.56 : 0.48),
                angle: isFreespinWave ? waveStyle.spinAngle : 0,
                duration: isFreespinWave ? 145 : 105,
                yoyo: true,
                ease: "Cubic.easeOut",
                onComplete: () => {
                  this.tweens.add({
                    targets: tweenTargets,
                    alpha: 0,
                    scale: 0.96,
                    duration: isFreespinWave ? 360 : 300,
                    ease: "Sine.easeOut",
                    onComplete: () => {
                      tile.destroy();
                      border.destroy();
                      spark?.destroy?.();
                    }
                  });
                }
              });
            });
          });
          this.time.delayedCall(waveStartDelay + waveDuration, resolve);
        });
    
        const spawnPromises = nonPortalEntries.map((entry, index) => {
          const reel = Math.floor(Number(entry?.reel));
          const row = Math.floor(Number(entry?.row));
          const diagonal = reel + (clientConfig.area.height - 1 - row);
          return spawnOneDemon(entry, (portalEntries.length > 0 ? 120 : 0) + diagonal * 38 + (isFreespinWave ? 145 : 80) + index * 4);
        });
    
        await Promise.all([...portalSpawnPromises, wavePromise, ...spawnPromises]);
        this.hideNonHeavenHellBonusSymbols(gameState);
      },

    hideNonHeavenHellBonusSymbols(gameState = {}) {
        const demonSet = new Set([11, 12, 13]);
        const heroId = Number(gameState?.symbolsMapping?.hero || 10);
        for (let reel = 0; reel < (this.reelSprites?.length || 0); reel++) {
          const column = this.reelSprites?.[reel];
          if (!column) continue;
          for (let row = 0; row < column.length; row++) {
            const sprite = column[row];
            if (!sprite || sprite.destroyed) continue;
            const symbol = Number(sprite.symbolKey);
            const show = demonSet.has(symbol) || symbol === heroId;
            sprite.setVisible(show);
            if (show) {
              sprite.setAlpha(1);
              this.setBonusAwareSymbolTexture(sprite, symbol, { forceBase: true });
            }
          }
        }
      },

    clearMainGameSymbolsForHeavenHellBonus() {
        if (!Array.isArray(this.reelSprites)) return;
        for (let reel = 0; reel < this.reelSprites.length; reel++) {
          const column = this.reelSprites[reel];
          if (!Array.isArray(column)) continue;
          for (let row = 0; row < column.length; row++) {
            const sprite = column[row];
            if (!sprite || sprite.destroyed) continue;
            this.destroyBananaBackplate(sprite);
            sprite.destroy();
            column[row] = null;
          }
        }
      },

    async playHeavenHellBonusEntryPortalTransition() {
        const camera = this.cameras?.main;
        if (!camera) return;
        this.heavenHellBonusEntryAngelArrivalPlayed = false;
    
        const width = Number(camera.width || this.scale?.width || 1280);
        const height = Number(camera.height || this.scale?.height || 720);
        const fadeLayer = this.add.rectangle(0, 0, width, height, 0x000000, 0)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(9999);
        const cellSize = 70;
        const houseCenterX = this.houseSprite?.x
          ?? (clientConfig.area.width / 2 * cellSize + GRID_OFFSET_X);
        const houseCenterY = this.houseSprite?.y
          ?? ((clientConfig.area.height - clientConfig.area.height / 2) * cellSize + GRID_OFFSET_Y);
        const label = this.add.text(houseCenterX, houseCenterY, "DIVE INTO HELL", {
          fontSize: "42px",
          fontFamily: '"Cinzel", "Times New Roman", serif',
          fontStyle: "bold",
          color: "#FFE9A0",
          stroke: "#000000",
          strokeThickness: 6
        })
          .setOrigin(0.5)
          .setDepth(10000)
          .setAlpha(0);
    
        const fadeCountUpPromise = this.fadeBonusEntryCountUpDisplay();
        const angelDivePromise = this.playHeavenHellAngelDiveIntoPortal();
        this.tweens.add({
          targets: fadeLayer,
          alpha: 1,
          duration: 450,
          ease: "Sine.easeOut"
        });
        this.tweens.add({
          targets: label,
          alpha: 1,
          duration: 350,
          ease: "Sine.easeOut"
        });
    
        await Promise.all([
          fadeCountUpPromise,
          angelDivePromise,
          this.waitForPresentation(2000, { skippable: true })
        ]);
    
        label.destroy();
        await new Promise((resolve) => {
          this.tweens.add({
            targets: fadeLayer,
            alpha: 0,
            duration: 350,
            ease: "Sine.easeIn",
            onComplete: resolve
          });
        });
        fadeLayer.destroy();
      },

    fadeBonusEntryCountUpDisplay(duration = 320) {
        const countUpText = this.countUpText;
        if (!countUpText || countUpText.destroyed || countUpText.visible !== true) {
          return Promise.resolve(false);
        }
    
        this.tweens.killTweensOf(countUpText);
        return new Promise((resolve) => {
          this.tweens.add({
            targets: countUpText,
            alpha: 0,
            duration,
            ease: "Sine.easeInOut",
            onComplete: () => {
              if (countUpText && !countUpText.destroyed) {
                countUpText.setVisible(false);
                countUpText.setAlpha(1);
              }
              resolve(true);
            }
          });
        });
      },

    getHeavenHellBonusEntryPortalPosition() {
        const lastReel = Math.max(0, clientConfig.area.width - 1);
        const upperRow = Math.max(0, Math.min(clientConfig.area.height - 1, clientConfig.area.height - 2));
        const lowerRow = Math.max(0, upperRow - 1);
        const upperCell = this.getGridCellCenter(lastReel, upperRow);
        const lowerCell = this.getGridCellCenter(lastReel, lowerRow);
        return {
          x: upperCell.x + 10,
          y: ((upperCell.y + lowerCell.y) * 0.5) - 8
        };
      },

    async playHeavenHellAngelDiveIntoPortal() {
        const portalTarget = this.getHeavenHellBonusEntryPortalPosition();
        const heroTexture = this.getHeavenHellHeroTextureKey?.(HERO_STAGE_TEXTURE_KEYS.rush) || HERO_STAGE_TEXTURE_KEYS.base;
        const footprintSize = Math.max(1, Math.floor(Number(this.currentHeroFootprintSize) || 1));
        const fallbackScale = getHeroScaleForFootprint(footprintSize, heroTexture);
    
        if (!this.heroSprite || this.heroSprite.destroyed) {
          const fallbackAnchor = this.currentHeroAnchor &&
            Number.isFinite(Number(this.currentHeroAnchor.reel)) &&
            Number.isFinite(Number(this.currentHeroAnchor.row))
              ? this.currentHeroAnchor
              : (clientConfig.heroStartingPosition || { reel: 4, row: 2 });
          const fallbackCenter = this.getHeroAnchorCenter(
            Number(fallbackAnchor.reel) || 4,
            Number(fallbackAnchor.row) || 2,
            footprintSize
          );
          this.heroSprite = this.add.image(fallbackCenter.x, fallbackCenter.y, heroTexture)
            .setOrigin(0.5)
            .setScale(fallbackScale)
            .setDepth(DEPTH_HERO + 12)
            .setAlpha(1);
        }
    
        const hero = this.heroSprite;
        if (!hero || hero.destroyed) return;
    
        const startX = Number(hero.x || portalTarget.x);
        const startY = Number(hero.y || portalTarget.y);
        const startScale = Number(hero.scaleX) || fallbackScale;
        hero.setTexture?.(heroTexture);
        hero.setDepth?.(DEPTH_HERO + 14);
        hero.setAlpha?.(1);
    
        const portalSprite = this.textures?.exists?.("helldive_portal_red")
          ? this.add.image(portalTarget.x, portalTarget.y, "helldive_portal_red")
              .setScale(0.34)
              .setAlpha(0.88)
              .setDepth(DEPTH_SYMBOLS + 16)
              .setBlendMode(Phaser.BlendModes.ADD)
          : null;
        const portalRing = this.add.circle(portalTarget.x, portalTarget.y, 18, 0xFF5638, 0.34)
          .setDepth(DEPTH_SYMBOLS + 15)
          .setStrokeStyle(4, 0xFFD5A0, 0.95)
          .setBlendMode(Phaser.BlendModes.ADD);
        const portalCore = this.add.circle(portalTarget.x, portalTarget.y, 8, 0xFFF2BE, 0.8)
          .setDepth(DEPTH_SYMBOLS + 17)
          .setBlendMode(Phaser.BlendModes.ADD);
    
        if (portalSprite) {
          this.tweens.add({
            targets: portalSprite,
            scale: 0.42,
            alpha: 1,
            angle: 24,
            duration: 380,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
          });
        }
        this.tweens.add({
          targets: portalRing,
          scale: 1.32,
          alpha: 0.78,
          duration: 360,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
        this.tweens.add({
          targets: portalCore,
          scale: 1.85,
          alpha: 0.24,
          duration: 320,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
    
        this.playSfx?.("wins_highlight", { volume: 0.28 });
        this.time.delayedCall(120, () => this.playSfx?.("lightning_at_lvl_up", { volume: 0.42 }));
        this.startAngelMovementLightEmitter({ tint: 0xFFE39C, intervalMs: 20, burstScale: 1.05 });
        this.spawnHeavenHellChargeLaunchTrails(startX, startY, portalTarget.x, portalTarget.y, {
          heroScale: startScale
        });
    
        await this.waitForPresentation(140, { skippable: true });
    
        await new Promise((resolve) => {
          this.tweens.add({
            targets: hero,
            x: portalTarget.x,
            y: portalTarget.y,
            scale: Math.max(0.08, startScale * 0.12),
            alpha: 0.12,
            angle: hero.angle + 18,
            duration: 720,
            ease: "Cubic.easeIn",
            onComplete: resolve
          });
        });
    
        this.stopAngelMovementLightEmitter();
        this.playSfx?.("wins_explode", { volume: 0.36 });
        const intakeFlash = this.add.circle(portalTarget.x, portalTarget.y, 18, 0xFFF4B8, 0.95)
          .setDepth(DEPTH_SYMBOLS + 18)
          .setBlendMode(Phaser.BlendModes.ADD);
        const intakeShock = this.add.circle(portalTarget.x, portalTarget.y, 30, 0xFF7A47, 0.44)
          .setDepth(DEPTH_SYMBOLS + 17)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: intakeFlash,
          scale: 2.8,
          alpha: 0,
          duration: 220,
          ease: "Cubic.easeOut",
          onComplete: () => intakeFlash.destroy()
        });
        this.tweens.add({
          targets: intakeShock,
          scale: 2.2,
          alpha: 0,
          duration: 320,
          ease: "Cubic.easeOut",
          onComplete: () => intakeShock.destroy()
        });
    
        if (hero && !hero.destroyed) {
          hero.destroy();
        }
        this.heroSprite = null;
        this.clearMonkeyWildStrengthBadge();
        this.clearHeroWildActiveBadge();
        this.clearHeroWildTrailMarks();
    
        await this.waitForPresentation(120, { skippable: true });
    
        if (portalSprite && !portalSprite.destroyed) {
          portalSprite.destroy();
        }
        if (!portalRing.destroyed) {
          portalRing.destroy();
        }
        if (!portalCore.destroyed) {
          portalCore.destroy();
        }
      },

    getHeavenHellSoulFlightDurationMs(startX, startY, endX, endY) {
        const distance = Math.max(1, Math.hypot(endX - startX, endY - startY));
        return Phaser.Math.Clamp(Math.round(900 + distance * 2.35), 1200, 1800);
      },

    getHeavenHellSoulDiveTweenDurationMs(flightMs) {
        const globalTweenScale = Math.max(0.001, Number(this.tweens?.timeScale) || 1);
        return Math.round(flightMs * globalTweenScale);
      },

    playHeavenHellSoulDiveIntoPortal({
        startX,
        startY,
        intensity = 1,
        divineXDoubleKill = false,
        onComplete = null
      } = {}) {
        void this._playHeavenHellSoulDiveIntoPortal({
          startX,
          startY,
          intensity,
          divineXDoubleKill,
          onComplete
        });
      },

    async _playHeavenHellSoulDiveIntoPortal({
        startX,
        startY,
        intensity = 1,
        divineXDoubleKill = false,
        onComplete = null
      } = {}) {
        if (!this.add || !this.tweens || !this.time) return;

        const portalTarget = this.getHeavenHellBonusEntryPortalPosition?.();
        if (!portalTarget) return;

        const heroTexture = this.getHeavenHellHeroTextureKey?.(HERO_STAGE_TEXTURE_KEYS.rush) || HERO_STAGE_TEXTURE_KEYS.base;
        const power = Phaser.Math.Clamp(Number(intensity) || 1, 0.7, 2.2);
        const soulScale = 0.14 + power * 0.03;
        const ghostTint = divineXDoubleKill ? 0xFF55EE : 0xFF3311;
        const particleTint = divineXDoubleKill ? 0xFF55EE : 0xFF2200;
        const fromX = Number(startX);
        const fromY = Number(startY);
        const flightMs = this.getHeavenHellSoulFlightDurationMs(fromX, fromY, portalTarget.x, portalTarget.y);
        const tweenDurationMs = this.getHeavenHellSoulDiveTweenDurationMs(flightMs);
        const emitterStateKey = `_heavenHellSoulLightEmitter_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const soulSprite = this.add.image(fromX, fromY, heroTexture)
          .setOrigin(0.5)
          .setScale(soulScale)
          .setTint(ghostTint)
          .setDepth(SOUL_COLLECT_ORB_DEPTH)
          .setAlpha(0.95)
          .setBlendMode(Phaser.BlendModes.ADD);

        this.spawnHeavenHellChargeLaunchTrails(fromX, fromY, portalTarget.x, portalTarget.y, {
          heroScale: soulScale,
          ghostTint,
          trailDurationMs: tweenDurationMs,
          depthBase: SOUL_COLLECT_TRAIL_DEPTH,
          useSoulOrbGhost: false
        });

        await this.waitForPresentation?.(120, { skippable: true });

        this.startFollowSpriteLightEmitter?.(soulSprite, {
          tint: particleTint,
          intervalMs: 18,
          burstScale: 0.62,
          depth: SOUL_COLLECT_TRAIL_DEPTH,
          stateKey: emitterStateKey,
          stopMethod: "stopFollowSpriteLightEmitter"
        });

        await new Promise((resolve) => {
          this.tweens.add({
            targets: soulSprite,
            x: portalTarget.x,
            y: portalTarget.y,
            scale: Math.max(0.04, soulScale * 0.18),
            alpha: 0.18,
            angle: 18,
            duration: tweenDurationMs,
            ease: "Cubic.easeIn",
            onComplete: resolve
          });
        });

        this.stopFollowSpriteLightEmitter?.(emitterStateKey);

        if (soulSprite && !soulSprite.destroyed) {
          soulSprite.destroy();
        }

        const intakeFlash = this.add.circle(portalTarget.x, portalTarget.y, 10, 0xFF4422, 0.88)
          .setDepth(SOUL_COLLECT_INTAKE_DEPTH)
          .setBlendMode(Phaser.BlendModes.ADD);
        const intakeShock = this.add.circle(portalTarget.x, portalTarget.y, 16, 0xCC1100, 0.42)
          .setDepth(SOUL_COLLECT_INTAKE_DEPTH - 0.01)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: intakeFlash,
          scale: 2.2,
          alpha: 0,
          duration: 180,
          ease: "Cubic.easeOut",
          onComplete: () => intakeFlash.destroy()
        });
        this.tweens.add({
          targets: intakeShock,
          scale: 1.8,
          alpha: 0,
          duration: 260,
          ease: "Cubic.easeOut",
          onComplete: () => intakeShock.destroy()
        });

        this.playSfx?.("orb_collect", {
          volume: divineXDoubleKill ? 0.38 : 0.3,
          rate: divineXDoubleKill ? 1.12 : 1.02
        });
        onComplete?.();
      },

    playHeavenHellBonusAngelArrival() {
        if (this.heavenHellBonusEntryAngelArrivalPlayed === true) return false;
        if (!this.mainBackground || this.mainBackground.destroyed) return false;
        if (this.mainBackground.texture?.key !== "helldive_hell_bonus_bg") return false;
    
        this.heavenHellBonusEntryAngelArrivalPlayed = true;
    
        const collectTarget = this.getCenterCollectTarget();
        const heroTexture = this.getHeavenHellHeroTextureKey?.(HERO_STAGE_TEXTURE_KEYS.base) || HERO_STAGE_TEXTURE_KEYS.base;
        const heroScale = getHeroScaleForFootprint(1, heroTexture);
    
        if (this.heroSprite && !this.heroSprite.destroyed) {
          this.heroSprite.destroy();
        }
    
        const descentGlow = this.add.circle(collectTarget.x, collectTarget.y - 170, 32, 0xFFF2A8, 0.45)
          .setDepth(DEPTH_HERO + 18)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.8);
        this.tweens.add({
          targets: descentGlow,
          y: collectTarget.y - 30,
          scale: 1.9,
          alpha: 0,
          duration: 520,
          ease: "Cubic.easeIn",
          onComplete: () => descentGlow.destroy()
        });
    
        this.heroSprite = this.add.image(collectTarget.x, collectTarget.y - 210, heroTexture)
          .setOrigin(0.5)
          .setScale(heroScale * 0.42)
          .setDepth(DEPTH_HERO + 20)
          .setAlpha(0);
    
        this.currentHeroFootprintSize = 1;
        this.currentHeroRushActive = false;
        this.currentBonusStage = 0;
        this.currentHeroTextureKey = heroTexture;
    
        this.playSfx?.("lightning_at_lvl_up", { volume: 0.62 });
        this.playSfx?.("wins_highlight", { volume: 0.32 });
    
        this.tweens.add({
          targets: this.heroSprite,
          y: collectTarget.y,
          scale: heroScale * 1.18,
          alpha: 1,
          duration: 560,
          ease: "Cubic.easeIn",
          onComplete: () => {
            if (!this.heroSprite || this.heroSprite.destroyed) return;
    
            this.playSfx?.("wins_explode", { volume: 0.45 });
            this.cameras?.main?.shake?.(280, 0.012);
            this.startBonusWonCenterEnergy(collectTarget.x, collectTarget.y, {
              depth: DEPTH_HERO + 26,
              scale: 1.28,
              tint: 0xFFF07A
            });
    
            const centerFlash = this.add.circle(collectTarget.x, collectTarget.y, 30, 0xFFF5BD, 0.92)
              .setDepth(DEPTH_HERO + 24)
              .setBlendMode(Phaser.BlendModes.ADD);
            const shockRing = this.add.circle(collectTarget.x, collectTarget.y, 44, 0xFFB84D, 0.3)
              .setDepth(DEPTH_HERO + 23)
              .setStrokeStyle(12, 0xFFE08A, 0.82)
              .setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
              targets: centerFlash,
              scale: 4.4,
              alpha: 0,
              duration: 280,
              ease: "Cubic.easeOut",
              onComplete: () => centerFlash.destroy()
            });
            this.tweens.add({
              targets: shockRing,
              scale: 3.3,
              alpha: 0,
              duration: 420,
              ease: "Cubic.easeOut",
              onComplete: () => shockRing.destroy()
            });
    
            void this.playMonkeyLevelUpRingBurst(null, {
              heroFootprintSize: 1,
              intensity: "major",
              preferHeroSprite: true,
              durationMs: 820,
              radialScale: 1.18
            }).catch(() => {});
    
            this.tweens.add({
              targets: this.heroSprite,
              scale: heroScale,
              duration: 220,
              ease: "Sine.easeOut"
            });
          }
        });
    
        return true;
      },

    getHeavenHellLootDropKey(drop = {}, index = 0) {
        const reel = Math.floor(Number(drop?.reel));
        const row = Math.floor(Number(drop?.row));
        const offsetX = Number.isFinite(Number(drop?.offsetX)) ? Number(drop.offsetX) : 0;
        const offsetY = Number.isFinite(Number(drop?.offsetY)) ? Number(drop.offsetY) : 0;
        const baseValue = Number(drop?.baseValue ?? drop?.value ?? 0);
        const source = String(drop?.source || "");
        return `${reel},${row},${offsetX},${offsetY},${baseValue},${source},${Math.max(0, Math.floor(Number(index) || 0))}`;
      },

    isHeavenHellLootDropRendered(drop = {}, index = 0) {
        const key = this.getHeavenHellLootDropKey(drop, index);
        if (this.heavenHellRenderedLootKeys?.has(key)) return true;
        return (Array.isArray(this.heavenHellLootSprites) ? this.heavenHellLootSprites : []).some((entry) => (
          entry &&
          !entry.destroyed &&
          entry.heavenHellLootDropKey === key
        ));
      },

    registerHeavenHellLootSprite(token, drop = {}, index = 0) {
        if (!token || token.destroyed) return token;
        if (!Array.isArray(this.heavenHellLootSprites)) {
          this.heavenHellLootSprites = [];
        }
        if (!this.heavenHellRenderedLootKeys) {
          this.heavenHellRenderedLootKeys = new Set();
        }
        const key = this.getHeavenHellLootDropKey(drop, index);
        token.heavenHellLootDropKey = key;
        this.heavenHellRenderedLootKeys.add(key);
        this.heavenHellLootSprites.push(token);
        return token;
      },

    clearHeavenHellLootGround() {
        (Array.isArray(this.heavenHellLootSprites) ? this.heavenHellLootSprites : []).forEach((entry) => {
          if (!entry || entry.destroyed) return;
          this.tweens.killTweensOf(entry);
          entry.destroy();
        });
        this.heavenHellLootSprites = [];
        this.heavenHellRenderedLootKeys = new Set();
      },

    clearHeavenHellGroundChests() {
        (Array.isArray(this.heavenHellGroundChestSprites) ? this.heavenHellGroundChestSprites : []).forEach((entry) => {
          if (!entry || entry.destroyed) return;
          this.tweens.killTweensOf(entry);
          entry.destroy();
        });
        this.heavenHellGroundChestSprites = [];
        this.heavenHellRenderedChestKeys = new Set();
      },

    getHeavenHellChestRenderKey(chest = {}, index = 0) {
        const numericId = Number(chest?.id ?? chest?.pendingId ?? chest?.chestId);
        if (Number.isFinite(numericId) && numericId > 0) {
          return `chest:${numericId}`;
        }
        const reel = Math.floor(Number(chest?.reel));
        const row = Math.floor(Number(chest?.row));
        const type = String(chest?.chestType || "unknown");
        return `chest:${reel},${row},${type},${Math.max(0, Math.floor(Number(index) || 0))}`;
      },

    isHeavenHellChestRendered(chest = {}, index = 0) {
        const key = this.getHeavenHellChestRenderKey(chest, index);
        return Boolean(this.heavenHellRenderedChestKeys?.has?.(key));
      },

    getHeavenHellQueuedChestEvents(gameState = null) {
        const resolvedGameState = gameState || this._heavenHellActiveGameState;
        return Array.isArray(resolvedGameState?.heavenHell?.bonus?.chestEventsThisAction)
          ? resolvedGameState.heavenHell.bonus.chestEventsThisAction.filter((entry) => entry?.type === "dropQueued")
          : [];
      },

    getHeavenHellGroundChestPosition(chest = {}) {
        const reel = Math.floor(Number(chest?.reel));
        const row = Math.floor(Number(chest?.row));
        const target = this.getGridCellCenter(reel, row);
        return {
          x: target.x,
          y: target.y + 12
        };
      },

    getHeavenHellChestTextureKey(chest = {}) {
        const chestType = String(chest?.chestType || "").toLowerCase();
        if (chestType === "wooden" && this.textures?.exists?.("helldive_chest_wooden")) {
          return "helldive_chest_wooden";
        }
        if ((chestType === "divine" || chestType === "gold") && this.textures?.exists?.("helldive_chest_divine")) {
          return "helldive_chest_divine";
        }
        if (this.textures?.exists?.("helldive_chest_divine")) {
          return "helldive_chest_divine";
        }
        return "bonus_chest";
      },

    createHeavenHellGroundChestSprite(chest = {}, { x = null, y = null, scale = 0.42, alpha = 0.98 } = {}) {
        const position = Number.isFinite(Number(x)) && Number.isFinite(Number(y))
          ? { x: Number(x), y: Number(y) }
          : this.getHeavenHellGroundChestPosition(chest);
        const textureKey = this.getHeavenHellChestTextureKey(chest);
        const sprite = this.add.image(position.x, position.y, textureKey)
          .setDepth(DEPTH_HERO)
          .setScale(scale)
          .setAlpha(alpha);
        sprite.heavenHellChestData = chest;
        sprite.heavenHellChestKey = this.getHeavenHellChestRenderKey(chest);
        return sprite;
      },

    registerHeavenHellGroundChestSprite(sprite, chest = {}, index = 0) {
        if (!sprite || sprite.destroyed) return sprite;
        if (!Array.isArray(this.heavenHellGroundChestSprites)) {
          this.heavenHellGroundChestSprites = [];
        }
        if (!this.heavenHellRenderedChestKeys) {
          this.heavenHellRenderedChestKeys = new Set();
        }
        const key = this.getHeavenHellChestRenderKey(chest, index);
        sprite.heavenHellChestData = chest;
        sprite.heavenHellChestKey = key;
        this.heavenHellRenderedChestKeys.add(key);
        this.heavenHellGroundChestSprites.push(sprite);
        return sprite;
      },

    findHeavenHellGroundChestSprite(chest = {}, index = 0) {
        const key = this.getHeavenHellChestRenderKey(chest, index);
        return (Array.isArray(this.heavenHellGroundChestSprites) ? this.heavenHellGroundChestSprites : [])
          .find((entry) => entry && !entry.destroyed && entry.heavenHellChestKey === key) || null;
      },

    takeHeavenHellGroundChestSprite(chest = {}, index = 0) {
        const key = this.getHeavenHellChestRenderKey(chest, index);
        if (!Array.isArray(this.heavenHellGroundChestSprites)) {
          this.heavenHellGroundChestSprites = [];
          return null;
        }
        const spriteIndex = this.heavenHellGroundChestSprites.findIndex((entry) => entry && !entry.destroyed && entry.heavenHellChestKey === key);
        if (spriteIndex < 0) return null;
        const [sprite] = this.heavenHellGroundChestSprites.splice(spriteIndex, 1);
        this.heavenHellRenderedChestKeys?.delete?.(key);
        return sprite || null;
      },

    findHeavenHellQueuedChestForCell(reel, row, gameState = null) {
        const normalizedReel = Math.floor(Number(reel));
        const normalizedRow = Math.floor(Number(row));
        const queued = this.getHeavenHellQueuedChestEvents(gameState);
        for (let index = 0; index < queued.length; index++) {
          const chest = queued[index];
          if (Math.floor(Number(chest?.reel)) !== normalizedReel || Math.floor(Number(chest?.row)) !== normalizedRow) {
            continue;
          }
          if (this.isHeavenHellChestRendered(chest, index)) {
            continue;
          }
          return { chest, index };
        }
        return null;
      },

    async playHeavenHellQueuedChestDrop(chest = {}, { index = 0 } = {}) {
        if (!chest || this.isHeavenHellChestRendered(chest, index)) {
          return this.findHeavenHellGroundChestSprite(chest, index);
        }

        const land = this.getHeavenHellGroundChestPosition(chest);
        const shadow = this.add.ellipse(land.x, land.y + 20, 46, 14, 0x000000, 0.08)
          .setDepth(DEPTH_HERO - 1)
          .setScale(0.6, 0.7);
        const sprite = this.createHeavenHellGroundChestSprite(chest, {
          x: land.x,
          y: land.y - 64,
          scale: 0.38,
          alpha: 0
        }).setDepth(DEPTH_HERO + 1);
        const flash = this.add.circle(land.x, land.y - 6, 18, 0xFFF0B8, 0.18)
          .setDepth(DEPTH_HERO)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.3);

        this.playSfx?.("gold_drop", { volume: 0.16, rate: 0.96 + index * 0.02 });

        await new Promise((resolve) => {
          this.tweens.add({
            targets: sprite,
            y: land.y,
            alpha: 1,
            scaleX: 0.46,
            scaleY: 0.46,
            duration: 260,
            ease: "Cubic.easeIn",
            onComplete: () => {
              this.playSfx?.("coin2", { volume: 0.18 });
              this.tweens.add({
                targets: sprite,
                y: land.y + 5,
                duration: 180,
                yoyo: true,
                ease: "Bounce.easeOut",
                onComplete: resolve
              });
            }
          });
          this.tweens.add({
            targets: shadow,
            alpha: 0.3,
            scaleX: 1,
            scaleY: 1,
            duration: 240,
            ease: "Sine.easeIn"
          });
          this.tweens.add({
            targets: flash,
            scale: 2.2,
            alpha: 0,
            duration: 280,
            ease: "Cubic.easeOut",
            onComplete: () => flash.destroy()
          });
        });

        this.tweens.add({
          targets: shadow,
          alpha: 0,
          duration: 240,
          ease: "Sine.easeOut",
          onComplete: () => shadow.destroy()
        });

        sprite.setPosition(land.x, land.y);
        sprite.setScale(0.44);
        sprite.setDepth(DEPTH_HERO);
        this.registerHeavenHellGroundChestSprite(sprite, chest, index);
        return sprite;
      },

    async ensureHeavenHellQueuedChestDrops(gameState = {}, { animateMissing = false } = {}) {
        const queued = this.getHeavenHellQueuedChestEvents(gameState);
        for (let index = 0; index < queued.length; index++) {
          const chest = queued[index];
          if (this.isHeavenHellChestRendered(chest, index)) continue;
          if (animateMissing) {
            await this.playHeavenHellQueuedChestDrop(chest, { index });
            continue;
          }
          const sprite = this.createHeavenHellGroundChestSprite(chest, { scale: 0.44 });
          this.registerHeavenHellGroundChestSprite(sprite, chest, index);
        }
      },

    async playHeavenHellQueuedChestDropsForCells(cells = [], gameState = null) {
        const resolvedGameState = gameState || this._heavenHellActiveGameState;
        const list = Array.isArray(cells) ? cells : [];
        for (let index = 0; index < list.length; index++) {
          const cell = list[index] || {};
          const queuedChestDrop = this.findHeavenHellQueuedChestForCell(cell?.reel, cell?.row, resolvedGameState);
          if (!queuedChestDrop) continue;
          await this.playHeavenHellQueuedChestDrop(queuedChestDrop.chest, { index: queuedChestDrop.index });
        }
      },

    async playHeavenHellQueuedChestDrops(chests = []) {
        const list = Array.isArray(chests) ? chests : [];
        for (let index = 0; index < list.length; index++) {
          const chest = list[index];
          if (!chest) continue;
          await this.playHeavenHellQueuedChestDrop(chest, { index });
        }
      },

    syncHeavenHellLootGround(drops = []) {
        if (!Array.isArray(this.heavenHellLootSprites)) {
          this.heavenHellLootSprites = [];
        }
        if (!this.heavenHellRenderedLootKeys) {
          this.heavenHellRenderedLootKeys = new Set();
        }
        const list = Array.isArray(drops) ? drops : [];
        const maxRender = Math.min(64, list.length);
        for (let i = 0; i < maxRender; i++) {
          const drop = list[i];
          if (this.isHeavenHellLootDropRendered(drop, i)) continue;
          const reel = Math.floor(Number(drop?.reel));
          const row = Math.floor(Number(drop?.row));
          if (!Number.isFinite(reel) || !Number.isFinite(row)) continue;
          const position = this.getHeavenHellLootGroundPosition(drop, i);
          const token = this.createHeavenHellLootToken(position.x, position.y, drop, i, { scale: 0.34 });
          token.setDepth(DEPTH_HERO - 1);
          this.registerHeavenHellLootSprite(token, drop, i);
        }
      },

    renderHeavenHellLootGround(drops = []) {
        this.syncHeavenHellLootGround(drops);
      },

    syncHeavenHellLootSpriteDepths(frontOfHero = false) {
        const lootDepth = frontOfHero ? (DEPTH_HERO + 1) : (DEPTH_HERO - 1);
        if (!Array.isArray(this.heavenHellLootSprites)) return;
        this.heavenHellLootSprites.forEach((entry) => {
          if (!entry || entry.destroyed || typeof entry.setDepth !== "function") return;
          entry.setDepth(lootDepth);
        });
      },

    getHeavenHellLootGroundPosition(drop = {}, index = 0) {
        const reel = Math.floor(Number(drop?.reel));
        const row = Math.floor(Number(drop?.row));
        const target = this.getGridCellCenter(reel, row);
        const fallbackOffsetX = ((index % 3) - 1) * 5;
        const fallbackOffsetY = ((((index / 3) | 0) % 2) * 4);
        const offsetX = Number.isFinite(Number(drop?.offsetX)) ? Number(drop.offsetX) : fallbackOffsetX;
        const offsetY = Number.isFinite(Number(drop?.offsetY)) ? Number(drop.offsetY) : fallbackOffsetY;
        return {
          x: target.x + offsetX,
          y: target.y + 14 + offsetY
        };
      },

    getHeavenHellLootDotColor(baseValue = 0) {
        const colorByBaseValue = {
          "0.1": 0x8BC5FF,
          "0.2": 0x7CFFB2,
          "0.5": 0xFFE680,
          "1": 0xFFB56A,
          "5": 0xFF7B7B
        };
        return colorByBaseValue[String(Number(baseValue || 0))] || 0xFDD76A;
      },

    getHeavenHellLootTexture(dropOrValue = 0, index = 0) {
        const drop = dropOrValue && typeof dropOrValue === "object" ? dropOrValue : null;
        const lootKind = String(drop?.lootKind || "").toLowerCase();
        if (lootKind === "diamond") return "helldive_loot_diamond";
        if (lootKind === "coin") return "helldive_loot_coin";
        const baseValue = drop ? drop?.baseValue : dropOrValue;
        const normalized = Number(baseValue || 0);
        if (normalized >= 5) return "helldive_loot_diamond";
        if (normalized >= 1) return "helldive_loot_ruby";
        if (normalized >= 0.5) return "helldive_loot_sapphire";
        if (normalized >= 0.2) return "helldive_loot_emerald";
        if (index % 7 === 0) return "helldive_loot_amethyst";
        return "helldive_loot_coin";
      },

    createHeavenHellLootToken(x, y, drop = {}, index = 0, { scale = 0.42 } = {}) {
        const isBoss = drop?.isBoss === true;
        if (isBoss) {
          return this.add.image(x, y, "13").setScale(0.28).setAlpha(0.96);
        }
        const textureKey = this.getHeavenHellLootTexture(drop, index);
        if (this.textures?.exists?.(textureKey)) {
          return this.add.image(x, y, textureKey).setScale(scale).setAlpha(0.96);
        }
        return this.add.circle(x, y, 7, this.getHeavenHellLootDotColor(drop?.baseValue), 0.95);
      },

    getHeavenHellHeroTextureKey(preferredTextureKey = null) {
        const candidates = [
          preferredTextureKey,
          this.currentHeroTextureKey,
          HERO_STAGE_TEXTURE_KEYS.rush,
          HERO_STAGE_TEXTURE_KEYS.base
        ].filter(Boolean);
        return candidates.find((key) => this.textures?.exists?.(key)) || candidates[0] || HERO_STAGE_TEXTURE_KEYS.base;
      },

    playHeavenHellLootLaunchSfx(index = 0) {
        const launchKey = index % 4 === 0 ? "gold_drop" : `coin${(index % 6) + 1}`;
        this.playSfx?.(launchKey, { volume: index % 4 === 0 ? 0.18 : 0.12 });
      },

    playHeavenHellLootLandSfx(index = 0, options = {}) {
        const normalizedIndex = Math.max(0, Math.floor(Number(index) || 0));
        const soft = options?.soft === true;
        const value = Number(options?.baseValue ?? options?.drop?.baseValue ?? 0);
        const highValue = value >= 1 || options?.isBoss === true || options?.drop?.isBoss === true;
        const coinKey = `coin${((normalizedIndex + (highValue ? 2 : 0)) % 6) + 1}`;
    
        if (soft) {
          this.playSfx?.("gold_drop", { volume: 0.15, rate: 1.05 + (normalizedIndex % 3) * 0.03 });
          return;
        }
    
        this.playSfx?.(highValue ? "gold_drop" : coinKey, {
          volume: highValue ? 0.36 : 0.28,
          rate: 0.92 + (normalizedIndex % 5) * 0.04
        });
        if (highValue) {
          this.time?.delayedCall?.(90, () => this.playSfx?.(coinKey, { volume: 0.24 }));
        }
      },

    getHeavenHellMultiplierDemonId() {
        return Number(
          clientConfig?.heavenHell?.bonus?.symbols?.multiplierDemon ??
          clientConfig?.symbolsMapping?.zombie2 ??
          12
        );
      },

    dropHeavenHellMultiplierDemonOrb(x, y) {
        const orbSize = 12;
        const orbColors = [0x00D1CE, 0x1EFF90, 0x41E169, 0x00D1CE];
        this.dropEnergyOrbs?.(x, y, 1, orbSize, orbColors, 150, 600);
      },

    getHeavenHellChargeLootJitter(step = {}, { base = 18 } = {}) {
        const lootMultiplier = Math.max(1, Math.floor(Number(step?.divineChargeLootMultiplier ?? 1) || 1));
        if (lootMultiplier >= 10) return 18;
        if (lootMultiplier > 1) return 14;
        return base;
      },

    pushHeavenHellStepBananaLootCells(step = {}, pushLootCell = () => {}) {
        if (step?.banana !== true || typeof pushLootCell !== "function") return;
        const bananaTargets = Array.isArray(step?.eatenBananas) && step.eatenBananas.length > 0
          ? step.eatenBananas
          : [{ reel: step?.reel, row: step?.row }];
        bananaTargets.forEach((banana) => pushLootCell(banana?.reel, banana?.row));
      },

    playHeavenHellDemonDeathFx(reel, row, {
        center = null,
        intensity = 1,
        destroySprite = true,
        gameState = null,
        killWeight = null,
        divineXDoubleKill = false,
        isMultiplierDemon = null
      } = {}) {
        const target = center || this.getGridCellCenter(reel, row);
        const sprite = this.reelSprites?.[reel]?.[row];
        const power = Math.max(0.7, Math.min(2.2, Number(intensity) || 1));
        const resolvedGameState = gameState || this._heavenHellActiveGameState;
        const multiplierDemonId = this.getHeavenHellMultiplierDemonId();
        const symbolId = Number(sprite?.symbolKey);
        const isMultiplierDemonKill =
          resolvedGameState?.heavenHell?.bonus &&
          resolvedGameState?.isBonus === true &&
          (isMultiplierDemon === true || (Number.isFinite(symbolId) && symbolId === multiplierDemonId));
        if (resolvedGameState?.heavenHell?.bonus && resolvedGameState?.isBonus === true) {
          this.tickHeavenHellKillMeterOnKill(reel, row, resolvedGameState, { killWeight });
        }
        if (isMultiplierDemonKill) {
          this.dropHeavenHellMultiplierDemonOrb(target.x, target.y);
        }
    
        const hitSound = `banana_hit_${Phaser.Math.Between(1, 4)}`;
        this.playSfx?.(hitSound, { volume: Math.min(0.58, 0.24 + power * 0.12) });
        this.playSfx?.("freespin_smash_symbol_explosion_1", { volume: Math.min(0.78, 0.3 + power * 0.16) });
    
        const corpseShadow = this.add.ellipse(target.x, target.y + 28, 48 * power, 16 * power, 0x120000, 0.34)
          .setDepth(DEPTH_HERO + 42);
    
        const spatter = this.textures?.exists?.("helldive_demon_death_spatter")
          ? this.add.image(target.x, target.y + 4, "helldive_demon_death_spatter")
              .setDepth(DEPTH_HERO + 47)
              .setScale(0.38 * power)
              .setAlpha(0.96)
              .setAngle(Phaser.Math.Between(-28, 28))
          : this.add.circle(target.x, target.y, 18 * power, 0x8F0300, 0.72)
              .setDepth(DEPTH_HERO + 47);
        spatter.setBlendMode?.(Phaser.BlendModes.NORMAL);
    
        const fireBurst = this.add.circle(target.x, target.y, 16 * power, 0xFF4B22, 0.48)
          .setDepth(DEPTH_HERO + 48)
          .setBlendMode(Phaser.BlendModes.ADD);
        const soulFlash = this.add.circle(target.x, target.y - 12, 10 * power, 0xD6F5FF, 0.55)
          .setDepth(DEPTH_HERO + 50)
          .setBlendMode(Phaser.BlendModes.ADD);
        let divineXRing = null;
        let divineXGlow = null;
        let divineXLabel = null;
        if (divineXDoubleKill) {
          divineXRing = this.add.circle(target.x, target.y, 18 * power, 0xE14BFF, 0.24)
            .setDepth(DEPTH_HERO + 49)
            .setStrokeStyle(5, 0xFFD3FF, 0.96)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.42);
          divineXGlow = this.add.circle(target.x, target.y, 12 * power, 0xFF7BEF, 0.28)
            .setDepth(DEPTH_HERO + 48)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.36);
          divineXLabel = this.add.text(target.x, target.y - 26, "x2", {
            fontSize: "20px",
            fontFamily: '"Cinzel", "Times New Roman", serif',
            fontStyle: "bold",
            color: "#FFE8FF",
            stroke: "#4A1368",
            strokeThickness: 5
          }).setOrigin(0.5).setDepth(DEPTH_HERO + 56).setAlpha(0.94);
          fireBurst.setFillStyle?.(0xF24CFF, 0.62);
          soulFlash.setFillStyle?.(0xFFD8FF, 0.78);
        }
    
        this.tweens.add({
          targets: corpseShadow,
          scaleX: 1.55,
          alpha: 0,
          duration: 720,
          ease: "Sine.easeOut",
          onComplete: () => corpseShadow.destroy()
        });
        this.tweens.add({
          targets: spatter,
          scale: (spatter.scaleX || 1) * 1.42,
          alpha: 0,
          duration: 840,
          ease: "Cubic.easeOut",
          onComplete: () => spatter.destroy()
        });
        this.tweens.add({
          targets: fireBurst,
          scale: 3.5 * power,
          alpha: 0,
          duration: 330,
          ease: "Cubic.easeOut",
          onComplete: () => fireBurst.destroy()
        });
        this.tweens.add({
          targets: soulFlash,
          y: target.y - 70,
          scale: 2.1,
          alpha: 0,
          duration: 480,
          ease: "Sine.easeOut",
          onComplete: () => soulFlash.destroy()
        });
        if (divineXRing) {
          this.tweens.add({
            targets: divineXRing,
            scale: 3.2 * power,
            alpha: 0,
            duration: 360,
            ease: "Cubic.easeOut",
            onComplete: () => divineXRing.destroy()
          });
        }
        if (divineXGlow) {
          this.tweens.add({
            targets: divineXGlow,
            scale: 4.2 * power,
            alpha: 0,
            duration: 320,
            ease: "Cubic.easeOut",
            onComplete: () => divineXGlow.destroy()
          });
        }
        if (divineXLabel) {
          this.tweens.add({
            targets: divineXLabel,
            y: divineXLabel.y - 28,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0,
            duration: 520,
            ease: "Cubic.easeOut",
            onComplete: () => divineXLabel.destroy()
          });
        }
    
        for (let i = 0; i < 12; i++) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const distance = Phaser.Math.Between(24, 68) * power;
          const drop = this.add.circle(target.x, target.y, Phaser.Math.Between(2, 5) * power, i % 3 === 0 ? 0xFF4A21 : 0x9D0200, 0.84)
            .setDepth(DEPTH_HERO + 49)
            .setBlendMode(i % 3 === 0 ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
          this.tweens.add({
            targets: drop,
            x: target.x + Math.cos(angle) * distance,
            y: target.y + Math.sin(angle) * distance * 0.62,
            alpha: 0,
            scale: 0.22,
            duration: Phaser.Math.Between(260, 560),
            ease: "Cubic.easeOut",
            onComplete: () => drop.destroy()
          });
        }
    
        if (sprite && !sprite.destroyed) {
          const deathEcho = this.add.image(sprite.x, sprite.y, sprite.texture?.key || sprite.symbolKey)
            .setDepth((sprite.depth || DEPTH_SYMBOLS) + 3)
            .setScale(sprite.scaleX || 1, sprite.scaleY || 1)
            .setAlpha(0.54)
            .setTint(0xFF3A24)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: deathEcho,
            scaleX: (sprite.scaleX || 1) * 1.55,
            scaleY: (sprite.scaleY || 1) * 1.2,
            alpha: 0,
            duration: 260,
            ease: "Cubic.easeOut",
            onComplete: () => deathEcho.destroy()
          });
    
          this.tweens.killTweensOf(sprite);
          sprite.setTint?.(0xFF5338);
          this.tweens.add({
            targets: sprite,
            y: sprite.y - 12,
            scaleX: (sprite.scaleX || 1) * (1.2 + power * 0.12),
            scaleY: (sprite.scaleY || 1) * 0.68,
            angle: Phaser.Math.Between(-18, 18),
            duration: 105,
            ease: "Cubic.easeOut",
            onComplete: () => {
              this.tweens.add({
                targets: sprite,
                y: target.y + 18,
                scaleX: (sprite.scaleX || 1) * 0.52,
                scaleY: (sprite.scaleY || 1) * 0.16,
                alpha: 0,
                angle: sprite.angle + Phaser.Math.Between(-35, 35),
                duration: 190,
                ease: "Cubic.easeIn",
                onComplete: () => {
                  if (destroySprite && sprite && !sprite.destroyed) sprite.destroy();
                  if (destroySprite && this.reelSprites?.[reel]) this.reelSprites[reel][row] = null;
                }
              });
            }
          });
        }

        this.createHeavenHellSoulCollectionFx?.({
          reel,
          row,
          center,
          intensity,
          divineXDoubleKill,
          gameState: resolvedGameState
        });
      },

    playHeavenHellAngelStrikeSlash(from, to, { scale = 1 } = {}) {
        if (!from || !to) return;
        const midX = (from.x + to.x) * 0.5;
        const midY = (from.y + to.y) * 0.5;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    
        const strikeLine = this.add.rectangle(midX, midY, distance, 5 * scale, 0xEFFFFF, 0.55)
          .setDepth(DEPTH_HERO + 52)
          .setAngle(angle)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.25, 1);
        this.tweens.add({
          targets: strikeLine,
          scaleX: 1,
          alpha: 0,
          duration: 170,
          ease: "Cubic.easeOut",
          onComplete: () => strikeLine.destroy()
        });
    
        const slash = this.textures?.exists?.("helldive_divine_strike_slash")
          ? this.add.image(midX, midY, "helldive_divine_strike_slash")
              .setDepth(DEPTH_HERO + 53)
              .setScale(0.5 * scale)
              .setAlpha(0.98)
              .setAngle(angle)
              .setBlendMode(Phaser.BlendModes.ADD)
          : this.add.rectangle(midX, midY, 150 * scale, 10 * scale, 0xFFF4B0, 0.88)
              .setDepth(DEPTH_HERO + 53)
              .setAngle(angle)
              .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: slash,
          scaleX: (slash.scaleX || 1) * 1.5,
          scaleY: (slash.scaleY || 1) * 1.14,
          alpha: 0,
          duration: 260,
          ease: "Cubic.easeOut",
          onComplete: () => slash.destroy()
        });
    
        for (let i = 0; i < 10; i++) {
          const t = i / 9;
          const spark = this.add.circle(
            from.x + dx * t + Phaser.Math.Between(-8, 8),
            from.y + dy * t + Phaser.Math.Between(-8, 8),
            Phaser.Math.Between(2, 4) * scale,
            i % 2 === 0 ? 0xFFF1A8 : 0xBFE9FF,
            0.75
          ).setDepth(DEPTH_HERO + 54).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: spark,
            x: spark.x + Phaser.Math.Between(-16, 16),
            y: spark.y + Phaser.Math.Between(-16, 16),
            alpha: 0,
            scale: 0.2,
            duration: Phaser.Math.Between(180, 340),
            ease: "Sine.easeOut",
            onComplete: () => spark.destroy()
          });
        }
      },

    async playHeavenHellDivineChargeWindup(step = {}, { stepQuickStop = false } = {}) {
        if (stepQuickStop || step?.divineChargeProc !== true) return false;
        if (!this.heroSprite || this.heroSprite.destroyed) return false;
    
        const heroX = Number(this.heroSprite.x);
        const heroY = Number(this.heroSprite.y);
        const chargeText = this.add.text(heroX, heroY - 78, "DIVINE CHARGE", {
          fontSize: "20px",
          fontFamily: '"Cinzel", "Times New Roman", serif',
          fontStyle: "bold",
          color: "#FFF6C7",
          stroke: "#210B00",
          strokeThickness: 5
        }).setOrigin(0.5).setDepth(DEPTH_HERO + 42).setAlpha(0);
        this.tweens.add({ targets: chargeText, alpha: 1, y: heroY - 96, duration: 220, ease: "Sine.easeOut" });
    
        const chargeObjects = [];
        for (let pulse = 0; pulse < 5; pulse++) {
          for (let i = 0; i < 3; i++) {
            const ring = this.add.circle(heroX, heroY, 22 + i * 10, 0xFFEAA0, 0.2 - i * 0.03)
              .setDepth(DEPTH_HERO + 30 + i)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setScale(0.55);
            chargeObjects.push(ring);
            this.tweens.add({
              targets: ring,
              scale: 2.4 + i * 0.35,
              alpha: 0,
              delay: pulse * 420 + i * 90,
              duration: 520,
              ease: "Cubic.easeOut"
            });
          }
        }
    
        if (!this.heroSprite.destroyed) {
          this.tweens.add({
            targets: this.heroSprite,
            scaleX: (this.heroSprite.scaleX || 1) * 1.14,
            scaleY: (this.heroSprite.scaleY || 1) * 1.14,
            duration: 180,
            yoyo: true,
            repeat: 6,
            ease: "Sine.easeInOut"
          });
        }
    
        await this.waitForPresentation(1500, { skippable: true });
        chargeObjects.forEach((obj) => { if (obj && !obj.destroyed) obj.destroy(); });
    
        this.playSfx?.("attack_swing", { volume: 0.48 });
        const launchBurst = this.add.circle(heroX, heroY, 18, 0xDDF7FF, 0.72)
          .setDepth(DEPTH_HERO + 44)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: launchBurst,
          scale: 3.8,
          alpha: 0,
          duration: 280,
          ease: "Cubic.easeOut",
          onComplete: () => launchBurst.destroy()
        });
        this.tweens.add({
          targets: chargeText,
          alpha: 0,
          y: chargeText.y - 20,
          duration: 220,
          ease: "Sine.easeOut",
          onComplete: () => chargeText.destroy()
        });
        return true;
      },

    spawnHeavenHellChargeLaunchTrails(fromX, fromY, toX, toY, {
        heroScale = 1,
        ghostTint = 0xBFE9FF,
        curvePointAt = null,
        trailDurationMs = null,
        depthBase = DEPTH_HERO + 39,
        useSoulOrbGhost = false
      } = {}) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const trailCount = Math.min(14, Math.max(5, Math.floor(distance / 38)));
        const angelTextureKey = this.getHeavenHellHeroTextureKey?.(HERO_STAGE_TEXTURE_KEYS.rush) || HERO_STAGE_TEXTURE_KEYS.base;
        const staggerMs = trailDurationMs
          ? Math.max(10, Math.floor(trailDurationMs / (trailCount + 2)))
          : 12;
        const resolvePoint = (t) => {
          if (typeof curvePointAt === "function") {
            const point = curvePointAt(t);
            const prev = curvePointAt(Math.max(0, t - 0.05));
            return {
              x: point.x,
              y: point.y,
              angle: Math.atan2(point.y - prev.y, point.x - prev.x)
            };
          }
          return {
            x: fromX + dx * t,
            y: fromY + dy * t,
            angle: Math.atan2(dy, dx)
          };
        };

        for (let i = 1; i <= trailCount; i++) {
          const t = i / (trailCount + 1);
          this.time.delayedCall(i * staggerMs, () => {
            const point = resolvePoint(t);
            const trailPoint = resolvePoint(Math.max(0, t - 0.04));
            const trail = this.textures?.exists?.("helldive_angel_trail")
              ? this.add.image(trailPoint.x, trailPoint.y, "helldive_angel_trail")
                  .setDepth(depthBase)
                  .setScale(0.56 + t * 0.34)
                  .setAlpha(0.5 * (1 - t * 0.3))
                  .setTint(useSoulOrbGhost ? ghostTint : 0xFFFFFF)
                  .setBlendMode(Phaser.BlendModes.ADD)
              : null;
            if (trail) trail.setRotation(point.angle);
            const ghost = useSoulOrbGhost
              ? this.add.circle(point.x, point.y, Phaser.Math.FloatBetween(6, 9) + t * 4, ghostTint, 0.82)
                  .setDepth(depthBase + 1)
                  .setBlendMode(Phaser.BlendModes.ADD)
              : this.add.image(point.x, point.y, angelTextureKey)
                  .setDepth(depthBase + 1)
                  .setScale(heroScale * (1.06 - t * 0.3))
                  .setAlpha(0.48 * (1 - t * 0.42))
                  .setTint(ghostTint)
                  .setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
              targets: ghost,
              alpha: 0,
              scale: (ghost.scaleX || 1) * 1.32,
              duration: 220,
              ease: "Sine.easeOut",
              onComplete: () => ghost.destroy()
            });
            if (trail) {
              this.tweens.add({
                targets: trail,
                alpha: 0,
                scale: trail.scaleX * 1.4,
                duration: 220,
                ease: "Sine.easeOut",
                onComplete: () => trail.destroy()
              });
            }
          });
        }
      },

    async playHeavenHellDivineChargeImpact(step = {}, gameState = {}, targetCenter = null, { waitForLootDrop = true } = {}) {
        if (step?.divineChargeProc !== true) return;
        const reel = Math.floor(Number(step?.reel));
        const row = Math.floor(Number(step?.row));
        if (!Number.isFinite(reel) || !Number.isFinite(row)) return;
        const target = targetCenter || this.getGridCellCenter(reel, row);
        const heroX = Number(this.heroSprite?.x || target.x);
        const heroY = Number(this.heroSprite?.y || target.y);
    
        this.playSfx?.("lightning_thor_impact", { volume: 0.78 });
        this.playSfx?.("finisher_sword", { volume: 0.46 });
        this.playHeavenHellAngelStrikeSlash?.({ x: heroX, y: heroY }, target, { scale: 1.22 });
        this.cameras?.main?.shake?.(280, 0.011);
        const splash = this.textures?.exists?.("helldive_demon_splash")
          ? this.add.image(target.x, target.y, "helldive_demon_splash").setScale(0.5).setAlpha(0.96).setDepth(DEPTH_HERO + 49).setBlendMode(Phaser.BlendModes.ADD)
          : null;
        const impact = this.add.circle(target.x, target.y, 20, 0xFFF1AD, 0.95)
          .setDepth(DEPTH_HERO + 48)
          .setBlendMode(Phaser.BlendModes.ADD);
        const shock = this.add.circle(target.x, target.y, 34, 0xFF3A24, 0.24)
          .setDepth(DEPTH_HERO + 47)
          .setBlendMode(Phaser.BlendModes.ADD);
        if (splash) this.tweens.add({ targets: splash, scale: 1.4, angle: Phaser.Math.Between(-30, 30), alpha: 0, duration: 380, ease: "Cubic.easeOut", onComplete: () => splash.destroy() });
        this.tweens.add({ targets: impact, scale: 4.6, alpha: 0, duration: 320, ease: "Cubic.easeOut", onComplete: () => impact.destroy() });
        this.tweens.add({ targets: shock, scale: 3.4, alpha: 0, duration: 420, ease: "Cubic.easeOut", onComplete: () => shock.destroy() });
    
        void this.playMonkeyLevelUpRingBurst(
          { reel, row, heroFootprintSize: this.currentHeroFootprintSize },
          {
            heroFootprintSize: this.currentHeroFootprintSize,
            intensity: "medium",
            preferHeroSprite: false,
            durationMs: 560,
            radialScale: 0.72
          }
        ).catch(() => {});
    
        const lootMultiplier = Math.max(1, Math.floor(Number(step?.divineChargeLootMultiplier ?? 1) || 1));
        const lootDropPromise = this.playHeavenHellLootDropPattern(gameState, {
          source: "divineCharge",
          from: { x: target.x, y: target.y - 70 },
          jitterStrength: lootMultiplier >= 10 ? 18 : 14,
          filterCells: [{ reel, row }],
          persistToGround: true
        });
        if (waitForLootDrop) {
          await lootDropPromise;
        }
      },

    async playHeavenHellDivineChargeSequence(gameState = {}) {
        if (gameState?.heavenHell?.bonus && gameState?.isBonus === true) {
          this._heavenHellActiveGameState = gameState;
        }
      },

    createHeavenHellLootValueLabel(x, y, value, {
        prefix = "+",
        depth = DEPTH_HERO + 56,
        fontSize = "20px",
        scale = 0.76,
        rise = 44,
        duration = 1100,
        alpha = 1,
        driftX = 0,
        driftY = 0
      } = {}) {
        const numericValue = Math.max(0, Number(value) || 0);
        if (numericValue <= 0) return null;
    
        const label = this.add.text(
          Number(x) + Number(driftX || 0),
          Number(y) + Number(driftY || 0),
          `${prefix}${this.formatBonusEndBoardValue(numericValue)}`,
          {
            fontSize,
            fontFamily: '"Cinzel", "Times New Roman", serif',
            fontStyle: "bold",
            color: "#FFF4B8",
            stroke: "#4A2A00",
            strokeThickness: 4
          }
        ).setOrigin(0.5).setDepth(depth).setScale(scale).setAlpha(alpha);
        label.setShadow(0, 3, "#1A0B00", 10, true, true);
    
        this.tweens.add({
          targets: label,
          scaleX: Math.max(1.16, scale * 1.5),
          scaleY: Math.max(1.16, scale * 1.5),
          y: label.y - rise,
          alpha: 0,
          duration,
          ease: "Cubic.easeOut",
          onComplete: () => label.destroy()
        });
    
        return label;
      },

    createHeavenHellAbilityImpactLabel(x, y, text, {
        depth = DEPTH_HERO + 56,
        fontSize = "19px",
        scale = 0.72,
        rise = 38,
        duration = 820,
        alpha = 0.98,
        driftX = 0,
        driftY = 0,
        color = "#F8E9FF",
        stroke = "#3B124F",
        shadow = "#1A071F"
      } = {}) {
        const labelText = String(text || "").trim();
        if (!labelText) return null;

        const label = this.add.text(
          Number(x) + Number(driftX || 0),
          Number(y) + Number(driftY || 0),
          labelText,
          {
            fontSize,
            fontFamily: '"Cinzel", "Times New Roman", serif',
            fontStyle: "bold",
            color,
            stroke,
            strokeThickness: 5
          }
        ).setOrigin(0.5).setDepth(depth).setScale(scale).setAlpha(alpha);
        label.setShadow(0, 3, shadow, 10, true, true);

        this.tweens.add({
          targets: label,
          scaleX: Math.max(1.05, scale * 1.34),
          scaleY: Math.max(1.05, scale * 1.34),
          y: label.y - rise,
          alpha: 0,
          duration,
          ease: "Cubic.easeOut",
          onComplete: () => label.destroy()
        });

        return label;
      },

    getHeavenHellTriggeredStepAbilities(step = {}) {
        const ordered = [];
        if (step?.divineXProc === true) ordered.push("divineX");
        if (step?.divineChargeProc === true) ordered.push("divineCharge");
        if (step?.divineStrikeProc === true) ordered.push("divineStrike");
        return ordered;
      },

    getHeavenHellComboAbilityBadgeLabel(abilityKey = "") {
        if (abilityKey === "divineX") return "X";
        if (abilityKey === "divineCharge") return "CHARGE";
        if (abilityKey === "divineStrike") return "STRIKE";
        return this.getHeavenHellChestTickerLabel?.(abilityKey) || String(abilityKey || "").toUpperCase();
      },

    createHeavenHellGradientLetterRow(x, y, text, colors = [], {
        depth = DEPTH_HERO + 58,
        fontSize = "16px",
        stroke = "#2B0C0C",
        strokeThickness = 4,
        letterSpacing = 1
      } = {}) {
        const chars = Array.from(String(text || ""));
        if (chars.length === 0) return [];

        const palette = Array.isArray(colors) && colors.length > 0
          ? colors.map((color) => Phaser.Display.Color.IntegerToRGB(Number(color) || 0xFFFFFF))
          : [Phaser.Display.Color.IntegerToRGB(0xFFFFFF)];
        const totalSteps = Math.max(1, chars.filter((char) => char !== " ").length - 1);
        let paintedIndex = 0;
        const letters = chars.map((char) => {
          const isSpace = char === " ";
          let fillHex = "#FFFFFF";
          if (!isSpace) {
            const progress = totalSteps <= 0 ? 0 : paintedIndex / totalSteps;
            const scaled = progress * Math.max(0, palette.length - 1);
            const leftIndex = Math.floor(scaled);
            const rightIndex = Math.min(palette.length - 1, leftIndex + 1);
            const mix = scaled - leftIndex;
            const left = palette[leftIndex];
            const right = palette[rightIndex];
            const r = Math.round(left.r + (right.r - left.r) * mix);
            const g = Math.round(left.g + (right.g - left.g) * mix);
            const b = Math.round(left.b + (right.b - left.b) * mix);
            fillHex = Phaser.Display.Color.RGBToString(r, g, b, 0, "#");
            paintedIndex += 1;
          }

          return this.add.text(0, 0, char, {
            fontSize,
            fontFamily: '"Cinzel", "Times New Roman", serif',
            fontStyle: "bold",
            color: fillHex,
            stroke,
            strokeThickness
          }).setOrigin(0.5).setDepth(depth);
        });

        let width = 0;
        letters.forEach((letter, index) => {
          width += Number(letter.width || 0);
          if (index < letters.length - 1) {
            width += letterSpacing;
          }
        });

        let cursorX = Number(x) - width * 0.5;
        letters.forEach((letter, index) => {
          const letterWidth = Number(letter.width || 0);
          letter.setPosition(cursorX + letterWidth * 0.5, Number(y));
          cursorX += letterWidth;
          if (index < letters.length - 1) {
            cursorX += letterSpacing;
          }
        });

        return letters;
      },

    playHeavenHellAbilityComboPopup(step = {}, anchor = null, { stepQuickStop = false } = {}) {
        if (stepQuickStop) return null;
        const triggeredAbilities = this.getHeavenHellTriggeredStepAbilities?.(step) || [];
        if (triggeredAbilities.length < 2) return null;

        const originX = Number(anchor?.x ?? this.heroSprite?.x ?? 0);
        const originY = Number(anchor?.y ?? this.heroSprite?.y ?? 0);
        const comboColors = triggeredAbilities.map((abilityKey) => {
          const palette = this.getHeavenHellChestRewardPalette?.(abilityKey, null);
          return Number(palette?.fill || 0xFFFFFF);
        });
        const titleLetters = this.createHeavenHellGradientLetterRow?.(originX, originY - 74, "COMBO STRIKE!", comboColors, {
          depth: DEPTH_HERO + 58,
          fontSize: "17px",
          stroke: "#22070F",
          strokeThickness: 4,
          letterSpacing: 1
        }) || [];

        const popupParts = [...titleLetters].filter(Boolean);
        popupParts.forEach((part) => {
          part.setAlpha?.(0);
          part.setScale?.(0.92);
        });

        this.tweens.add({
          targets: popupParts,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 110,
          ease: "Sine.easeOut"
        });
        this.tweens.add({
          targets: popupParts,
          y: "-=12",
          alpha: 0,
          delay: 620,
          duration: 680,
          ease: "Sine.easeIn",
          onComplete: () => {
            popupParts.forEach((part) => {
              if (part && !part.destroyed) {
                part.destroy();
              }
            });
          }
        });

        return popupParts;
      },

    async playHeavenHellLootDropPattern(gameState = {}, { source = null, from = null, jitterStrength = 6, filterCells = null, persistToGround = false, launchFromDropCell = false } = {}) {
        const drops = Array.isArray(gameState?.heavenHell?.bonus?.lootGround)
          ? gameState.heavenHell.bonus.lootGround
          : [];
        let scoped = drops.map((entry, index) => ({ entry, index }));
        if (Array.isArray(filterCells) && filterCells.length > 0) {
          const cellKeys = new Set(filterCells.map((cell) => `${Math.floor(Number(cell?.reel))},${Math.floor(Number(cell?.row))}`));
          scoped = scoped.filter(({ entry }) => cellKeys.has(`${Math.floor(Number(entry?.reel))},${Math.floor(Number(entry?.row))}`));
        } else if (source) {
          scoped = scoped.filter(({ entry }) => entry?.source === source);
        }
        scoped = scoped.filter(({ entry, index }) => !this.isHeavenHellLootDropRendered(entry, index));
        if (scoped.length === 0) return;
    
        const fallbackStartX = Number(from?.x || (GRID_OFFSET_X + (clientConfig.area.width * 70) * 0.5));
        const fallbackStartY = Number(from?.y || (GRID_OFFSET_Y - 40));
        const maxDrops = Math.min(28, scoped.length);
        const promises = [];
    
        for (let i = 0; i < maxDrops; i++) {
          const drop = scoped[i].entry;
          const dropIndex = scoped[i].index;
          const reel = Math.floor(Number(drop?.reel));
          const row = Math.floor(Number(drop?.row));
          if (!Number.isFinite(reel) || !Number.isFinite(row)) continue;
    
          const target = this.getGridCellCenter(reel, row);
          const launchPoint = launchFromDropCell
            ? target
            : { x: fallbackStartX, y: fallbackStartY };
          const startX = Number(launchPoint?.x || fallbackStartX);
          const startY = Number(launchPoint?.y || fallbackStartY);
          const token = this.createHeavenHellLootToken(startX, startY, drop, dropIndex, { scale: 0.42 });
          token.setDepth(DEPTH_HERO + 55);
          token.setAlpha(0);
          token.setAngle(Phaser.Math.Between(-18, 18));
    
          const shadow = this.add.ellipse(startX, startY + 16, 22, 8, 0x000000, 0)
            .setDepth(DEPTH_HERO + 33);
    
          const p = new Promise((resolve) => {
            this.time.delayedCall(i * 66, () => {
              const hasStoredOffsets = Number.isFinite(Number(drop?.offsetX)) && Number.isFinite(Number(drop?.offsetY));
              const jitterX = hasStoredOffsets
                ? 0
                : Phaser.Math.Between(-Math.max(0, jitterStrength), Math.max(0, jitterStrength));
              const jitterY = hasStoredOffsets
                ? 0
                : Phaser.Math.Between(-Math.max(0, Math.floor(jitterStrength * 0.7)), Math.max(0, Math.floor(jitterStrength * 0.7)));
              const storedPosition = this.getHeavenHellLootGroundPosition(drop, dropIndex);
              const landX = hasStoredOffsets ? storedPosition.x : target.x + (((dropIndex % 3) - 1) * 5) + jitterX;
              const landY = hasStoredOffsets ? storedPosition.y : target.y + 14 + ((((dropIndex / 3) | 0) % 2) * 4) + jitterY;
              const arcPeakY = Math.min(startY, landY) - Phaser.Math.Between(72, 116);
              const controlX = (startX + landX) * 0.5 + Phaser.Math.Between(-42, 42);
              const flightMs = Phaser.Math.Between(420, 540);
              const launchScaleX = token.scaleX || 1;
              const launchScaleY = token.scaleY || 1;
              const flight = { t: 0 };
    
              this.playHeavenHellLootLandSfx?.(i, { soft: true, drop });
              this.tweens.add({ targets: token, alpha: 1, duration: 70, ease: "Sine.easeOut" });
              this.tweens.add({
                targets: shadow,
                alpha: 0.24,
                x: landX,
                y: landY + 16,
                scaleX: 1.24,
                scaleY: 0.82,
                duration: flightMs,
                ease: "Sine.easeIn"
              });
              this.tweens.add({
                targets: flight,
                t: 1,
                duration: flightMs,
                ease: "Sine.easeInOut",
                onUpdate: () => {
                  const t = Phaser.Math.Clamp(flight.t, 0, 1);
                  const inv = 1 - t;
                  token.x = inv * inv * startX + 2 * inv * t * controlX + t * t * landX;
                  token.y = inv * inv * startY + 2 * inv * t * arcPeakY + t * t * landY;
                  token.angle += 10 + i * 0.2;
                  const scalePulse = 1 + Math.sin(t * Math.PI) * 0.2;
                  token.setScale(launchScaleX * scalePulse, launchScaleY * scalePulse);
                },
                onComplete: () => {
                  token.setPosition(landX, landY);
                  token.setScale(launchScaleX * 0.96, launchScaleY * 0.96);
                  this.playHeavenHellLootLandSfx?.(i, { soft: false, drop });
                  this.playSfx?.("freespin_orb_appear", { volume: 0.12, rate: 1.2 });
                  const landedValue = Math.max(0, Number(drop?.settledValue ?? drop?.baseValue ?? drop?.value ?? 0));
    
                  const glow = this.textures?.exists?.("helldive_loot_land_glow")
                    ? this.add.image(landX, landY + 7, "helldive_loot_land_glow").setScale(0.54).setAlpha(0.76)
                    : this.add.circle(landX, landY + 5, 13, 0xFFD45A, 0.35);
                  glow.setDepth(DEPTH_HERO + 34).setBlendMode?.(Phaser.BlendModes.ADD);
                  this.tweens.add({
                    targets: glow,
                    scale: (glow.scaleX || 1) * 1.9,
                    alpha: 0,
                    duration: 330,
                    ease: "Cubic.easeOut",
                    onComplete: () => glow.destroy()
                  });
                  this.tweens.add({
                    targets: shadow,
                    alpha: 0,
                    scaleX: 1.8,
                    duration: 260,
                    ease: "Sine.easeOut",
                    onComplete: () => shadow.destroy()
                  });
                  this.tweens.add({
                    targets: token,
                    y: landY - 11,
                    scaleX: launchScaleX * 1.05,
                    scaleY: launchScaleY * 1.05,
                    duration: 105,
                    yoyo: true,
                    ease: "Back.easeOut",
                    onComplete: () => {
                      this.createHeavenHellLootValueLabel(landX, landY - 18, landedValue, {
                        depth: DEPTH_HERO + 58,
                        duration: 1320,
                        rise: 62,
                        driftX: Phaser.Math.Between(-6, 6),
                        driftY: Phaser.Math.Between(-4, 4)
                      });
                      if (persistToGround) {
                        token.setPosition(landX, landY);
                        token.setScale(0.34, 0.34);
                        token.setAlpha(0.96);
                        token.setDepth(DEPTH_HERO + 1);
                        this.registerHeavenHellLootSprite(token, drop, dropIndex);
                        resolve();
                        return;
                      }
                      this.tweens.add({
                        targets: token,
                        alpha: 0,
                        y: token.y + 7,
                        scaleX: launchScaleX * 0.82,
                        scaleY: launchScaleY * 0.82,
                        duration: 260,
                        ease: "Sine.easeIn",
                        onComplete: () => {
                          token.destroy();
                          resolve();
                        }
                      });
                    }
                  });
                }
              });
            });
          });
          promises.push(p);
        }
    
        await Promise.all(promises);
      },

    clearHeavenHellChestPresentation() {
        const cleanupTargets = [
          this.heavenHellChestSprite,
          this.heavenHellChestGlow,
          this.heavenHellChestShadow,
          this.heavenHellChestPulseRing,
          ...(Array.isArray(this.heavenHellChestReelPanels) ? this.heavenHellChestReelPanels : []),
          ...(Array.isArray(this.heavenHellChestRewardSprites) ? this.heavenHellChestRewardSprites : [])
        ].filter(Boolean);

        cleanupTargets.forEach((entry) => {
          if (!entry || entry.destroyed) return;
          if (entry.chestTickerEvent) {
            entry.chestTickerEvent.remove(false);
            entry.chestTickerEvent = null;
          }
          this.tweens.killTweensOf(entry);
          entry.destroy();
        });

        this.heavenHellChestSprite = null;
        this.heavenHellChestGlow = null;
        this.heavenHellChestShadow = null;
        this.heavenHellChestPulseRing = null;
        this.heavenHellChestReelPanels = [];
        this.heavenHellChestRewardSprites = [];
      },

    clearHeavenHellAbilityUnlockPresentation() {
        const cleanupTargets = [
          this.heavenHellAbilityUnlockTitle,
          ...(Array.isArray(this.heavenHellAbilityUnlockPanels) ? this.heavenHellAbilityUnlockPanels : [])
        ].filter(Boolean);

        cleanupTargets.forEach((entry) => {
          if (!entry || entry.destroyed) return;
          if (entry.chestTickerEvent) {
            entry.chestTickerEvent.remove(false);
            entry.chestTickerEvent = null;
          }
          this.tweens.killTweensOf(entry);
          entry.destroy();
        });

        this.heavenHellAbilityUnlockTitle = null;
        this.heavenHellAbilityUnlockPanels = [];
      },

    getHeavenHellChestSpinStageCenter(chestCenter = null) {
        if (chestCenter && Number.isFinite(Number(chestCenter?.x)) && Number.isFinite(Number(chestCenter?.y))) {
          return {
            x: Number(chestCenter.x),
            y: Number(chestCenter.y - 18)
          };
        }
        const cellSize = 70;
        const gridWidth = clientConfig.area.width * cellSize;
        const gridHeight = clientConfig.area.height * cellSize;
        return {
          x: GRID_OFFSET_X + gridWidth / 2,
          y: GRID_OFFSET_Y + gridHeight * 0.44
        };
      },

    getHeavenHellAbilityUnlockEvents(gameState = {}) {
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

    getHeavenHellAbilityUnlockPool(gameState = {}, unlockEvents = []) {
        const defaults = ["divineX", "divineStrike", "divineCharge"];
        const configured = Object.keys(gameState?.heavenHell?.bonus?.abilities || {});
        const fromEvents = (Array.isArray(unlockEvents) ? unlockEvents : []).map((entry) => String(entry?.ability || ""));
        return [...new Set([...defaults, ...configured, ...fromEvents].filter(Boolean))];
      },

    getHeavenHellAbilityUnlockCandidateKeys(abilities = {}, unlockPool = []) {
        return (Array.isArray(unlockPool) ? unlockPool : [])
          .filter((abilityKey) => Math.max(0, Math.floor(Number(abilities?.[abilityKey] || 0))) < 2);
      },

    getHeavenHellActionPresentationAbilities(gameState = {}) {
        const finalAbilities = gameState?.heavenHell?.bonus?.abilities;
        if (!finalAbilities || typeof finalAbilities !== "object") {
          return {};
        }

        const presentationAbilities = { ...finalAbilities };
        const unlockEvents = this.getHeavenHellAbilityUnlockEvents(gameState);
        unlockEvents.forEach((entry) => {
          const abilityKey = String(entry?.ability || "");
          if (!abilityKey) return;
          presentationAbilities[abilityKey] = Math.max(
            0,
            Math.floor(Number(presentationAbilities[abilityKey] || 0)) - 1
          );
        });
        return presentationAbilities;
      },

    buildHeavenHellAbilityUnlockSequence(gameState = {}) {
        const unlockEvents = this.getHeavenHellAbilityUnlockEvents(gameState);
        if (unlockEvents.length === 0) {
          return null;
        }

        const finalAbilities = gameState?.heavenHell?.bonus?.abilities || {};
        const startingAbilities = { ...finalAbilities };
        unlockEvents.forEach((entry) => {
          const abilityKey = String(entry?.ability || "");
          if (!abilityKey) return;
          startingAbilities[abilityKey] = Math.max(
            0,
            Math.floor(Number(startingAbilities[abilityKey] || 0)) - 1
          );
        });

        const unlockPool = this.getHeavenHellAbilityUnlockPool(gameState, unlockEvents);
        const events = [];
        const rollingAbilities = { ...startingAbilities };
        unlockEvents.forEach((entry) => {
          const abilityKey = String(entry?.ability || "");
          if (!abilityKey) return;
          const level = Math.max(
            1,
            Math.min(
              2,
              Math.floor(
                Number(entry?.level || (Math.max(0, Number(rollingAbilities[abilityKey] || 0)) + 1))
              )
            )
          );
          events.push({
            ...entry,
            ability: abilityKey,
            level,
            availableKeysBeforeReveal: this.getHeavenHellAbilityUnlockCandidateKeys(rollingAbilities, unlockPool)
          });
          rollingAbilities[abilityKey] = level;
        });

        return {
          events,
          startingAbilities,
          unlockPool
        };
      },

    getHeavenHellAbilityUnlockRevealLabel(entry = {}) {
        const baseLabel = this.getHeavenHellChestTickerLabel(String(entry?.ability || ""));
        const level = Math.max(1, Math.floor(Number(entry?.level || 1) || 1));
        return `${baseLabel} LV ${level}`;
      },

    async revealHeavenHellAbilityUnlockPanel(panel, entry = {}) {
        if (!panel || panel.destroyed) return;
        if (panel.chestTickerEvent) {
          panel.chestTickerEvent.remove(false);
          panel.chestTickerEvent = null;
        }

        const abilityKey = String(entry?.ability || "");
        const palette = this.getHeavenHellChestRewardPalette(abilityKey, {
          kind: "ability",
          abilityKey
        });
        const finalLabel = this.getHeavenHellAbilityUnlockRevealLabel(entry);

        panel.panelLabel?.setText(finalLabel);
        panel.panelLabel?.setColor(palette.text);
        panel.panelBg?.setFillStyle(palette.fill, 0.96);
        panel.panelBg?.setStrokeStyle(2, palette.stroke, 1);
        this.tweens.add({
          targets: panel,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 130,
          yoyo: true,
          ease: "Back.easeOut"
        });
        this.playSfx?.("wins_highlight", { volume: 0.17 });
        await this.waitForPresentation(150, { skippable: true });
      },

    async playHeavenHellAbilityUnlockSequence(gameState = {}, { allowRewardFx = true } = {}) {
        const sequence = this.buildHeavenHellAbilityUnlockSequence(gameState);
        if (!sequence || !Array.isArray(sequence.events) || sequence.events.length === 0) {
          return false;
        }

        const presentationState = JSON.parse(JSON.stringify(gameState));
        if (!presentationState?.heavenHell?.bonus) {
          return false;
        }

        const { centerX, centerY } = this.getHeavenHellMeterPanelPosition();
        const panelY = centerY - 62;
        const presentationAbilities = { ...sequence.startingAbilities };
        presentationState.heavenHell.bonus.abilities = { ...presentationAbilities };

        const getTickerLabels = () => this.getHeavenHellAbilityUnlockCandidateKeys(
          presentationAbilities,
          sequence.unlockPool
        ).map((abilityKey) => this.getHeavenHellChestTickerLabel(abilityKey)).filter(Boolean);

        const refreshPendingPanels = (panels = [], startIndex = 0) => {
          const tickLabels = getTickerLabels();
          for (let panelIndex = startIndex; panelIndex < panels.length; panelIndex++) {
            const panel = panels[panelIndex];
            if (!panel || panel.destroyed || panel.unlockResolved === true) continue;
            if (panel.chestTickerEvent) {
              panel.chestTickerEvent.remove(false);
              panel.chestTickerEvent = null;
            }
            if (tickLabels.length > 1) {
              this.startHeavenHellChestReelTicker(panel, tickLabels, {
                startIndex: panelIndex,
                intervalMs: 90
              });
            } else {
              panel.panelLabel?.setText(tickLabels[0] || "?");
              panel.panelLabel?.setColor("#F7E8C6");
              panel.panelBg?.setFillStyle(0x24160C, 0.92);
              panel.panelBg?.setStrokeStyle(2, 0xE3B468, 0.95);
            }
          }
        };

        this.clearHeavenHellAbilityUnlockPresentation();
        this.updateHeavenHellAbilityText?.(presentationState, { allowRewardFx: false });

        const title = this.add.text(centerX, panelY - 48, "ABILITY UPGRADE", {
          fontFamily: '"Cinzel", "Times New Roman", serif',
          fontSize: "17px",
          fontStyle: "bold",
          color: "#FFE7A2",
          stroke: "#2A1406",
          strokeThickness: 5
        })
          .setOrigin(0.5)
          .setDepth(DEPTH_HERO + 38)
          .setAlpha(0);
        this.heavenHellAbilityUnlockTitle = title;
        this.tweens.add({
          targets: title,
          alpha: 1,
          y: title.y - 8,
          duration: 180,
          ease: "Sine.easeOut"
        });

        const panels = sequence.events.map(() => {
          const panel = this.createHeavenHellChestReelPanel(centerX, panelY, 124, 56);
          panel.setScale(0.2);
          panel.setAlpha(0);
          panel.unlockResolved = false;
          this.tweens.add({
            targets: panel,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 190,
            ease: "Back.easeOut"
          });
          return panel;
        });
        this.heavenHellAbilityUnlockPanels = panels;
        this.layoutHeavenHellChestPanels(panels, panels.length, centerX, panelY, { animate: false });
        refreshPendingPanels(panels, 0);

        await this.waitForPresentation(360, { skippable: true });

        for (let revealIndex = 0; revealIndex < sequence.events.length; revealIndex++) {
          const panel = panels[revealIndex];
          const entry = sequence.events[revealIndex];
          const availableKeys = this.getHeavenHellAbilityUnlockCandidateKeys(
            presentationAbilities,
            sequence.unlockPool
          );

          if (availableKeys.length > 1) {
            await this.waitForPresentation(720, { skippable: true });
          } else {
            panel?.panelLabel?.setText(
              this.getHeavenHellChestTickerLabel(availableKeys[0] || entry?.ability || "")
            );
            await this.waitForPresentation(180, { skippable: true });
          }

          await this.revealHeavenHellAbilityUnlockPanel(panel, entry);
          if (panel) {
            panel.unlockResolved = true;
          }

          presentationAbilities[entry.ability] = Math.max(
            Number(presentationAbilities[entry.ability] || 0),
            Number(entry.level || 1)
          );
          presentationState.heavenHell.bonus.abilities = { ...presentationAbilities };
          this.updateHeavenHellAbilityText?.(presentationState, { allowRewardFx: false });

          refreshPendingPanels(panels, revealIndex + 1);
          await this.waitForPresentation(revealIndex < sequence.events.length - 1 ? 220 : 300, {
            skippable: true
          });
        }

        this.updateHeavenHellAbilityText?.(gameState, { allowRewardFx });
        this.tweens.add({
          targets: [title, ...panels].filter((entry) => entry && !entry.destroyed),
          alpha: 0,
          y: "-=18",
          duration: 180,
          ease: "Sine.easeIn"
        });
        await this.waitForPresentation(200, { skippable: true });
        this.clearHeavenHellAbilityUnlockPresentation();
        return true;
      },

    async focusHeavenHellChestCamera(chestCenter = null) {
        const camera = this.cameras?.main;
        if (!camera || !chestCenter) return null;
        const snapshot = {
          scrollX: Number(camera.scrollX || 0),
          scrollY: Number(camera.scrollY || 0),
          zoom: Number(camera.zoom || 1)
        };
        const targetZoom = Math.max(0.01, snapshot.zoom * 1.03);
        const focusX = Number(chestCenter.x || 0);
        const focusY = Number(chestCenter.y || 0) - 56;
        const targetScrollX = focusX - (camera.width * 0.5) / targetZoom;
        const targetScrollY = focusY - (camera.height * 0.5) / targetZoom;

        await new Promise((resolve) => {
          this.tweens.add({
            targets: camera,
            scrollX: targetScrollX,
            scrollY: targetScrollY,
            zoom: targetZoom,
            duration: 240,
            ease: "Sine.easeInOut",
            onComplete: resolve
          });
        });
        return snapshot;
      },

    async restoreHeavenHellChestCamera(snapshot = null) {
        const camera = this.cameras?.main;
        if (!camera || !snapshot) return;
        await new Promise((resolve) => {
          this.tweens.add({
            targets: camera,
            scrollX: Number(snapshot.scrollX || 0),
            scrollY: Number(snapshot.scrollY || 0),
            zoom: Math.max(0.01, Number(snapshot.zoom || 1)),
            duration: 220,
            ease: "Sine.easeInOut",
            onComplete: resolve
          });
        });
      },

    getHeavenHellChestColor(rawColor = null, fallback = 0xF6D58D) {
        if (typeof rawColor === "number" && Number.isFinite(rawColor)) {
          return rawColor;
        }
        if (typeof rawColor === "string" && rawColor.trim()) {
          const normalized = rawColor.startsWith("#") ? rawColor : `#${rawColor}`;
          try {
            return Phaser.Display.Color.HexStringToColor(normalized).color;
          } catch (_error) {
            return fallback;
          }
        }
        return fallback;
      },

    getHeavenHellChestRewardLabel(symbol = "", resolvedReward = null) {
        if (symbol === "respin") return "RESPIN";
        if (symbol === "respinReel") return "+ REEL";
        if (symbol === "coin" || symbol === "diamond") {
          const value = Number(resolvedReward?.baseValue ?? resolvedReward?.rewardValue ?? 0);
          return value > 0 ? `${symbol.toUpperCase()} ${value}` : symbol.toUpperCase();
        }
        if (symbol === "freeSpin") {
          const amount = Math.max(1, Math.floor(Number(resolvedReward?.appliedValue ?? resolvedReward?.rewardValue ?? 1) || 1));
          return `+${amount} SPIN${amount === 1 ? "" : "S"}`;
        }
        if (symbol === "multiplier") {
          const gained = Math.max(0, Math.floor(Number(resolvedReward?.appliedValue ?? resolvedReward?.rewardValue ?? 0) || 0));
          return gained > 0 ? `MULTI +${gained}` : "MULTI";
        }
        if (symbol === "divineStrike") {
          const gained = Math.max(0, Math.floor(Number(resolvedReward?.appliedValue ?? 0) || 0));
          return gained > 0 ? `STRIKE +${gained}` : "STRIKE MAX";
        }
        if (symbol === "divineX") {
          const gained = Math.max(0, Math.floor(Number(resolvedReward?.appliedValue ?? 0) || 0));
          return gained > 0 ? `DIVINE X +${gained}` : "DIVINE X MAX";
        }
        if (symbol === "divineCharge") {
          const gained = Math.max(0, Math.floor(Number(resolvedReward?.appliedValue ?? 0) || 0));
          return gained > 0 ? `CHARGE +${gained}` : "CHARGE MAX";
        }
        return String(symbol || "").replace(/([A-Z])/g, " $1").trim().toUpperCase();
      },

    getHeavenHellChestTickerLabel(symbol = "") {
        if (symbol === "respin") return "RESPIN";
        if (symbol === "respinReel") return "+ REEL";
        if (symbol === "coin") return "COIN";
        if (symbol === "diamond") return "DIAMOND";
        if (symbol === "freeSpin") return "+ SPIN";
        if (symbol === "multiplier") return "MULTI";
        if (symbol === "divineStrike") return "STRIKE";
        if (symbol === "divineX") return "DIVINE X";
        if (symbol === "divineCharge") return "CHARGE";
        return String(symbol || "").replace(/([A-Z])/g, " $1").trim().toUpperCase();
      },

    getHeavenHellChestRewardPalette(symbol = "", resolvedReward = null) {
        if (symbol === "diamond") return { fill: 0x66E9FF, stroke: 0xE6FCFF, text: "#EFFFFF" };
        if (symbol === "coin") return { fill: 0xE2A93A, stroke: 0xFFF0B8, text: "#FFF5DA" };
        if (symbol === "freeSpin") return { fill: 0xFFD75E, stroke: 0xFFF3C4, text: "#FFF7DA" };
        if (symbol === "multiplier") return { fill: 0x33C17A, stroke: 0xD9FFE9, text: "#F3FFF8" };
        if (symbol === "divineStrike") return { fill: 0xD85B39, stroke: 0xFFD4B0, text: "#FFF0E7" };
        if (symbol === "divineX") return { fill: 0x845DFF, stroke: 0xE6DBFF, text: "#F7F3FF" };
        if (symbol === "divineCharge") return { fill: 0x45B9FF, stroke: 0xD8F4FF, text: "#F2FBFF" };
        if (symbol === "respinReel") return { fill: 0x8AD7FF, stroke: 0xF0FBFF, text: "#F4FDFF" };
        if (symbol === "respin") return { fill: 0xF0A95A, stroke: 0xFFF0CC, text: "#FFF7E5" };
        return resolvedReward?.kind === "loot"
          ? { fill: 0xE2A93A, stroke: 0xFFF0B8, text: "#FFF5DA" }
          : { fill: 0x443321, stroke: 0xE9CB8A, text: "#FFF6DA" };
      },

    createHeavenHellChestReelPanel(x, y, width = 102, height = 54) {
        const bg = this.add.rectangle(0, 0, width, height, 0x140D07, 0.94)
          .setStrokeStyle(2, 0xE3B468, 0.95);
        const shine = this.add.rectangle(0, -(height * 0.22), width - 10, Math.max(8, height * 0.22), 0xFFF0C0, 0.12);
        const label = this.add.text(0, 0, "?", {
          fontFamily: '"Cinzel", "Times New Roman", serif',
          fontSize: "16px",
          fontStyle: "bold",
          color: "#FFF3D4",
          stroke: "#2D1706",
          strokeThickness: 4,
          align: "center"
        }).setOrigin(0.5);
        const container = this.add.container(x, y, [bg, shine, label]).setDepth(DEPTH_HERO + 36);
        container.panelBg = bg;
        container.panelLabel = label;
        return container;
      },

    startHeavenHellChestReelTicker(panel, tickLabels = [], { startIndex = 0, intervalMs = 95 } = {}) {
        if (!panel || panel.destroyed) return;
        if (panel.chestTickerEvent) {
          panel.chestTickerEvent.remove(false);
          panel.chestTickerEvent = null;
        }

        const labels = Array.isArray(tickLabels) && tickLabels.length > 0 ? tickLabels : ["?"];
        let tickIndex = Math.max(0, Math.floor(Number(startIndex) || 0));
        const applyTickLabel = () => {
          const label = labels[tickIndex % labels.length] || "?";
          panel.panelLabel?.setText(label);
          panel.panelLabel?.setColor("#F7E8C6");
          panel.panelBg?.setFillStyle(0x24160C, 0.92);
          panel.panelBg?.setStrokeStyle(2, 0xE3B468, 0.95);
          tickIndex += 1;
        };

        applyTickLabel();
        panel.chestTickerEvent = this.time.addEvent({
          delay: Math.max(60, Math.floor(Number(intervalMs) || 95)),
          loop: true,
          callback: () => {
            if (!panel || panel.destroyed) return;
            applyTickLabel();
            this.playSfx?.(tickIndex % 2 === 0 ? "coin3" : "coin4", { volume: 0.035 });
          }
        });
      },

    async tickHeavenHellChestReel(panel, reveal = {}, tickLabels = []) {
        if (!panel || panel.destroyed) return;
        this.startHeavenHellChestReelTicker(panel, tickLabels, {
          startIndex: Number(reveal?.reelIndex || 0),
          intervalMs: 95
        });

        await this.waitForPresentation(720, { skippable: true });
        if (panel.chestTickerEvent) {
          panel.chestTickerEvent.remove(false);
          panel.chestTickerEvent = null;
        }

        const resolvedReward = reveal?.resolvedReward || null;
        const symbol = String(reveal?.symbol || "");
        const palette = this.getHeavenHellChestRewardPalette(symbol, resolvedReward);
        const finalLabel = this.getHeavenHellChestRewardLabel(symbol, resolvedReward);

        panel.panelLabel?.setText(finalLabel);
        panel.panelLabel?.setColor(palette.text);
        panel.panelBg?.setFillStyle(palette.fill, 0.96);
        panel.panelBg?.setStrokeStyle(2, palette.stroke, 1);
        this.tweens.add({
          targets: panel,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 110,
          yoyo: true,
          ease: "Back.easeOut"
        });
        this.playSfx?.("wins_highlight", { volume: (symbol === "respin" || symbol === "respinReel") ? 0.12 : 0.16 });
        await this.waitForPresentation(150, { skippable: true });
      },

    layoutHeavenHellChestPanels(panels = [], reelCount = 1, centerX = 0, centerY = 0, { animate = true } = {}) {
        const activeCount = Math.max(1, Math.floor(Number(reelCount) || 1));
        const spacing = 112;
        const baseX = centerX - ((activeCount - 1) * spacing * 0.5);
        panels.forEach((panel, panelIndex) => {
          if (!panel || panel.destroyed) return;
          const targetX = baseX + (panelIndex * spacing);
          const tweenConfig = {
            targets: panel,
            x: targetX,
            y: centerY,
            duration: animate ? 180 : 0,
            ease: "Sine.easeOut"
          };
          if (animate) {
            this.tweens.add(tweenConfig);
          } else {
            panel.setPosition(targetX, centerY);
          }
          panel.setVisible(panelIndex < activeCount);
          panel.setAlpha(panelIndex < activeCount ? 1 : 0);
        });
      },

    async flyAngelToHeavenHellChest(chest = {}) {
        const reel = Math.floor(Number(chest?.reel));
        const row = Math.floor(Number(chest?.row));
        const target = this.getGridCellCenter(reel, row);
        this.previewHeroModel?.(HERO_STAGE_TEXTURE_KEYS.base, {
          reel: Number.isFinite(Number(this.currentHeroAnchor?.reel)) ? Number(this.currentHeroAnchor.reel) : reel,
          row: Number.isFinite(Number(this.currentHeroAnchor?.row)) ? Number(this.currentHeroAnchor.row) : row
        });
        if (!this.heroSprite || this.heroSprite.destroyed) return target;

        this.playSfx?.("attack_swing", { volume: 0.18, rate: 1.18 });
        this.tweens.add({
          targets: this.heroSprite,
          x: target.x,
          y: target.y + 10,
          duration: 420,
          ease: "Sine.easeInOut"
        });
        await this.waitForPresentation(430, { skippable: true });
        this.currentHeroAnchor = { reel, row };
        return target;
      },

    async animateHeavenHellChestRewardBursts(chestCenter, spin = {}, uiState = null) {
        const reveals = Array.isArray(spin?.reveals) ? spin.reveals : [];
        const rewardAnimations = reveals
          .filter((reveal) => reveal?.resolvedReward?.kind && reveal.resolvedReward.kind !== "none")
          .map((reveal, revealIndex) => new Promise((resolve) => {
            const resolvedReward = reveal.resolvedReward;
            const symbol = String(reveal?.symbol || "");
            const palette = this.getHeavenHellChestRewardPalette(symbol, resolvedReward);
            const label = this.getHeavenHellChestRewardLabel(symbol, resolvedReward);

            if (resolvedReward.kind === "loot" && resolvedReward.lootDrop) {
              const drop = resolvedReward.lootDrop;
              const target = this.getHeavenHellLootGroundPosition(drop, revealIndex);
              const token = this.createHeavenHellLootToken(chestCenter.x, chestCenter.y - 22, drop, revealIndex, { scale: 0.3 })
                .setDepth(DEPTH_HERO + 40)
                .setAlpha(0)
                .setScale(0.1);
              this.heavenHellChestRewardSprites.push(token);
              this.playHeavenHellLootLaunchSfx?.(revealIndex);
              this.tweens.add({
                targets: token,
                alpha: 1,
                scaleX: 0.54,
                scaleY: 0.54,
                y: chestCenter.y - 82,
                duration: 180,
                ease: "Back.easeOut",
                onComplete: () => {
                  this.tweens.add({
                    targets: token,
                    x: target.x,
                    y: target.y,
                    duration: 360,
                    ease: "Cubic.easeIn",
                    onComplete: () => {
                      this.playHeavenHellLootLandSfx?.(revealIndex, { drop });
                      const glow = this.add.circle(target.x, target.y, 12, 0xFFF2B2, 0.26)
                        .setDepth(DEPTH_HERO + 38)
                        .setBlendMode(Phaser.BlendModes.ADD);
                      this.tweens.add({
                        targets: glow,
                        scale: 2.1,
                        alpha: 0,
                        duration: 260,
                        ease: "Cubic.easeOut",
                        onComplete: () => glow.destroy()
                      });
                      this.createHeavenHellLootValueLabel(target.x, target.y - 18, resolvedReward.baseValue, {
                        depth: DEPTH_HERO + 58,
                        duration: 1180,
                        rise: 54,
                        driftX: Phaser.Math.Between(-8, 8),
                        driftY: Phaser.Math.Between(-4, 4)
                      });
                      this.tweens.add({
                        targets: token,
                        alpha: 0,
                        duration: 140,
                        delay: 180,
                        onComplete: () => {
                          token.destroy();
                          resolve();
                        }
                      });
                    }
                  });
                }
              });
              return;
            }

            const badge = this.add.container(chestCenter.x, chestCenter.y - 30).setDepth(DEPTH_HERO + 42).setAlpha(0);
            const bg = this.add.rectangle(0, 0, Math.max(110, label.length * 10), 34, palette.fill, 0.95)
              .setStrokeStyle(2, palette.stroke, 1);
            const text = this.add.text(0, 0, label, {
              fontFamily: '"Cinzel", "Times New Roman", serif',
              fontSize: "15px",
              fontStyle: "bold",
              color: palette.text,
              stroke: "#2A1406",
              strokeThickness: 4
            }).setOrigin(0.5);
            badge.add([bg, text]);
            this.heavenHellChestRewardSprites.push(badge);

            this.tweens.add({
              targets: badge,
              alpha: 1,
              y: chestCenter.y - 96,
              duration: 220,
              ease: "Cubic.easeOut",
              onComplete: () => {
                if (resolvedReward.kind === "freespin" && uiState) {
                  uiState.freespins = Math.max(0, uiState.freespins + Math.max(0, Math.floor(Number(resolvedReward.appliedValue || 0))));
                  this.updateFreespinCounter?.(uiState.freespins, { deferRingConsume: true });
                }
                if (resolvedReward.kind === "ability" && uiState && resolvedReward.abilityKey) {
                  uiState.abilities[resolvedReward.abilityKey] = Math.max(
                    Number(uiState.abilities[resolvedReward.abilityKey] || 0),
                    Number(resolvedReward.after || 0)
                  );
                  uiState.gameState.heavenHell.bonus.abilities = { ...uiState.abilities };
                  this.updateHeavenHellAbilityText?.(uiState.gameState, { allowRewardFx: false });
                }
                if (resolvedReward.kind === "multiplier" && uiState) {
                  const targetX = Number(this.multiplierText?.x ?? this.houseSprite?.x ?? chestCenter.x);
                  const targetY = Number(this.multiplierText?.y ?? this.houseSprite?.y ?? (chestCenter.y - 110));
                  const orb = this.add.circle(chestCenter.x, chestCenter.y - 68, 12, palette.fill, 0.95)
                    .setDepth(DEPTH_HERO + 48)
                    .setStrokeStyle(2, palette.stroke, 1)
                    .setBlendMode(Phaser.BlendModes.ADD);
                  const trail = this.add.circle(chestCenter.x, chestCenter.y - 68, 20, palette.fill, 0.24)
                    .setDepth(DEPTH_HERO + 47)
                    .setBlendMode(Phaser.BlendModes.ADD);
                  this.tweens.add({
                    targets: [orb, trail],
                    x: targetX,
                    y: targetY,
                    scaleX: 0.7,
                    scaleY: 0.7,
                    alpha: { from: 1, to: 0.2 },
                    duration: 340,
                    ease: "Cubic.easeIn",
                    onComplete: () => {
                      orb.destroy();
                      trail.destroy();
                      uiState.multiplier = Math.max(
                        1,
                        Number(uiState.multiplier || 1),
                        Number(resolvedReward.after || 1)
                      );
                      uiState.gameState.multiplier = uiState.multiplier;
                      uiState.gameState.heavenHell.bonus.globalMultiplier = uiState.multiplier;
                      this.createOrUpdateHouse?.(uiState.multiplier);
                    }
                  });
                }
                this.tweens.add({
                  targets: badge,
                  alpha: 0,
                  y: badge.y - 34,
                  duration: 320,
                  delay: 260,
                  ease: "Sine.easeIn",
                  onComplete: () => {
                    badge.destroy();
                    resolve();
                  }
                });
              }
            });
            this.playSfx?.("wins_highlight", { volume: 0.16 });
          }));

        await Promise.all(rewardAnimations);
      },

    async playHeavenHellChestRewardSequence(gameState = {}) {
        const chestEvents = Array.isArray(gameState?.heavenHell?.bonus?.chestEventsThisAction)
          ? gameState.heavenHell.bonus.chestEventsThisAction
          : [];
        if (chestEvents.length === 0) {
          this.updateFreespinCounter?.(gameState?.bonusState?.finalFreespins || 0, { deferRingConsume: true });
          return false;
        }

        const chestSummary = gameState?.heavenHell?.bonus?.chestActionSummary || {};
        const uiState = {
          freespins: Math.max(
            0,
            Number(gameState?.bonusState?.finalFreespins || 0) - Math.max(0, Number(chestSummary?.freeSpinsAdded || 0))
          ),
          multiplier: Math.max(
            1,
            Number(gameState?.multiplier || 1) - Math.max(0, Number(chestSummary?.multiplierAdded || 0))
          ),
          abilities: {
            divineStrike: Math.max(0, Number(gameState?.heavenHell?.bonus?.abilities?.divineStrike || 0) - Math.max(0, Number(chestSummary?.abilityGains?.divineStrike || 0))),
            divineX: Math.max(0, Number(gameState?.heavenHell?.bonus?.abilities?.divineX || 0) - Math.max(0, Number(chestSummary?.abilityGains?.divineX || 0))),
            divineCharge: Math.max(0, Number(gameState?.heavenHell?.bonus?.abilities?.divineCharge || 0) - Math.max(0, Number(chestSummary?.abilityGains?.divineCharge || 0)))
          },
          gameState: JSON.parse(JSON.stringify(gameState))
        };

        uiState.gameState.bonusState.finalFreespins = uiState.freespins;
        uiState.gameState.multiplier = uiState.multiplier;
        uiState.gameState.heavenHell.bonus.globalMultiplier = uiState.multiplier;
        uiState.gameState.heavenHell.bonus.abilities = { ...uiState.abilities };

        this.createOrUpdateHouse?.(uiState.multiplier);
        this.updateFreespinCounter?.(uiState.freespins, { deferRingConsume: true });
        this.updateHeavenHellAbilityText?.(uiState.gameState, { allowRewardFx: false });
        this.clearHeavenHellChestPresentation();
        await this.ensureHeavenHellQueuedChestDrops(gameState, { animateMissing: false });

        for (let chestIndex = 0; chestIndex < chestEvents.length; chestIndex++) {
          const chest = chestEvents[chestIndex] || {};
          const chestCenter = this.getHeavenHellGroundChestPosition(chest);
          const chestSpinStageCenter = this.getHeavenHellChestSpinStageCenter(chestCenter);
          const glowColor = this.getHeavenHellChestColor(chest?.highlight?.glowColor, 0xF6D58D);
          const glowAlpha = Number.isFinite(Number(chest?.highlight?.glowAlpha)) ? Number(chest.highlight.glowAlpha) : 0.28;
          const glowScale = Number.isFinite(Number(chest?.highlight?.glowScale)) ? Number(chest.highlight.glowScale) : 1.16;
          const cameraSnapshot = await this.focusHeavenHellChestCamera(chestCenter);
          const queuedSprite = this.takeHeavenHellGroundChestSprite(chest, chestIndex);

          this.heavenHellChestShadow = this.add.ellipse(chestCenter.x, chestCenter.y + 20, 58, 18, 0x000000, 0.34)
            .setDepth(DEPTH_HERO + 28);
          this.heavenHellChestGlow = this.add.circle(chestCenter.x, chestCenter.y, 38, glowColor, glowAlpha)
            .setDepth(DEPTH_HERO + 29)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.7);
          this.heavenHellChestPulseRing = this.add.circle(chestCenter.x, chestCenter.y, 24, glowColor, Math.min(0.42, glowAlpha + 0.08))
            .setDepth(DEPTH_HERO + 30)
            .setStrokeStyle(3, 0xFFF2D0, 0.95)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.65)
            .setAlpha(0.3);
          this.heavenHellChestSprite = queuedSprite && !queuedSprite.destroyed
            ? queuedSprite
            : this.createHeavenHellGroundChestSprite(chest, { scale: 0.44 });
          this.heavenHellChestSprite
            .setPosition(chestCenter.x, chestCenter.y)
            .setDepth(DEPTH_HERO + 31)
            .setScale(0.44)
            .setAlpha(1);

          this.tweens.add({
            targets: this.heavenHellChestGlow,
            scale: glowScale,
            alpha: Math.min(0.5, glowAlpha + 0.08),
            duration: 360,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
          });
          this.tweens.add({
            targets: this.heavenHellChestPulseRing,
            scale: glowScale + 0.24,
            alpha: 0,
            duration: 760,
            repeat: -1,
            ease: "Sine.easeOut"
          });

          this.playSfx?.("wins_highlight", { volume: 0.18 });
          this.tweens.add({
            targets: this.heavenHellChestSprite,
            scaleX: 0.48,
            scaleY: 0.48,
            duration: 180,
            ease: "Sine.easeOut",
            onComplete: () => {
              this.tweens.add({
                targets: this.heavenHellChestSprite,
                y: chestCenter.y + 5,
                duration: 180,
                yoyo: true,
                ease: "Bounce.easeOut"
              });
            }
          });
          await this.waitForPresentation(420, { skippable: true });

          await this.flyAngelToHeavenHellChest(chest);

          this.tweens.add({
            targets: this.heavenHellChestSprite,
            scaleX: 0.66,
            scaleY: 0.66,
            angle: -7,
            duration: 120,
            yoyo: true,
            repeat: 1,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: this.heavenHellChestGlow,
            scale: glowScale + 0.28,
            alpha: Math.min(0.62, glowAlpha + 0.18),
            duration: 180,
            yoyo: true,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: this.heavenHellChestPulseRing,
            scale: glowScale + 0.5,
            alpha: 0,
            duration: 240,
            ease: "Cubic.easeOut"
          });
          if (this.heroSprite && !this.heroSprite.destroyed) {
            this.tweens.add({
              targets: this.heroSprite,
              y: this.heroSprite.y - 12,
              duration: 140,
              yoyo: true,
              ease: "Sine.easeInOut"
            });
          }
          const spinStageFlash = this.add.circle(chestSpinStageCenter.x, chestSpinStageCenter.y - 18, 26, 0xFFF0B8, 0.22)
            .setDepth(DEPTH_HERO + 34)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: spinStageFlash,
            scale: 2.4,
            alpha: 0,
            duration: 260,
            ease: "Cubic.easeOut",
            onComplete: () => spinStageFlash.destroy()
          });
          await this.waitForPresentation(280, { skippable: true });

          this.playSfx?.("gold_drop", { volume: 0.16 });
          this.tweens.add({
            targets: this.heavenHellChestSprite,
            scaleX: 0.6,
            scaleY: 0.6,
            angle: -4,
            duration: 110,
            yoyo: true,
            repeat: 1,
            ease: "Sine.easeOut"
          });
          await this.waitForPresentation(180, { skippable: true });

          const spins = Array.isArray(chest?.spins) ? chest.spins : [];
          const panels = [];
          for (let spinIndex = 0; spinIndex < spins.length; spinIndex++) {
            const spin = spins[spinIndex] || {};
            const reelCount = Math.max(1, Math.floor(Number(spin?.reelCount || 1)));
            const reelY = chestSpinStageCenter.y - 62;

            while (panels.length < reelCount) {
              const panel = this.createHeavenHellChestReelPanel(chestCenter.x, chestCenter.y - 68, 102, 54);
              panel.setScale(0.2);
              panel.setAlpha(0);
              panels.push(panel);
              this.heavenHellChestReelPanels.push(panel);
              this.tweens.add({
                targets: panel,
                scaleX: 1,
                scaleY: 1,
                alpha: 1,
                duration: 180,
                ease: "Back.easeOut"
              });
            }

            this.layoutHeavenHellChestPanels(panels, reelCount, chestSpinStageCenter.x, reelY, { animate: true });

            const reveals = Array.isArray(spin?.reveals) ? spin.reveals : [];
            const tickLabels = (Array.isArray(spin?.availableTickSymbols) ? spin.availableTickSymbols : [])
              .map((symbol) => this.getHeavenHellChestTickerLabel(symbol))
              .filter(Boolean);
            panels.slice(0, reelCount).forEach((panel, revealIndex) => {
              this.startHeavenHellChestReelTicker(panel, tickLabels, {
                startIndex: revealIndex + spinIndex,
                intervalMs: 90
              });
            });

            await this.waitForPresentation(260, { skippable: true });
            for (let revealIndex = 0; revealIndex < reelCount; revealIndex++) {
              const panel = panels[revealIndex];
              const reveal = reveals[revealIndex] || { reelIndex: revealIndex, symbol: "coin" };
              if (panel?.chestTickerEvent) {
                panel.chestTickerEvent.remove(false);
                panel.chestTickerEvent = null;
              }
              await this.tickHeavenHellChestReel(panel, reveal, tickLabels);
            }

            await this.animateHeavenHellChestRewardBursts(chestSpinStageCenter, spin, uiState);
            await this.waitForPresentation(spinIndex < spins.length - 1 ? 220 : 140, { skippable: true });
          }

          this.tweens.add({
            targets: [this.heavenHellChestSprite, this.heavenHellChestGlow, this.heavenHellChestShadow],
            alpha: 0,
            duration: 220,
            ease: "Sine.easeIn"
          });
          await this.waitForPresentation(240, { skippable: true });
          this.clearHeavenHellChestPresentation();
          await this.restoreHeavenHellChestCamera(cameraSnapshot);
        }

        this.updateFreespinCounter?.(gameState?.bonusState?.finalFreespins || 0, { deferRingConsume: true });
        this.updateHeavenHellAbilityText?.(gameState, { allowRewardFx: false });
        return true;
      },

    async playHeavenHellCollectPhase(gameState = {}) {
        const settledDrops = Array.isArray(gameState?.heavenHell?.bonus?.lootGroundSettled)
          ? gameState.heavenHell.bonus.lootGroundSettled
          : [];
        if (settledDrops.length === 0) return;
    
        if (!Array.isArray(this.heavenHellLootSprites) || this.heavenHellLootSprites.length === 0) {
          this.renderHeavenHellLootGround(settledDrops);
        }
    
        const activeSprites = (Array.isArray(this.heavenHellLootSprites) ? this.heavenHellLootSprites : [])
          .filter((entry) => entry && !entry.destroyed);
        if (activeSprites.length === 0) return;
    
        const betSize = Math.max(0, Number(gameState?.betSize ?? gameState?.roundMeta?.betSize ?? 0));
        const totalLootTwa = settledDrops.reduce((sum, drop) => {
          const settledValue = Number(drop?.settledValue ?? drop?.baseValue ?? drop?.value ?? 0);
          return sum + settledValue * betSize;
        }, 0);
        const finalTwa = Math.max(0, Number(gameState?.twa || 0));
        const baseTwa = Math.max(0, finalTwa - totalLootTwa);
        const resolvedMultiplier = Math.max(1, Math.floor(Number(gameState?.multiplier ?? this.currentMultiplier ?? 1) || 1));
        this.createOrUpdateHouse?.(resolvedMultiplier);
        if (this.houseSprite && !this.houseSprite.destroyed) {
          this.houseSprite.setVisible(true);
        }
        if (this.multiplierText && !this.multiplierText.destroyed) {
          this.multiplierText.setVisible(true);
        }
        if (this.multiplierHighlight && !this.multiplierHighlight.destroyed) {
          this.multiplierHighlight.setVisible(true);
        }
        if (this.multiplierGlowOuter && !this.multiplierGlowOuter.destroyed) {
          this.multiplierGlowOuter.setVisible(true);
        }
        if (this.multiplierGlowInner && !this.multiplierGlowInner.destroyed) {
          this.multiplierGlowInner.setVisible(true);
        }
        const centerTarget = this.getCenterCollectTarget?.() || {
          x: this.multiplierText?.x ?? this.houseSprite?.x ?? (GRID_OFFSET_X + (clientConfig.area.width * 70) * 0.5),
          y: this.multiplierText?.y ?? this.houseSprite?.y ?? (GRID_OFFSET_Y + (clientConfig.area.height * 70) * 0.5)
        };
        const targetX = Number(centerTarget.x);
        const targetY = Number(centerTarget.y);
        let runningTwa = baseTwa;
        let collectedLootTwa = 0;
        const pulseCountUpHit = () => {
          if (!this.countUpText || this.countUpText.destroyed || this.countUpText.visible !== true) return;
          this.tweens.killTweensOf(this.countUpText);
          this.countUpText.setScale(1);
          this.tweens.add({
            targets: this.countUpText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 90,
            yoyo: true,
            ease: "Sine.easeOut"
          });
        };
        const blinkMultiplierHit = () => {
          const blink = this.add.circle(targetX, targetY, 14, 0xFFF0AE, 0.34)
            .setDepth(DEPTH_HERO + 57)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: blink,
            scale: 3.2,
            alpha: 0,
            duration: 180,
            ease: "Cubic.easeOut",
            onComplete: () => blink.destroy()
          });
          if (this.multiplierText && !this.multiplierText.destroyed) {
            this.tweens.add({
              targets: this.multiplierText,
              scaleX: 1.12,
              scaleY: 1.12,
              duration: 85,
              yoyo: true,
              ease: "Sine.easeOut"
            });
          }
          if (this.multiplierHighlight && !this.multiplierHighlight.destroyed) {
            this.tweens.add({
              targets: this.multiplierHighlight,
              alpha: 1,
              scaleX: 1.16,
              scaleY: 1.16,
              duration: 90,
              yoyo: true,
              ease: "Sine.easeOut"
            });
          }
          if (this.multiplierGlowOuter && !this.multiplierGlowOuter.destroyed) {
            this.tweens.add({
              targets: this.multiplierGlowOuter,
              alpha: 0.38,
              scale: 1.42,
              duration: 120,
              yoyo: true,
              ease: "Sine.easeOut"
            });
          }
          if (this.multiplierGlowInner && !this.multiplierGlowInner.destroyed) {
            this.tweens.add({
              targets: this.multiplierGlowInner,
              alpha: 0.42,
              scale: 1.28,
              duration: 120,
              yoyo: true,
              ease: "Sine.easeOut"
            });
          }
        };
    
        this.updateCountUp(baseTwa);
        this.ensureCollectPhaseLootCounter?.(0);

        // COLLECT PHASE HIDE
        const title = this.add.text(targetX, targetY - 96, "COLLECT PHASE", {
          fontSize: "22px",
          fontFamily: '"Cinzel", "Times New Roman", serif',
          fontStyle: "bold",
          color: "#FFE8A3",
          stroke: "#260D00",
          strokeThickness: 6
        }).setOrigin(0.5).setDepth(DEPTH_HERO + 52).setAlpha(0);
        this.tweens.add({ targets: title, alpha: 1, y: targetY - 114, duration: 220, ease: "Sine.easeOut" });
    
        const vortexGlow = this.add.circle(targetX, targetY, 34, 0xFFE08A, 0.18)
          .setDepth(DEPTH_HERO + 48)
          .setBlendMode(Phaser.BlendModes.ADD);
        const vortexRing = this.add.circle(targetX, targetY, 58, 0xFFF0B8, 0.12)
          .setDepth(DEPTH_HERO + 47)
          .setStrokeStyle(3, 0xFFE6A0, 0.22)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: vortexGlow,
          scale: 1.35,
          alpha: 0.28,
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
        this.tweens.add({
          targets: vortexRing,
          angle: 180,
          scale: 0.88,
          alpha: 0.18,
          duration: 760,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
    
        const swirlPromises = activeSprites.map((token, index) => new Promise((resolve) => {
          const drop = settledDrops[index] || {};
          const settledValue = Math.max(0, Number(drop?.settledValue ?? drop?.baseValue ?? drop?.value ?? 0));
          const payoutTwa = settledValue * betSize;
          this.time.delayedCall(index * 30, () => {
            this.playSfx?.("coin1", { volume: 0.08 + Math.min(0.1, index * 0.002) });
            const dx = Number(token.x || 0) - targetX;
            const dy = Number(token.y || 0) - targetY;
            const startRadius = Math.max(18, Math.sqrt((dx * dx) + (dy * dy)));
            const startAngle = Math.atan2(dy, dx);
            const swirlTurns = Phaser.Math.FloatBetween(2.4, 3.4) * (index % 2 === 0 ? 1 : -1);
            const travel = { progress: 0 };
            const duration = 2800 + (index % 6) * 90;
            const tokenBaseScaleX = Number(token.scaleX || 0.34);
            const tokenBaseScaleY = Number(token.scaleY || 0.34);
    
            this.tweens.add({
              targets: travel,
              progress: 1,
              duration,
              ease: "Sine.easeIn",
              onUpdate: () => {
                const t = Phaser.Math.Clamp(travel.progress, 0, 1);
                const eased = Math.pow(t, 3.15);
                const snapPhase = Phaser.Math.Clamp((t - 0.86) / 0.14, 0, 1);
                const snapBoost = 1 - Math.pow(1 - snapPhase, 3.8);
                const radiusBase = Phaser.Math.Linear(startRadius, 5, eased);
                const radius = Phaser.Math.Linear(radiusBase, 1.5, snapBoost);
                const angleProgress = eased + (snapBoost * 0.18);
                const angle = startAngle + (Math.PI * 2 * swirlTurns * angleProgress);
                const orbitX = targetX + Math.cos(angle) * radius;
                const orbitY = targetY + Math.sin(angle) * radius * 0.72;
                token.x = Phaser.Math.Linear(orbitX, targetX, snapBoost * 0.28);
                token.y = Phaser.Math.Linear(orbitY, targetY, snapBoost * 0.28);
                token.setScale(tokenBaseScaleX, tokenBaseScaleY);
                token.setAlpha(0.96);
                token.angle += 16 + (index % 5) * 2 + (snapBoost * 16);
              },
              onComplete: () => {
                if (payoutTwa > 0) {
                  collectedLootTwa += payoutTwa;
                  runningTwa += payoutTwa;
                  this.updateCollectPhaseLootCounter?.(collectedLootTwa, { animate: true });
                  this.updateCountUp(Math.min(finalTwa, runningTwa));
                  pulseCountUpHit();
                  blinkMultiplierHit();
                }
                const burst = this.add.circle(targetX, targetY, 10, 0xFFF1B2, 0.32)
                  .setDepth(DEPTH_HERO + 55)
                  .setBlendMode(Phaser.BlendModes.ADD);
                this.tweens.add({
                  targets: burst,
                  scale: 2.6,
                  alpha: 0,
                  duration: 220,
                  ease: "Cubic.easeOut",
                  onComplete: () => burst.destroy()
                });
                token.destroy();
                if (payoutTwa > 0) {
                  this.createHeavenHellLootValueLabel(targetX, targetY - 56, payoutTwa, {
                    depth: DEPTH_HERO + 58,
                    duration: 1480,
                    rise: 70,
                    driftX: Phaser.Math.Between(-10, 10),
                    driftY: Phaser.Math.Between(-12, 2)
                  });
                }
                this.tweens.killTweensOf(token);
                this.tweens.add({
                  targets: token,
                  scaleX: 0.08,
                  scaleY: 0.08,
                  alpha: 0,
                  duration: 90,
                  ease: "Cubic.easeOut",
                  onComplete: () => {
                    if (!token.destroyed) {
                      token.destroy();
                    }
                    resolve();
                  }
                });
              }
            });
          });
        }));
    
        await Promise.all(swirlPromises);
        this.clearHeavenHellLootGround();
        this.updateCountUp(finalTwa);
        this.playSfx?.("gold_drop", { volume: 0.18 });
        vortexGlow.destroy();
        vortexRing.destroy();
        this.tweens.add({
          targets: title,
          alpha: 0,
          y: title.y - 18,
          duration: 240,
          ease: "Sine.easeOut",
          onComplete: () => title.destroy()
        });
        await this.waitForPresentation(180, { skippable: true });
        this.destroyCollectPhaseLootCounter?.();
      },

    async playHeavenHellDivineStrikeAnticipation(
        step = {},
        targetCenter = null,
        {
          stepQuickStop = false,
          durationMs = 850,
          slowMoFactor = 0.18,
          showTitle = true
        } = {}
      ) {
        if (stepQuickStop || step?.divineStrikeProc !== true) return false;
        if (!this.heroSprite || this.heroSprite.destroyed) return false;

        const target = targetCenter || this.getGridCellCenter(
          Math.floor(Number(step?.reel)),
          Math.floor(Number(step?.row))
        );
        const heroX = Number(this.heroSprite.x || target.x);
        const heroY = Number(this.heroSprite.y || target.y);
        const safeDuration = Math.max(1, Math.floor(Number(durationMs) || 850));
        const clampedSlowMoFactor = Phaser.Math.Clamp(Number(slowMoFactor) || 0.18, 0.08, 0.95);
        const title = showTitle
          ? this.add.text(heroX, heroY - 92, "DIVINE STRIKE", {
              fontSize: "22px",
              fontFamily: '"Cinzel", "Times New Roman", serif',
              fontStyle: "bold",
              color: "#FFF0AA",
              stroke: "#260D00",
              strokeThickness: 6
            }).setOrigin(0.5).setDepth(DEPTH_HERO + 52).setAlpha(0)
          : null;
        const targetRing = this.add.circle(target.x, target.y, 22, 0xFFE6B0, 0.24)
          .setDepth(DEPTH_HERO + 48)
          .setStrokeStyle(4, 0xFFF7D0, 0.95)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.72);
        const targetFlash = this.add.circle(target.x, target.y, 14, 0xFFF6CE, 0.38)
          .setDepth(DEPTH_HERO + 49)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.52);

        if (title) {
          this.tweens.add({ targets: title, alpha: 1, y: heroY - 112, duration: 180, ease: "Sine.easeOut" });
        }
        this.tweens.add({
          targets: targetRing,
          scale: 2.8,
          alpha: 0.88,
          duration: safeDuration,
          ease: "Sine.easeInOut"
        });
        this.tweens.add({
          targets: targetFlash,
          scale: 3.8,
          alpha: 0.08,
          duration: safeDuration,
          ease: "Sine.easeInOut"
        });
        if (this.heroSprite && !this.heroSprite.destroyed) {
          this.tweens.add({
            targets: this.heroSprite,
            scaleX: (this.heroSprite.scaleX || 1) * 1.08,
            scaleY: (this.heroSprite.scaleY || 1) * 0.96,
            duration: Math.max(180, Math.floor(safeDuration * 0.32)),
            yoyo: true,
            repeat: 2,
            ease: "Sine.easeInOut"
          });
        }

        this.endSlowMo?.();
        this.beginBriefSlowMo?.(clampedSlowMoFactor, safeDuration, { affectTimers: false });
        await this.waitForPresentation(safeDuration, { skippable: true, useSceneTime: false });
        this.endSlowMo?.();

        if (targetRing && !targetRing.destroyed) targetRing.destroy();
        if (targetFlash && !targetFlash.destroyed) targetFlash.destroy();
        if (title) {
          this.tweens.add({
            targets: title,
            alpha: 0,
            y: title.y - 18,
            duration: 160,
            ease: "Sine.easeOut",
            onComplete: () => title.destroy()
          });
        }
        return true;
      },

    createHeavenHellDivineXWaveMarker(center = null, { wave = 1 } = {}) {
        if (!center) return [];
        if (!Array.isArray(this.heavenHellDivineGroundFx)) {
          this.heavenHellDivineGroundFx = [];
        }

        const waveIndex = Math.max(1, Math.floor(Number(wave) || 1));
        const lineLength = 70 + waveIndex * 8;
        const lineThickness = 7 + Math.min(3, waveIndex);
        const ringRadius = 15 + waveIndex * 2;
        const haloRadius = 24 + waveIndex * 4;
        const lineA = this.add.rectangle(center.x, center.y, lineLength, lineThickness, 0xFF9BF5, 0.96)
          .setAngle(45)
          .setDepth(DEPTH_SYMBOLS + 12)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0)
          .setScale(0.18, 0.26);
        const lineB = this.add.rectangle(center.x, center.y, lineLength, lineThickness, 0xFFD9FF, 0.98)
          .setAngle(-45)
          .setDepth(DEPTH_SYMBOLS + 13)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0)
          .setScale(0.18, 0.26);
        const ring = this.add.circle(center.x, center.y, ringRadius, 0xF056FF, 0.24)
          .setDepth(DEPTH_SYMBOLS + 11)
          .setStrokeStyle(3, 0xFFE0FF, 0.96)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0)
          .setScale(0.24);
        const halo = this.add.circle(center.x, center.y, haloRadius, 0xFF8BF1, 0.16)
          .setDepth(DEPTH_SYMBOLS + 10)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0)
          .setScale(0.18);
        const core = this.add.circle(center.x, center.y, 8 + waveIndex, 0xFFF1FF, 0.42)
          .setDepth(DEPTH_SYMBOLS + 14)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0)
          .setScale(0.22);

        const fxParts = [lineA, lineB, ring, halo, core];
        this.heavenHellDivineGroundFx.push(...fxParts);

        this.tweens.add({
          targets: [lineA, lineB],
          alpha: 0.96,
          scaleX: 1.06,
          scaleY: 1.02,
          duration: 110,
          ease: "Cubic.easeOut"
        });
        this.tweens.add({
          targets: ring,
          alpha: 0.78,
          scale: 1.36,
          duration: 130,
          ease: "Back.easeOut"
        });
        this.tweens.add({
          targets: halo,
          alpha: 0.34,
          scale: 1.42,
          duration: 140,
          ease: "Sine.easeOut"
        });
        this.tweens.add({
          targets: core,
          alpha: 0.88,
          scale: 1.18,
          duration: 90,
          ease: "Cubic.easeOut"
        });

        const holdMs = 140 + waveIndex * 36;
        const fadeMs = 280 + waveIndex * 40;
        this.time.delayedCall(holdMs, () => {
          const activeFx = fxParts.filter((fx) => fx && !fx.destroyed);
          if (activeFx.length === 0) return;

          this.tweens.add({
            targets: [lineA, lineB],
            scaleX: 1.28,
            scaleY: 1.14,
            alpha: 0,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: ring,
            scale: 2.35,
            alpha: 0,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: halo,
            scale: 3.2,
            alpha: 0,
            duration: fadeMs + 120,
            ease: "Sine.easeOut",
            onComplete: () => {
              activeFx.forEach((fx) => {
                if (fx && !fx.destroyed) fx.destroy();
              });
            }
          });
          this.tweens.add({
            targets: core,
            scale: 1.72,
            alpha: 0,
            duration: Math.max(320, fadeMs - 120),
            ease: "Sine.easeOut"
          });
        });

        return fxParts;
      },

    createHeavenHellDivineStrikeSigil(center = null, { wave = 0, isCenter = false } = {}) {
        if (!center) return [];
        if (!Array.isArray(this.heavenHellDivineGroundFx)) {
          this.heavenHellDivineGroundFx = [];
        }

        const waveIndex = Math.max(0, Math.floor(Number(wave) || 0));
        const baseScale = isCenter ? 0.86 : 0.74 + waveIndex * 0.04;
        const litPlate = this.add.rectangle(
          center.x,
          center.y + 4,
          isCenter ? 74 : 68,
          isCenter ? 74 : 68,
          0xFFE39A,
          isCenter ? 0.26 : 0.22
        )
          .setDepth(DEPTH_SYMBOLS + 9)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAngle(45)
          .setScale(0.72)
          .setAlpha(0);
        const litPlateGlow = this.add.rectangle(
          center.x,
          center.y + 4,
          isCenter ? 88 : 80,
          isCenter ? 88 : 80,
          0xFFF4CF,
          0.12
        )
          .setDepth(DEPTH_SYMBOLS + 8)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAngle(45)
          .setScale(0.66)
          .setAlpha(0);
        const ground = this.textures?.exists?.("helldive_divine_ground")
          ? this.add.image(center.x, center.y, "helldive_divine_ground")
              .setScale(baseScale)
              .setAlpha(0.94)
          : this.add.rectangle(center.x, center.y, 66, 66, 0xFFF1A8, 0.36);
        ground
          .setDepth(DEPTH_SYMBOLS + 11)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0);

        const rune = this.add.rectangle(center.x, center.y, isCenter ? 64 : 58, isCenter ? 64 : 58)
          .setStrokeStyle(3, 0xFFE07A, 0.96)
          .setDepth(DEPTH_SYMBOLS + 12)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAngle(45)
          .setScale(0.72)
          .setAlpha(0);

        const pentagram = typeof this.add.star === "function"
          ? this.add.star(
              center.x,
              center.y,
              5,
              isCenter ? 12 : 10,
              isCenter ? 28 : 24,
              0xFFF3C6,
              0.18
            )
          : this.add.circle(center.x, center.y, isCenter ? 24 : 20, 0xFFF3C6, 0.18);
        pentagram
          .setDepth(DEPTH_SYMBOLS + 13)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAngle(-18)
          .setScale(0.42)
          .setAlpha(0);

        const innerRune = this.add.rectangle(center.x, center.y, isCenter ? 42 : 38, isCenter ? 42 : 38)
          .setStrokeStyle(2, 0xFFF7D8, 0.82)
          .setDepth(DEPTH_SYMBOLS + 14)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAngle(45)
          .setScale(0.58)
          .setAlpha(0);

        const beam = this.textures?.exists?.("helldive_divine_wrath_beam")
          ? this.add.image(center.x, center.y - 72, "helldive_divine_wrath_beam")
              .setDepth(DEPTH_HERO + 51)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setScale(0.2, 0.38)
              .setAlpha(0.78)
          : this.add.rectangle(center.x, center.y - 82, 12, 164, 0xFFFBE0, 0.66)
              .setDepth(DEPTH_HERO + 51)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setScale(0.24, 0.22);
        beam.setAlpha(0);

        const sealGlow = this.add.circle(center.x, center.y, isCenter ? 30 : 24, 0xFFF2BC, 0.18)
          .setDepth(DEPTH_SYMBOLS + 15)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.24)
          .setAlpha(0);

        const fxParts = [litPlate, litPlateGlow, ground, rune, pentagram, innerRune, beam, sealGlow];
        this.heavenHellDivineGroundFx.push(...fxParts);

        this.tweens.add({
          targets: [litPlate, litPlateGlow, ground, rune, pentagram, innerRune],
          alpha: 0.94,
          duration: 110,
          ease: "Sine.easeOut"
        });
        this.tweens.add({
          targets: [litPlate, litPlateGlow, ground, rune],
          scale: (target, key, value) => (Number(value) || 1) * 1.1,
          duration: 150,
          yoyo: true,
          repeat: 1,
          ease: "Cubic.easeOut"
        });
        this.tweens.add({
          targets: pentagram,
          angle: pentagram.angle + 28,
          scale: 1.12,
          alpha: 0.82,
          duration: 240,
          ease: "Sine.easeOut"
        });
        this.tweens.add({
          targets: innerRune,
          angle: innerRune.angle + 25,
          scale: 1.02,
          duration: 240,
          ease: "Sine.easeOut"
        });
        this.tweens.add({
          targets: beam,
          alpha: 0.92,
          scaleX: (beam.scaleX || 1) * 3.4,
          scaleY: (beam.scaleY || 1) * 1.4,
          duration: 320,
          ease: "Cubic.easeOut"
        });
        this.tweens.add({
          targets: sealGlow,
          alpha: 0.56,
          scale: 2.4,
          duration: 280,
          ease: "Cubic.easeOut"
        });

        const holdMs = isCenter ? 520 : 460 + waveIndex * 80;
        const fadeMs = isCenter ? 820 : 720 + waveIndex * 90;
        const beamFadeStartMs = Math.max(140, Math.floor(holdMs * 0.5));
        const beamFadeMs = Math.max(140, Math.floor((isCenter ? 430 : 360) * 0.5));
        this.time.delayedCall(holdMs, () => {
          const activeFx = fxParts.filter((fx) => fx && !fx.destroyed);
          if (activeFx.length === 0) return;

          this.tweens.add({
            targets: [litPlate, litPlateGlow, ground, rune, pentagram, innerRune, sealGlow],
            alpha: 0,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: litPlate,
            scaleX: (litPlate.scaleX || 1) * 1.14,
            scaleY: (litPlate.scaleY || 1) * 1.14,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: litPlateGlow,
            scaleX: (litPlateGlow.scaleX || 1) * 1.22,
            scaleY: (litPlateGlow.scaleY || 1) * 1.22,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: ground,
            scaleX: (ground.scaleX || 1) * 1.18,
            scaleY: (ground.scaleY || 1) * 1.18,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: rune,
            angle: rune.angle + 18,
            scale: 1.22,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: pentagram,
            angle: pentagram.angle - 34,
            scale: 1.24,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: innerRune,
            angle: innerRune.angle - 28,
            scale: 1.14,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
        });

        this.time.delayedCall(beamFadeStartMs, () => {
          if (!beam || beam.destroyed) return;
          this.tweens.add({
            targets: beam,
            alpha: 0,
            scaleX: (beam.scaleX || 1) * 1.25,
            duration: beamFadeMs,
            ease: "Sine.easeOut"
          });
        });

        return fxParts;
      },

    createHeavenHellDivineStrikeReachMarker(center = null, { wave = 0, distance = 0, isOrigin = false, isKilled = false } = {}) {
        if (!center) return [];
        if (!Array.isArray(this.heavenHellDivineGroundFx)) {
          this.heavenHellDivineGroundFx = [];
        }

        const waveIndex = Math.max(0, Math.floor(Number(wave) || 0));
        const distanceIndex = Math.max(0, Math.floor(Number(distance) || 0));
        const plateAlpha = isKilled ? 0.26 : (isOrigin ? 0.22 : 0.16);
        const starAlpha = isKilled ? 0.2 : (isOrigin ? 0.16 : 0.12);
        const plate = this.add.rectangle(center.x, center.y + 4, 62, 62, 0xFFE3A0, plateAlpha)
          .setDepth(DEPTH_SYMBOLS + 8)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAngle(45)
          .setScale(0.7)
          .setAlpha(0);
        const frame = this.add.rectangle(center.x, center.y + 4, 66, 66)
          .setDepth(DEPTH_SYMBOLS + 9)
          .setStrokeStyle(isKilled ? 3 : 2, isKilled ? 0xFFF4D0 : 0xFFE8B2, isKilled ? 0.86 : 0.62)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAngle(45)
          .setScale(0.66)
          .setAlpha(0);
        const star = typeof this.add.star === "function"
          ? this.add.star(center.x, center.y, 5, isKilled ? 9 : 8, isKilled ? 20 : 18, 0xFFF3C6, starAlpha)
          : this.add.circle(center.x, center.y, isKilled ? 18 : 16, 0xFFF3C6, starAlpha);
        star
          .setDepth(DEPTH_SYMBOLS + 10)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAngle(isOrigin ? -18 : -10)
          .setScale(isOrigin ? 0.46 : 0.4)
          .setAlpha(0);
        const pulse = this.add.circle(center.x, center.y, isKilled ? 16 : 14, isKilled ? 0xFFF0C2 : 0xFFE5AE, isKilled ? 0.22 : 0.14)
          .setDepth(DEPTH_SYMBOLS + 11)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.22)
          .setAlpha(0);
        const beam = this.textures?.exists?.("helldive_divine_wrath_beam")
          ? this.add.image(center.x, center.y - 68, "helldive_divine_wrath_beam")
              .setDepth(DEPTH_HERO + 50)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setScale(isKilled ? 0.16 : 0.12, isKilled ? 0.32 : 0.24)
          : this.add.rectangle(
              center.x,
              center.y - 76,
              isKilled ? 10 : 8,
              isKilled ? 150 : 126,
              0xFFFBE0,
              isKilled ? 0.78 : 0.56
            )
              .setDepth(DEPTH_HERO + 50)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setScale(0.22, 0.18);
        beam.setAlpha(0);
        const beamFlare = this.add.circle(center.x, center.y, isKilled ? 20 : 16, isKilled ? 0xFFF2C2 : 0xFFE5AE, isKilled ? 0.28 : 0.18)
          .setDepth(DEPTH_SYMBOLS + 12)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.18)
          .setAlpha(0);

        const fxParts = [plate, frame, star, pulse, beam, beamFlare];
        this.heavenHellDivineGroundFx.push(...fxParts);

        this.tweens.add({
          targets: [plate, frame, star],
          alpha: 0.92,
          duration: 90,
          ease: "Sine.easeOut"
        });
        this.tweens.add({
          targets: [plate, frame],
          scale: (target, key, value) => (Number(value) || 1) * 1.08,
          duration: 140,
          ease: "Cubic.easeOut"
        });
        this.tweens.add({
          targets: star,
          alpha: isKilled ? 0.92 : 0.7,
          angle: star.angle + (isOrigin ? 24 : 18),
          scale: isOrigin ? 1.02 : 0.92,
          duration: 220,
          ease: "Sine.easeOut"
        });
        this.tweens.add({
          targets: beam,
          alpha: isKilled ? 0.96 : 0.72,
          scaleX: (beam.scaleX || 1) * (isKilled ? 4.4 : 3.4),
          scaleY: (beam.scaleY || 1) * (isKilled ? 1.55 : 1.35),
          duration: isKilled ? 250 : 220,
          ease: "Cubic.easeOut"
        });
        this.tweens.add({
          targets: beamFlare,
          alpha: isKilled ? 0.72 : 0.46,
          scale: isKilled ? 2.7 : 2.1,
          duration: isKilled ? 240 : 220,
          ease: "Cubic.easeOut"
        });
        this.tweens.add({
          targets: pulse,
          alpha: isKilled ? 0.7 : 0.48,
          scale: 2 + waveIndex * 0.08 + distanceIndex * 0.06,
          duration: 240,
          ease: "Cubic.easeOut"
        });

        const holdMs = 280 + waveIndex * 40 + distanceIndex * 50;
        const fadeMs = isKilled ? 700 : 620;
        const beamFadeStartMs = Math.max(120, Math.floor(holdMs * 0.5));
        const beamFadeMs = Math.max(120, Math.floor((isKilled ? 280 : 240) * 0.5));
        this.time.delayedCall(holdMs, () => {
          const activeFx = fxParts.filter((fx) => fx && !fx.destroyed);
          if (activeFx.length === 0) return;
          this.tweens.add({
            targets: [plate, frame, star, pulse, beamFlare],
            alpha: 0,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: plate,
            scaleX: (plate.scaleX || 1) * 1.12,
            scaleY: (plate.scaleY || 1) * 1.12,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: frame,
            angle: frame.angle + 12,
            scale: 1.16,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
          this.tweens.add({
            targets: star,
            angle: star.angle - 24,
            scale: 1.14,
            duration: fadeMs,
            ease: "Sine.easeOut"
          });
        });

        this.time.delayedCall(beamFadeStartMs, () => {
          if (!beam || beam.destroyed) return;
          this.tweens.add({
            targets: beam,
            alpha: 0,
            scaleX: (beam.scaleX || 1) * 1.28,
            duration: beamFadeMs,
            ease: "Sine.easeOut"
          });
        });

        return fxParts;
      },

    async playHeavenHellDivineStrikeAtStep(step = {}, gameState = {}, { stepQuickStop = false, origin = null } = {}) {
        if (stepQuickStop || step?.divineStrikeProc !== true) return;
        if (gameState?.heavenHell?.bonus && gameState?.isBonus === true) {
          this._heavenHellActiveGameState = gameState;
        }

        const strikeTargets = Array.isArray(step?.divineStrikeTargets) ? step.divineStrikeTargets : [];
        if (strikeTargets.length === 0) return;

        this.clearHeavenHellDivineGroundFx?.({ fade: true });

        const heroX = Number(this.heroSprite?.x || (origin?.x ?? (GRID_OFFSET_X + (clientConfig.area.width * 70) * 0.5)));
        const heroY = Number(this.heroSprite?.y || (origin?.y ?? (GRID_OFFSET_Y + (clientConfig.area.height * 70) * 0.5)));
        const originPoint = {
          x: Number(origin?.x || heroX),
          y: Number(origin?.y || heroY)
        };
        const killedCells = [];
        const lootCells = [];
        const lootCellKeys = new Set();
        const killedKeys = new Set();
        const markedReachKeys = new Set();
        const pushLootCell = (reel, row) => {
          const cellReel = Math.floor(Number(reel));
          const cellRow = Math.floor(Number(row));
          if (!Number.isFinite(cellReel) || !Number.isFinite(cellRow)) return;
          const key = `${cellReel},${cellRow}`;
          if (lootCellKeys.has(key)) return;
          lootCellKeys.add(key);
          lootCells.push({ reel: cellReel, row: cellRow });
        };
        const waves = [...new Set(strikeTargets.map((target) => Math.max(0, Math.floor(Number(target?.wave) || 0))))].sort((a, b) => a - b);
        const orderedTargets = waves.flatMap((wave) => (
          strikeTargets
            .filter((target) => Math.max(0, Math.floor(Number(target?.wave) || 0)) === wave)
            .sort((a, b) => Number(a?.row) - Number(b?.row) || Number(a?.reel) - Number(b?.reel))
            .map((target) => ({ ...target, wave }))
        ));

        for (let targetIndex = 0; targetIndex < orderedTargets.length; targetIndex++) {
          const target = orderedTargets[targetIndex];
          const wave = Math.max(0, Math.floor(Number(target?.wave) || 0));
          const reel = Math.floor(Number(target?.reel));
          const row = Math.floor(Number(target?.row));
          if (!Number.isFinite(reel) || !Number.isFinite(row)) continue;

          const center = this.getGridCellCenter(reel, row);
          this.createHeavenHellDivineStrikeSigil?.(center, {
            wave,
            isCenter: target?.center === true
          });
          const strikeImpact = this.add.circle(center.x, center.y, target?.center === true ? 20 : 18, 0xFFEAB0, 0.18)
            .setDepth(DEPTH_SYMBOLS + 15)
            .setStrokeStyle(4, 0xFFF8D4, 0.92)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.42);
          if (target?.center !== true) {
            this.createHeavenHellDivineXWaveMarker?.(center, { wave: Math.max(1, wave) });
          }
          this.heavenHellDivineGroundFx.push(strikeImpact);
          this.tweens.add({ targets: strikeImpact, scale: 3.6, alpha: 0, duration: 220, ease: "Cubic.easeOut" });
          this.playSfx?.("attack_swing", { volume: 0.24, rate: 0.98 + wave * 0.04 });
          this.playSfx?.("lightning_thor", { volume: 0.18, rate: 0.96 + wave * 0.04 });
          this.playHeavenHellAngelStrikeSlash?.(originPoint, center, {
            scale: target?.center === true ? 0.96 : 0.88 + wave * 0.05
          });
          if (targetIndex < orderedTargets.length - 1) {
            await this.waitForPresentation(14, { skippable: true });
          }
        }

        for (const target of orderedTargets) {
          const wave = Math.max(0, Math.floor(Number(target?.wave) || 0));
          const hitCells = Array.isArray(target?.hitCells) ? target.hitCells : [];
          hitCells.forEach((cell) => {
            const cellReel = Math.floor(Number(cell?.reel));
            const cellRow = Math.floor(Number(cell?.row));
            if (!Number.isFinite(cellReel) || !Number.isFinite(cellRow)) return;

            const cellCenter = this.getGridCellCenter(cellReel, cellRow);
            const reachKey = `${cellReel},${cellRow}`;
            if (!markedReachKeys.has(reachKey)) {
              markedReachKeys.add(reachKey);
              this.createHeavenHellDivineStrikeReachMarker?.(cellCenter, {
                wave,
                distance: Number(cell?.distance || 0),
                isOrigin: cell?.origin === true,
                isKilled: cell?.killed === true
              });
            }

            if (cell?.killed === true || (cell?.hadDemon === true && cell?.origin === true)) {
              pushLootCell(cellReel, cellRow);
            }
            if (cell?.killed !== true) return;
            if (killedKeys.has(reachKey)) return;
            killedKeys.add(reachKey);

            const sprite = this.reelSprites?.[cellReel]?.[cellRow];
            if (sprite && !sprite.destroyed) {
              this.playHeavenHellDemonDeathFx?.(cellReel, cellRow, {
                center: cellCenter,
                intensity: cell?.origin === true ? 1.22 : 1.02,
                destroySprite: true,
                gameState,
                killWeight: cell?.killCountMultiplier,
                divineXDoubleKill: cell?.divineXDoubleKill === true,
                isMultiplierDemon: cell?.isMultiplierDemon === true
              });
            } else if (cell?.isMultiplierDemon === true) {
              this.dropHeavenHellMultiplierDemonOrb(cellCenter.x, cellCenter.y);
            }
            if (this.reelSprites?.[cellReel]) {
              this.reelSprites[cellReel][cellRow] = null;
            }
            killedCells.push({ reel: cellReel, row: cellRow });
          });
        }

        this.pushHeavenHellStepBananaLootCells(step, pushLootCell);

        this.cameras?.main?.shake?.(130, 0.0042);
        await this.waitForPresentation(44, { skippable: true });

        if (lootCells.length > 0) {
          await this.playHeavenHellLootDropPattern(gameState, {
            source: "divineStrike",
            launchFromDropCell: true,
            jitterStrength: this.getHeavenHellChargeLootJitter(step),
            filterCells: lootCells,
            persistToGround: true
          });
        }

        this.time.delayedCall(1800, () => this.clearHeavenHellDivineGroundFx?.({ fade: true }));
      },

    async playHeavenHellDivineXAtStep(step = {}, gameState = {}, { stepQuickStop = false, origin = null, strikeAtTargets = false } = {}) {
        if (stepQuickStop || step?.divineXProc !== true) return;
        if (gameState?.heavenHell?.bonus && gameState?.isBonus === true) {
          this._heavenHellActiveGameState = gameState;
        }

        const xTargets = Array.isArray(step?.divineXTargets) ? step.divineXTargets : [];
        if (xTargets.length === 0) return;

        this.clearHeavenHellDivineGroundFx?.({ fade: true });

        const heroX = Number(this.heroSprite?.x || (origin?.x ?? (GRID_OFFSET_X + (clientConfig.area.width * 70) * 0.5)));
        const heroY = Number(this.heroSprite?.y || (origin?.y ?? (GRID_OFFSET_Y + (clientConfig.area.height * 70) * 0.5)));
        const originPoint = {
          x: Number(origin?.x || heroX),
          y: Number(origin?.y || heroY)
        };
        const title = this.add.text(heroX, heroY - 96, "DIVINE X", {
          fontSize: "22px",
          fontFamily: '"Cinzel", "Times New Roman", serif',
          fontStyle: "bold",
          color: "#FFE4FF",
          stroke: "#420C56",
          strokeThickness: 6
        }).setOrigin(0.5).setDepth(DEPTH_HERO + 52).setAlpha(0);
        if (title) {
          this.tweens.add({
            targets: title,
            alpha: 1,
            y: strikeAtTargets ? heroY - 108 : heroY - 116,
            duration: strikeAtTargets ? 100 : 120,
            ease: "Sine.easeOut"
          });
        }

        const waves = [...new Set(xTargets.map((target) => Math.max(1, Math.floor(Number(target?.wave) || 1))))].sort((a, b) => a - b);
        const divineStrikeTargets = Array.isArray(step?.divineStrikeTargets) ? step.divineStrikeTargets : [];
        const divineStrikeTargetMap = new Map(
          divineStrikeTargets
            .filter((entry) => Number.isFinite(Number(entry?.reel)) && Number.isFinite(Number(entry?.row)))
            .map((entry) => [`${Math.floor(Number(entry.reel))},${Math.floor(Number(entry.row))}`, entry])
        );
        const killedCells = [];
        const lootCells = [];
        const lootCellKeys = new Set();
        const killedKeys = new Set();
        const pushLootCell = (reel, row) => {
          const cellReel = Math.floor(Number(reel));
          const cellRow = Math.floor(Number(row));
          if (!Number.isFinite(cellReel) || !Number.isFinite(cellRow)) return;
          const key = `${cellReel},${cellRow}`;
          if (lootCellKeys.has(key)) return;
          lootCellKeys.add(key);
          lootCells.push({ reel: cellReel, row: cellRow });
        };

        const orderedXTargets = waves.flatMap((wave) => (
          xTargets
            .filter((target) => Math.max(1, Math.floor(Number(target?.wave) || 1)) === wave)
            .sort((a, b) => Number(a?.row) - Number(b?.row) || Number(a?.reel) - Number(b?.reel))
            .map((target) => ({ ...target, wave }))
        ));

        const telegraphDivineXTarget = (target) => {
          const wave = Math.max(1, Math.floor(Number(target?.wave) || 1));
          const reel = Math.floor(Number(target?.reel));
          const row = Math.floor(Number(target?.row));
          if (!Number.isFinite(reel) || !Number.isFinite(row)) return null;

          const center = this.getGridCellCenter(reel, row);
          this.createHeavenHellDivineXWaveMarker?.(center, { wave });

          if (strikeAtTargets) {
            this.playSfx?.("attack_swing", { volume: 0.22, rate: 1.02 + wave * 0.03 });
            this.playHeavenHellAngelStrikeSlash?.(originPoint, center, { scale: 0.82 + wave * 0.06 });
          } else {
            this.playSfx?.("lightning_thor", { volume: 0.22, rate: 1.14 + wave * 0.02 });
          }
          return center;
        };

        const showDivineXHitLabel = (center, wave = 1) => {
          if (!center) return;
          this.createHeavenHellAbilityImpactLabel?.(center.x, center.y - 18, "DIVINE X", {
            depth: DEPTH_HERO + 57,
            fontSize: "18px",
            scale: 0.66 + Math.min(0.12, Math.max(0, Number(wave) - 1) * 0.03),
            rise: 34,
            duration: 760,
            driftY: -8,
            color: "#FFE6FF",
            stroke: "#4A1368",
            shadow: "#21052D"
          });
        };

        const resolveDivineXTargetKills = (target) => {
          const wave = Math.max(1, Math.floor(Number(target?.wave) || 1));
          const reel = Math.floor(Number(target?.reel));
          const row = Math.floor(Number(target?.row));
          if (!Number.isFinite(reel) || !Number.isFinite(row)) return;

          const center = this.getGridCellCenter(reel, row);
          const linkedStrikeTarget = strikeAtTargets
            ? divineStrikeTargetMap.get(`${reel},${row}`)
            : null;
          const strikeHitCells = Array.isArray(linkedStrikeTarget?.hitCells) ? linkedStrikeTarget.hitCells : [];

          if (linkedStrikeTarget) {
              this.createHeavenHellDivineStrikeSigil?.(center, {
                wave,
                isCenter: false
              });
              const strikeImpact = this.add.circle(center.x, center.y, 18, 0xFF8AF4, 0.3)
                .setDepth(DEPTH_SYMBOLS + 15)
                .setBlendMode(Phaser.BlendModes.ADD);
              const strikeBloom = this.add.circle(center.x, center.y, 14, 0xFFD4FF, 0.24)
                .setDepth(DEPTH_SYMBOLS + 14)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setScale(0.4);
              this.heavenHellDivineGroundFx.push(strikeImpact);
              this.heavenHellDivineGroundFx.push(strikeBloom);
              this.playSfx?.("lightning_thor_impact", { volume: 0.2, rate: 1.04 + wave * 0.03 });
              this.tweens.add({
                targets: strikeImpact,
                scale: 3.4,
                alpha: 0,
                duration: 300,
                ease: "Cubic.easeOut"
              });
              this.tweens.add({
                targets: strikeBloom,
                scale: 2.8,
                alpha: 0,
                duration: 280,
                ease: "Cubic.easeOut"
              });

              if (strikeHitCells.some((cell) => cell?.killed === true)) {
                showDivineXHitLabel(center, wave);
              }

              strikeHitCells.forEach((cell) => {
                const cellReel = Math.floor(Number(cell?.reel));
                const cellRow = Math.floor(Number(cell?.row));
                if (!Number.isFinite(cellReel) || !Number.isFinite(cellRow)) return;

                const cellCenter = this.getGridCellCenter(cellReel, cellRow);
                const ripple = this.add.circle(cellCenter.x, cellCenter.y, cell?.origin === true ? 14 : 12, cell?.origin === true ? 0xFF89F3 : 0xD96BFF, 0.18)
                  .setDepth(DEPTH_SYMBOLS + 13)
                  .setStrokeStyle(cell?.origin === true ? 3 : 2, cell?.origin === true ? 0xFFE5FF : 0xF6D7FF, 0.86)
                  .setBlendMode(Phaser.BlendModes.ADD)
                  .setScale(0.45);
                this.heavenHellDivineGroundFx.push(ripple);
                this.tweens.add({
                  targets: ripple,
                  scale: cell?.origin === true ? 1.9 : 1.5,
                  alpha: 0,
                  duration: 260,
                  ease: "Cubic.easeOut"
                });

                if (cell?.killed !== true) return;
                const key = `${cellReel},${cellRow}`;
                if (killedKeys.has(key)) return;
                killedKeys.add(key);

                const sprite = this.reelSprites?.[cellReel]?.[cellRow];
                if (sprite && !sprite.destroyed) {
                  this.playHeavenHellDemonDeathFx?.(cellReel, cellRow, {
                    center: cellCenter,
                    intensity: cell?.origin === true ? 1.22 : 1.04,
                    destroySprite: true,
                    gameState,
                    killWeight: cell?.killCountMultiplier,
                    divineXDoubleKill: cell?.divineXDoubleKill === true,
                    isMultiplierDemon: cell?.isMultiplierDemon === true
                  });
                } else if (cell?.isMultiplierDemon === true) {
                  this.dropHeavenHellMultiplierDemonOrb(cellCenter.x, cellCenter.y);
                }
                if (this.reelSprites?.[cellReel]) {
                  this.reelSprites[cellReel][cellRow] = null;
                }
                killedCells.push({ reel: cellReel, row: cellRow });
                pushLootCell(cellReel, cellRow);
              });
            } else if (target?.killed === true) {
              const sprite = this.reelSprites?.[reel]?.[row];
              if (sprite && !sprite.destroyed) {
                showDivineXHitLabel(center, wave);
                this.playHeavenHellDemonDeathFx?.(reel, row, {
                  center,
                  intensity: strikeAtTargets ? 1.18 : 0.98,
                  destroySprite: true,
                  gameState,
                  killWeight: target?.killCountMultiplier,
                  divineXDoubleKill: target?.divineXDoubleKill === true,
                  isMultiplierDemon: target?.isMultiplierDemon === true
                });
              } else if (target?.isMultiplierDemon === true) {
                this.dropHeavenHellMultiplierDemonOrb(center.x, center.y);
              }
              if (this.reelSprites?.[reel]) {
                this.reelSprites[reel][row] = null;
              }
              killedKeys.add(`${reel},${row}`);
              killedCells.push({ reel, row });
              pushLootCell(reel, row);
            }
        };

        if (strikeAtTargets) {
          for (let targetIndex = 0; targetIndex < orderedXTargets.length; targetIndex++) {
            telegraphDivineXTarget(orderedXTargets[targetIndex]);
            if (targetIndex < orderedXTargets.length - 1) {
              await this.waitForPresentation(12, { skippable: true });
            }
          }
          for (const target of orderedXTargets) {
            resolveDivineXTargetKills(target);
          }
        } else {
          for (const wave of waves) {
            const waveTargets = orderedXTargets.filter((target) => Math.max(1, Math.floor(Number(target?.wave) || 1)) === wave);
            for (const target of waveTargets) {
              telegraphDivineXTarget(target);
              resolveDivineXTargetKills(target);
              await this.waitForPresentation(16, { skippable: true });
            }
            this.cameras?.main?.shake?.(110, 0.0032 + wave * 0.001);
            await this.waitForPresentation(24, { skippable: true });
          }
        }

        this.pushHeavenHellStepBananaLootCells(step, pushLootCell);

        if (title) {
          this.tweens.add({
            targets: title,
            alpha: 0,
            y: title.y - 18,
            duration: 160,
            ease: "Sine.easeOut",
            onComplete: () => title.destroy()
          });
        }

        if (strikeAtTargets) {
          this.cameras?.main?.shake?.(110, 0.0036);
        }

        if (lootCells.length > 0) {
          await this.playHeavenHellLootDropPattern(gameState, {
            source: "divineX",
            launchFromDropCell: true,
            jitterStrength: this.getHeavenHellChargeLootJitter(step),
            filterCells: lootCells,
            persistToGround: true
          });
        }

        this.time.delayedCall(1800, () => this.clearHeavenHellDivineGroundFx?.({ fade: true }));
      },

    async playHeavenHellDivineXAreaTelegraph(gameState = {}) {
        if (gameState?.heavenHell?.bonus && gameState?.isBonus === true) {
          this._heavenHellActiveGameState = gameState;
        }
      },

    getHeavenHellMeterPanelPosition() {
        const cellSize = 70;
        const gridWidth = clientConfig.area.width * cellSize;
        const gridHeight = clientConfig.area.height * cellSize;
        return {
          centerX: GRID_OFFSET_X + gridWidth / 2,
          centerY: GRID_OFFSET_Y + gridHeight + 52
        };
      },

    getHeavenHellBossKillWeight() {
        return 9;
      },

    getHeavenHellMeterUnlockCount(gameState = {}) {
        const procs = Array.isArray(gameState?.heavenHell?.bonus?.abilityProcsThisAction)
          ? gameState.heavenHell.bonus.abilityProcsThisAction
          : [];
        return procs.filter((entry) => entry?.type === "abilityUnlock" || entry?.type === "abilityReward").length;
      },

    getHeavenHellMeterActionPlan(gameState = {}) {
        const bonus = gameState?.heavenHell?.bonus;
        if (!bonus || gameState?.isBonus !== true) {
          return null;
        }
        const nextUnlock = Math.max(1, Math.floor(Number(bonus?.nextAbilityKillThreshold || 20)));
        const hasActionStart = Number.isFinite(Number(bonus?.killsTowardsUnlockAtActionStart));
        const hasPersistedStart = Number.isFinite(Number(this._heavenHellMeterDisplayKills));
        const startKills = hasActionStart
          ? Math.max(0, Math.floor(Number(bonus.killsTowardsUnlockAtActionStart)))
          : (hasPersistedStart
            ? Math.max(0, Math.floor(Number(this._heavenHellMeterDisplayKills)))
            : 0);
        const endKills = Math.max(
          0,
          Math.floor(
            Number(
              bonus?.killsTowardsUnlockBeforeSettlement ??
              bonus?.killsTowardsUnlock ??
              startKills
            )
          )
        );
        const weightedBudget = Math.max(0, endKills - startKills);
        return {
          startKills,
          endKills,
          nextUnlock,
          unlocks: 0,
          weightedBudget
        };
      },

    getHeavenHellKillWeightForCell(reel, row, gameState = {}) {
        const bossId = Number(clientConfig.symbolsMapping?.banana3 || TROLL_SYMBOL_ID || 13);
        const sprite = this.reelSprites?.[reel]?.[row];
        const spriteSymbol = Number(sprite?.symbolKey);
        if (Number.isFinite(spriteSymbol) && spriteSymbol > 0) {
          return spriteSymbol === bossId ? this.getHeavenHellBossKillWeight() : 1;
        }
        const affected = Array.isArray(gameState?.affectedPositions) ? gameState.affectedPositions : [];
        const match = affected.find((pos) => Number(pos?.reel) === reel && Number(pos?.row) === row);
        const wasSymbol = Number(match?.wasSymbol);
        if (Number.isFinite(wasSymbol) && wasSymbol > 0) {
          return wasSymbol === bossId ? this.getHeavenHellBossKillWeight() : 1;
        }
        return 1;
      },

    prepareHeavenHellKillMeterForAction(gameState = {}) {
        const bonus = gameState?.heavenHell?.bonus;
        if (!bonus || gameState?.isBonus !== true) return;
        const plan = this.getHeavenHellMeterActionPlan(gameState);
        if (!plan) return;
    
        this._heavenHellActiveGameState = gameState;
        this._heavenHellMeterRuntime = {
          nextUnlock: plan.nextUnlock,
          endKills: plan.endKills,
          displayKills: plan.startKills,
          killBudgetRemaining: plan.weightedBudget
        };
        const presentationAbilities = this.getHeavenHellActionPresentationAbilities(gameState);
        const ui = this._heavenHellMeterUi;
        const prevProgress = ui
          ? Number(ui.lastProgress) || 0
          : Math.max(0, Math.min(1, plan.startKills / plan.nextUnlock));
        this.renderHeavenHellKillMeterDisplay({
          displayKills: plan.startKills,
          nextUnlock: plan.nextUnlock,
          abilities: presentationAbilities,
          prevProgress,
          allowRewardFx: false,
          skipUnlockBlink: true,
          skipMilestones: true
        });
      },

    tickHeavenHellKillMeterOnKill(reel, row, gameState = {}, { allowRewardFx = false, killWeight = null } = {}) {
        const bonus = gameState?.heavenHell?.bonus;
        if (!bonus || gameState?.isBonus !== true) return;
        if (!this._heavenHellMeterRuntime) {
          this.prepareHeavenHellKillMeterForAction(gameState);
        }
        const runtime = this._heavenHellMeterRuntime;
        if (!runtime || runtime.killBudgetRemaining <= 0) return;
        const presentationAbilities = this.getHeavenHellActionPresentationAbilities(gameState);
    
        const ui = this._heavenHellMeterUi;
        const prevProgress = ui
          ? Number(ui.lastProgress) || 0
          : Math.max(0, Math.min(1, runtime.displayKills / runtime.nextUnlock));
        const resolvedKillWeight = Number.isFinite(Number(killWeight))
          ? Math.max(1, Math.floor(Number(killWeight) || 1))
          : this.getHeavenHellKillWeightForCell(reel, row, gameState);
        const appliedWeight = Math.min(resolvedKillWeight, runtime.killBudgetRemaining);
        if (appliedWeight <= 0) return;
    
        runtime.killBudgetRemaining -= appliedWeight;
        const previousDisplayKills = runtime.displayKills;
        runtime.displayKills = Math.max(0, runtime.displayKills + appliedWeight);
        if (previousDisplayKills < runtime.nextUnlock && runtime.displayKills >= runtime.nextUnlock) {
          this.playHeavenHellMeterMilestoneFx("ready");
        }
        this.renderHeavenHellKillMeterDisplay({
          displayKills: runtime.displayKills,
          nextUnlock: runtime.nextUnlock,
          abilities: presentationAbilities,
          prevProgress,
          allowRewardFx,
          skipUnlockBlink: true
        });
      },

    renderHeavenHellKillMeterDisplay({
        displayKills = 0,
        nextUnlock = 20,
        abilities = {},
        prevProgress = 0,
        allowRewardFx = false,
        skipUnlockBlink = false,
        skipMilestones = false,
        killsTotal = 0,
        actionCount = 0,
        procs = []
      } = {}) {
        const resolvedKills = Math.max(0, Math.floor(Number(displayKills) || 0));
        const resolvedUnlock = Math.max(1, Math.floor(Number(nextUnlock) || 20));
        const progress = Math.max(0, Math.min(1, resolvedKills / resolvedUnlock));
        const displayTextKills = resolvedKills;
        const ui = this.ensureHeavenHellAbilityPanel();
        const { centerX, centerY } = this.getHeavenHellMeterPanelPosition();
    
        ui.container.setPosition(centerX, centerY);
        ui.container.setVisible(true);
        ui.killCountText.setText(`⚔ ${displayTextKills} / ${resolvedUnlock}`);
        this.redrawHeavenHellMeterFill(ui, progress);
        this.refreshHeavenHellAbilitySlots(ui, abilities);
    
        if (!skipMilestones) {
          if (prevProgress < 0.5 && progress >= 0.5) {
            this.playHeavenHellMeterMilestoneFx("half");
          }
          if (prevProgress < 0.75 && progress >= 0.75) {
            this.playHeavenHellMeterMilestoneFx("threeQuarter");
          }
          if (!skipUnlockBlink && prevProgress < 1 && progress >= 1) {
            this.playHeavenHellMeterMilestoneFx("ready");
          }
        }
        ui.lastProgress = progress;
        this._heavenHellMeterDisplayKills = resolvedKills;
    
        if (!skipUnlockBlink && resolvedKills >= resolvedUnlock && !this.heavenHellMeterBlinkTween) {
          this.playHeavenHellMeterBlink(2);
        }
        const awardedFreespins = this.getHeavenHellAwardedFreespinsThisAction(procs);
        if (allowRewardFx && awardedFreespins > 0) {
          const rewardFxKey = `reward:${actionCount}:${awardedFreespins}:${Math.floor(killsTotal)}`;
          if (this.heavenHellLastRewardFxKey !== rewardFxKey) {
            this.heavenHellLastRewardFxKey = rewardFxKey;
            this.playHeavenHellMeterBlink(4);
            this.playHeavenHellFreespinAwardPopup(awardedFreespins);
          }
        }
      },

    getHeavenHellAbilitySlotPalette(abilityKey = "divineX") {
        const palettes = {
          divineX: { fill: 0x7B4DFF, glow: 0xD8B8FF, empty: 0x171126 },
          divineStrike: { fill: 0xD94A2B, glow: 0xFFB48A, empty: 0x24140F },
          divineCharge: { fill: 0x3FA8FF, glow: 0xB8E8FF, empty: 0x0F1A28 }
        };
        return palettes[abilityKey] || palettes.divineX;
      },

    destroyHeavenHellAbilityPanel() {
        const ui = this._heavenHellMeterUi;
        if (!ui) return;
        if (ui.shimmerTween) {
          ui.shimmerTween.stop();
          ui.shimmerTween = null;
        }
        if (ui.container && !ui.container.destroyed) {
          ui.container.destroy();
        }
        this._heavenHellMeterUi = null;
        this.heavenHellAbilityPanel = null;
      },

    hideHeavenHellAbilityPanel() {
        if (this.heavenHellAbilityPanel && !this.heavenHellAbilityPanel.destroyed) {
          this.heavenHellAbilityPanel.setVisible(false);
        }
        if (this.heavenHellMeterBlinkTween) {
          this.heavenHellMeterBlinkTween.stop();
          this.heavenHellMeterBlinkTween = null;
        }
      },

    createHeavenHellAbilitySlot(x, y, filled, abilityKey = "divineX") {
        const palette = this.getHeavenHellAbilitySlotPalette(abilityKey);
        const size = 14;
        const slotBg = this.add.rectangle(x, y, size, size, filled ? palette.fill : palette.empty, filled ? 0.96 : 0.72)
          .setStrokeStyle(2, filled ? 0xFFE87A : 0x5E4A24, filled ? 1 : 0.8);
        const children = [slotBg];
        if (filled) {
          const gem = this.add.rectangle(x, y, size * 0.42, size * 0.42, palette.glow, 0.92)
            .setRotation(Math.PI / 4);
          const spark = this.add.circle(x, y, size * 0.16, 0xFFF8D6, 0.85);
          children.push(gem, spark);
        } else {
          children.push(
            this.add.rectangle(x, y, size * 0.3, size * 0.3, 0x000000, 0.42)
          );
        }
        return children;
      },

    ensureHeavenHellAbilityPanel() {
        const HEAVEN_HELL_METER_PANEL_HEIGHT = 74;
        if (
          this.heavenHellAbilityPanel &&
          !this.heavenHellAbilityPanel.destroyed &&
          this._heavenHellMeterUi?.panelHeight === HEAVEN_HELL_METER_PANEL_HEIGHT
        ) {
          return this._heavenHellMeterUi;
        }
        if (this.heavenHellAbilityPanel && !this.heavenHellAbilityPanel.destroyed) {
          this.destroyHeavenHellAbilityPanel();
        }
    
        const panelWidth = 380;
        const panelHeight = HEAVEN_HELL_METER_PANEL_HEIGHT;
        const meterWidth = 320;
        const meterHeight = 9;
        const meterX = -meterWidth / 2;
        const meterY = -2;
        const { centerX, centerY } = this.getHeavenHellMeterPanelPosition();
        const children = [];
    
        const outerGlow = this.add.rectangle(0, 0, panelWidth + 18, panelHeight + 18, 0xFFE87A, 0.08)
          .setBlendMode(Phaser.BlendModes.ADD);
        const panelBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x14100C, 0.94);
        const innerShadow = this.add.rectangle(0, 1, panelWidth - 8, panelHeight - 8, 0x000000, 0.28);
        const goldBorder = this.add.rectangle(0, 0, panelWidth, panelHeight)
          .setStrokeStyle(2, 0xD4AF37, 0.95)
          .setFillStyle(0x000000, 0);
        const innerBorder = this.add.rectangle(0, 0, panelWidth - 6, panelHeight - 6)
          .setStrokeStyle(1, 0x8A6A1E, 0.55)
          .setFillStyle(0x000000, 0);
        const titleText = this.add.text(-panelWidth / 2 + 18, -panelHeight / 2 + 12, "ABILITY CHARGE", {
          fontFamily: '"Cinzel", "Trajan Pro", "Times New Roman", serif',
          fontSize: "10px",
          fontStyle: "bold",
          color: "#F8E7B0",
          stroke: "#2A1A05",
          strokeThickness: 3
        }).setOrigin(0, 0.5);
        const killCountText = this.add.text(panelWidth / 2 - 18, -panelHeight / 2 + 12, "⚔ 0 / 20", {
          fontFamily: '"Cinzel", "Trajan Pro", "Times New Roman", serif',
          fontSize: "18px",
          fontStyle: "bold",
          color: "#FFF4C8",
          stroke: "#2A1400",
          strokeThickness: 4
        }).setOrigin(1, 0.5);
        const trackBg = this.add.rectangle(meterX, meterY, meterWidth, meterHeight, 0x090706, 0.95)
          .setOrigin(0, 0.5)
          .setStrokeStyle(1, 0x3A2D18, 0.95);
        const trackInner = this.add.rectangle(meterX + 1, meterY, meterWidth - 2, meterHeight - 2, 0x000000, 0.35)
          .setOrigin(0, 0.5);
        const fillGfx = this.add.graphics();
        const shimmer = this.add.rectangle(meterX - 28, meterY, 22, meterHeight - 2, 0xFFF4C8, 0.42)
          .setOrigin(0, 0.5)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setVisible(false);
    
        children.push(
          outerGlow,
          panelBg,
          innerShadow,
          goldBorder,
          innerBorder,
          titleText,
          killCountText,
          trackBg,
          trackInner,
          fillGfx,
          shimmer
        );
    
        const abilityRows = [];
        const abilityDefs = [
          { key: "divineX", label: "X", maxSlots: 2 },
          { key: "divineStrike", label: "Strike", maxSlots: 2 },
          { key: "divineCharge", label: "Charge", maxSlots: 2 }
        ];
        const abilityRowY = panelHeight / 2 - 14;
        let abilityCursorX = -panelWidth / 2 + 16;
        abilityDefs.forEach((def) => {
          const label = this.add.text(abilityCursorX, abilityRowY, def.label, {
            fontFamily: '"Cinzel", "Times New Roman", serif',
            fontSize: "10px",
            fontStyle: "bold",
            color: "#D8C79A",
            stroke: "#1A1208",
            strokeThickness: 2
          }).setOrigin(0, 0.5);
          children.push(label);
          abilityCursorX += label.width + 6;
          const slots = [];
          for (let slotIndex = 0; slotIndex < def.maxSlots; slotIndex++) {
            const slotX = abilityCursorX + slotIndex * 18 + 7;
            const slotChildren = this.createHeavenHellAbilitySlot(slotX, abilityRowY, false, def.key);
            slotChildren.forEach((child) => children.push(child));
            slots.push({ slotChildren, slotX, rowY: abilityRowY });
          }
          abilityCursorX += def.maxSlots * 18 + 14;
          abilityRows.push({ ...def, label, slots });
        });
    
        const container = this.add.container(centerX, centerY, children)
          .setDepth(DEPTH_HERO + 24);
    
        const ui = {
          container,
          outerGlow,
          panelBg,
          goldBorder,
          titleText,
          killCountText,
          trackBg,
          fillGfx,
          shimmer,
          abilityRows,
          panelWidth,
          panelHeight,
          meterWidth,
          meterHeight,
          meterX,
          meterY,
          shimmerTween: null,
          lastProgress: 0,
          lastFillWidth: -1,
          lastAbilityLevels: null
        };
        this._heavenHellMeterUi = ui;
        this.heavenHellAbilityPanel = container;
    
        return ui;
      },

    redrawHeavenHellMeterFill(ui, progress = 0) {
        if (!ui?.fillGfx || ui.fillGfx.destroyed) return;
        const fillWidth = Math.max(0, Math.floor((ui.meterWidth - 4) * progress));
        const x = ui.meterX + 2;
        const y = ui.meterY - (ui.meterHeight - 4) / 2;
        const height = ui.meterHeight - 4;
        const glowBoost = 0.35 + progress * 0.65;
    
        ui.fillGfx.clear();
        if (fillWidth <= 0) {
          if (ui.shimmer) ui.shimmer.setVisible(false);
          if (ui.shimmerTween) {
            ui.shimmerTween.stop();
            ui.shimmerTween = null;
          }
          ui.lastFillWidth = 0;
          if (ui.outerGlow) ui.outerGlow.setAlpha(0.06 + progress * 0.12);
          return;
        }
    
        ui.fillGfx.fillGradientStyle(
          0x6A4A10,
          0x6A4A10,
          0xFFD45A,
          0xFFF0A8,
          0.92
        );
        ui.fillGfx.fillRect(x, y, fillWidth, height);
        ui.fillGfx.fillStyle(0xFFFFFF, 0.08 + progress * 0.12);
        ui.fillGfx.fillRect(x, y, fillWidth, Math.max(2, Math.floor(height * 0.35)));
    
        if (ui.shimmer) {
          ui.shimmer.setVisible(true);
          ui.shimmer.y = ui.meterY;
          ui.shimmer.displayHeight = height;
          ui.shimmer.setAlpha(0.18 + progress * 0.42);
          if (ui.lastFillWidth !== fillWidth) {
            ui.lastFillWidth = fillWidth;
            if (ui.shimmerTween) {
              ui.shimmerTween.stop();
              ui.shimmerTween = null;
            }
            ui.shimmer.x = x - 36;
            ui.shimmerTween = this.tweens.add({
              targets: ui.shimmer,
              x: x + fillWidth + 18,
              duration: 1100 - Math.floor(progress * 350),
              repeat: -1,
              ease: "Sine.easeInOut",
              onRepeat: () => {
                if (ui.shimmer && !ui.shimmer.destroyed) {
                  ui.shimmer.x = x - 36;
                }
              }
            });
          }
        }
    
        if (ui.outerGlow) {
          ui.outerGlow.setAlpha(0.08 + glowBoost * 0.14);
          ui.outerGlow.setScale(1 + progress * 0.04);
        }
      },

    refreshHeavenHellAbilitySlots(ui, abilities = {}) {
        if (!ui?.abilityRows) return;
        const levels = {
          divineX: Math.max(0, Math.floor(Number(abilities?.divineX || 0))),
          divineStrike: Math.max(0, Math.floor(Number(abilities?.divineStrike || 0))),
          divineCharge: Math.max(0, Math.floor(Number(abilities?.divineCharge || 0)))
        };
        const levelsKey = `${levels.divineX}:${levels.divineStrike}:${levels.divineCharge}`;
        if (ui.lastAbilityLevels === levelsKey) return;
        ui.lastAbilityLevels = levelsKey;
    
        ui.abilityRows.forEach((row) => {
          const level = levels[row.key] || 0;
          row.slots.forEach((slot, slotIndex) => {
            const filled = level > slotIndex;
            slot.slotChildren.forEach((child) => {
              if (!child || child.destroyed) return;
              child.destroy();
            });
            const refreshed = this.createHeavenHellAbilitySlot(slot.slotX, slot.rowY, filled, row.key);
            slot.slotChildren = refreshed;
            refreshed.forEach((child) => ui.container.add(child));
          });
        });
      },

    playHeavenHellMeterMilestoneFx(level = "half") {
        const ui = this._heavenHellMeterUi;
        if (!ui?.container || ui.container.destroyed) return;
    
        const pulseStrength = level === "ready" ? 1.14 : level === "threeQuarter" ? 1.08 : 1.04;
        const glowAlpha = level === "ready" ? 0.42 : level === "threeQuarter" ? 0.28 : 0.18;
        const duration = level === "ready" ? 260 : 180;
    
        this.tweens.add({
          targets: ui.container,
          scaleX: pulseStrength,
          scaleY: pulseStrength,
          duration,
          yoyo: true,
          ease: "Back.easeOut"
        });
        if (ui.outerGlow) {
          this.tweens.add({
            targets: ui.outerGlow,
            alpha: glowAlpha,
            duration,
            yoyo: true,
            ease: "Sine.easeOut"
          });
        }
        if (level === "ready") {
          this.cameras?.main?.shake?.(240, 0.006);
          const flash = this.add.rectangle(ui.container.x, ui.container.y, ui.panelWidth + 12, ui.panelHeight + 12, 0xFFF0A0, 0.55)
            .setDepth(DEPTH_HERO + 30)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 1.12,
            scaleY: 1.12,
            duration: 420,
            ease: "Cubic.easeOut",
            onComplete: () => flash.destroy()
          });
        }
      },

    updateHeavenHellAbilityText(gameState = {}, { allowRewardFx = true } = {}) {
        const heavenHell = gameState?.heavenHell;
        const isBonus = gameState?.isBonus === true;
        if (!heavenHell || !isBonus) {
          this._heavenHellActiveGameState = null;
          this._heavenHellMeterRuntime = null;
          this.clearHeavenHellGroundChests();
          this.hideHeavenHellAbilityPanel();
          return;
        }
    
        const bonus = heavenHell?.bonus || {};
        const killsTotal = Math.max(0, Number(bonus?.killsTotal || 0));
        const killsTowardsUnlock = Math.max(0, Number(bonus?.killsTowardsUnlock ?? 0));
        const nextUnlock = Math.max(1, Number(bonus?.nextAbilityKillThreshold || 20));
        const ui = this._heavenHellMeterUi;
        const runtime = this._heavenHellMeterRuntime;
        const displayedKills = runtime
          ? Math.max(0, Math.floor(Number(runtime.displayKills) || 0))
          : (Number.isFinite(Number(this._heavenHellMeterDisplayKills))
            ? Math.max(0, Math.floor(Number(this._heavenHellMeterDisplayKills)))
            : killsTowardsUnlock);
        const prevProgress = ui ? Number(ui.lastProgress) || 0 : 0;
        const needsFinalSync = displayedKills !== killsTowardsUnlock;
        this._heavenHellActiveGameState = null;
        this._heavenHellMeterRuntime = null;
        this.renderHeavenHellKillMeterDisplay({
          displayKills: killsTowardsUnlock,
          nextUnlock,
          abilities: bonus?.abilities || {},
          prevProgress,
          allowRewardFx,
          skipMilestones: needsFinalSync,
          skipUnlockBlink: needsFinalSync,
          killsTotal,
          actionCount: Math.max(0, Math.floor(Number(bonus?.actionCount || 0))),
          procs: Array.isArray(bonus?.abilityProcsThisAction) ? bonus.abilityProcsThisAction : []
        });
        this._heavenHellMeterDisplayKills = killsTowardsUnlock;
      },

    getHeavenHellAwardedFreespinsThisAction(procs = []) {
        return (Array.isArray(procs) ? procs : []).reduce((sum, entry) => {
          if (!entry || (entry.type !== "abilityUnlock" && entry.type !== "abilityReward")) return sum;
          const awarded = Math.max(0, Math.floor(Number(entry?.freespinsAwarded || 0)));
          return sum + awarded;
        }, 0);
      },

    playHeavenHellMeterBlink(blinkCount = 3) {
        const ui = this._heavenHellMeterUi;
        if (!ui?.container || ui.container.destroyed) return;
        if (this.heavenHellMeterBlinkTween) {
          this.heavenHellMeterBlinkTween.stop();
          this.heavenHellMeterBlinkTween = null;
        }
        const targets = [ui.goldBorder, ui.outerGlow].filter((obj) => obj && !obj.destroyed);
        if (targets.length === 0) return;
        this.heavenHellMeterBlinkTween = this.tweens.add({
          targets,
          alpha: { from: 1, to: 0.2 },
          duration: 120,
          yoyo: true,
          repeat: Math.max(1, Math.floor(Number(blinkCount) || 3)),
          ease: "Sine.easeInOut",
          onComplete: () => {
            if (ui.goldBorder && !ui.goldBorder.destroyed) {
              ui.goldBorder.setAlpha(1);
            }
            if (ui.outerGlow && !ui.outerGlow.destroyed) {
              ui.outerGlow.setAlpha(0.12);
            }
            this.heavenHellMeterBlinkTween = null;
          }
        });
      },

    playHeavenHellFreespinAwardPopup(awardedFreespins = 2) {
        const ui = this._heavenHellMeterUi;
        if (!ui?.container || ui.container.destroyed) return;
        const amount = Math.max(1, Math.floor(Number(awardedFreespins) || 2));
        const popup = this.add.text(
          ui.container.x,
          ui.container.y - ui.panelHeight / 2 - 14,
          `+${amount} Freespins`,
          {
            fontFamily: '"Cinzel", "Times New Roman", serif',
            fontSize: "22px",
            fontStyle: "bold",
            color: "#FFD55D",
            stroke: "#2A1400",
            strokeThickness: 5
          }
        )
          .setOrigin(0.5, 1)
          .setDepth(DEPTH_HERO + 30)
          .setAlpha(0);
    
        this.tweens.add({
          targets: popup,
          alpha: 1,
          y: popup.y - 24,
          duration: 260,
          ease: "Sine.easeOut",
          onComplete: () => {
            this.tweens.add({
              targets: popup,
              alpha: 0,
              y: popup.y - 14,
              duration: 420,
              ease: "Sine.easeIn",
              onComplete: () => popup.destroy()
            });
          }
        });
      }
  };
}

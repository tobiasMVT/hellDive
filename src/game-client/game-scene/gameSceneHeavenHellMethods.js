export function createGameSceneHeavenHellMethods(deps = {}) {
  const {
    DEPTH_HERO,
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

    renderHeavenHellLootGround(drops = []) {
        if (!Array.isArray(this.heavenHellLootSprites)) {
          this.heavenHellLootSprites = [];
        }
        this.heavenHellLootSprites.forEach((entry) => {
          if (entry && !entry.destroyed) entry.destroy();
        });
        this.heavenHellLootSprites = [];
        const list = Array.isArray(drops) ? drops : [];
        const maxRender = Math.min(64, list.length);
        for (let i = 0; i < maxRender; i++) {
          const drop = list[i];
          const reel = Math.floor(Number(drop?.reel));
          const row = Math.floor(Number(drop?.row));
          if (!Number.isFinite(reel) || !Number.isFinite(row)) continue;
          const position = this.getHeavenHellLootGroundPosition(drop, i);
          const token = this.createHeavenHellLootToken(position.x, position.y, drop, i, { scale: 0.34 });
          token.setDepth(DEPTH_HERO - 1);
          this.heavenHellLootSprites.push(token);
        }
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

    getHeavenHellLootTexture(baseValue = 0, index = 0) {
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
        const textureKey = this.getHeavenHellLootTexture(drop?.baseValue, index);
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

    playHeavenHellDemonDeathFx(reel, row, { center = null, intensity = 1, destroySprite = true, gameState = null } = {}) {
        const target = center || this.getGridCellCenter(reel, row);
        const sprite = this.reelSprites?.[reel]?.[row];
        const power = Math.max(0.7, Math.min(2.2, Number(intensity) || 1));
        const resolvedGameState = gameState || this._heavenHellActiveGameState;
        if (resolvedGameState?.heavenHell?.bonus && resolvedGameState?.isBonus === true) {
          this.tickHeavenHellKillMeterOnKill(reel, row, resolvedGameState);
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
        const chargeText = this.add.text(heroX, heroY - 78, "DIVINE STRIKE", {
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
    
        await this.waitForPresentation(2000, { skippable: true });
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

    spawnHeavenHellChargeLaunchTrails(fromX, fromY, toX, toY, { heroScale = 1 } = {}) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const trailCount = Math.min(12, Math.max(5, Math.floor(distance / 42)));
        const angelTextureKey = this.getHeavenHellHeroTextureKey?.(HERO_STAGE_TEXTURE_KEYS.rush) || HERO_STAGE_TEXTURE_KEYS.base;
        for (let i = 1; i <= trailCount; i++) {
          const t = i / (trailCount + 1);
          this.time.delayedCall(i * 12, () => {
            const trail = this.textures?.exists?.("helldive_angel_trail")
              ? this.add.image(fromX + dx * t - dx * 0.05, fromY + dy * t - dy * 0.05, "helldive_angel_trail")
                  .setDepth(DEPTH_HERO + 39)
                  .setScale(0.56 + t * 0.34)
                  .setAlpha(0.5 * (1 - t * 0.3))
                  .setBlendMode(Phaser.BlendModes.ADD)
              : null;
            if (trail) trail.setRotation(Math.atan2(dy, dx));
            const ghost = this.add.image(fromX + dx * t, fromY + dy * t, angelTextureKey)
              .setDepth(DEPTH_HERO + 40)
              .setScale(heroScale * (1.06 - t * 0.3))
              .setAlpha(0.48 * (1 - t * 0.42))
              .setTint(0xBFE9FF)
              .setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
              targets: ghost,
              alpha: 0,
              scale: ghost.scaleX * 1.32,
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

    async playHeavenHellDivineChargeImpact(step = {}, gameState = {}, targetCenter = null) {
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
        await this.playHeavenHellLootDropPattern(gameState, {
          source: "divineCharge",
          from: { x: target.x, y: target.y - 70 },
          jitterStrength: lootMultiplier >= 10 ? 18 : 14,
          filterCells: [{ reel, row }],
          persistToGround: true
        });
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

    async playHeavenHellLootDropPattern(gameState = {}, { source = null, from = null, jitterStrength = 6, filterCells = null, persistToGround = false } = {}) {
        const drops = Array.isArray(gameState?.heavenHell?.bonus?.lootGround)
          ? gameState.heavenHell.bonus.lootGround
          : [];
        let scoped = source ? drops.filter((entry) => entry?.source === source) : drops;
        if (Array.isArray(filterCells) && filterCells.length > 0) {
          const cellKeys = new Set(filterCells.map((cell) => `${Math.floor(Number(cell?.reel))},${Math.floor(Number(cell?.row))}`));
          scoped = scoped.filter((entry) => cellKeys.has(`${Math.floor(Number(entry?.reel))},${Math.floor(Number(entry?.row))}`));
        }
        if (scoped.length === 0) return;
    
        const startX = Number(from?.x || (GRID_OFFSET_X + (clientConfig.area.width * 70) * 0.5));
        const startY = Number(from?.y || (GRID_OFFSET_Y - 40));
        const maxDrops = Math.min(28, scoped.length);
        const promises = [];
    
        for (let i = 0; i < maxDrops; i++) {
          const drop = scoped[i];
          const reel = Math.floor(Number(drop?.reel));
          const row = Math.floor(Number(drop?.row));
          if (!Number.isFinite(reel) || !Number.isFinite(row)) continue;
    
          const target = this.getGridCellCenter(reel, row);
          const token = this.createHeavenHellLootToken(startX, startY, drop, i, { scale: 0.42 });
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
              const storedPosition = this.getHeavenHellLootGroundPosition(drop, i);
              const landX = hasStoredOffsets ? storedPosition.x : target.x + (((i % 3) - 1) * 5) + jitterX;
              const landY = hasStoredOffsets ? storedPosition.y : target.y + 14 + ((((i / 3) | 0) % 2) * 4) + jitterY;
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
                        if (!Array.isArray(this.heavenHellLootSprites)) {
                          this.heavenHellLootSprites = [];
                        }
                        this.heavenHellLootSprites.push(token);
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
        const targetX = Number(this.multiplierText?.x ?? this.houseSprite?.x ?? (GRID_OFFSET_X + (clientConfig.area.width * 70) * 0.5));
        const targetY = Number(this.multiplierText?.y ?? this.houseSprite?.y ?? (GRID_OFFSET_Y + (clientConfig.area.height * 70) * 0.5));
        let runningTwa = baseTwa;
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
                  runningTwa += payoutTwa;
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
                resolve();
              }
            });
          });
        }));
    
        await Promise.all(swirlPromises);
        this.heavenHellLootSprites = [];
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
      },

    async playHeavenHellDivineWrathAtStep(step = {}, gameState = {}, { stepQuickStop = false } = {}) {
        if (stepQuickStop || step?.divineWrathProc !== true) return;
        if (gameState?.heavenHell?.bonus && gameState?.isBonus === true) {
          this._heavenHellActiveGameState = gameState;
        }
    
        const affectedCells = Array.isArray(step?.divineWrathAffectedCells) ? step.divineWrathAffectedCells : [];
        const killCells = Array.isArray(step?.divineWrathKillCells) ? step.divineWrathKillCells : [];
        if (affectedCells.length === 0) return;
    
        this.clearHeavenHellDivineGroundFx?.({ fade: true });
    
        const heroX = Number(this.heroSprite?.x || (GRID_OFFSET_X + (clientConfig.area.width * 70) * 0.5));
        const heroY = Number(this.heroSprite?.y || (GRID_OFFSET_Y + (clientConfig.area.height * 70) * 0.5));
        const title = this.add.text(heroX, heroY - 96, "DIVINE WRATH", {
          fontSize: "22px",
          fontFamily: '"Cinzel", "Times New Roman", serif',
          fontStyle: "bold",
          color: "#FFF0AA",
          stroke: "#260D00",
          strokeThickness: 6
        }).setOrigin(0.5).setDepth(DEPTH_HERO + 52).setAlpha(0);
        this.tweens.add({ targets: title, alpha: 1, y: heroY - 116, duration: 220, ease: "Sine.easeOut" });
    
        const chargeOrb = this.add.circle(heroX, heroY - 16, 18, 0xFFF1AD, 0.5)
          .setDepth(DEPTH_HERO + 50)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.55);
        const halo = this.add.circle(heroX, heroY, 46, 0xFFE082, 0.12)
          .setDepth(DEPTH_HERO + 49)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.5);
        this.tweens.add({ targets: chargeOrb, scale: 2.7, alpha: 0.88, duration: 420, ease: "Cubic.easeOut" });
        this.tweens.add({ targets: halo, scale: 2.1, alpha: 0.3, duration: 420, ease: "Cubic.easeOut" });
        if (this.heroSprite && !this.heroSprite.destroyed) {
          this.tweens.add({
            targets: this.heroSprite,
            y: this.heroSprite.y - 10,
            duration: 180,
            yoyo: true,
            repeat: 1,
            ease: "Sine.easeInOut"
          });
        }
        await this.waitForPresentation(480, { skippable: true });
    
        this.playSfx?.("lightning_thor", { volume: 0.68 });
        this.cameras?.main?.shake?.(320, 0.009);
    
        const sortedCells = [...affectedCells].sort((a, b) => (Number(a.reel) + Number(a.row)) - (Number(b.reel) + Number(b.row)));
    
        sortedCells.forEach((cell) => {
          const reel = Math.floor(Number(cell?.reel));
          const row = Math.floor(Number(cell?.row));
          if (!Number.isFinite(reel) || !Number.isFinite(row)) return;
          const center = this.getGridCellCenter(reel, row);
          const ground = this.textures?.exists?.("helldive_divine_ground")
            ? this.add.image(center.x, center.y, "helldive_divine_ground").setScale(0.7).setAlpha(0.9)
            : this.add.rectangle(center.x, center.y, 66, 66, 0xFFF1A8, 0.36);
          ground.setDepth(DEPTH_SYMBOLS + 11).setBlendMode(Phaser.BlendModes.ADD);
          const rune = this.add.rectangle(center.x, center.y, 60, 60)
            .setStrokeStyle(3, 0xFFE07A, 0.96)
            .setDepth(DEPTH_SYMBOLS + 12)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setAngle(45)
            .setScale(0.72);
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
          this.heavenHellDivineGroundFx.push(ground, rune);
          this.tweens.add({ targets: [ground, rune], scale: 1.1, duration: 130, yoyo: true, repeat: 1, ease: "Cubic.easeOut" });
          this.tweens.add({
            targets: beam,
            scaleX: (beam.scaleX || 1) * 3.4,
            scaleY: (beam.scaleY || 1) * 1.4,
            alpha: 0,
            duration: 320,
            ease: "Cubic.easeOut",
            onComplete: () => beam.destroy()
          });
        });
    
        killCells.forEach((cell) => {
          const reel = Math.floor(Number(cell?.reel));
          const row = Math.floor(Number(cell?.row));
          if (!Number.isFinite(reel) || !Number.isFinite(row)) return;
          const center = this.getGridCellCenter(reel, row);
          const sprite = this.reelSprites?.[reel]?.[row];
          if (sprite && !sprite.destroyed) {
            this.playHeavenHellDemonDeathFx?.(reel, row, { center, intensity: 1.28, destroySprite: true });
          }
          if (this.reelSprites?.[reel]) {
            this.reelSprites[reel][row] = null;
          }
        });
    
        await this.waitForPresentation(520, { skippable: true });
        if (chargeOrb && !chargeOrb.destroyed) chargeOrb.destroy();
        if (halo && !halo.destroyed) halo.destroy();
        this.tweens.add({ targets: title, alpha: 0, y: title.y - 18, duration: 260, ease: "Sine.easeOut", onComplete: () => title.destroy() });
    
        if (killCells.length > 0) {
          await this.playHeavenHellLootDropPattern(gameState, {
            source: "divineWrath",
            from: { x: heroX, y: heroY - 105 },
            jitterStrength: 16,
            filterCells: killCells,
            persistToGround: true
          });
        }
    
        this.time.delayedCall(1450, () => this.clearHeavenHellDivineGroundFx?.({ fade: true }));
      },

    async playHeavenHellDivineWrathAreaTelegraph(gameState = {}) {
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
        const ui = this._heavenHellMeterUi;
        const prevProgress = ui
          ? Number(ui.lastProgress) || 0
          : Math.max(0, Math.min(1, plan.startKills / plan.nextUnlock));
        this.renderHeavenHellKillMeterDisplay({
          displayKills: plan.startKills,
          nextUnlock: plan.nextUnlock,
          abilities: bonus?.abilities || {},
          prevProgress,
          allowRewardFx: false,
          skipUnlockBlink: true,
          skipMilestones: true
        });
      },

    tickHeavenHellKillMeterOnKill(reel, row, gameState = {}, { allowRewardFx = false } = {}) {
        const bonus = gameState?.heavenHell?.bonus;
        if (!bonus || gameState?.isBonus !== true) return;
        if (!this._heavenHellMeterRuntime) {
          this.prepareHeavenHellKillMeterForAction(gameState);
        }
        const runtime = this._heavenHellMeterRuntime;
        if (!runtime || runtime.killBudgetRemaining <= 0) return;
    
        const ui = this._heavenHellMeterUi;
        const prevProgress = ui
          ? Number(ui.lastProgress) || 0
          : Math.max(0, Math.min(1, runtime.displayKills / runtime.nextUnlock));
        const killWeight = this.getHeavenHellKillWeightForCell(reel, row, gameState);
        const appliedWeight = Math.min(killWeight, runtime.killBudgetRemaining);
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
          abilities: bonus?.abilities || {},
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

    getHeavenHellAbilitySlotPalette(abilityKey = "portal") {
        const palettes = {
          portal: { fill: 0x7B4DFF, glow: 0xD8B8FF, empty: 0x171126 },
          divineWrath: { fill: 0xD94A2B, glow: 0xFFB48A, empty: 0x24140F },
          divineCharge: { fill: 0x3FA8FF, glow: 0xB8E8FF, empty: 0x0F1A28 }
        };
        return palettes[abilityKey] || palettes.portal;
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

    createHeavenHellAbilitySlot(x, y, filled, abilityKey = "portal") {
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
          { key: "portal", label: "Portal", maxSlots: 2 },
          { key: "divineWrath", label: "Wrath", maxSlots: 1 },
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
          portal: Math.max(0, Math.floor(Number(abilities?.portal || 0))),
          divineWrath: Math.max(0, Math.floor(Number(abilities?.divineWrath || 0))),
          divineCharge: Math.max(0, Math.floor(Number(abilities?.divineCharge || 0)))
        };
        const levelsKey = `${levels.portal}:${levels.divineWrath}:${levels.divineCharge}`;
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

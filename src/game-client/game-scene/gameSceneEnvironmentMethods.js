export function createGameSceneEnvironmentMethods(deps = {}) {
  const {
    BACKGROUND_CLOUD_ATLAS_PAGE,
    BACKGROUND_CLOUD_SHEET_TEXTURE_KEY,
    BONUS_END_COIN_ANIM_FPS,
    BONUS_END_COIN_ATLAS_KEY,
    BONUS_END_COIN_FRAME_COUNT,
    BONUS_END_COIN_SPIN_ANIM_KEY,
    BONUS_FREESPIN_POWER_CIRCLE_TEXTURE_KEY,
    BONUS_FREESPIN_RING_SHEET_TEXTURE_KEY,
    BONUS_MYSTERY_FEATURE_ATLAS_KEY,
    BONUS_MYSTERY_FEATURE_INTENSE_TEXTURE_KEY,
    BONUS_MYSTERY_FEATURE_SYMBOL_ID,
    BONUS_MYSTERY_FEATURE_USE_ATLAS_ANIMATION,
    BONUS_WON_CRACKLING_ANIM_KEY,
    BONUS_WON_CRACKLING_ATLAS_TEXT_KEY,
    BONUS_WON_CRACKLING_SHEET_TEXTURE_KEY,
    DEPTH_HERO,
    GRID_OFFSET_X,
    GRID_OFFSET_Y,
    HERO_LIGHTNING_ATLAS_TEXT_KEY,
    HERO_LIGHTNING_SHEET_TEXTURE_KEY,
    HERO_STAGE_INTENSITY_TEXTURE_KEYS,
    HERO_STAGE_TEXTURE_KEYS,
    LIGHTNING_BEE_FEATURE_SYMBOL_ID,
    MERGE_GUN_FEATURE_INTENSE_TEXTURE_KEY,
    MERGE_GUN_FEATURE_SYMBOL_ID,
    Phaser,
    SCENE_BEHIND_SKY_TEXTURE_KEY,
    SCENE_SKY_TEXTURE_KEY,
    WIN_HIGHLIGHT_INTENSITY_TEXTURE_KEYS,
    clientConfig,
    getReelSymbolRenderable,
    parseSpineAtlasFrames
  } = deps;

  return {
    stopAngelMovementLightEmitter() {
        this.stopFollowSpriteLightEmitter("angelMovementLightEmitter");
      },

    startAngelMovementLightEmitter({
        tint = 0xFFD85C,
        intervalMs = 18,
        burstScale = 1
      } = {}) {
        if (!this.heroSprite || this.heroSprite.destroyed) return;
        return this.startFollowSpriteLightEmitter(this.heroSprite, {
          tint,
          intervalMs,
          burstScale,
          stateKey: "angelMovementLightEmitter",
          stopMethod: "stopAngelMovementLightEmitter"
        });
      },

    stopFollowSpriteLightEmitter(stateKey = "followSpriteLightEmitter") {
        const emitterState = this[stateKey];
        if (!emitterState) return;
        if (emitterState.timer) {
          emitterState.timer.remove(false);
        }
        this[stateKey] = null;
      },

    startFollowSpriteLightEmitter(
        followSprite,
        {
          tint = 0xFFD85C,
          intervalMs = 18,
          burstScale = 1,
          depth = DEPTH_HERO - 2,
          stateKey = "followSpriteLightEmitter",
          stopMethod = "stopFollowSpriteLightEmitter"
        } = {}
      ) {
        if (typeof this[stopMethod] === "function") {
          this[stopMethod](stateKey);
        } else {
          this.stopFollowSpriteLightEmitter(stateKey);
        }
        if (!followSprite || followSprite.destroyed) return null;

        const spawnParticle = () => {
          if (!followSprite || followSprite.destroyed) {
            if (typeof this[stopMethod] === "function") {
              this[stopMethod](stateKey);
            } else {
              this.stopFollowSpriteLightEmitter(stateKey);
            }
            return;
          }

          const particle = this.add.circle(
            Number(followSprite.x) + Phaser.Math.FloatBetween(-10, 10),
            Number(followSprite.y) + Phaser.Math.FloatBetween(-10, 10),
            Phaser.Math.FloatBetween(1.8, 4.2) * burstScale,
            tint,
            Phaser.Math.FloatBetween(0.45, 0.9)
          )
            .setDepth(depth)
            .setBlendMode(Phaser.BlendModes.ADD);

          this.tweens.add({
            targets: particle,
            x: particle.x + Phaser.Math.FloatBetween(-22, 22),
            y: particle.y + Phaser.Math.FloatBetween(-14, 14),
            scale: Phaser.Math.FloatBetween(0.3, 0.75),
            alpha: 0,
            duration: Phaser.Math.Between(110, 190),
            ease: "Sine.easeOut",
            onComplete: () => particle.destroy()
          });
        };

        spawnParticle();
        this[stateKey] = {
          timer: this.time.addEvent({
            delay: Math.max(8, Math.floor(Number(intervalMs) || 18)),
            loop: true,
            callback: spawnParticle
          })
        };
        return this[stateKey];
      },

    resetLightningCount() {
        this.lightningCount = 0;
        
        // Fade out second mist layer
        if (this.mistLayer2 && this.mist2FadedIn) {
          this.tweens.add({
            targets: this.mistLayer2,
            alpha: 0,
            duration: 1000,
            ease: 'Sine.easeIn'
          });
          this.mist2FadedIn = false;
        }
        
        // Reset storm flag (will be re-evaluated in updateStormVisuals)
        this.stormBegun = false;
        
        // Stop ambient lightning if not in bonus mode (bonus keeps it playing)
        if (!this.isInBonusMode) {
          this.stopAmbientLightning();
        }
        
        // Reset storm to calm
        if (this.updateStormVisuals) {
          this.updateStormVisuals();
        }
      },

    getLightningCount() {
        return this.lightningCount;
      },

    getStormIntensity() {
        return Math.min(30, this.lightningCount);
      },

    ensureBackgroundCloudFrames() {
        if (!this.textures?.exists?.(BACKGROUND_CLOUD_SHEET_TEXTURE_KEY)) {
          return {};
        }
    
        const texture = this.textures.get(BACKGROUND_CLOUD_SHEET_TEXTURE_KEY);
        if (!texture) return {};
    
        if (!this.backgroundCloudFrameKeys) {
          const wantedFrames = new Set([
            "normal/ValhallaCloud",
            "normal/bgCloud1",
            "normal/fgCloud4",
            "normal/movingCloud"
          ]);
          const atlasText = this.cache?.text?.get?.(BONUS_WON_CRACKLING_ATLAS_TEXT_KEY) || "";
          const frames = parseSpineAtlasFrames(atlasText, {
            pageName: BACKGROUND_CLOUD_ATLAS_PAGE
          }).filter((frame) => (
            wantedFrames.has(frame?.name) &&
            !frame.rotated &&
            frame?.bounds &&
            frame.bounds.width > 1 &&
            frame.bounds.height > 1
          ));
    
          this.backgroundCloudFrameKeys = {};
          frames.forEach((frame) => {
            const frameKey = `background_cloud_${frame.name.replace(/[^a-z0-9]+/gi, "_")}`;
            if (!texture.frames?.[frameKey]) {
              texture.add(
                frameKey,
                0,
                frame.bounds.x,
                frame.bounds.y,
                frame.bounds.width,
                frame.bounds.height
              );
            }
            this.backgroundCloudFrameKeys[frame.name] = frameKey;
          });
        }
    
        return this.backgroundCloudFrameKeys || {};
      },

    createSplitSkyBackdrop({
        centerX,
        bgAnchorX,
        bgAnchorY,
        bgTargetWidth,
        bgTargetHeight,
        bgBleedFactor,
        effectsHeight,
        bgDisplayWidth
      }) {
        if (Array.isArray(this.splitSkyBackdropLayers)) {
          this.splitSkyBackdropLayers.forEach((layer) => {
            if (layer && !layer.destroyed) {
              this.tweens?.killTweensOf?.(layer);
              layer.destroy();
            }
          });
        }
    
        const layers = [];
        const cloudLayers = [];
        const skyDisplayWidth = Math.max(1, Number(bgDisplayWidth) || bgTargetWidth * bgBleedFactor);
        const getLayerDisplayHeight = (textureKey) => {
          const source = this.textures?.get?.(textureKey)?.getSourceImage?.();
          const sourceWidth = Number(source?.width) || 0;
          const sourceHeight = Number(source?.height) || 0;
          if (sourceWidth > 0 && sourceHeight > 0) {
            return skyDisplayWidth * (sourceHeight / sourceWidth);
          }
          return Math.max(190, effectsHeight + 96);
        };
        const splitSkyDisplayHeight = Math.max(
          getLayerDisplayHeight(SCENE_BEHIND_SKY_TEXTURE_KEY),
          getLayerDisplayHeight(SCENE_SKY_TEXTURE_KEY)
        );
        this.splitSkyBackdropBounds = {
          x: bgAnchorX,
          y: bgAnchorY,
          width: skyDisplayWidth,
          height: splitSkyDisplayHeight
        };
    
        if (this.textures?.exists?.(SCENE_BEHIND_SKY_TEXTURE_KEY)) {
          const behindSkyDisplayHeight = getLayerDisplayHeight(SCENE_BEHIND_SKY_TEXTURE_KEY);
          this.behindSkyImage = this.add.image(bgAnchorX, bgAnchorY, SCENE_BEHIND_SKY_TEXTURE_KEY)
            .setOrigin(0, 0)
            .setDepth(-4)
            .setDisplaySize(skyDisplayWidth, behindSkyDisplayHeight);
          layers.push(this.behindSkyImage);
        } else {
          const fallbackSkyDisplayHeight = getLayerDisplayHeight(SCENE_SKY_TEXTURE_KEY);
          this.skyGapFill = this.add.rectangle(
            bgAnchorX + skyDisplayWidth / 2,
            bgAnchorY + fallbackSkyDisplayHeight / 2,
            skyDisplayWidth,
            fallbackSkyDisplayHeight,
            0x3799db
          )
            .setDepth(-4)
            .setAlpha(1);
          layers.push(this.skyGapFill);
        }
    
        if (this.textures?.exists?.(SCENE_SKY_TEXTURE_KEY)) {
          const skyDisplayHeight = getLayerDisplayHeight(SCENE_SKY_TEXTURE_KEY);
          this.skyImage = this.add.image(bgAnchorX, bgAnchorY, SCENE_SKY_TEXTURE_KEY)
            .setOrigin(0, 0)
            .setDepth(-3)
            .setDisplaySize(skyDisplayWidth, skyDisplayHeight);
          layers.push(this.skyImage);
        }
    
        const cloudFrameKeys = this.ensureBackgroundCloudFrames();
        const cloudSpecs = [
          {
            name: "normal/bgCloud1",
            offsetX: -365,
            y: bgAnchorY + 32,
            width: 64,
            alpha: 0.18,
            depth: -2.39,
            tint: 0xaed5ea,
            drift: 12,
            duration: 210000
          },
          {
            name: "normal/ValhallaCloud",
            offsetX: -210,
            y: bgAnchorY + 44,
            width: 88,
            alpha: 0.22,
            depth: -2.38,
            tint: 0xbfe4f5,
            drift: -16,
            duration: 178000
          },
          {
            name: "normal/bgCloud1",
            offsetX: 12,
            y: bgAnchorY + 30,
            width: 72,
            alpha: 0.16,
            depth: -2.37,
            tint: 0xa9d2e8,
            drift: 14,
            duration: 198000,
            flipX: true
          },
          {
            name: "normal/ValhallaCloud",
            offsetX: 230,
            y: bgAnchorY + 50,
            width: 96,
            alpha: 0.2,
            depth: -2.36,
            tint: 0xc6ebfa,
            drift: -18,
            duration: 184000
          },
          {
            name: "normal/bgCloud1",
            offsetX: 410,
            y: bgAnchorY + 42,
            width: 74,
            alpha: 0.15,
            depth: -2.35,
            tint: 0xaed7ec,
            drift: 11,
            duration: 224000,
            flipX: true
          },
          {
            name: "normal/fgCloud4",
            offsetX: -25,
            y: bgAnchorY + 66,
            width: 105,
            alpha: 0.25,
            depth: -2.31,
            tint: 0xc7eafa,
            drift: 46,
            duration: 84000
          },
          {
            name: "normal/bgCloud1",
            offsetX: 315,
            y: bgAnchorY + 74,
            width: 115,
            alpha: 0.24,
            depth: -2.3,
            tint: 0xbbdef1,
            drift: -38,
            duration: 92000,
            flipX: true
          },
          {
            name: "normal/movingCloud",
            offsetX: -120,
            y: bgAnchorY + 82,
            width: 140,
            alpha: 0.78,
            depth: -2.25,
            tint: 0xcfefff,
            drift: 170,
            duration: 26000
          },
          {
            name: "normal/movingCloud",
            offsetX: 145,
            y: bgAnchorY + 96,
            width: 110,
            alpha: 0.52,
            depth: -2.24,
            tint: 0xd9f3ff,
            drift: 130,
            duration: 34000,
            flipX: true
          }
        ];
    
        cloudSpecs.forEach((spec) => {
          const frameKey = cloudFrameKeys[spec.name];
          if (!frameKey) return;
    
          const cloud = this.add.image(
            centerX + spec.offsetX,
            spec.y,
            BACKGROUND_CLOUD_SHEET_TEXTURE_KEY,
            frameKey
          )
            .setOrigin(0.5)
            .setDepth(spec.depth)
            .setAlpha(spec.alpha);
    
          if (typeof cloud.setTintFill === "function") {
            cloud.setTintFill(spec.tint);
          } else {
            cloud.setTint(spec.tint);
          }
    
          if (spec.flipX) {
            cloud.setFlipX(true);
          }
    
          const frame = this.textures.getFrame(BACKGROUND_CLOUD_SHEET_TEXTURE_KEY, frameKey);
          const frameWidth = Number(frame?.width) || Number(cloud.width) || 1;
          const frameHeight = Number(frame?.height) || Number(cloud.height) || 1;
          const displayWidth = Math.min(skyDisplayWidth * 0.42, spec.width);
          cloud.setDisplaySize(displayWidth, displayWidth * (frameHeight / frameWidth));
          cloud.setData("baseTint", spec.tint);
          cloud.setData("baseAlpha", spec.alpha);
          layers.push(cloud);
          cloudLayers.push(cloud);
    
          this.tweens.add({
            targets: cloud,
            x: cloud.x + spec.drift,
            duration: spec.duration,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1
          });
        });
    
        this.splitSkyBackdropLayers = layers;
        this.splitSkyCloudLayers = cloudLayers;
      },

    initStormSky() {
        // ========== POSITIONING CONFIG (tweak these!) ==========
        const SKY_OFFSET_X = 0;           // Horizontal offset for sky
        const SKY_OFFSET_Y = 0;           // Vertical offset for sky
        const SKY_SCALE = 1.0;            // Scale multiplier for sky
        
        const FOREST_OFFSET_X = 0;        // Horizontal offset for forest
        const FOREST_OFFSET_Y = -20;      // Vertical offset for forest (positive = down)
        const FOREST_WIDTH = 620;         // Forest image width
        const FOREST_HEIGHT = 680;        // Forest image height
        
        const EFFECTS_HEIGHT = GRID_OFFSET_Y + 50;  // Storm effects area height
        // ========================================================
        
        const skyHeight = GRID_OFFSET_Y + FOREST_OFFSET_Y + 20;
        const skyWidth = clientConfig.area.width * 70 + 40;
        const centerX = GRID_OFFSET_X + skyWidth / 2 - 20;
        const centerY = skyHeight / 2;
        const sceneHeight = clientConfig.area.height * 70 + GRID_OFFSET_Y + 80;
        
        // === LAYER 0: Single scene background ===
        const bgTargetWidth = skyWidth * SKY_SCALE;
        const bgTargetHeight = sceneHeight;
        const bgBleedFactor = 1.04;
        const bgTexture = this.textures.get('main_background');
        const bgSource = bgTexture?.getSourceImage?.();
        const bgSourceWidth = Number(bgSource?.width) || 0;
        const bgSourceHeight = Number(bgSource?.height) || 0;
        const bgDisplayScale = bgSourceWidth > 0 && bgSourceHeight > 0
          ? Math.max(bgTargetWidth / bgSourceWidth, bgTargetHeight / bgSourceHeight) * bgBleedFactor
          : null;
        const bgDisplayWidth = bgDisplayScale
          ? bgSourceWidth * bgDisplayScale
          : bgTargetWidth * bgBleedFactor;
    
        // Keep background locked to a fixed anchor so scale/bleed doesn't shift its focus point.
        const bgAnchorX = centerX - bgTargetWidth / 2 + SKY_OFFSET_X - 300 + 20 + 20 + 20 + 20 - 25;
        const bgAnchorY = SKY_OFFSET_Y + 52;
        this.createSplitSkyBackdrop({
          centerX,
          bgAnchorX,
          bgAnchorY,
          bgTargetWidth,
          bgTargetHeight,
          bgBleedFactor,
          effectsHeight: EFFECTS_HEIGHT,
          bgDisplayWidth
        });
    
        this.mainBackground = this.add.image(
          bgAnchorX,
          bgAnchorY,
          'main_background'
        )
          .setOrigin(0, 0)
          .setDepth(0);
    
        if (bgDisplayScale) {
          this.mainBackground.setScale(bgDisplayScale);
        } else {
          // Fallback if texture metadata is unavailable at runtime.
          this.mainBackground.setDisplaySize(bgTargetWidth * bgBleedFactor, bgTargetHeight * bgBleedFactor);
        }
        if (!this.skyImage || this.skyImage.destroyed) {
          this.skyImage = this.mainBackground;
        }
        
        const skyFxBounds = this.splitSkyBackdropBounds || {
          x: centerX - skyWidth / 2,
          y: centerY - EFFECTS_HEIGHT / 2,
          width: skyWidth,
          height: EFFECTS_HEIGHT
        };
        const skyFxCenterX = skyFxBounds.x + skyFxBounds.width / 2;
        const skyFxCenterY = skyFxBounds.y + skyFxBounds.height / 2;
    
        // === Split-sky darkening overlay (behind land, over sky/clouds) ===
        this.skyBg = this.add.rectangle(skyFxCenterX, skyFxCenterY, skyFxBounds.width, skyFxBounds.height, 0x0a0a15)
          .setDepth(-2.15)
          .setAlpha(0); // Starts clear, darkens with storm
        
        // === Split-sky lightning glow layer (behind land, over sky/clouds) ===
        this.skyGlow = this.add.rectangle(skyFxCenterX, skyFxCenterY, skyFxBounds.width, skyFxBounds.height, 0x4488FF)
          .setDepth(-2.05)
          .setAlpha(0); // Hidden until lightning
        
        // === BONUS silhouette (behind clouds during storm tease, in front when won) ===
        this.bonusSilhouette = this.add.image(centerX, centerY, 'bonus_silhouette')
          .setDepth(2.3) // Behind mist/clouds initially
          .setScale(0.15)
          .setAlpha(0) // Hidden until storm lightning
          .setTint(0xFFFFFF) // White silhouette
          .setBlendMode(Phaser.BlendModes.ADD);
        
        this.distantCloud = null;
        this.mistLayer = null;
        this.mistLayer2 = null;
        
        // Single background mode: no extra foreground layer.
        this.forestLayer = null;
        
        // === START DRIFT ANIMATIONS ===
        this.startMistDriftAnimations(centerX);
        
        // Track if mists have faded in
        this.mist2FadedIn = false;
        this.stormBegun = false;
        
        // Start the storm loop
        this.stormLoopTimer = this.time.addEvent({
          delay: 1500,
          callback: this.updateStormLoop,
          callbackScope: this,
          loop: true
        });
      },

    startMistDriftAnimations(centerX) {
        const skyWidth = clientConfig.area.width * 70 + 100;
        
        // ========== WIND CONFIG (tweak these!) ==========
        // Base speeds (calm weather) - will speed up with storm intensity
        const DISTANT_CLOUD_SPEED = 60000; // Distant cloud - VERY slow (60s)
        const WIND_SPEED = 40000;          // Main mist speed - slow (40s)
        const WIND_SPEED_2 = 30000;        // Second mist speed (30s)
        const MIST_WIDTH = skyWidth * 1.2; // Make close mist wider than screen
        // ================================================
        
        // Store base speeds for dynamic intensity adjustment
        this.baseWindSpeeds = {
          distant: DISTANT_CLOUD_SPEED,
          main: WIND_SPEED,
          close: WIND_SPEED_2
        };
        
        // Initialize wind multiplier (1.0 = calm, 0.5 = stormy/fast)
        this.currentWindMultiplier = 1.0;
        
        // === DISTANT CLOUD (no stretch, very slow) ===
        if (this.distantCloud) {
          const cloudWidth = this.distantCloud.displayWidth;
          
          // Create clone for seamless loop
          this.distantCloudClone = this.add.image(centerX, this.distantCloud.y, 'mist')
            .setDepth(2.5)
            .setAlpha(this.distantCloud.alpha)
            .setDisplaySize(cloudWidth, this.distantCloud.displayHeight)
            .setTint(0xAABBCC);
          
          // Position side by side
          this.distantCloud.x = centerX;
          this.distantCloudClone.x = centerX + cloudWidth;
          
          // Very slow drift animation - uses dynamic wind multiplier
          const animateDistantCloud = () => {
            this.distantCloud.x = centerX;
            this.distantCloudClone.x = centerX + cloudWidth;
            
            const speed = this.baseWindSpeeds.distant * this.currentWindMultiplier;
            this.tweens.add({
              targets: [this.distantCloud, this.distantCloudClone],
              x: `-=${cloudWidth}`,
              duration: speed,
              ease: 'Linear',
              onComplete: animateDistantCloud
            });
          };
          animateDistantCloud();
        }
        
        // === MAIN MIST (stretched, medium speed) ===
        if (this.mistLayer) {
          this.mistLayer.setDisplaySize(MIST_WIDTH, this.mistLayer.displayHeight);
          
          this.mistLayerClone = this.add.image(centerX, this.mistLayer.y, 'mist')
            .setDepth(3)
            .setAlpha(this.mistLayer.alpha)
            .setDisplaySize(MIST_WIDTH, this.mistLayer.displayHeight)
            .setTint(0x8899AA);
          
          this.mistLayer.x = centerX;
          this.mistLayerClone.x = centerX + MIST_WIDTH;
          
          // Dynamic wind speed
          const animateMistLoop = () => {
            this.mistLayer.x = centerX;
            this.mistLayerClone.x = centerX + MIST_WIDTH;
            
            const speed = this.baseWindSpeeds.main * this.currentWindMultiplier;
            this.tweens.add({
              targets: [this.mistLayer, this.mistLayerClone],
              x: `-=${MIST_WIDTH}`,
              duration: speed,
              ease: 'Linear',
              onComplete: animateMistLoop
            });
          };
          animateMistLoop();
        }
        
        // === MIST LAYER 2 (stretched, closest/fastest) ===
        if (this.mistLayer2) {
          this.mistLayer2.setDisplaySize(MIST_WIDTH, this.mistLayer2.displayHeight);
          
          this.mistLayer2Clone = this.add.image(centerX, this.mistLayer2.y, 'mist')
            .setDepth(3)
            .setAlpha(0)
            .setDisplaySize(MIST_WIDTH, this.mistLayer2.displayHeight)
            .setTint(0x667788)
            .setFlipX(true);
          
          this.mistLayer2.x = centerX;
          this.mistLayer2Clone.x = centerX + MIST_WIDTH;
          
          // Dynamic wind speed
          const animateMist2Loop = () => {
            this.mistLayer2.x = centerX;
            this.mistLayer2Clone.x = centerX + MIST_WIDTH;
            
            const speed = this.baseWindSpeeds.close * this.currentWindMultiplier;
            this.tweens.add({
              targets: [this.mistLayer2, this.mistLayer2Clone],
              x: `-=${MIST_WIDTH}`,
              duration: speed,
              ease: 'Linear',
              onComplete: animateMist2Loop
            });
          };
          animateMist2Loop();
        }
      },

    updateStormLoop() {
        const intensity = this.getStormIntensity();
        // Faster progression: reaches max at 10, not 30
        const normalizedIntensity = Math.min(1, intensity / 10);
        
        // === Update sky darkness (gets darker as storm builds) ===
        if (this.skyBg) {
          const darkness = normalizedIntensity * 0.3; // 0 to 0.3 (subtle darkening, sky still visible)
          this.skyBg.setAlpha(darkness);
        }
        
        // === Update wind speed (wind picks up as storm builds) ===
        // At max intensity, wind is 2x faster
        this.currentWindMultiplier = 1 - (normalizedIntensity * 0.5); // 1.0 -> 0.5 (faster)
        
        // === Update distant cloud (subtle darkening with storm) ===
        if (this.distantCloud) {
          const r = Math.floor(170 - normalizedIntensity * 30); // 170 -> 140 (less darkening)
          const g = Math.floor(187 - normalizedIntensity * 40); // 187 -> 147
          const b = Math.floor(204 - normalizedIntensity * 30); // 204 -> 174
          const tint = Phaser.Display.Color.GetColor(r, g, b);
          const alpha = 0.1 + normalizedIntensity * 0.15; // 0.1 -> 0.25 (reduced)
          
          this.distantCloud.setTint(tint).setAlpha(alpha);
          if (this.distantCloudClone) {
            this.distantCloudClone.setTint(tint).setAlpha(alpha);
          }
        }
        
        // === Update main mist layer + clone (gets darker and more visible) ===
        if (this.mistLayer) {
          const r = Math.floor(120 - normalizedIntensity * 40); // 120 -> 80 (less extreme)
          const g = Math.floor(140 - normalizedIntensity * 50); // 140 -> 90
          const b = Math.floor(160 - normalizedIntensity * 40); // 160 -> 120
          const tint = Phaser.Display.Color.GetColor(r, g, b);
          const alpha = 0.2 + normalizedIntensity * 0.25; // 0.2 -> 0.45 (reduced from 0.4->0.8)
          
          this.mistLayer.setTint(tint).setAlpha(alpha);
          if (this.mistLayerClone) {
            this.mistLayerClone.setTint(tint).setAlpha(alpha);
          }
        }
        
        // === FADE IN MIST 2 at intensity 4+ (two clouds) ===
        if (intensity >= 4 && !this.mist2FadedIn && this.mistLayer2) {
          this.mist2FadedIn = true;
          
          // Fade in both mist2 and its clone
          const targets = [this.mistLayer2];
          if (this.mistLayer2Clone) targets.push(this.mistLayer2Clone);
          
          this.tweens.add({
            targets: targets,
            alpha: 0.3, // Reduced from 0.5
            duration: 1000,
            ease: 'Sine.easeOut'
          });
        }
        
        // Update mist2 + clone darkness if visible
        if (this.mistLayer2 && this.mist2FadedIn) {
          const tintIntensity = Math.min(1, intensity / 10);
          const r = Math.floor(85 - tintIntensity * 50);
          const g = Math.floor(102 - tintIntensity * 70);
          const b = Math.floor(119 - tintIntensity * 50);
          const tint = Phaser.Display.Color.GetColor(r, g, b);
          
          this.mistLayer2.setTint(tint);
          if (this.mistLayer2Clone) {
            this.mistLayer2Clone.setTint(tint);
          }
        }
        
        // === STORM HAS BEGUN at intensity 5 (ambient lightning starts)! ===
        if (intensity >= 5 && !this.stormBegun) {
          this.stormBegun = true;
          
          // Start ambient lightning loops when storm begins
          this.startAmbientLightning();
          
          // Start periodic intensity check for dynamic silence
          this.startAmbientLightningIntensityCheck();
        }
        
        // === STORM INTENSIFIES at intensity 10! ===
        if (intensity >= 10) {
          // Big flash to announce the storm peak
          if (this.skyGlow) {
            this.skyGlow.setAlpha(0.8);
            this.tweens.add({
              targets: this.skyGlow,
              alpha: 0,
              duration: 300,
              ease: 'Quad.easeIn'
            });
          }
          
          // Create multiple lightning bolts
          this.createSkyLightning();
          this.time.delayedCall(100, () => this.createSkyLightning());
          this.time.delayedCall(200, () => this.createSkyLightning());
        }
        
        // === Random sky lightning based on intensity ===
        // Faster chance buildup: 0% at 0, 50% at 5, 100% at 10+
        const lightningChance = Math.min(100, intensity * 10);
        
        if (Math.random() * 100 < lightningChance) {
          this.createSkyLightning();
        }
        
        // At storm level (10+), frequent double/triple lightning
        if (intensity >= 10 && Math.random() * 100 < 40) {
          this.time.delayedCall(100 + Math.random() * 150, () => {
            this.createSkyLightning();
          });
        }
      },

    createSkyLightning() {
        // Track storm lightning count for BONUS silhouette
        if (!this.stormLightningCount) this.stormLightningCount = 0;
        if (this.stormBegun) this.stormLightningCount++;
        
        const fallbackSkyWidth = clientConfig.area.width * 70;
        const skyBounds = this.splitSkyBackdropBounds || {
          x: GRID_OFFSET_X,
          y: 0,
          width: fallbackSkyWidth,
          height: GRID_OFFSET_Y
        };
        const skyMinX = skyBounds.x + 10;
        const skyMaxX = skyBounds.x + skyBounds.width - 10;
        
        // Random position in sky
        const startX = Phaser.Math.Between(skyMinX, skyMaxX);
        const startY = skyBounds.y + Phaser.Math.Between(3, Math.max(4, Math.floor(skyBounds.height * 0.18)));
        const endY = skyBounds.y + skyBounds.height - Phaser.Math.Between(8, 22);
        
        // === FLASH THE GLOW LAYER (illuminates clouds from behind) ===
        if (this.skyGlow) {
          // Golden glow after bonus, blue otherwise
          const glowTint = this.stormLightningGolden ? 0xFFAA44 : 0x4488FF;
          this.skyGlow.setFillStyle(glowTint);
          this.skyGlow.setAlpha(0.5 + Math.random() * 0.3);
          this.tweens.add({
            targets: this.skyGlow,
            alpha: 0,
            duration: 120,
            ease: 'Quad.easeIn'
          });
        }
        
        // === FLASH BONUS SILHOUETTE ===
        if (this.bonusSilhouette && !this.bonusSilhouette.destroyed) {
          if (this.bonusPermanentlyVisible) {
            // Bonus is permanent - just flash even brighter with lightning
            this.tweens.killTweensOf(this.bonusSilhouette);
            this.bonusSilhouette.setAlpha(1.2); // Brief overexpose
            this.tweens.add({
              targets: this.bonusSilhouette,
              alpha: 1, // Return to full visible
              duration: 150,
              ease: 'Quad.easeIn'
            });
          } else if (this.stormBegun && !this.isInBonusMode) {
            // Only show on every 10th storm lightning strike (tease) - NOT during bonus
            if (this.stormLightningCount > 0 && this.stormLightningCount % 10 === 0) {
              this.tweens.killTweensOf(this.bonusSilhouette);
              this.bonusSilhouette.setAlpha(0.6);
              this.tweens.add({
                targets: this.bonusSilhouette,
                alpha: 0,
                duration: 1200,
                delay: 200,
                ease: 'Sine.easeIn'
              });
            }
          }
        }
        
        // === FLASH SPLIT-SKY CLOUDS (brief brightening) ===
        const flashSkyCloud = (cloud) => {
          if (!cloud || cloud.destroyed || cloud.alpha < 0.05) return;
          const baseTint = cloud.getData?.("baseTint") ?? 0xcfefff;
          const baseAlpha = cloud.getData?.("baseAlpha") ?? cloud.alpha;
          if (typeof cloud.setTintFill === "function") {
            cloud.setTintFill(0xf4fbff);
          } else {
            cloud.setTint(0xf4fbff);
          }
          cloud.setAlpha(Math.min(1, baseAlpha + 0.18));
          this.time.delayedCall(60, () => {
            if (!cloud || cloud.destroyed) return;
            if (typeof cloud.setTintFill === "function") {
              cloud.setTintFill(baseTint);
            } else {
              cloud.setTint(baseTint);
            }
            cloud.setAlpha(baseAlpha);
          });
        };
        
        (this.splitSkyCloudLayers || []).forEach(flashSkyCloud);
        
        // === Create jagged lightning path ===
        const points = [];
        const segments = 5 + Math.floor(Math.random() * 4);
        const segmentHeight = (endY - startY) / segments;
        let currentX = startX;
        
        points.push({ x: currentX, y: startY });
        for (let s = 1; s < segments; s++) {
          currentX = Phaser.Math.Clamp(currentX + (Math.random() - 0.5) * 44, skyMinX, skyMaxX);
          points.push({ x: currentX, y: startY + s * segmentHeight });
        }
        points.push({
          x: Phaser.Math.Clamp(currentX + (Math.random() - 0.5) * 22, skyMinX, skyMaxX),
          y: endY
        });
        
        // === Draw lightning bolt in the split sky layer, behind the land/background ===
        const bolt = this.add.graphics()
          .setDepth(-1.95)
          .setBlendMode(Phaser.BlendModes.ADD);
        
        // Colors: Golden after bonus, blue otherwise
        const glowColor = this.stormLightningGolden ? 0xDD8800 : 0x2266DD;
        const coreColor = this.stormLightningGolden ? 0xFFDD44 : 0x88CCFF;
        
        // Play ambient lightning sound during bonus mode for dramatic effect
        if (this.stormLightningGolden && Math.random() < 0.1) { // 10% chance for variety
          const randomAmbient = `lightning_amb${Math.floor(Math.random() * 3) + 1}`;
          this.playSfx(randomAmbient, { volume: 0.4 });
        }
        
        // Outer glow
        bolt.lineStyle(5, glowColor, 0.5);
        bolt.beginPath();
        bolt.moveTo(points[0].x, points[0].y);
        for (let p = 1; p < points.length; p++) {
          bolt.lineTo(points[p].x, points[p].y);
        }
        bolt.strokePath();
        
        // Core
        bolt.lineStyle(2, coreColor, 1);
        bolt.beginPath();
        bolt.moveTo(points[0].x, points[0].y);
        for (let p = 1; p < points.length; p++) {
          bolt.lineTo(points[p].x, points[p].y);
        }
        bolt.strokePath();
        
        // Quick fade out
        this.tweens.add({
          targets: bolt,
          alpha: 0,
          duration: 100 + Math.random() * 80,
          delay: 30,
          ease: 'Quad.easeIn',
          onComplete: () => bolt.destroy()
        });
      },

    updateStormVisuals() {
        this.updateStormLoop();
      },

    getMysteryTexture(stepType) {
        const mysteryId = clientConfig.symbolsMapping?.mystery || 14;
        
        // If hero has mysteryWild step, use special wild indicator texture
        if (stepType === 'mysteryWild') {
          return '14_mysteryWildStep';
        }
        
        // Otherwise use regular mystery texture
        return String(mysteryId);
      },

    preload() {
        this.load.bitmapFont("uiBitmap", "assets/fonts/bitmap/gothic.png", "assets/fonts/bitmap/gothic.xml");
        this.load.image("1", "assets/helldive/symbols/1.png");
        this.load.image("2", "assets/helldive/symbols/2.png");
        this.load.image("3", "assets/helldive/symbols/3.png");
        this.load.image("4", "assets/helldive/symbols/4.png");
        this.load.image("5", "assets/helldive/symbols/5.png");
        this.load.image("6", "assets/helldive/symbols/6.png");
        this.load.image("7", "assets/helldive/symbols/7.png");
        for (let symbolId = 1; symbolId <= 7; symbolId++) {
          this.load.image(`${symbolId}_orb`, `assets/helldive/symbols/${symbolId}_orb.png`);
          const orbIntensityFileName = symbolId === 5
            ? "5_orbintensity.png"
            : `${symbolId}_orb_intensity.png`;
          this.load.image(`${symbolId}_orb_intensity`, `assets/helldive/symbols/${orbIntensityFileName}`);
        }
        Object.entries(WIN_HIGHLIGHT_INTENSITY_TEXTURE_KEYS).forEach(([symbolId, textureKey]) => {
          this.load.image(textureKey, `assets/helldive/symbols/${symbolId}_intensity.png`);
        });
        this.load.image("8", "assets/helldive/symbols/8.png");
        this.load.image("11", "assets/helldive/characters/demon_imp.png");
        this.load.image("12", "assets/helldive/characters/demon_brute.png");
        this.load.image("13", "assets/helldive/characters/demon_boss_3x3.png");
        this.load.image("21", "assets/helldive/characters/demon_gargyole.png");
        this.load.image(String(BONUS_MYSTERY_FEATURE_SYMBOL_ID), "assets/symbols/mystery.png");
        this.load.image(String(MERGE_GUN_FEATURE_SYMBOL_ID), "assets/symbols/gun.png");
        this.load.image(String(LIGHTNING_BEE_FEATURE_SYMBOL_ID), "assets/symbols/bumblebee.png");
        this.load.image(BONUS_MYSTERY_FEATURE_INTENSE_TEXTURE_KEY, "assets/symbols/mystery_intense.png");
        this.load.image(MERGE_GUN_FEATURE_INTENSE_TEXTURE_KEY, "assets/symbols/gun_intense.png");
        if (BONUS_MYSTERY_FEATURE_USE_ATLAS_ANIMATION) {
          this.load.atlas(
            BONUS_MYSTERY_FEATURE_ATLAS_KEY,
            "assets/symbols/mystery_feature/minor.png",
            "assets/symbols/mystery_feature/minor.json"
          );
        }
        this.load.atlas(
          BONUS_END_COIN_ATLAS_KEY,
          "assets/12bolts/coin.webp",
          "assets/12bolts/coin.json"
        );
        this.load.image(BONUS_WON_CRACKLING_SHEET_TEXTURE_KEY, "assets/12bolts/frameAndBackground.webp");
        this.load.text(BONUS_WON_CRACKLING_ATLAS_TEXT_KEY, "assets/12bolts/frameAndBackground.atlas");
        this.load.image(BACKGROUND_CLOUD_SHEET_TEXTURE_KEY, "assets/12bolts/frameAndBackground_3.webp");
        this.load.image(BONUS_FREESPIN_RING_SHEET_TEXTURE_KEY, "assets/12bolts/frameAndBackground_4.webp");
        this.load.image(BONUS_FREESPIN_POWER_CIRCLE_TEXTURE_KEY, "assets/powercircle.png");
        this.load.image("blue_ballon", "assets/symbols/mystery_feature/ballons/blue_ballon.png");
        this.load.image("green_ballon", "assets/symbols/mystery_feature/ballons/green_ballon.png");
        this.load.image("yellow_ballon", "assets/symbols/mystery_feature/ballons/yellow_ballon.png");
        this.load.image("purple_ballon", "assets/symbols/mystery_feature/ballons/purple_ballon.png");
        this.load.image("orange_ballon", "assets/symbols/mystery_feature/ballons/orange_ballon.png");
        this.load.image("red_ballon", "assets/symbols/mystery_feature/ballons/red_ballon.png");
        this.load.image("banana_empty", "assets/symbols/empty_banana.png");
        this.load.image("banana_filled", "assets/symbols/filled_banana.png");
        this.load.image("banana_transparent", "assets/symbols/banana_transparent.png");
        this.load.image("16", "assets/symbols/barrel_tnt_heavy.png"); // Time symbol (exploding barrel)
        this.load.image("17", "assets/time.png"); // Depleted time symbol state
    
        this.load.image('mist', 'assets/mist2.png');
        this.load.image(SCENE_BEHIND_SKY_TEXTURE_KEY, 'assets/behind_sky.png');
        this.load.image(SCENE_SKY_TEXTURE_KEY, 'assets/sky.png');
        this.load.image('main_background', 'assets/helldive/backgrounds/heaven_city.png');
        this.load.image('helldive_heaven_bg', 'assets/helldive/backgrounds/heaven_city.png');
        this.load.image('helldive_hell_bonus_bg', 'assets/helldive/backgrounds/hell_bonus_floor.png');
        this.load.image('helldive_hell_wave_tile', 'assets/helldive/effects/hell_wave_tile.png');
        this.load.image('helldive_divine_wave_tile', 'assets/helldive/effects/divine_wave_tile.png');
        this.load.image('helldive_divine_ground', 'assets/helldive/effects/divine_ground.png');
        this.load.image('helldive_divine_wrath_beam', 'assets/helldive/effects/divine_wrath_beam.png');
        this.load.image('helldive_demon_death_spatter', 'assets/helldive/effects/demon_death_spatter.png');
        this.load.image('helldive_divine_strike_slash', 'assets/helldive/effects/divine_strike_slash.png');
        this.load.image('helldive_loot_land_glow', 'assets/helldive/effects/loot_land_glow.png');
        this.load.image('helldive_portal_red', 'assets/helldive/effects/portal_red.png');
        this.load.image('helldive_angel_trail', 'assets/helldive/effects/angel_trail.png');
        this.load.image('helldive_demon_splash', 'assets/helldive/effects/demon_splash.png');
        this.load.image('helldive_loot_coin', 'assets/helldive/loot/coin.png');
        this.load.image('helldive_loot_ruby', 'assets/helldive/loot/ruby.png');
        this.load.image('helldive_loot_sapphire', 'assets/helldive/loot/sapphire.png');
        this.load.image('helldive_loot_emerald', 'assets/helldive/loot/emerald.png');
        this.load.image('helldive_loot_diamond', 'assets/helldive/loot/diamond.png');
        this.load.image('helldive_loot_amethyst', 'assets/helldive/loot/amethyst.png');
        this.load.image('bonus_silhouette', 'assets/bonus.png'); // BONUS text for storm silhouette
        this.load.image('bonus_chest', 'assets/chest.png'); // Golden chest for bonus
        this.load.image('helldive_chest_wooden', 'assets/chest_wooden.png');
        this.load.image('helldive_chest_divine', 'assets/chest_divine.png');
    
        // Combat sounds
        this.load.audio('banana_hit_1', 'assets/sounds/banana_attacked1.mp3');
        this.load.audio('banana_hit_2', 'assets/sounds/banana_attacked2.mp3');
        this.load.audio('banana_hit_3', 'assets/sounds/banana_attacked3.mp3');
        this.load.audio('banana_hit_4', 'assets/sounds/banana_attacked4.mp3');
        this.load.audio('attack_swing', 'assets/sounds/attack_swing_any.mp3');
        this.load.audio('attack_swing_axe', 'assets/sounds/attack_swing_axe.mp3');
        this.load.audio('finisher_axe', 'assets/sounds/finisher_axe.mp3');
        this.load.audio('finisher_sword', 'assets/sounds/finisher_sword.mp3');
        this.load.audio('finisher_staff', 'assets/sounds/finisher_staff.mp3');
        
        // Lightning sounds
        this.load.audio('lightning_thor', 'assets/sounds/lightning_thor.mp3');
        this.load.audio('lightning_thor_impact', 'assets/sounds/lightning_thor_impact.mp3');
        this.load.audio('lightning_hammer', 'assets/sounds/lightning_hammer.mp3');
        this.load.audio('lightning_amb1', 'assets/sounds/lightning_amb1.mp3');
        this.load.audio('lightning_amb2', 'assets/sounds/lightning_amb2.mp3');
        this.load.audio('lightning_amb3', 'assets/sounds/lightning_amb3.mp3');
        
        // Mystery reveal sounds
        this.load.audio('mystery_reveal', 'assets/sounds/mystery_reveal.mp3');
        this.load.audio('mystery_reveal_succession', 'assets/sounds/mystery_reveal_succession.opus');
        
        // Win sounds
        this.load.audio('wins_highlight', 'assets/sounds/wins_highlight.opus');
        this.load.audio('wins_explode', 'assets/sounds/wins_explode.opus');
        this.load.audio('wins_payout', 'assets/sounds/wins_payout.opus');
        this.load.audio('bonus_won_stinger', 'assets/sounds/Thunderkong/bonuswon.mp3');
        this.load.audio('lightning_at_lvl_up', 'assets/sounds/Thunderkong/lightning_at_lvl_up.mp3');
        this.load.audio('ballon_won_celebration', 'assets/sounds/Thunderkong/ballon_won_celebration.mp3');
        this.load.audio('symbol_clear_addition', 'assets/sounds/Thunderkong/symbol_clear_addition.mp3');
        this.load.audio('bananacollect', 'assets/sounds/Thunderkong/bananacollect.mp3');
        this.load.audio('freespin_smash_activated', 'assets/sounds/akhet/toa_scarabwildactivated.opus');
        this.load.audio('freespin_smash_prepulse', 'assets/sounds/akhet/toa_scarabwildprepulse.opus');
        this.load.audio('freespin_smash_second', 'assets/sounds/akhet/toa_scarabwildsecond.opus');
        this.load.audio('freespin_smash_symbol_explosion_1', 'assets/sounds/akhet/toa_scarabwildsymbolexplosion1.opus');
        this.load.audio('freespin_smash_symbol_explosion_2', 'assets/sounds/akhet/toa_scarabwildsymbolexplosion2.opus');
        this.load.audio('freespin_smash_symbol_explosion_3', 'assets/sounds/akhet/toa_scarabwildsymbolexplosion3.opus');
        this.load.audio('freespin_orb_start', 'assets/sounds/battlepath/orb_start.mp3');
        this.load.audio('freespin_orb_appear', 'assets/sounds/battlepath/orb_appear.opus');
        for (let index = 1; index <= 5; index++) {
          this.load.audio(`freespin_essence_${index}`, `assets/sounds/battlepath/essence${index}.opus`);
        }
        this.load.audio('coin1', 'assets/sounds/coins/coin1.mp3');
        this.load.audio('coin2', 'assets/sounds/coins/coin2.mp3');
        this.load.audio('coin3', 'assets/sounds/coins/coin3.mp3');
        this.load.audio('coin4', 'assets/sounds/coins/coin4.mp3');
        this.load.audio('coin5', 'assets/sounds/coins/coin5.mp3');
        this.load.audio('coin6', 'assets/sounds/coins/coin6.mp3');
        this.load.audio('gold_drop', 'assets/sounds/gold_drop.mp3');
        this.load.audio('symbolWave', 'assets/sounds/helldive/symbolWave.mp3');
        
        // Action sounds
        this.load.audio('action_spin_click', 'assets/sounds/action_spin_click.opus');
        this.load.audio('orb_collect', 'assets/sounds/orb_collect.opus');
        
        // Necromancer banana spawn sounds
        this.load.audio('banana_spawn', 'assets/sounds/banana_spawn.mp3');
        this.load.audio('banana_spawn_time', 'assets/sounds/banana_spawn_time.mp3');
        
        // Troll sounds
        this.load.audio('troll_before_entrance', 'assets/sounds/troll_before_entrance.mp3');
        this.load.audio('troll_dies', 'assets/sounds/troll_dies.mp3');
        this.load.audio('troll_trees_crack', 'assets/sounds/troll_trees_crack.mp3');
        this.load.audio('troll_rushing_growl', 'assets/sounds/troll_rushing_growl.mp3');
        
        // Symbol landing sounds
        this.load.audio('land1', 'assets/sounds/land1.opus');
        this.load.audio('land2', 'assets/sounds/land2.opus');
        this.load.audio('land3', 'assets/sounds/land3.opus');
        this.load.audio('land4', 'assets/sounds/land4.opus');
        this.load.audio('land5', 'assets/sounds/land5.opus');
        
        // Music tracks
        this.load.audio('theme_main', 'assets/sounds/Thunderkong/main.mp3');
        this.load.audio('theme_bonus', 'assets/sounds/Thunderkong/bonus.mp3');
        this.load.audio('merge_gun_laser_loop', 'assets/sounds/Thunderkong/laser-loop.mp3');
        
        // Wheel diamond sounds
        this.load.audio('wheel_diamond_appear', 'assets/sounds/wheel_diamond_appear.opus');
        this.load.audio('wheel_diamond_confirms', 'assets/sounds/wheel_diamond_confirms.opus');
        this.load.image('multipliers', 'assets/multipliers.png');
        this.load.image('multipliers_stones', 'assets/multipliers_stones.png');
        this.load.image('multipliers_chests', 'assets/multipliers_chests.png');
        
        // Load monkey stage art.
        this.load.image(HERO_STAGE_TEXTURE_KEYS.base, 'assets/helldive/characters/female_angel.png');
        this.load.image(HERO_STAGE_TEXTURE_KEYS.rush, 'assets/helldive/characters/female_angel_rush.png');
        this.load.image(HERO_STAGE_TEXTURE_KEYS.giant2, 'assets/helldive/characters/female_angel_giant2.png');
        this.load.image(HERO_STAGE_TEXTURE_KEYS.giant3, 'assets/helldive/characters/female_angel_giant3.png');
        this.load.image(HERO_STAGE_INTENSITY_TEXTURE_KEYS[HERO_STAGE_TEXTURE_KEYS.base], 'assets/helldive/characters/female_angel_intensity.png');
        this.load.image(HERO_STAGE_INTENSITY_TEXTURE_KEYS[HERO_STAGE_TEXTURE_KEYS.rush], 'assets/helldive/characters/female_angel_rush_intensity.png');
        this.load.image(HERO_STAGE_INTENSITY_TEXTURE_KEYS[HERO_STAGE_TEXTURE_KEYS.giant2], 'assets/helldive/characters/female_angel_giant2_intensity.png');
        this.load.image(HERO_STAGE_INTENSITY_TEXTURE_KEYS[HERO_STAGE_TEXTURE_KEYS.giant3], 'assets/helldive/characters/female_angel_giant3_intensity.png');
        this.load.image('hero', 'assets/hero.png'); // Legacy fallback.
        this.load.image(HERO_LIGHTNING_SHEET_TEXTURE_KEY, 'assets/atlas/lightning.webp');
        this.load.text(HERO_LIGHTNING_ATLAS_TEXT_KEY, 'assets/atlas/lightning.atlas');
        
    
    
    
      },

    create() {
    
        this._autoMuted = false;   // track if we muted due to blur
      this._volTween = null;
      this._masterTarget = 1;    // or your saved player volume
    
      const fadeTo = (v, ms, ease = 'Sine.Out') => {
        if (this._volTween) this._volTween.stop();
        this._volTween = this.tweens.add({
          targets: this.sound,
          volume: v,
          duration: ms,
          ease,
          onComplete: () => { this._volTween = null; }
        });
      };
    
      const onBlur = () => {
        // Only auto-mute if currently not user-muted
        if (!this.isMuted()) {
          this._autoMuted = true;
          this.setMuted(true);     // mute master
        }
        // (optional) suspend context to prevent any queued audio
        const ctx = this.sound.context;
        if (ctx && ctx.state !== 'suspended') ctx.suspend().catch(()=>{});
      };
    
      const onFocus = async () => {
        // If user muted manually, leave it muted
        if (!this._autoMuted) return;
    
        // Resume context before unmuting
        const ctx = this.sound.context;
        if (ctx && ctx.state === 'suspended') {
          try { await ctx.resume(); } catch {}
        }
    
        // Clear auto-muted and fade in (don’t call toggleMute—setMuted directly)
        this._autoMuted = false;
        this.sound.volume = 0;
        this.setMuted(false);      // unmute master
        fadeTo(this._masterTarget, 1500); // smooth fade-in
      };
    
      // Focus/blur hooks
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);
      this.initializeSoundVolumeTool();
      this._onSceneResizeLayout = () => this.emitLayoutContentBounds();
      this.scale?.on("resize", this._onSceneResizeLayout);
    
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focus', onFocus);
        if (this._onSceneResizeLayout) {
          this.scale?.off("resize", this._onSceneResizeLayout);
          this._onSceneResizeLayout = null;
        }
        if (this._volTween) this._volTween.stop();
        if (this.unsubscribeLayout) {
          this.unsubscribeLayout();
          this.unsubscribeLayout = null;
        }
        if (this.unsubscribeLayoutDebugVisibility) {
          this.unsubscribeLayoutDebugVisibility();
          this.unsubscribeLayoutDebugVisibility = null;
        }
        if (this.mustSeeDebugGraphics && !this.mustSeeDebugGraphics.destroyed) {
          this.mustSeeDebugGraphics.destroy();
        }
        this.mustSeeDebugGraphics = null;
        if (this._fastForwardTimer) {
          clearTimeout(this._fastForwardTimer);
          this._fastForwardTimer = null;
        }
        if (this._symbolBackdropSyncHandler) {
          this.events.off('postupdate', this._symbolBackdropSyncHandler);
          this._symbolBackdropSyncHandler = null;
        }
        this.destroySoundVolumeTool();
        this.uninstallHeroPreviewConsoleCommands();
        this.cleanupSymbolBackdrops();
      });
    
    
        //this.symbolsGroup = this.add.group(); // to track all dropped symbols
    
         this.reelSprites = []; // <-- new: 2D array to track symbol sprites
    
          const reels = {}; // or wherever your starting symbols come from
    
          for (let reelIndex = 0; reelIndex < reels.length; reelIndex++) {
            const reel = reels[reelIndex];
            this.reelSprites[reelIndex] = [];
    
            for (let row = 0; row < reel.length; row++) {
              const symbolKey = reel[row];
    
              const sprite = this.addSymbolSprite(symbolKey, reelIndex, row);
    
              this.reelSprites[reelIndex][row] = sprite; // 🔐 track by position
             // this.symbolsGroup.add(sprite);             // (optional) still add to group
            }
          }
    
        //100 empty symbol
        this.textures.createCanvas('0', 70, 70).context.clearRect(0, 0, 70, 70);
        this.textures.get('0').refresh();
        this.ensureHeroLightningAuraFrames();
        this.ensureBonusEndCoinSpinAnimation();
        this.ensureBonusWonCracklingLightningAnimation();
        if (this._heroLightningAuraWatcher) {
          this.events.off('postupdate', this._heroLightningAuraWatcher);
        }
        this._heroLightningAuraWatcher = () => this.updateHeroLightningAura();
        this.events.on('postupdate', this._heroLightningAuraWatcher);
        this.installHeroPreviewConsoleCommands();
    
        this.installSoftPause()
        this.createOrUpdateBoardShadowOverlay();
        
        // Initialize multiplier
        this.currentMultiplier = 1;
        
        // Initialize gold pile visuals array
        this.goldPileVisuals = [];
        
        // Initialize Thor's Storm Sky
        this.initStormSky();
        
        this.createOrUpdateHouse(this.currentMultiplier)
        
        // Create count-up display under the grid
        this.createCountUpDisplay()
        this.mustSeeDebugGraphics = this.add.graphics().setDepth(3500);
        this.refreshLayoutDebugVisualization();
        this.applyLayoutSnapshot();
        this.syncSymbolBackdrops();
      },

    createCountUpDisplay() {
        const cellSize = 70;
        const gridHeight = clientConfig.area.height * cellSize;
        
        // Position under the grid, centered (with offset)
        const centerX = (clientConfig.area.width * cellSize) / 2 + GRID_OFFSET_X;
        const y = gridHeight + 40 + GRID_OFFSET_Y;
        
        // Create count-up display (only create once)
        if (!this.countUpText || this.countUpText.destroyed) {
          this.countUpText = this.add.text(
            centerX,
            y,
            '0.00',
            {
              fontSize: '48px',
              fontFamily: 'Arial Black',
              color: '#FFD700', // Gold
              stroke: '#000000',
              strokeThickness: 6,
              shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 10,
                fill: true
              }
            }
          )
            .setOrigin(0.5)
            .setDepth(205)
            .setVisible(false); // Start hidden
          
          this.currentDisplayedWin = 0; // Track current displayed value
        } else {
          this.countUpText.setDepth(205);
        }
        this.ensureBonusMysteryMeterUi();
        this.setBonusMysteryMeterVisible(false);
        this.ensureLightningBeeMeterUi();
        this.setLightningBeeMeterVisible(false);
      },

    getDisplayObjectSymbolId(displayObject = null) {
        if (!displayObject || displayObject.destroyed) return null;
        const directSymbol = Number(displayObject?.symbolKey);
        if (Number.isFinite(directSymbol)) return directSymbol;
        const renderable = getReelSymbolRenderable(displayObject);
        const nestedSymbol = Number(renderable?.symbolKey);
        if (Number.isFinite(nestedSymbol)) return nestedSymbol;
        const textureSymbol = Number(renderable?.texture?.key ?? displayObject?.texture?.key);
        return Number.isFinite(textureSymbol) ? textureSymbol : null;
      },

    ensureBonusEndCoinSpinAnimation() {
        if (!this.anims) return false;
        if (this.anims.exists(BONUS_END_COIN_SPIN_ANIM_KEY)) {
          return true;
        }
        if (!this.textures?.exists?.(BONUS_END_COIN_ATLAS_KEY)) {
          return false;
        }
    
        this.anims.create({
          key: BONUS_END_COIN_SPIN_ANIM_KEY,
          frames: this.anims.generateFrameNames(BONUS_END_COIN_ATLAS_KEY, {
            prefix: "coin_",
            start: 0,
            end: BONUS_END_COIN_FRAME_COUNT - 1,
            zeroPad: 2,
            suffix: ".png"
          }),
          frameRate: BONUS_END_COIN_ANIM_FPS,
          repeat: -1
        });
        return true;
      },

    getLoadedCoinSoundKeys() {
        const coinSounds = ["coin1", "coin2", "coin3", "coin4", "coin5", "coin6"];
        const audioCache = this.cache?.audio;
        if (!audioCache || typeof audioCache.exists !== "function") {
          return coinSounds;
        }
        return coinSounds.filter((soundKey) => audioCache.exists(soundKey));
      },

    playRandomCoinSfx({
        volume = 0.34,
        rateMin = 0.94,
        rateMax = 1.12
      } = {}) {
        const coinSounds = this.getLoadedCoinSoundKeys();
        if (coinSounds.length === 0) return null;
        const soundKey = coinSounds[Math.floor(Math.random() * coinSounds.length)];
        return this.playSfx?.(soundKey, {
          volume,
          rate: Phaser.Math.FloatBetween(rateMin, rateMax)
        });
      },

    playCoinSfxBurst(count = 1, {
        staggerMs = 52,
        volume = 0.32,
        rateMin = 0.94,
        rateMax = 1.12
      } = {}) {
        const resolvedCount = Math.max(1, Math.min(5, Math.floor(Number(count) || 1)));
        const resolvedStaggerMs = Math.max(0, Math.floor(Number(staggerMs) || 0));
        for (let index = 0; index < resolvedCount; index++) {
          const play = () => this.playRandomCoinSfx({
            volume: Math.max(0.12, Number(volume) - index * 0.025),
            rateMin: Number(rateMin) + index * 0.01,
            rateMax: Number(rateMax) + index * 0.012
          });
          if (index === 0 || resolvedStaggerMs <= 0) {
            play();
          } else {
            this.time.delayedCall(index * resolvedStaggerMs, play);
          }
        }
      },

    getBonusEndCoinCountForValue(rawValueTbm = 0, {
        minCoins = 1,
        maxCoins = 20,
        valueScale = 1
      } = {}) {
        const valueTbm = Math.max(0, Number(rawValueTbm) || 0);
        const resolvedMinCoins = Math.max(0, Math.floor(Number(minCoins) || 0));
        const resolvedMaxCoins = Math.max(resolvedMinCoins, Math.floor(Number(maxCoins) || 20));
        const scaledValueTbm = valueTbm * Math.max(0, Number(valueScale) || 0);
        // Matches the requested tuning examples: 1.3 BM -> 1 coin, 1.5 BM -> 2 coins.
        return Math.max(resolvedMinCoins, Math.min(resolvedMaxCoins, Math.round(scaledValueTbm)));
      },

    playBonusEndLandingCoinBurst(x, y, rawValueTbm = 0, {
        depth = DEPTH_HERO + 14,
        minCoins = 1,
        maxCoins = 20,
        valueScale = 1,
        playSound = true,
        soundVolume = 0.32
      } = {}) {
        const centerX = Number(x);
        const centerY = Number(y);
        if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return 0;
        if (!this.textures?.exists?.(BONUS_END_COIN_ATLAS_KEY)) return 0;
    
        const hasSpinAnimation = this.ensureBonusEndCoinSpinAnimation();
        const coinCount = this.getBonusEndCoinCountForValue(rawValueTbm, {
          minCoins,
          maxCoins,
          valueScale
        });
        if (coinCount <= 0) return 0;
        if (playSound === true) {
          this.playCoinSfxBurst(Math.ceil(coinCount / 7), {
            volume: soundVolume,
            staggerMs: 48
          });
        }
        const countRatio = Phaser.Math.Clamp(coinCount / 20, 0, 1);
        const spread = 26 + countRatio * 27;
        const lift = 52 + countRatio * 38;
    
        for (let index = 0; index < coinCount; index++) {
          const delay = Math.floor(index * Math.max(5, Math.min(17, 135 / coinCount)) + Phaser.Math.Between(0, 26));
          const launchX = centerX + Phaser.Math.Between(-8, 8);
          const launchY = centerY + Phaser.Math.Between(-4, 8);
          const angle = Phaser.Math.FloatBetween(-Math.PI * 0.92, -Math.PI * 0.08);
          const distance = Phaser.Math.FloatBetween(18, spread);
          const endX = centerX + Math.cos(angle) * distance + Phaser.Math.Between(-12, 12);
          const endY = centerY + Phaser.Math.Between(18, 44) + countRatio * Phaser.Math.Between(0, 12);
          const peakX = (launchX + endX) * 0.5 + Phaser.Math.Between(-14, 14);
          const peakY = centerY - Phaser.Math.FloatBetween(lift * 0.68, lift * 1.04);
          const startScale = Phaser.Math.FloatBetween(0.13, 0.18);
          const endScale = startScale * Phaser.Math.FloatBetween(0.74, 0.94);
          const startAngle = Phaser.Math.Between(-22, 22);
          const spinAngle = Phaser.Math.Between(-210, 210);
          const duration = Phaser.Math.Between(1060, 1330);
          const frameIndex = String(Phaser.Math.Between(0, BONUS_END_COIN_FRAME_COUNT - 1)).padStart(2, "0");
          const coin = this.add.sprite(launchX, launchY, BONUS_END_COIN_ATLAS_KEY, `coin_${frameIndex}.png`)
            .setDepth(depth + index * 0.001)
            .setScale(startScale)
            .setAngle(startAngle)
            .setAlpha(0);
          coin.isTransientBonusEndCoinFx = true;
    
          if (hasSpinAnimation) {
            coin.play(BONUS_END_COIN_SPIN_ANIM_KEY);
            coin.anims?.setProgress?.(Phaser.Math.FloatBetween(0, 1));
          }
    
          const state = { t: 0 };
          this.tweens.add({
            targets: state,
            t: 1,
            delay,
            duration,
            ease: "Cubic.easeOut",
            onUpdate: () => {
              if (!coin || coin.destroyed) return;
              const t = Phaser.Math.Clamp(Number(state.t || 0), 0, 1);
              const inv = 1 - t;
              coin.x = inv * inv * launchX + 2 * inv * t * peakX + t * t * endX;
              coin.y = inv * inv * launchY + 2 * inv * t * peakY + t * t * endY;
              coin.angle = startAngle + spinAngle * t;
              coin.setScale(Phaser.Math.Linear(startScale, endScale, t) + Math.sin(Math.PI * t) * 0.045);
              const fadeStart = 0.78;
              const alpha = t < 0.14
                ? Phaser.Math.Linear(0, 1, t / 0.14)
                : (t > fadeStart ? Phaser.Math.Linear(1, 0, (t - fadeStart) / (1 - fadeStart)) : 1);
              coin.setAlpha(Phaser.Math.Clamp(alpha, 0, 1));
            },
            onComplete: () => {
              if (coin && !coin.destroyed) {
                coin.destroy();
              }
            }
          });
        }
    
        return coinCount;
      },

    playImmediateLowBackplateCoinToss(reel, row, rawValueTbm = 0, {
        playSound = true
      } = {}) {
        const parsedReel = Math.floor(Number(reel));
        const parsedRow = Math.floor(Number(row));
        if (!Number.isFinite(parsedReel) || !Number.isFinite(parsedRow)) return 0;
        if (parsedReel < 0 || parsedReel >= clientConfig.area.width) return 0;
        if (parsedRow < 0 || parsedRow >= clientConfig.area.height) return 0;
    
        const center = this.getGridCellCenter(parsedReel, parsedRow);
        if (playSound === true) {
          this.playRandomCoinSfx({
            volume: 0.26,
            rate: Phaser.Math.FloatBetween(1.02, 1.16)
          });
        }
        return this.playBonusEndLandingCoinBurst(center.x, center.y + 8, rawValueTbm, {
          depth: DEPTH_HERO + 9,
          minCoins: 1,
          maxCoins: 3,
          valueScale: 0.7,
          playSound: false,
          soundVolume: 0.18
        });
      },

    ensureBonusWonCracklingLightningAnimation() {
        if (!this.textures?.exists?.(BONUS_WON_CRACKLING_SHEET_TEXTURE_KEY)) {
          return false;
        }
    
        const texture = this.textures.get(BONUS_WON_CRACKLING_SHEET_TEXTURE_KEY);
        if (!texture) return false;
    
        if (!Array.isArray(this.bonusWonCracklingLightningFrameKeys)) {
          const atlasText = this.cache?.text?.get?.(BONUS_WON_CRACKLING_ATLAS_TEXT_KEY) || "";
          const frames = parseSpineAtlasFrames(atlasText, {
            prefix: "add/cracklingLightning_",
            pageName: "frameAndBackground.webp"
          }).filter((frame) => (
            frame?.bounds &&
            frame.bounds.width > 1 &&
            frame.bounds.height > 1
          ));
    
          this.bonusWonCracklingLightningFrameKeys = frames.map((frame, index) => {
            const frameKey = `bonus_won_crackling_${String(index).padStart(2, "0")}`;
            if (!texture.frames?.[frameKey]) {
              texture.add(
                frameKey,
                0,
                frame.bounds.x,
                frame.bounds.y,
                frame.bounds.width,
                frame.bounds.height
              );
            }
            return frameKey;
          });
        }
    
        const frameKeys = this.bonusWonCracklingLightningFrameKeys;
        if (!Array.isArray(frameKeys) || frameKeys.length === 0 || !this.anims) {
          return frameKeys?.length > 0;
        }
    
        if (!this.anims.exists(BONUS_WON_CRACKLING_ANIM_KEY)) {
          this.anims.create({
            key: BONUS_WON_CRACKLING_ANIM_KEY,
            frames: frameKeys.map((frame) => ({
              key: BONUS_WON_CRACKLING_SHEET_TEXTURE_KEY,
              frame
            })),
            frameRate: 30,
            repeat: -1
          });
        }
        return true;
      },

    startBonusWonCenterEnergy(x = null, y = null, {
        depth = DEPTH_HERO + 24,
        scale = 1,
        tint = 0x55FF88
      } = {}) {
        const fallbackTarget = this.getCenterCollectTarget();
        const centerX = Number.isFinite(Number(x)) ? Number(x) : fallbackTarget.x;
        const centerY = Number.isFinite(Number(y)) ? Number(y) : fallbackTarget.y;
        if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return false;
        if (!this.ensureBonusWonCracklingLightningAnimation()) return false;
    
        const frameKeys = this.bonusWonCracklingLightningFrameKeys;
        if (!Array.isArray(frameKeys) || frameKeys.length === 0) return false;
    
        const activeObjects = this.bonusWonCenterEnergyFx?.objects || [];
        if (activeObjects.some((object) => object && !object.destroyed)) {
          this.bonusWonCenterEnergyFx.centerX = centerX;
          this.bonusWonCenterEnergyFx.centerY = centerY;
          activeObjects.forEach((object) => {
            if (object && !object.destroyed) {
              object.setVisible(true);
            }
          });
          return true;
        }
    
        this.stopBonusWonCenterEnergy({ fade: false });
    
        const resolvedScale = Math.max(0.4, Number(scale) || 1) * 0.72;
        const resolvedTint = Number.isFinite(Number(tint)) ? Number(tint) : 0x55FF88;
        const objects = [];
    
        const glow = this.add.circle(centerX, centerY, 30, resolvedTint, 0.1)
          .setDepth(depth - 1)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.9 * resolvedScale);
        objects.push(glow);
        this.tweens.add({
          targets: glow,
          alpha: 0.035,
          duration: 520,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1,
          repeatDelay: 1100
        });
    
        const makeLightningSprite = (index, {
          scaleMultiplier,
          angle,
          offsetX = 0,
          offsetY = 0,
          duration,
          repeatDelay = 1200,
          delay = 0,
          targetAlpha = 0.8
        }) => {
          const frame = frameKeys[index % frameKeys.length];
          const sprite = this.add.sprite(
            centerX + offsetX,
            centerY + offsetY,
            BONUS_WON_CRACKLING_SHEET_TEXTURE_KEY,
            frame
          )
            .setOrigin(0.5)
            .setDepth(depth + index * 0.01)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setAlpha(0)
            .setScale(scaleMultiplier * resolvedScale)
            .setAngle(angle);
    
          if (typeof sprite.setTintFill === "function") {
            sprite.setTintFill(resolvedTint);
          } else {
            sprite.setTint(resolvedTint);
          }
    
          if (this.anims?.exists?.(BONUS_WON_CRACKLING_ANIM_KEY)) {
            sprite.play(BONUS_WON_CRACKLING_ANIM_KEY);
            sprite.anims?.setProgress?.(Phaser.Math.FloatBetween(0, 1));
          }
    
          objects.push(sprite);
          this.tweens.add({
            targets: sprite,
            alpha: Phaser.Math.Clamp(targetAlpha, 0.2, 1),
            delay,
            duration,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1,
            repeatDelay
          });
          return sprite;
        };
    
        makeLightningSprite(0, {
          scaleMultiplier: 0.72,
          angle: -8,
          duration: 95,
          repeatDelay: 1380,
          targetAlpha: 0.82
        });
        makeLightningSprite(Math.max(1, Math.floor(frameKeys.length * 0.45)), {
          scaleMultiplier: 0.52,
          angle: 11,
          offsetX: 4,
          offsetY: 2,
          duration: 120,
          repeatDelay: 2050,
          delay: 620,
          targetAlpha: 0.62
        });
    
        this.bonusWonCenterEnergyFx = {
          centerX,
          centerY,
          objects
        };
        return true;
      },

    stopBonusWonCenterEnergy({ fade = true } = {}) {
        const fx = this.bonusWonCenterEnergyFx;
        if (!fx) return;
        this.bonusWonCenterEnergyFx = null;
    
        (fx.objects || []).forEach((object) => {
          if (!object || object.destroyed) return;
          this.tweens?.killTweensOf?.(object);
          if (fade) {
            this.tweens.add({
              targets: object,
              alpha: 0,
              duration: 260,
              ease: "Sine.easeOut",
              onComplete: () => {
                if (!object.destroyed) object.destroy();
              }
            });
          } else {
            object.destroy();
          }
        });
      },

    playBonusWonCracklingLightningFx(x, y, {
        depth = DEPTH_HERO + 24,
        scale = 1,
        tint = 0x55FF88
      } = {}) {
        const centerX = Number(x);
        const centerY = Number(y);
        if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return false;
        if (!this.ensureBonusWonCracklingLightningAnimation()) return false;
    
        const frameKeys = this.bonusWonCracklingLightningFrameKeys;
        if (!Array.isArray(frameKeys) || frameKeys.length === 0) return false;
    
        const glow = this.add.circle(centerX, centerY, 44, tint, 0.24)
          .setDepth(depth - 1)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.35);
        this.tweens.add({
          targets: glow,
          scale: 3.1 * (Number(scale) || 1),
          alpha: 0,
          duration: 760,
          ease: "Cubic.easeOut",
          onComplete: () => {
            if (!glow.destroyed) glow.destroy();
          }
        });
    
        const burstCount = 3;
        for (let index = 0; index < burstCount; index++) {
          const delay = index * 90;
          this.time.delayedCall(delay, () => {
            const frame = frameKeys[Phaser.Math.Between(0, Math.max(0, frameKeys.length - 1))];
            const sprite = this.add.sprite(
              centerX + Phaser.Math.Between(-12, 12),
              centerY + Phaser.Math.Between(-12, 12),
              BONUS_WON_CRACKLING_SHEET_TEXTURE_KEY,
              frame
            )
              .setOrigin(0.5)
              .setDepth(depth + index * 0.01)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setAlpha(0.9)
              .setScale((1.65 + index * 0.22) * (Number(scale) || 1))
              .setAngle(Phaser.Math.Between(-18, 18));
    
            if (typeof sprite.setTintFill === "function") {
              sprite.setTintFill(tint);
            } else {
              sprite.setTint(tint);
            }
    
            if (this.anims?.exists?.(BONUS_WON_CRACKLING_ANIM_KEY)) {
              sprite.play(BONUS_WON_CRACKLING_ANIM_KEY);
            }
    
            this.tweens.add({
              targets: sprite,
              scale: sprite.scaleX * 1.18,
              alpha: 0,
              duration: 820,
              ease: "Sine.easeOut",
              onComplete: () => {
                if (!sprite.destroyed) sprite.destroy();
              }
            });
          });
        }
    
        return true;
      },

    isPersistentBonusFeatureSymbol(rawSymbol) {
        const symbolId = Number(rawSymbol);
        if (!Number.isFinite(symbolId)) return false;
        return (
          Math.floor(symbolId) === Math.floor(BONUS_MYSTERY_FEATURE_SYMBOL_ID) ||
          Math.floor(symbolId) === Math.floor(MERGE_GUN_FEATURE_SYMBOL_ID) ||
          Math.floor(symbolId) === Math.floor(LIGHTNING_BEE_FEATURE_SYMBOL_ID)
        );
      },

    refreshImmediateLowBackplateAreaHeat(areaValueMap = null, { hideMergedAreaCells = false } = {}) {
        if (!(this.immediateLowPositionTbmByKey instanceof Map) || this.immediateLowPositionTbmByKey.size === 0) {
          return;
        }
    
        const hiddenCellKeys = hideMergedAreaCells === true
          ? new Set(
            (Array.isArray(this.mergeGunAreas) ? this.mergeGunAreas : [])
              .flatMap((area) => Array.isArray(area?.positions) ? area.positions : [])
              .map((position) => `${Math.floor(Number(position?.reel))},${Math.floor(Number(position?.row))}`)
          )
          : null;
    
        this.immediateLowPositionTbmByKey.forEach((valueTbm, key) => {
          const [reel, row] = String(key).split(",").map(Number);
          if (!Number.isFinite(reel) || !Number.isFinite(row)) return;
          if (hiddenCellKeys?.has(`${reel},${row}`)) {
            const display = this.immediateLowBackplateDisplays instanceof Map
              ? this.immediateLowBackplateDisplays.get(key)
              : null;
            this.stopBonusEndHighValuePulse(display);
            if (display?.glow && !display.glow.destroyed) display.glow.destroy();
            if (display?.backplate && !display.backplate.destroyed) display.backplate.destroy();
            if (display?.label && !display.label.destroyed) display.label.destroy();
            this.immediateLowBackplateDisplays?.delete?.(key);
            return;
          }
          this.ensureImmediateLowPositionBackplateDisplay(reel, row, valueTbm, {
            pulse: false,
            areaValueMap
          });
        });
      },

    findFeatureSpriteAtCell(reel, row, symbolId) {
        const parsedReel = Math.floor(Number(reel));
        const parsedRow = Math.floor(Number(row));
        if (
          !Number.isFinite(parsedReel) ||
          !Number.isFinite(parsedRow) ||
          parsedReel < 0 ||
          parsedReel >= clientConfig.area.width ||
          parsedRow < 0 ||
          parsedRow >= clientConfig.area.height
        ) {
          return null;
        }
    
        const tracked = this.reelSprites?.[parsedReel]?.[parsedRow];
        if (tracked && !tracked.destroyed && this.getDisplayObjectSymbolId(tracked) === symbolId) {
          return tracked;
        }
    
        const center = this.getGridCellCenter(parsedReel, parsedRow);
        const tolerance = Math.max(8, Math.floor(70 * 0.34));
        let resolved = null;
        const sceneChildren = this.children?.list;
        if (!Array.isArray(sceneChildren)) return null;
    
        sceneChildren.forEach((child) => {
          if (!child || child.destroyed) return;
          if (this.isBonusFruitPileTokenSprite(child)) return;
          if (!Number.isFinite(child.x) || !Number.isFinite(child.y)) return;
          if (Math.abs(child.x - center.x) > tolerance) return;
          if (Math.abs(child.y - center.y) > tolerance) return;
          if (this.getDisplayObjectSymbolId(child) !== symbolId) return;
          if (!resolved || Number(child.depth || 0) >= Number(resolved.depth || 0)) {
            resolved = child;
          }
        });
    
        return resolved;
      },

    updateCountUp(targetValue) {
        if (!this.countUpText || this.countUpText.destroyed) return;
        this.ensureBonusMysteryMeterUi();
        const resolvedValue = Math.max(0, Number(targetValue) || 0);
        
        // Clear any existing count-up timer
        if (this.countUpTimer) {
          clearInterval(this.countUpTimer);
        }
    
        this.currentDisplayedWin = resolvedValue;
    
        const shouldHideDuringBonus = this.isInBonusMode === true;
        if (this.suppressCountUpUntilBonusEndPayout || shouldHideDuringBonus) {
          this.countUpText.setVisible(false);
          return;
        }
    
        // Hide if value is 0, otherwise show
        if (resolvedValue === 0) {
          this.countUpText.setVisible(false);
        } else {
          this.countUpText.setText(resolvedValue.toFixed(2));
          this.countUpText.setVisible(true);
        }
      },

    revealBonusEndCollectDisplay() {
        this.suppressCountUpUntilBonusEndPayout = false;
    
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
      }
  };
}

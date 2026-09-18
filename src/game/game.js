import posthog from "../posthog.js";
import { createAudioController } from "./audio.js";
import { createInput } from "./input.js";
import { createRenderer } from "./renderer.js";
import { createSimulation } from "./simulation.js";
import { createUI } from "./ui.js";
import { recordScore, getPlayerName, setPlayerName, fetchGlobalLeaderboard, isNameTaken, getCachedCloudEntries } from "./leaderboard.js";
import {
  getBuilderCode,
  setBuilderCode,
  getActiveDataSuffix,
  connectWallet,
  sendAttributedTransaction,
  verifyAttributionData,
} from "../web3/builderCode.js";


function loadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    const timer = setTimeout(() => resolve(image), 3000);
    image.onload = () => {
      clearTimeout(timer);
      if (image.decode) {
        image.decode().catch(() => {}).finally(() => resolve(image));
      } else {
        resolve(image);
      }
    };
    image.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    image.src = url;
  });
}

export function createGame({ mount, sdk, tweaks, assets, saved, audio }) {
  let cleanup = () => { };

  return {
    start() {
      const shell = document.createElement("section");
      shell.className = "game-shell";
      mount.replaceChildren(shell);
      const ui = createUI(shell);
      const { elements } = ui;
      let bestScore = saved?.version === 1 && Number.isFinite(saved.bestScore) ? Math.max(0, saved.bestScore) : 0;
      let raf = 0;
      let lastTime = performance.now();
      let ready = false;
      let started = false;
      let renderer;
      let simulation;
      let resizeObserver;
      const unsubs = [];
      const config = {
        roundDuration: tweaks.get("roundDuration"),
        fishCount: tweaks.get("fishCount"),
        dropSpeed: tweaks.get("dropSpeed"),
        reelSpeed: tweaks.get("reelSpeed"),
        effectsIntensity: tweaks.get("effectsIntensity"),
        musicVolume: tweaks.get("musicVolume"),
      };
      const sound = createAudioController(audio, config.musicVolume);

      const events = {
        onCast: () => sound.cast(),
        onReel: () => sound.reel(),
        onBite: () => {
          sound.catch(1);
          if (sdk.device.haptics.isSupported()) void sdk.device.haptics.vibrate(25).catch(() => { });
        },
        onCatch: (species, combo, pointsEarned, score) => {
          sound.catch(combo);
          posthog?.capture("fish_caught", {
            fish_species: species.name,
            fish_behavior: species.behavior,
            combo,
            points_earned: pointsEarned,
            score,
          });
        },
        onSpecial: (type) => {
          sound.special(type);
          if (type === "power") {
            posthog?.capture("power_up_collected", { power_up: "spectral_pearl" });
          } else if (type === "treasure") {
            posthog?.capture("treasure_collected", { points_earned: 400 });
          }
          if (sdk.device.haptics.isSupported()) void sdk.device.haptics.vibrate(type === "zap" ? [25, 35, 25] : 20).catch(() => { });
        },
        onEvent: (type) => {
          sound.event(type);
          if (sdk.device.haptics.isSupported()) void sdk.device.haptics.vibrate([18, 32, 18]).catch(() => { });
        },
        onEnd: (score, validationToken) => {
          sound.stopMusic();
          const lbData = recordScore(score, validationToken, (updatedLbData) => {
            if (!simulation?.state.running && ui.isResultsOpen()) {
              ui.showResults(updatedLbData);
            }
          });
          bestScore = Math.max(bestScore, lbData.userBest);
          posthog?.capture("game_round_completed", {
            score,
            is_new_best: lbData.isNewRecord,
            best_score: bestScore,
            user_rank: lbData.userRank,
          });
          ui.showResults(lbData);
          void sdk.gameState.save({ version: 1, bestScore }).catch(() => { });
          void sdk.leaderboard.submit(Math.max(0, Math.min(score, Number.MAX_SAFE_INTEGER))).catch(() => { });
        },
      };

      let input = { state: { pointerX: 0.5, left: false, right: false }, destroy() { } };

      function resize() {
        if (!renderer || !simulation || shell.hidden) return;
        const bounds = shell.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        renderer.resize(bounds.width, bounds.height);
        simulation.resize(bounds.width, bounds.height);
      }

      function loop(now) {
        if (document.hidden) {
          lastTime = now;
          raf = requestAnimationFrame(loop);
          return;
        }
        const guideActive = ui.isGuideOpen();
        const dt = guideActive ? 0 : Math.min(0.033, (now - lastTime) / 1000);
        lastTime = now;
        if (!guideActive) simulation?.update(dt, input.state);
        if (simulation && renderer) {
          ui.update(simulation.state);
          renderer.render(simulation.state, simulation.surfaceY(), now / 1000);
        }
        raf = requestAnimationFrame(loop);
      }

      function beginRound() {
        if (!ready) return;
        if (input?.state) {
          input.state.casting = false;
          input.state.left = false;
          input.state.right = false;
        }
        ui.hideResults();
        ui.closeGuide();
        simulation.reset();
        ui.showHint();
        sound.startMusic();
        lastTime = performance.now();
      }

      function activate() {
        if (!ready || started) return;
        const enteredName = ui.getStartNameInput();
        const targetName = enteredName || getPlayerName() || "Angler 1";
        if (isNameTaken(targetName, getCachedCloudEntries())) {
          ui.setNameTakenError(`⚠️ Name "${targetName}" is taken by another player! Choose a unique name.`);
          return;
        }
        setPlayerName(targetName);
        ui.clearNameTakenError();
        started = true;
        ui.hideStart();
        ui.closeGuide();
        sound.unlock();
        beginRound();
      }

      function handleGuidePlay(e) {
        e?.stopPropagation();
        ui.closeGuide();
        if (!started) {
          activate();
        } else if (!simulation?.state.running) {
          beginRound();
        }
      }

      function toggleSound() {
        const muted = sound.toggleMuted();
        elements.sound.textContent = muted ? "×" : "♪";
        elements.sound.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
      }

      if (elements.startPlayBtn) {
        elements.startPlayBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          activate();
        });
      }
      if (elements.startNameInput) {
        elements.startNameInput.addEventListener("input", () => {
          const val = ui.getStartNameInput();
          if (val && isNameTaken(val, getCachedCloudEntries())) {
            ui.setNameTakenError(`⚠️ Name "${val}" is taken by another player!`);
          } else {
            ui.clearNameTakenError();
          }
        });
        elements.startNameInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            activate();
          }
        });
      }
      elements.start.addEventListener("click", (e) => {
        if (e.target.closest("[data-open-guide]") || e.target.closest("input")) return;
        activate();
      });
      elements.replay.addEventListener("click", (e) => {
        e.stopPropagation();
        beginRound();
      });
      elements.sound.addEventListener("click", toggleSound);
      if (elements.guidePlay) {
        elements.guidePlay.addEventListener("click", handleGuidePlay);
      }

      // Initialize Base Builder Code UI values
      if (elements.builderCodeInput) {
        elements.builderCodeInput.value = getBuilderCode();
      }
      if (elements.suffixHexDisplay) {
        elements.suffixHexDisplay.textContent = getActiveDataSuffix();
      }
      if (elements.txSuffixPreview) {
        elements.txSuffixPreview.textContent = getActiveDataSuffix();
      }

      // Update Builder Code Event
      if (elements.updateBuilderCodeBtn) {
        elements.updateBuilderCodeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const newCode = elements.builderCodeInput?.value || "";
          const result = setBuilderCode(newCode);
          if (elements.suffixHexDisplay) elements.suffixHexDisplay.textContent = result.dataSuffix;
          if (elements.txSuffixPreview) elements.txSuffixPreview.textContent = result.dataSuffix;
          if (elements.txResultBox) {
            elements.txResultBox.hidden = false;
            elements.txResultBox.innerHTML = `
              <div class="alert-success">
                ✅ Updated Builder Code to <strong>${result.code}</strong><br>
                <small>Generated Suffix: ${result.dataSuffix}</small>
              </div>
            `;
          }
        });
      }

      // Connect Wallet Event
      if (elements.connectWalletBtn) {
        elements.connectWalletBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          elements.connectWalletBtn.disabled = true;
          elements.connectWalletBtn.textContent = "Connecting…";
          const res = await connectWallet();
          elements.connectWalletBtn.disabled = false;
          elements.connectWalletBtn.textContent = res.connected ? "Connected ✓" : "Connect Wallet";

          if (res.connected) {
            if (elements.walletAddressLabel) elements.walletAddressLabel.textContent = `${res.address.slice(0, 6)}...${res.address.slice(-4)}`;
            if (elements.walletNetworkLabel) elements.walletNetworkLabel.textContent = res.network;
          } else if (elements.txResultBox) {
            elements.txResultBox.hidden = false;
            elements.txResultBox.innerHTML = `<div class="alert-warning">⚠️ ${res.error}</div>`;
          }
        });
      }

      // Send Attributed Tx Event
      if (elements.sendAttributedTxBtn) {
        elements.sendAttributedTxBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          elements.sendAttributedTxBtn.disabled = true;
          elements.sendAttributedTxBtn.textContent = "Processing Transaction…";
          
          const result = await sendAttributedTransaction({ valueInEth: "0.0001" });
          elements.sendAttributedTxBtn.disabled = false;
          elements.sendAttributedTxBtn.textContent = "🚀 Send Attributed Transaction on Base";

          if (elements.txResultBox) {
            elements.txResultBox.hidden = false;
            if (result.success) {
              elements.txResultBox.innerHTML = `
                <div class="alert-success">
                  <strong>🎉 Transaction Submitted with Builder Code!</strong><br>
                  <span>Tx Hash: <code>${result.hash.slice(0, 16)}...</code></span><br>
                  <span>Attributed Code: <strong>${result.builderCode}</strong></span><br>
                  <span>ERC-8021 Suffix: <code>${result.dataSuffix.slice(0, 20)}...</code></span>
                  ${result.simulated ? '<br><small>ℹ️ (Simulated run: no web3 provider connected)</small>' : ''}
                </div>
              `;
            } else {
              elements.txResultBox.innerHTML = `
                <div class="alert-error">
                  ❌ Transaction Error: ${result.error}<br>
                  <small>Code: ${result.builderCode} | Suffix: ${result.dataSuffix.slice(0, 16)}...</small>
                </div>
              `;
            }
          }
        });
      }

      // Verify Attribution Event
      if (elements.runVerifyBtn) {
        elements.runVerifyBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const raw = elements.verifyInput?.value || getActiveDataSuffix();
          const verified = verifyAttributionData(raw);

          if (elements.verifyResultBox) {
            elements.verifyResultBox.hidden = false;
            if (verified.valid) {
              elements.verifyResultBox.innerHTML = `
                <div class="verify-pass">
                  <div class="verify-status-badge">✅ VALID ERC-8021 ATTRIBUTION DATA</div>
                  <ul class="verify-details-list">
                    <li><strong>Decoded Builder Codes:</strong> ${verified.codes.length > 0 ? verified.codes.map((c) => `<code>${c}</code>`).join(", ") : "None found"}</li>
                    <li><strong>16-Byte Trailing Suffix (8021 pattern):</strong> ${verified.has8021Suffix ? "Yes ✓" : "No"}</li>
                    <li><strong>Schema ID:</strong> ${verified.schemaId}</li>
                    <li><strong>Raw Input Hex:</strong> <code>${verified.rawHex.slice(0, 32)}...</code></li>
                  </ul>
                </div>
              `;
            } else {
              elements.verifyResultBox.innerHTML = `
                <div class="verify-fail">
                  <div class="verify-status-badge fail">❌ ATTRIBUTION PARSE ERROR</div>
                  <p>${verified.error}</p>
                </div>
              `;
            }
          }
        });
      }


      const getAsset = (key, fallback) => {
        try {
          return assets?.get ? assets.get(key) : fallback;
        } catch {
          return fallback;
        }
      };

      const assetUrls = [
        getAsset("AQUARIUM_BG", "generated-assets/aquarium_bg.webp"),
        getAsset("ANGRY_FISH", "generated-assets/assets/angry_fish.png"),
        getAsset("CRAB", "generated-assets/assets/crab.png"),
        getAsset("ELECTRIC_FISH", "generated-assets/assets/electric_fish.png"),
        getAsset("EMBER_FISH", "generated-assets/assets/ember_fish.png"),
        getAsset("FISH_FOOD", "generated-assets/assets/fish_food.png"),
        getAsset("HOOK_BAIT", "generated-assets/assets/hook_bait.png"),
        getAsset("LEMON_TANG", "generated-assets/assets/lemon_tang.png"),
        getAsset("MINI_SHARK", "generated-assets/assets/mini_shark.png"),
        getAsset("NEON_TETRA", "generated-assets/assets/neon_tetra.png"),
        getAsset("OCTOPUS", "generated-assets/assets/octopus.png"),
        getAsset("PEARL_KOI", "generated-assets/assets/pearl_koi.png"),
        getAsset("PIRATE_TREASURE", "generated-assets/assets/pirate_treasure.png"),
        getAsset("PUFFER_FISH", "generated-assets/assets/puffer_fish.png"),
        getAsset("RAINBOW_FISH", "generated-assets/assets/rainbow_fish.png"),
        getAsset("ROYAL_BETA", "generated-assets/assets/royal_beta.png"),
        getAsset("SCHOOL_FISH", "generated-assets/assets/school_fish.png"),
        getAsset("SPECTRAL_PEARL", "generated-assets/assets/spectral_pearl.png"),
        getAsset("TIMID_FISH", "generated-assets/assets/timid_fish.png"),
        getAsset("GHOST_FISH", "generated-assets/assets/ghost_fish.png"),
      ];

      let loadedAssetsCount = 0;
      const totalAssetsCount = assetUrls.length;

      let currentDisplayPct = 0;
      let targetDisplayPct = 0;
      let assetLoadComplete = false;
      let progressTimer = 0;

      function updateLoaderLoop() {
        if (assetLoadComplete) {
          targetDisplayPct = 100;
          currentDisplayPct = Math.min(100, currentDisplayPct + 12);
        } else {
          const rawPct = (loadedAssetsCount / totalAssetsCount) * 90;
          targetDisplayPct = Math.max(targetDisplayPct + 1.5, rawPct);
          if (currentDisplayPct < targetDisplayPct) {
            currentDisplayPct = Math.min(targetDisplayPct, currentDisplayPct + 4);
          }
        }
        ui.setLoadingProgress(currentDisplayPct);

        if (currentDisplayPct >= 100 && assetLoadComplete) {
          ui.setLoadingProgress(100);
          ui.hideTankLoader();
          return;
        }

        progressTimer = requestAnimationFrame(updateLoaderLoop);
      }

      progressTimer = requestAnimationFrame(updateLoaderLoop);

      function onAssetProgress() {
        loadedAssetsCount += 1;
      }

      Promise.all(
        assetUrls.map((url) =>
          loadImage(url)
            .then((img) => {
              onAssetProgress();
              return img;
            })
            .catch(() => {
              onAssetProgress();
              return null;
            })
        )
      ).then(([
        background, angryFish, crab, electricFish, emberFish, fishFood,
        hookBait, lemonTang, miniShark, neonTetra, octopus, pearlKoi,
        pirateTreasure, pufferFish, rainbowFish, royalBeta, schoolFish,
        spectralPearl, timidFish, ghostFish
      ]) => {
        assetLoadComplete = true;
        renderer = createRenderer(
          elements.canvas,
          {
            background, angryFish, crab, electricFish, emberFish, fishFood,
            hookBait, lemonTang, miniShark, neonTetra, octopus, pearlKoi,
            pirateTreasure, pufferFish, rainbowFish, royalBeta, schoolFish,
            spectralPearl, timidFish, ghostFish
          },
          config,
        );
        simulation = createSimulation(config, events);
        input = createInput(elements.canvas, () => simulation.startCast(), () => simulation.endCast());
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(shell);
        resize();
        ready = true;
        const savedName = getPlayerName();
        ui.updateNameView(Boolean(savedName), savedName);
        ui.setStartNameInput(savedName);
        ui.setReady();
        void fetchGlobalLeaderboard().catch(() => { });
      }).catch((err) => {
        console.error("Asset loading error:", err);
        ui.setError();
      });

      const tweakKeys = Object.keys(config);
      tweakKeys.forEach((key) => {
        unsubs.push(tweaks.subscribe(key, (value) => {
          config[key] = value;
          if (key === "musicVolume") sound.setMusicVolume(value);
        }));
      });

      raf = requestAnimationFrame(loop);
      cleanup = () => {
        cancelAnimationFrame(raf);
        cancelAnimationFrame(progressTimer);
        resizeObserver?.disconnect();
        input.destroy();
        sound.destroy();
        ui.destroy();
        unsubs.forEach((unsubscribe) => unsubscribe());
        elements.start.removeEventListener("click", activate);
        elements.replay.removeEventListener("click", beginRound);
        elements.sound.removeEventListener("click", toggleSound);
        mount.replaceChildren();
      };
    },
    destroy() {
      cleanup();
      cleanup = () => { };
    },
  };
}

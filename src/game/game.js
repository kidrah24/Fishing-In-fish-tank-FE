import posthog from "../posthog.js";
import { createAudioController } from "./audio.js";
import { createInput } from "./input.js";
import { createRenderer } from "./renderer.js";
import { createSimulation } from "./simulation.js";
import { createUI } from "./ui.js";

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

export function createGame({ mount, sdk, tweaks, assets, saved, audio }) {
  let cleanup = () => {};

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
          if (sdk.device.haptics.isSupported()) void sdk.device.haptics.vibrate(25).catch(() => {});
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
          if (sdk.device.haptics.isSupported()) void sdk.device.haptics.vibrate(type === "zap" ? [25, 35, 25] : 20).catch(() => {});
        },
        onEvent: (type) => {
          sound.event(type);
          if (sdk.device.haptics.isSupported()) void sdk.device.haptics.vibrate([18, 32, 18]).catch(() => {});
        },
        onEnd: (score) => {
          const isBest = score > bestScore;
          bestScore = Math.max(bestScore, score);
          posthog?.capture("game_round_completed", {
            score,
            is_new_best: isBest,
            best_score: bestScore,
          });
          ui.showResults(score, bestScore, isBest);
          void sdk.gameState.save({ version: 1, bestScore }).catch(() => {});
          void sdk.leaderboard.submit(Math.max(0, Math.min(score, Number.MAX_SAFE_INTEGER))).catch(() => {});
        },
      };

      let input = { state: { pointerX: 0.5, left: false, right: false }, destroy() {} };

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
        ui.hideResults();
        ui.closeGuide();
        simulation.reset();
        ui.showHint();
        lastTime = performance.now();
      }

      function activate() {
        if (!ready || started) return;
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

      elements.start.addEventListener("pointerup", (e) => {
        if (e.target.closest("[data-open-guide]")) return;
        activate();
      });
      elements.start.addEventListener("click", (e) => {
        if (e.target.closest("[data-open-guide]")) return;
        activate();
      });
      elements.replay.addEventListener("click", beginRound);
      elements.sound.addEventListener("click", toggleSound);
      if (elements.guidePlay) {
        elements.guidePlay.addEventListener("click", handleGuidePlay);
      }

      const getAsset = (key, fallback) => {
        try {
          return assets?.get ? assets.get(key) : fallback;
        } catch {
          return fallback;
        }
      };

      Promise.all([
        loadImage(getAsset("AQUARIUM_BG", "/generated-assets/aquarium_bg.webp")).catch(() => null),
        loadImage(getAsset("ANGRY_FISH", "/generated-assets/assets/angry_fish.png")).catch(() => null),
        loadImage(getAsset("CRAB", "/generated-assets/assets/crab.png")).catch(() => null),
        loadImage(getAsset("ELECTRIC_FISH", "/generated-assets/assets/electric_fish.png")).catch(() => null),
        loadImage(getAsset("EMBER_FISH", "/generated-assets/assets/ember_fish.png")).catch(() => null),
        loadImage(getAsset("FISH_FOOD", "/generated-assets/assets/fish_food.png")).catch(() => null),
        loadImage(getAsset("HOOK_BAIT", "/generated-assets/assets/hook_bait.png")).catch(() => null),
        loadImage(getAsset("LEMON_TANG", "/generated-assets/assets/lemon_tang.png")).catch(() => null),
        loadImage(getAsset("MINI_SHARK", "/generated-assets/assets/mini_shark.png")).catch(() => null),
        loadImage(getAsset("NEON_TETRA", "/generated-assets/assets/neon_tetra.png")).catch(() => null),
        loadImage(getAsset("OCTOPUS", "/generated-assets/assets/octopus.png")).catch(() => null),
        loadImage(getAsset("PEARL_KOI", "/generated-assets/assets/pearl_koi.png")).catch(() => null),
        loadImage(getAsset("PIRATE_TREASURE", "/generated-assets/assets/pirate_treasure.png")).catch(() => null),
        loadImage(getAsset("PUFFER_FISH", "/generated-assets/assets/puffer_fish.png")).catch(() => null),
        loadImage(getAsset("RAINBOW_FISH", "/generated-assets/assets/rainbow_fish.png")).catch(() => null),
        loadImage(getAsset("ROYAL_BETA", "/generated-assets/assets/royal_beta.png")).catch(() => null),
        loadImage(getAsset("SCHOOL_FISH", "/generated-assets/assets/school_fish.png")).catch(() => null),
        loadImage(getAsset("SPECTRAL_PEARL", "/generated-assets/assets/spectral_pearl.png")).catch(() => null),
        loadImage(getAsset("TIMID_FISH", "/generated-assets/assets/timid_fish.png")).catch(() => null),
      ]).then(([
        background, angryFish, crab, electricFish, emberFish, fishFood,
        hookBait, lemonTang, miniShark, neonTetra, octopus, pearlKoi,
        pirateTreasure, pufferFish, rainbowFish, royalBeta, schoolFish,
        spectralPearl, timidFish
      ]) => {
        renderer = createRenderer(
          elements.canvas,
          {
            background, angryFish, crab, electricFish, emberFish, fishFood,
            hookBait, lemonTang, miniShark, neonTetra, octopus, pearlKoi,
            pirateTreasure, pufferFish, rainbowFish, royalBeta, schoolFish,
            spectralPearl, timidFish
          },
          config,
        );
        simulation = createSimulation(config, events);
        input = createInput(elements.canvas, () => simulation.startCast(), () => simulation.endCast());
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(shell);
        resize();
        ready = true;
        ui.setReady();
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
        resizeObserver?.disconnect();
        input.destroy();
        sound.destroy();
        ui.destroy();
        unsubs.forEach((unsubscribe) => unsubscribe());
        elements.start.removeEventListener("pointerup", activate);
        elements.start.removeEventListener("click", activate);
        elements.replay.removeEventListener("click", beginRound);
        elements.sound.removeEventListener("click", toggleSound);
        mount.replaceChildren();
      };
    },
    destroy() {
      cleanup();
      cleanup = () => {};
    },
  };
}

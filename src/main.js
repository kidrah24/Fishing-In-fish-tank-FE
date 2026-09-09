import sdk from "@playabl/sdk";
import { inject as injectVercelAnalytics } from "@vercel/analytics";
import { createGame } from "./game/game.js";
import tweaksManifest from "./tweaks.json";
import assetsManifest from "./assets.json";
import "./posthog.js";
import "./styles.css";

try {
  injectVercelAnalytics();
} catch (err) {
  console.warn("Analytics initialization skipped:", err);
}

const app = document.querySelector("#app");

const withTimeout = (promise, ms = 1000, fallback = null) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]).catch(() => fallback);

const createFallbackTweaks = (manifest) => {
  const values = {};
  for (const [key, obj] of Object.entries(manifest || {})) {
    values[key] = obj?.value ?? 0;
  }
  return {
    get(key) {
      return values[key] ?? 0;
    },
    subscribe() {
      return () => {};
    },
  };
};

const ready = await withTimeout(sdk.ready(), 1000);
const tweaks = (await withTimeout(sdk.tweaks.init(tweaksManifest), 1000)) || createFallbackTweaks(tweaksManifest);
const assets = Object.keys(assetsManifest).length > 0
  ? await withTimeout(sdk.assets.register(assetsManifest), 1000)
  : undefined;
const saved = await withTimeout(sdk.gameState.load(), 800);
const audio = await withTimeout(sdk.audio.getContext(), 800);

const safeSdk = {
  ...sdk,
  device: {
    haptics: {
      isSupported: () => Boolean(sdk?.device?.haptics?.isSupported?.()),
      vibrate: (pattern) => sdk?.device?.haptics?.vibrate?.(pattern)?.catch?.(() => {}) ?? Promise.resolve(),
    },
  },
  gameState: {
    save: (data) => sdk?.gameState?.save?.(data)?.catch?.(() => {}) ?? Promise.resolve(),
    load: () => sdk?.gameState?.load?.()?.catch?.(() => null) ?? Promise.resolve(null),
  },
  leaderboard: {
    submit: (score) => sdk?.leaderboard?.submit?.(score)?.catch?.(() => {}) ?? Promise.resolve(),
  },
};

const game = createGame({ mount: app, sdk: safeSdk, ready, tweaks, assets, saved, audio });
game.start();


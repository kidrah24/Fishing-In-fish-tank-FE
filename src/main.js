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

const withTimeout = (promise, ms = 500, fallback = null) =>
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

const [ready, tweaksRes, assetsRes, saved, audio] = await Promise.all([
  withTimeout(sdk.ready(), 500),
  withTimeout(sdk.tweaks.init(tweaksManifest), 500),
  Object.keys(assetsManifest).length > 0 ? withTimeout(sdk.assets.register(assetsManifest), 500) : Promise.resolve(undefined),
  withTimeout(sdk.gameState.load(), 500),
  withTimeout(sdk.audio.getContext(), 500),
]);

const tweaks = tweaksRes || createFallbackTweaks(tweaksManifest);
const assets = assetsRes;

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


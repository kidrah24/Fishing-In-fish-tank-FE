import sdk from "@playabl/sdk";
import { createGame } from "./game/game.js";
import tweaksManifest from "./tweaks.json";
import assetsManifest from "./assets.json";
import "./styles.css";

const app = document.querySelector("#app");
const ready = await sdk.ready();
const tweaks = await sdk.tweaks.init(tweaksManifest);
const assets = Object.keys(assetsManifest).length > 0
  ? await sdk.assets.register(assetsManifest)
  : undefined;
const saved = await sdk.gameState.load().catch(() => null);
const audio = await sdk.audio.getContext().catch(() => null);

// Keep bootstrap boring; build the actual game in src/game/game.js.
const game = createGame({ mount: app, sdk, ready, tweaks, assets, saved, audio });
game.start();

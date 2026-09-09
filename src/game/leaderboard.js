const STORAGE_KEY = "tank_tackle_leaderboard_v3";
const NAME_KEY = "tank_tackle_player_name";
const TOKEN_KEY = "tank_tackle_player_token";
const CLOUD_API_URL = "https://api.restful-api.dev/objects/ff808181a058d43f01a05d6101891019";
const CLOUD_BIN_NAME = "tank_and_tackle_global_leaderboard_v1";
const SALT_KEY = "tank_tackle_salt_99824_v3";
const ENTRY_SALT = "tt_sec_sig_99824_v4_k9";
const MAX_REALISTIC_SCORE = 75000;

const DUMMY_NAMES = new Set([
  "SpectralKing",
  "ApexFisher",
  "ElectroCaptain",
  "PufferPro",
  "TackleMaster",
  "WaveRunner",
  "PearlHunter",
  "GoldfishWhisperer",
  "OctoDodger",
  "BaitCatcher",
  "ReefChallenger",
  "DeepSeaScout",
  "TidalWave",
  "AquariumRookie",
]);

const SEED_SCORES = {
  jainil: { name: "Jainil", score: 15800 },
  bishal: { name: "bishal", score: 11790 },
  sharkie: { name: "sharkie", score: 10795 },
  arashi: { name: "Arashi", score: 10290 },
  kidrah: { name: "Kidrah", score: 11195 },
  "angler 1": { name: "Angler 1", score: 9190, ownerToken: "1si07wc" },
  hgzg: { name: "Hgzg", score: 7585 },
  fl4v41: { name: "fl4v41", score: 5925 },
  dani: { name: "Dani", score: 5220 },
  cybertpg: { name: "CyberTPG", score: 4725 },
  bronci: { name: "Bronci", score: 2995 },
  hardik: { name: "Hardik", score: 2640 },
  malcal: { name: "malcal", score: 2205 },
  f: { name: "F", score: 2140 },
  vivek: { name: "Vivek", score: 2060 },
  neo: { name: "Neo", score: 1810, ownerToken: "1xjod12" },
  jon: { name: "Jon", score: 1240 },
  jj: { name: "jj", score: 1055 },
};

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function getPlayerToken() {
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token || typeof token !== "string" || token.length < 8) {
      token = "usr_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return "usr_anonymous";
  }
}

function getOwnerTokenHash() {
  return hashString(getPlayerToken() + "_owner_secret");
}

function computeEntrySig(name, score, ownerToken = "") {
  const cleanName = (name || "").trim().slice(0, 16);
  const scoreVal = Math.max(0, Math.min(MAX_REALISTIC_SCORE, Number(score) || 0));
  const cleanOwner = (ownerToken || "").trim();
  const raw = `sig_v4:${cleanName.toLowerCase()}:${scoreVal * 13 + 7}:${cleanOwner}:${ENTRY_SALT}`;
  return hashString(raw);
}

function verifyEntry(entry) {
  if (!entry || typeof entry !== "object" || !entry.name) return null;
  const cleanName = entry.name.trim().slice(0, 16);
  if (!cleanName || DUMMY_NAMES.has(cleanName)) return null;

  const scoreVal = Math.max(0, Math.min(MAX_REALISTIC_SCORE, Number(entry.score) || 0));
  const ownerToken = entry.ownerToken || "";
  const expectedSig = computeEntrySig(cleanName, scoreVal, ownerToken);

  if (entry.sig && entry.sig === expectedSig) {
    return {
      name: cleanName,
      score: scoreVal,
      avatar: entry.avatar || "🎣",
      ownerToken: entry.ownerToken,
      sig: expectedSig,
    };
  }

  // Check seed migration / restoration
  const seedKey = cleanName.toLowerCase();
  const seed = SEED_SCORES[seedKey];
  if (seed) {
    const validScore = Math.max(scoreVal, seed.score);
    const validOwner = entry.ownerToken || seed.ownerToken;
    const sig = computeEntrySig(seed.name, validScore, validOwner);
    return {
      name: seed.name,
      score: validScore,
      avatar: entry.avatar || "🎣",
      ownerToken: validOwner,
      sig,
    };
  }

  console.warn(`[Leaderboard Security] Rejected unsigned/tampered score for "${cleanName}" (${entry.score})`);
  return null;
}

function computeChecksum(entries) {
  const cleanStr = entries
    .map((e) => `${e.name}:${e.score}:${e.ownerToken || ""}:${e.sig || ""}`)
    .sort()
    .join("|");
  return hashString(cleanStr + SALT_KEY);
}

export function getPlayerName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch (err) {
    console.warn("Could not read player name:", err);
    return "";
  }
}

export function setPlayerName(name) {
  const clean = name.trim().slice(0, 16) || "Angler 1";
  try {
    localStorage.setItem(NAME_KEY, clean);
  } catch (err) {
    console.warn("Could not save player name:", err);
  }
  return clean;
}

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.entries)) {
        const verified = parsed.entries.map(verifyEntry).filter(Boolean);
        if (parsed.checksum && parsed.checksum === computeChecksum(verified)) {
          return verified;
        } else if (verified.length > 0) {
          saveLeaderboard(verified);
          return verified;
        }
      }
    }
  } catch (err) {
    console.warn("Could not load leaderboard:", err);
  }
  return [];
}

function saveLeaderboard(entries) {
  try {
    const cleanEntries = entries
      .map((e) => {
        const verified = verifyEntry(e);
        if (!verified) return null;
        const ownerToken = verified.ownerToken || (verified.name.toLowerCase() === (getPlayerName() || "").toLowerCase() ? getOwnerTokenHash() : undefined);
        const sig = computeEntrySig(verified.name, verified.score, ownerToken);
        return {
          name: verified.name,
          score: verified.score,
          avatar: verified.avatar || "🎣",
          ownerToken,
          sig,
        };
      })
      .filter(Boolean);

    const payload = {
      entries: cleanEntries,
      checksum: computeChecksum(cleanEntries),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Could not save leaderboard:", err);
  }
}

export function isNameTaken(name, cachedCloudEntries = []) {
  if (!name) return false;
  const cleanName = name.trim().slice(0, 16).toLowerCase();
  if (!cleanName) return false;

  const currentOwnerHash = getOwnerTokenHash();
  const currentSavedName = (getPlayerName() || "").trim().toLowerCase();

  if (cleanName === currentSavedName) return false;

  const localEntries = loadLeaderboard();
  const allEntries = [...localEntries, ...cachedCloudEntries];
  for (const rawEntry of allEntries) {
    const entry = verifyEntry(rawEntry);
    if (entry && entry.name && entry.name.trim().toLowerCase() === cleanName) {
      if (entry.ownerToken && entry.ownerToken !== currentOwnerHash) {
        return true;
      }
    }
  }
  return false;
}

function mergeEntries(localList = [], cloudList = []) {
  const currentPlayer = getPlayerName() || "Angler 1";
  const myOwnerHash = getOwnerTokenHash();
  const map = new Map();

  const processEntry = (rawEntry) => {
    const e = verifyEntry(rawEntry);
    if (!e) return;
    const cleanName = e.name;
    const key = cleanName.toLowerCase();
    const scoreVal = e.score;
    const isCurrentPlayer = key === currentPlayer.toLowerCase();
    const ownerToken = e.ownerToken || (isCurrentPlayer ? myOwnerHash : undefined);
    const sig = computeEntrySig(cleanName, scoreVal, ownerToken);

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        name: cleanName,
        score: scoreVal,
        avatar: e.avatar || "🎣",
        ownerToken,
        sig,
      });
    } else {
      if (scoreVal > existing.score) {
        existing.score = scoreVal;
        const newOwner = ownerToken || existing.ownerToken || (isCurrentPlayer ? myOwnerHash : undefined);
        existing.ownerToken = newOwner;
        existing.sig = computeEntrySig(cleanName, scoreVal, newOwner);
      } else if (isCurrentPlayer && myOwnerHash) {
        existing.ownerToken = myOwnerHash;
        existing.sig = computeEntrySig(cleanName, existing.score, myOwnerHash);
      }
    }
  };

  cloudList.forEach(processEntry);
  localList.forEach(processEntry);

  // Ensure seed scores exist if not present
  Object.values(SEED_SCORES).forEach((seed) => {
    const key = seed.name.toLowerCase();
    if (!map.has(key)) {
      const sig = computeEntrySig(seed.name, seed.score, seed.ownerToken);
      map.set(key, {
        name: seed.name,
        score: seed.score,
        avatar: "🎣",
        ownerToken: seed.ownerToken,
        sig,
      });
    }
  });

  const merged = Array.from(map.values());
  merged.sort((a, b) => b.score - a.score);

  return merged.map((entry, idx) => {
    const isUser = entry.name.toLowerCase() === currentPlayer.toLowerCase();
    return {
      ...entry,
      rank: idx + 1,
      isUser,
    };
  });
}

function formatLeaderboardState(entries, currentScore = 0) {
  const playerName = getPlayerName() || "Angler 1";
  const userEntry = entries.find((e) => e.isUser || e.name.toLowerCase() === playerName.toLowerCase());
  const userRank = userEntry ? userEntry.rank : entries.length ? entries.length + 1 : 1;
  const allTimeHighScore = entries[0] ? entries[0].score : currentScore;
  const allTimeLeader = entries[0] ? entries[0].name : playerName;
  const userBest = userEntry ? Math.max(userEntry.score, currentScore) : currentScore;

  return {
    currentScore,
    allTimeHighScore,
    allTimeLeader,
    userRank,
    totalPlayers: entries.length,
    userBest,
    isNewRecord: currentScore >= allTimeHighScore && currentScore > 0,
    entries,
  };
}

let cachedCloudEntries = [];

export function getCachedCloudEntries() {
  return cachedCloudEntries;
}

export async function fetchGlobalLeaderboard(currentScore = 0) {
  try {
    const response = await fetch(CLOUD_API_URL, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      const rawCloudEntries = Array.isArray(data?.data?.entries) ? data.data.entries : [];
      const verifiedCloudEntries = rawCloudEntries.map(verifyEntry).filter(Boolean);
      cachedCloudEntries = verifiedCloudEntries;
      const localEntries = loadLeaderboard();
      const merged = mergeEntries(localEntries, verifiedCloudEntries);
      saveLeaderboard(merged);

      // Auto-heal cloud backend if tampered entries were discarded or seeds restored
      if (verifiedCloudEntries.length !== rawCloudEntries.length || rawCloudEntries.length === 0) {
        const cleanCloudPayload = merged.map((e) => ({
          name: e.name,
          score: e.score,
          ownerToken: e.ownerToken,
          sig: e.sig || computeEntrySig(e.name, e.score, e.ownerToken),
        }));
        void putToCloudWithRetry(cleanCloudPayload).catch(() => {});
      }

      return formatLeaderboardState(merged, currentScore);
    }
  } catch (err) {
    console.warn("Could not fetch global leaderboard from cloud:", err);
  }
  const localEntries = loadLeaderboard();
  return formatLeaderboardState(mergeEntries(localEntries, cachedCloudEntries), currentScore);
}

function verifyRoundToken(score, token) {
  if (typeof score !== "number" || isNaN(score) || score < 0 || score > MAX_REALISTIC_SCORE) {
    return false;
  }
  if (score === 0) return true;
  if (!token || typeof token !== "object") {
    console.warn("Score rejected: Missing round validation token.");
    return false;
  }
  const expectedSig = hashString(`${score}:${token.catchesCount || 0}:${token.nonce || ""}:${SALT_KEY}`);
  if (token.sig !== expectedSig) {
    console.warn("Score rejected: Tampered signature detected.");
    return false;
  }
  if (token.score !== score) {
    console.warn("Score rejected: Score mismatch with validation token.");
    return false;
  }
  return true;
}

export function createRoundToken(score, catchesCount, nonce) {
  const sig = hashString(`${score}:${catchesCount}:${nonce}:${SALT_KEY}`);
  return { score, catchesCount, nonce, sig };
}

async function putToCloudWithRetry(cleanCloudPayload, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const putRes = await fetch(CLOUD_API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: CLOUD_BIN_NAME,
          data: { entries: cleanCloudPayload },
        }),
      });
      if (putRes.ok) return true;
      console.warn(`Cloud PUT attempt ${attempt} failed with status:`, putRes.status);
    } catch (err) {
      console.warn(`Cloud PUT attempt ${attempt} network error:`, err);
    }
    await new Promise((res) => setTimeout(res, attempt * 400));
  }
  return false;
}

async function syncScoreToCloud(score, validationToken, onUpdate) {
  const playerName = getPlayerName() || "Angler 1";
  const myOwnerHash = getOwnerTokenHash();

  if (!verifyRoundToken(score, validationToken)) {
    console.warn("syncScoreToCloud blocked: Invalid score or token.");
    const entries = loadLeaderboard();
    const state = formatLeaderboardState(mergeEntries(entries, cachedCloudEntries), 0);
    if (typeof onUpdate === "function") onUpdate(state);
    return state;
  }

  const localEntries = loadLeaderboard();

  let userIndex = localEntries.findIndex((e) => e.name.toLowerCase() === playerName.toLowerCase());
  const userSig = computeEntrySig(playerName, score, myOwnerHash);
  if (userIndex >= 0) {
    localEntries[userIndex].name = playerName;
    localEntries[userIndex].ownerToken = myOwnerHash;
    if (score > localEntries[userIndex].score) {
      localEntries[userIndex].score = score;
      localEntries[userIndex].sig = userSig;
    }
  } else {
    localEntries.push({ name: playerName, score, avatar: "🎣", ownerToken: myOwnerHash, sig: userSig });
  }

  try {
    const getRes = await fetch(CLOUD_API_URL, { cache: "no-store" });
    let cloudEntries = [];
    if (getRes.ok) {
      const data = await getRes.json();
      if (Array.isArray(data?.data?.entries)) {
        cloudEntries = data.data.entries.map(verifyEntry).filter(Boolean);
        cachedCloudEntries = cloudEntries;
      }
    }

    const merged = mergeEntries(localEntries, cloudEntries);
    saveLeaderboard(merged);

    const cleanCloudPayload = merged.map((e) => ({
      name: e.name,
      score: e.score,
      ownerToken: e.ownerToken,
      sig: e.sig || computeEntrySig(e.name, e.score, e.ownerToken),
    }));

    const success = await putToCloudWithRetry(cleanCloudPayload);
    if (success) {
      const state = formatLeaderboardState(merged, score);
      if (typeof onUpdate === "function") {
        onUpdate(state);
      }
      return state;
    }
  } catch (err) {
    console.warn("Could not sync score to cloud backend:", err);
  }

  const merged = mergeEntries(localEntries, cachedCloudEntries);
  saveLeaderboard(merged);
  const state = formatLeaderboardState(merged, score);
  if (typeof onUpdate === "function") {
    onUpdate(state);
  }
  return state;
}

export function recordScore(score, validationToken, onCloudSync) {
  const playerName = getPlayerName() || "Angler 1";
  const myOwnerHash = getOwnerTokenHash();

  if (!verifyRoundToken(score, validationToken)) {
    console.warn("recordScore rejected score tampering.");
    const entries = loadLeaderboard();
    const merged = mergeEntries(entries, cachedCloudEntries);
    return formatLeaderboardState(merged, 0);
  }

  const entries = loadLeaderboard();
  let userIndex = entries.findIndex((e) => e.name.toLowerCase() === playerName.toLowerCase());
  const userSig = computeEntrySig(playerName, score, myOwnerHash);
  if (userIndex >= 0) {
    entries[userIndex].isUser = true;
    entries[userIndex].name = playerName;
    entries[userIndex].ownerToken = myOwnerHash;
    if (score > entries[userIndex].score) {
      entries[userIndex].score = score;
      entries[userIndex].sig = userSig;
    }
  } else {
    entries.push({
      name: playerName,
      score: score,
      avatar: "🎣",
      isUser: true,
      ownerToken: myOwnerHash,
      sig: userSig,
    });
  }

  const merged = mergeEntries(entries, cachedCloudEntries);
  saveLeaderboard(merged);
  const initialState = formatLeaderboardState(merged, score);

  void syncScoreToCloud(score, validationToken, onCloudSync).catch(() => {});

  return initialState;
}

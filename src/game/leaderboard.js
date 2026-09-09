const STORAGE_KEY = "tank_tackle_leaderboard_v3";
const NAME_KEY = "tank_tackle_player_name";
const TOKEN_KEY = "tank_tackle_player_token";
const CLOUD_API_URL = "https://api.restful-api.dev/objects/ff808181a058d43f01a05d6101891019";
const CLOUD_BIN_NAME = "tank_and_tackle_global_leaderboard_v1";
const SALT_KEY = "tank_tackle_salt_99824_v3";
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

function computeChecksum(entries) {
  const cleanStr = entries
    .map((e) => `${e.name}:${e.score}:${e.ownerToken || ""}`)
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
      if (parsed && Array.isArray(parsed.entries) && parsed.checksum) {
        const expectedChecksum = computeChecksum(parsed.entries);
        if (parsed.checksum === expectedChecksum) {
          return parsed.entries.filter((e) => e && e.name && !DUMMY_NAMES.has(e.name));
        } else {
          console.warn("Leaderboard tampering detected in LocalStorage! Tampered score reset.");
        }
      } else if (Array.isArray(parsed)) {
        const valid = parsed.filter((e) => e && e.name && !DUMMY_NAMES.has(e.name));
        saveLeaderboard(valid);
        return valid;
      }
    }
  } catch (err) {
    console.warn("Could not load leaderboard:", err);
  }
  return [];
}

function saveLeaderboard(entries) {
  try {
    const cleanEntries = entries.map((e) => ({
      name: (e.name || "").trim().slice(0, 16),
      score: Math.max(0, Math.min(MAX_REALISTIC_SCORE, Number(e.score) || 0)),
      avatar: e.avatar || "🎣",
      ownerToken: e.ownerToken || (e.name.toLowerCase() === (getPlayerName() || "").toLowerCase() ? getOwnerTokenHash() : undefined),
    }));
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
  for (const entry of allEntries) {
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

  const processEntry = (e) => {
    if (!e || !e.name || DUMMY_NAMES.has(e.name)) return;
    const cleanName = e.name.trim().slice(0, 16);
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    const scoreVal = Math.max(0, Math.min(MAX_REALISTIC_SCORE, Number(e.score) || 0));
    const isCurrentPlayer = key === currentPlayer.toLowerCase();
    const ownerToken = e.ownerToken || (isCurrentPlayer ? myOwnerHash : undefined);

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        name: cleanName,
        score: scoreVal,
        avatar: e.avatar || "🎣",
        ownerToken,
      });
    } else {
      if (scoreVal > existing.score) {
        existing.score = scoreVal;
        if (ownerToken || isCurrentPlayer) {
          existing.ownerToken = ownerToken || myOwnerHash;
        }
      } else if (isCurrentPlayer && myOwnerHash) {
        existing.ownerToken = myOwnerHash;
      }
    }
  };

  cloudList.forEach(processEntry);
  localList.forEach(processEntry);

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
      const cloudEntries = Array.isArray(data?.data?.entries) ? data.data.entries : [];
      cachedCloudEntries = cloudEntries;
      const localEntries = loadLeaderboard();
      const merged = mergeEntries(localEntries, cloudEntries);
      saveLeaderboard(merged);
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
  if (userIndex >= 0) {
    localEntries[userIndex].name = playerName;
    localEntries[userIndex].ownerToken = myOwnerHash;
    if (score > localEntries[userIndex].score) {
      localEntries[userIndex].score = score;
    }
  } else {
    localEntries.push({ name: playerName, score, avatar: "🎣", ownerToken: myOwnerHash });
  }

  try {
    const getRes = await fetch(CLOUD_API_URL, { cache: "no-store" });
    let cloudEntries = [];
    if (getRes.ok) {
      const data = await getRes.json();
      if (Array.isArray(data?.data?.entries)) {
        cloudEntries = data.data.entries;
        cachedCloudEntries = cloudEntries;
      }
    }

    const merged = mergeEntries(localEntries, cloudEntries);
    saveLeaderboard(merged);

    const cleanCloudPayload = merged.map((e) => ({
      name: e.name,
      score: e.score,
      ownerToken: e.ownerToken,
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
  if (userIndex >= 0) {
    entries[userIndex].isUser = true;
    entries[userIndex].name = playerName;
    entries[userIndex].ownerToken = myOwnerHash;
    if (score > entries[userIndex].score) {
      entries[userIndex].score = score;
    }
  } else {
    entries.push({
      name: playerName,
      score: score,
      avatar: "🎣",
      isUser: true,
      ownerToken: myOwnerHash,
    });
  }

  const merged = mergeEntries(entries, cachedCloudEntries);
  saveLeaderboard(merged);
  const initialState = formatLeaderboardState(merged, score);

  void syncScoreToCloud(score, validationToken, onCloudSync).catch(() => {});

  return initialState;
}



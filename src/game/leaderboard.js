const STORAGE_KEY = "tank_tackle_leaderboard_v3";
const NAME_KEY = "tank_tackle_player_name";
const CLOUD_API_URL = "https://api.restful-api.dev/objects/ff808181a058d43f01a05d6101891019";
const CLOUD_BIN_NAME = "tank_and_tackle_global_leaderboard_v1";

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

export function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((e) => e && e.name && !DUMMY_NAMES.has(e.name));
      }
    }
  } catch (err) {
    console.warn("Could not load leaderboard:", err);
  }
  return [];
}

export function saveLeaderboard(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn("Could not save leaderboard:", err);
  }
}

export function mergeEntries(localList = [], cloudList = []) {
  const currentPlayer = getPlayerName() || "Angler 1";
  const map = new Map();

  const processEntry = (e) => {
    if (!e || !e.name || DUMMY_NAMES.has(e.name)) return;
    const cleanName = e.name.trim().slice(0, 16);
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    const existing = map.get(key);
    const scoreVal = Number(e.score) || 0;
    if (!existing || scoreVal > existing.score) {
      map.set(key, {
        name: cleanName,
        score: scoreVal,
        avatar: e.avatar || "🎣",
      });
    }
  };

  localList.forEach(processEntry);
  cloudList.forEach(processEntry);

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

export function formatLeaderboardState(entries, currentScore = 0) {
  const playerName = getPlayerName() || "Angler 1";
  const userEntry = entries.find((e) => e.isUser || e.name.toLowerCase() === playerName.toLowerCase());
  const userRank = userEntry ? userEntry.rank : entries.length || 1;
  const allTimeHighScore = entries[0] ? entries[0].score : currentScore;
  const allTimeLeader = entries[0] ? entries[0].name : playerName;
  const userBest = userEntry ? userEntry.score : currentScore;

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

export async function fetchGlobalLeaderboard(currentScore = 0) {
  try {
    const response = await fetch(CLOUD_API_URL, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      const cloudEntries = Array.isArray(data?.data?.entries) ? data.data.entries : [];
      const localEntries = loadLeaderboard();
      const merged = mergeEntries(localEntries, cloudEntries);
      saveLeaderboard(merged);
      return formatLeaderboardState(merged, currentScore);
    }
  } catch (err) {
    console.warn("Could not fetch global leaderboard from cloud:", err);
  }
  const localEntries = loadLeaderboard();
  return formatLeaderboardState(mergeEntries(localEntries, []), currentScore);
}

export async function syncScoreToCloud(score, onUpdate) {
  const playerName = getPlayerName() || "Angler 1";
  const localEntries = loadLeaderboard();

  let userIndex = localEntries.findIndex((e) => e.name.toLowerCase() === playerName.toLowerCase());
  if (userIndex >= 0) {
    if (score > localEntries[userIndex].score) {
      localEntries[userIndex].score = score;
    }
  } else {
    localEntries.push({ name: playerName, score, avatar: "🎣" });
  }

  try {
    const getRes = await fetch(CLOUD_API_URL, { cache: "no-store" });
    let cloudEntries = [];
    if (getRes.ok) {
      const data = await getRes.json();
      if (Array.isArray(data?.data?.entries)) {
        cloudEntries = data.data.entries;
      }
    }

    const merged = mergeEntries(localEntries, cloudEntries);
    saveLeaderboard(merged);

    const cleanCloudPayload = merged.map((e) => ({
      name: e.name,
      score: e.score,
      avatar: e.avatar || "🎣",
    }));

    const putRes = await fetch(CLOUD_API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: CLOUD_BIN_NAME,
        data: { entries: cleanCloudPayload },
      }),
    });

    if (putRes.ok) {
      const state = formatLeaderboardState(merged, score);
      if (typeof onUpdate === "function") {
        onUpdate(state);
      }
      return state;
    }
  } catch (err) {
    console.warn("Could not sync score to cloud backend:", err);
  }

  const merged = mergeEntries(localEntries, []);
  saveLeaderboard(merged);
  const state = formatLeaderboardState(merged, score);
  if (typeof onUpdate === "function") {
    onUpdate(state);
  }
  return state;
}

export function recordScore(score, onCloudSync) {
  const playerName = getPlayerName() || "Angler 1";
  const entries = loadLeaderboard();

  let userIndex = entries.findIndex((e) => e.name.toLowerCase() === playerName.toLowerCase());
  if (userIndex >= 0) {
    entries[userIndex].isUser = true;
    entries[userIndex].name = playerName;
    if (score > entries[userIndex].score) {
      entries[userIndex].score = score;
    }
  } else {
    entries.push({
      name: playerName,
      score: score,
      avatar: "🎣",
      isUser: true,
    });
  }

  const merged = mergeEntries(entries, []);
  saveLeaderboard(merged);
  const initialState = formatLeaderboardState(merged, score);

  void syncScoreToCloud(score, onCloudSync).catch(() => {});

  return initialState;
}

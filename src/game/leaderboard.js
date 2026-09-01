const STORAGE_KEY = "tank_tackle_leaderboard_v3";
const NAME_KEY = "tank_tackle_player_name";

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

export function recordScore(score) {
  const playerName = getPlayerName() || "Angler 1";
  const entries = loadLeaderboard();
  
  // Find existing entry for this user or create a new one
  let userIndex = entries.findIndex((e) => e.isUser || e.name === playerName);
  
  if (userIndex >= 0) {
    const existing = entries[userIndex];
    existing.isUser = true;
    existing.name = playerName;
    if (score > existing.score) {
      existing.score = score;
    }
  } else {
    entries.push({
      name: playerName,
      score: score,
      avatar: "🎣",
      isUser: true,
    });
  }

  // Sort descending by score
  entries.sort((a, b) => b.score - a.score);

  // Assign ranks
  entries.forEach((e, idx) => {
    e.rank = idx + 1;
  });

  saveLeaderboard(entries);

  // Recalculate rank for current score in this specific round
  const userEntry = entries.find((e) => e.isUser || e.name === playerName);
  const userRank = userEntry ? userEntry.rank : entries.length;
  const allTimeHighScore = entries[0] ? entries[0].score : score;
  const allTimeLeader = entries[0] ? entries[0].name : playerName;

  return {
    currentScore: score,
    allTimeHighScore,
    allTimeLeader,
    userRank,
    totalPlayers: entries.length,
    userBest: userEntry ? userEntry.score : score,
    isNewRecord: score >= allTimeHighScore && score > 0,
    entries,
  };
}

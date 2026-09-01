const STORAGE_KEY = "tank_tackle_leaderboard_v2";
const NAME_KEY = "tank_tackle_player_name";

const DEFAULT_ENTRIES = [
  { name: "SpectralKing", score: 4850, avatar: "👑" },
  { name: "ApexFisher", score: 4220, avatar: "🦈" },
  { name: "ElectroCaptain", score: 3890, avatar: "⚡" },
  { name: "PufferPro", score: 3450, avatar: "🐡" },
  { name: "TackleMaster", score: 3100, avatar: "⚓" },
  { name: "WaveRunner", score: 2780, avatar: "🌊" },
  { name: "PearlHunter", score: 2450, avatar: "💎" },
  { name: "GoldfishWhisperer", score: 2120, avatar: "🐟" },
  { name: "OctoDodger", score: 1890, avatar: "🦑" },
  { name: "BaitCatcher", score: 1650, avatar: "🎯" },
  { name: "ReefChallenger", score: 1420, avatar: "🏆" },
  { name: "DeepSeaScout", score: 1180, avatar: "🎣" },
  { name: "TidalWave", score: 950, avatar: "🌊" },
  { name: "AquariumRookie", score: 720, avatar: "🌟" },
];

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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Could not load leaderboard:", err);
  }
  return [...DEFAULT_ENTRIES];
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

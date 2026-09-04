export function createUI(shell) {
  shell.innerHTML = `
    <canvas class="game-surface" aria-label="Aquarium fishing game"></canvas>
    <div class="hud-row tank-hud">
      <div class="badge score-badge"><span class="hud-icon">★</span><span data-score>0</span></div>
      <div class="hud-actions">
        <div class="badge combo-badge" data-combo hidden>x2</div>
        <button class="guide-button" type="button" aria-label="Game Guide" data-open-guide title="Game Guide & Fish Points">📖</button>
        <button class="sound-button" type="button" aria-label="Mute sound" data-sound>♪</button>
        <div class="badge time-badge"><span data-time>60</span><span class="hud-unit">s</span></div>
      </div>
    </div>
    <div class="badge power-status" data-status hidden></div>
    <div class="badge event-banner" data-event hidden></div>
    <!-- Minimalist Sleek Glass Loading Overlay -->
    <div class="tank-loader-overlay theme-sleek-glass" data-tank-loader>
      <!-- Full Screen Rising Water Level -->
      <div class="full-tank-water" data-water-fill style="height: 0%;">
        <div class="sleek-neon-wave"></div>
        <div class="glass-bubble gb1"></div>
        <div class="glass-bubble gb2"></div>
        <div class="glass-bubble gb3"></div>
        <div class="glass-bubble gb4"></div>
        <div class="glass-bubble gb5"></div>
      </div>

      <!-- Centered Sleek Glassmorphism Card -->
      <div class="sleek-glass-card">
        <div class="sleek-badge-icon">🎣</div>
        <h1 class="sleek-loader-title">Tank &amp; Tackle</h1>
        <p class="sleek-loader-sub">Preparing Aquarium…</p>
        
        <div class="sleek-progress-wrapper">
          <div class="sleek-progress-track">
            <div class="sleek-progress-fill" data-progress-fill style="width: 0%;">
              <div class="sleek-shine-pulse"></div>
            </div>
          </div>
          <span class="sleek-progress-text" data-loader-text>0%</span>
        </div>
      </div>
    </div>

    <div class="hint" data-hint>Watch their tells · every fish behaves differently</div>
    <div class="start-overlay" data-start>
      <div class="start-card">
        <h1>Tank &amp; Tackle</h1>
        <p class="start-tagline">60s Aquarium Fishing Challenge</p>

        <!-- First-Time Player Name Input -->
        <div class="start-name-card" data-first-time-card>
          <label for="start-name-input" class="start-name-label">🎮 ENTER YOUR NAME</label>
          <div class="start-name-wrapper">
            <span class="start-name-icon">🎣</span>
            <input
              type="text"
              id="start-name-input"
              class="start-name-input"
              data-start-name-input
              placeholder="Enter your name..."
              maxlength="16"
              autocomplete="off"
            />
          </div>
          <p data-name-taken-error class="start-name-error" hidden></p>
        </div>

        <!-- Returning Player Welcome Back Card -->
        <div class="welcome-back-card" data-welcome-card hidden>
          <span class="welcome-label">WELCOME BACK</span>
          <div class="welcome-player-row">
            <span class="welcome-avatar">🎣</span>
            <strong class="welcome-name" data-welcome-name-display>Angler 1</strong>
            <button class="change-name-btn" type="button" data-change-saved-name title="Change Name">✏️ Edit</button>
          </div>
        </div>

        <div class="start-buttons-row">
          <button class="start-play-btn" type="button" data-start-play>Play Game 🎣</button>
          <button class="start-guide-btn" type="button" data-open-guide>📖 How to Play</button>
        </div>
        <p data-start-label class="start-status-label">Loading the aquarium…</p>
      </div>
    </div>

    <!-- Game Introduction / Fish Guide Modal -->
    <div class="guide-overlay" data-guide hidden>
      <div class="guide-card">
        <div class="guide-header">
          <h2>📖 Game Guide &amp; Rules</h2>
          <button class="guide-close-btn" type="button" data-close-guide aria-label="Close guide">✕</button>
        </div>
        
        <div class="guide-tabs">
          <button class="guide-tab is-active" data-tab="flow" type="button">⏱️ Flow &amp; Rules</button>
          <button class="guide-tab" data-tab="tricky" type="button">⚠️ Tricky Fish</button>
          <button class="guide-tab" data-tab="points" type="button">🐟 Fish Points</button>
        </div>

        <div class="guide-content">
          <!-- Section: Flow -->
          <div class="guide-section is-active" data-section="flow">
            <div class="guide-item">
              <div class="guide-icon">⏱️</div>
              <div>
                <strong>1 Minute Round (60 Seconds)</strong>
                <p>Catch as many fish as you can before the 60s timer expires to set your best high score!</p>
              </div>
            </div>
            <div class="guide-item">
              <div class="guide-icon">🎣</div>
              <div>
                <strong>Controls: Cast &amp; Reel</strong>
                <p>Drag or move to position your hook. Tap/Hold to lower your hook into the tank, release to reel up.</p>
              </div>
            </div>
            <div class="guide-item">
              <div class="guide-icon">🔥</div>
              <div>
                <strong>Combo Multiplier</strong>
                <p>Catching fish within 8s of each other builds a <strong>Combo multiplier up to x9</strong> for massive bonus points!</p>
              </div>
            </div>
            <div class="guide-item">
              <div class="guide-icon">💎</div>
              <div>
                <strong>Events &amp; Spectral Pearls</strong>
                <p>Hook <strong>Pirate Treasure Chests (+400 pts)</strong> and grab floating <strong>Spectral Pearls</strong> to unlock 8s Ghost Lens power!</p>
              </div>
            </div>
          </div>

          <!-- Section: Tricky & Uncatchable Fish -->
          <div class="guide-section" data-section="tricky">
            <div class="fish-card danger">
              <img src="/generated-assets/assets/crab.png" alt="Bait Crab" class="fish-icon" />
              <div class="fish-info">
                <div class="fish-title-row">
                  <strong>Bait Crab</strong>
                  <span class="badge-tag tag-danger">UNCATCHABLE!</span>
                </div>
                <p>0 pts · ⚠️ <strong>BAIT THIEF!</strong> Steals your hook's bait upon contact! You must reel all the way back up to re-bait.</p>
              </div>
            </div>
            <div class="fish-card warning">
              <img src="/generated-assets/assets/electric_fish.png" alt="Electric Fish" class="fish-icon" />
              <div class="fish-info">
                <div class="fish-title-row">
                  <strong>Electric Fish</strong>
                  <span class="badge-tag tag-warning">140 PTS</span>
                </div>
                <p>⚡ <strong>Zaps &amp; stuns</strong> your hook when charged! Catch it during its <strong>calm recharge phase</strong> (sparks off) or while <strong>Ghost Lens</strong> is active!</p>
              </div>
            </div>
            <div class="fish-card special">
              <img src="/generated-assets/assets/ghost_fish.png" alt="Ghost Fish" class="fish-icon" />
              <div class="fish-info">
                <div class="fish-title-row">
                  <strong>Ghost Fish</strong>
                  <span class="badge-tag tag-special">220 PTS</span>
                </div>
                <p>👻 <strong>Intangible!</strong> Hooks phase right through it normally. Catchable ONLY while <strong>Ghost Lens</strong> (Spectral Pearl) is active!</p>
              </div>
            </div>
            <div class="fish-card warning">
              <img src="/generated-assets/assets/puffer_fish.png" alt="Puffer Fish" class="fish-icon" />
              <div class="fish-info">
                <div class="fish-title-row">
                  <strong>Puffer Fish</strong>
                  <span class="badge-tag tag-points">150 PTS</span>
                </div>
                <p>🐡 <strong>Inflates &amp; bounces</strong> your line when expanded! Catch it <strong>before it inflates</strong> (swift drop when calm) or while <strong>Ghost Lens</strong> is active!</p>
              </div>
            </div>
            <div class="fish-card warning">
              <img src="/generated-assets/assets/angry_fish.png" alt="Angry Fish" class="fish-icon" />
              <div class="fish-info">
                <div class="fish-title-row">
                  <strong>Angry Fish</strong>
                  <span class="badge-tag tag-points">120 PTS</span>
                </div>
                <p>😡 Bumps your hook away if approached head-on! Must sneak up and catch from behind.</p>
              </div>
            </div>
            <div class="fish-card info">
              <img src="/generated-assets/assets/mini_shark.png" alt="Mini Shark" class="fish-icon" />
              <div class="fish-info">
                <div class="fish-title-row">
                  <strong>Mini Shark</strong>
                  <span class="badge-tag tag-points">190 PTS</span>
                </div>
                <p>🦈 Apex predator! Swiftly hunts down and eats smaller fish in the aquarium.</p>
              </div>
            </div>
          </div>

          <!-- Section: All Fish Points -->
          <div class="guide-section" data-section="points">
            <div class="points-grid">
              <div class="point-item jackpot">
                <img src="/generated-assets/assets/pirate_treasure.png" alt="Treasure" />
                <div class="p-details"><strong>Pirate Chest</strong><span class="p-pts gold">+400 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/ghost_fish.png" alt="Ghost Fish" />
                <div class="p-details"><strong>Ghost Fish</strong><span class="p-pts purple">220 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/mini_shark.png" alt="Mini Shark" />
                <div class="p-details"><strong>Mini Shark</strong><span class="p-pts">190 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/pearl_koi.png" alt="Pearl Koi" />
                <div class="p-details"><strong>Pearl Koi</strong><span class="p-pts">160 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/puffer_fish.png" alt="Puffer Fish" />
                <div class="p-details"><strong>Puffer Fish</strong><span class="p-pts">150 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/electric_fish.png" alt="Electric Fish" />
                <div class="p-details"><strong>Electric Fish</strong><span class="p-pts cyan">140 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/royal_beta.png" alt="Royal Betta" />
                <div class="p-details"><strong>Royal Betta</strong><span class="p-pts">120 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/angry_fish.png" alt="Angry Fish" />
                <div class="p-details"><strong>Angry Fish</strong><span class="p-pts">120 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/timid_fish.png" alt="Timid Fish" />
                <div class="p-details"><strong>Timid Fish</strong><span class="p-pts">90 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/rainbow_fish.png" alt="Rainbow Fish" />
                <div class="p-details"><strong>Rainbow Fish</strong><span class="p-pts rainbow">40 - 240 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/ember_fish.png" alt="Ember Goldfish" />
                <div class="p-details"><strong>Ember Goldfish</strong><span class="p-pts">75 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/lemon_tang.png" alt="Lemon Tang" />
                <div class="p-details"><strong>Lemon Tang</strong><span class="p-pts">60 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/school_fish.png" alt="School Fish" />
                <div class="p-details"><strong>School Fish</strong><span class="p-pts">55 PTS</span></div>
              </div>
              <div class="point-item">
                <img src="/generated-assets/assets/neon_tetra.png" alt="Neon Tetra" />
                <div class="p-details"><strong>Neon Tetra</strong><span class="p-pts">40 PTS</span></div>
              </div>
              <div class="point-item danger">
                <img src="/generated-assets/assets/crab.png" alt="Bait Crab" />
                <div class="p-details"><strong>Bait Crab</strong><span class="p-pts danger">0 PTS (BAIT THIEF)</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="guide-footer">
          <button class="guide-start-btn" type="button" data-guide-play>Play Game 🎣</button>
        </div>
      </div>
    </div>

    <div class="result-overlay" data-result hidden>
      <div class="result-card">
        <div class="result-header">
          <div class="result-title-group">
            <span class="result-kicker">TIME'S UP! ⏱️</span>
            <h2>Game Results</h2>
          </div>
          <button class="name-edit-btn" type="button" data-edit-name title="Tap to change player name">
            ✏️ <span data-player-name-display>Player 1</span>
          </button>
        </div>

        <!-- Top Summary Cards (Current Score, All-Time High Score, Global Rank) -->
        <div class="result-summary-grid">
          <div class="summary-card score-card">
            <span class="card-label">YOUR SCORE</span>
            <strong data-result-score>0</strong>
            <span class="card-sub">PTS</span>
          </div>
          
          <div class="summary-card record-card">
            <span class="card-label">👑 ALL-TIME RECORD</span>
            <strong data-alltime-score>0</strong>
            <span class="card-sub" data-alltime-holder>by —</span>
          </div>

          <div class="summary-card rank-card">
            <span class="card-label">YOUR RANK</span>
            <strong data-user-rank>#1</strong>
            <span class="card-sub" data-rank-sub>Global Position</span>
          </div>
        </div>

        <!-- Global Leaderboard Section -->
        <div class="leaderboard-section">
          <div class="leaderboard-header">
            <h3>🏆 Global High Scores</h3>
            <div class="leaderboard-tabs">
              <button class="lb-tab is-active" data-lb-tab="top" type="button">Top 10</button>
              <button class="lb-tab" data-lb-tab="near" type="button">Near You</button>
            </div>
          </div>

          <div class="leaderboard-list" data-lb-list>
            <!-- Rendered dynamically -->
          </div>
        </div>

        <div class="result-actions">
          <button class="replay-button" type="button" data-replay>Fish again 🎣</button>
          <button class="guide-button-secondary" type="button" data-open-guide>📖 Fish Guide</button>
        </div>
      </div>
    </div>
  `;

  const elements = {
    canvas: shell.querySelector("canvas"),
    score: shell.querySelector("[data-score]"),
    time: shell.querySelector("[data-time]"),
    combo: shell.querySelector("[data-combo]"),
    status: shell.querySelector("[data-status]"),
    event: shell.querySelector("[data-event]"),
    hint: shell.querySelector("[data-hint]"),
    start: shell.querySelector("[data-start]"),
    startLabel: shell.querySelector("[data-start-label]"),
    firstTimeCard: shell.querySelector("[data-first-time-card]"),
    welcomeCard: shell.querySelector("[data-welcome-card]"),
    welcomeNameDisplay: shell.querySelector("[data-welcome-name-display]"),
    changeSavedNameBtn: shell.querySelector("[data-change-saved-name]"),
    startNameInput: shell.querySelector("[data-start-name-input]"),
    nameTakenError: shell.querySelector("[data-name-taken-error]"),
    startPlayBtn: shell.querySelector("[data-start-play]"),
    tankLoader: shell.querySelector("[data-tank-loader]"),
    waterFill: shell.querySelector("[data-water-fill]"),
    progressFill: shell.querySelector("[data-progress-fill]"),
    loaderText: shell.querySelector("[data-loader-text]"),
    result: shell.querySelector("[data-result]"),
    resultScore: shell.querySelector("[data-result-score]"),
    alltimeScore: shell.querySelector("[data-alltime-score]"),
    alltimeHolder: shell.querySelector("[data-alltime-holder]"),
    userRank: shell.querySelector("[data-user-rank]"),
    rankSub: shell.querySelector("[data-rank-sub]"),
    playerNameDisplay: shell.querySelector("[data-player-name-display]"),
    editNameBtn: shell.querySelector("[data-edit-name]"),
    lbList: shell.querySelector("[data-lb-list]"),
    lbTabs: shell.querySelectorAll("[data-lb-tab]"),
    replay: shell.querySelector("[data-replay]"),
    sound: shell.querySelector("[data-sound]"),
    guide: shell.querySelector("[data-guide]"),
    openGuides: shell.querySelectorAll("[data-open-guide]"),
    closeGuide: shell.querySelector("[data-close-guide]"),
    guidePlay: shell.querySelector("[data-guide-play]"),
    tabs: shell.querySelectorAll("[data-tab]"),
    sections: shell.querySelectorAll("[data-section]"),
  };

  let hintTimer = 0;
  let isGuideOpen = false;
  let currentLbData = null;
  let activeLbTab = "top";

  // Tab switching handler for Guide
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetSection = tab.dataset.tab;
      elements.tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      elements.sections.forEach((s) => s.classList.toggle("is-active", s.dataset.section === targetSection));
    });
  });

  // Tab switching handler for Leaderboard
  elements.lbTabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.stopPropagation();
      activeLbTab = tab.dataset.lbTab;
      elements.lbTabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      renderLeaderboardRows();
    });
  });

  function renderLeaderboardRows() {
    if (!currentLbData || !elements.lbList) return;
    const entries = currentLbData.entries || [];
    let displayEntries = [...entries];

    if (activeLbTab === "top") {
      displayEntries = displayEntries.slice(0, 10);
    } else if (activeLbTab === "near") {
      const userIdx = entries.findIndex((e) => e.isUser);
      if (userIdx >= 0) {
        const start = Math.max(0, userIdx - 4);
        const end = Math.min(entries.length, start + 10);
        displayEntries = entries.slice(start, end);
      } else {
        displayEntries = displayEntries.slice(0, 10);
      }
    }

    if (displayEntries.length === 0) {
      elements.lbList.innerHTML = `
        <div class="lb-empty-msg">
          <span class="lb-empty-icon">🏆</span>
          <p>No high scores recorded yet.</p>
          <small>Play a round to claim the #1 spot!</small>
        </div>
      `;
      return;
    }

    elements.lbList.innerHTML = displayEntries
      .map((entry) => {
        const isTop3 = entry.rank <= 3;
        const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`;
        return `
          <div class="lb-row ${entry.isUser ? "is-user" : ""} ${isTop3 ? `top-${entry.rank}` : ""}">
            <div class="lb-rank-col">
              <span class="lb-rank-badge rank-${entry.rank}">${medal}</span>
            </div>
            <span class="lb-avatar">${entry.avatar || "🎣"}</span>
            <div class="lb-info-col">
              <div class="lb-name-row">
                <strong class="lb-name">${escapeHtml(entry.name)}</strong>
                ${entry.isUser ? '<span class="you-badge">YOU</span>' : ""}
              </div>
              <span class="lb-score-val">${entry.score.toLocaleString()} PTS</span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
  }

  function openGuide() {
    isGuideOpen = true;
    elements.guide.hidden = false;
  }

  function closeGuide() {
    isGuideOpen = false;
    elements.guide.hidden = true;
  }

  elements.openGuides.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openGuide();
    });
  });

  if (elements.closeGuide) {
    elements.closeGuide.addEventListener("click", (e) => {
      e.stopPropagation();
      closeGuide();
    });
  }

  return {
    elements,
    isGuideOpen: () => isGuideOpen,
    openGuide,
    closeGuide,
    getStartNameInput() { return elements.startNameInput?.value.trim() || ""; },
    setStartNameInput(val) { if (elements.startNameInput) elements.startNameInput.value = val; },
    setLoadingProgress(pct) {
      const rounded = Math.min(100, Math.max(0, Math.round(pct)));
      if (elements.waterFill) elements.waterFill.style.height = `${rounded}%`;
      if (elements.progressFill) elements.progressFill.style.width = `${rounded}%`;
      if (elements.loaderText) elements.loaderText.textContent = `${rounded}%`;
    },
    hideTankLoader() {
      if (elements.tankLoader) {
        elements.tankLoader.classList.add("is-loaded");
        setTimeout(() => {
          elements.tankLoader.hidden = true;
        }, 650);
      }
    },
    updateNameView(hasSavedName, name) {
      if (hasSavedName && name) {
        if (elements.firstTimeCard) elements.firstTimeCard.hidden = true;
        if (elements.welcomeCard) elements.welcomeCard.hidden = false;
        if (elements.welcomeNameDisplay) elements.welcomeNameDisplay.textContent = name;
      } else {
        if (elements.firstTimeCard) elements.firstTimeCard.hidden = false;
        if (elements.welcomeCard) elements.welcomeCard.hidden = true;
      }
    },
    showNameInputMode() {
      if (elements.firstTimeCard) elements.firstTimeCard.hidden = false;
      if (elements.welcomeCard) elements.welcomeCard.hidden = true;
    },
    setNameTakenError(msg) {
      if (elements.nameTakenError) {
        elements.nameTakenError.textContent = msg;
        elements.nameTakenError.hidden = false;
      }
      if (elements.startPlayBtn) elements.startPlayBtn.disabled = true;
    },
    clearNameTakenError() {
      if (elements.nameTakenError) {
        elements.nameTakenError.hidden = true;
        elements.nameTakenError.textContent = "";
      }
      if (elements.startPlayBtn) elements.startPlayBtn.disabled = false;
    },
    setReady() { elements.startLabel.textContent = "Ready!"; elements.start.classList.add("is-ready"); },
    setError() { elements.startLabel.textContent = "Aquarium could not load"; },
    hideStart() { elements.start.hidden = true; },
    update(state) {
      elements.score.textContent = state.score.toLocaleString();
      elements.time.textContent = Math.ceil(state.timeLeft).toString();
      elements.combo.hidden = state.combo < 2;
      elements.combo.textContent = `x${state.combo}`;
      elements.time.parentElement.classList.toggle("is-low", state.timeLeft <= 10);
      if (state.hook.stun > 0) {
        elements.status.hidden = false;
        elements.status.className = "badge power-status is-stunned";
        elements.status.textContent = `⚡ STUNNED ${state.hook.stun.toFixed(1)}s`;
      } else if (state.powerTime > 0) {
        elements.status.hidden = false;
        elements.status.className = "badge power-status is-powered";
        elements.status.textContent = `◉ GHOST LENS ${Math.ceil(state.powerTime)}s`;
      } else if (!state.hook.bait) {
        elements.status.hidden = false;
        elements.status.className = "badge power-status is-empty";
        elements.status.textContent = "NO BAIT · REEL UP";
      } else {
        elements.status.hidden = true;
      }
      if (state.event.type) {
        elements.event.hidden = false;
        elements.event.textContent = `${state.event.title} · ${Math.ceil(state.event.time)}s`;
        elements.event.dataset.type = state.event.type;
      } else {
        elements.event.hidden = true;
      }
    },
    showHint() {
      elements.hint.classList.add("is-visible");
      hintTimer = window.setTimeout(() => elements.hint.classList.remove("is-visible"), 4200);
    },
    showResults(lbData) {
      currentLbData = lbData;
      elements.resultScore.textContent = lbData.currentScore.toLocaleString();
      elements.alltimeScore.textContent = lbData.allTimeHighScore ? lbData.allTimeHighScore.toLocaleString() : "0";
      elements.alltimeHolder.textContent = lbData.allTimeLeader ? `by ${lbData.allTimeLeader}` : "by —";
      elements.userRank.textContent = `#${lbData.userRank}`;
      elements.rankSub.textContent = lbData.isNewRecord
        ? "🎉 NEW ALL-TIME RECORD!"
        : `You are #${lbData.userRank} of ${lbData.totalPlayers}`;
      if (elements.playerNameDisplay) {
        const playerName = lbData.entries.find((e) => e.isUser)?.name || "Player 1";
        elements.playerNameDisplay.textContent = playerName;
      }
      renderLeaderboardRows();
      elements.result.hidden = false;
    },
    hideResults() { elements.result.hidden = true; },
    destroy() { window.clearTimeout(hintTimer); },
  };
}

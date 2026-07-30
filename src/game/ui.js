export function createUI(shell) {
  shell.innerHTML = `
    <canvas class="game-surface" aria-label="Aquarium fishing game"></canvas>
    <div class="hud-row tank-hud">
      <div class="badge score-badge"><span class="hud-icon">★</span><span data-score>0</span></div>
      <div class="hud-actions">
        <div class="badge combo-badge" data-combo hidden>x2</div>
        <button class="sound-button" type="button" aria-label="Mute sound" data-sound>♪</button>
        <div class="badge time-badge"><span data-time>60</span><span class="hud-unit">s</span></div>
      </div>
    </div>
    <div class="badge power-status" data-status hidden></div>
    <div class="badge event-banner" data-event hidden></div>
    <div class="hint" data-hint>Watch their tells · every fish behaves differently</div>
    <div class="start-overlay" data-start>
      <div class="start-copy">
        <h1>Tank &amp; Tackle</h1>
        <p data-start-label>Loading the aquarium…</p>
      </div>
    </div>
    <div class="result-overlay" data-result hidden>
      <div class="result-panel">
        <span class="result-kicker">TIME'S UP</span>
        <strong data-result-score>0</strong>
        <span data-best>Best 0</span>
        <button class="replay-button" type="button" data-replay>Fish again</button>
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
    result: shell.querySelector("[data-result]"),
    resultScore: shell.querySelector("[data-result-score]"),
    best: shell.querySelector("[data-best]"),
    replay: shell.querySelector("[data-replay]"),
    sound: shell.querySelector("[data-sound]"),
  };
  let hintTimer = 0;

  return {
    elements,
    setReady() { elements.startLabel.textContent = "Tap to fish"; elements.start.classList.add("is-ready"); },
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
    showResults(score, best, isBest) {
      elements.resultScore.textContent = score.toLocaleString();
      elements.best.textContent = isBest ? "New best!" : `Best ${best.toLocaleString()}`;
      elements.result.hidden = false;
    },
    hideResults() { elements.result.hidden = true; },
    destroy() { window.clearTimeout(hintTimer); },
  };
}

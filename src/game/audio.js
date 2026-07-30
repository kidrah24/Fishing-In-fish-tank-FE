export function createAudioController(audioHandle, initialVolume) {
  const context = audioHandle?.context;
  let master;
  let musicGain;
  let musicTimer = 0;
  let musicStep = 0;
  let started = false;
  let muted = false;
  let volume = initialVolume;
  const active = new Set();

  if (context) {
    master = context.createGain();
    master.gain.value = 0.8;
    master.connect(context.destination);
    musicGain = context.createGain();
    musicGain.gain.value = volume;
    musicGain.connect(master);
  }

  function tone(frequency, duration, gainValue, type = "sine", destination = master, delay = 0) {
    if (!context || context.state !== "running" || muted) return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(destination);
    active.add(oscillator);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      gain.disconnect();
      active.delete(oscillator);
    }, { once: true });
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  function scheduleMusic() {
    if (!started) return;
    const notes = [261.63, 329.63, 392, 493.88, 392, 329.63, 293.66, 392];
    tone(notes[musicStep % notes.length], 1.35, 0.16, "sine", musicGain);
    if (musicStep % 2 === 0) tone(notes[(musicStep + 2) % notes.length] / 2, 1.8, 0.08, "triangle", musicGain, 0.08);
    musicStep += 1;
    musicTimer = window.setTimeout(scheduleMusic, 1450);
  }

  return {
    unlock() {
      if (!audioHandle) return;
      void audioHandle.unlock().then(() => {
        if (!started) {
          started = true;
          scheduleMusic();
        }
      }).catch(() => {});
    },
    setMusicVolume(value) {
      volume = value;
      if (musicGain && context) musicGain.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, 0.04);
    },
    toggleMuted() {
      muted = !muted;
      if (master && context) master.gain.setTargetAtTime(muted ? 0 : 0.8, context.currentTime, 0.03);
      return muted;
    },
    cast() {
      tone(330, 0.13, 0.11, "sine");
      tone(220, 0.18, 0.06, "triangle", master, 0.04);
    },
    reel() {
      tone(190, 0.12, 0.045, "sawtooth");
      tone(265, 0.1, 0.035, "triangle", master, 0.06);
    },
    catch(combo) {
      [0, 4, 7].forEach((semitones, index) => {
        tone(523.25 * 2 ** (semitones / 12) * (1 + Math.min(combo, 5) * 0.025), 0.38, 0.08, "sine", master, index * 0.055);
      });
    },
    special(type) {
      if (type === "zap") {
        tone(138, 0.42, 0.08, "sawtooth");
        tone(920, 0.18, 0.06, "square", master, 0.04);
      } else if (type === "power") {
        [660, 880, 1175].forEach((frequency, index) => tone(frequency, 0.42, 0.07, "sine", master, index * 0.07));
      } else if (type === "chomp" || type === "block" || type === "bump") {
        tone(type === "chomp" ? 105 : 155, 0.2, 0.09, "triangle");
        tone(85, 0.12, 0.05, "square", master, 0.03);
      } else {
        tone(240, 0.18, 0.055, "triangle");
        tone(180, 0.2, 0.04, "sine", master, 0.06);
      }
    },
    event(type) {
      const base = type === "blackout" ? 130 : type === "golden" ? 660 : type === "octopus" ? 196 : 392;
      tone(base, 0.48, 0.065, type === "blackout" ? "triangle" : "sine");
      tone(base * 1.5, 0.4, 0.055, "triangle", master, 0.08);
      tone(base * 2, 0.32, 0.04, "sine", master, 0.16);
    },
    destroy() {
      started = false;
      window.clearTimeout(musicTimer);
      active.forEach((node) => node.stop?.());
      active.clear();
    },
  };
}

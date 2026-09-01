import { rainbowValue, SPECIES } from "./species.js";

const random = (min, max) => min + Math.random() * (max - min);
const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const EVENT_TYPES = ["feeding", "bubbles", "golden", "blackout", "treasure", "current", "octopus"];
const speciesByName = new Map(SPECIES.map((species) => [species.name, species]));
const MAX_BUBBLES = 180;
const MAX_PARTICLES = 220;
const MAX_MESSAGES = 6;

export function createSimulation(config, events) {
  const state = {
    width: 1,
    height: 1,
    running: false,
    elapsed: 0,
    timeLeft: config.roundDuration,
    score: 0,
    combo: 0,
    lastCatchAt: -99,
    fish: [],
    bubbles: [],
    particles: [],
    messages: [],
    powerTime: 0,
    powerUp: { x: 0.5, y: 0.55, visible: true, cooldown: 0, phase: 0 },
    event: {
      type: null,
      title: "",
      time: 0,
      duration: 0,
      nextAt: random(20, 40),
      lastType: null,
      targetX: 0.5,
      targetY: 0.45,
      currentX: 0,
      currentY: 0,
      treasure: null,
      octopuses: [],
    },
    hook: { x: 0.5, y: 0, mode: "idle", caught: null, castHadFish: false, stun: 0, bait: true, wobble: 0 },
  };

  function surfaceY() {
    return Math.max(68, state.height * 0.105);
  }

  function fishCenterY(fish) {
    return fish.y - fish.size * 0.4;
  }

  function showMessage(text, sub, x, y, color = "#fff2a8") {
    state.messages.push({ text, sub, x, y, color, life: 1.35 });
    if (state.messages.length > MAX_MESSAGES) state.messages.splice(0, state.messages.length - MAX_MESSAGES);
  }

  function spawnFish(fish, fromEdge = false, forcedSpecies) {
    const species = forcedSpecies || SPECIES[Math.floor(Math.random() * SPECIES.length)];
    const sizeBase = Math.max(82, Math.min(130, Math.min(state.width, state.height) * 0.15));
    const direction = Math.random() < 0.5 ? -1 : 1;
    const bottom = state.height * 0.88;
    Object.assign(fish, {
      species,
      direction,
      targetDirection: direction,
      scaleX: direction,
      size: sizeBase * species.size * random(0.95, 1.05),
      x: fromEdge ? (direction > 0 ? -120 : state.width + 120) : random(50, Math.max(51, state.width - 50)),
      y: species.behavior === "crab" ? bottom : random(state.height * 0.28, state.height * 0.76),
      vx: direction * species.speed * random(0.9, 1.1),
      vy: random(-10, 10),
      phase: random(0, Math.PI * 2),
      speedScale: random(0.88, 1.14),
      caught: false,
      respawn: 0,
      inflate: 0,
      actionCooldown: random(0.4, 2.4),
      target: null,
      renderScale: 1,
      flash: 0,
    });
  }

  function syncFishCount(assignRoster = false) {
    const count = Math.max(1, Math.round(config.fishCount));
    while (state.fish.length < count) state.fish.push({});
    if (state.fish.length > count) state.fish.length = count;
    state.fish.forEach((fish, index) => {
      if (!fish.species || assignRoster) spawnFish(fish, false, assignRoster ? SPECIES[index % SPECIES.length] : undefined);
    });
  }

  function resize(width, height) {
    const firstLayout = state.width <= 1;
    state.width = width;
    state.height = height;
    state.hook.x = Math.max(28, Math.min(width - 28, state.hook.x > 1 ? state.hook.x : width * state.hook.x));
    if (state.hook.mode === "idle") state.hook.y = surfaceY() + 26;
    if (firstLayout) {
      state.powerUp.x = width * 0.52;
      state.powerUp.y = height * 0.58;
      state.event.targetX = width * 0.5;
      state.event.targetY = height * 0.46;
      state.fish.forEach((fish, index) => spawnFish(fish, false, SPECIES[index % SPECIES.length]));
    }
  }

  function reset() {
    state.running = true;
    state.elapsed = 0;
    state.timeLeft = config.roundDuration;
    state.score = 0;
    state.combo = 0;
    state.lastCatchAt = -99;
    state.powerTime = 0;
    state.particles.length = 0;
    state.messages.length = 0;
    Object.assign(state.event, {
      type: null,
      title: "",
      time: 0,
      duration: 0,
      nextAt: random(20, 40),
      lastType: null,
      targetX: state.width * 0.5,
      targetY: state.height * 0.46,
      currentX: 0,
      currentY: 0,
      treasure: null,
      octopuses: [],
    });
    Object.assign(state.hook, { mode: "idle", caught: null, castHadFish: false, stun: 0, bait: true, wobble: 0, y: surfaceY() + 26 });
    Object.assign(state.powerUp, { x: random(state.width * 0.22, state.width * 0.78), y: random(state.height * 0.4, state.height * 0.7), visible: true, cooldown: 0, phase: 0 });
    syncFishCount(true);
  }

  function startCast() {
    if (!state.running || state.hook.mode !== "idle") return false;
    state.hook.mode = "down";
    state.hook.castHadFish = false;
    events.onCast?.();
    return true;
  }

  function endCast() {
    if (!state.running || state.hook.mode !== "down") return;
    state.hook.mode = "up";
    events.onReel?.();
  }

  function addBurst(x, y, color, amount = 16) {
    for (let i = 0; i < amount * config.effectsIntensity; i += 1) {
      if (state.particles.length >= MAX_PARTICLES) break;
      const angle = random(0, Math.PI * 2);
      const speed = random(28, 105);
      state.particles.push({
        x, y, color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: random(0.45, 0.9),
        maxLife: 0.9,
        size: random(2, 6),
      });
    }
  }

  function chooseEvent() {
    const choices = EVENT_TYPES.filter((type) => type !== state.event.lastType);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function startEvent(type = chooseEvent()) {
    const event = state.event;
    const durations = { feeding: 10, bubbles: 9, golden: 11, blackout: 8, treasure: 12, current: 10, octopus: 11 };
    const titles = {
      feeding: "FEEDING TIME",
      bubbles: "BUBBLE STORM",
      golden: "GOLDEN HOUR",
      blackout: "BLACKOUT",
      treasure: "PIRATE TREASURE",
      current: "WATER CURRENT",
      octopus: "OCTOPUS INVASION",
    };
    Object.assign(event, {
      type,
      title: titles[type],
      duration: durations[type],
      time: durations[type],
      lastType: type,
      nextAt: state.elapsed + random(20, 40),
      targetX: random(state.width * 0.24, state.width * 0.76),
      targetY: random(state.height * 0.34, state.height * 0.66),
      currentX: 0,
      currentY: 0,
      treasure: null,
      octopuses: [],
    });

    if (type === "current") {
      event.currentX = (Math.random() < 0.5 ? -1 : 1) * random(52, 78);
      event.currentY = random(-13, 13);
      event.title = event.currentX > 0 ? "CURRENT →" : "← CURRENT";
    } else if (type === "treasure") {
      event.treasure = { x: random(state.width * 0.2, state.width * 0.8), y: state.height * 0.86, visible: true, phase: 0 };
    } else if (type === "octopus") {
      const size = Math.max(105, Math.min(150, Math.min(state.width, state.height) * 0.2));
      event.octopuses = [0.32, 0.52, 0.72].map((y, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        return {
          x: direction > 0 ? -size : state.width + size,
          y: state.height * y,
          size: size * (index === 1 ? 0.88 : 1),
          direction,
          phase: index * 1.7,
          hitCooldown: 0,
        };
      });
    } else if (type === "golden") {
      const rares = ["pearl_koi", "rainbow_fish", "ghost_fish"];
      const candidates = state.fish.filter((fish) => !fish.caught && fish.respawn <= 0 && fish.species.behavior !== "crab");
      rares.forEach((name, index) => {
        if (candidates[index]) spawnFish(candidates[index], true, speciesByName.get(name));
      });
    }

    showMessage(event.title, type === "treasure" ? "Hook it for +400" : "Aquarium event!", state.width * 0.5, state.height * 0.22, type === "golden" ? "#ffe27a" : "#d8fff5");
    events.onEvent?.(type);
  }

  function endEvent() {
    Object.assign(state.event, {
      type: null,
      title: "",
      time: 0,
      currentX: 0,
      currentY: 0,
      treasure: null,
      octopuses: [],
    });
  }

  function updateEvent(dt) {
    const event = state.event;
    if (!event.type) {
      if (state.elapsed >= event.nextAt) startEvent();
      return;
    }
    event.time -= dt;
    if (event.treasure) event.treasure.phase += dt * 2.2;
    if (event.type === "octopus") {
      event.octopuses.forEach((octopus) => {
        octopus.phase += dt * 3;
        octopus.hitCooldown = Math.max(0, octopus.hitCooldown - dt);
        octopus.x += octopus.direction * 88 * dt;
        octopus.y += Math.sin(octopus.phase) * 10 * dt;
        if (octopus.direction > 0 && octopus.x > state.width + octopus.size) octopus.x = -octopus.size;
        if (octopus.direction < 0 && octopus.x < -octopus.size) octopus.x = state.width + octopus.size;
        if (state.hook.mode !== "idle" && octopus.hitCooldown <= 0 && distance(octopus.x, octopus.y - octopus.size * 0.42, state.hook.x, state.hook.y) < octopus.size * 0.5) {
          state.hook.x += octopus.direction * 72;
          state.hook.x = Math.max(24, Math.min(state.width - 24, state.hook.x));
          state.hook.mode = "up";
          octopus.hitCooldown = 3;
          specialEvent("octopus", "TENTACLE TOSS!", "The octopus shoved your hook", null, "#ffc0d7");
        }
      });
    }
    if (event.time <= 0) endEvent();
  }

  function specialEvent(type, text, sub, fish, color) {
    showMessage(text, sub, fish?.x ?? state.hook.x, fish ? fishCenterY(fish) - 24 : state.hook.y - 26, color);
    events.onSpecial?.(type);
  }

  function hookFish(fish) {
    fish.caught = true;
    state.hook.caught = fish;
    state.hook.castHadFish = true;
    state.hook.mode = "up";
    addBurst(state.hook.x, state.hook.y, "#ffe58a", 18);
    events.onBite?.();
  }

  function currentFishPoints(fish) {
    return fish.species.behavior === "rainbow" ? rainbowValue(state.elapsed) : fish.species.points;
  }

  function landCatch() {
    const fish = state.hook.caught;
    const quick = state.elapsed - state.lastCatchAt < 8;
    state.combo = quick ? Math.min(9, state.combo + 1) : 1;
    state.lastCatchAt = state.elapsed;
    const gained = currentFishPoints(fish) * state.combo;
    state.score += gained;
    showMessage(`${fish.species.label}  +${gained}`, state.combo > 1 ? `x${state.combo} combo` : "Nice catch!", state.hook.x, surfaceY() + 70);
    addBurst(state.hook.x, surfaceY() + 28, fish.species.behavior === "ghost" ? "#d9bcff" : "#fff2a8", 26);
    fish.respawn = 0.8;
    fish.caught = false;
    events.onCatch?.(fish.species, state.combo, gained, state.score);
    state.hook.caught = null;
  }

  function finishCast() {
    if (state.hook.caught) landCatch();
    else if (!state.hook.castHadFish) state.combo = 0;
    state.hook.mode = "idle";
    state.hook.y = surfaceY() + 26;
    state.hook.bait = true;
    state.hook.stun = 0;
  }

  function updateShark(shark, dt) {
    shark.actionCooldown -= dt;
    if (!shark.target || shark.target.respawn > 0 || shark.target.caught) shark.target = null;
    if (!shark.target && shark.actionCooldown <= 0) {
      const prey = state.fish
        .filter((fish) => fish !== shark && fish.respawn <= 0 && !fish.caught && !["shark", "crab", "ghost"].includes(fish.species.behavior))
        .map((fish) => ({ fish, d: distance(shark.x, fishCenterY(shark), fish.x, fishCenterY(fish)) }))
        .filter((entry) => entry.d < Math.min(230, state.width * 0.55))
        .sort((a, b) => a.d - b.d)[0];
      shark.target = prey?.fish || null;
    }
    if (!shark.target) return false;
    const targetY = fishCenterY(shark.target);
    const dy = targetY - fishCenterY(shark);
    const dx = shark.target.x - shark.x;
    const d = Math.max(1, Math.hypot(dx, dy));
    shark.targetDirection = dx >= 0 ? 1 : -1;
    shark.vx = (dx / d) * 118;
    shark.vy = (dy / d) * 118;
    if (d < shark.size * 0.58) {
      addBurst(shark.target.x, targetY, "#bdf9ee", 12);
      specialEvent("chomp", "CHOMP!", "The shark stole a fish", shark, "#c8fff4");
      shark.target.respawn = 1.2;
      shark.target = null;
      shark.actionCooldown = 4.5;
    }
    return true;
  }

  function updateFish(dt) {
    const pressure = 1 + 0.18 * Math.min(1, state.elapsed / Math.max(1, config.roundDuration));
    const hookActive = state.hook.mode !== "idle";
    state.fish.forEach((fish) => {
      if (fish.respawn > 0) {
        fish.respawn -= dt;
        if (fish.respawn <= 0) spawnFish(fish, true, fish.species);
        return;
      }
      if (fish.caught) {
        fish.x += (state.hook.x - fish.x) * Math.min(1, dt * 10);
        fish.y = state.hook.y + fish.size * 0.42;
        fish.targetDirection = state.hook.x >= fish.x ? 1 : -1;
        const targetScaleX = fish.targetDirection;
        fish.scaleX = (fish.scaleX !== undefined ? fish.scaleX : fish.targetDirection) + (targetScaleX - (fish.scaleX !== undefined ? fish.scaleX : fish.targetDirection)) * Math.min(1, dt * 6);
        return;
      }
      fish.phase += dt * (fish.species.behavior === "rainbow" ? 3.0 : 1.8);
      fish.actionCooldown = Math.max(-1, fish.actionCooldown - dt);
      fish.flash = Math.max(0, fish.flash - dt);
      const behavior = fish.species.behavior;
      const centerY = fishCenterY(fish);
      const hookDistance = distance(fish.x, centerY, state.hook.x, state.hook.y);
      let targetVx = 0;
      let targetVy = 0;
      let specialMovement = false;

      if (state.event.type === "feeding" && behavior !== "crab") {
        const dx = state.event.targetX - fish.x;
        const dy = state.event.targetY - centerY;
        const d = Math.max(1, Math.hypot(dx, dy));
        fish.targetDirection = dx >= 0 ? 1 : -1;
        targetVx = (dx / d) * Math.min(92, d * 1.8);
        targetVy = (dy / d) * Math.min(92, d * 1.8);
        specialMovement = true;
      }

      if (state.event.type === "octopus") {
        const nearest = state.event.octopuses
          .map((octopus) => ({ octopus, d: distance(fish.x, centerY, octopus.x, octopus.y - octopus.size * 0.4) }))
          .sort((a, b) => a.d - b.d)[0];
        if (nearest?.d < 135) {
          const dx = fish.x - nearest.octopus.x;
          const dy = centerY - (nearest.octopus.y - nearest.octopus.size * 0.4);
          const d = Math.max(1, Math.hypot(dx, dy));
          fish.targetDirection = dx >= 0 ? 1 : -1;
          targetVx = (dx / d) * 105;
          targetVy = (dy / d) * 70;
          specialMovement = true;
        }
      }

      if (!specialMovement && behavior === "timid" && hookActive && hookDistance < 165) {
        fish.targetDirection = fish.x < state.hook.x ? -1 : 1;
        targetVx = fish.targetDirection * fish.species.speed * 2.5;
        targetVy = Math.sign(fish.y - state.hook.y) * 34;
        fish.flash = 0.18;
        specialMovement = true;
      } else if (!specialMovement && behavior === "angry" && hookActive && hookDistance < 175 && fish.actionCooldown <= 0) {
        const dx = state.hook.x - fish.x;
        const dy = state.hook.y - centerY;
        const d = Math.max(1, Math.hypot(dx, dy));
        fish.targetDirection = dx >= 0 ? 1 : -1;
        targetVx = (dx / d) * 112;
        targetVy = (dy / d) * 112;
        fish.flash = 0.2;
        specialMovement = true;
      } else if (!specialMovement && behavior === "shark") {
        specialMovement = updateShark(fish, dt);
        if (specialMovement) {
          targetVx = fish.vx;
          targetVy = fish.vy;
        }
      }

      if (behavior === "puffer") {
        const targetInflate = hookActive && hookDistance < 120 ? 1 : 0;
        fish.inflate += (targetInflate - fish.inflate) * Math.min(1, dt * 7);
        fish.renderScale = 1 + fish.inflate * 0.62;
      } else {
        fish.renderScale = 1;
      }

      if (!specialMovement) {
        const baseSpeed = fish.species.speed * (fish.speedScale || 1) * pressure;
        const margin = fish.size * fish.renderScale * 0.7;
        if (fish.x > state.width - margin && (fish.targetDirection || 1) > 0) {
          fish.targetDirection = -1;
        } else if (fish.x < margin && (fish.targetDirection || 1) < 0) {
          fish.targetDirection = 1;
        }
        targetVx = (fish.targetDirection || 1) * baseSpeed + Math.cos(state.elapsed * 1.2 + fish.phase) * 6;
        if (behavior === "crab") {
          targetVy = 0;
          fish.y = state.height * 0.88;
        } else {
          targetVy = Math.sin(fish.phase * 1.4) * 14;
        }
      }

      // Smooth acceleration physics
      const accelX = Math.min(1, dt * 3.5);
      const accelY = Math.min(1, dt * 3.5);
      fish.vx = (fish.vx || targetVx) + (targetVx - (fish.vx || targetVx)) * accelX;
      fish.vy = (fish.vy || targetVy) + (targetVy - (fish.vy || targetVy)) * accelY;

      // Smooth 3D turn-around scale interpolation
      const desiredScaleX = fish.vx >= 0 ? 1 : -1;
      if (fish.scaleX === undefined) fish.scaleX = desiredScaleX;
      fish.scaleX += (desiredScaleX - fish.scaleX) * Math.min(1, dt * 5.5);
      fish.direction = fish.scaleX >= 0 ? 1 : -1;

      // Position update
      fish.x += (fish.vx || 0) * dt;
      if (state.event.type === "current") {
        fish.x += state.event.currentX * dt;
        fish.y += state.event.currentY * dt;
      }
      if (behavior !== "crab") {
        fish.y += (fish.vy || 0) * dt;
      }

      const screenMargin = fish.size * fish.renderScale * 0.9;
      if (desiredScaleX > 0 && fish.x > state.width + screenMargin) fish.x = -screenMargin;
      if (desiredScaleX < 0 && fish.x < -screenMargin) fish.x = state.width + screenMargin;
      fish.y = Math.max(surfaceY() + fish.size * 0.5, Math.min(state.height * 0.88, fish.y));
    });
  }

  function collectPowerUp() {
    state.powerTime = 8;
    state.powerUp.visible = false;
    state.powerUp.cooldown = 13;
    addBurst(state.powerUp.x, state.powerUp.y, "#d7c0ff", 28);
    specialEvent("power", "SPECTRAL PEARL", "Ghost fish are solid for 8s", null, "#e6d5ff");
  }

  function isElectricZapping(fish) {
    if (state.powerTime > 0) return false;
    return ((state.elapsed + fish.phase * 2) % 6.0) < 3.2;
  }

  function handleFishContact(fish) {
    const behavior = fish.species.behavior;
    if (behavior === "crab") {
      if (state.hook.bait) {
        state.hook.bait = false;
        state.hook.mode = "up";
        fish.actionCooldown = 2;
        specialEvent("steal", "BAIT STOLEN!", "Reel up to re-bait", fish, "#ffb68f");
      }
      return;
    }
    if (behavior === "ghost" && state.powerTime <= 0) {
      if (fish.actionCooldown <= 0) {
        fish.actionCooldown = 1.5;
        specialEvent("phase", "PHASED THROUGH", "Get Ghost Lens to catch!", fish, "#dbc8ff");
      }
      return;
    }
    if (behavior === "electric" && isElectricZapping(fish)) {
      if (fish.actionCooldown <= 0) {
        state.hook.stun = 2;
        state.hook.wobble = 2;
        fish.actionCooldown = 2.5;
        addBurst(state.hook.x, state.hook.y, "#9efaff", 24);
        specialEvent("zap", "ZAPPED!", "Catch during recharge or Ghost Lens!", fish, "#aefcff");
      }
      return;
    }
    if (behavior === "puffer" && fish.inflate > 0.35 && state.powerTime <= 0) {
      state.hook.x += state.hook.x < fish.x ? -42 : 42;
      state.hook.x = Math.max(24, Math.min(state.width - 24, state.hook.x));
      state.hook.mode = "up";
      fish.actionCooldown = 1.5;
      specialEvent("block", "PUFFER BLOCK!", "Catch before it inflates or use Ghost Lens", fish, "#ffe29a");
      return;
    }
    if (behavior === "angry" && fish.actionCooldown <= 0) {
      const hookInFront = fish.direction * (state.hook.x - fish.x) > 0;
      if (hookInFront) {
        state.hook.x += fish.direction * 68;
        state.hook.x = Math.max(24, Math.min(state.width - 24, state.hook.x));
        state.hook.mode = "up";
        fish.actionCooldown = 3;
        specialEvent("bump", "ANGRY BUMP!", "Sneak up from behind", fish, "#ffb18d");
        return;
      }
    }
    if (!state.hook.bait) return;
    hookFish(fish);
  }

  function updatePowerUp(dt) {
    state.powerTime = Math.max(0, state.powerTime - dt);
    state.powerUp.phase += dt * 2.4;
    if (!state.powerUp.visible) {
      state.powerUp.cooldown -= dt;
      if (state.powerUp.cooldown <= 0) {
        state.powerUp.visible = true;
        state.powerUp.x = random(state.width * 0.18, state.width * 0.82);
        state.powerUp.y = random(state.height * 0.36, state.height * 0.72);
      }
    }
  }

  function updateHook(dt, input) {
    if (state.hook.mode === "idle") {
      if (input.left || input.right) {
        state.hook.x += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 260 * dt;
        input.pointerX = state.hook.x / state.width;
      } else {
        state.hook.x += (input.pointerX * state.width - state.hook.x) * Math.min(1, dt * 12);
      }
      state.hook.x = Math.max(28, Math.min(state.width - 28, state.hook.x));
      return;
    }

    state.hook.wobble = Math.max(0, state.hook.wobble - dt);
    if (state.hook.stun > 0) {
      state.hook.stun = Math.max(0, state.hook.stun - dt);
      return;
    }

    if (state.hook.mode === "down") {
      state.hook.y += config.dropSpeed * dt + (state.event.type === "current" ? state.event.currentY * 0.4 * dt : 0);
      if (state.event.type === "current") {
        state.hook.x += state.event.currentX * 0.24 * dt;
        state.hook.x = Math.max(24, Math.min(state.width - 24, state.hook.x));
      }
      if (state.hook.y >= state.height * 0.9) state.hook.mode = "up";

      if (state.powerUp.visible && distance(state.hook.x, state.hook.y, state.powerUp.x, state.powerUp.y) < 28) collectPowerUp();
      if (state.event.treasure?.visible && distance(state.hook.x, state.hook.y, state.event.treasure.x, state.event.treasure.y) < 52) {
        state.event.treasure.visible = false;
        state.score += 400;
        state.hook.castHadFish = true;
        state.hook.mode = "up";
        addBurst(state.event.treasure.x, state.event.treasure.y, "#ffe176", 36);
        showMessage("TREASURE!  +400", "Pirate jackpot", state.event.treasure.x, state.event.treasure.y - 42, "#ffe176");
        events.onSpecial?.("treasure");
      }
      if (state.hook.mode !== "down") return;

      for (const fish of state.fish) {
        if (fish.caught || fish.respawn > 0) continue;
        const scale = fish.renderScale || 1;
        const radiusX = fish.size * 0.58 * scale * (fish.species.behavior === "school" ? 1.45 : 1);
        const radiusY = fish.size * 0.42 * scale * (fish.species.behavior === "school" ? 1.35 : 1);
        const dx = (state.hook.x - fish.x) / radiusX;
        const dy = (state.hook.y - fishCenterY(fish)) / radiusY;
        if (dx * dx + dy * dy < 1) {
          handleFishContact(fish);
          if (state.hook.caught || state.hook.mode === "up" || state.hook.stun > 0) break;
        }
      }
    } else if (state.hook.mode === "up") {
      state.hook.y -= config.reelSpeed * dt;
      if (state.hook.y <= surfaceY() + 26) finishCast();
    }
  }

  function updateEffects(dt) {
    const bubbleRate = state.event.type === "bubbles" ? 26 : 4.5;
    if (state.bubbles.length < MAX_BUBBLES && Math.random() < dt * bubbleRate * config.effectsIntensity) {
      state.bubbles.push({ x: random(10, state.width - 10), y: state.height + 8, r: random(1.5, 5), speed: random(18, 42), phase: random(0, 7) });
    }
    state.bubbles.forEach((bubble) => {
      bubble.y -= bubble.speed * dt;
      bubble.phase += dt * 2;
      bubble.x += Math.sin(bubble.phase) * dt * 4 + (state.event.type === "current" ? state.event.currentX * 0.35 * dt : 0);
    });
    state.bubbles = state.bubbles.filter((bubble) => bubble.y > surfaceY());
    state.particles.forEach((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 55 * dt;
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);
    state.messages.forEach((message) => { message.life -= dt; message.y -= dt * 22; });
    state.messages = state.messages.filter((message) => message.life > 0);
  }

  function update(dt, input) {
    syncFishCount();
    if (state.running) {
      state.elapsed += dt;
      state.timeLeft = Math.max(0, config.roundDuration - state.elapsed);
      updateEvent(dt);
    }
    updateFish(dt);
    updateEffects(dt);
    updatePowerUp(dt);
    if (!state.running) return;
    updateHook(dt, input);
    if (state.timeLeft <= 0) {
      state.running = false;
      state.hook.mode = "idle";
      if (state.hook.caught) {
        state.hook.caught.caught = false;
        state.hook.caught = null;
      }
      events.onEnd?.(state.score);
    }
  }

  syncFishCount();
  return { state, resize, reset, startCast, endCast, update, surfaceY };
}

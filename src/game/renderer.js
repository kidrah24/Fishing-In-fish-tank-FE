import { rainbowValue } from "./species.js";

function coverRect(image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

function drawFallbackFish(ctx, fish, alpha = 1) {
  const size = fish.size * (fish.renderScale || 1);
  const behavior = fish.species?.behavior;
  const bodyColor = behavior === "angry"
    ? "#ff7b59"
    : behavior === "ghost"
      ? "#d9c4ff"
      : behavior === "electric"
        ? "#7cf7ff"
        : behavior === "shark"
          ? "#7f8aa3"
          : behavior === "crab"
            ? "#c6894a"
            : behavior === "rainbow"
              ? "#ff6b9a"
              : "#5fb7ff";
  const accentColor = behavior === "ghost" ? "#ffffff" : "#0f3d53";
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(fish.x, fish.y);
  ctx.scale(fish.direction, 1);
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(1.2, size * 0.05);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.62, size * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-size * 0.56, 0);
  ctx.lineTo(-size * 0.94, -size * 0.26);
  ctx.lineTo(-size * 0.94, size * 0.26);
  ctx.closePath();
  ctx.fillStyle = behavior === "angry" ? "#ffad7f" : "#4da8df";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 0.22, -size * 0.06, size * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 0.18, -size * 0.06, size * 0.03, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}

function drawFishSprite(ctx, image, fish, frameIndex = 0, numCols = 2, numRows = 1, alpha = 1) {
  if (!image || !image.complete || image.naturalWidth === 0) {
    drawFallbackFish(ctx, fish, alpha);
    return;
  }
  const frameW = image.width / numCols;
  const frameH = image.height / numRows;
  const col = Math.floor(frameIndex) % numCols;
  const row = Math.floor(frameIndex / numCols) % numRows;
  const cropX = col * frameW;
  const cropY = row * frameH;
  
  const targetSize = fish.size * (fish.renderScale || 1);
  const scale = targetSize / frameW;
  const facingDir = fish.facing || fish.direction || 1;
  const tiltAngle = (fish.vy || 0) * 0.003 * facingDir + Math.sin(fish.phase || 0) * 0.05;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(fish.x, fish.y);
  ctx.scale(facingDir >= 0 ? 1 : -1, 1);
  ctx.rotate(tiltAngle);
  ctx.drawImage(
    image,
    cropX, cropY, frameW, frameH,
    -frameW * scale / 2, -frameH * scale / 2,
    frameW * scale, frameH * scale
  );
  ctx.restore();
}

function drawItemImage(ctx, image, x, y, targetSize, alpha = 1) {
  if (!image || !image.complete || image.naturalWidth === 0) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255,244,188,0.88)";
    ctx.strokeStyle = "rgba(8,45,69,0.9)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, targetSize * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }
  const scale = targetSize / Math.max(image.width, image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function createRenderer(canvas, images, config) {
  const ctx = canvas.getContext("2d");
  let width = 1;
  let height = 1;
  let dpr = 1;

  const fishImages = {
    timid_fish: { img: images.timidFish, cols: 2, rows: 1 },
    angry_fish: { img: images.angryFish, cols: 2, rows: 1 },
    electric_fish: { img: images.electricFish, cols: 2, rows: 1 },
    puffer_fish: { img: images.pufferFish, cols: 2, rows: 1 },
    mini_shark: { img: images.miniShark, cols: 2, rows: 1 },
    crab: { img: images.crab, cols: 2, rows: 1 },
    school_fish: { img: images.schoolFish, cols: 2, rows: 1 },
    ghost_fish: { img: images.timidFish || images.rainbowFish, cols: 2, rows: 1 },
    rainbow_fish: { img: images.rainbowFish, cols: 2, rows: 1 },
    neon_tetra: { img: images.neonTetra, cols: 4, rows: 1 },
    lemon_tang: { img: images.lemonTang, cols: 4, rows: 1 },
    ember_fish: { img: images.emberFish, cols: 4, rows: 1 },
    royal_beta: { img: images.royalBeta, cols: 4, rows: 1 },
    pearl_koi: { img: images.pearlKoi, cols: 4, rows: 1 },
  };

  function resize(nextWidth, nextHeight) {
    const nextW = Math.max(1, nextWidth);
    const nextH = Math.max(1, nextHeight);
    const pixelBudgetRatio = Math.sqrt(1_500_000 / (nextW * nextH));
    const nextDpr = Math.max(1, Math.min(1.75, window.devicePixelRatio || 1, pixelBudgetRatio));
    const bufferWidth = Math.round(nextW * nextDpr);
    const bufferHeight = Math.round(nextH * nextDpr);
    width = nextW;
    height = nextH;
    dpr = nextDpr;
    if (canvas.width === bufferWidth && canvas.height === bufferHeight) return;
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawBackground(time) {
    if (images.background && images.background.complete && images.background.naturalWidth > 0) {
      const rect = coverRect(images.background, width, height);
      ctx.drawImage(images.background, rect.x, rect.y, rect.w, rect.h);
    } else {
      ctx.fillStyle = "#078e9d";
      ctx.fillRect(0, 0, width, height);
    }
    const shimmer = ctx.createLinearGradient(0, 0, width, height * 0.7);
    shimmer.addColorStop(0, `rgba(255,255,210,${0.035 + Math.sin(time * 0.7) * 0.012})`);
    shimmer.addColorStop(0.5, "rgba(255,255,255,0)");
    shimmer.addColorStop(1, "rgba(1,53,94,0.08)");
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, 0, width, height);
  }

  function drawBubbles(bubbles) {
    ctx.lineWidth = 1.2;
    bubbles.forEach((bubble) => {
      ctx.strokeStyle = "rgba(218,255,250,0.56)";
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.beginPath();
      ctx.arc(bubble.x - bubble.r * 0.28, bubble.y - bubble.r * 0.3, Math.max(0.6, bubble.r * 0.2), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawEventAtmosphere(event, time) {
    if (event.type === "golden") {
      const glow = ctx.createLinearGradient(0, 0, width, height);
      glow.addColorStop(0, "rgba(255,226,104,0.2)");
      glow.addColorStop(0.55, "rgba(255,199,71,0.07)");
      glow.addColorStop(1, "rgba(255,161,44,0.15)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255,244,173,0.72)";
      for (let i = 0; i < 12; i += 1) {
        const x = (i * 83 + time * 19) % width;
        const y = (i * 137 + Math.sin(time + i) * 24) % height;
        const r = 1.2 + (i % 3);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (event.type === "current") {
      ctx.save();
      ctx.strokeStyle = "rgba(208,255,248,0.24)";
      ctx.lineWidth = 2;
      const direction = Math.sign(event.currentX) || 1;
      for (let i = -2; i < 9; i += 1) {
        const y = (i * 92 + time * 48) % (height + 120) - 60;
        const x = direction > 0 ? -30 : width + 30;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(width * 0.5, y + direction * 28, direction > 0 ? width + 30 : -30, y + 52);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawAura(x, y, radius, inner, outer = "rgba(255,255,255,0)") {
    const aura = ctx.createRadialGradient(x, y, 1, x, y, radius);
    aura.addColorStop(0, inner);
    aura.addColorStop(1, outer);
    ctx.fillStyle = aura;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawCreature(fish, state, time, xOffset = 0, yOffset = 0, scale = 1) {
    const asset = fishImages[fish.species.name];
    const behavior = fish.species.behavior;
    const drawFish = { ...fish, x: fish.x + xOffset, y: fish.y + yOffset, size: fish.size * scale };
    let alpha = 1;

    if (behavior === "ghost") {
      alpha = state.powerTime > 0 ? 0.95 : 0.43 + Math.sin(time * 4 + fish.phase) * 0.1;
      drawAura(drawFish.x, drawFish.y - drawFish.size * 0.42, drawFish.size * 0.75, state.powerTime > 0 ? "rgba(220,190,255,0.32)" : "rgba(210,196,255,0.16)");
    } else if (behavior === "electric") {
      drawAura(drawFish.x, drawFish.y - drawFish.size * 0.4, drawFish.size * 0.65, "rgba(110,251,255,0.2)");
    } else if (behavior === "angry" && fish.flash > 0) {
      drawAura(drawFish.x, drawFish.y - drawFish.size * 0.42, drawFish.size * 0.76, "rgba(255,92,62,0.3)");
    } else if (behavior === "puffer" && fish.inflate > 0.2) {
      ctx.strokeStyle = `rgba(255,225,145,${0.25 + fish.inflate * 0.45})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drawFish.x, drawFish.y - drawFish.size * 0.43, drawFish.size * (0.5 + fish.inflate * 0.22), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (asset && asset.img) {
      const totalFrames = asset.cols * asset.rows;
      const frameIdx = Math.floor(time * (fish.species.behavior === "rainbow" ? 5.5 : 3.8) + fish.phase) % totalFrames;
      drawFishSprite(ctx, asset.img, drawFish, frameIdx, asset.cols, asset.rows, alpha);
    } else {
      drawFallbackFish(ctx, drawFish, alpha);
    }

    if (behavior === "electric") {
      ctx.strokeStyle = "rgba(183,255,255,0.84)";
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      const cy = drawFish.y - drawFish.size * 0.45;
      ctx.moveTo(drawFish.x - drawFish.size * 0.48, cy - 4);
      ctx.lineTo(drawFish.x - 8, cy - 12 + Math.sin(time * 20) * 4);
      ctx.lineTo(drawFish.x + 2, cy + 5);
      ctx.lineTo(drawFish.x + drawFish.size * 0.46, cy - 7);
      ctx.stroke();
    }
  }

  function drawSchool(fish, state, time) {
    const s = fish.size;
    const d = fish.direction;
    const offsets = [
      [0, 0, 1],
      [-d * s * 0.85, -s * 0.42, 0.83],
      [-d * s * 0.92, s * 0.42, 0.8],
      [-d * s * 1.65, -s * 0.08, 0.7],
      [-d * s * 1.55, s * 0.62, 0.64],
    ];
    offsets.forEach(([x, y, scale]) => drawCreature(fish, state, time, x, y, scale));
  }

  function drawRainbowValue(fish, elapsed) {
    const value = rainbowValue(elapsed);
    const x = fish.x;
    const y = fish.y - fish.size * 1.15;
    const hue = (elapsed * 150) % 360;
    ctx.font = `800 ${Math.max(11, Math.min(14, width * 0.034))}px Nunito, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(3,52,70,0.82)";
    roundedRect(ctx, x - 27, y - 12, 54, 24, 12);
    ctx.fill();
    ctx.fillStyle = `hsl(${hue} 90% 78%)`;
    ctx.fillText(`+${value}`, x, y + 5);
  }

  function drawPowerUp(powerUp, time) {
    if (!powerUp.visible) return;
    const bobY = powerUp.y + Math.sin(time * 2.8 + powerUp.phase) * 5;
    drawAura(powerUp.x, bobY, 42, "rgba(215,193,255,0.42)");
    drawItemImage(ctx, images.spectralPearl, powerUp.x, bobY, 44);
    ctx.strokeStyle = "rgba(224,207,255,0.72)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(powerUp.x, bobY, 22 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawEventProps(event, time) {
    if (event.type === "feeding") {
      drawAura(event.targetX, event.targetY, 44, "rgba(255,199,91,0.26)");
      drawItemImage(ctx, images.fishFood, event.targetX, event.targetY + Math.sin(time * 4) * 4, 46);
    }
    if (event.treasure?.visible) {
      const y = event.treasure.y + Math.sin(event.treasure.phase) * 3;
      drawAura(event.treasure.x, y, 72, "rgba(255,213,79,0.38)");
      drawItemImage(ctx, images.pirateTreasure, event.treasure.x, y, Math.min(104, width * 0.25));
    }
  }

  function drawOctopuses(event, time) {
    if (event.type !== "octopus") return;
    event.octopuses.forEach((octopus, index) => {
      const totalFrames = 4; // 2 cols x 2 rows
      const frameIdx = Math.floor(time * 7 + index) % totalFrames;
      drawFishSprite(ctx, images.octopus, { ...octopus, renderScale: 1 }, frameIdx, 2, 2, 0.97);
    });
  }

  function drawBlackout(state) {
    if (state.event.type !== "blackout") return;
    const radius = Math.max(92, Math.min(155, Math.min(width, height) * 0.22));
    const darkness = ctx.createRadialGradient(state.hook.x, state.hook.y, radius * 0.3, state.hook.x, state.hook.y, radius);
    darkness.addColorStop(0, "rgba(0,19,35,0.03)");
    darkness.addColorStop(0.55, "rgba(0,17,31,0.32)");
    darkness.addColorStop(1, "rgba(0,12,25,0.88)");
    ctx.fillStyle = darkness;
    ctx.fillRect(0, 0, width, height);
  }

  function drawRod(hook, surfaceY, time) {
    const top = Math.max(18, surfaceY - 45);
    const rodLength = Math.min(108, width * 0.24);
    const zapWobble = hook.wobble > 0 ? Math.sin(time * 42) * 5 : 0;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "#6d2f25";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(hook.x + rodLength * 0.68, top - 5);
    ctx.lineTo(hook.x, top + 18);
    ctx.stroke();
    ctx.strokeStyle = "#d97a44";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = "#f5c66d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hook.x + rodLength * 0.66, top - 6);
    ctx.lineTo(hook.x + 2, top + 16);
    ctx.stroke();
    ctx.fillStyle = "#f2bd5c";
    ctx.beginPath();
    ctx.arc(hook.x + rodLength * 0.43, top + 5, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#75452c";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    const sway = hook.mode === "up" ? Math.sin(time * 18) * 1.5 : 0;
    ctx.strokeStyle = hook.stun > 0 ? "rgba(166,255,255,0.96)" : "rgba(255,247,210,0.88)";
    ctx.lineWidth = hook.stun > 0 ? 2.3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(hook.x, top + 18);
    ctx.quadraticCurveTo(hook.x + sway + zapWobble, (top + hook.y) / 2, hook.x + zapWobble * 0.4, hook.y - 7);
    ctx.stroke();

    drawAura(hook.x, hook.y, hook.stun > 0 ? 34 : 22, hook.stun > 0 ? "rgba(120,251,255,0.55)" : "rgba(255,230,120,0.42)");
    ctx.strokeStyle = hook.stun > 0 ? "#d4ffff" : "#f6ca6b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hook.x, hook.y - 8);
    ctx.lineTo(hook.x, hook.y + 7);
    ctx.arc(hook.x + 5, hook.y + 7, 6, Math.PI, 0.15, true);
    ctx.stroke();

    if (hook.bait) drawItemImage(ctx, images.hookBait, hook.x + 8, hook.y + 14, 28);
    if (hook.stun > 0) {
      ctx.fillStyle = "#d9ffff";
      ctx.font = `800 ${Math.max(12, Math.min(16, width * 0.038))}px Nunito, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${hook.stun.toFixed(1)}s`, hook.x, hook.y - 25);
    }
  }

  function drawParticles(particles) {
    particles.forEach((particle) => {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawMessages(messages) {
    ctx.textAlign = "center";
    messages.forEach((message) => {
      const alpha = Math.min(1, message.life * 2);
      const panelWidth = Math.min(230, width * 0.68);
      const x = Math.max(panelWidth / 2 + 8, Math.min(width - panelWidth / 2 - 8, message.x));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(5,55,75,0.84)";
      roundedRect(ctx, x - panelWidth / 2, message.y - 27, panelWidth, 52, 18);
      ctx.fill();
      ctx.fillStyle = message.color || "#fff6c9";
      ctx.font = `800 ${Math.max(14, Math.min(19, width * 0.043))}px Nunito, sans-serif`;
      ctx.fillText(message.text, x, message.y - 4);
      ctx.fillStyle = "#a8f4e5";
      ctx.font = `800 ${Math.max(10, Math.min(13, width * 0.031))}px Nunito, sans-serif`;
      ctx.fillText(message.sub, x, message.y + 15);
    });
    ctx.globalAlpha = 1;
  }

  function render(state, surfaceY, time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawBackground(time);
    drawEventAtmosphere(state.event, time);
    drawBubbles(state.bubbles);
    drawPowerUp(state.powerUp, time);
    drawEventProps(state.event, time);
    state.fish
      .filter((fish) => fish.respawn <= 0 && !fish.caught)
      .sort((a, b) => a.y - b.y)
      .forEach((fish) => {
        if (fish.species.behavior === "school") drawSchool(fish, state, time);
        else drawCreature(fish, state, time);
        if (fish.species.behavior === "rainbow") drawRainbowValue(fish, state.elapsed);
      });
    drawOctopuses(state.event, time);
    drawRod(state.hook, surfaceY, time);
    if (state.hook.caught) drawCreature(state.hook.caught, state, time);
    drawBlackout(state);
    drawParticles(state.particles);
    drawMessages(state.messages);

    if (config.effectsIntensity > 0.2) {
      ctx.strokeStyle = "rgba(205,255,246,0.28)";
      ctx.lineWidth = Math.max(2, width * 0.008);
      ctx.strokeRect(2, 2, width - 4, height - 4);
    }
  }

  return { resize, render };
}

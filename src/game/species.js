export const SPECIES = [
  { name: "timid_fish", label: "Timid Fish", points: 90, speed: 48, size: 0.8, behavior: "timid", sheet: "specialA" },
  { name: "angry_fish", label: "Angry Fish", points: 120, speed: 48, size: 0.86, behavior: "angry", sheet: "specialA" },
  { name: "electric_fish", label: "Electric Fish", points: 140, speed: 42, size: 0.95, behavior: "electric", sheet: "specialA" },
  { name: "puffer_fish", label: "Puffer Fish", points: 150, speed: 34, size: 0.86, behavior: "puffer", sheet: "specialA" },
  { name: "mini_shark", label: "Mini Shark", points: 190, speed: 45, size: 1.18, behavior: "shark", sheet: "specialA" },
  { name: "crab", label: "Bait Crab", points: 0, speed: 24, size: 0.9, behavior: "crab", sheet: "specialB" },
  { name: "school_fish", label: "School Fish", points: 55, speed: 55, size: 0.58, behavior: "school", sheet: "specialB" },
  { name: "ghost_fish", label: "Ghost Fish", points: 220, speed: 38, size: 0.93, behavior: "ghost", sheet: "specialB" },
  { name: "rainbow_fish", label: "Rainbow Fish", points: 80, speed: 63, size: 0.9, behavior: "rainbow", sheet: "specialB" },
  { name: "neon_tetra", label: "Neon Tetra", points: 40, speed: 61, size: 0.76, sheet: "normal" },
  { name: "lemon_tang", label: "Lemon Tang", points: 60, speed: 48, size: 0.95, sheet: "normal" },
  { name: "ember_fish", label: "Ember Goldfish", points: 75, speed: 43, size: 0.94, sheet: "normal" },
  { name: "royal_beta", label: "Royal Betta", points: 120, speed: 34, size: 1.04, sheet: "normal" },
  { name: "pearl_koi", label: "Pearl Koi", points: 160, speed: 31, size: 1.16, sheet: "normal" },
];

export const RAINBOW_VALUES = [40, 80, 160, 240];

export function rainbowValue(elapsed) {
  return RAINBOW_VALUES[Math.floor(elapsed * 2.4) % RAINBOW_VALUES.length];
}

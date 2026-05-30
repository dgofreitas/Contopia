export const EASINGS = {
  easeOut: [0.25, 0.1, 0.25, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  anticipate: [0.2, 0.6, 0.35, 1],
};

export const SPRINGS = {
  gentle: { stiffness: 120, damping: 14 },
  bouncy: { stiffness: 300, damping: 20 },
  stiff: { stiffness: 400, damping: 30 },
  snappy: { stiffness: 500, damping: 35 },
};

export const DURATIONS = {
  instant: 0,
  fast: 0.15,
  normal: 0.2,
  moderate: 0.3,
  slow: 0.5,
};

export const STAGGER = {
  perElementMs: 30,
  maxMs: 300,
};
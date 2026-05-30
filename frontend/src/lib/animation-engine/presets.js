export const DURATION = {
  entrance: 300,
  exit: 200,
  micro: 150,
};

export const EASING = {
  easeOut: [0.25, 0.1, 0.25, 1],
  anticipate: [0.36, 0, 0.66, -0.56],
  spring: 'spring',
};

export function getDuration(value) {
  if (typeof value === 'string' && value in DURATION) {
    return DURATION[value];
  }
  return value;
}

export function getEasing(value) {
  if (typeof value === 'string' && value in EASING) {
    return EASING[value];
  }
  return value;
}
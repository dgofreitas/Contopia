const inFlight = new WeakMap();

export function registerAnimation(element, handle) {
  inFlight.set(element, handle);
}

export function cancelAnimation(element) {
  const handle = inFlight.get(element);
  if (handle) {
    handle.cancel();
    inFlight.delete(element);
  }
}

export function isAnimating(element) {
  return inFlight.has(element);
}
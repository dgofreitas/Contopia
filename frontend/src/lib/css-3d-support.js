let cachedResult = undefined;

export function supportsPreserve3d() {
  if (cachedResult !== undefined) return cachedResult;

  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
    cachedResult = false;
    return false;
  }

  if (!CSS.supports('transform-style', 'preserve-3d')) {
    cachedResult = false;
    return false;
  }

  cachedResult = runtimeProbe();
  return cachedResult;
}

function runtimeProbe() {
  if (typeof document === 'undefined') return false;

  const outer = document.createElement('div');
  const inner = document.createElement('div');

  outer.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;pointer-events:none;overflow:hidden;';
  outer.style.transformStyle = 'preserve-3d';

  inner.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;';
  inner.style.transform = 'rotateY(45deg)';

  outer.appendChild(inner);
  document.documentElement.appendChild(outer);

  const computed = getComputedStyle(outer).transformStyle;
  const innerComputed = getComputedStyle(inner).transform;

  document.documentElement.removeChild(outer);

  return computed === 'preserve-3d' && innerComputed !== 'none';
}

export function resetCachedSupport() {
  cachedResult = undefined;
}
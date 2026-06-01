import { m, AnimatePresence, useReducedMotion } from 'framer-motion';

// Material ease-out — hardcoded per spec (not from animation-engine)
const MATERIAL_EASE_OUT = [0.4, 0, 0.2, 1];
const NORMAL_DURATION = 0.25; // 250ms in seconds
const REDUCED_DURATION = 0.15; // 150ms in seconds

export default function PageTurnAnimation({
  children,
  direction = 1,
  pageKey,
  onAnimationComplete,
  isEnabled = true,
  accelerateDuration = null,
}) {
  const prefersReducedMotion = useReducedMotion();

  // Reduced-motion path: opacity-only fade, no slide, 150ms
  if (prefersReducedMotion) {
    return (
      <AnimatePresence mode="wait" onExitComplete={onAnimationComplete}>
        <m.div
          key={pageKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: REDUCED_DURATION }}
          className="page-turn-container"
        >
          {children}
        </m.div>
      </AnimatePresence>
    );
  }

  // If animation is completely disabled (not reduced motion), render static
  if (!isEnabled) {
    return <div className="page-turn-container">{children}</div>;
  }

  // Determine effective duration: accelerateDuration overrides normal if set
  const effectiveDuration = accelerateDuration != null
    ? accelerateDuration / 1000 // convert ms → seconds
    : NORMAL_DURATION;

  return (
    <AnimatePresence mode="wait" onExitComplete={onAnimationComplete}>
      <m.div
        key={pageKey}
        initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: direction > 0 ? '-100%' : '100%', opacity: 0 }}
        transition={{
          duration: effectiveDuration,
          ease: MATERIAL_EASE_OUT,
        }}
        className="page-turn-container will-change-transform"
        style={{ willChange: 'transform' }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
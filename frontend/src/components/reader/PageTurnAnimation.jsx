import { m, AnimatePresence } from 'framer-motion';
import { useReducedMotion, getDuration, getEasing } from '../../lib/animation-engine/index.js';

/**
 * PageTurnAnimation — Framer Motion AnimatePresence wrapper for page turns.
 *
 * Uses horizontal slide animation for page transitions.
 * Respects prefers-reduced-motion by skipping animation entirely.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content to animate
 * @param {number} props.direction - 1 for next page (slide left), -1 for previous page (slide right)
 * @param {string} props.pageKey - Unique key for AnimatePresence (e.g. chapter-page index)
 * @param {Function} props.onAnimationComplete - Callback when exit animation finishes
 * @param {boolean} props.isEnabled - Whether animation is enabled
 */
export default function PageTurnAnimation({
  children,
  direction = 1,
  pageKey,
  onAnimationComplete,
  isEnabled = true,
}) {
  const prefersReducedMotion = useReducedMotion();

  // If reduced motion is preferred or animation is disabled, render without animation
  if (prefersReducedMotion || !isEnabled) {
    return <div className="page-turn-container">{children}</div>;
  }

  const slideVariants = {
    initial: {
      x: direction > 0 ? '100%' : '-100%',
      opacity: 1,
    },
    animate: {
      x: 0,
      opacity: 1,
    },
    exit: {
      x: direction > 0 ? '-100%' : '100%',
      opacity: 1,
    },
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={onAnimationComplete}>
      <m.div
        key={pageKey}
        variants={slideVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: getDuration('entrance') / 1000,
          ease: getEasing('easeOut'),
        }}
        className="page-turn-container will-change-transform"
        style={{ willChange: 'transform' }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
import { m, AnimatePresence } from 'framer-motion';
import { useReducedMotion, getDuration, getEasing } from '../../lib/animation-engine/index.js';

export default function PageTurnAnimation({
  children,
  direction = 1,
  pageKey,
  onAnimationComplete,
  isEnabled = true,
}) {
  const { prefersReducedMotion } = useReducedMotionConfig();

  if (prefersReducedMotion || !isEnabled) {
    return <div className="page-turn-container">{children}</div>;
  }

  const variants = slideVariants(direction, false);

  return (
    <AnimatePresence mode="wait" onExitComplete={onAnimationComplete}>
      <m.div
        key={pageKey}
        variants={variants}
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
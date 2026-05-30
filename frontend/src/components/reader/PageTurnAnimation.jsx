import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotionConfig } from '../../lib/animation/reduced-motion.js';
import { slideVariants } from '../../lib/animation/variants.js';

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
      <motion.div
        key={pageKey}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={variants.transition}
        className="page-turn-container will-change-transform"
        style={{ willChange: 'transform' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
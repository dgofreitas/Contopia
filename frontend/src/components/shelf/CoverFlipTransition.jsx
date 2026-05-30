import { useCallback, useEffect } from 'react';
import { m, useAnimationControls } from 'framer-motion';
import CoverDisplay from './CoverDisplay';

export default function CoverFlipTransition({
  book,
  transitionState,
  is3DSupported,
  prefersReducedMotion,
  animationConfig,
  onFlipComplete,
  onCancel,
}) {
  const controls = useAnimationControls();

  useEffect(() => {
    if (transitionState === 'flipping') {
      if (prefersReducedMotion || !is3DSupported) {
        controls.start('fadeAway');
      } else {
        controls.start('flip');
      }
    } else if (transitionState === 'reversing') {
      controls.stop();
      if (prefersReducedMotion || !is3DSupported) {
        controls.start('fadeBack');
      } else {
        controls.start('reverse');
      }
    }
  }, [transitionState, prefersReducedMotion, is3DSupported, controls]);

  const handleAnimationComplete = useCallback((definition) => {
    if (definition === 'flip' || definition === 'fadeAway') {
      onFlipComplete?.();
    } else if (definition === 'reverse' || definition === 'fadeBack') {
      onCancel?.();
    }
  }, [onFlipComplete, onCancel]);

  const useFade = !is3DSupported || prefersReducedMotion;
  const duration = prefersReducedMotion
    ? animationConfig.reducedDuration
    : is3DSupported
      ? animationConfig.duration
      : animationConfig.fadeDuration;

  if (useFade) {
    return (
      <m.div
        className="fixed inset-0 z-[80] pointer-events-auto"
        style={{ perspective: animationConfig.perspective }}
        initial="idle"
        animate={controls}
        variants={{
          idle: { opacity: 1 },
          fadeAway: {
            opacity: 0,
            transition: { duration, ease: animationConfig.easing },
          },
          fadeBack: {
            opacity: 1,
            transition: { duration, ease: animationConfig.easing },
          },
        }}
        onAnimationComplete={handleAnimationComplete}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[90vw] max-w-sm">
            <CoverDisplay book={book} className="w-full aspect-[3/4] rounded-lg" />
          </div>
        </div>
      </m.div>
    );
  }

  return (
    <m.div
      className="fixed inset-0 z-[80] pointer-events-auto"
      style={{ perspective: animationConfig.perspective }}
      initial="idle"
      animate={controls}
      variants={{
        idle: { rotateY: 0 },
        flip: {
          rotateY: -180,
          transition: { duration, ease: animationConfig.easing },
        },
        reverse: {
          rotateY: 0,
          transition: { duration, ease: animationConfig.easing },
        },
      }}
      onAnimationComplete={handleAnimationComplete}
    >
      <div
        style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
      >
        <div
          style={{
            backfaceVisibility: 'hidden',
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-[90vw] max-w-sm">
            <CoverDisplay book={book} className="w-full aspect-[3/4] rounded-lg" />
          </div>
        </div>
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #fef9c3 0%, #d1fae5 100%)',
            borderRadius: '0.5rem',
          }}
        >
          <div className="flex flex-col items-center gap-3 text-gray-700">
            <svg className="w-12 h-12 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.682 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.682 5 16.5 5c1.833 0 3.332.477 4.5 1.253v13C19.832 18.477 18.318 18 16.5 18c-1.833 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-lg font-semibold">{book?.title || ''}</span>
          </div>
        </div>
      </div>
    </m.div>
  );
}
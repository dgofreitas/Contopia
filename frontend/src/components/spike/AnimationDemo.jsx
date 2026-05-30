import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const pullOutVariants = {
  idle: { scale: 1, y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' },
  hover: { scale: 1.08, y: -8, boxShadow: '0 12px 24px rgba(0,0,0,0.25)' },
  tap: { scale: 0.95, y: 0 },
};

const pageTurnVariants = {
  front: { rotateY: 0 },
  back: { rotateY: 180 },
};

const idleFloatVariants = {
  float: {
    y: [0, -6, 0],
    scale: [1, 1.03, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  paused: {
    y: 0,
    scale: 1,
  },
};

function PullOutDemo({ reduced }) {
  return (
    <div data-testid="demo-pull-out" style={{ width: 300, marginBottom: 24 }}>
      <h3 className="text-sm font-semibold mb-2">Pull-Out</h3>
      <motion.div
        data-testid="pull-out-spine"
        variants={pullOutVariants}
        initial="idle"
        animate="idle"
        whileHover={reduced ? undefined : 'hover'}
        whileTap={reduced ? undefined : 'tap'}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          width: 60,
          height: 160,
          borderRadius: 4,
          backgroundColor: '#8B4513',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 8,
          perspective: 600,
        }}
      >
        <span style={{ color: '#fff', fontSize: 10, writingMode: 'vertical-lr' }}>Book Title</span>
      </motion.div>
    </div>
  );
}

function PageTurnDemo({ reduced }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div data-testid="demo-page-turn" style={{ width: 300, marginBottom: 24, perspective: 600 }}>
      <h3 className="text-sm font-semibold mb-2">Page-Turn</h3>
      <motion.div
        data-testid="page-turn-card"
        onClick={() => setFlipped((f) => !f)}
        variants={pageTurnVariants}
        animate={reduced ? 'front' : flipped ? 'back' : 'front'}
        transition={reduced ? { duration: 0 } : { duration: 0.6, ease: 'easeInOut' }}
        style={{
          width: 200,
          height: 140,
          borderRadius: 8,
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <div
          data-testid="page-front"
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            backgroundColor: '#fef9c3',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}
        >
          Front — Click to flip
        </div>
        <div
          data-testid="page-back"
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundColor: '#d1fae5',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}
        >
          Back — Click to return
        </div>
      </motion.div>
    </div>
  );
}

function IdleDemo({ reduced }) {
  return (
    <div data-testid="demo-idle" style={{ width: 300, marginBottom: 24 }}>
      <h3 className="text-sm font-semibold mb-2">Idle (Float)</h3>
      <motion.div
        data-testid="idle-element"
        variants={idleFloatVariants}
        animate={reduced ? 'paused' : 'float'}
        style={{
          width: 80,
          height: 100,
          borderRadius: 6,
          backgroundColor: '#93c5fd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
        }}
      >
        Floating
      </motion.div>
    </div>
  );
}

export default function AnimationDemo() {
  const prefersReducedMotion = useReducedMotion();
  const [forceReduced, setForceReduced] = useState(false);
  const reduced = prefersReducedMotion || forceReduced;

  return (
    <div data-testid="animation-demo" style={{ padding: 16 }}>
      <h2 className="text-lg font-bold mb-4">Animation Demo — STORY-038 Spike</h2>
      <button
        data-testid="reduced-motion-toggle"
        onClick={() => setForceReduced((v) => !v)}
        className="px-3 py-1 rounded text-xs font-medium"
        style={{
          backgroundColor: reduced ? '#ef4444' : '#22c55e',
          color: '#fff',
          marginBottom: 16,
        }}
      >
        {reduced ? 'Reduced Motion: ON' : 'Reduced Motion: OFF'}
      </button>
      <AnimatePresence mode="wait">
        <PullOutDemo reduced={reduced} />
        <PageTurnDemo reduced={reduced} />
        <IdleDemo reduced={reduced} />
      </AnimatePresence>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../lib/animation-engine/index.js';

const SHAPES = [
  { x: '10%', delay: 0, size: 12, color: '#f59e0b' },
  { x: '25%', delay: 0.15, size: 10, color: '#d97706' },
  { x: '40%', delay: 0.05, size: 14, color: '#fbbf24' },
  { x: '55%', delay: 0.2, size: 8, color: '#f59e0b' },
  { x: '70%', delay: 0.1, size: 12, color: '#d97706' },
  { x: '85%', delay: 0.25, size: 10, color: '#fbbf24' },
  { x: '15%', delay: 0.18, size: 8, color: '#f59e0b' },
];

export default function CelebrationOverlay() {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (prefersReducedMotion) return null;

  return (
    <AnimatePresence>
      {visible && (
        <div
          className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          {SHAPES.map((shape, i) => (
            <m.div
              key={i}
              initial={{ opacity: 0, y: '100vh' }}
              animate={{ opacity: [0, 1, 1, 0], y: ['-10vh', '40vh', '0vh'] }}
              transition={{
                duration: 2.2,
                delay: shape.delay,
                ease: 'easeOut',
              }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                left: shape.x,
                width: shape.size,
                height: shape.size,
                borderRadius: '50%',
                backgroundColor: shape.color,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
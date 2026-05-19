// Contopia — EmptyShelfIllustration
// Friendly SVG character waving next to an empty bookshelf
import { motion } from 'framer-motion';

export default function EmptyShelfIllustration({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 300"
      aria-hidden="true"
      className={`w-full max-w-[280px] md:max-w-xs ${className || ''}`}
    >
      <ellipse cx="200" cy="284" rx="170" ry="8" fill="#f3f4f6" />

      <g>
        <rect x="242" y="62" width="10" height="190" rx="2" fill="#92400e" />
        <rect x="360" y="62" width="10" height="190" rx="2" fill="#92400e" />
        <rect x="238" y="62" width="136" height="8" rx="2" fill="#b45309" />
        <rect x="238" y="140" width="136" height="8" rx="2" fill="#b45309" />
        <rect x="238" y="218" width="136" height="8" rx="2" fill="#b45309" />
        <rect x="234" y="250" width="144" height="6" rx="2" fill="#78350f" />
      </g>

      <g>
        <path
          d="M78 190 Q54 212 64 236"
          stroke="#f59e0b"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
        />

        <ellipse cx="115" cy="200" rx="40" ry="48" fill="#fbbf24" stroke="currentColor" strokeWidth="2" />
        <circle cx="115" cy="122" r="40" fill="#fbbf24" stroke="currentColor" strokeWidth="2" />
        <path
          d="M112 83 Q118 72 128 78"
          stroke="#f59e0b"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />

        <circle cx="102" cy="118" r="5" fill="#292524" />
        <circle cx="128" cy="118" r="5" fill="#292524" />
        <circle cx="104" cy="116" r="2" fill="#fff" />
        <circle cx="130" cy="116" r="2" fill="#fff" />
        <path
          d="M101 132 Q115 147 129 132"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="90" cy="132" r="6" fill="#f87171" opacity="0.35" />
        <circle cx="140" cy="132" r="6" fill="#f87171" opacity="0.35" />

        <motion.path
          d="M155 182 Q176 150 170 116"
          stroke="#f59e0b"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
          style={{ transformOrigin: '155px 182px' }}
        />
        <circle cx="170" cy="108" r="11" fill="#fbbf24" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M184 98 Q192 92 189 84"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M190 106 Q198 100 195 92"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        <ellipse cx="96" cy="246" rx="14" ry="7" fill="#f59e0b" />
        <ellipse cx="134" cy="246" rx="14" ry="7" fill="#f59e0b" />
      </g>
    </svg>
  );
}

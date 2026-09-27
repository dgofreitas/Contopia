import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { paintScene } from './paint';
import { charactersAt } from './themes';

// Tempo que cada amigo fica em cena antes de dar a vez ao próximo
export const GUEST_TURN_MS = 9000;

const enter = (delay) => ({
  initial: { y: 80, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 14, delay } },
  exit: { y: 80, opacity: 0, transition: { duration: 0.35 } },
});

// Fundo pintado do tema. Na troca de tema o cenário novo entra por cima do antigo.
// Temas com arte oficial põem a imagem de fundo e os personagens sobre a pintura,
// e mostram o crédito.
export function Scene({ theme }) {
  const svg = useMemo(() => paintScene(theme), [theme]);
  const [turn, setTurn] = useState(0);
  const guestCount = theme.characters?.guests?.length || 0;

  useEffect(() => {
    setTurn(0);
    if (guestCount < 2) return undefined;
    const timer = setInterval(() => setTurn((t) => t + 1), GUEST_TURN_MS);
    return () => clearInterval(timer);
  }, [theme.id, guestCount]);

  const characters = charactersAt(theme, turn);
  const official = Boolean(theme.backdrop) || characters.length > 0;
  return (
    <>
      <div className="scene" aria-hidden="true">
        <AnimatePresence initial={false}>
          <motion.div
            key={theme.id}
            className="scene__layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Gerado só a partir das constantes do tema, sem texto de usuário */}
            <div className="scene__paint" dangerouslySetInnerHTML={{ __html: svg }} />
            {theme.backdrop && <img className="scene__backdrop" src={theme.backdrop} alt="" />}
            <AnimatePresence>
              {characters.map((c, i) => (
                <motion.img
                  key={c.id}
                  className={`scene__character scene__character--${c.side}`}
                  src={c.src}
                  alt=""
                  {...enter(turn === 0 ? 0.3 + i * 0.25 : 0.4)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
      {official && theme.credit && <p className="scene__credit">{theme.credit}</p>}
    </>
  );
}

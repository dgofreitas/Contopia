import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { paintScene } from './paint';

// Fundo pintado do tema. Na troca de tema o cenário novo entra por cima do antigo.
// Temas com personagens oficiais mostram as figuras sobre a pintura e o crédito.
export function Scene({ theme }) {
  const svg = useMemo(() => paintScene(theme), [theme]);
  const characters = theme.characters || [];
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
            {characters.map((c) => (
              <img
                key={c.src}
                className={`scene__character${c.motion ? ` ${c.motion}` : ''}`}
                src={c.src}
                alt=""
                style={{ left: c.left, right: c.right, bottom: c.bottom, top: c.top, height: c.height, animationDelay: c.delay }}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      {characters.length > 0 && theme.credit && <p className="scene__credit">{theme.credit}</p>}
    </>
  );
}

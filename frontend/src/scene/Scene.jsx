import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { paintScene } from './paint';
import { pickCharacters } from './themes';

// Fundo pintado do tema. Na troca de tema o cenário novo entra por cima do antigo.
// Temas com arte oficial põem a imagem de fundo e os personagens sobre a pintura,
// e mostram o crédito.
export function Scene({ theme }) {
  const svg = useMemo(() => paintScene(theme), [theme]);
  const characters = useMemo(() => pickCharacters(theme), [theme]);
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
            {characters.map((c, i) => (
              <motion.img
                key={c.id}
                className={`scene__character scene__character--${c.side}`}
                src={c.src}
                alt=""
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.3 + i * 0.25 }}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      {official && theme.credit && <p className="scene__credit">{theme.credit}</p>}
    </>
  );
}

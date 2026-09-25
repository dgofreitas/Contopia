import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { paintScene } from './paint';

// Fundo pintado do tema. Na troca de tema o cenário novo entra por cima do antigo.
export function Scene({ theme }) {
  const svg = useMemo(() => paintScene(theme), [theme]);
  return (
    <div className="scene" aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.div
          key={theme.id}
          className="scene__layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          // Gerado só a partir das constantes do tema, sem texto de usuário
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </AnimatePresence>
    </div>
  );
}

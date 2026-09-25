import { useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Bookshelf } from './components/Bookshelf';
import { BookOverlay } from './components/BookOverlay';
import { THEMES } from './themes';
import { SAMPLE_BOOKS } from './sampleBooks';

export default function App() {
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [selectedId, setSelectedId] = useState(null);
  const theme = THEMES.find((item) => item.id === themeId);
  const selected = SAMPLE_BOOKS.find((book) => book.id === selectedId);

  return (
    <main className="room" style={{ '--ink': theme.ink, '--glow': theme.glow }}>
      {/* Gradientes não são animáveis: o céu novo entra por cima do antigo com fade */}
      <AnimatePresence initial={false}>
        <motion.div
          key={theme.id}
          className="room__sky"
          style={{ background: theme.sky }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          aria-hidden="true"
        />
      </AnimatePresence>

      <header className="room__header">
        <h1 className="logo">Contopia</h1>
        <p className="tagline">A estante mágica de quem escreve</p>
      </header>

      <nav className="themes" aria-label="Tema da estante">
        {THEMES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="theme-chip"
            aria-pressed={item.id === themeId}
            onClick={() => setThemeId(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span> {item.name}
          </button>
        ))}
      </nav>

      <LayoutGroup>
        <section className="room__shelf" aria-label={`Estante com tema ${theme.name}`}>
          <span className="sparkle" aria-hidden="true">{theme.sparkle}</span>
          <Bookshelf books={SAMPLE_BOOKS} theme={theme} selectedId={selectedId} onSelect={setSelectedId} />
        </section>

        <AnimatePresence>
          {selected && <BookOverlay key={selected.id} book={selected} onClose={() => setSelectedId(null)} />}
        </AnimatePresence>
      </LayoutGroup>

      <p className="hint">Toque em um livro para tirar da estante.</p>
    </main>
  );
}

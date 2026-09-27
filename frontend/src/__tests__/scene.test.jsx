import { act, render } from '@testing-library/react';
import { GUEST_TURN_MS, Scene } from '../scene/Scene';
import { THEMES, charactersAt } from '../scene/themes';

describe('cenário', () => {
  it('a Amora fica sempre e os amigos se revezam, começando pelo Scorpio', () => {
    const ids = (turn) => charactersAt(THEMES.princesa, turn).map((c) => c.id);
    expect(ids(0)).toEqual(['amora', 'scorpio']);
    expect(ids(1)).toEqual(['amora', 'olivia']);
    expect(ids(4)).toEqual(['amora', 'scorpio']);
    expect(charactersAt(THEMES.fadas)).toEqual([]);
  });

  it('mostra o mapa, os personagens e o crédito só no tema Princesa Desastrada', () => {
    const { container, rerender, getByText, queryByText } = render(<Scene theme={THEMES.princesa} />);
    expect(container.querySelector('.scene__backdrop')).toHaveAttribute('src', '/temas/princesa/mapa-florentia.webp');
    expect(container.querySelector('img[src$="scorpio.webp"]')).toBeInTheDocument();
    expect(getByText(/Uso autorizado, não comercial/)).toBeInTheDocument();

    rerender(<Scene theme={THEMES.fadas} />);
    expect(queryByText(/Uso autorizado/)).not.toBeInTheDocument();
  });

  it('troca o amigo da vez depois de um tempo', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<Scene theme={THEMES.princesa} />);
      act(() => { vi.advanceTimersByTime(GUEST_TURN_MS); });
      expect(container.querySelector('img[src$="olivia.webp"]')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

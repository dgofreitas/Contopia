import { render } from '@testing-library/react';
import { Scene } from '../scene/Scene';
import { THEMES, pickCharacters } from '../scene/themes';

describe('cenário', () => {
  it('a Amora fica sempre e entra um amigo sorteado', () => {
    expect(pickCharacters(THEMES.princesa, () => 0).map((c) => c.id)).toEqual(['amora', 'olivia']);
    expect(pickCharacters(THEMES.princesa, () => 0.99).map((c) => c.id)).toEqual(['amora', 'scorpio']);
    expect(pickCharacters(THEMES.fadas)).toEqual([]);
  });

  it('mostra o mapa, os personagens e o crédito só no tema Princesa Desastrada', () => {
    const { container, rerender, getByText, queryByText } = render(<Scene theme={THEMES.princesa} />);
    expect(container.querySelector('.scene__backdrop')).toHaveAttribute('src', '/temas/princesa/mapa-florentia.jpg');
    expect(container.querySelectorAll('.scene__character')).toHaveLength(2);
    expect(getByText(/Uso autorizado, não comercial/)).toBeInTheDocument();

    rerender(<Scene theme={THEMES.fadas} />);
    expect(queryByText(/Uso autorizado/)).not.toBeInTheDocument();
  });
});

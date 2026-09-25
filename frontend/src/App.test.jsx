import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('Estante', () => {
  it('mostra os livros de exemplo', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Abrir O Castelo de Nuvens/ })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
  });

  it('troca o tema da estante', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Mistério/ }));
    expect(screen.getByRole('button', { name: /Mistério/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: /tema Mistério/ })).toBeInTheDocument();
  });

  it('tira o livro da estante e guarda de volta', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Abrir A Chave Perdida/ }));
    expect(screen.getByRole('dialog', { name: 'A Chave Perdida' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar na estante' }));
    expect(await screen.findByRole('button', { name: /Abrir A Chave Perdida/ })).toBeInTheDocument();
  });
});

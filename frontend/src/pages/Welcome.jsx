import { Link } from 'react-router-dom';
import { Scene } from '../scene/Scene';
import { THEMES } from '../scene/themes';

export function Welcome() {
  return (
    <main className="room room--center">
      <Scene theme={THEMES.fadas} />
      <div className="paper paper--hero">
        <h1 className="logo">Contopia</h1>
        <p className="tagline">A estante mágica de quem escreve</p>
        <div className="stack">
          <Link to="/entrar" className="btn btn--primary btn--big">📚 Sou criança, quero entrar</Link>
          <Link to="/login" className="btn btn--big">Sou responsável</Link>
        </div>
        <p className="fine">
          Primeira vez? Um adulto <Link to="/cadastro">cria a conta da família</Link>.
        </p>
      </div>
    </main>
  );
}

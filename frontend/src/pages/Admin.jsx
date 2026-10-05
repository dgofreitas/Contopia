import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, messageFor } from '../lib/api';
import { THEMES } from '../scene/themes';
import { BarList, Stat, TimeChart, fmt, pct, shortDay } from '../components/Charts';

const DEVICES = { mobile: 'Celular', tablet: 'Tablet', desktop: 'Computador' };
const VISIBILITY = { private: 'Só a criança', family: 'Família', people: 'Amigos escolhidos' };

function bytes(n) {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  return `${Math.round(n / 1e3).toLocaleString('pt-BR')} KB`;
}

function uptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${Math.floor((seconds % 3600) / 60)}min`;
}

// Total acumulado em cada semana, a partir do total de hoje e dos novos por semana.
function cumulative(total, perWeek) {
  const values = [];
  let running = total;
  for (let i = perWeek.length - 1; i >= 0; i -= 1) {
    values[i] = running;
    running -= perWeek[i];
  }
  return values;
}

const sum = (list) => list.reduce((a, b) => a + b, 0);

function Section({ title, hint, children }) {
  return (
    <section className="card admin__section">
      <h2>{title}</h2>
      {hint && <p className="muted small">{hint}</p>}
      {children}
    </section>
  );
}

// Painel do admin: como o site está indo. Só números somados, sem nomes nem textos.
export function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/metrics').then(setData).catch((err) => setError(messageFor(err)));
  }, []);

  if (error) {
    return (
      <main className="desk">
        <p className="error" role="alert">{error}</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="desk">
        <p className="muted">Carregando o painel...</p>
      </main>
    );
  }

  const { totals, growth, activity, logins, writing, health } = data;
  const weeks = growth.weeks.map(shortDay);
  const days = activity.days.map(shortDay);
  const last30 = (list) => list.slice(-30);
  const loginOk = logins.pictureOk.map((v, i) => v + logins.textOk[i]);
  const loginFail = logins.pictureFail.map((v, i) => v + logins.textFail[i]);
  const tries = sum(last30(loginOk)) + sum(last30(loginFail));

  return (
    <main className="desk desk--wide admin">
      <header className="desk__header">
        <h1 className="logo logo--small">Painel</h1>
        <Link to="/familia" className="btn btn--ghost">Voltar</Link>
      </header>
      <p className="muted small">Atualizado em {new Date(data.generatedAt).toLocaleString('pt-BR')}. Só números somados: nenhum nome de criança nem texto de livro.</p>

      <div className="stats">
        <Stat label="Famílias" value={fmt(totals.families)} />
        <Stat label="Crianças" value={fmt(totals.children)} />
        <Stat label="Ativas hoje" value={fmt(activity.dau)} hint={`${fmt(activity.wau)} em 7 dias · ${fmt(activity.mau)} em 30`} />
        <Stat label="Livros na estante" value={fmt(totals.booksPublished)} hint={`${fmt(totals.drafts)} no ateliê`} />
        <Stat label="Palavras escritas" value={fmt(totals.words)} hint={`${fmt(writing.wordsPerChild)} por criança`} />
        <Stat label="Leituras de amigos" value={fmt(totals.reads)} />
      </div>

      <Section title="Crescimento" hint="Total acumulado no fim de cada semana (últimas 26).">
        <TimeChart
          label="Famílias e crianças por semana"
          labels={weeks}
          series={[
            { name: 'Crianças', values: cumulative(totals.children, growth.children) },
            { name: 'Famílias', values: cumulative(totals.families, growth.families) },
          ]}
        />
      </Section>

      <div className="admin__grid">
        <Section title="Livros novos por semana">
          <TimeChart kind="column" label="Livros criados por semana" labels={weeks} series={[{ name: 'Livros criados', values: growth.books }]} />
        </Section>
        <Section title="Livros de outros abertos por semana" hint="Primeira vez que uma criança abre o livro de um irmão ou amigo.">
          <TimeChart kind="column" label="Leituras por semana" labels={weeks} series={[{ name: 'Leituras', values: growth.reads }]} />
        </Section>
      </div>

      <Section title="Quem usou o site por dia" hint="Últimos 60 dias. Começa a contar a partir desta versão.">
        <TimeChart
          label="Crianças e responsáveis ativos por dia"
          labels={days}
          series={[
            { name: 'Crianças', values: activity.children },
            { name: 'Responsáveis', values: activity.parents },
          ]}
        />
      </Section>

      <div className="admin__grid">
        <Section title="Voltaram na semana seguinte" hint="Das crianças ativas numa semana, quantas usaram de novo na outra.">
          <TimeChart
            kind="column"
            label="Retenção semanal"
            format={pct}
            max={1}
            labels={activity.retention.map((r) => shortDay(r.week))}
            series={[{ name: 'Voltaram', values: activity.retention.map((r) => r.rate ?? 0) }]}
          />
        </Section>
        <Section title="Aparelhos" hint="Dias de uso das crianças nos últimos 30 dias.">
          <BarList label="Aparelhos" items={Object.entries(activity.devices).map(([k, v]) => ({ label: DEVICES[k], value: v }))} />
        </Section>
      </div>

      <Section
        title="Entrada das crianças"
        hint={`Últimos 30 dias: ${fmt(tries)} tentativas, ${tries ? pct(sum(last30(loginFail)) / tries) : '—'} com senha errada, ${fmt(sum(last30(logins.locked)))} bloqueios.`}
      >
        <TimeChart
          label="Entradas das crianças por dia"
          labels={last30(days)}
          series={[
            { name: 'Entrou', values: last30(loginOk) },
            { name: 'Senha errada', values: last30(loginFail) },
            { name: 'Bloqueada', values: last30(logins.locked) },
          ]}
        />
      </Section>

      <div className="admin__grid">
        <Section title="Tamanho dos livros" hint={`Livros da estante, em palavras. Média: ${fmt(writing.wordsPerBook)}.`}>
          <BarList label="Livros por número de palavras" items={writing.wordBuckets.map((b) => ({ label: b.label, value: b.books }))} />
        </Section>
        <Section title="Como escrevem">
          <BarList
            label="Recursos usados nos livros"
            items={[
              { label: 'Com capítulos', value: writing.chaptered },
              { label: 'Texto corrido', value: writing.continuous },
              { label: 'Com imagens', value: writing.withImages },
              { label: 'Favoritos', value: writing.favorites },
              { label: 'Sendo lidos', value: writing.beingRead },
            ]}
          />
        </Section>
        <Section title="Ateliê" hint="Rascunhos parados há mais de 14 dias podem ser livros abandonados.">
          <BarList
            label="Rascunhos"
            items={[
              { label: 'Mexidos há pouco', value: writing.activeDrafts },
              { label: 'Parados', value: writing.staleDrafts },
            ]}
          />
        </Section>
        <Section title="Quem pode ler" hint="Livros da estante.">
          <BarList label="Visibilidade dos livros" items={Object.entries(data.sharing).map(([k, v]) => ({ label: VISIBILITY[k], value: v }))} />
        </Section>
        <Section title="Temas preferidos">
          <BarList
            label="Temas"
            items={Object.entries(data.themes)
              .map(([k, v]) => ({ label: THEMES[k]?.name || k, value: v }))
              .sort((a, b) => b.value - a.value)}
          />
        </Section>
        <Section title="Jeito de entrar">
          <BarList
            label="Jeito de entrar"
            items={[
              { label: 'Figuras', value: data.loginMethods.picture },
              { label: 'Senha', value: data.loginMethods.text },
              { label: 'Os dois', value: data.loginMethods.both },
            ]}
          />
        </Section>
        <Section title="Mais lidos" hint="Livros abertos por mais crianças além do autor.">
          <BarList label="Livros mais lidos" items={data.topRead.map((b) => ({ label: b.title, value: b.reads }))} />
        </Section>
        <Section title="Amizades">
          <BarList
            label="Amizades"
            items={[
              { label: 'Famílias amigas', value: totals.friendships },
              { label: 'Convites esperando', value: totals.pendingInvites },
              { label: 'Grupos de amigos', value: totals.groups },
            ]}
          />
        </Section>
      </div>

      <Section title="Saúde do site">
        <div className="stats">
          <Stat label="Banco (Mongo)" value={health.mongo === 'ok' ? '✅ ok' : '❌ fora'} />
          <Stat label="Cache (Redis)" value={health.redis === 'ok' ? '✅ ok' : '❌ fora'} />
          <Stat label="Versão" value={health.version} hint={`no ar há ${uptime(health.uptimeSeconds)}`} />
          <Stat label="Imagens" value={bytes(totals.imageBytes)} hint={`${fmt(totals.images)} arquivos`} />
          <Stat
            label="Disco livre"
            value={health.disk ? bytes(health.disk.free) : '—'}
            hint={health.disk ? `de ${bytes(health.disk.total)}` : undefined}
          />
        </div>
        <h3 className="admin__sub">Erros do servidor por dia</h3>
        <TimeChart kind="column" label="Erros do servidor por dia" labels={last30(days)} series={[{ name: 'Erros', values: last30(health.errors) }]} />
      </Section>
    </main>
  );
}

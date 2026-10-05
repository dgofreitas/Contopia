import { useEffect, useRef, useState } from 'react';

// Gráficos do painel do admin, em SVG puro. Cores das séries em ordem fixa
// (azul, laranja, verde-água) e números sempre na cor do texto.
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'];

const HEIGHT = 200;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };

export const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
export const pct = (n) => (n == null ? '—' : `${Math.round(n * 100)}%`);
// "2026-10-04" -> "04/10"
export const shortDay = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

function niceMax(value) {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value / 4) * power;
  return step * 4;
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/**
 * Série no tempo. kind="line" para uma ou mais linhas (com linha-guia e caixinha
 * ao passar o dedo), kind="column" para uma série só em colunas.
 * labels: rótulos do eixo X; series: [{ name, values }].
 */
export function TimeChart({ labels, series, kind = 'line', format = fmt, label, max: fixedMax }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const max = fixedMax ?? niceMax(Math.max(0, ...series.flatMap((s) => s.values.map((v) => v ?? 0))));
  const n = labels.length;
  const band = innerW / n;
  const x = (i) => PAD.left + band * i + band / 2;
  const y = (v) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 1, 2, 3, 4].map((t) => (max / 4) * t);
  const xTicks = [0, Math.floor((n - 1) / 2), n - 1];

  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const i = Math.floor(((event.clientX - box.left) * (width / box.width) - PAD.left) / band);
    setHover(i >= 0 && i < n ? i : null);
  };

  return (
    <figure className="chart" ref={ref}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={label}
        onPointerMove={pick}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart__grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart__axis" x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end">{format(t)}</text>
          </g>
        ))}
        {xTicks.map((i) => (
          <text key={i} className="chart__axis" x={x(i)} y={HEIGHT - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
            {labels[i]}
          </text>
        ))}
        {kind === 'column' &&
          series[0].values.map((v, i) => {
            const w = Math.max(2, band - 2);
            const h = Math.max(0, PAD.top + innerH - y(v ?? 0));
            const r = Math.min(4, w / 2, h);
            const left = x(i) - w / 2;
            const bottom = PAD.top + innerH;
            return h > 0 ? (
              <path
                key={i}
                fill={SERIES[0]}
                opacity={hover === null || hover === i ? 1 : 0.55}
                d={`M${left},${bottom} V${bottom - h + r} Q${left},${bottom - h} ${left + r},${bottom - h} H${left + w - r} Q${left + w},${bottom - h} ${left + w},${bottom - h + r} V${bottom} Z`}
              />
            ) : null;
          })}
        {kind === 'line' && hover !== null && <line className="chart__cross" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} />}
        {kind === 'line' &&
          series.map((s, si) => (
            <g key={s.name}>
              <polyline
                fill="none"
                stroke={SERIES[si]}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.values.map((v, i) => `${x(i)},${y(v ?? 0)}`).join(' ')}
              />
              {hover !== null && <circle cx={x(hover)} cy={y(s.values[hover] ?? 0)} r="4" fill={SERIES[si]} stroke="#fff" strokeWidth="2" />}
            </g>
          ))}
        <line className="chart__base" x1={PAD.left} x2={width - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} />
      </svg>
      {hover !== null && (
        <div className="chart__tip" style={{ left: Math.min(Math.max(x(hover), 70), width - 70) }}>
          <strong>{labels[hover]}</strong>
          {series.map((s, si) => (
            <span key={s.name} className="chart__tip-row">
              {series.length > 1 && <i style={{ background: SERIES[si] }} />}
              <b>{format(s.values[hover])}</b> {s.name}
            </span>
          ))}
        </div>
      )}
      {series.length > 1 && (
        <figcaption className="chart__legend">
          {series.map((s, si) => (
            <span key={s.name}>
              <i style={{ background: SERIES[si] }} />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <DataTable head={['', ...series.map((s) => s.name)]} rows={labels.map((l, i) => [l, ...series.map((s) => format(s.values[i]))])} />
    </figure>
  );
}

// Barras deitadas para comparar categorias: rótulo, barra e número.
export function BarList({ items, format = fmt, label }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <figure className="chart">
      <ul className="bars" aria-label={label}>
        {items.map((item) => (
          <li key={item.label} className="bars__row" title={`${item.label}: ${format(item.value)}`}>
            <span className="bars__label">{item.label}</span>
            <span className="bars__track">
              <span className="bars__fill" style={{ width: `${(item.value / max) * 100}%` }} />
            </span>
            <span className="bars__value">
              {format(item.value)}
              {total > 0 && format === fmt && <small> {pct(item.value / total)}</small>}
            </span>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="muted">Ainda sem dados.</p>}
    </figure>
  );
}

function DataTable({ head, rows }) {
  return (
    <details className="chart__table">
      <summary>Ver tabela</summary>
      <table>
        <thead>
          <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
      {hint && <span className="stat__hint">{hint}</span>}
    </div>
  );
}

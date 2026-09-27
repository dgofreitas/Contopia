/**
 * Desenha o cenário pintado de cada tema como SVG. Os morros e objetos passam
 * por um filtro de turbulência que dá a borda irregular de pintura à mão.
 * Tudo é gerado a partir de constantes: nenhum texto de usuário entra aqui.
 */
function rand(seed) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

function stars(n, color, seed) {
  const r = rand(seed);
  let out = '';
  for (let i = 0; i < n; i += 1) {
    const x = r() * 1000;
    const y = r() * 220;
    const size = 1 + r() * 2.6;
    out += `<circle class="twinkle" style="animation-delay:-${(r() * 2.6).toFixed(2)}s" cx="${x}" cy="${y}" r="${size}" fill="${color}"/>`;
  }
  return out;
}

const sparkle = (x, y, s, color, d) =>
  `<path class="twinkle" style="animation-delay:-${d}s" transform="translate(${x} ${y}) scale(${s})" d="M0-10 2-2 10 0 2 2 0 10-2 2-10 0-2-2Z" fill="${color}"/>`;

function hills(y, amp, color, seed) {
  const r = rand(seed);
  let d = `M0 ${y}`;
  for (let x = 0; x <= 1000; x += 125) d += ` Q${x + 62} ${y - amp * (0.4 + r())} ${x + 125} ${y + (r() - 0.5) * amp * 0.6}`;
  return `<path d="${d} V600 H0Z" fill="${color}"/>`;
}

const moon = (x, y, r, color, glow) =>
  `<circle cx="${x}" cy="${y}" r="${r * 2.4}" fill="${glow}" opacity=".18"/><circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.2}" r="${r * 0.18}" fill="#000" opacity=".08"/><circle cx="${x - r * 0.3}" cy="${y + r * 0.3}" r="${r * 0.12}" fill="#000" opacity=".08"/>`;

const castle = (x, y, s, color) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}">
  <rect x="-60" y="-70" width="120" height="70"/><rect x="-80" y="-120" width="34" height="120"/><rect x="46" y="-110" width="34" height="110"/>
  <rect x="-18" y="-150" width="36" height="80"/><path d="M-84-120-63-160-42-120Z"/><path d="M42-110 63-150 84-110Z"/><path d="M-22-150 0-195 22-150Z"/>
  <rect x="-8" y="-40" width="16" height="40" rx="8" fill="#000" opacity=".15"/></g>`;

const mushroom = (x, y, s, cap, dot) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-7" y="-26" width="14" height="26" rx="6" fill="#FFF3E0"/><path d="M-26-22Q0-58 26-22Z" fill="${cap}"/><circle cx="-9" cy="-33" r="4" fill="${dot}"/><circle cx="8" cy="-38" r="3" fill="${dot}"/><circle cx="14" cy="-27" r="2.6" fill="${dot}"/></g>`;

const flower = (x, y, s, c) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0V-26" stroke="#5E8C4A" stroke-width="3"/><g transform="translate(0 -30)" fill="${c}"><circle cx="0" cy="-7" r="6"/><circle cx="7" cy="0" r="6"/><circle cx="0" cy="7" r="6"/><circle cx="-7" cy="0" r="6"/><circle r="4" fill="#FFE066"/></g></g>`;

function skyline(y, color, win, seed) {
  const r = rand(seed);
  let out = '';
  let x = 0;
  while (x < 1000) {
    const w = 50 + r() * 70;
    const h = 90 + r() * 150;
    out += `<rect x="${x}" y="${y - h}" width="${w}" height="${h + 300}" fill="${color}"/>`;
    for (let wy = y - h + 14; wy < y - 10; wy += 22) {
      for (let wx = x + 10; wx < x + w - 12; wx += 18) {
        if (r() > 0.62) out += `<rect class="twinkle" style="animation-delay:-${(r() * 3).toFixed(2)}s" x="${wx}" y="${wy}" width="8" height="11" fill="${win}"/>`;
      }
    }
    x += w + 4;
  }
  return out;
}

const lamp = (x, y, s, glow) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><circle cy="-120" r="60" fill="${glow}" opacity=".22"/><rect x="-3" y="-110" width="6" height="110" fill="#10162B"/><path d="M-14-130h28l-6 20h-16Z" fill="#10162B"/><rect x="-9" y="-128" width="18" height="16" fill="${glow}"/></g>`;

const magnifier = (x, y, s, c) =>
  `<g class="float" style="animation-delay:-1.3s"><g transform="translate(${x} ${y}) scale(${s})"><circle r="26" fill="none" stroke="${c}" stroke-width="8"/><circle r="22" fill="#fff" opacity=".12"/><path d="M18 18 44 44" stroke="${c}" stroke-width="11" stroke-linecap="round"/></g></g>`;

const tree = (x, y, s, c) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${c}" stroke-linecap="round"><path d="M0 0V-150" stroke-width="16"/><path d="M0-80-50-130-70-128M-50-130-58-165" stroke-width="8"/><path d="M0-110 42-150 70-146M42-150 48-185" stroke-width="8"/><path d="M0-150-20-195M0-150 18-200" stroke-width="6"/></g>`;

const bat = (x, y, s, c, d) =>
  `<g class="flap" style="animation-delay:-${d}s"><path transform="translate(${x} ${y}) scale(${s})" d="M0 0C-8-10-20-12-30-4-24-4-20 0-18 6-14 2-8 2-6 8-4 4-2 3 0 3 2 3 4 4 6 8 8 2 14 2 18 6 20 0 24-4 30-4 20-12 8-10 0 0Z" fill="${c}"/></g>`;

const ghost = (x, y, s, d) =>
  `<g class="float" style="animation-delay:-${d}s"><g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 30V0a22 22 0 0 1 44 0v30l-7-6-7 6-8-6-7 6-8-6Z" fill="#F4F0FF" opacity=".92"/><circle cx="-8" cy="-2" r="3.4" fill="#2A1D3F"/><circle cx="8" cy="-2" r="3.4" fill="#2A1D3F"/><ellipse cx="0" cy="10" rx="4" ry="5" fill="#2A1D3F"/></g></g>`;

const house = (x, y, s, c, win) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><path d="M-70 0V-90L0-150 70-90V0Z"/><path d="M-90-86 0-165 90-86Z"/><rect x="30" y="-170" width="18" height="50"/><rect class="twinkle" x="-40" y="-70" width="22" height="26" fill="${win}"/><rect x="18" y="-70" width="22" height="26" fill="${win}" opacity=".35"/><path d="M-12 0v-40a12 12 0 0 1 24 0V0Z" fill="#000" opacity=".3"/></g>`;


// Tema Princesa: castelo rosa, bandeirinhas e uma princesa atrapalhada que
// deixou a coroa, o sapatinho e a xícara voando pelo céu.
const pinkCastle = (x, y, s, wall, roof, flag) => `<g transform="translate(${x} ${y}) scale(${s})">
  <rect x="-90" y="-110" width="180" height="110" fill="${wall}"/>
  <path d="M-90-110v-14h18v10h18v-10h18v10h18v-10h18v10h18v-10h18v10h18v-10h18v14Z" fill="${wall}"/>
  <rect x="-130" y="-170" width="46" height="170" fill="${wall}"/><rect x="84" y="-160" width="46" height="160" fill="${wall}"/>
  <rect x="-26" y="-215" width="52" height="110" fill="${wall}"/>
  <path d="M-136-170-107-240-78-170Z" fill="${roof}"/><path d="M78-160 107-228 136-160Z" fill="${roof}"/><path d="M-32-215 0-290 32-215Z" fill="${roof}"/>
  <g class="wave"><path d="M-107-240v-26l24 7-24 7" fill="${flag}"/></g>
  <g class="wave" style="animation-delay:-.8s"><path d="M107-228v-26l24 7-24 7" fill="${flag}"/></g>
  <g class="wave" style="animation-delay:-1.5s"><path d="M0-290v-30l28 8-28 8" fill="${flag}"/></g>
  <path d="M0-160c-6-8-18-6-18 4 0 9 18 18 18 18s18-9 18-18c0-10-12-12-18-4Z" fill="${flag}"/>
  <rect x="-116" y="-130" width="18" height="26" rx="9" fill="#fff" opacity=".55"/><rect x="98" y="-120" width="18" height="26" rx="9" fill="#fff" opacity=".55"/>
  <path d="M-24 0v-46a24 24 0 0 1 48 0V0Z" fill="#000" opacity=".16"/></g>`;

function bunting(y, sag, colors) {
  let out = `<path d="M-10 ${y} Q500 ${y + sag * 2} 1010 ${y}" fill="none" stroke="#fff" stroke-width="2.5" opacity=".9"/>`;
  for (let i = 0; i < 17; i += 1) {
    const t = (i + 0.5) / 17;
    const x = -10 + t * 1020;
    const cy = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + sag * 2) + t * t * y;
    out += `<g class="wave" style="animation-delay:-${(i * 0.23).toFixed(2)}s"><path d="M${x - 16} ${cy} h32 l-16 30Z" fill="${colors[i % colors.length]}"/></g>`;
  }
  return out;
}

const cloud = (x, y, s) =>
  `<g class="float" style="animation-duration:9s"><g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".85"><circle cx="-30" cy="0" r="22"/><circle cx="0" cy="-12" r="30"/><circle cx="32" cy="0" r="22"/><rect x="-52" y="0" width="106" height="22" rx="11"/></g></g>`;

const heart = (x, y, s, c, d) =>
  `<g class="float" style="animation-delay:-${d}s"><path transform="translate(${x} ${y}) scale(${s})" d="M0 6C-4-2-14-2-14 6c0 7 14 14 14 14s14-7 14-14c0-8-10-8-14 0Z" fill="${c}"/></g>`;

// Coroa torta, girando devagar: caiu da cabeça da princesa.
const crown = (x, y, s, gold, gem) =>
  `<g class="tumble"><g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 14-34-18-16-2 0-26 16-2 34-18 30 14Z" fill="${gold}"/><rect x="-30" y="12" width="60" height="10" rx="3" fill="${gold}"/><circle cx="0" cy="-27" r="4" fill="${gem}"/><circle cx="-34" cy="-19" r="3.4" fill="${gem}"/><circle cx="34" cy="-19" r="3.4" fill="${gem}"/><circle cx="0" cy="6" r="5" fill="${gem}"/></g></g>`;

const slipper = (x, y, s, c, d) =>
  `<g class="tumble" style="animation-delay:-${d}s"><g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 2C-30-10-16-14-4-8L18 2C26 5 32 6 32 12H-18L-22 26H-29L-27 12C-29 9-30 6-30 2Z" fill="${c}"/><path d="M-14-6c8 4 18 8 26 10" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/><circle cx="8" cy="-2" r="4" fill="#FFD86B"/><path d="M8-2-2-8V4ZM8-2 18-8V4Z" fill="#FFD86B"/></g></g>`;

const teacup = (x, y, s, c, d) =>
  `<g class="tumble" style="animation-delay:-${d}s"><g transform="translate(${x} ${y}) scale(${s})"><path d="M-22-10H22L16 14H-16Z" fill="${c}"/><path d="M22-4c10 0 10 12 0 12" fill="none" stroke="${c}" stroke-width="4"/><ellipse cx="0" cy="18" rx="28" ry="5" fill="${c}" opacity=".8"/><path d="M-8-16c-4-6 4-8 0-14M6-16c-4-6 4-8 0-14" stroke="#fff" stroke-width="2.5" fill="none" opacity=".8"/></g></g>`;

// Diário com cadeado de coração e uma mancha de tinta derramada ao lado.
const diary = (x, y, s, cover, lock) => `<g transform="translate(${x} ${y}) scale(${s}) rotate(-8)">
  <ellipse cx="62" cy="6" rx="30" ry="8" fill="#3B2A6B" opacity=".55"/>
  <rect x="-44" y="-58" width="88" height="62" rx="6" fill="#FFF8EE"/>
  <rect x="-48" y="-62" width="88" height="62" rx="7" fill="${cover}"/>
  <rect x="-40" y="-54" width="72" height="46" rx="4" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="5 4" opacity=".8"/>
  <path d="M-4-40c-4-6-14-4-14 3 0 7 14 13 14 13s14-6 14-13c0-7-10-9-14-3Z" fill="#fff" opacity=".9"/>
  <rect x="36" y="-40" width="16" height="18" rx="3" fill="${lock}"/><path d="M40-40v-6a4 4 0 0 1 8 0v6" fill="none" stroke="${lock}" stroke-width="3"/></g>`;

function layers(th) {
  if (th.id === 'princesa') {
    return {
      back: pinkCastle(760, 400, 0.95, '#F2A7C6', '#A874D6', '#FF4F93'),
      front: `<circle cx="170" cy="115" r="48" fill="${th.glow}"/><circle cx="170" cy="115" r="95" fill="${th.glow}" opacity=".3"/>`
        + cloud(360, 120, 1.1) + cloud(560, 70, 0.8) + cloud(930, 150, 0.9)
        + bunting(-2, 16, ['#FF5C9A', '#FFD86B', '#B98AE0', '#7FD1C7', '#FF9E7A'])
        + crown(430, 175, 1.3, '#FFD86B', '#FF5C9A') + slipper(290, 250, 1.2, '#A874D6', 1.1) + teacup(570, 255, 1, '#5FC2B5', 2.2)
        + heart(250, 300, 1, '#FF8FB8', 0.4) + heart(880, 60, 0.8, '#FFFFFF', 1.7) + heart(540, 300, 0.7, '#FF5C9A', 2.6)
        + diary(210, 452, 1.1, '#FF4F93', '#FFD86B')
        + flower(40, 505, 1, '#FF8FB8') + flower(230, 510, 0.9, '#FFD86B') + flower(900, 505, 1, '#B98AE0') + flower(960, 500, 0.8, '#FF8FB8')
        + sparkle(420, 60, 1, '#fff', 0.3) + sparkle(700, 110, 0.8, '#fff', 1.2),
    };
  }
  if (th.id === 'misterio') {
    return {
      back: '',
      front: stars(40, '#FFFFFF', 7) + moon(820, 95, 40, '#FFF4D6', th.glow) + skyline(360, th.far, '#FFE08A', 11)
        + `<g opacity=".95">${skyline(420, th.near, '#FFD166', 5)}</g>` + lamp(110, 520, 1.2, th.glow) + lamp(900, 520, 1.1, th.glow)
        + magnifier(640, 120, 1, '#E9C46A'),
    };
  }
  if (th.id === 'assombracao') {
    return {
      back: house(500, 400, 1, th.mid, '#B8FFD0'),
      front: stars(35, '#E6DBFF', 13) + moon(790, 100, 46, '#E8FFE9', th.glow) + tree(90, 520, 1.25, th.near) + tree(930, 520, 1.1, th.near)
        + bat(300, 110, 1.2, '#0B0714', 0) + bat(660, 70, 1, '#0B0714', 1.4) + bat(720, 160, 0.8, '#0B0714', 2.3)
        + ghost(200, 230, 1.2, 0) + ghost(860, 260, 0.9, 2),
    };
  }
  return {
    back: castle(250, 380, 0.9, th.mid),
    front: sparkle(160, 70, 1.6, '#fff', 0) + sparkle(820, 50, 1.2, '#fff', 1) + sparkle(620, 120, 1, '#FFF6B8', 0.6) + sparkle(330, 40, 0.9, '#fff', 1.8)
      + `<circle cx="840" cy="110" r="46" fill="${th.glow}" opacity=".9"/><circle cx="840" cy="110" r="90" fill="${th.glow}" opacity=".25"/>`
      + mushroom(90, 480, 1.5, '#E8559A', '#FFF3E0') + mushroom(150, 488, 1, '#FF8FB8', '#FFF3E0') + mushroom(905, 486, 1.3, '#7C5CFF', '#FFF3E0')
      + flower(60, 500, 1, '#FF8FB8') + flower(210, 505, 0.9, '#FFD166') + flower(860, 505, 1, '#9ED8FF') + flower(950, 500, 0.8, '#FF8FB8')
      + stars(20, '#FFFFFF', 3),
  };
}

export function paintScene(th) {
  const [s0, s1, s2] = th.sky;
  const { back, front } = layers(th);
  return `<svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s0}"/><stop offset=".6" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient>
      <filter id="paint" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="3" seed="4"/><feDisplacementMap in="SourceGraphic" scale="14"/></filter>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
      <radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
    </defs>
    <rect width="1000" height="560" fill="url(#sky)"/>
    <g filter="url(#paint)">
      ${hills(330, 70, th.far, 1)}${back}${hills(400, 50, th.mid, 2)}
      ${front}
      ${hills(470, 40, th.near, 3)}${hills(525, 20, th.ground, 4)}
    </g>
    <rect width="1000" height="560" filter="url(#grain)" fill="#fff"/>
    <rect width="1000" height="560" fill="url(#vig)"/>
  </svg>`;
}

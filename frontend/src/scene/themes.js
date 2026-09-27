// Temas da estante no estilo "Livro de histórias". Novos temas entram aqui.
export const THEMES = {
  fadas: {
    id: 'fadas', name: 'Fadas', icon: '🧚',
    sky: ['#FFD9EE', '#E9D8FF', '#C9E6FF'], far: '#D7C2F2', mid: '#B79BE6', near: '#8E74D6', ground: '#6E57B8',
    glow: '#FFF6B8', wood: ['#D9A3C8', '#B26F9E', '#8A4E7A'], gold: '#FFE7A3', ink: '#3E2147', inkSoft: '#6B4A73',
  },
  misterio: {
    id: 'misterio', name: 'Mistério', icon: '🔍',
    sky: ['#1B2440', '#2C3B63', '#48598A'], far: '#34446E', mid: '#26335A', near: '#1A2443', ground: '#141B33',
    glow: '#FFE08A', wood: ['#8B5E3C', '#6B4529', '#4A2E1A'], gold: '#E9C46A', ink: '#FFF4D6', inkSoft: '#C9CFE6',
  },
  assombracao: {
    id: 'assombracao', name: 'Assombração', icon: '👻',
    sky: ['#0F0B1C', '#261640', '#44215A'], far: '#2E1E45', mid: '#221536', near: '#170E26', ground: '#0E0819',
    glow: '#B8FFD0', wood: ['#4C4053', '#352C3A', '#211A25'], gold: '#9EF2B5', ink: '#EFE6FF', inkSoft: '#BFB2D9',
  },
  princesa: {
    id: 'princesa', name: 'Princesa Desastrada', icon: '👑',
    sky: ['#FFD9E6', '#FFE6EE', '#FFF1DC'], far: '#F6C3D8', mid: '#EFA6C6', near: '#DD86B0', ground: '#C0679A',
    glow: '#FFF0B8', wood: ['#F4C6DA', '#E394B8', '#BC6892'], gold: '#FFD86B', ink: '#4A1F3D', inkSoft: '#7A4A6B',
    // Personagens e mapa de Florentia de "O Diário de uma Princesa Desastrada",
    // tirados só do site oficial (uso não comercial autorizado).
    // O mapa foi recortado da foto do site, endireitado e sem o brilho e as dobras.
    // A Amora fica sempre; do outro lado os amigos se revezam, começando pelo Scorpio.
    backdrop: '/temas/princesa/mapa-florentia.webp',
    characters: {
      always: [{ id: 'amora', src: '/temas/princesa/amora.webp', side: 'left' }],
      guests: [
        { id: 'scorpio', src: '/temas/princesa/scorpio.webp', side: 'right' },
        { id: 'olivia', src: '/temas/princesa/olivia.webp', side: 'right' },
        { id: 'lila', src: '/temas/princesa/lila.webp', side: 'right' },
        { id: 'stena', src: '/temas/princesa/stena.webp', side: 'right' },
      ],
    },
    credit: 'Personagens e mapa de O Diário de uma Princesa Desastrada®. Todos os direitos reservados. Uso autorizado, não comercial.',
  },
};

export const THEME_LIST = Object.values(THEMES);
// Personagens em cena na vez `turn`: os fixos e o amigo da vez.
export function charactersAt(theme, turn = 0) {
  const { always = [], guests = [] } = theme.characters || {};
  const guest = guests.length ? [guests[turn % guests.length]] : [];
  return [...always, ...guest];
}

export const themeFor = (id) => THEMES[id] || THEMES.fadas;

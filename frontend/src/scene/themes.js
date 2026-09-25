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
};

export const THEME_LIST = Object.values(THEMES);
export const themeFor = (id) => THEMES[id] || THEMES.fadas;

/**
 * Temas da estante. Cada tema troca as cores da madeira, do fundo e da luz.
 * Novos temas entram aqui sem mexer nos componentes.
 */
export const THEMES = [
  {
    id: 'fadas',
    name: 'Fadas',
    icon: '🧚',
    sky: 'linear-gradient(180deg, #ffd6ec 0%, #e9d7ff 55%, #cfe8ff 100%)',
    wall: '#fff4fb',
    wood: '#c98bb9',
    woodDark: '#9c5f8e',
    ink: '#4a2346',
    glow: 'rgba(255, 220, 250, 0.9)',
    sparkle: '✨',
  },
  {
    id: 'misterio',
    name: 'Mistério',
    icon: '🔍',
    sky: 'linear-gradient(180deg, #1f2a44 0%, #2d3c5e 60%, #3e4f73 100%)',
    wall: '#e7ecf6',
    wood: '#6b4a2f',
    woodDark: '#4a311d',
    ink: '#f3efe2',
    glow: 'rgba(255, 214, 120, 0.55)',
    sparkle: '🗝️',
  },
  {
    id: 'assombracao',
    name: 'Assombração',
    icon: '👻',
    sky: 'linear-gradient(180deg, #120d1f 0%, #2a1740 55%, #3d1f4f 100%)',
    wall: '#e9e1f5',
    wood: '#3d3340',
    woodDark: '#241d27',
    ink: '#efe6ff',
    glow: 'rgba(150, 255, 190, 0.35)',
    sparkle: '🦇',
  },
];

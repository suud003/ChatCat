/**
 * Character presets and categories for the character selection panel.
 * Each preset maps to a different skin (color tint / instrument) of the bongo cat sprites.
 */

export const CATEGORIES = [
  { id: 'all',        name: 'All' },
  { id: 'color',      name: 'Colors' },
  { id: 'instrument', name: 'Instruments' },
  { id: 'combo',      name: 'Combos' },
];

// Color palette for avatar initials
const AVATAR_COLORS = [
  ['#ff6b6b', '#ee5a24'], ['#a29bfe', '#6c5ce7'], ['#55efc4', '#00b894'],
  ['#fd79a8', '#e84393'], ['#74b9ff', '#0984e3'], ['#ffeaa7', '#fdcb6e'],
  ['#dfe6e9', '#b2bec3'], ['#fab1a0', '#e17055'], ['#81ecec', '#00cec9'],
  ['#ff9ff3', '#f368e0'], ['#48dbfb', '#0abde3'], ['#feca57', '#ff9f43'],
];

function avatarColor(index) {
  const c = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return { from: c[0], to: c[1] };
}

export const CHARACTER_PRESETS = [
  // === Color skins ===
  { id: 'bongo-classic', name: 'Classic Cat',  color: avatarColor(6),  type: 'skin', category: 'color', description: 'Original Bongo Cat' },
  { id: 'bongo-orange',  name: 'Orange Cat',   color: avatarColor(11), type: 'skin', category: 'color', description: 'Warm orange tabby' },
  { id: 'bongo-pink',    name: 'Pink Cat',     color: avatarColor(3),  type: 'skin', category: 'color', description: 'Cute pink kitty' },
  { id: 'bongo-blue',    name: 'Blue Cat',     color: avatarColor(4),  type: 'skin', category: 'color', description: 'Cool blue feline' },
  { id: 'bongo-green',   name: 'Green Cat',    color: avatarColor(2),  type: 'skin', category: 'color', description: 'Matcha green cat' },
  { id: 'bongo-purple',  name: 'Purple Cat',   color: avatarColor(1),  type: 'skin', category: 'color', description: 'Royal purple cat' },
  { id: 'bongo-golden',  name: 'Golden Cat',   color: avatarColor(5),  type: 'skin', category: 'color', description: 'Shiny golden cat' },
  { id: 'bongo-dark',    name: 'Shadow Cat',   color: avatarColor(6),  type: 'skin', category: 'color', description: 'Dark shadow cat' },
  { id: 'bongo-invert',  name: 'Inverted Cat', color: avatarColor(9),  type: 'skin', category: 'color', description: 'Inverted colors' },
  { id: 'bongo-cyber',   name: 'Cyber Cat',    color: { from: '#00f5d4', to: '#7209b7' }, type: 'skin', category: 'color', description: 'Cyberpunk neon' },
  { id: 'bongo-sunset',  name: 'Sunset Cat',   color: { from: '#ff6b6b', to: '#feca57' }, type: 'skin', category: 'color', description: 'Warm sunset glow' },
  { id: 'bongo-ice',     name: 'Ice Cat',      color: { from: '#a1c4fd', to: '#c2e9fb' }, type: 'skin', category: 'color', description: 'Frozen ice crystal' },
  { id: 'bongo-cherry',  name: 'Cherry Cat',   color: { from: '#ff0844', to: '#ffb199' }, type: 'skin', category: 'color', description: 'Sweet cherry blossom' },
  { id: 'bongo-mint',    name: 'Mint Cat',     color: { from: '#a8edea', to: '#fed6e3' }, type: 'skin', category: 'color', description: 'Fresh mint breeze' },
  { id: 'bongo-coral',   name: 'Coral Cat',    color: { from: '#ff9a9e', to: '#fad0c4' }, type: 'skin', category: 'color', description: 'Ocean coral pink' },
  { id: 'bongo-lemon',   name: 'Lemon Cat',    color: { from: '#f9d423', to: '#ff4e50' }, type: 'skin', category: 'color', description: 'Zesty lemon twist' },
  { id: 'bongo-ghost',   name: 'Ghost Cat',    color: { from: '#e0e0e0', to: '#f5f5f5' }, type: 'skin', category: 'color', description: 'Ghostly pale phantom' },

  // === Instrument skins ===
  { id: 'bongo-drum',       name: 'Bongo Drum',     color: { from: '#e17055', to: '#d63031' }, type: 'instrument', category: 'instrument', description: 'Classic bongo drums' },
  { id: 'bongo-cymbal',     name: 'Cymbal Cat',     color: { from: '#ffeaa7', to: '#f39c12' }, type: 'instrument', category: 'instrument', description: 'Shiny crash cymbal' },
  { id: 'bongo-tambourine', name: 'Tambourine Cat', color: { from: '#fdcb6e', to: '#e67e22' }, type: 'instrument', category: 'instrument', description: 'Jingle tambourine' },
  { id: 'bongo-marimba',    name: 'Marimba Cat',    color: { from: '#55efc4', to: '#00b894' }, type: 'instrument', category: 'instrument', description: 'Wooden marimba bars' },
  { id: 'bongo-cowbell',    name: 'Cowbell Cat',     color: { from: '#dfe6e9', to: '#636e72' }, type: 'instrument', category: 'instrument', description: 'More cowbell!' },

  // === Combos (color + instrument) ===
  { id: 'bongo-drum-pink',     name: 'Pink Drummer',    color: { from: '#fd79a8', to: '#e84393' }, type: 'combo', category: 'combo', description: 'Pink cat on bongo drums' },
  { id: 'bongo-drum-blue',     name: 'Blue Drummer',    color: { from: '#74b9ff', to: '#0984e3' }, type: 'combo', category: 'combo', description: 'Blue cat on bongo drums' },
  { id: 'bongo-cymbal-gold',   name: 'Gold Cymbalist',  color: { from: '#ffeaa7', to: '#fdcb6e' }, type: 'combo', category: 'combo', description: 'Golden cat with cymbal' },
  { id: 'bongo-marimba-green', name: 'Green Marimba',   color: { from: '#55efc4', to: '#00b894' }, type: 'combo', category: 'combo', description: 'Green cat on marimba' },
];

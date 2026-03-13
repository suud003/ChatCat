/**
 * Character presets and categories for the character selection panel.
 * Each preset maps to a different skin (color tint) of the bongo cat sprites.
 */

export const CATEGORIES = [
  { id: 'all', name: 'All' },
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
  { id: 'bongo-classic', name: 'Classic Cat',  color: avatarColor(6),  type: 'skin', category: 'all', description: 'Original Bongo Cat' },
  { id: 'bongo-orange',  name: 'Orange Cat',   color: avatarColor(11), type: 'skin', category: 'all', description: 'Warm orange tabby' },
  { id: 'bongo-pink',    name: 'Pink Cat',     color: avatarColor(3),  type: 'skin', category: 'all', description: 'Cute pink kitty' },
  { id: 'bongo-blue',    name: 'Blue Cat',     color: avatarColor(4),  type: 'skin', category: 'all', description: 'Cool blue feline' },
  { id: 'bongo-green',   name: 'Green Cat',    color: avatarColor(2),  type: 'skin', category: 'all', description: 'Matcha green cat' },
  { id: 'bongo-purple',  name: 'Purple Cat',   color: avatarColor(1),  type: 'skin', category: 'all', description: 'Royal purple cat' },
  { id: 'bongo-golden',  name: 'Golden Cat',   color: avatarColor(5),  type: 'skin', category: 'all', description: 'Shiny golden cat' },
  { id: 'bongo-dark',    name: 'Shadow Cat',   color: avatarColor(6),  type: 'skin', category: 'all', description: 'Dark shadow cat' },
  { id: 'bongo-invert',  name: 'Inverted Cat', color: avatarColor(9),  type: 'skin', category: 'all', description: 'Inverted colors' },
];

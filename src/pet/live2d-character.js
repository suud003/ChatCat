/**
 * Character presets and categories for the character selection panel.
 * Each preset maps to a different skin (color tint / instrument) of the bongo cat sprites.
 */

export const CATEGORIES = [
  { id: 'all',        name: '全部' },
  { id: 'color',      name: '颜色' },
  { id: 'instrument', name: '乐器' },
  { id: 'combo',      name: '组合' },
  { id: 'animated',   name: '动画' },
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

// Instrument name mapping (English key → Chinese display)
const INSTRUMENT_NAMES = {
  keyboard:    '键盘',
  bongo:       '邦戈鼓',
  cymbal:      '镲',
  tambourine:  '铃鼓',
  marimba:     '马林巴',
  cowbell:     '牛铃',
};

export { INSTRUMENT_NAMES };

export const CHARACTER_PRESETS = [
  // === Color skins ===
  { id: 'hachiware',     name: '哈奇猫',   colorName: '白蓝色', instrument: 'keyboard', color: { from: '#a1c4fd', to: '#c2e9fb' }, type: 'skin', category: 'color', description: 'AI生成的哈奇猫序列帧' },
  { id: 'bongo-classic', name: '经典猫',   colorName: '原色',  instrument: 'keyboard', color: avatarColor(6),  type: 'skin', category: 'color', description: '原版邦戈猫' },
  { id: 'bongo-orange',  name: '橘猫',     colorName: '橘色',  instrument: 'keyboard', color: avatarColor(11), type: 'skin', category: 'color', description: '温暖的橘色猫' },
  { id: 'bongo-pink',    name: '粉猫',     colorName: '粉色',  instrument: 'keyboard', color: avatarColor(3),  type: 'skin', category: 'color', description: '可爱的粉色猫' },
  { id: 'bongo-blue',    name: '蓝猫',     colorName: '蓝色',  instrument: 'keyboard', color: avatarColor(4),  type: 'skin', category: 'color', description: '清凉的蓝色猫' },
  { id: 'bongo-green',   name: '绿猫',     colorName: '绿色',  instrument: 'keyboard', color: avatarColor(2),  type: 'skin', category: 'color', description: '抹茶绿色猫' },
  { id: 'bongo-purple',  name: '紫猫',     colorName: '紫色',  instrument: 'keyboard', color: avatarColor(1),  type: 'skin', category: 'color', description: '高贵紫色猫' },
  { id: 'bongo-golden',  name: '金猫',     colorName: '金色',  instrument: 'keyboard', color: avatarColor(5),  type: 'skin', category: 'color', description: '闪亮金色猫' },
  { id: 'bongo-dark',    name: '暗影猫',   colorName: '暗色',  instrument: 'keyboard', color: avatarColor(6),  type: 'skin', category: 'color', description: '暗影色猫' },
  { id: 'bongo-invert',  name: '反色猫',   colorName: '反色',  instrument: 'keyboard', color: avatarColor(9),  type: 'skin', category: 'color', description: '反转色猫' },
  { id: 'bongo-cyber',   name: '赛博猫',   colorName: '赛博',  instrument: 'keyboard', color: { from: '#00f5d4', to: '#7209b7' }, type: 'skin', category: 'color', description: '赛博朋克霓虹猫' },
  { id: 'bongo-sunset',  name: '夕阳猫',   colorName: '夕阳',  instrument: 'keyboard', color: { from: '#ff6b6b', to: '#feca57' }, type: 'skin', category: 'color', description: '温暖的夕阳猫' },
  { id: 'bongo-ice',     name: '冰猫',     colorName: '冰蓝',  instrument: 'keyboard', color: { from: '#a1c4fd', to: '#c2e9fb' }, type: 'skin', category: 'color', description: '冰晶猫' },
  { id: 'bongo-cherry',  name: '樱花猫',   colorName: '樱红',  instrument: 'keyboard', color: { from: '#ff0844', to: '#ffb199' }, type: 'skin', category: 'color', description: '樱花粉猫' },
  { id: 'bongo-mint',    name: '薄荷猫',   colorName: '薄荷',  instrument: 'keyboard', color: { from: '#a8edea', to: '#fed6e3' }, type: 'skin', category: 'color', description: '薄荷清风猫' },
  { id: 'bongo-coral',   name: '珊瑚猫',   colorName: '珊瑚',  instrument: 'keyboard', color: { from: '#ff9a9e', to: '#fad0c4' }, type: 'skin', category: 'color', description: '珊瑚粉猫' },
  { id: 'bongo-lemon',   name: '柠檬猫',   colorName: '柠黄',  instrument: 'keyboard', color: { from: '#f9d423', to: '#ff4e50' }, type: 'skin', category: 'color', description: '柠檬黄猫' },
  { id: 'bongo-ghost',   name: '幽灵猫',   colorName: '幽白',  instrument: 'keyboard', color: { from: '#e0e0e0', to: '#f5f5f5' }, type: 'skin', category: 'color', description: '幽灵苍白猫' },

  // === Instrument skins ===
  { id: 'bongo-drum',       name: '邦戈鼓猫', colorName: '原色', instrument: 'bongo',      color: { from: '#e17055', to: '#d63031' }, type: 'instrument', category: 'instrument', description: '经典邦戈鼓' },
  { id: 'bongo-cymbal',     name: '镲猫',     colorName: '原色', instrument: 'cymbal',     color: { from: '#ffeaa7', to: '#f39c12' }, type: 'instrument', category: 'instrument', description: '闪亮的镲' },
  { id: 'bongo-tambourine', name: '铃鼓猫',   colorName: '原色', instrument: 'tambourine', color: { from: '#fdcb6e', to: '#e67e22' }, type: 'instrument', category: 'instrument', description: '叮当铃鼓' },
  { id: 'bongo-marimba',    name: '马林巴猫', colorName: '原色', instrument: 'marimba',    color: { from: '#55efc4', to: '#00b894' }, type: 'instrument', category: 'instrument', description: '木质马林巴琴' },
  { id: 'bongo-cowbell',    name: '牛铃猫',   colorName: '原色', instrument: 'cowbell',    color: { from: '#dfe6e9', to: '#636e72' }, type: 'instrument', category: 'instrument', description: '铛铛牛铃' },

  // === Combos (color + instrument) ===
  { id: 'bongo-drum-pink',     name: '粉色鼓手',   colorName: '粉色', instrument: 'bongo',   color: { from: '#fd79a8', to: '#e84393' }, type: 'combo', category: 'combo', description: '粉猫敲邦戈鼓' },
  { id: 'bongo-drum-blue',     name: '蓝色鼓手',   colorName: '蓝色', instrument: 'bongo',   color: { from: '#74b9ff', to: '#0984e3' }, type: 'combo', category: 'combo', description: '蓝猫敲邦戈鼓' },
  { id: 'bongo-cymbal-gold',   name: '金色镲手',   colorName: '金色', instrument: 'cymbal',  color: { from: '#ffeaa7', to: '#fdcb6e' }, type: 'combo', category: 'combo', description: '金猫敲镲' },
  { id: 'bongo-marimba-green', name: '绿色马林巴', colorName: '绿色', instrument: 'marimba', color: { from: '#55efc4', to: '#00b894' }, type: 'combo', category: 'combo', description: '绿猫敲马林巴' },

  // === Animated sprite sheet skins ===
  { id: 'animated-default', name: '动画猫',   colorName: '原色', instrument: null, color: { from: '#ff9ff3', to: '#f368e0' }, type: 'animated', category: 'animated', description: '带动画的猫咪' },
  { id: 'animated-pink',    name: '动画粉猫', colorName: '粉色', instrument: null, color: { from: '#fd79a8', to: '#e84393' }, type: 'animated', category: 'animated', description: '粉色动画猫' },
  { id: 'animated-blue',    name: '动画蓝猫', colorName: '蓝色', instrument: null, color: { from: '#74b9ff', to: '#0984e3' }, type: 'animated', category: 'animated', description: '蓝色动画猫' },
];

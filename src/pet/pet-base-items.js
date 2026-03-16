/**
 * Pet Base Items — catalog of purchasable items for the pet base shop.
 * Each item has: id, name, icon, cost, multiplier (typing bonus), rarity.
 * Multiplier stacks additively: total item bonus = sum of all (item.multiplier × count).
 * Final typing multiplier = (1 + itemBonus) × prestige × mood × streak.
 *
 * Prestige materials (rarity: 'prestige') have multiplier:0 and a prestigeTier field.
 * They are consumed during rebirth and do NOT appear in normal shop refreshes.
 */

export const RARITY_CONFIG = {
  common:    { label: '普通', color: '#9e9e9e', refreshMinutes: 60,   displayCount: 4 },
  rare:      { label: '稀有', color: '#2196f3', refreshMinutes: 240,  displayCount: 3 },
  epic:      { label: '史诗', color: '#9c27b0', refreshMinutes: 720,  displayCount: 2 },
  legendary: { label: '传说', color: '#ff9800', refreshMinutes: 1440, displayCount: 1 },
  prestige:  { label: '转生材料', color: '#e91e63', refreshMinutes: Infinity, displayCount: 0 },
};

export const PET_BASE_ITEMS = [
  // ── Common (cost 50-400, multiplier +0.02~0.10) ──
  { id: 'yarn-ball',    name: '毛线球',     icon: '🧶', cost: 50,    multiplier: 0.02, rarity: 'common' },
  { id: 'cat-bowl',     name: '猫粮碗',     icon: '🍜', cost: 80,    multiplier: 0.03, rarity: 'common' },
  { id: 'fish-toy',     name: '小鱼干',     icon: '🐟', cost: 120,   multiplier: 0.04, rarity: 'common' },
  { id: 'scratching',   name: '猫抓板',     icon: '📦', cost: 180,   multiplier: 0.06, rarity: 'common' },
  { id: 'cat-bed',      name: '猫窝',       icon: '🛏️', cost: 250,   multiplier: 0.08, rarity: 'common' },
  // New common items
  { id: 'cat-bell',     name: '铃铛项圈',   icon: '🔔', cost: 100,   multiplier: 0.03, rarity: 'common' },
  { id: 'feather-wand', name: '逗猫棒',     icon: '🪶', cost: 150,   multiplier: 0.05, rarity: 'common' },
  { id: 'cat-grass',    name: '猫草盆栽',   icon: '🌱', cost: 200,   multiplier: 0.06, rarity: 'common' },
  { id: 'milk-bowl',    name: '牛奶碗',     icon: '🥛', cost: 300,   multiplier: 0.08, rarity: 'common' },
  { id: 'cat-cushion',  name: '猫咪坐垫',   icon: '🛋️', cost: 400,   multiplier: 0.10, rarity: 'common' },

  // ── Rare (cost 500-3000, multiplier +0.12~0.30) ──
  { id: 'cat-tree',     name: '猫爬架',     icon: '🌲', cost: 500,   multiplier: 0.12, rarity: 'rare' },
  { id: 'laser-toy',    name: '激光笔',     icon: '🔴', cost: 800,   multiplier: 0.16, rarity: 'rare' },
  { id: 'cat-tunnel',   name: '猫隧道',     icon: '🕳️', cost: 1200,  multiplier: 0.20, rarity: 'rare' },
  { id: 'fish-tank',    name: '观赏鱼缸',   icon: '🐠', cost: 1800,  multiplier: 0.25, rarity: 'rare' },
  // New rare items
  { id: 'cat-hammock',  name: '猫吊床',     icon: '🏖️', cost: 600,   multiplier: 0.14, rarity: 'rare' },
  { id: 'auto-feeder',  name: '自动喂食器', icon: '⏰', cost: 1000,  multiplier: 0.18, rarity: 'rare' },
  { id: 'cat-fountain', name: '猫咪饮水机', icon: '⛲', cost: 1500,  multiplier: 0.22, rarity: 'rare' },
  { id: 'cat-tv',       name: '猫咪电视',   icon: '📺', cost: 3000,  multiplier: 0.30, rarity: 'rare' },

  // ── Epic (cost 5000-25000, multiplier +0.5~2.0) ──
  { id: 'cat-villa',    name: '猫咪别墅',   icon: '🏠', cost: 5000,  multiplier: 0.5,  rarity: 'epic' },
  { id: 'cat-garden',   name: '猫薄荷花园', icon: '🌿', cost: 8000,  multiplier: 0.8,  rarity: 'epic' },
  { id: 'cat-cafe',     name: '猫咖啡厅',   icon: '☕', cost: 12000, multiplier: 1.0,  rarity: 'epic' },
  { id: 'cat-spa',      name: '猫猫水疗',   icon: '💆', cost: 18000, multiplier: 1.5,  rarity: 'epic' },
  // New epic items
  { id: 'cat-library',  name: '猫猫图书馆', icon: '📚', cost: 6000,  multiplier: 0.6,  rarity: 'epic' },
  { id: 'cat-gym',      name: '猫猫健身房', icon: '💪', cost: 10000, multiplier: 0.9,  rarity: 'epic' },
  { id: 'cat-theater',  name: '猫猫剧场',   icon: '🎭', cost: 15000, multiplier: 1.2,  rarity: 'epic' },
  { id: 'cat-lab',      name: '猫猫实验室', icon: '🔬', cost: 25000, multiplier: 2.0,  rarity: 'epic' },

  // ── Legendary (cost 50000-300000, multiplier +3~12) ──
  { id: 'cat-kingdom',  name: '猫猫王国',   icon: '👑', cost: 50000,  multiplier: 3.0,  rarity: 'legendary' },
  { id: 'cat-spaceship',name: '猫猫飞船',   icon: '🚀', cost: 100000, multiplier: 5.0,  rarity: 'legendary' },
  { id: 'cat-dimension',name: '喵次元',     icon: '🌀', cost: 150000, multiplier: 7.0,  rarity: 'legendary' },
  { id: 'cat-universe', name: '猫猫宇宙',   icon: '✨', cost: 200000, multiplier: 10.0, rarity: 'legendary' },
  // New legendary items
  { id: 'cat-timeloop', name: '时空猫环',   icon: '⏳', cost: 60000,  multiplier: 4.0,  rarity: 'legendary' },
  { id: 'cat-dragon',   name: '猫猫龙骑',   icon: '🐉', cost: 120000, multiplier: 6.0,  rarity: 'legendary' },
  { id: 'cat-paradise', name: '猫猫乐园',   icon: '🎡', cost: 180000, multiplier: 8.0,  rarity: 'legendary' },
  { id: 'cat-multiverse',name:'猫猫多元宇宙',icon:'🪐', cost: 300000, multiplier: 12.0, rarity: 'legendary' },

  // ── Prestige materials (consumed on rebirth, multiplier:0) ──
  { id: 'rebirth-stone-1', name: '转生石·初', icon: '🔮', cost: 5000,   multiplier: 0, rarity: 'prestige', prestigeTier: 1 },
  { id: 'rebirth-stone-2', name: '转生石·承', icon: '💎', cost: 15000,  multiplier: 0, rarity: 'prestige', prestigeTier: 2 },
  { id: 'rebirth-stone-3', name: '转生石·转', icon: '🌟', cost: 40000,  multiplier: 0, rarity: 'prestige', prestigeTier: 3 },
  { id: 'rebirth-stone-4', name: '转生石·合', icon: '⭐', cost: 100000, multiplier: 0, rarity: 'prestige', prestigeTier: 4 },
  { id: 'rebirth-stone-5', name: '转生石·极', icon: '🌠', cost: 250000, multiplier: 0, rarity: 'prestige', prestigeTier: 5 },
];

/** Get item by id */
export function getItemById(id) {
  return PET_BASE_ITEMS.find(item => item.id === id);
}

/** Get items by rarity */
export function getItemsByRarity(rarity) {
  return PET_BASE_ITEMS.filter(item => item.rarity === rarity);
}

/** Get the prestige material for a specific tier (1-5) */
export function getPrestigeMaterial(tier) {
  return PET_BASE_ITEMS.find(item => item.rarity === 'prestige' && item.prestigeTier === tier);
}

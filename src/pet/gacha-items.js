/**
 * Gacha Items — catalog of items obtainable through the gacha system.
 * 125 items across 5 rarity tiers: N(50), R(40), SR(20), SSR(10), SSSR(5).
 * Item id format: g-{rarity}-{category}-{name}
 */

export const GACHA_RARITY = {
  N:    { label: 'N',    color: '#9e9e9e', prob: 0.553 },
  R:    { label: 'R',    color: '#2196f3', prob: 0.270 },
  SR:   { label: 'SR',   color: '#9c27b0', prob: 0.120 },
  SSR:  { label: 'SSR',  color: '#ff9800', prob: 0.047 },
  SSSR: { label: 'SSSR', color: '#e91e63', prob: 0.010 },
};

export const GACHA_ITEMS = [
  // ═══════════════════════════════════════════════════════════
  // N (50) — Basic Accessories: 10 categories x 5 colors
  // ═══════════════════════════════════════════════════════════

  // Ribbons (5)
  { id: 'g-n-ribbon-red',      name: '红色蝴蝶结',     icon: '🎀', rarity: 'N', category: 'ribbon',  desc: '可爱的红色蝴蝶结' },
  { id: 'g-n-ribbon-pink',     name: '粉色蝴蝶结',     icon: '🎀', rarity: 'N', category: 'ribbon',  desc: '甜美的粉色蝴蝶结' },
  { id: 'g-n-ribbon-blue',     name: '蓝色蝴蝶结',     icon: '🎀', rarity: 'N', category: 'ribbon',  desc: '清新的蓝色蝴蝶结' },
  { id: 'g-n-ribbon-yellow',   name: '黄色蝴蝶结',     icon: '🎀', rarity: 'N', category: 'ribbon',  desc: '明亮的黄色蝴蝶结' },
  { id: 'g-n-ribbon-purple',   name: '紫色蝴蝶结',     icon: '🎀', rarity: 'N', category: 'ribbon',  desc: '优雅的紫色蝴蝶结' },

  // Bells (5)
  { id: 'g-n-bell-gold',       name: '金色铃铛',       icon: '🔔', rarity: 'N', category: 'bell',    desc: '叮铃铃的金色铃铛' },
  { id: 'g-n-bell-silver',     name: '银色铃铛',       icon: '🔔', rarity: 'N', category: 'bell',    desc: '清脆的银色铃铛' },
  { id: 'g-n-bell-bronze',     name: '铜色铃铛',       icon: '🔔', rarity: 'N', category: 'bell',    desc: '复古的铜色铃铛' },
  { id: 'g-n-bell-crystal',    name: '水晶铃铛',       icon: '🔔', rarity: 'N', category: 'bell',    desc: '透明的水晶铃铛' },
  { id: 'g-n-bell-rainbow',    name: '彩虹铃铛',       icon: '🔔', rarity: 'N', category: 'bell',    desc: '七彩的彩虹铃铛' },

  // Scarves (5)
  { id: 'g-n-scarf-red',       name: '红色围巾',       icon: '🧣', rarity: 'N', category: 'scarf',   desc: '温暖的红色围巾' },
  { id: 'g-n-scarf-blue',      name: '蓝色围巾',       icon: '🧣', rarity: 'N', category: 'scarf',   desc: '清凉的蓝色围巾' },
  { id: 'g-n-scarf-green',     name: '绿色围巾',       icon: '🧣', rarity: 'N', category: 'scarf',   desc: '自然的绿色围巾' },
  { id: 'g-n-scarf-white',     name: '白色围巾',       icon: '🧣', rarity: 'N', category: 'scarf',   desc: '纯净的白色围巾' },
  { id: 'g-n-scarf-striped',   name: '条纹围巾',       icon: '🧣', rarity: 'N', category: 'scarf',   desc: '时尚的条纹围巾' },

  // Hairpins (5)
  { id: 'g-n-hairpin-star',    name: '星星发卡',       icon: '⭐', rarity: 'N', category: 'hairpin', desc: '闪亮的星星发卡' },
  { id: 'g-n-hairpin-heart',   name: '爱心发卡',       icon: '💗', rarity: 'N', category: 'hairpin', desc: '可爱的爱心发卡' },
  { id: 'g-n-hairpin-moon',    name: '月亮发卡',       icon: '🌙', rarity: 'N', category: 'hairpin', desc: '神秘的月亮发卡' },
  { id: 'g-n-hairpin-flower',  name: '花朵发卡',       icon: '🌸', rarity: 'N', category: 'hairpin', desc: '清新的花朵发卡' },
  { id: 'g-n-hairpin-crown',   name: '皇冠发卡',       icon: '👑', rarity: 'N', category: 'hairpin', desc: '迷你皇冠发卡' },

  // Gloves (5)
  { id: 'g-n-glove-white',     name: '白色手套',       icon: '🧤', rarity: 'N', category: 'glove',   desc: '干净的白色手套' },
  { id: 'g-n-glove-pink',      name: '粉色手套',       icon: '🧤', rarity: 'N', category: 'glove',   desc: '软萌的粉色手套' },
  { id: 'g-n-glove-black',     name: '黑色手套',       icon: '🧤', rarity: 'N', category: 'glove',   desc: '帅气的黑色手套' },
  { id: 'g-n-glove-striped',   name: '条纹手套',       icon: '🧤', rarity: 'N', category: 'glove',   desc: '活泼的条纹手套' },
  { id: 'g-n-glove-knit',      name: '针织手套',       icon: '🧤', rarity: 'N', category: 'glove',   desc: '温暖的针织手套' },

  // Socks (5)
  { id: 'g-n-sock-white',      name: '白色袜子',       icon: '🧦', rarity: 'N', category: 'sock',    desc: '干净的白色袜子' },
  { id: 'g-n-sock-striped',    name: '条纹袜子',       icon: '🧦', rarity: 'N', category: 'sock',    desc: '经典条纹袜子' },
  { id: 'g-n-sock-polka',      name: '波点袜子',       icon: '🧦', rarity: 'N', category: 'sock',    desc: '俏皮波点袜子' },
  { id: 'g-n-sock-paw',        name: '猫爪袜子',       icon: '🧦', rarity: 'N', category: 'sock',    desc: '印有猫爪的袜子' },
  { id: 'g-n-sock-rainbow',    name: '彩虹袜子',       icon: '🧦', rarity: 'N', category: 'sock',    desc: '七彩缤纷袜子' },

  // Necklaces (5)
  { id: 'g-n-necklace-pearl',  name: '珍珠项链',       icon: '📿', rarity: 'N', category: 'necklace', desc: '优雅的珍珠项链' },
  { id: 'g-n-necklace-shell',  name: '贝壳项链',       icon: '🐚', rarity: 'N', category: 'necklace', desc: '海边的贝壳项链' },
  { id: 'g-n-necklace-heart',  name: '爱心吊坠',       icon: '💝', rarity: 'N', category: 'necklace', desc: '可爱的爱心吊坠' },
  { id: 'g-n-necklace-star',   name: '星星吊坠',       icon: '✨', rarity: 'N', category: 'necklace', desc: '闪闪的星星吊坠' },
  { id: 'g-n-necklace-fish',   name: '小鱼吊坠',       icon: '🐟', rarity: 'N', category: 'necklace', desc: '小鱼造型吊坠' },

  // Badges (5)
  { id: 'g-n-badge-paw',       name: '猫爪徽章',       icon: '🐾', rarity: 'N', category: 'badge',   desc: '萌萌的猫爪徽章' },
  { id: 'g-n-badge-fish',      name: '小鱼徽章',       icon: '🐟', rarity: 'N', category: 'badge',   desc: '美味的小鱼徽章' },
  { id: 'g-n-badge-star',      name: '星星徽章',       icon: '⭐', rarity: 'N', category: 'badge',   desc: '闪亮的星星徽章' },
  { id: 'g-n-badge-heart',     name: '爱心徽章',       icon: '❤️', rarity: 'N', category: 'badge',   desc: '暖暖的爱心徽章' },
  { id: 'g-n-badge-music',     name: '音符徽章',       icon: '🎵', rarity: 'N', category: 'badge',   desc: '悦耳的音符徽章' },

  // Stickers (5)
  { id: 'g-n-sticker-smile',   name: '笑脸贴纸',       icon: '😊', rarity: 'N', category: 'sticker', desc: '开心的笑脸贴纸' },
  { id: 'g-n-sticker-cat',     name: '猫脸贴纸',       icon: '😺', rarity: 'N', category: 'sticker', desc: '可爱的猫脸贴纸' },
  { id: 'g-n-sticker-sparkle', name: '亮晶晶贴纸',     icon: '✨', rarity: 'N', category: 'sticker', desc: '闪闪发光的贴纸' },
  { id: 'g-n-sticker-cloud',   name: '云朵贴纸',       icon: '☁️', rarity: 'N', category: 'sticker', desc: '软软的云朵贴纸' },
  { id: 'g-n-sticker-flame',   name: '火焰贴纸',       icon: '🔥', rarity: 'N', category: 'sticker', desc: '热血的火焰贴纸' },

  // Flowers (5)
  { id: 'g-n-flower-sakura',   name: '樱花',           icon: '🌸', rarity: 'N', category: 'flower',  desc: '粉嫩的樱花装饰' },
  { id: 'g-n-flower-rose',     name: '玫瑰',           icon: '🌹', rarity: 'N', category: 'flower',  desc: '红色的玫瑰装饰' },
  { id: 'g-n-flower-daisy',    name: '雏菊',           icon: '🌼', rarity: 'N', category: 'flower',  desc: '清新的雏菊装饰' },
  { id: 'g-n-flower-tulip',    name: '郁金香',         icon: '🌷', rarity: 'N', category: 'flower',  desc: '优雅的郁金香装饰' },
  { id: 'g-n-flower-sunflower',name: '向日葵',         icon: '🌻', rarity: 'N', category: 'flower',  desc: '阳光的向日葵装饰' },

  // ═══════════════════════════════════════════════════════════
  // R (40) — Refined Accessories: 7 sub-categories
  // ═══════════════════════════════════════════════════════════

  // Hats (8)
  { id: 'g-r-hat-beret',       name: '贝雷帽',         icon: '🎩', rarity: 'R', category: 'hat',     desc: '文艺的贝雷帽' },
  { id: 'g-r-hat-tophat',      name: '礼帽',           icon: '🎩', rarity: 'R', category: 'hat',     desc: '绅士的礼帽' },
  { id: 'g-r-hat-witch',       name: '女巫帽',         icon: '🧙', rarity: 'R', category: 'hat',     desc: '神秘的女巫帽' },
  { id: 'g-r-hat-santa',       name: '圣诞帽',         icon: '🎅', rarity: 'R', category: 'hat',     desc: '节日的圣诞帽' },
  { id: 'g-r-hat-crown',       name: '小皇冠',         icon: '👑', rarity: 'R', category: 'hat',     desc: '迷你皇冠头饰' },
  { id: 'g-r-hat-sailor',      name: '水手帽',         icon: '⚓', rarity: 'R', category: 'hat',     desc: '航海水手帽' },
  { id: 'g-r-hat-chef',        name: '厨师帽',         icon: '👨‍🍳', rarity: 'R', category: 'hat',     desc: '专业厨师帽' },
  { id: 'g-r-hat-detective',   name: '侦探帽',         icon: '🕵️', rarity: 'R', category: 'hat',     desc: '福尔摩斯侦探帽' },

  // Glasses (6)
  { id: 'g-r-glasses-round',   name: '圆框眼镜',       icon: '👓', rarity: 'R', category: 'glasses', desc: '复古的圆框眼镜' },
  { id: 'g-r-glasses-heart',   name: '爱心眼镜',       icon: '💗', rarity: 'R', category: 'glasses', desc: '可爱的爱心眼镜' },
  { id: 'g-r-glasses-star',    name: '星星眼镜',       icon: '⭐', rarity: 'R', category: 'glasses', desc: '闪亮的星星眼镜' },
  { id: 'g-r-glasses-monocle', name: '单片眼镜',       icon: '🧐', rarity: 'R', category: 'glasses', desc: '绅士单片眼镜' },
  { id: 'g-r-glasses-sun',     name: '太阳眼镜',       icon: '🕶️', rarity: 'R', category: 'glasses', desc: '帅气的太阳眼镜' },
  { id: 'g-r-glasses-pixel',   name: '像素眼镜',       icon: '👾', rarity: 'R', category: 'glasses', desc: 'Deal with it 像素眼镜' },

  // Capes (6)
  { id: 'g-r-cape-red',        name: '红色披风',       icon: '🦸', rarity: 'R', category: 'cape',    desc: '英雄的红色披风' },
  { id: 'g-r-cape-royal',      name: '皇家披风',       icon: '👑', rarity: 'R', category: 'cape',    desc: '华丽的皇家披风' },
  { id: 'g-r-cape-magic',      name: '魔法斗篷',       icon: '🧙', rarity: 'R', category: 'cape',    desc: '神秘的魔法斗篷' },
  { id: 'g-r-cape-night',      name: '夜幕披风',       icon: '🌙', rarity: 'R', category: 'cape',    desc: '暗夜的星空披风' },
  { id: 'g-r-cape-flower',     name: '花瓣披风',       icon: '🌸', rarity: 'R', category: 'cape',    desc: '飘逸的花瓣披风' },
  { id: 'g-r-cape-frost',      name: '霜之披风',       icon: '❄️', rarity: 'R', category: 'cape',    desc: '寒冰霜华披风' },

  // Wings (5)
  { id: 'g-r-wing-angel',      name: '天使翅膀',       icon: '👼', rarity: 'R', category: 'wing',    desc: '洁白的天使翅膀' },
  { id: 'g-r-wing-bat',        name: '蝙蝠翅膀',       icon: '🦇', rarity: 'R', category: 'wing',    desc: '暗夜蝙蝠翅膀' },
  { id: 'g-r-wing-butterfly',  name: '蝴蝶翅膀',       icon: '🦋', rarity: 'R', category: 'wing',    desc: '绚丽蝴蝶翅膀' },
  { id: 'g-r-wing-fairy',      name: '精灵翅膀',       icon: '🧚', rarity: 'R', category: 'wing',    desc: '透明精灵翅膀' },
  { id: 'g-r-wing-dragon',     name: '龙翼',           icon: '🐉', rarity: 'R', category: 'wing',    desc: '小型的龙翼装饰' },

  // Weapons (5)
  { id: 'g-r-weapon-sword',    name: '小木剑',         icon: '⚔️', rarity: 'R', category: 'weapon',  desc: '勇者的小木剑' },
  { id: 'g-r-weapon-wand',     name: '魔法棒',         icon: '🪄', rarity: 'R', category: 'weapon',  desc: '闪光的魔法棒' },
  { id: 'g-r-weapon-shield',   name: '迷你盾',         icon: '🛡️', rarity: 'R', category: 'weapon',  desc: '勇者的迷你盾牌' },
  { id: 'g-r-weapon-bow',      name: '小弓箭',         icon: '🏹', rarity: 'R', category: 'weapon',  desc: '精准的小弓箭' },
  { id: 'g-r-weapon-staff',    name: '法杖',           icon: '🔮', rarity: 'R', category: 'weapon',  desc: '充满魔力的法杖' },

  // Boots (5)
  { id: 'g-r-boot-leather',    name: '皮靴',           icon: '👢', rarity: 'R', category: 'boot',    desc: '结实的皮革长靴' },
  { id: 'g-r-boot-rain',       name: '雨靴',           icon: '👢', rarity: 'R', category: 'boot',    desc: '防水的橡胶雨靴' },
  { id: 'g-r-boot-knight',     name: '骑士靴',         icon: '👢', rarity: 'R', category: 'boot',    desc: '帅气的骑士长靴' },
  { id: 'g-r-boot-fluffy',     name: '毛毛靴',         icon: '👢', rarity: 'R', category: 'boot',    desc: '暖和的毛毛雪靴' },
  { id: 'g-r-boot-sneaker',    name: '运动鞋',         icon: '👟', rarity: 'R', category: 'boot',    desc: '活力的运动跑鞋' },

  // Tails (5)
  { id: 'g-r-tail-fox',        name: '狐狸尾巴',       icon: '🦊', rarity: 'R', category: 'tail',    desc: '蓬松的狐狸尾巴' },
  { id: 'g-r-tail-devil',      name: '恶魔尾巴',       icon: '😈', rarity: 'R', category: 'tail',    desc: '尖尖的恶魔尾巴' },
  { id: 'g-r-tail-bunny',      name: '兔尾巴',         icon: '🐰', rarity: 'R', category: 'tail',    desc: '圆圆的兔子尾巴' },
  { id: 'g-r-tail-fish',       name: '美人鱼尾',       icon: '🧜', rarity: 'R', category: 'tail',    desc: '闪闪的美人鱼尾' },
  { id: 'g-r-tail-phoenix',    name: '凤尾羽',         icon: '🪶', rarity: 'R', category: 'tail',    desc: '华丽的凤凰尾羽' },

  // ═══════════════════════════════════════════════════════════
  // SR (20) — Costume Sets
  // ═══════════════════════════════════════════════════════════
  { id: 'g-sr-skin-starcat',       name: '星空猫',         icon: '🌟', rarity: 'SR', category: 'skin', desc: '繁星点点的星空猫咪' },
  { id: 'g-sr-skin-sakuracat',     name: '樱花猫',         icon: '🌸', rarity: 'SR', category: 'skin', desc: '花瓣飘落的樱花猫咪' },
  { id: 'g-sr-skin-piratecat',     name: '海盗猫',         icon: '🏴‍☠️', rarity: 'SR', category: 'skin', desc: '勇闯大海的海盗猫咪' },
  { id: 'g-sr-skin-magicgirl',     name: '魔法少女猫',     icon: '🪄', rarity: 'SR', category: 'skin', desc: '变身魔法少女的猫咪' },
  { id: 'g-sr-skin-ninjacat',      name: '忍者猫',         icon: '🥷', rarity: 'SR', category: 'skin', desc: '隐身术忍者猫咪' },
  { id: 'g-sr-skin-chefcat',       name: '厨师猫',         icon: '👨‍🍳', rarity: 'SR', category: 'skin', desc: '米其林星级厨师猫' },
  { id: 'g-sr-skin-detectivecat',  name: '侦探猫',         icon: '🕵️', rarity: 'SR', category: 'skin', desc: '推理天才侦探猫' },
  { id: 'g-sr-skin-elfcat',        name: '精灵猫',         icon: '🧝', rarity: 'SR', category: 'skin', desc: '森林精灵猫咪' },
  { id: 'g-sr-skin-vampirecat',    name: '吸血鬼猫',       icon: '🧛', rarity: 'SR', category: 'skin', desc: '暗夜贵族吸血鬼猫' },
  { id: 'g-sr-skin-mechacat',      name: '机甲猫',         icon: '🤖', rarity: 'SR', category: 'skin', desc: '钢铁机甲变形猫' },
  { id: 'g-sr-skin-astronaut',     name: '宇航员猫',       icon: '🧑‍🚀', rarity: 'SR', category: 'skin', desc: '探索太空的宇航员猫' },
  { id: 'g-sr-skin-samurai',       name: '武士猫',         icon: '⚔️', rarity: 'SR', category: 'skin', desc: '武士道精神的武士猫' },
  { id: 'g-sr-skin-idol',          name: '偶像猫',         icon: '🎤', rarity: 'SR', category: 'skin', desc: '闪亮舞台偶像猫' },
  { id: 'g-sr-skin-scientist',     name: '科学家猫',       icon: '🔬', rarity: 'SR', category: 'skin', desc: '天才科学家猫咪' },
  { id: 'g-sr-skin-knight',        name: '骑士猫',         icon: '🛡️', rarity: 'SR', category: 'skin', desc: '勇敢的圣骑士猫' },
  { id: 'g-sr-skin-mermaid',       name: '人鱼猫',         icon: '🧜', rarity: 'SR', category: 'skin', desc: '深海人鱼公主猫' },
  { id: 'g-sr-skin-steampunk',     name: '蒸汽朋克猫',     icon: '⚙️', rarity: 'SR', category: 'skin', desc: '齿轮与蒸汽的猫咪' },
  { id: 'g-sr-skin-painter',       name: '画家猫',         icon: '🎨', rarity: 'SR', category: 'skin', desc: '艺术天赋画家猫' },
  { id: 'g-sr-skin-rockstar',      name: '摇滚猫',         icon: '🎸', rarity: 'SR', category: 'skin', desc: '狂野摇滚巨星猫' },
  { id: 'g-sr-skin-pharaoh',       name: '法老猫',         icon: '🏺', rarity: 'SR', category: 'skin', desc: '古埃及法老猫王' },

  // ═══════════════════════════════════════════════════════════
  // SSR (10) — Legendary Skins
  // ═══════════════════════════════════════════════════════════
  { id: 'g-ssr-skin-dragonknight',  name: '龙骑士猫',       icon: '🐉', rarity: 'SSR', category: 'skin', desc: '驾驭巨龙的传奇骑士' },
  { id: 'g-ssr-skin-cosmiccat',     name: '宇宙猫',         icon: '🌌', rarity: 'SSR', category: 'skin', desc: '漫步星河的宇宙猫神' },
  { id: 'g-ssr-skin-phoenixcat',    name: '凤凰猫',         icon: '🔥', rarity: 'SSR', category: 'skin', desc: '浴火重生的不死鸟猫' },
  { id: 'g-ssr-skin-icequeen',      name: '冰霜女王',       icon: '❄️', rarity: 'SSR', category: 'skin', desc: '冰封万里的霜之女王' },
  { id: 'g-ssr-skin-shadowcat',     name: '暗影刺客',       icon: '🗡️', rarity: 'SSR', category: 'skin', desc: '暗夜中的无声刺客' },
  { id: 'g-ssr-skin-angelcat',      name: '天使猫',         icon: '😇', rarity: 'SSR', category: 'skin', desc: '圣洁光辉的守护天使' },
  { id: 'g-ssr-skin-demoncat',      name: '恶魔猫',         icon: '😈', rarity: 'SSR', category: 'skin', desc: '深渊之主恶魔猫王' },
  { id: 'g-ssr-skin-thundercat',    name: '雷神猫',         icon: '⚡', rarity: 'SSR', category: 'skin', desc: '雷霆万钧的雷神猫' },
  { id: 'g-ssr-skin-seacat',        name: '海神猫',         icon: '🌊', rarity: 'SSR', category: 'skin', desc: '操控海洋的深海之王' },
  { id: 'g-ssr-skin-valkyrie',      name: '樱花女武神',     icon: '🌸', rarity: 'SSR', category: 'skin', desc: '樱吹雪中的女武神' },

  // ═══════════════════════════════════════════════════════════
  // SSSR (5) — Mythical
  // ═══════════════════════════════════════════════════════════
  { id: 'g-sssr-mythic-creator',    name: '创世猫神',       icon: '🌍', rarity: 'SSSR', category: 'mythic', desc: '创造万物的猫之神明' },
  { id: 'g-sssr-mythic-spacetime',  name: '时空裂隙猫',     icon: '🕳️', rarity: 'SSSR', category: 'mythic', desc: '穿梭时空的裂隙猫' },
  { id: 'g-sssr-mythic-nyancat',    name: '彩虹猫',         icon: '🌈', rarity: 'SSSR', category: 'mythic', desc: '传说中的Nyan Cat' },
  { id: 'g-sssr-mythic-chaos',      name: '混沌猫',         icon: '🔮', rarity: 'SSSR', category: 'mythic', desc: '混沌之力的化身' },
  { id: 'g-sssr-mythic-eternal',    name: '永恒猫',         icon: '♾️', rarity: 'SSSR', category: 'mythic', desc: '超越时间的永恒存在' },
];

/** Get a gacha item by id */
export function getGachaItemById(id) {
  return GACHA_ITEMS.find(item => item.id === id);
}

/** Get all gacha items of a specific rarity */
export function getGachaItemsByRarity(rarity) {
  return GACHA_ITEMS.filter(item => item.rarity === rarity);
}

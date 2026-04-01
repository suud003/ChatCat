const fs = require('fs');

const basePromptStart = 'A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) ';
const basePromptEnd = '. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.';

const animations = [
  // P0 Remaining
  { id: 'chat-ai-done', desc: 'stopping typing, showing a proud and smug expression, swaying body side to side enthusiastically' },
  { id: 'mood-rushing', desc: 'showing an alert expression, ears standing straight up, body leaning forward slightly' },
  { id: 'greeting-morning', desc: 'looking very happy, swaying joyfully, waving one paw to say good morning' },
  { id: 'daily-greeting', desc: 'jumping up happily and waving both paws to welcome the user' },
  { id: 'skill-start-working', desc: 'typing very intensely and focused, with a small tool icon floating above its head' },
  { id: 'skill-done-proud', desc: 'stopping typing, looking extremely proud, raising one paw to make an OK gesture' },
  { id: 'pomo-focus-done', desc: 'taking off headphones, raising both paws cheering happily, with little star particles popping above its head' },
  { id: 'todo-check', desc: 'drawing a checkmark in the air with its paw, showing a brief happy smile' },
  { id: 'affection-level-up', desc: 'glowing briefly, jumping up once happily, with star particles bursting above its head' },
  
  // P1
  { id: 'phase-afternoon-slump', desc: 'looking sleepy, moving slowly with half-closed eyes, yawning slightly' },
  { id: 'phase-wrap-up', desc: 'looking proud and accomplished, giving a thumbs up with one paw' },
  { id: 'phase-overtime-care', desc: 'looking extremely tired, moving very slowly, nodding off and falling asleep while sitting' },
  { id: 'late-night-sleepy', desc: 'in a half-asleep state, head nodding, struggling to keep eyes open' },
  { id: 'idle-chat-invite', desc: 'gently playing with a ball of yarn in front of it, occasionally looking up' },
  { id: 'app-switch-browser', desc: 'tilting its head curiously with one ear up and one ear down' },
  { id: 'app-switch-ide', desc: 'wearing small reading glasses, looking very serious and focused' },
  { id: 'app-switch-welcome', desc: 'looking up attentively with a happy expression and ears standing up' },
  { id: 'skill-convert', desc: 'pressing down on a piece of paper with one paw while writing rapidly with the other, then shaking head proudly' },
  { id: 'skill-report', desc: 'opening a small notebook, writing quickly with a paw, then closing it and nodding' },
  { id: 'pomo-focus-ongoing', desc: 'typing steadily and calmly, surrounded by a faint blue glowing aura of focus' },
  { id: 'pomo-break-start', desc: 'stretching its body, taking a big yawn, and comfortably lying down to rest' },
  { id: 'pomo-break-end', desc: 'springing up from a lying position, shaking its body to wake up, looking energetic' },
  { id: 'todo-all-done', desc: 'standing up and clapping both paws enthusiastically, with confetti bursting above' },
  { id: 'affection-flow-enter', desc: 'showing a focused and satisfied expression, surrounded by a subtle golden glowing aura' },
  { id: 'affection-flow-exit', desc: 'calming down as the golden glowing aura slowly dissipates, returning to a normal happy expression' },
  { id: 'affection-mood-happy', desc: 'smiling with crescent moon eyes, swaying side to side happily at a fast pace' },
  { id: 'surprise-gift', desc: 'pulling out a small gift box from behind its back and pushing it forward with both paws' },
  { id: 'surprise-nuzzle', desc: 'leaning forward and rubbing its cheeks side to side affectionately, with pink blushes on its face' },
  
  // P2
  { id: 'skill-todo-extract', desc: 'reaching up to grab and pull out a list item from the air, placing it to the side' },
  { id: 'skill-weekly', desc: 'rolling out a long scroll, writing with both paws, then rolling it back up and lifting it high' },
  { id: 'pomo-reset', desc: 'taking off headphones and putting them aside, shrugging its shoulders, returning to normal' },
  { id: 'affection-mood-bored', desc: 'with drooping ears and half-closed eyes, moving sluggishly and occasionally sighing' },
  { id: 'surprise-trick', desc: 'doing a 360-degree backflip in place, landing perfectly and wagging its tail proudly' },
  { id: 'surprise-secret', desc: 'leaning in close, putting one paw to its mouth in a shushing gesture, looking shy' },
  { id: 'surprise-lucky', desc: 'looking up as a four-leaf clover floats and sparkles above its head' },
  { id: 'gacha-coin-insert', desc: 'holding a gold coin with both paws and inserting it into an invisible slot' },
  { id: 'gacha-spinning', desc: 'staring nervously, holding both paws in fists near its chest, shivering slightly in anticipation' },
  { id: 'gacha-result-normal', desc: 'catching a gacha capsule, opening it, and nodding with a neutral expression' },
  { id: 'gacha-result-sr', desc: 'catching a gacha capsule, opening it, and looking surprised as little stars fly out' },
  { id: 'gacha-result-ssr', desc: 'jumping excitedly in a brief golden glow as massive star and confetti particles explode' },
  { id: 'gacha-result-sssr', desc: 'spinning around wildly in excitement, glowing in rainbow colors with fireworks lasting for seconds' },
  { id: 'gacha-multi-peek', desc: 'covering its eyes nervously, peeking through its fingers, then suddenly opening its eyes wide' },
  { id: 'accessory-equip', desc: 'turning its head side to side to check itself in a mirror as a new accessory sparkles on it' },
  { id: 'recorder-live', desc: 'tilting its head occasionally to glance sideways as if looking at a preview screen' },
  { id: 'skin-change', desc: 'being covered in a puff of smoke and sparkles, emerging looking refreshed' },
  { id: 'relationship-deepen', desc: 'slowly stepping closer to the screen with a very gentle and affectionate expression' },
  
  // P3
  { id: 'affection-rebirth', desc: 'wrapped in golden light, shrinking into an orb, then bursting out energetically with star dust scattering' },
  { id: 'accessory-unequip', desc: 'shaking its body vigorously to take off an accessory' },
  { id: 'mp-rank-up', desc: 'doing a happy little hop to celebrate a rank up' },
  { id: 'mp-rank-down', desc: 'shrugging its shoulders and sighing in disappointment' },
  { id: 'consent-granted', desc: 'nodding politely to show gratitude and agreement' },
  { id: 'consent-denied', desc: 'bowing its head slightly to show understanding' }
];

let mdContent = '';

animations.forEach((anim, index) => {
  mdContent += `### ${index + 5}. ${anim.id}\n`;
  mdContent += `> \`${basePromptStart}${anim.desc}${basePromptEnd}\`\n\n`;
});

fs.appendFileSync('docs/ChatCat-Animation-Spec.md', mdContent);
console.log('Successfully appended all prompts to docs/ChatCat-Animation-Spec.md');

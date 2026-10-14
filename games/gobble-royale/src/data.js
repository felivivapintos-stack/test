// Content tables shared by the simulation and the UI.
export const PERKS = [
  { id: 'speed', name: 'Turbo Legs', desc: '+10% speed', icon: '💨', max: 5 },
  { id: 'magnet', name: 'Snack Magnet', desc: 'Pull crumbs from further away', icon: '🧲', max: 5 },
  { id: 'jaws', name: 'Mega Jaws', desc: 'Eat rivals closer to your size', icon: '🦷', max: 3 },
  { id: 'dash', name: 'Quick Dash', desc: 'Dash recharges 22% faster', icon: '⚡', max: 4 },
  { id: 'glutton', name: 'Glutton', desc: '+15% mass from snacks', icon: '🍩', max: 5 },
  { id: 'skin', name: 'Thick Skin', desc: 'Lose less to spikes, dashes and melting', icon: '🛡️', max: 3 },
  { id: 'combo', name: 'Combo King', desc: 'Combos last longer', icon: '🔥', max: 4 },
  { id: 'hunter', name: 'Hunter', desc: '+20% mass from eating rivals', icon: '🎯', max: 4 },
  { id: 'goldnose', name: 'Gold Nose', desc: 'Golden snacks give +50% mass', icon: '✨', max: 3 },
  { id: 'chonk', name: 'Instant Chonk', desc: 'Grow 15% right now', icon: '🍔', max: 6 },
];

export const BOT_NAMES = [
  'NomNom', 'Chompy', 'Big Tony', 'xX_Gulp_Xx', 'Blobert', 'Mochi', 'Sir Snacks', 'Munchkin', 'Gloop',
  'Pudding', 'Jellybean', 'Marshmallow', 'Burp King', 'Wobbles', 'Taco', 'Dumpling', 'Noodle',
  'Grumble', 'Squishy', 'Bubbles', 'Tofu', 'Biscuit', 'Pickles', 'Waffle', 'Captain Crumb', 'Meatball',
  'Lil Gobbler', 'Snacky', 'Doughnut', 'Gummy', 'Nugget', 'Pancake',
];

// face: eyes style. price in coins; 0 = free.
export const SKINS = [
  { id: 'lime', name: 'Limey', color: '#7dff6b', face: 'happy', price: 0 },
  { id: 'berry', name: 'Berry', color: '#ff5fa2', face: 'happy', price: 60 },
  { id: 'ocean', name: 'Ocean', color: '#4fc3ff', face: 'sleepy', price: 120 },
  { id: 'mango', name: 'Mango', color: '#ffb02e', face: 'angry', price: 200 },
  { id: 'grape', name: 'Grape', color: '#a77bff', face: 'cyclops', price: 300 },
  { id: 'cherry', name: 'Cherry', color: '#ff4848', face: 'angry', price: 450 },
  { id: 'mint', name: 'Minty', color: '#5cf2c8', face: 'star', price: 650 },
  { id: 'cool', name: 'Cool Cat', color: '#ffd84d', face: 'shades', price: 900 },
  { id: 'void', name: 'Void', color: '#3a2f6b', face: 'cyclops', price: 1300 },
  { id: 'rainbow', name: 'Rainbow', color: 'rainbow', face: 'star', price: 2000 },
];

export const BOT_FACES = ['happy', 'angry', 'sleepy', 'cyclops', 'star', 'happy'];

// Permanent upgrades bought with coins between rounds.
export const UPGRADES = [
  { id: 'start', name: 'Bigger Start', desc: '+3 starting mass', costs: [80, 160, 300, 500, 800] },
  { id: 'dash', name: 'Dash Training', desc: 'Dash recharges 8% faster', costs: [100, 220, 420, 700] },
  { id: 'coins', name: 'Piggy Bank', desc: '+15% coins per round', costs: [120, 260, 480, 800] },
];

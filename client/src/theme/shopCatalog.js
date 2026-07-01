// ─────────────────────────────────────────────────────────────────────────────
// Shop catalog — DISPLAY MIRROR of server/src/config/shopCatalog.js.
//
// CRITICAL: this file exists only to render labels, icons, and prices on
// screen. Every actual purchase call sends ONLY { itemId } to the server.
// The price shown here is informational — if it ever drifted out of sync
// with the server, the worst outcome is a wrong number on screen, not an
// exploitable purchase, because the server independently looks up the
// real price from its own catalog and ignores anything the client sends.
// ─────────────────────────────────────────────────────────────────────────────

export const ITEM_TYPES = {
  TOOL_SKIN:      'tool_skin',
  PLAYER_BANNER:  'player_banner',
  AVATAR_FRAME:   'avatar_frame',
  TERMINAL_THEME: 'terminal_theme',
  XP_BOOST:       'xp_boost',
  CREDIT_PACK:    'credit_pack',
  PREMIUM_PACK:   'premium_pack',
  BATTLE_PASS:    'battle_pass',
};

export const CREDIT_PACKS = [
  { id: 'CREDIT_PACK_SM', name: 'Signal Boost', desc: 'Top up your in-game credits.',            creditsGiven: 500,  premiumCost: 50,  icon: 'zap' },
  { id: 'CREDIT_PACK_MD', name: 'Data Cache',   desc: 'A solid credit refill for active players.', creditsGiven: 1200, premiumCost: 100, icon: 'database' },
  { id: 'CREDIT_PACK_LG', name: 'Root Stash',   desc: 'Bulk credits for serious operatives.',       creditsGiven: 3000, premiumCost: 220, icon: 'server' },
];

export const PREMIUM_PACKS = [
  { id: 'PREM_100',  name: '100 Tokens',  desc: 'Entry-level token bundle.',                premiumGiven: 100,  priceUsdCents: 99,   icon: 'circle-dollar' },
  { id: 'PREM_550',  name: '550 Tokens',  desc: 'Most popular bundle. Bonus 50 tokens.',     premiumGiven: 550,  priceUsdCents: 499,  icon: 'star', badge: 'POPULAR' },
  { id: 'PREM_1200', name: '1200 Tokens', desc: 'Best value. Bonus 200 tokens.',             premiumGiven: 1200, priceUsdCents: 999,  icon: 'crown', badge: 'BEST VALUE' },
  { id: 'PREM_2500', name: '2500 Tokens', desc: 'Whale tier. Bonus 500 tokens.',             premiumGiven: 2500, priceUsdCents: 1999, icon: 'gem' },
];

export const COSMETIC_ITEMS = [
  { id: 'THEME_MATRIX',     name: 'Matrix Rain',      type: ITEM_TYPES.TERMINAL_THEME, desc: 'Classic green cascade.',              premiumCost: 200, slot: 'terminal_theme', icon: 'terminal' },
  { id: 'THEME_BLOOD',      name: 'Bloodline',        type: ITEM_TYPES.TERMINAL_THEME, desc: 'Deep crimson terminal.',               premiumCost: 200, slot: 'terminal_theme', icon: 'terminal' },
  { id: 'THEME_GHOST',      name: 'Ghost Protocol',   type: ITEM_TYPES.TERMINAL_THEME, desc: 'Monochrome white-on-black.',           premiumCost: 150, slot: 'terminal_theme', icon: 'terminal' },
  { id: 'THEME_NEON',       name: 'Neon Pulse',       type: ITEM_TYPES.TERMINAL_THEME, desc: 'Cyberpunk neon. Cyan and magenta.',    premiumCost: 250, slot: 'terminal_theme', icon: 'terminal' },
  { id: 'FRAME_APT',        name: 'APT Frame',        type: ITEM_TYPES.AVATAR_FRAME,   desc: 'Exclusive frame for APT-tier players.', premiumCost: 0,   slot: 'avatar_frame', icon: 'hexagon', requiredTier: 'APT' },
  { id: 'FRAME_CIRCUIT',    name: 'Circuit Board',    type: ITEM_TYPES.AVATAR_FRAME,   desc: 'Animated circuit traces.',             premiumCost: 180, slot: 'avatar_frame', icon: 'cpu' },
  { id: 'FRAME_GLITCH',     name: 'Glitch Frame',     type: ITEM_TYPES.AVATAR_FRAME,   desc: 'Corrupted data aesthetic.',            premiumCost: 220, slot: 'avatar_frame', icon: 'alert-triangle' },
  { id: 'BANNER_ZERO_DAY',  name: 'Zero Day Banner',  type: ITEM_TYPES.PLAYER_BANNER,  desc: 'Exclusive banner for Zero Day+ rank.',  premiumCost: 0,   slot: 'banner', icon: 'flag', requiredTier: 'ZERO_DAY' },
  { id: 'BANNER_HACKER',    name: 'Black Hat Banner', type: ITEM_TYPES.PLAYER_BANNER,  desc: 'Dark themed banner for attackers.',    premiumCost: 150, slot: 'banner', icon: 'flag' },
  { id: 'BANNER_DEFENDER',  name: 'Blue Team Banner', type: ITEM_TYPES.PLAYER_BANNER,  desc: 'For players who live on defense.',     premiumCost: 150, slot: 'banner', icon: 'flag' },
  { id: 'BOOST_1DAY',       name: '1-Day Rank Boost', type: ITEM_TYPES.XP_BOOST,       desc: '1.5× rank points for 24 hours.',       premiumCost: 100, icon: 'trending-up', consumable: true },
  { id: 'BOOST_7DAY',       name: '7-Day Rank Boost', type: ITEM_TYPES.XP_BOOST,       desc: '1.5× rank points for 7 days.',         premiumCost: 500, icon: 'trending-up', consumable: true },
];

export const BATTLE_PASS = {
  id: 'BATTLE_PASS_S1', name: 'Season 1 Battle Pass', desc: 'Unlock 50 tiers of exclusive rewards.', premiumCost: 1000, icon: 'layers',
};

export const ALL_COSMETICS = COSMETIC_ITEMS;

export const formatUsd = (cents) => `$${(cents / 100).toFixed(2)}`;

export const getItemById = (itemId) =>
  [...CREDIT_PACKS, ...PREMIUM_PACKS, ...COSMETIC_ITEMS, BATTLE_PASS].find((i) => i.id === itemId) ?? null;

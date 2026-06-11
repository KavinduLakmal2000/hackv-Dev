// ─────────────────────────────────────────────────────────────────────────────
// BREACH — Shop Catalog
// Single source of truth for every purchasable item.
// NEVER trust client-sent prices. All prices resolved here server-side.
// ─────────────────────────────────────────────────────────────────────────────

export const ITEM_TYPES = {
  TOOL_SKIN:        'tool_skin',       // visual re-skin of a game tool
  PLAYER_BANNER:    'player_banner',   // profile banner
  AVATAR_FRAME:     'avatar_frame',    // frame around avatar
  TERMINAL_THEME:   'terminal_theme',  // UI theme for game terminal
  XP_BOOST:         'xp_boost',        // temporary rank point multiplier
  CREDIT_PACK:      'credit_pack',     // in-game credits (soft currency)
  PREMIUM_PACK:     'premium_pack',    // premium currency (real money via Stripe)
  BATTLE_PASS:      'battle_pass',     // seasonal pass
};

export const CURRENCY_TYPES = {
  CREDITS:  'credits',           // earned in-game, free
  PREMIUM:  'premium_currency',  // bought with real money
};

// ── Credit packs (bought with premium currency) ───────────────────────────────

export const CREDIT_PACKS = {
  CREDIT_PACK_SM: {
    id:           'CREDIT_PACK_SM',
    type:         ITEM_TYPES.CREDIT_PACK,
    name:         'Signal Boost',
    description:  'Top up your in-game credits.',
    icon:         'zap',
    creditsGiven: 500,
    premiumCost:  50,         // costs 50 premium currency
    stripePriceId: null,      // not a direct Stripe product
  },
  CREDIT_PACK_MD: {
    id:           'CREDIT_PACK_MD',
    type:         ITEM_TYPES.CREDIT_PACK,
    name:         'Data Cache',
    description:  'A solid credit refill for active players.',
    icon:         'database',
    creditsGiven: 1200,
    premiumCost:  100,
    stripePriceId: null,
  },
  CREDIT_PACK_LG: {
    id:           'CREDIT_PACK_LG',
    type:         ITEM_TYPES.CREDIT_PACK,
    name:         'Root Stash',
    description:  'Bulk credits for serious operatives.',
    icon:         'server',
    creditsGiven: 3000,
    premiumCost:  220,
    stripePriceId: null,
  },
};

// ── Premium currency packs (real money via Stripe) ────────────────────────────

export const PREMIUM_PACKS = {
  PREM_100: {
    id:              'PREM_100',
    type:            ITEM_TYPES.PREMIUM_PACK,
    name:            '100 Tokens',
    description:     'Entry-level token bundle.',
    icon:            'circle-dollar-sign',
    premiumGiven:    100,
    priceUsdCents:   99,       // $0.99
    stripePriceId:   process.env.STRIPE_PRICE_PREM_100 ?? 'price_placeholder_100',
  },
  PREM_550: {
    id:              'PREM_550',
    type:            ITEM_TYPES.PREMIUM_PACK,
    name:            '550 Tokens',
    description:     'Most popular bundle. Bonus 50 tokens.',
    icon:            'star',
    premiumGiven:    550,
    priceUsdCents:   499,      // $4.99
    stripePriceId:   process.env.STRIPE_PRICE_PREM_550 ?? 'price_placeholder_550',
    badge:           'POPULAR',
  },
  PREM_1200: {
    id:              'PREM_1200',
    type:            ITEM_TYPES.PREMIUM_PACK,
    name:            '1200 Tokens',
    description:     'Best value. Bonus 200 tokens.',
    icon:            'crown',
    premiumGiven:    1200,
    priceUsdCents:   999,      // $9.99
    stripePriceId:   process.env.STRIPE_PRICE_PREM_1200 ?? 'price_placeholder_1200',
    badge:           'BEST VALUE',
  },
  PREM_2500: {
    id:              'PREM_2500',
    type:            ITEM_TYPES.PREMIUM_PACK,
    name:            '2500 Tokens',
    description:     'Whale tier. Bonus 500 tokens.',
    icon:            'gem',
    premiumGiven:    2500,
    priceUsdCents:   1999,     // $19.99
    stripePriceId:   process.env.STRIPE_PRICE_PREM_2500 ?? 'price_placeholder_2500',
  },
};

// ── Cosmetic items (bought with premium currency) ─────────────────────────────

export const COSMETIC_ITEMS = {
  // ── Terminal Themes ────────────────────────────────────────────────────────
  THEME_MATRIX: {
    id:          'THEME_MATRIX',
    type:        ITEM_TYPES.TERMINAL_THEME,
    name:        'Matrix Rain',
    description: 'Classic green cascade. You know what this is.',
    icon:        'terminal',
    premiumCost: 200,
    preview:     'theme_matrix.png',
    slot:        'terminal_theme',
  },
  THEME_BLOOD: {
    id:          'THEME_BLOOD',
    type:        ITEM_TYPES.TERMINAL_THEME,
    name:        'Bloodline',
    description: 'Deep crimson terminal. For those who play hacker.',
    icon:        'terminal',
    premiumCost: 200,
    preview:     'theme_blood.png',
    slot:        'terminal_theme',
  },
  THEME_GHOST: {
    id:          'THEME_GHOST',
    type:        ITEM_TYPES.TERMINAL_THEME,
    name:        'Ghost Protocol',
    description: 'Monochrome white-on-black. Minimal, surgical.',
    icon:        'terminal',
    premiumCost: 150,
    preview:     'theme_ghost.png',
    slot:        'terminal_theme',
  },
  THEME_NEON: {
    id:          'THEME_NEON',
    type:        ITEM_TYPES.TERMINAL_THEME,
    name:        'Neon Pulse',
    description: 'Cyberpunk neon. Cyan and magenta.',
    icon:        'terminal',
    premiumCost: 250,
    preview:     'theme_neon.png',
    slot:        'terminal_theme',
  },

  // ── Avatar Frames ──────────────────────────────────────────────────────────
  FRAME_APT: {
    id:          'FRAME_APT',
    type:        ITEM_TYPES.AVATAR_FRAME,
    name:        'APT Frame',
    description: 'Exclusive animated frame for APT-tier players.',
    icon:        'hexagon',
    premiumCost: 0,           // free for APT rank — checked server-side
    requiredTier: 'APT',
    slot:        'avatar_frame',
  },
  FRAME_CIRCUIT: {
    id:          'FRAME_CIRCUIT',
    type:        ITEM_TYPES.AVATAR_FRAME,
    name:        'Circuit Board',
    description: 'Animated circuit traces.',
    icon:        'cpu',
    premiumCost: 180,
    slot:        'avatar_frame',
  },
  FRAME_GLITCH: {
    id:          'FRAME_GLITCH',
    type:        ITEM_TYPES.AVATAR_FRAME,
    name:        'Glitch Frame',
    description: 'Corrupted data aesthetic.',
    icon:        'alert-triangle',
    premiumCost: 220,
    slot:        'avatar_frame',
  },

  // ── Player Banners ─────────────────────────────────────────────────────────
  BANNER_ZERO_DAY: {
    id:          'BANNER_ZERO_DAY',
    type:        ITEM_TYPES.PLAYER_BANNER,
    name:        'Zero Day Banner',
    description: 'Exclusive banner for Zero Day+ rank players.',
    icon:        'flag',
    premiumCost: 0,
    requiredTier: 'ZERO_DAY',
    slot:        'banner',
  },
  BANNER_HACKER: {
    id:          'BANNER_HACKER',
    type:        ITEM_TYPES.PLAYER_BANNER,
    name:        'Black Hat Banner',
    description: 'Dark themed banner for the offensive-minded.',
    icon:        'flag',
    premiumCost: 150,
    slot:        'banner',
  },
  BANNER_DEFENDER: {
    id:          'BANNER_DEFENDER',
    type:        ITEM_TYPES.PLAYER_BANNER,
    name:        'Blue Team Banner',
    description: 'For players who live on the defensive side.',
    icon:        'flag',
    premiumCost: 150,
    slot:        'banner',
  },

  // ── XP Boosts ──────────────────────────────────────────────────────────────
  BOOST_1DAY: {
    id:          'BOOST_1DAY',
    type:        ITEM_TYPES.XP_BOOST,
    name:        '1-Day Rank Boost',
    description: '1.5× rank points for 24 hours.',
    icon:        'trending-up',
    premiumCost: 100,
    multiplier:  1.5,
    durationHours: 24,
    consumable:  true,         // disappears after use
  },
  BOOST_7DAY: {
    id:          'BOOST_7DAY',
    type:        ITEM_TYPES.XP_BOOST,
    name:        '7-Day Rank Boost',
    description: '1.5× rank points for 7 days.',
    icon:        'trending-up',
    premiumCost: 500,
    multiplier:  1.5,
    durationHours: 168,
    consumable:  true,
  },

  // ── Battle Pass ────────────────────────────────────────────────────────────
  BATTLE_PASS_S1: {
    id:          'BATTLE_PASS_S1',
    type:        ITEM_TYPES.BATTLE_PASS,
    name:        'Season 1 Battle Pass',
    description: 'Unlock 50 tiers of exclusive rewards.',
    icon:        'layers',
    premiumCost: 1000,
    stripePriceId: process.env.STRIPE_PRICE_BATTLEPASS_S1 ?? 'price_placeholder_bp',
    season:      1,
  },
};

// ── Combined catalog ───────────────────────────────────────────────────────────

export const ALL_SHOP_ITEMS = {
  ...CREDIT_PACKS,
  ...PREMIUM_PACKS,
  ...COSMETIC_ITEMS,
};

// ── Server-side lookup helpers ────────────────────────────────────────────────

export const getShopItem = (itemId) => ALL_SHOP_ITEMS[itemId] ?? null;

export const getItemsByType = (type) =>
  Object.values(ALL_SHOP_ITEMS).filter(i => i.type === type);

/**
 * Validate a purchase server-side.
 * Returns { valid, reason, item }
 * NEVER trust client-sent price or currency type.
 */
export const validatePurchase = (itemId, user) => {
  const item = getShopItem(itemId);
  if (!item) return { valid: false, reason: 'Item not found' };

  // Already owned check (non-consumables)
  if (!item.consumable) {
    const alreadyOwned = user.ownedItems?.some(o => o.itemId === itemId);
    if (alreadyOwned) return { valid: false, reason: 'You already own this item' };
  }

  // Rank requirement check
  if (item.requiredTier) {
    const TIER_ORDER = ['SCRIPT_KIDDIE', 'GREY_HAT', 'BLACK_HAT', 'ZERO_DAY', 'APT'];
    const userTierIdx = TIER_ORDER.indexOf(user.rank?.tier ?? 'SCRIPT_KIDDIE');
    const reqTierIdx  = TIER_ORDER.indexOf(item.requiredTier);
    if (userTierIdx < reqTierIdx) {
      return { valid: false, reason: `Requires ${item.requiredTier} rank or above` };
    }
  }

  // Currency check
  if (item.premiumCost > 0) {
    if ((user.premiumCurrency ?? 0) < item.premiumCost) {
      return {
        valid: false,
        reason: `Not enough tokens. Need ${item.premiumCost}, have ${user.premiumCurrency ?? 0}`,
      };
    }
  }

  // Credit pack uses premium currency
  if (item.type === ITEM_TYPES.CREDIT_PACK) {
    if ((user.premiumCurrency ?? 0) < item.premiumCost) {
      return { valid: false, reason: `Not enough tokens. Need ${item.premiumCost}` };
    }
  }

  return { valid: true, item };
};

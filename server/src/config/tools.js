// ─────────────────────────────────────────────────────────────────────────────
// BREACH — Tools Catalog
// Single source of truth for every tool in the game.
// Both server (game engine) and client (shop UI) derive from this.
// NEVER trust the client to send tool stats — always look them up here.
// ─────────────────────────────────────────────────────────────────────────────

export const TOOL_TYPES = {
  DEFENSE: 'defense',
  ATTACK:  'attack',
};

export const TOOL_TARGETS = {
  DATABASE:   'database',   // protects/attacks the DB layer
  NETWORK:    'network',    // protects/attacks the network layer
  APPLICATION:'application',// protects/attacks the app layer
  SYSTEM:     'system',     // system-level tools
};

// ── Developer (Defense) Tools ─────────────────────────────────────────────────

export const DEVELOPER_TOOLS = {
  // ── Tier 1 (cheap, basic) ─────────────────────────────────────────────────
  FIREWALL: {
    id:          'FIREWALL',
    type:        TOOL_TYPES.DEFENSE,
    name:        'Firewall',
    description: 'Blocks basic network attacks. Reduces incoming damage by 20%.',
    icon:        'shield',
    cost:        80,
    target:      TOOL_TARGETS.NETWORK,
    tier:        1,
    stats: {
      defenseBoost:     20,   // % damage reduction
      duration:         null, // permanent until destroyed
      blockChance:      0,    // % chance to fully block an attack
    },
    counters:    ['PORT_SCAN', 'PING_FLOOD'],
    counteredBy: ['FIREWALL_BYPASS', 'ZERO_DAY_EXPLOIT'],
  },

  ENCRYPTION: {
    id:          'ENCRYPTION',
    type:        TOOL_TYPES.DEFENSE,
    name:        'Encryption',
    description: 'Encrypts database. Attacker needs 2 successful hits to read data.',
    icon:        'lock',
    cost:        100,
    target:      TOOL_TARGETS.DATABASE,
    tier:        1,
    stats: {
      defenseBoost:  0,
      hitsToBreak:   2,
      blockChance:   0,
    },
    counters:    ['SQL_INJECT', 'DATA_EXFIL'],
    counteredBy: ['DECRYPT_KEY', 'BRUTE_FORCE'],
  },

  HONEYPOT: {
    id:          'HONEYPOT',
    type:        TOOL_TYPES.DEFENSE,
    name:        'Honeypot',
    description: 'Decoy database. Traps attacker for 15 seconds and reveals their position.',
    icon:        'bug',
    cost:        120,
    target:      TOOL_TARGETS.DATABASE,
    tier:        1,
    stats: {
      trapDuration: 15,    // seconds attacker is locked
      revealDuration: 10,  // seconds their tool locations are revealed
    },
    counters:    ['SQL_INJECT'],
    counteredBy: ['SANDBOX_ESCAPE'],
  },

  // ── Tier 2 (mid-range) ─────────────────────────────────────────────────────
  IDS: {
    id:          'IDS',
    type:        TOOL_TYPES.DEFENSE,
    name:        'IDS',
    description: 'Intrusion Detection System. Auto-alerts on attack patterns, reveals tool type.',
    icon:        'eye',
    cost:        150,
    target:      TOOL_TARGETS.NETWORK,
    tier:        2,
    stats: {
      detectionChance: 70,  // % chance to identify hacker's tool
      defenseBoost:    10,
    },
    counters:    ['PORT_SCAN', 'RECON'],
    counteredBy: ['STEALTH_MODE', 'TRAFFIC_MASKING'],
  },

  VPN_SHIELD: {
    id:          'VPN_SHIELD',
    type:        TOOL_TYPES.DEFENSE,
    name:        'VPN Shield',
    description: 'Masks server location. Network-based attacks have 40% miss chance.',
    icon:        'globe',
    cost:        180,
    target:      TOOL_TARGETS.NETWORK,
    tier:        2,
    stats: {
      missChance:   40,
      defenseBoost: 15,
    },
    counters:    ['PING_FLOOD', 'DDOS'],
    counteredBy: ['IP_SPOOF', 'VPN_CRACK'],
  },

  TWO_FA: {
    id:          'TWO_FA',
    type:        TOOL_TYPES.DEFENSE,
    name:        '2FA Gate',
    description: 'Requires attacker to break an extra auth layer. +30s to any breach attempt.',
    icon:        'key',
    cost:        200,
    target:      TOOL_TARGETS.APPLICATION,
    tier:        2,
    stats: {
      breachDelay: 30,    // extra seconds added to any successful breach
      defenseBoost: 0,
    },
    counters:    ['BRUTE_FORCE', 'CREDENTIAL_STUFFING'],
    counteredBy: ['SESSION_HIJACK', 'MFA_BYPASS'],
  },

  // ── Tier 3 (expensive, powerful) ─────────────────────────────────────────
  WAF: {
    id:          'WAF',
    type:        TOOL_TYPES.DEFENSE,
    name:        'WAF',
    description: 'Web Application Firewall. Blocks injection attacks entirely.',
    icon:        'shield-check',
    cost:        250,
    target:      TOOL_TARGETS.APPLICATION,
    tier:        3,
    stats: {
      blockInjections: true,
      defenseBoost:    30,
      blockChance:     50,
    },
    counters:    ['SQL_INJECT', 'XSS_INJECT', 'COMMAND_INJECT'],
    counteredBy: ['WAF_BYPASS', 'ZERO_DAY_EXPLOIT'],
  },

  ZERO_TRUST: {
    id:          'ZERO_TRUST',
    type:        TOOL_TYPES.DEFENSE,
    name:        'Zero Trust',
    description: 'Every action requires re-auth. Cuts attack speed by 50% system-wide.',
    icon:        'shield-x',
    cost:        300,
    target:      TOOL_TARGETS.SYSTEM,
    tier:        3,
    stats: {
      attackSpeedPenalty: 50,  // % slower all hacker actions
      defenseBoost:       25,
    },
    counters:    ['BRUTE_FORCE', 'CREDENTIAL_STUFFING', 'SESSION_HIJACK'],
    counteredBy: ['ZERO_DAY_EXPLOIT'],
  },

  DECOY_DB: {
    id:          'DECOY_DB',
    type:        TOOL_TYPES.DEFENSE,
    name:        'Decoy DB',
    description: 'Creates a fake database. 60% chance hacker steals fake data instead.',
    icon:        'database',
    cost:        280,
    target:      TOOL_TARGETS.DATABASE,
    tier:        3,
    stats: {
      decoyChance: 60,   // % chance hacker gets fake data
    },
    counters:    ['DATA_EXFIL', 'SQL_INJECT'],
    counteredBy: ['DATA_FINGERPRINT'],
  },
};

// ── Hacker (Attack) Tools ─────────────────────────────────────────────────────

export const HACKER_TOOLS = {
  // ── Tier 1 ────────────────────────────────────────────────────────────────
  PORT_SCAN: {
    id:          'PORT_SCAN',
    type:        TOOL_TYPES.ATTACK,
    name:        'Port Scan',
    description: 'Reveals which defense tools are active on network layer.',
    icon:        'scan',
    cost:        60,
    target:      TOOL_TARGETS.NETWORK,
    tier:        1,
    stats: {
      damage:      0,
      revealChance: 80,   // % chance to reveal a random defense tool
      chargeTime:  3,     // seconds to execute
    },
    counters:    [],
    counteredBy: ['VPN_SHIELD', 'IDS'],
  },

  SQL_INJECT: {
    id:          'SQL_INJECT',
    type:        TOOL_TYPES.ATTACK,
    name:        'SQL Inject',
    description: 'Attacks the database directly. 30 damage if unblocked.',
    icon:        'terminal',
    cost:        80,
    target:      TOOL_TARGETS.DATABASE,
    tier:        1,
    stats: {
      damage:    30,
      chargeTime: 5,
      breachProgress: 15,  // % progress toward full breach
    },
    counters:    ['ENCRYPTION', 'HONEYPOT'],
    counteredBy: ['WAF', 'FIREWALL'],
  },

  PING_FLOOD: {
    id:          'PING_FLOOD',
    type:        TOOL_TYPES.ATTACK,
    name:        'Ping Flood',
    description: 'Overwhelms network defenses. Reduces their block chance by 20% for 10s.',
    icon:        'activity',
    cost:        70,
    target:      TOOL_TARGETS.NETWORK,
    tier:        1,
    stats: {
      damage:          15,
      debuffDuration:  10,
      blockReduction:  20,
      chargeTime:      4,
    },
    counters:    [],
    counteredBy: ['FIREWALL', 'VPN_SHIELD'],
  },

  RECON: {
    id:          'RECON',
    type:        TOOL_TYPES.ATTACK,
    name:        'Recon',
    description: 'Passive scan. Slowly reveals the database structure over 20s.',
    icon:        'search',
    cost:        50,
    target:      TOOL_TARGETS.DATABASE,
    tier:        1,
    stats: {
      damage:        0,
      chargeTime:    20,
      revealChance:  100,
      passive:       true,
    },
    counters:    [],
    counteredBy: ['IDS', 'HONEYPOT'],
  },

  // ── Tier 2 ────────────────────────────────────────────────────────────────
  BRUTE_FORCE: {
    id:          'BRUTE_FORCE',
    type:        TOOL_TYPES.ATTACK,
    name:        'Brute Force',
    description: 'Hammers auth layer. High damage but slow and detectable.',
    icon:        'zap',
    cost:        120,
    target:      TOOL_TARGETS.APPLICATION,
    tier:        2,
    stats: {
      damage:         45,
      chargeTime:     10,
      detectionRisk:  80,  // % chance IDS catches this
      breachProgress: 20,
    },
    counters:    ['ENCRYPTION', '2FA'],
    counteredBy: ['WAF', 'IDS', 'ZERO_TRUST'],
  },

  STEALTH_MODE: {
    id:          'STEALTH_MODE',
    type:        TOOL_TYPES.ATTACK,
    name:        'Stealth Mode',
    description: 'Makes next 2 attacks undetectable by IDS for 30s.',
    icon:        'eye-off',
    cost:        150,
    target:      TOOL_TARGETS.SYSTEM,
    tier:        2,
    stats: {
      damage:         0,
      chargeTime:     2,
      stealthCharges: 2,
      duration:       30,
    },
    counters:    ['IDS'],
    counteredBy: [],
  },

  SESSION_HIJACK: {
    id:          'SESSION_HIJACK',
    type:        TOOL_TYPES.ATTACK,
    name:        'Session Hijack',
    description: 'Steals an active session token. Bypasses auth entirely for 15s.',
    icon:        'user-x',
    cost:        180,
    target:      TOOL_TARGETS.APPLICATION,
    tier:        2,
    stats: {
      damage:         0,
      chargeTime:     8,
      bypassDuration: 15,
      breachProgress: 30,
    },
    counters:    ['2FA', 'ZERO_TRUST'],
    counteredBy: ['IDS'],
  },

  DATA_EXFIL: {
    id:          'DATA_EXFIL',
    type:        TOOL_TYPES.ATTACK,
    name:        'Data Exfil',
    description: 'Once inside, extracts data. Reveals partial secret word on success.',
    icon:        'download',
    cost:        160,
    target:      TOOL_TARGETS.DATABASE,
    tier:        2,
    stats: {
      damage:         20,
      chargeTime:     12,
      revealLetters:  3,   // reveals 3 letters of the secret word
      breachProgress: 40,
    },
    counters:    [],
    counteredBy: ['ENCRYPTION', 'DECOY_DB'],
  },

  // ── Tier 3 ────────────────────────────────────────────────────────────────
  ZERO_DAY_EXPLOIT: {
    id:          'ZERO_DAY_EXPLOIT',
    type:        TOOL_TYPES.ATTACK,
    name:        'Zero Day',
    description: 'Destroys one random defense tool instantly. Cannot be blocked.',
    icon:        'skull',
    cost:        280,
    target:      TOOL_TARGETS.SYSTEM,
    tier:        3,
    stats: {
      damage:         60,
      chargeTime:     6,
      destroysOneTool: true,
      unblockable:    true,
      breachProgress: 25,
    },
    counters:    ['FIREWALL', 'WAF', 'ZERO_TRUST', 'ENCRYPTION'],
    counteredBy: [],
  },

  RANSOMWARE: {
    id:          'RANSOMWARE',
    type:        TOOL_TYPES.ATTACK,
    name:        'Ransomware',
    description: 'Locks the developer\'s tools for 20s. They cannot deploy new defenses.',
    icon:        'lock-open',
    cost:        260,
    target:      TOOL_TARGETS.SYSTEM,
    tier:        3,
    stats: {
      damage:       0,
      chargeTime:   8,
      lockDuration: 20,
    },
    counters:    [],
    counteredBy: ['WAF', 'IDS'],
  },

  ROOT_ACCESS: {
    id:          'ROOT_ACCESS',
    type:        TOOL_TYPES.ATTACK,
    name:        'Root Access',
    description: 'Full system compromise. Instantly wins the round if undetected.',
    icon:        'crown',
    cost:        350,
    target:      TOOL_TARGETS.SYSTEM,
    tier:        3,
    stats: {
      damage:         100,
      chargeTime:     15,
      detectionRisk:  60,
      instaWin:       true,  // wins round if succeeds
      breachProgress: 100,
    },
    counters:    [],
    counteredBy: ['ZERO_TRUST', 'IDS', 'WAF'],
  },
};

// ── Combined catalog ───────────────────────────────────────────────────────────

export const ALL_TOOLS = { ...DEVELOPER_TOOLS, ...HACKER_TOOLS };

/**
 * Server-side tool lookup. Never trust client-sent tool stats.
 * @param {string} toolId
 * @returns {object|null}
 */
export const getTool = (toolId) => ALL_TOOLS[toolId] ?? null;

/**
 * Get all tools available to a role, optionally filtered by tier.
 * @param {'developer'|'hacker'} role
 * @param {number|null} tier
 */
export const getToolsForRole = (role, tier = null) => {
  const catalog = role === 'developer' ? DEVELOPER_TOOLS : HACKER_TOOLS;
  const tools   = Object.values(catalog);
  return tier ? tools.filter(t => t.tier === tier) : tools;
};

/**
 * Validate that a tool belongs to a role and player can afford it.
 */
export const validateToolPurchase = (toolId, role, playerCredits) => {
  const tool = getTool(toolId);
  if (!tool)              return { valid: false, reason: 'Unknown tool' };
  if (tool.type !== (role === 'developer' ? 'defense' : 'attack')) {
    return { valid: false, reason: 'Tool does not belong to your role' };
  }
  if (playerCredits < tool.cost) {
    return { valid: false, reason: `Not enough credits. Need ${tool.cost}, have ${playerCredits}` };
  }
  return { valid: true, tool };
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool catalog — mirrors server/src/config/tools.js display fields ONLY.
// Cost, effects, and resolution are NEVER computed here — this is purely
// for rendering ToolCard labels, icons, and tier colors. The server is the
// only source of truth for what a tool actually does.
// ─────────────────────────────────────────────────────────────────────────────

export const TIER_COLORS = {
  1: 'var(--text-dim)',
  2: 'var(--amber)',
  3: 'var(--red-bright)',
};

export const DEVELOPER_TOOLS = [
  { id: 'FIREWALL',    name: 'Firewall',     cost: 80,  tier: 1, icon: 'shield',       desc: 'Blocks basic network attacks. Reduces incoming damage by 20%.' },
  { id: 'ENCRYPTION',  name: 'Encryption',   cost: 100, tier: 1, icon: 'lock',          desc: 'Encrypts database. Attacker needs 2 successful hits to read data.' },
  { id: 'HONEYPOT',    name: 'Honeypot',     cost: 120, tier: 1, icon: 'bug',           desc: 'Decoy database. Traps attacker for 15s and reveals their position.' },
  { id: 'IDS',         name: 'IDS',          cost: 150, tier: 2, icon: 'eye',           desc: 'Auto-alerts on attack patterns, reveals tool type.' },
  { id: 'VPN_SHIELD',  name: 'VPN Shield',   cost: 180, tier: 2, icon: 'globe',         desc: 'Masks server location. Network attacks have 40% miss chance.' },
  { id: 'TWO_FA',      name: '2FA Gate',     cost: 200, tier: 2, icon: 'key',           desc: 'Requires attacker to break an extra auth layer. +30s to breach.' },
  { id: 'WAF',         name: 'WAF',          cost: 250, tier: 3, icon: 'shield-check',  desc: 'Web Application Firewall. Blocks injection attacks entirely.' },
  { id: 'ZERO_TRUST',  name: 'Zero Trust',   cost: 300, tier: 3, icon: 'shield-x',      desc: 'Every action requires re-auth. Cuts attack speed by 50%.' },
  { id: 'DECOY_DB',    name: 'Decoy DB',     cost: 280, tier: 3, icon: 'database',     desc: 'Creates a fake database. 60% chance hacker steals fake data.' },
];

export const HACKER_TOOLS = [
  { id: 'PORT_SCAN',        name: 'Port Scan',       cost: 60,  tier: 1, icon: 'scan',     desc: 'Reveals which defense tools are active on network layer.' },
  { id: 'SQL_INJECT',       name: 'SQL Inject',      cost: 80,  tier: 1, icon: 'terminal',  desc: 'Attacks the database directly. 30 damage if unblocked.' },
  { id: 'PING_FLOOD',       name: 'Ping Flood',      cost: 70,  tier: 1, icon: 'activity',  desc: 'Overwhelms network defenses. -20% block chance for 10s.' },
  { id: 'RECON',            name: 'Recon',           cost: 50,  tier: 1, icon: 'search',    desc: 'Passive scan. Slowly reveals DB structure over 20s.' },
  { id: 'BRUTE_FORCE',      name: 'Brute Force',     cost: 120, tier: 2, icon: 'zap',        desc: 'Hammers auth layer. High damage but slow and detectable.' },
  { id: 'STEALTH_MODE',     name: 'Stealth Mode',    cost: 150, tier: 2, icon: 'eye-off',    desc: 'Next 2 attacks undetectable by IDS for 30s.' },
  { id: 'SESSION_HIJACK',   name: 'Session Hijack',  cost: 180, tier: 2, icon: 'user-x',     desc: 'Steals an active session. Bypasses auth for 15s.' },
  { id: 'DATA_EXFIL',       name: 'Data Exfil',      cost: 160, tier: 2, icon: 'download',   desc: 'Once inside, extracts data. Reveals secret word letters.' },
  { id: 'ZERO_DAY_EXPLOIT', name: 'Zero Day',        cost: 280, tier: 3, icon: 'skull',       desc: 'Destroys one random defense tool. Cannot be blocked.' },
  { id: 'RANSOMWARE',       name: 'Ransomware',      cost: 260, tier: 3, icon: 'lock-open',   desc: "Locks the developer's tools for 20s." },
  { id: 'ROOT_ACCESS',      name: 'Root Access',     cost: 350, tier: 3, icon: 'crown',       desc: 'Full system compromise. Instant win if undetected.' },
];

export const getToolsForRole = (role) => (role === 'developer' ? DEVELOPER_TOOLS : HACKER_TOOLS);

export const getToolById = (toolId) =>
  [...DEVELOPER_TOOLS, ...HACKER_TOOLS].find((t) => t.id === toolId) ?? null;

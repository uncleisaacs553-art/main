// Command Center — configuration.
// Change `owner` to monitor a different GitHub account/org.

export const CONFIG = {
  owner: "uncleisaacs553-art",
  brand: "B Digital",
  apiBase: "https://api.github.com",

  // How often to refresh (ms). Tokenless visitors share a 60 req/hour budget,
  // so we poll gently; with a token the loop runs faster (see api/main).
  refreshTokenless: 90000,
  refreshToken: 30000,

  // Cap per-repo Actions calls to protect the rate limit.
  maxReposForRuns: 6,

  // Logins matching any of these are treated as automation "agents".
  agentPatterns: [/\[bot\]/i, /-bot$/i, /bot$/i, /agent/i, /claude/i, /automation/i, /actions/i],
};

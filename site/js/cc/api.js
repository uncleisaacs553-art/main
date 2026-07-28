// Command Center — GitHub REST client.
//
// Key ideas:
//  • Tokenless by default (works on GitHub Pages for PUBLIC repos, ~60 req/hr).
//  • Conditional requests via ETag / If-None-Match — a 304 "Not Modified"
//    response does NOT count against the rate limit, so unchanged data is free.
//  • Optional token, stored ONLY in this browser (localStorage) — never shipped
//    in the page source. Raises the limit to 5,000/hr and unlocks private repos.

import { CONFIG } from "./config.js";

const TOKEN_KEY = "bd_cc_token";
const cache = new Map(); // url -> { etag, data }

let rate = { limit: 60, remaining: null, reset: 0, authed: false };

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}
export function setToken(t) {
  try {
    if (t && t.trim()) localStorage.setItem(TOKEN_KEY, t.trim());
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage blocked — ignore */ }
}
export function hasToken() { return !!getToken(); }
export function getRate() { return rate; }

async function ghGet(path) {
  const url = path.startsWith("http") ? path : CONFIG.apiBase + path;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;

  const cached = cache.get(url);
  if (cached && cached.etag) headers["If-None-Match"] = cached.etag;

  let res;
  try {
    res = await fetch(url, { headers, cache: "no-store" });
  } catch (err) {
    const e = new Error("network"); e.code = "NET"; throw e;
  }

  // Track rate-limit budget from response headers (GitHub exposes these via CORS).
  const rem = res.headers.get("X-RateLimit-Remaining");
  const lim = res.headers.get("X-RateLimit-Limit");
  const rst = res.headers.get("X-RateLimit-Reset");
  if (rem !== null) {
    rate = {
      limit: lim ? +lim : rate.limit,
      remaining: +rem,
      reset: rst ? +rst * 1000 : rate.reset,
      authed: !!token,
    };
  }

  if (res.status === 304 && cached) return cached.data; // unchanged — free
  if (res.status === 401) { const e = new Error("bad token"); e.code = "AUTH"; throw e; }
  if (res.status === 403 && rem === "0") { const e = new Error("rate limited"); e.code = "RATE"; throw e; }
  if (res.status === 404) { const e = new Error("not found"); e.code = 404; throw e; }
  if (!res.ok) { const e = new Error("HTTP " + res.status); e.code = res.status; throw e; }

  const data = await res.json();
  const etag = res.headers.get("ETag");
  if (etag) cache.set(url, { etag, data });
  return data;
}

export const api = {
  repos: () => ghGet(`/users/${CONFIG.owner}/repos?sort=pushed&per_page=100`),
  events: () => ghGet(`/users/${CONFIG.owner}/events/public?per_page=100`),
  runs: (repo) => ghGet(`/repos/${CONFIG.owner}/${repo}/actions/runs?per_page=20`),
  rateLimit: () => ghGet(`/rate_limit`),
};

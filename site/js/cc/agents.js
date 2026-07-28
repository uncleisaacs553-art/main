// Command Center — turn raw GitHub data into "agents" + KPIs.
//
// An agent is derived from:
//   1) GitHub Actions workflows (each workflow = an automated worker), and
//   2) bot/automation actors seen in the public events feed.

import { CONFIG } from "./config.js";

const DAY = 86400000;
const HOUR = 3600000;
const ts = (s) => new Date(s).getTime();

export function isAgentActor(login) {
  return !!login && CONFIG.agentPatterns.some((re) => re.test(login));
}

// runs: flattened workflow_runs, each annotated with `_repo`.
// events: raw public events.
export function buildAgents(runs, events) {
  const map = new Map();

  for (const run of runs) {
    const name = run.name || "Workflow";
    const key = run._repo + "/" + name;
    let a = map.get(key);
    if (!a) {
      a = { id: key, name, kind: "workflow", repo: run._repo, runs: [], lastAt: 0, latest: null, running: false };
      map.set(key, a);
    }
    a.runs.push(run);
    const t = ts(run.run_started_at || run.created_at);
    if (t > a.lastAt) { a.lastAt = t; a.latest = run; }
    if (run.status === "in_progress" || run.status === "queued") a.running = true;
  }

  const agents = [...map.values()].map((a) => {
    a.runs.sort((x, y) => ts(y.run_started_at || y.created_at) - ts(x.run_started_at || x.created_at));
    const completed = a.runs.filter((r) => r.status === "completed");
    const ok = completed.filter((r) => r.conclusion === "success").length;
    a.successRate = completed.length ? Math.round((ok / completed.length) * 100) : null;
    // oldest -> newest, for a left-to-right sparkline
    a.history = a.runs.slice(0, 12).map((r) => (r.status !== "completed" ? "run" : r.conclusion || "idle")).reverse();
    a.status = a.running ? "running"
      : !a.latest ? "idle"
      : a.latest.conclusion === "success" ? "ok"
      : a.latest.conclusion === "failure" ? "failed"
      : "idle";
    return a;
  });

  // Secondary: automation actors from the events feed (covers bots that commit
  // directly rather than running as Actions).
  const botMap = new Map();
  for (const e of events) {
    const login = e.actor && e.actor.login;
    if (!isAgentActor(login)) continue;
    let b = botMap.get(login);
    if (!b) { b = { id: "bot/" + login, name: login, kind: "bot", repo: (e.repo && e.repo.name || "").split("/").pop(), lastAt: 0, count: 0, runs: [], history: [], successRate: null }; botMap.set(login, b); }
    b.count++;
    const t = ts(e.created_at);
    if (t > b.lastAt) b.lastAt = t;
  }
  for (const b of botMap.values()) {
    b.status = Date.now() - b.lastAt < HOUR ? "running" : "ok";
    agents.push(b);
  }

  agents.sort((a, b) => (Number(b.running || b.status === "running") - Number(a.running || a.status === "running")) || (b.lastAt - a.lastAt));
  return agents;
}

export function buildKPIs(repos, events, runs) {
  const now = Date.now();
  const activeRepos = repos.filter((r) => now - ts(r.pushed_at) < 7 * DAY).length;
  const running = runs.filter((r) => r.status === "in_progress" || r.status === "queued").length;
  const runs24 = runs.filter((r) => now - ts(r.run_started_at || r.created_at) < DAY).length;
  const completed = runs.filter((r) => r.status === "completed");
  const ok = completed.filter((r) => r.conclusion === "success").length;
  const successRate = completed.length ? Math.round((ok / completed.length) * 100) : null;
  let commits24 = 0;
  for (const e of events) {
    if (e.type === "PushEvent" && now - ts(e.created_at) < DAY) commits24 += (e.payload && e.payload.size) || 0;
  }
  const events24 = events.filter((e) => now - ts(e.created_at) < DAY).length;
  return { activeRepos, running, runs24, successRate, commits24, events24 };
}

// Buckets of activity per hour over the last `hours` hours (oldest -> newest).
export function throughput(events, hours = 18) {
  const now = Date.now();
  const buckets = new Array(hours).fill(0);
  for (const e of events) {
    const age = now - ts(e.created_at);
    if (age < 0 || age > hours * HOUR) continue;
    const idx = hours - 1 - Math.floor(age / HOUR);
    if (idx >= 0 && idx < hours) buckets[idx] += e.type === "PushEvent" ? ((e.payload && e.payload.size) || 1) : 1;
  }
  return buckets;
}

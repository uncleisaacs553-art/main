// Command Center — DOM rendering. Pure functions: given data, paint a panel.

import { isAgentActor } from "./agents.js";

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function rel(t) {
  const ms = typeof t === "number" ? t : new Date(t).getTime();
  if (!ms || Number.isNaN(ms)) return "—";
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60); if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60); if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

function empty(title, sub) {
  return `<div class="empty"><div class="empty__t">${esc(title)}</div><div class="empty__s">${esc(sub)}</div></div>`;
}

function spark(history) {
  return history.map((x) => {
    const k = x === "success" ? "ok" : x === "failure" ? "bad" : x === "run" ? "run" : "idle";
    return `<i class="spark__b spark__b--${k}"></i>`;
  }).join("");
}

/* ---------- KPIs ---------- */
export function renderKPIs(k) {
  setNum("kpiRepos", k.activeRepos);
  setNum("kpiRunning", k.running);
  setNum("kpiRuns", k.runs24);
  setNum("kpiSuccess", k.successRate, k.successRate == null ? "" : "%");
  setNum("kpiCommits", k.commits24);
  setNum("kpiEvents", k.events24);
}
function setNum(id, val, suffix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  if (val == null) { el.textContent = "—"; return; }
  animateNumber(el, val, suffix);
}
function animateNumber(el, to, suffix) {
  const from = parseFloat(el.dataset.v || "0") || 0;
  el.dataset.v = String(to);
  if (reduceMotion() || from === to) { el.textContent = to + suffix; return; }
  const start = performance.now(), dur = 650;
  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * e) + suffix;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- Agents ---------- */
export function renderAgents(agents) {
  const root = document.getElementById("agents");
  if (!root) return;
  if (!agents.length) {
    root.innerHTML = empty("No agents detected yet", "Agents appear here as soon as GitHub Actions run or automation accounts push.");
    return;
  }
  root.innerHTML = agents.slice(0, 8).map((a) => `
    <div class="agent agent--${a.status}">
      <div class="agent__head">
        <span class="dot dot--${a.status}"></span>
        <span class="agent__name">${esc(a.name)}</span>
        <span class="agent__kind">${esc(a.kind)}</span>
      </div>
      <div class="agent__repo">${esc(a.repo || "—")}</div>
      <div class="agent__foot">
        <span>${a.lastAt ? rel(a.lastAt) : "idle"}</span>
        ${a.successRate == null ? "" : `<span class="agent__rate">${a.successRate}% ok</span>`}
      </div>
      ${a.history && a.history.length ? `<div class="spark">${spark(a.history)}</div>` : ""}
    </div>`).join("");
}

/* ---------- Live feed ---------- */
function summarize(e) {
  const repo = (e.repo && e.repo.name || "").split("/").pop();
  const actor = (e.actor && e.actor.login) || "someone";
  const p = e.payload || {};
  let icon = "•", verb = "active in", detail = "";
  switch (e.type) {
    case "PushEvent": {
      const n = p.size || 1;
      icon = "↑"; verb = `pushed ${n} commit${n > 1 ? "s" : ""} to`;
      detail = (p.commits && p.commits[p.commits.length - 1] && p.commits[p.commits.length - 1].message || "").split("\n")[0];
      break;
    }
    case "PullRequestEvent":
      icon = "⑃"; verb = `${p.action || "updated"} a pull request in`;
      detail = p.pull_request && p.pull_request.title || ""; break;
    case "IssuesEvent":
      icon = "!"; verb = `${p.action || "updated"} an issue in`;
      detail = p.issue && p.issue.title || ""; break;
    case "CreateEvent":
      icon = "+"; verb = `created ${p.ref_type || "ref"} in`; detail = p.ref || ""; break;
    case "DeleteEvent":
      icon = "−"; verb = `deleted ${p.ref_type || "ref"} in`; detail = p.ref || ""; break;
    case "WorkflowRunEvent":
      icon = "⚙"; verb = "ran a workflow in";
      detail = [p.workflow_run && p.workflow_run.name, p.workflow_run && p.workflow_run.conclusion].filter(Boolean).join(" · "); break;
    case "ReleaseEvent":
      icon = "◆"; verb = "published a release in"; detail = p.release && p.release.tag_name || ""; break;
    case "ForkEvent": icon = "⑂"; verb = "forked"; break;
    case "WatchEvent": icon = "★"; verb = "starred"; break;
    default: verb = e.type.replace("Event", "").toLowerCase() + " in";
  }
  return { icon, verb, repo, actor, detail, at: e.created_at, isAgent: isAgentActor(actor) };
}

export function renderFeed(events) {
  const root = document.getElementById("feed");
  if (!root) return;
  if (!events.length) {
    root.innerHTML = empty("No recent activity", "Public events across the account will stream in here.");
    return;
  }
  root.innerHTML = events.slice(0, 18).map((e) => {
    const s = summarize(e);
    return `<li class="feed__item${s.isAgent ? " feed__item--agent" : ""}">
      <span class="feed__icon" aria-hidden="true">${s.icon}</span>
      <div class="feed__body">
        <div class="feed__line"><b>${esc(s.actor)}</b> ${esc(s.verb)} <span class="feed__repo">${esc(s.repo)}</span></div>
        ${s.detail ? `<div class="feed__detail">${esc(s.detail)}</div>` : ""}
      </div>
      <time>${rel(s.at)}</time>
    </li>`;
  }).join("");
}

/* ---------- Workflow runs ---------- */
export function renderRuns(runs) {
  const root = document.getElementById("runs");
  if (!root) return;
  const sorted = [...runs].sort((a, b) =>
    new Date(b.run_started_at || b.created_at) - new Date(a.run_started_at || a.created_at));
  if (!sorted.length) {
    root.innerHTML = empty("No workflow runs", "GitHub Actions runs show here with live status.");
    return;
  }
  root.innerHTML = sorted.slice(0, 10).map((r) => {
    const st = r.status !== "completed" ? "running"
      : r.conclusion === "success" ? "ok"
      : r.conclusion === "failure" ? "failed" : "idle";
    const label = r.status !== "completed" ? String(r.status).replace("_", " ") : (r.conclusion || "done");
    return `<div class="run run--${st}">
      <span class="dot dot--${st}"></span>
      <div class="run__main">
        <div class="run__title">${esc(r.name || "Workflow")} <span class="run__dt">${esc(r.display_title || "")}</span></div>
        <div class="run__sub">${esc(r._repo || "")} · ${esc(r.head_branch || "")} · ${esc(r.event || "")}</div>
      </div>
      <span class="run__badge run__badge--${st}">${esc(label)}</span>
      <time>${rel(r.run_started_at || r.created_at)}</time>
    </div>`;
  }).join("");
}

/* ---------- Repositories ---------- */
export function renderRepos(repos) {
  const root = document.getElementById("repos");
  if (!root) return;
  if (!repos.length) {
    root.innerHTML = empty("No repositories", "Public repos for the account will list here.");
    return;
  }
  root.innerHTML = repos.slice(0, 8).map((r) => `
    <a class="repo" href="${esc(r.html_url || "#")}" target="_blank" rel="noopener" data-cursor="link">
      <div class="repo__main">
        <div class="repo__name">${esc(r.name)}</div>
        <div class="repo__desc">${esc(r.description || "—")}</div>
      </div>
      <div class="repo__meta">
        ${r.language ? `<span class="repo__lang">${esc(r.language)}</span>` : ""}
        <span>${rel(r.pushed_at)}</span>
      </div>
    </a>`).join("");
}

/* ---------- Throughput chart ---------- */
export function renderThroughput(buckets) {
  const root = document.getElementById("throughput");
  if (!root) return;
  const max = Math.max(1, ...buckets);
  const W = 100, H = 38, n = buckets.length, gap = 1.4, bw = (W - gap * (n - 1)) / n;
  const bars = buckets.map((v, i) => {
    const h = (v / max) * H;
    const x = i * (bw + gap);
    const y = H - Math.max(0.8, h);
    return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${bw.toFixed(2)}" height="${Math.max(0.8, h).toFixed(2)}" rx="0.5"></rect>`;
  }).join("");
  root.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="chart">${bars}</svg>`;
}

/* ---------- Status bar ---------- */
export function renderStatus({ rate, mode, updatedAt }) {
  const m = document.getElementById("ccMode");
  if (m) {
    m.textContent = mode === "demo" ? "DEMO DATA" : (rate.authed ? "LIVE · TOKEN" : "LIVE · PUBLIC");
    m.className = "cc-badge cc-badge--" + (mode === "demo" ? "demo" : "live");
  }
  const rt = document.getElementById("ccRate");
  if (rt) rt.textContent = rate.remaining == null ? "API —" : `API ${rate.remaining}/${rate.limit}`;
  const u = document.getElementById("ccUpdated");
  if (u && updatedAt) u.textContent = "updated " + rel(updatedAt);
}

export function toast(msg, kind = "info") {
  const el = document.getElementById("ccToast");
  if (!el) return;
  el.textContent = msg;
  el.className = "cc-toast cc-toast--" + kind + (msg ? " is-show" : "");
}

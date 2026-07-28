// Command Center — orchestration: fetch → transform → render, on a rate-aware
// loop, with a settings panel (optional token) and a never-blank demo fallback.

import { CONFIG } from "./config.js";
import { api, getRate, getToken, setToken, hasToken } from "./api.js";
import { buildAgents, buildKPIs, throughput } from "./agents.js";
import * as R from "./render.js";
import { demoData } from "./demo.js";
import initBackdrop from "./backdrop.js";

const qs = (s) => document.querySelector(s);

let timer = null;
let refreshCount = 0;
let runsCache = [];          // runs fetched on a slower cadence; reused between refreshes
let everRendered = false;
let lastUpdated = 0;
let currentMode = "live";
let demoMode = false;

document.addEventListener("DOMContentLoaded", () => {
  initBackdrop();
  setBrand();
  startClock();
  setupCursor();
  setupControls();

  const params = new URLSearchParams(location.search);
  demoMode = params.get("demo") === "1" || localStorage.getItem("bd_cc_demo") === "1";
  const demoToggle = qs("#demoToggle");
  if (demoToggle) demoToggle.checked = demoMode;
  const tokenInput = qs("#tokenInput");
  if (tokenInput) tokenInput.value = getToken();

  load(true);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load(false);
  });
});

/* ---------- Core load cycle ---------- */
async function load(force = false) {
  if (demoMode) {
    renderAll(demoData(), "demo");
    R.toast("Demo mode — synthetic data. Turn off in settings (⚙) to go live.", "info");
    scheduleNext();
    return;
  }

  let repos, events;
  try {
    [repos, events] = await Promise.all([api.repos(), api.events()]);
  } catch (err) {
    handleError(err);
    scheduleNext();
    return;
  }

  // Per-repo Actions runs are the costliest calls — fetch them on a slower
  // cadence (every 4th refresh) unless forced or authenticated with a token.
  const topRepos = repos.filter((r) => !r.fork).slice(0, CONFIG.maxReposForRuns);
  const wantRuns = force || hasToken() || refreshCount % 4 === 0;
  if (wantRuns && topRepos.length) {
    const results = await Promise.all(
      topRepos.map((r) => api.runs(r.name).catch(() => ({ workflow_runs: [] })))
    );
    runsCache = results.flatMap((res, i) =>
      (res.workflow_runs || []).map((run) => ({ ...run, _repo: topRepos[i].name })));
  }
  refreshCount++;

  R.toast("");
  renderAll({ repos, events, runs: runsCache }, "live");
  scheduleNext();
}

function renderAll({ repos, events, runs }, mode) {
  currentMode = mode;
  everRendered = true;
  lastUpdated = Date.now();

  const active = repos
    .filter((r) => !r.fork)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  const agents = buildAgents(runs, events);
  const kpis = buildKPIs(active, events, runs);

  R.renderKPIs(kpis);
  R.renderAgents(agents);
  R.renderFeed(events);
  R.renderRuns(runs);
  R.renderRepos(active);
  R.renderThroughput(throughput(events));
  R.renderStatus({ rate: getRate(), mode, updatedAt: lastUpdated });
  setupCursorTargets();
}

function handleError(err) {
  const rate = getRate();
  if (err.code === "RATE") {
    const mins = rate.reset ? Math.max(1, Math.ceil((rate.reset - Date.now()) / 60000)) : 60;
    R.toast(`GitHub API limit reached (public 60/hr). Resets in ~${mins} min. Add a token (⚙) for 5,000/hr.`, "warn");
  } else if (err.code === "AUTH") {
    R.toast("Token rejected. Open settings (⚙) to fix or clear it (public mode still works).", "bad");
  } else if (err.code === "NET") {
    R.toast("Can't reach GitHub — offline? Showing demo data until it's back.", "warn");
  } else {
    R.toast("Live feed unavailable right now — showing demo data.", "warn");
  }
  // Never leave the dashboard blank: seed with demo data on the first failure,
  // but on later failures keep the last good view so numbers don't jump around.
  if (!everRendered) renderAll(demoData(), "demo");
  else R.renderStatus({ rate, mode: currentMode, updatedAt: lastUpdated });
}

function scheduleNext() {
  clearTimeout(timer);
  const rate = getRate();
  let interval = hasToken() ? CONFIG.refreshToken : CONFIG.refreshTokenless;
  // Back off when the public budget runs low, until it resets.
  if (!hasToken() && rate.remaining != null && rate.remaining < 8) {
    const wait = (rate.reset || Date.now() + 60000) - Date.now() + 2000;
    interval = Math.min(Math.max(interval, wait), 15 * 60000);
  }
  timer = setTimeout(() => load(false), interval);
}

/* ---------- Chrome: clock, brand, controls ---------- */
function setBrand() {
  const w = qs("#ccBrandWord"); if (w) w.textContent = CONFIG.brand;
  const o = qs("#ccOwner"); if (o) o.textContent = "@" + CONFIG.owner;
}

function startClock() {
  const el = qs("#ccClock");
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  tick();
  setInterval(tick, 1000);
}

function setupControls() {
  qs("#ccRefresh")?.addEventListener("click", () => { R.toast("Refreshing…", "info"); load(true); });

  const modal = qs("#settingsModal");
  const open = () => modal?.classList.add("is-open");
  const close = () => modal?.classList.remove("is-open");
  qs("#ccSettings")?.addEventListener("click", open);
  qs("#settingsClose")?.addEventListener("click", close);
  modal?.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  qs("#tokenSave")?.addEventListener("click", () => {
    setToken(qs("#tokenInput")?.value || "");
    close();
    R.toast(hasToken() ? "Token saved in this browser. Going live at 5,000/hr…" : "Token cleared — public mode.", "info");
    load(true);
  });
  qs("#tokenClear")?.addEventListener("click", () => {
    setToken("");
    const ti = qs("#tokenInput"); if (ti) ti.value = "";
    R.toast("Token cleared — public mode.", "info");
    load(true);
  });

  qs("#demoToggle")?.addEventListener("change", (e) => {
    demoMode = e.target.checked;
    localStorage.setItem("bd_cc_demo", demoMode ? "1" : "0");
    load(true);
  });
}

/* ---------- Minimal custom cursor (parity with the marketing site) ---------- */
function setupCursor() {
  const cursor = qs("#cursor");
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!cursor || !finePointer || reduce) return;
  document.body.classList.add("has-cursor");
  const dot = cursor.querySelector(".cursor__dot");
  const ring = cursor.querySelector(".cursor__ring");
  const m = { x: innerWidth / 2, y: innerHeight / 2 };
  const r = { ...m };
  window.addEventListener("pointermove", (e) => {
    m.x = e.clientX; m.y = e.clientY;
    dot.style.transform = `translate(${m.x}px, ${m.y}px) translate(-50%, -50%)`;
  });
  (function loop() {
    r.x += (m.x - r.x) * 0.18; r.y += (m.y - r.y) * 0.18;
    ring.style.transform = `translate(${r.x}px, ${r.y}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
  setupCursorTargets();
}
function setupCursorTargets() {
  const cursor = qs("#cursor");
  if (!cursor || !document.body.classList.contains("has-cursor")) return;
  document.querySelectorAll('a, button, [data-cursor="link"]').forEach((el) => {
    if (el.dataset.cursorBound) return;
    el.dataset.cursorBound = "1";
    el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
  });
}

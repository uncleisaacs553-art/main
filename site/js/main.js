// B Digital — interaction layer.
// Everything here degrades gracefully: if GSAP / Lenis fail to load, content
// is still fully visible and the site remains usable.

import initScene from "./scene.js";
import { mountWork } from "./data.js";

const qs = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => [...c.querySelectorAll(s)];

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const Lenis = window.Lenis;
const hasGsap = !!(gsap && ScrollTrigger);
const finePointer = window.matchMedia("(pointer: fine)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!hasGsap) document.documentElement.classList.add("no-gsap");

document.addEventListener("DOMContentLoaded", () => {
  qs("#year").textContent = new Date().getFullYear();
  mountWork(qs("#workGrid"));

  initScene();
  setupSmoothScroll();
  setupNav();
  setupCursor();
  setupTilt();
  setupMagnetic();
  setupForm();
  setupLiveTeaser();

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.set("[data-reveal]", { opacity: 0, y: 28 });
    setupReveals();
    setupCounters();
    setupParallax();
    setupMarquee();
  }

  runLoader();
});

/* ---------- Loader ---------- */
function runLoader() {
  const loader = qs("#loader");
  const fill = qs("#loaderFill");
  if (!loader) return;
  let prog = 0;
  const done = () => loader.classList.add("is-done");
  const timer = setInterval(() => {
    prog = Math.min(prog + Math.random() * 20, 100);
    if (fill) fill.style.width = prog + "%";
    if (prog >= 100) {
      clearInterval(timer);
      setTimeout(() => {
        done();
        if (hasGsap) ScrollTrigger.refresh();
      }, 260);
    }
  }, 130);
  setTimeout(done, 4500); // failsafe
}

/* ---------- Smooth scroll (Lenis) ---------- */
let lenis = null;
function setupSmoothScroll() {
  if (!Lenis || reduceMotion) return;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });

  if (hasGsap) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  qsa('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      const el = qs(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: 0, duration: 1.2 });
      qs("#nav").classList.remove("is-open");
    });
  });
}

/* ---------- Navigation ---------- */
function setupNav() {
  const nav = qs("#nav");
  const toggle = qs("#navToggle");
  const onScroll = (y) => nav.classList.toggle("is-stuck", y > 40);

  if (lenis) lenis.on("scroll", ({ scroll }) => onScroll(scroll));
  else window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });
  onScroll(window.scrollY);

  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

/* ---------- Reveal on scroll ---------- */
function setupReveals() {
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    onEnter: (els) =>
      els.forEach((el) =>
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          delay: parseFloat(el.dataset.revealDelay || 0),
        })
      ),
  });
}

/* ---------- Animated counters ---------- */
function setupCounters() {
  qsa("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const pre = el.dataset.prefix || "";
    const suf = el.dataset.suffix || "";
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        const obj = { v: 0 };
        gsap.to(obj, {
          v: end,
          duration: 1.8,
          ease: "power2.out",
          onUpdate: () => { el.textContent = pre + obj.v.toFixed(dec) + suf; },
        });
      },
    });
  });
}

/* ---------- Parallax media ---------- */
function setupParallax() {
  qsa("[data-parallax] img").forEach((img) => {
    gsap.to(img, {
      yPercent: -10,
      ease: "none",
      scrollTrigger: {
        trigger: img.closest("[data-parallax]"),
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });
}

/* ---------- Locations marquee ---------- */
function setupMarquee() {
  const track = qs("#marqueeTrack");
  if (!track) return;
  track.innerHTML += track.innerHTML; // seamless loop
  gsap.to(track, { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
}

/* ---------- Custom cursor ---------- */
function setupCursor() {
  const cursor = qs("#cursor");
  if (!cursor || !finePointer || reduceMotion) return;
  document.body.classList.add("has-cursor");
  const dot = qs(".cursor__dot", cursor);
  const ring = qs(".cursor__ring", cursor);
  const m = { x: innerWidth / 2, y: innerHeight / 2 };
  const r = { ...m };

  window.addEventListener("pointermove", (e) => {
    m.x = e.clientX; m.y = e.clientY;
    dot.style.transform = `translate(${m.x}px, ${m.y}px) translate(-50%, -50%)`;
  });
  const loop = () => {
    r.x += (m.x - r.x) * 0.18; r.y += (m.y - r.y) * 0.18;
    ring.style.transform = `translate(${r.x}px, ${r.y}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  };
  loop();

  qsa('a, button, [data-cursor="link"]').forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
  });
}

/* ---------- Card 3D tilt ---------- */
function setupTilt() {
  if (!finePointer || reduceMotion) return;
  qsa("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const b = card.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width - 0.5;
      const py = (e.clientY - b.top) / b.height - 0.5;
      card.style.transform =
        `perspective(900px) rotateX(${-py * 5}deg) rotateY(${px * 7}deg) translateY(-6px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

/* ---------- Magnetic buttons ---------- */
function setupMagnetic() {
  if (!finePointer || reduceMotion) return;
  qsa(".btn").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const b = btn.getBoundingClientRect();
      const mx = e.clientX - b.left - b.width / 2;
      const my = e.clientY - b.top - b.height / 2;
      btn.style.transform = `translate(${mx * 0.22}px, ${my * 0.28}px)`;
    });
    btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
  });
}

/* ---------- Enquiry form ---------- */
function setupForm() {
  const form = qs("#enquiryForm");
  const status = qs("#formStatus");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    if (!name || !email) {
      status.textContent = "Please add your name and email so we can reach you.";
      status.style.color = "var(--ink-soft)";
      return;
    }
    status.style.color = "var(--accent-lite)";
    status.textContent = `Thanks, ${name.split(" ")[0]} — we'll reply within one working day with a clear next step.`;
    form.reset();
  });
}

/* ---------- Live ops teaser (homepage) ---------- */
// Pulls one public GitHub events call and fills the live panel. Degrades
// silently to a status note if the API is unreachable or rate-limited.
const GH_OWNER = "uncleisaacs553-art";
function setupLiveTeaser() {
  const elAgents = qs("#liveAgents");
  const elEvents = qs("#liveEvents");
  const elRepos = qs("#liveRepos");
  const elStatus = qs("#liveStatus");
  if (!elStatus) return;

  fetch(`https://api.github.com/users/${GH_OWNER}/events/public?per_page=100`, {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then((events) => {
      if (!Array.isArray(events) || !events.length) throw new Error("no data");
      const dayAgo = Date.now() - 86400000;
      const recent = events.filter((e) => new Date(e.created_at).getTime() > dayAgo);
      const repos = new Set(events.map((e) => e.repo?.name).filter(Boolean));
      const botRe = /\[bot\]|bot$|agent|claude|action/i;
      const botActors = new Set(events.map((e) => e.actor?.login).filter((l) => l && botRe.test(l)));
      const allActors = new Set(events.map((e) => e.actor?.login).filter(Boolean));

      if (elAgents) elAgents.textContent = String(botActors.size || allActors.size);
      if (elEvents) elEvents.textContent = String(recent.length);
      if (elRepos) elRepos.textContent = String(repos.size);
      elStatus.textContent = `Last activity ${timeAgo(events[0].created_at)} · live from GitHub`;
    })
    .catch(() => {
      elStatus.textContent = "Live feed paused (API limit) — open the Command Center for full status.";
    });
}

function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60); if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60); if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

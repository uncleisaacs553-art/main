// Meridian — interaction layer.
// Everything here degrades gracefully: if GSAP / Lenis fail to load, content
// is still fully visible and the site remains usable.

import initScene from "./scene.js";
import { mountResidences } from "./data.js";

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
  mountResidences(qs("#residenceGrid"));

  initScene();
  setupSmoothScroll();
  setupNav();
  setupCursor();
  setupTilt();
  setupMagnetic();
  setupForm();

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
    status.style.color = "var(--brass-lite)";
    status.textContent = `Thank you, ${name.split(" ")[0]} — a Meridian advisor will be in touch within two working days.`;
    form.reset();
  });
}

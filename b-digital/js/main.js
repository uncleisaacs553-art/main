// B Digital — interaction layer.
// Everything here degrades gracefully: if GSAP / Lenis / WebGL fail to load,
// the content stays fully visible and the site remains usable.

import initScene from "./scene.js";

const qs = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => [...c.querySelectorAll(s)];

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const Lenis = window.Lenis;
const hasGsap = !!(gsap && ScrollTrigger);
const finePointer = window.matchMedia("(pointer: fine)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// WhatsApp number for B Digital (international format, digits only).
const WHATSAPP = "264814794693";

if (!hasGsap) document.documentElement.classList.add("no-gsap");

document.addEventListener("DOMContentLoaded", () => {
  qs("#year").textContent = new Date().getFullYear();

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
    prog = Math.min(prog + Math.random() * 22, 100);
    if (fill) fill.style.width = prog + "%";
    if (prog >= 100) {
      clearInterval(timer);
      setTimeout(() => {
        done();
        if (hasGsap) ScrollTrigger.refresh();
      }, 240);
    }
  }, 120);
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
    const fmt = (v) =>
      pre + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
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
          onUpdate: () => { el.textContent = fmt(obj.v); },
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

/* ---------- Marquee ---------- */
function setupMarquee() {
  const track = qs("#marqueeTrack");
  if (!track) return;
  track.innerHTML += track.innerHTML; // seamless loop
  gsap.to(track, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
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
        `perspective(900px) rotateX(${-py * 4}deg) rotateY(${px * 6}deg) translateY(-6px)`;
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
      btn.style.transform = `translate(${mx * 0.18}px, ${my * 0.24}px)`;
    });
    btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
  });
}

/* ---------- Enquiry form → WhatsApp ----------
   No backend needed: we compose a tidy WhatsApp message from the form
   and open a chat with B Digital — the studio's main channel in Namibia. */
function setupForm() {
  const form = qs("#enquiryForm");
  const status = qs("#formStatus");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const get = (n) => (form.querySelector(`[name="${n}"]`)?.value || "").trim();
    const name = get("name");
    const business = get("business");
    const interest = get("interest");
    const message = get("message");

    if (!name) {
      status.style.color = "var(--ink-soft)";
      status.textContent = "Please add your name so we know who we're chatting to.";
      form.querySelector('[name="name"]').focus();
      return;
    }

    const lines = [
      "Hi B Digital! 👋",
      `I'm ${name}${business ? ` from ${business}` : ""}.`,
      `I'm interested in: ${interest}.`,
      message ? `Details: ${message}` : "",
    ].filter(Boolean);

    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener");

    status.style.color = "var(--violet)";
    status.textContent = `Thanks ${name.split(" ")[0]} — opening WhatsApp so you can send your message. If it didn't open, message +264 81 479 4693.`;
    form.reset();
  });
}

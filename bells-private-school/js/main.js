// Bells Private School — lightweight interaction layer.
// No external libraries: just mobile nav, subtle scroll reveals, the contact
// form handler, and the footer year. Everything degrades gracefully.

import { mountProgrammes } from "./data.js";

const qs = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => [...c.querySelectorAll(s)];

document.addEventListener("DOMContentLoaded", () => {
  qs("#year").textContent = new Date().getFullYear();
  mountProgrammes(qs("#programmeGrid"));
  setupNav();
  setupReveals();
  setupForm();
});

/* ---------- Mobile navigation ---------- */
function setupNav() {
  const header = qs("#header");
  const toggle = qs("#navToggle");
  toggle?.addEventListener("click", () => {
    const open = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  // Close the menu after tapping a link
  qsa("#nav a").forEach((a) =>
    a.addEventListener("click", () => header.classList.remove("is-open"))
  );
}

/* ---------- Subtle reveal on scroll ---------- */
function setupReveals() {
  const els = qsa(".reveal");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  els.forEach((el) => io.observe(el));
}

/* ---------- Enquiry form ---------- */
function setupForm() {
  const form = qs("#enquiryForm");
  const status = qs("#formStatus");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.querySelector('[name="name"]').value.trim();
    const contact = form.querySelector('[name="contact"]').value.trim();
    if (!name || !contact) {
      status.style.color = "var(--muted)";
      status.textContent = "Please add your name and a phone number or email so we can reach you.";
      return;
    }
    status.style.color = "var(--gold-deep)";
    status.textContent = `Thank you, ${name.split(" ")[0]} — our team will be in touch shortly. For anything urgent, please call +264 81 204 6275.`;
    form.reset();
  });
}

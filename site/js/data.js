// Selected work — representative project showcase for B Digital.
// Edit this array to feature your real products, sites, and automations.
// Imagery via Unsplash (with graceful fallback if a photo is unavailable).

export const projects = [
  {
    name: "Pulse Analytics",
    type: "SaaS",
    category: "Fintech · Web app",
    desc: "A real-time analytics dashboard with auth, billing, and live charts — from blank repo to launched product.",
    stack: "Next.js", time: "8 wk", status: "Live",
    img: "1551288049-bebda4e38f71",
  },
  {
    name: "Relay",
    type: "Automation",
    category: "Sales · AI agents",
    desc: "A fleet of agents that research leads, draft outreach, and log every touch — running around the clock.",
    stack: "Agents", time: "3 wk", status: "Running",
    img: "1677442136019-21780ecad995",
  },
  {
    name: "Cohort CRM",
    type: "SaaS",
    category: "B2B · Web app",
    desc: "A focused CRM built around how small teams actually sell, with automations baked into every pipeline.",
    stack: "React", time: "10 wk", status: "Live",
    img: "1460925895917-afdab827c52f",
  },
  {
    name: "Atlas Studio",
    type: "Web",
    category: "Agency · Marketing site",
    desc: "An immersive, fast marketing site with motion that means something — clear message, zero clutter.",
    stack: "Three.js", time: "4 wk", status: "Live",
    img: "1467232004584-a241de8bcf5d",
  },
  {
    name: "Ledger Sync",
    type: "Automation",
    category: "Operations · Integrations",
    desc: "Connects the tools a business already uses and keeps their data in sync — quietly, every minute.",
    stack: "Workflows", time: "5 wk", status: "Running",
    img: "1518186285589-2f7649de83e0",
  },
  {
    name: "Beacon Storefront",
    type: "Web",
    category: "E-commerce · Headless",
    desc: "A headless storefront that loads instantly and converts — with stock and pricing kept fresh by agents.",
    stack: "Headless", time: "6 wk", status: "Live",
    img: "1556742049-0cfed4f6a45d",
  },
];

const img = (id, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export function mountWork(target) {
  if (!target) return;
  target.innerHTML = projects
    .map(
      (p, i) => `
    <article class="card" data-reveal data-reveal-delay="${(i % 3) * 0.07}" data-tilt data-cursor="link">
      <div class="card__media">
        <span class="card__tag">${p.type}</span>
        <img src="${img(p.img)}" alt="${p.name} — ${p.category}" loading="lazy"
             onerror="this.closest('.card__media').classList.add('media--fallback'); this.remove();" />
      </div>
      <div class="card__body">
        <span class="card__loc">${p.category}</span>
        <h3 class="card__name">${p.name}</h3>
        <p class="card__desc">${p.desc}</p>
        <div class="card__specs">
          <span><b>${p.stack}</b> Stack</span>
          <span><b>${p.time}</b> Build</span>
          <span><b>${p.status}</b></span>
        </div>
      </div>
    </article>`
    )
    .join("");
}

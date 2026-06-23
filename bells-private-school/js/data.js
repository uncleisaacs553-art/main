// Programmes & pathways offered by Bells Private School.
// Rendered into the #programmeGrid as interactive, tiltable cards.

export const programmes = [
  {
    icon: "✎",
    name: "NSSCO Grade 11 Tutorial",
    desc: "Our flagship full programme — structured teaching across the core NSSCO subjects, with mentorship and mock exams built in.",
    tags: ["Full-time", "Core subjects", "Mock exams"],
  },
  {
    icon: "◷",
    name: "Part-Time Learning",
    desc: "Flexible scheduling for working learners and private candidates who need to fit study around the rest of life.",
    tags: ["Flexible hours", "Private candidates"],
  },
  {
    icon: "◎",
    name: "Subject Coaching",
    desc: "Targeted, focused coaching in the one or two subjects holding a learner back — taught to genuine understanding.",
    tags: ["Targeted", "1:1 & small group"],
  },
  {
    icon: "☀",
    name: "Holiday Classes",
    desc: "Intensive consolidation during the breaks to lock in skills, close gaps, and keep momentum between terms.",
    tags: ["Intensive", "Skill consolidation"],
  },
  {
    icon: "✓",
    name: "Exam Registration Services",
    desc: "We register private and NAMCOL candidates for NSSCO examinations as an official, accredited centre.",
    tags: ["NSSCO", "NAMCOL", "Accredited centre"],
  },
  {
    icon: "❝",
    name: "Mentorship & Monitoring",
    desc: "Personalised academic mentorship with steady progress monitoring, so nothing slips and families stay informed.",
    tags: ["Personalised", "Progress reports"],
  },
];

export function mountProgrammes(target) {
  if (!target) return;
  target.innerHTML = programmes
    .map(
      (p, i) => `
    <article class="card reveal">
      <span class="card__icon" aria-hidden="true">${p.icon}</span>
      <h3 class="card__name">${p.name}</h3>
      <p class="card__desc">${p.desc}</p>
      <div class="card__tags">
        ${p.tags.map((t) => `<span>${t}</span>`).join("")}
      </div>
    </article>`
    )
    .join("");
}

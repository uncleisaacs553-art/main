// Residence collection — fictional showcase data.
// Imagery via Unsplash (with graceful fallback if a photo is unavailable).

export const residences = [
  {
    name: "Casa Lumière",
    location: "Côte d'Azur, France",
    price: "€18.5M",
    desc: "A glass pavilion folded into the cliffs above Èze, dissolving into the Mediterranean horizon.",
    beds: 6, baths: 7, area: "920",
    img: "1613490493576-7fde63acd811",
  },
  {
    name: "The Cantilever House",
    location: "Hollywood Hills, USA",
    price: "$24M",
    desc: "Stacked volumes suspended over the canyon — engineering as a quiet act of theatre.",
    beds: 5, baths: 6, area: "740",
    img: "1600596542815-ffad4c1539a9",
  },
  {
    name: "Villa Mareterra",
    location: "Costa Smeralda, Italy",
    price: "€12.9M",
    desc: "Honey stone and sea light along the Sardinian coast, built around a sheltered courtyard.",
    beds: 5, baths: 5, area: "610",
    img: "1564013799919-ab600027ffc6",
  },
  {
    name: "Maison Verre",
    location: "7th Arr., Paris, France",
    price: "€9.75M",
    desc: "A restored hôtel particulier hidden behind a glass courtyard, moments from the Seine.",
    beds: 4, baths: 3, area: "380",
    img: "1600585152220-90363fe7e115",
  },
  {
    name: "Skyframe Penthouse",
    location: "TriBeCa, New York",
    price: "$16.2M",
    desc: "A full-floor aerie wrapped in steel and sky, with light on three exposures.",
    beds: 4, baths: 4, area: "520",
    img: "1502672260266-1c1ef2d93688",
  },
  {
    name: "Desert Monolith",
    location: "Joshua Tree, USA",
    price: "$7.4M",
    desc: "Board-formed concrete dissolved into the high desert — a retreat measured in silence.",
    beds: 3, baths: 4, area: "410",
    img: "1568605114967-8130f3a36994",
  },
];

const img = (id, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export function mountResidences(target) {
  if (!target) return;
  target.innerHTML = residences
    .map(
      (r, i) => `
    <article class="card" data-reveal data-reveal-delay="${(i % 3) * 0.07}" data-tilt data-cursor="link">
      <div class="card__media">
        <span class="card__price">${r.price}</span>
        <img src="${img(r.img)}" alt="${r.name}, ${r.location}" loading="lazy"
             onerror="this.closest('.card__media').classList.add('media--fallback'); this.remove();" />
      </div>
      <div class="card__body">
        <span class="card__loc">${r.location}</span>
        <h3 class="card__name">${r.name}</h3>
        <p class="card__desc">${r.desc}</p>
        <div class="card__specs">
          <span><b>${r.beds}</b> Beds</span>
          <span><b>${r.baths}</b> Baths</span>
          <span><b>${r.area}</b> m²</span>
        </div>
      </div>
    </article>`
    )
    .join("");
}

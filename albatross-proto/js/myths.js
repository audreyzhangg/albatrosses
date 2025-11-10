// Postcard carousel (single hero image under the title)
// Smooth sliding, responsive keep-in-view. Region filter removed.

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let viewport, track, prevBtn, nextBtn, counter;
let allCards = [];
let visibleIdxs = [];
let i = 0;

/* ---------------- data loading ---------------- */
async function loadData() {
  try {
    const r = await fetch("data/myths.json", { cache: "no-store" });
    if (r.ok) return normalize(await r.json());
  } catch(_) {}
  try {
    const r = await fetch("data/myths.csv", { cache: "no-store" });
    if (r.ok) return normalize(d3.csvParse(await r.text()));
  } catch(_) {}

  // Fallback seeded content (uses one image per card in /images)
  return normalize([
    {
      id: "rime",
      title: "The Rime of the Ancient Mariner",
      kicker: "Literature • England • 1798",
      blurb: [
        "In late-18th-century Britain—an empire of tall ships and risky voyages—Samuel Taylor Coleridge turned a seabird into a symbol. In his ballad, a lone albatross appears out of fog and guides a storm-tossed crew to safety. The mariner kills it on a whim. Calamity follows.",
        "Readers then and now took the bird as a living compass, a pact with the sea: respect the ocean or bear the weight of your trespass. From this poem came a lasting idiom—an “albatross around the neck”—for guilt that clings and burdens. Sailors’ lore absorbed it too: don’t harm the birds that foretell wind and land."
      ].join("\n\n"),
      quote: "“At length did cross an Albatross,\nThorough the fog it came;”\n…\n“Instead of the cross, the Albatross\nAbout my neck was hung.”",
      quoteAttr: "S. T. Coleridge, The Rime of the Ancient Mariner (1798)",
      country: "United Kingdom",
      region: "Europe",
      source: "Maritime literature & idiom origin",
      image: "images/rime-ancient-mariner.jpg"
    },
    {
      id: "diomedea",
      title: "Why ‘Diomedea’? The Greek Legend",
      kicker: "Myth & Etymology • Adriatic • Classical",
      blurb: [
        "Ancient tales tie the albatross to the warrior Diomedes. In one strand, his grieving companions are transformed into birds—the Diomedeae—keeping vigil by their king’s tomb on an Adriatic isle. In another, the birds defend the sanctuary, harrying strangers who profane the place.",
        "From such stories came the scientific names: family Diomedeidae, and the great albatrosses’ genus Diomedea. The myth recasts the birds as faithful guardians of the dead and of sacred shores—coastal custodians whose calls echo memory and duty along the Mediterranean world."
      ].join("\n\n"),
      quote: "…men of Diomedes were turned into birds, keeping watch beside their fallen king.",
      quoteAttr: "Classical tradition & Tremiti Archipelago legend",
      country: "Greece / Italy (Tremiti)",
      region: "Mediterranean",
      source: "Etymology of Diomedeidae / Diomedea",
      image: "images/diomedea-myth.jpg"
    },
    {
      id: "verne",
      title: "An Omen in Verne’s Nautilus",
      kicker: "Literature • France • 1870",
      blurb: [
        "Early in Jules Verne’s 'Twenty Thousand Leagues Under the Seas', an eager crewman shoots an albatross during the Nautilus’s first foray. What follows is a string of misadventures, culminating as the vessel is swept toward the maelstrom while Aronnax, Conseil, and Ned Land flee.",
        "Verne taps the same current as Coleridge: to harm an albatross is to invite the sea’s rebuke. The bird becomes a narrative hinge—signal of hubris, weather vane of fortune—bridging Romantic superstition and industrial-age science fiction."
      ].join("\n\n"),
      quote: "An albatross fell to a thoughtless shot; afterwards, trouble dogged our wake.",
      quoteAttr: "After Verne, *Vingt mille lieues sous les mers* (1870)",
      country: "France (novel); Atlantic imagination",
      region: "Global",
      source: "Sci-fi echo of the mariner motif",
      image: "images/verne-20000-leagues.jpg"
    }
  ]);
}

function normalize(rows){
  return rows.map((r, idx) => {
    let hero = r.image || "";
    if (!hero && r.images) {
      const arr = Array.isArray(r.images) ? r.images : String(r.images).split(/[;,|]/);
      hero = (arr[0] || "").toString().trim();
    }
    return {
      id: (r.id ?? String(idx)).toString(),
      title: (r.title ?? r.name ?? "Untitled").toString().trim(),
      kicker: (r.kicker ?? "Literature & History").toString().trim(),
      blurb: (r.blurb ?? r.text ?? "").toString(),
      quote: (r.quote ?? "").toString(),
      quoteAttr: (r.quoteAttr ?? r.quote_source ?? "").toString().trim(),
      country: (r.country ?? r.place ?? "").toString().trim(),
      region: (r.region ?? "Global").toString().trim(),
      source: (r.source ?? "").toString().trim(),
      image: hero
    };
  });
}

/* ---------------- render / layout ---------------- */
function applyFilter(){
  // No filter anymore: show all cards
  visibleIdxs = allCards.map((_, idx) => idx);
  i = 0;
}

function buildTrack(){
  track.innerHTML = "";
  visibleIdxs.forEach(idx => track.insertAdjacentHTML("beforeend", cardHTML(allCards[idx])));
  updateCounter();
  track.children[0]?.scrollIntoView({ behavior: "instant", inline: "start", block: "nearest" });
}

function paraHTML(text){
  if (!text) return "";
  return text.split(/\n\s*\n/g).map(p => `<p>${esc(p)}</p>`).join("");
}

function cardHTML(c){
  const quoteHTML = c.quote ? `
    <blockquote class="pc-quote">${esc(c.quote)}</blockquote>
    ${c.quoteAttr ? `<div class="pc-quote-attr">${esc(c.quoteAttr)}</div>` : ""}
  ` : "";

  const heroHTML = c.image
    ? `<div class="pc-hero" style="background-image:url('${escAttr(c.image)}')"></div>`
    : `<div class="pc-hero pc-hero-ph"></div>`;

  return `
    <article class="pc-card" role="listitem" aria-label="${esc(c.title)}">
      <div class="pc-left">
        <div class="pc-lines"></div>
        <div class="pc-text">
          <h4 class="pc-kicker">${esc(c.kicker)}</h4>
          <div class="pc-body">${paraHTML(c.blurb)}</div>
          ${quoteHTML}
        </div>
      </div>
      <div class="pc-divider" aria-hidden="true"></div>
      <div class="pc-right">
        <div class="pc-meta">
          <div class="pc-title">“${esc(c.title)}”</div>
          <div class="pc-country">${esc(c.country || "—")} • ${esc(c.region)}</div>
          ${c.source ? `<div class="pc-source">${esc(c.source)}</div>` : ""}
        </div>
        ${heroHTML}
      </div>
    </article>
  `;
}

function esc(s){ return String(s).replace(/[&<>"]/g,c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function escAttr(s){ return String(s).replace(/"/g, '&quot;'); }

function updateCounter(){
  counter.textContent = `${Math.min(i+1, visibleIdxs.length)} of ${visibleIdxs.length}`;
  prevBtn.disabled = nextBtn.disabled = visibleIdxs.length <= 1;
}

function goTo(idx){
  if (!visibleIdxs.length) return;
  i = (idx + visibleIdxs.length) % visibleIdxs.length;
  const el = track.children[i];
  if (el) el.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  updateCounter();
}

/* ---------------- init + events ---------------- */
async function init(){
  // Get elements (wait for DOM if needed)
  viewport = document.getElementById("pcViewport");
  track    = document.getElementById("pcTrack");
  prevBtn  = document.getElementById("prevBtn");
  nextBtn  = document.getElementById("nextBtn");
  counter  = document.getElementById("pcCounter");

  // Check if elements exist
  if (!viewport || !track || !prevBtn || !nextBtn || !counter) {
    console.warn("Myths carousel elements not found");
    return;
  }

  allCards = await loadData();
  applyFilter();
  buildTrack();

  prevBtn.addEventListener("click", () => goTo(i-1));
  nextBtn.addEventListener("click", () => goTo(i+1));

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft")  goTo(i-1);
    if (e.key === "ArrowRight") goTo(i+1);
  });

  // Keep i in sync on scroll
  let scrollTimer = null;
  viewport.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const cards = Array.from(track.children);
      let best = 0, bestDist = Infinity, left = viewport.scrollLeft;
      cards.forEach((el, idx) => {
        const dist = Math.abs(el.offsetLeft - left);
        if (dist < bestDist){ bestDist = dist; best = idx; }
      });
      i = best; updateCounter();
    }, 80);
  });

  // Keep current card centered on container width changes
  const ro = new ResizeObserver(() => {
    const el = track.children[i];
    if (el) el.scrollIntoView({ behavior: "instant", inline: "start", block: "nearest" });
  });
  ro.observe(viewport);

  // Touch swipe
  let touchX = null;
  viewport.addEventListener("touchstart", e => { touchX = e.changedTouches[0].clientX; }, { passive:true });
  viewport.addEventListener("touchend", e => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) (dx < 0 ? goTo(i+1) : goTo(i-1));
    touchX = null;
  }, { passive:true });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

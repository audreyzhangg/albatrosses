// Responsive migration/colonies map
// - Auto-detects the SVG by common ids
// - Resizes with its container via ResizeObserver
// - Loads world basemap from CDN (fallback to local) and colony points from CSV/JSON

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as topojson from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

// ---------- pick the SVG safely (works even if your id differs)
function pickSvg(selectors) {
  for (const s of selectors) {
    const sel = d3.select(s);
    if (!sel.empty()) return sel;
  }
  return d3.select(null);
}
const svg = pickSvg(["#coloniesSVG", "#mapSVG", "#worldMap", "#map", "svg#colonies"]);
if (svg.empty()) console.warn("Colonies map SVG not found — check the id in colonies.html");

// ---------- data loaders (run once)
let worldFC = null;      // GeoJSON FeatureCollection (countries)
let colonies = [];       // [{species, lat, lon, country, site}, ...]

async function loadWorld() {
  try {
    const topo = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
    worldFC = topojson.feature(topo, topo.objects.countries);
  } catch (e) {
    try {
      const topo = await d3.json("data/world-110m.json"); // optional local fallback
      worldFC = topojson.feature(topo, topo.objects.countries);
    } catch (e2) {
      console.error("World basemap failed to load.");
    }
  }
}

//function asNum(v) { const n = +v; return Number.isFinite(n) ? n : null; }
// --- robust coordinate parser ---
function parseCoord(v, isLon) {
    if (v == null) return null;
    let s = String(v).trim().toUpperCase()
      .replace(/[−—–]/g, "-")   // fancy minus → ASCII
      .replace(/,/g, ".");      // comma decimal → dot
  
    // Keep track of cardinal letter if present
    let sign = 1;
    if (/[SW]\s*$/.test(s)) sign = -1;
    s = s.replace(/[NSEW]/g, "");
  
    // DMS → decimal if we see degree/minute/second marks
    let num;
    if (/[°'″"]/u.test(s)) {
      const m = s.match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)?\D*(\d+(?:\.\d+)?)?/);
      if (!m) return null;
      const d = parseFloat(m[1] || "0");
      const mn = parseFloat(m[2] || "0");
      const sec = parseFloat(m[3] || "0");
      num = d + mn / 60 + sec / 3600;
    } else {
      num = parseFloat(s);
    }
    if (!Number.isFinite(num)) return null;
    num *= sign;
  
    if (isLon) {
      // convert 0..360 → -180..180
      if (num > 180) num -= 360;
      if (num < -180) num += 360;
      return Math.max(-180, Math.min(180, num));
    } else {
      return Math.max(-90, Math.min(90, num));
    }
  }
  
function normName(s) { return (s ?? "").toString().trim(); }

async function loadColonies() {
  // Try multiple common paths/schemas; first one that works wins.
  let rows = null;

  // JSON (GeoJSON Points or array of objects)
  try {
    const j = await d3.json("data/colonies.json");
    if (Array.isArray(j)) rows = j;
    else if (j && j.type === "FeatureCollection") rows = j.features.map(f => ({
      species: normName(f.properties?.species ?? f.properties?.common_name),
      country: normName(f.properties?.country),
      site: normName(f.properties?.site),
      //lat: asNum(f.geometry?.coordinates?.[1]),
      lat: parseCoord(f.geometry?.coordinates?.[1], false),
      //lon: asNum(f.geometry?.coordinates?.[0]),
      lon: parseCoord(f.geometry?.coordinates?.[0], true),
    }));
  } catch (_) {}

  // CSV fallbacks
  if (!rows) {
    for (const path of [
      "data/colonies.csv",
      "data/seabird-data-export.csv",
      "data/processed/colonies.csv"
    ]) {
      try {
        const text = await (await fetch(path, { cache: "no-store" })).text();
        rows = d3.csvParse(text);
        if (rows?.length) break;
      } catch (_) {}
    }
  }

  if (!rows) {
    colonies = [];
    return;
  }

  colonies = rows.map(r => {
    //const lat = asNum(r.lat ?? r.latitude ?? r.Latitude);
    const lat = parseCoord(r.lat ?? r.latitude ?? r.Latitude ?? r.Y ?? r.y, false);
    //const lon = asNum(r.lon ?? r.longitude ?? r.Longitude ?? r.lng);
    const lon = parseCoord(r.lon ?? r.longitude ?? r.Longitude ?? r.lng ?? r.X ?? r.x, true);
    return {
      species: normName(r.species ?? r.common_name ?? r.Species),
      country: normName(r.country ?? r.Country),
      site: normName(r.site ?? r.Site),
      lat, lon
    };
  }).filter(d => d.lat !== null && d.lon !== null);
}

// ---------- render (responsive)
let currentWidth = 0;

function draw() {
  if (svg.empty() || !worldFC) return;

  // Size from the SVG's parent (.viz card)
  const container = svg.node().parentElement;
  const width = Math.max(360, container.clientWidth);
  if (width === currentWidth) return; // avoid redundant work
  currentWidth = width;

  const aspect = 0.58;                        // NaturalEarth-ish aspect
  const height = Math.round(width * aspect);

  // responsive viewport
  svg.attr("viewBox", `0 0 ${width} ${height}`)
     .attr("preserveAspectRatio", "xMidYMid meet")
     .style("width", "100%")
     .style("height", "auto");

  // clear
  svg.selectAll("*").remove();

  const margin = { top: 12, right: 12, bottom: 12, left: 12 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // projection fit to world
  const projection = d3.geoNaturalEarth1();
  const path = d3.geoPath(projection);
  projection.fitSize([innerW, innerH], worldFC);

  // water
  g.append("rect")
    .attr("width", innerW).attr("height", innerH)
    .attr("fill", "#e6f3ff");

  // land
  g.append("g").selectAll("path")
    .data(worldFC.features)
    .join("path")
    .attr("d", path)
    .attr("fill", "#f1efe8")
    .attr("stroke", "#94a3b8")
    .attr("stroke-width", 0.6);

  // colonies points (if you have species filtering, apply it before here)
  const pts = colonies.map(d => {
    const p = projection([d.lon, d.lat]);
    return p ? { ...d, x: p[0], y: p[1] } : null;
  }).filter(Boolean);

  g.append("g")
    .attr("fill", "tomato")
    .attr("fill-opacity", 0.9)
    .attr("stroke", "#111827")
    .attr("stroke-width", 0.4)
    .selectAll("circle")
    .data(pts)
    .join("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 3.2)
    .append("title")
    .text(d => `${d.species}${d.site ? ` — ${d.site}` : ""}${d.country ? ` (${d.country})` : ""}`);
}

// ---------- boot + resize observer
(async function init() {
  await Promise.all([loadWorld(), loadColonies()]);
  draw();

  if (!svg.empty()) {
    const container = svg.node().parentElement;
    const ro = new ResizeObserver(() => { currentWidth = 0; draw(); });
    ro.observe(container);
  }
})();

// Get width from the chart’s container (the .viz card), not a fixed number
// const container = document.querySelector('#threatsSVG').parentElement; // adjust ID per page
// function getW(){ return Math.max(320, container.clientWidth); }

// // replace any hard-coded `width = 1100` with:
// let width = getW();

// // after you compute `height`, set a responsive viewBox so SVG scales with CSS:
// svg.attr("viewBox", `0 0 ${width} ${height}`)
//    .attr("preserveAspectRatio", "xMidYMid meet")
//    .style("width", "100%")
//    .style("height", "auto");

// // re-render on resize
// window.addEventListener('resize', () => {
//   width = getW();
//   d3.select('#threatsSVG').selectAll('*').remove(); // clear
//   init(); // or call your render() with the new width
// });


import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import {feature} from 'https://cdn.jsdelivr.net/npm/topojson-client@3/+esm';

const svg = d3.select('#map');
const width = +svg.attr('width');
const height = +svg.attr('height');

const projection = d3.geoNaturalEarth1().fitSize([width, height], {type:'Sphere'});
const path = d3.geoPath(projection);

const worldUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const speciesColoniesUrl = 'data/species_colonies.json';

const photoEl = document.getElementById('speciesPhoto');

function slugify(name){
  return name
    .toLowerCase()
    .trim()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')      // remove apostrophes
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');
}

function setPhotoForSpecies(species){
  const slug = slugify(species.name);
  const candidates = [
    `images/${slug}.jpg`,
    `images/${slug}.png`,
    `images/${slug}.jpeg`,
    `images/${slug}.webp`
  ];
  let i = 0;
  photoEl.style.display = 'none';
  function tryNext(){
    if(i >= candidates.length){ return; }
    photoEl.onerror = () => { i++; tryNext(); };
    photoEl.onload = () => { photoEl.alt = `${species.name} (${species.sci})`; photoEl.style.display = 'block'; };
    photoEl.src = candidates[i];
  }
  tryNext();
}

Promise.all([d3.json(worldUrl), d3.json(speciesColoniesUrl)]).then(([world, speciesData]) => {
  const countries = feature(world, world.objects.countries);

  // Base map
  svg.append('path').attr('d', path({type:'Sphere'})).attr('fill','#cfe8ff');
  svg.append('path').attr('class','graticule')
    .attr('d', d3.geoPath(projection, d3.geoGraticule10()));
  svg.append('g').selectAll('path')
    .data(countries.features).join('path')
    .attr('class','country').attr('d', path);

  // Species dropdown
  const species = speciesData.species
    .map(d => ({name:d.common_name, sci:d.scientific_name, colonies:d.colonies}))
    .sort((a,b)=> d3.ascending(a.name,b.name));

  d3.select('#speciesSelect').selectAll('option')
    .data(species).join('option')
    .attr('value', d=>d.name)
    .text(d=>d.name);

  const gCol = svg.append('g');
  const nodeMap = new Map(); // colonyKey -> circle node

  function colonyKey(d){
    return `${d.colony_name}|${d.lat}|${d.lon}`;
  }

  function radius(d){
    const size = d.nbirds || d.ntracks || d.npoints || 1;
    return 5 + Math.min(18, Math.log(size+1)*3);
  }

  function render(speciesName){
    const sp = species.find(s=>s.name===speciesName);
    d3.select('#speciesTitle').text(`${sp.name} (${sp.sci})`);
    setPhotoForSpecies(sp);

    // circles
    const circles = gCol.selectAll('circle').data(sp.colonies, colonyKey);
    circles.join(
      enter => enter.append('circle')
        .attr('class','colony')
        .attr('cx', d => projection([d.lon,d.lat])[0])
        .attr('cy', d => projection([d.lon,d.lat])[1])
        .attr('r', 0)
        .each(function(d){ nodeMap.set(colonyKey(d), this); })
        .transition().duration(400).attr('r', d=> radius(d)),
      update => update
        .each(function(d){ nodeMap.set(colonyKey(d), this); })
        .transition().duration(300).attr('r', d=> radius(d)),
      exit   => exit.transition().duration(250).attr('r',0).remove()
    ).select('title').remove();

    circles.append('title')
      .text(d=>`${d.colony_name} • ${d.site_name} • ${d.country}`);

    // colony list
    const list = d3.select('#colonyList');
    const sorted = sp.colonies.slice().sort((a,b) =>
      d3.ascending(a.country,b.country) || d3.ascending(a.site_name,b.site_name) || d3.ascending(a.colony_name,b.colony_name));

    const items = list.selectAll('li').data(sorted, colonyKey);

    const liEnter = items.enter().append('li')
      .attr('data-key', d=>colonyKey(d))
      .on('mouseenter', (e,d) => {
        const node = nodeMap.get(colonyKey(d));
        if(node){ d3.select(node).classed('highlight', true).transition().duration(150).attr('r', radius(d)+3); }
      })
      .on('mouseleave', (e,d) => {
        const node = nodeMap.get(colonyKey(d));
        if(node){ d3.select(node).classed('highlight', false).transition().duration(150).attr('r', radius(d)); }
      });

    liEnter.append('div').attr('class','name').text(d => d.colony_name || 'Unknown colony');
    liEnter.append('div').attr('class','meta').text(d => `${d.site_name || 'Unknown site'} — ${d.country || 'Unknown country'}`);

    items.select('.name').text(d => d.colony_name || 'Unknown colony');
    items.select('.meta').text(d => `${d.site_name || 'Unknown site'} — ${d.country || 'Unknown country'}`);

    items.exit().remove();
  }

  // initial
  const initial = species[0]?.name;
  if (initial) {
    d3.select('#speciesSelect').property('value', initial);
    render(initial);
  }

  d3.select('#speciesSelect').on('change', e=> render(e.target.value));
});

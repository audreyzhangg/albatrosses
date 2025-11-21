// Species Panel Handler
// Handles opening/closing the panel and displaying species information with colonies map

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import {feature} from 'https://cdn.jsdelivr.net/npm/topojson-client@3/+esm';

// Global state
let worldData = null;
let coloniesData = null;
let currentProjection = null;
let currentPath = null;

// Initialize panel
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('species-panel-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePanel);
    }

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('species-panel');
        if (panel && panel.classList.contains('open')) {
            if (!panel.contains(e.target) && !e.target.closest('.bird-group') && 
                !e.target.closest('.bird-label') && !e.target.closest('.species-label')) {
                closePanel();
            }
        }
    });

    // Listen for species selection events
    window.addEventListener('openSpeciesPanel', (e) => {
        if (e.detail && e.detail.speciesData) {
            openPanel(e.detail.speciesData);
        }
    });

    // Load world map and colonies data
    loadMapData();
});

function loadMapData() {
    Promise.all([
        d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
        d3.json('data/species_colonies.json')
    ]).then(([world, colonies]) => {
        worldData = feature(world, world.objects.countries);
        coloniesData = colonies;
    }).catch(err => {
        console.error('Error loading map data:', err);
    });
}

function slugify(name) {
    return name.toString().toLowerCase()
        .replace(/'s\b/g, '-s')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function openPanel(speciesData) {
    const panel = document.getElementById('species-panel');
    if (!panel) return;

    panel.classList.add('open');

    // Update title
    const titleEl = document.getElementById('species-panel-title');
    if (titleEl) {
        const commonName = speciesData['Common name'] || 'Unknown';
        const scientificName = speciesData['Scientific name'] || '';
        titleEl.textContent = scientificName ? `${commonName} (${scientificName})` : commonName;
    }

    // Load and display image
    const imageEl = document.getElementById('species-panel-image');
    if (imageEl) {
        const commonName = speciesData['Common name'] || 'Unknown';
        const slug = slugify(commonName);
        
        // Also create a version with apostrophe preserved for filenames that use it
        const slugWithApostrophe = commonName.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-']/g, '')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        
        const variants = [slugWithApostrophe, slug, slug.replace(/-/g, '_'), slug.replace(/-/g, '')];
        let imageLoaded = false;

        const tryLoadImage = (variantIndex, extIndex) => {
            if (imageLoaded || variantIndex >= variants.length) {
                if (!imageLoaded) imageEl.style.display = 'none';
                return;
            }

            const exts = ['jpg', 'jpeg', 'png', 'webp'];
            if (extIndex >= exts.length) {
                tryLoadImage(variantIndex + 1, 0);
                return;
            }

            const url = `images/${variants[variantIndex]}.${exts[extIndex]}`;
            const img = new Image();
            img.onload = () => {
                imageEl.src = url;
                imageEl.style.display = 'block';
                imageEl.alt = commonName;
                imageLoaded = true;
            };
            img.onerror = () => {
                tryLoadImage(variantIndex, extIndex + 1);
            };
            img.src = url;
        };

        tryLoadImage(0, 0);
    }

    // Update info section
    const infoEl = document.getElementById('species-panel-info');
    if (infoEl) {
        let html = '';

        // Status
        const statusColors = {
            'CR': '#d32f2f',
            'EN': '#f57c00',
            'VU': '#FFC34B',
            'NT': '#5AB361',
            'LC': '#2F6690'
        };
        const statusLabels = {
            'CR': 'Critically Endangered',
            'EN': 'Endangered',
            'VU': 'Vulnerable',
            'NT': 'Near Threatened',
            'LC': 'Least Concern'
        };

        if (speciesData['RL Category']) {
            const status = speciesData['RL Category'];
            const statusColor = statusColors[status] || '#666';
            const statusLabel = statusLabels[status] || status;
            html += `<p><span class="info-label">Conservation Status:</span> <span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span></p>`;
        }

        // Fun fact (from global funFactsData if available)
        if (typeof funFactsData !== 'undefined' && funFactsData[speciesData['Common name']]) {
            html += `<p><span class="info-label">Fun Fact:</span> ${funFactsData[speciesData['Common name']]}</p>`;
        }

            // Population
        if (speciesData['Population size (mature individuals)']) {
            const pop = speciesData['Population size (mature individuals)'];
            html += `<p><span class="info-label">Population:</span> ${typeof pop === 'number' ? pop.toLocaleString() : pop} mature individuals</p>`;
        }

        // Trend
        if (speciesData['Current population trend']) {
            html += `<p><span class="info-label">Population Trend:</span> ${speciesData['Current population trend']}</p>`;
        }

        // Range
        if (speciesData['RL EOO (smaller of breeding and non-breeding EOO) in km^2']) {
            const eoo = parseFloat(speciesData['RL EOO (smaller of breeding and non-breeding EOO) in km^2']);
            if (!isNaN(eoo)) {
                html += `<p><span class="info-label">Range:</span> ${eoo.toLocaleString()} km²</p>`;
            }
        }

        // Lifespan
        if (speciesData['Lifespan (years)']) {
            html += `<p><span class="info-label">Lifespan:</span> ${speciesData['Lifespan (years)']} years</p>`;
        }

        // Wingspan
        if (speciesData['Wingspan (cm)']) {
            html += `<p><span class="info-label">Wingspan:</span> ${speciesData['Wingspan (cm)']} cm</p>`;
        }

        // Length
        if (speciesData['Length (cm)']) {
            html += `<p><span class="info-label">Length:</span> ${speciesData['Length (cm)']} cm</p>`;
        }

        // Weight
        if (speciesData['Weight (kg)']) {
            html += `<p><span class="info-label">Weight:</span> ${speciesData['Weight (kg)']} kg</p>`;
        }

        // Append a human-readable colony location summary from the colonies data (if available)
        try {
            if (typeof coloniesData !== 'undefined' && coloniesData && speciesData['Common name']) {
                const matching = coloniesData.species.find(s => s.common_name === speciesData['Common name'] || s.common_name === speciesData['common_name']);
                if (matching && Array.isArray(matching.colonies) && matching.colonies.length) {
                    const locs = matching.colonies.map(c => {
                        const name = c.colony_name || c.site_name || 'Unknown';
                        const country = c.country ? `, ${c.country}` : '';
                        return `${name}${country}`;
                    });
                    const summary = locs.slice(0, 6).join('; ');
                    html += `<p><span class="info-label">Colony locations:</span> ${summary}</p>`;
                }
            }
        } catch (e) {
            // non-fatal; if coloniesData isn't ready we'll still render the panel and the map updater will retry
            console.warn('Could not append colony summary:', e);
        }

        infoEl.innerHTML = html || '<p>No additional information available.</p>';
    }

    // Update colonies map
    updateColoniesMap(speciesData['Common name']);
}

function updateColoniesMap(speciesName) {
    const mapEl = document.getElementById('species-panel-map');
    if (!mapEl || !worldData || !coloniesData) {
        // Wait for data to load
        setTimeout(() => updateColoniesMap(speciesName), 100);
        return;
    }

    // Clear previous map
    d3.select(mapEl).selectAll('*').remove();

    // Find species in colonies data
    const speciesInfo = coloniesData.species.find(s => s.common_name === speciesName);
    if (!speciesInfo || !speciesInfo.colonies || speciesInfo.colonies.length === 0) {
        d3.select(mapEl)
            .append('text')
            .attr('x', '50%')
            .attr('y', '50%')
            .attr('text-anchor', 'middle')
            .attr('fill', '#666')
            .text('No colony data available for this species.');
        return;
    }

    const width = mapEl.clientWidth || 400;
    const height = 350;

    // Set SVG dimensions
    d3.select(mapEl)
        .attr('width', width)
        .attr('height', height);

    // Set up projection
    currentProjection = d3.geoNaturalEarth1()
        .fitSize([width, height], worldData);
    currentPath = d3.geoPath(currentProjection);

    // Create a group for zoomable map base (water, graticule, countries)
    const svg = d3.select(mapEl);
    const gZoom = svg.append('g').attr('class', 'zoom-group');
    // Keep colonies in a separate group outside zoom transform so we can control their size
    const gColonies = svg.append('g').attr('class', 'colonies-group');

    // Draw water background
    gZoom.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#cfe8ff');

    // Draw graticule
    gZoom.append('path')
        .attr('class', 'graticule')
        .attr('d', currentPath(d3.geoGraticule10()));

    // Draw countries
    gZoom.append('g')
        .selectAll('path')
        .data(worldData.features)
        .join('path')
        .attr('class', 'country')
        .attr('d', currentPath);

    // Draw colonies
    // Normalize coordinates and flag suspicious entries (out-of-range or possibly swapped lat/lon)
    const colonies = speciesInfo.colonies.map(d => {
        let lat = d.lat;
        let lon = d.lon;
        // coerce to numbers when possible
        if (lat != null) lat = Number(lat);
        if (lon != null) lon = Number(lon);
        let suspect = false;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) suspect = true;
        // if lat outside valid range but lon looks like a latitude, they may be swapped
        if (Number.isFinite(lat) && Math.abs(lat) > 90 && Number.isFinite(lon) && Math.abs(lon) <= 90) {
            console.warn(`Possible swapped coords for ${d.colony_name || d.site_name || 'unknown'}: lat=${d.lat}, lon=${d.lon} — attempting to swap for display`);
            const t = lat; lat = lon; lon = t; suspect = true;
        }
        // if lon outside range, mark suspect
        if (Number.isFinite(lon) && (lon < -180 || lon > 180)) suspect = true;
        return Object.assign({}, d, { lat, lon, suspect });
    }).filter(d => d.lat != null && d.lon != null && Number.isFinite(d.lat) && Number.isFinite(d.lon));
    
    function radius(d) {
        // Make the panel dots smaller and less aggressive so they appear more geographically precise
        const size = d.nbirds || d.ntracks || d.npoints || 1;
        // base size and modest growth; caps small so dots are compact
        const r = 1.6 + Math.min(5, Math.log(size + 1) * 1.1);
        return Math.max(1.2, Math.round(r * 10) / 10);
    }

    const gCol = gColonies.append('g');
    const nodeMap = new Map();
    let currentZoomScale = 1; // Track zoom scale for circle sizing
    let currentTransform = d3.zoomIdentity; // Track the current zoom transform

    function colonyKey(d) {
        return `${d.colony_name}|${d.lat}|${d.lon}`;
    }

    const circles = gCol.selectAll('circle')
        .data(colonies, colonyKey);

    circles.join(
        enter => enter.append('circle')
            .attr('class', 'colony')
            .classed('suspect', d => d.suspect)
            .attr('cx', d => {
                const coords = currentProjection([d.lon, d.lat]);
                return coords ? coords[0] : 0;
            })
            .attr('cy', d => {
                const coords = currentProjection([d.lon, d.lat]);
                return coords ? coords[1] : 0;
            })
            .attr('r', 0)
            .attr('stroke-width', 0.6)
            .each(function(d) {
                nodeMap.set(colonyKey(d), this);
            })
            .transition()
            .duration(400)
            .attr('r', d => radius(d)),
        update => update
            .each(function(d) {
                nodeMap.set(colonyKey(d), this);
            })
            .transition()
            .duration(300)
            .attr('r', d => radius(d)),
        exit => exit
            .transition()
            .duration(250)
            .attr('r', 0)
            .remove()
    );

    // Make title include lat/lon for easy inspection/diagnostics
    circles.select('title').remove();
    circles.append('title')
        .text(d => `${d.colony_name || 'Unknown'} • ${d.site_name || 'Unknown'} • ${d.country || 'Unknown'} — lat:${d.lat ?? 'NA'}, lon:${d.lon ?? 'NA'}`);

    // Add hover effects
    circles.on('mouseenter', function(event, d) {
        d3.select(this)
            .classed('highlight', true)
            .transition()
            .duration(150)
            .attr('r', radius(d) / currentZoomScale + 2);
    })
    .on('mouseleave', function(event, d) {
        d3.select(this)
            .classed('highlight', false)
            .transition()
            .duration(150)
            .attr('r', radius(d) / currentZoomScale);
    });

    // Add zoom and pan behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', (event) => {
            gZoom.attr('transform', event.transform);
            // Apply same transform to colonies group but also scale circles inversely
            currentZoomScale = event.transform.k;
            currentTransform = event.transform;
            gColonies.attr('transform', event.transform);
            // Update circle radii inversely with zoom scale so they appear smaller when zoomed in
            gCol.selectAll('circle').attr('r', d => radius(d) / currentZoomScale);
        });

    svg.call(zoom);

    // Reset zoom on double-click
    svg.on('dblclick.zoom', () => {
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    });
}

function closePanel() {
    const panel = document.getElementById('species-panel');
    if (panel) {
        panel.classList.remove('open');
        // Dispatch event to notify other components that panel is closed
        window.dispatchEvent(new CustomEvent('speciesPanelClosed'));
    }
}

// Make function available globally for threats.js
window.openSpeciesPanel = function(speciesName) {
    // Find species data from the visualization
    // This will be called from threats.js
    window.dispatchEvent(new CustomEvent('openSpeciesPanelByName', { detail: { speciesName } }));
};

// Listen for species name-based opens (from threats section)
window.addEventListener('openSpeciesPanelByName', async (e) => {
    if (e.detail && e.detail.speciesName) {
        // Load species data from CSV
        if (typeof Papa !== 'undefined') {
            Papa.parse('speciesinfo.csv', {
                download: true,
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: function(results) {
                    const species = results.data.find(d => d['Common name'] === e.detail.speciesName);
                    if (species) {
                        openPanel(species);
                    }
                }
            });
        }
    }
});


const statusColors = {
    'CR': '#d32f2f',  // Critical - Red
    'EN': '#f57c00',  // Endangered - Orange
    'VU': '#fbc02d',  // Vulnerable - Yellow
    'NT': '#388e3c',  // Near Threatened - Green
    'LC': '#1976d2'   // Least Concern - Blue
};

const statusLabels = {
    'CR': 'Critically Endangered',
    'EN': 'Endangered',
    'VU': 'Vulnerable',
    'NT': 'Near Threatened',
    'LC': 'Least Concern'
};

// Store fun facts data
let funFactsData = {};

// Helper: slugify a species/common name to an images filename
function slugify(name) {
    return name.toString().toLowerCase()
    // convert possessive "'s" to -s so "Salvin's Albatross" -> "salvin-s-albatross"
    .replace(/'s\b/g, '-s')
    .replace(/\s+/g, '-')          // spaces -> -
    .replace(/[^a-z0-9\-]/g, '')   // remove punctuation except -
    .replace(/-+/g, '-')           // collapse multiple -
    .replace(/^-+|-+$/g, '');      // trim leading/trailing -
}

// Create legend
function createLegend() {
    // Try new ID first, fall back to old ID for compatibility
    const legend = d3.select('#species-legend').empty() ? d3.select('#legend') : d3.select('#species-legend');
    Object.keys(statusColors).forEach(status => {
        const item = legend.append('div').attr('class', 'legend-item');
        item.append('div')
            .attr('class', 'legend-circle')
            .style('border-color', statusColors[status]);
        item.append('span').text(statusLabels[status]);
    });
}

// (Intro visualization moved to intro.html/intro.js)

// Create visualization
function createVisualization(data) {
    // Try new ID first, fall back to old ID for compatibility
    const container = document.getElementById('species-visualization') || document.getElementById('visualization');
    if (!container) return;
    const width = container.clientWidth;
    const height = 1000;

    // Clear any existing SVG
    d3.select(container).selectAll('svg').remove();

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // <defs> for clipPaths
    const defs = svg.append('defs');

    // Grid layout: 6 columns, 4 rows with padding
    const cols = 6;
    const rows = 4;
    const paddingx = 150; // Horizontal padding
    const paddingy = 20; // Vertical padding
    const gridWidth = width - (paddingx * 2);
    const gridHeight = height - (paddingy * 2);
    const cellWidth = gridWidth / cols;
    const cellHeight = gridHeight / rows;

    // Calculate positions in grid
    data.forEach((d, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        d.x = paddingx + col * cellWidth + cellWidth / 2;
        d.y = paddingy + row * cellHeight + cellHeight / 2;
    });

    // Create bird groups
    const birdGroups = svg.selectAll('.bird-group')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'bird-group')
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
            event.stopPropagation();
            const commonName = d['Common name'] || 'Unknown';
            // Trigger panel open via custom event
            window.dispatchEvent(new CustomEvent('openSpeciesPanel', { detail: { speciesData: d } }));
        })
        .on('mouseover', function(event, d) {
            // Highlight the bird on hover
            d3.select(this).select('.status-ring')
                .style('stroke-width', 15);
        })
        .on('mouseout', function() {
            d3.select(this).select('.status-ring')
                .style('stroke-width', 10);
        });

    // Add status ring
    birdGroups.append('circle')
        .attr('class', 'status-ring')
        .attr('r', 60)
        .style('stroke', d => statusColors[d['RL Category']])
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
            event.stopPropagation();
            window.dispatchEvent(new CustomEvent('openSpeciesPanel', { detail: { speciesData: d } }));
        });

    // Add bird silhouette (fallback) and an image (preferred if available)
    // Draw silhouette first so the image overlays it when present
    birdGroups.append('path')
        .attr('class', 'bird-icon')
        .attr('d', 'M-8,-2 Q-8,-6 -4,-8 L0,-10 L4,-8 Q8,-6 8,-2 L6,0 Q8,2 6,6 L2,4 L0,6 L-2,4 L-6,6 Q-8,2 -6,0 Z')
        .attr('transform', 'scale(3)');

    // Append an <image> element for each bird only after verifying the file exists.
    // Try multiple filename variants and .jpg then .png. If none exist, keep the silhouette.
    function checkImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = () => reject(url);
            img.src = url;
        });
    }

    birdGroups.each(function(d, i) {
        const group = d3.select(this);
        const name = (d['Common name'] || '').toString();
        const base = slugify(name);

        // Build variants to try: hyphen (base), underscore, concatenated
        const variants = [base, base.replace(/-/g, '_'), base.replace(/-/g, '')];
        const tried = [];

        // Helper to try next variant/extension
        (async function tryVariants() {
            // prepare a pattern id for this bird (used to fill a circle)
            const patternId = `pattern-${i}`;
            for (const v of variants) {
                for (const ext of ['jpg', 'jpeg', 'png']) {
                    const url = `images/${v}.${ext}`;
                    tried.push(url);
                    try {
                        await checkImage(url);
                        // success: create a pattern (userSpaceOnUse) and fill a circle with it
                        defs.append('pattern')
                            .attr('id', patternId)
                            .attr('patternUnits', 'userSpaceOnUse')
                            .attr('width', 120)
                            .attr('height', 120)
                            .attr('x', d.x - 60)
                            .attr('y', d.y - 60)
                            .append('image')
                            .attr('href', url)
                            .attr('x', 0)
                            .attr('y', 0)
                            .attr('width', 120)
                            .attr('height', 120)
                            .attr('preserveAspectRatio', 'xMidYMid slice');

                        // append a circle in the group filled by the pattern so it appears circular
                        group.append('circle')
                            .attr('class', 'bird-img-circle')
                            .attr('r', 60)
                            .attr('fill', `url(#${patternId})`)
                            .style('cursor', 'pointer')
                            .on('click', function(event) {
                                event.stopPropagation();
                                window.dispatchEvent(new CustomEvent('openSpeciesPanel', { detail: { speciesData: d } }));
                            });

                        // ensure the status ring is on top of the image circle
                        const ring = group.select('.status-ring');
                        if (!ring.empty()) ring.raise();

                        console.log(`Loaded image for '${name}': ${url}`);
                        return;
                    } catch (e) {
                        // failed, continue
                    }
                }
            }
            // if we reach here, none of the variants loaded
            console.warn(`No image found for '${name}'. Tried: ${tried.join(', ')}`);
        })();
    });

    // Add labels with common name, wrapping long names into two lines using tspans
    birdGroups.append('text')
        .attr('class', 'bird-label')
        .attr('y', 90)
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
            event.stopPropagation();
            const commonName = d['Common name'] || 'Unknown';
            // Trigger panel open via custom event
            window.dispatchEvent(new CustomEvent('openSpeciesPanel', { detail: { speciesData: d } }));
        })
        .each(function(d) {
            const name = (d['Common name'] || '').toString();
            const maxChars = 18; // threshold to decide when to split into 2 lines
            let lines = [];

            if (name.length <= maxChars) {
                lines = [name];
            } else {
                // try to split at a space near the midpoint for nicer breaks
                const mid = Math.floor(name.length / 2);
                let breakIndex = name.lastIndexOf(' ', mid);
                if (breakIndex === -1) breakIndex = name.indexOf(' ', mid);
                if (breakIndex === -1) breakIndex = mid; // fallback: hard split
                lines = [name.slice(0, breakIndex).trim(), name.slice(breakIndex).trim()];
            }

            const text = d3.select(this);
            // Slightly reduce font size for wrapped (two-line) labels to avoid overlap
            if (lines.length > 1) text.style('font-size', '16px');

            lines.forEach((line, i) => {
                text.append('tspan')
                    .attr('x', 0)
                    .attr('dy', i === 0 ? '0em' : '1.15em')
                    .text(line);
            });
        });
}

// Load and parse CSV
function loadData() {
    // First load fun facts
    Papa.parse('albatross_fun_facts.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            // Store fun facts by species name
            results.data.forEach(row => {
                const name = row['Name'];
                const fact = row['Fun fact'];
                if (name && fact) {
                    funFactsData[name] = fact;
                }
            });
            
            // Then load main dataset
            Papa.parse('speciesinfo.csv', {
                download: true,
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: function(results) {
                    createLegend();
                    createVisualization(results.data);
                },
                error: function(error) {
                    console.error('Error loading main CSV:', error);
                    document.querySelector('.container').innerHTML += 
                        '<p style="color: red; text-align: center;">Error loading data. Please ensure "speciesinfo.csv" is in the same folder as this HTML file.</p>';
                }
            });
        },
        error: function(error) {
            console.error('Error loading fun facts CSV:', error);
            // Continue loading main dataset even if fun facts fail
            Papa.parse('speciesinfo.csv', {
                download: true,
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: function(results) {
                    createLegend();
                    createVisualization(results.data);
                },
                error: function(error) {
                    console.error('Error loading main CSV:', error);
                    document.querySelector('.container').innerHTML += 
                        '<p style="color: red; text-align: center;">Error loading data. Please ensure "speciesinfo.csv" is in the same folder as this HTML file.</p>';
                }
            });
        }
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', loadData);
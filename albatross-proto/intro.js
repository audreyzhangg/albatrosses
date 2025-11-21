// Standalone intro visualization script
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('intro-visual');
    if (!container) return;
    const maxDisplayWidth = Math.min(container.clientWidth || 900, 1000);
    const imgUrl = 'images/albatrossintro.jpeg';

    // tooltip divs - create separate ones for each region
    const tooltips = {
        wings: d3.select('body').append('div').attr('class', 'tooltip intro-tooltip-wings').style('display', 'none'),
        stomach: d3.select('body').append('div').attr('class', 'tooltip intro-tooltip-stomach').style('display', 'none'),
        beak: d3.select('body').append('div').attr('class', 'tooltip intro-tooltip-beak').style('display', 'none')
    };

    const preload = new Image();
    preload.onload = function() {
        const W = preload.naturalWidth;
        const H = preload.naturalHeight;
        const aspect = H / W;
        const svgWidth = Math.min(maxDisplayWidth, W);
        const svgHeight = svgWidth * aspect;

        const svg = d3.select('#intro-visual')
            .append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .attr('viewBox', `0 0 ${W} ${H}`)
            .style('max-width', '900px');

        svg.append('image')
            .attr('href', imgUrl)
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', W)
            .attr('height', H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Hide tooltip when clicking on SVG background
        svg.on('click', function(event) {
            if (event.target === this || event.target.tagName === 'svg') {
                hideTooltip();
            }
        });

        // default hotspot polygons (normalized coords)
        const defaultPolys = {
            left: [ [0.02,0.45],[0.18,0.22],[0.40,0.14],[0.52,0.18],[0.38,0.48] ],
            right: [ [0.98,0.45],[0.82,0.22],[0.60,0.14],[0.48,0.18],[0.62,0.48] ],
            stomach: [ [0.42,0.55],[0.5,0.55],[0.58,0.60],[0.5,0.7],[0.38,0.65] ],
            beak: [ [0.48,0.22],[0.52,0.22],[0.5,0.28] ]
        };

        // helper: convert normalized to absolute
        const denormalize = (normPts) => normPts.map(p => [p[0]*W, p[1]*H]);
        const normalize = (absPts) => absPts.map(p => [p[0]/W, p[1]/H]);

    // load polygons: prefer repository `hotspots.json` if available, else localStorage, else defaults
    let polygons = { left: [], right: [], stomach: [], beak: [] };

        function initWithNormalized(normalized) {
            try {
                // accept files that include any subset; fill missing with defaults
                const left = normalized.left || defaultPolys.left;
                const right = normalized.right || defaultPolys.right;
                const stomach = normalized.stomach || defaultPolys.stomach;
                const beak = normalized.beak || defaultPolys.beak;
                polygons.left = denormalize(left);
                polygons.right = denormalize(right);
                polygons.stomach = denormalize(stomach);
                polygons.beak = denormalize(beak);
                drawPolys();
                return true;
            } catch (e) {
                // fall through
            }
            return false;
        }

        // Attempt to fetch `hotspots.json` in the project root (served by local server).
        fetch('hotspots.json')
            .then(resp => {
                if (!resp.ok) throw new Error('no file');
                return resp.json();
            })
            .then(json => {
                if (!initWithNormalized(json)) {
                        // fallback to localStorage or defaults
                        const saved = localStorage.getItem('intro_hotspots');
                        if (saved) {
                            try { initWithNormalized(JSON.parse(saved)); return; } catch(e){}
                        }
                        polygons.left = denormalize(defaultPolys.left);
                        polygons.right = denormalize(defaultPolys.right);
                        polygons.stomach = denormalize(defaultPolys.stomach);
                        polygons.beak = denormalize(defaultPolys.beak);
                        drawPolys();
                    }
            })
            .catch(() => {
                // fetch failed (file not present or server not running) -> try localStorage
                const saved = localStorage.getItem('intro_hotspots');
                if (saved) {
                    try { initWithNormalized(JSON.parse(saved)); return; } catch(e){}
                }
                polygons.left = denormalize(defaultPolys.left);
                polygons.right = denormalize(defaultPolys.right);
                polygons.stomach = denormalize(defaultPolys.stomach);
                polygons.beak = denormalize(defaultPolys.beak);
                drawPolys();
            });

    // state
    let editMode = false; // kept for backward-compat but editing UI removed

    // UI elements are intentionally removed (no edit/save functionality)

        // elements groups
    const polyLayer = svg.append('g').attr('class','poly-layer');

        function ptsToString(pts) { return pts.map(p => p.join(',')).join(' '); }

        function clearDraw() {
            polyLayer.selectAll('*').remove();
        }

        function drawPolys() {
            clearDraw();

            ['left','right','stomach','beak'].forEach(name => {
                const pts = polygons[name] || [];
                if (!pts || pts.length < 1) return; // skip empty polygons
                const poly = polyLayer.append('polygon')
                    .attr('points', ptsToString(pts))
                    .attr('class', name === 'stomach' ? 'stomach-hotspot' : (name === 'beak' ? 'beak-hotspot' : 'wing-hotspot'))
                    .style('pointer-events', 'visiblePainted');

                // tooltip content per region (now with images and standardized format)
                const wingsInfo = {
                    title: 'Wings',
                    text: 'Albatrosses are famous for their long wings, which lock in place to keep them horizontal for hours at a time. They use a special technique known as dynamic soaring which allows them to fly even without flapping their wings!',
                    image: 'images/wings.jpg',
                    position: 'top-right'
                };
                const stomachInfo = {
                    title: 'Stomach',
                    text: 'Albatrosses produce a foul-smelling waxy stomach oil. This stomach oil has two main purposes: feeding their young and spraying at predators when threatened.',
                    image: 'images/stomach.jpg',
                    position: 'bottom-right'
                };
                const beakInfo = {
                    title: 'Beak',
                    text: 'Albatrosses are in the order Procellariformes, aka \'tubenoses\'. They get this name for the tubes around their nostrils that release salty excrement from their salt glands. These salt glands filters out salt from the water they drink, which allows them to drink seawater without getting dehydrated.',
                    image: 'images/beak.jpg',
                    position: 'top-left'
                };

                let info = null;
                let regionKey = null;
                if (name === 'left' || name === 'right') {
                    info = wingsInfo;
                    regionKey = 'wings';
                }
                else if (name === 'stomach') {
                    info = stomachInfo;
                    regionKey = 'stomach';
                }
                else if (name === 'beak') {
                    info = beakInfo;
                    regionKey = 'beak';
                }

                poly.on('click', function(e) {
                    e.stopPropagation();
                    showTooltip(info, regionKey);
                });
            });
        }

        function showTooltip(content, regionKey) {
            const tooltip = tooltips[regionKey];
            if (!tooltip) return;
            
            // Build HTML from content object with close button
            let html = '<div class="intro-popup-content">';
            html += `<button class="popup-close-btn" onclick="document.querySelector('.intro-tooltip-${regionKey}').style.display='none'" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; font-size: 24px; cursor: pointer; color: #666; line-height: 1; padding: 5px 10px;">&times;</button>`;
            html += `<h3>${content.title}</h3>`;
            
            // Add image if present
            if (content.image) {
                html += `<img src="${content.image}" alt="${content.title}" style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 4px; margin-bottom: 15px;">`;
            }
            
            html += `<p>${content.text}</p>`;
            html += '</div>';
            
            // Position based on content.position
            tooltip
                .style('display', 'block')
                .html(html)
                .style('position', 'fixed')
                .style('width', '400px')
                .style('max-width', '90vw')
                .style('background', 'white')
                .style('color', 'black')
                .style('padding', '30px')
                .style('border-radius', '8px')
                .style('box-shadow', '0 4px 20px rgba(0,0,0,0.3)')
                .style('z-index', '10000')
                .style('pointer-events', 'auto');
            
            // Clear previous positioning
            tooltip.style('left', null).style('right', null).style('top', null).style('bottom', null).style('transform', null);
            
            // Set position based on content
            if (content.position === 'top-right') {
                tooltip.style('right', '20px').style('top', '20px');
            } else if (content.position === 'top-left') {
                tooltip.style('left', '20px').style('top', '20px');
            } else if (content.position === 'bottom-right') {
                tooltip.style('right', '20px').style('bottom', '20px');
            } else if (content.position === 'bottom-left') {
                tooltip.style('left', '20px').style('bottom', '20px');
            } else {
                // Default to top-right
                tooltip.style('right', '20px').style('top', '20px');
            }
        }
        function hideTooltip(regionKey) {
            if (regionKey && tooltips[regionKey]) {
                tooltips[regionKey].style('display', 'none');
            } else {
                // Hide all tooltips
                Object.values(tooltips).forEach(t => t.style('display', 'none'));
            }
        }

        // initial draw
        drawPolys();

        // Add scroll listener to hide tooltips when scrolling
        window.addEventListener('scroll', function() {
            hideTooltip();
        });

        // Add listener for navigation dot clicks to hide tooltips
        document.addEventListener('click', function(event) {
            if (event.target.classList.contains('nav-dot')) {
                hideTooltip();
            }
        });

        // Hide tooltips when clicking outside the intro section
        document.addEventListener('click', function(event) {
            const introSection = document.getElementById('intro-section');
            if (introSection && !introSection.contains(event.target)) {
                hideTooltip();
            }
        });

        // Editing and save/load UI removed per request; hotspots are read-only and loaded from hotspots.json/localStorage/defaults
    };
    preload.onerror = function() { console.warn('Could not load intro image:', imgUrl); };
    preload.src = imgUrl;
});

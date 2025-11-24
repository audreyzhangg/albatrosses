// Threats matrix visualization
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('matrix-viz');
    if (!container) return;

    // tooltip div
    let tooltip = d3.select('body').select('.tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body').append('div').attr('class', 'tooltip');
    }

    function showTooltip(event, text) {
        tooltip.style('display', 'block').html(text);
        const mx = event.pageX + 12;
        const my = event.pageY + 12;
        tooltip.style('left', mx + 'px').style('top', my + 'px');
    }

    function hideTooltip() {
        tooltip.style('display', 'none');
    }

    // Color mapping for conservation status (matching visualization.js)
    const statusColors = {
        'CR': '#DD403A',  // Critically Endangered - Red
        'EN': '#FF7B3D',  // Endangered - Orange
        'VU': '#FFC34B',  // Vulnerable - Yellow
        'NT': '#5AB361',  // Near Threatened - Green
        'LC': '#2F6690'   // Least Concern - Blue
    };

    // Mapping of species to conservation status
    const speciesStatus = {
        'Northern Royal Albatross': 'EN',
        'Southern Royal Albatross': 'VU',
        'Wandering Albatross': 'VU',
        'Antipodean Albatross': 'EN',
        'Amsterdam Albatross': 'EN',
        'Tristan Albatross': 'CR',
        'Sooty Albatross': 'EN',
        'Light-mantled Albatross': 'NT',
        'Waved Albatross': 'CR',
        'Black-footed Albatross': 'NT',
        'Laysan Albatross': 'NT',
        'Short-tailed Albatross': 'VU',
        'Atlantic Yellow-nosed Albatross': 'EN',
        'Indian Yellow-nosed Albatross': 'EN',
        'Grey-headed Albatross': 'EN',
        'Black-browed Albatross': 'LC',
        'Campbell Albatross': 'VU',
        'Buller\'s Albatross': 'NT',
        'Shy Albatross': 'NT',
        'White-capped Albatross': 'NT',
        'Chatham Albatross': 'VU',
        'Salvin\'s Albatross': 'VU'
    };

    // Radius mapping for impact levels
    const impactRadius = {
        'High': 12,
        'Medium': 9,
        'Low': 6,
        '': 4  // Unknown/missing impact
    };

    // Load and parse CSV
    Papa.parse('cleanedthreats.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            createMatrix(results.data);
        },
        error: function(error) {
            console.error('Error loading CSV:', error);
            container.innerHTML = '<p style="color: red; text-align: center;">Error loading data. Please ensure "cleanedthreats.csv" is in the same folder.</p>';
        }
    });

    function createMatrix(data) {
        // Extract unique species and threats
        const speciesSet = new Set();
        const threatSet = new Set();
        
        data.forEach(row => {
            if (row.Species) speciesSet.add(row.Species);
            if (row.Threat) threatSet.add(row.Threat);
        });

        const species = Array.from(speciesSet).sort();
        const threats = Array.from(threatSet).sort();

        // Create a mapping: species -> threat -> {impact, details}
        const matrix = {};
        species.forEach(sp => {
            matrix[sp] = {};
        });

        data.forEach(row => {
            if (row.Species && row.Threat) {
                matrix[row.Species][row.Threat] = {
                    impact: row.Impact || '',
                    details: row.Details || ''
                };
            }
        });

        // Layout parameters
        const cellWidth = 60;
        const cellHeight = 30;
        const leftMargin = 220;
        const topMargin = 180;

        const width = leftMargin + threats.length * cellWidth + 50;
        const height = topMargin + species.length * cellHeight + 50;

        const svg = d3.select('#matrix-viz')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        // Draw vertical grid lines
        threats.forEach((threat, i) => {
            svg.append('line')
                .attr('class', 'grid-line')
                .attr('x1', leftMargin + i * cellWidth + cellWidth / 2)
                .attr('y1', topMargin)
                .attr('x2', leftMargin + i * cellWidth + cellWidth / 2)
                .attr('y2', topMargin + species.length * cellHeight);
        });

        // Draw horizontal grid lines
        species.forEach((sp, i) => {
            svg.append('line')
                .attr('class', 'grid-line')
                .attr('x1', leftMargin)
                .attr('y1', topMargin + i * cellHeight + cellHeight / 2)
                .attr('x2', leftMargin + threats.length * cellWidth)
                .attr('y2', topMargin + i * cellHeight + cellHeight / 2);
        });

        // Add species labels (rows) with click handlers and color coding by conservation status
        const speciesLabels = [];
        species.forEach((sp, i) => {
            const status = speciesStatus[sp] || 'LC'; // default to Least Concern if not found
            const color = statusColors[status] || '#000000';
            
            const label = svg.append('text')
                .attr('class', 'species-label')
                .attr('data-species', sp)
                .attr('x', leftMargin - 10)
                .attr('y', topMargin + i * cellHeight + cellHeight / 2 + 4)
                .text(sp)
                .style('cursor', 'pointer')
                .style('fill', color)
                .style('font-weight', 'bold')
                .on('click', function(event) {
                    event.stopPropagation();
                    
                    // Gray out all other species
                    speciesLabels.forEach(lbl => {
                        const lblSpecies = lbl.attr('data-species');
                        if (lblSpecies !== sp) {
                            lbl.transition().duration(300).style('opacity', 0.2);
                        } else {
                            lbl.transition().duration(300).style('opacity', 1);
                        }
                    });
                    
                    // Gray out circles
                    svg.selectAll('.matrix-circle').each(function() {
                        const circle = d3.select(this);
                        const circleSpecies = circle.attr('data-species');
                        if (circleSpecies !== sp) {
                            circle.transition().duration(300).style('opacity', 0.1);
                        } else {
                            circle.transition().duration(300).style('opacity', 0.8);
                        }
                    });
                    
                    // Open panel with species name
                    if (typeof window.openSpeciesPanel === 'function') {
                        window.openSpeciesPanel(sp);
                    } else {
                        window.dispatchEvent(new CustomEvent('openSpeciesPanelByName', { detail: { speciesName: sp } }));
                    }
                });
            
            speciesLabels.push(label);
        });

        // Add threat labels (columns) - rotated
        threats.forEach((threat, i) => {
            svg.append('text')
                .attr('class', 'threat-label')
                .attr('x', leftMargin + i * cellWidth + cellWidth / 2)
                .attr('y', topMargin - 10)
                .attr('transform', `rotate(-45, ${leftMargin + i * cellWidth + cellWidth / 2}, ${topMargin - 10})`)
                .text(threat);
        });

        // Draw circles for species-threat intersections
        species.forEach((sp, rowIdx) => {
            const speciesColor = statusColors[speciesStatus[sp]] || statusColors['LC'];
            
            threats.forEach((threat, colIdx) => {
                const cellData = matrix[sp][threat];
                if (cellData) {
                    const cx = leftMargin + colIdx * cellWidth + cellWidth / 2;
                    const cy = topMargin + rowIdx * cellHeight + cellHeight / 2;
                    const radius = impactRadius[cellData.impact] || impactRadius[''];

                    svg.append('circle')
                        .attr('class', 'matrix-circle')
                        .attr('data-species', sp)
                        .attr('cx', cx)
                        .attr('cy', cy)
                        .attr('r', radius)
                        .attr('fill', speciesColor)
                        .attr('opacity', 0.8)
                        .style('cursor', 'pointer')
                        .on('click', function(event) {
                            event.stopPropagation();
                            
                            // Gray out all other species
                            speciesLabels.forEach(lbl => {
                                const lblSpecies = lbl.attr('data-species');
                                if (lblSpecies !== sp) {
                                    lbl.transition().duration(300).style('opacity', 0.2);
                                } else {
                                    lbl.transition().duration(300).style('opacity', 1);
                                }
                            });
                            
                            // Gray out circles
                            svg.selectAll('.matrix-circle').each(function() {
                                const circle = d3.select(this);
                                const circleSpecies = circle.attr('data-species');
                                if (circleSpecies !== sp) {
                                    circle.transition().duration(300).style('opacity', 0.1);
                                } else {
                                    circle.transition().duration(300).style('opacity', 0.8);
                                }
                            });
                            
                            // Open panel with species name
                            if (typeof window.openSpeciesPanel === 'function') {
                                window.openSpeciesPanel(sp);
                            } else {
                                window.dispatchEvent(new CustomEvent('openSpeciesPanelByName', { detail: { speciesName: sp } }));
                            }
                        })
                        .on('mouseover', function(event) {
                            d3.select(this)
                                .transition()
                                .duration(200)
                                .attr('r', radius * 1.5)
                                .attr('opacity', 1);
                            
                            let tooltipText = `<strong>${sp}</strong><br/>`;
                            tooltipText += `<strong>Threat:</strong> ${threat}<br/>`;
                            tooltipText += `<strong>Impact:</strong> ${cellData.impact || 'Unknown'}<br/>`;
                            if (cellData.details) {
                                tooltipText += `<strong>Details:</strong> ${cellData.details}`;
                            }
                            showTooltip(event, tooltipText);
                        })
                        .on('mousemove', function(event) {
                            let tooltipText = `<strong>${sp}</strong><br/>`;
                            tooltipText += `<strong>Threat:</strong> ${threat}<br/>`;
                            tooltipText += `<strong>Impact:</strong> ${cellData.impact || 'Unknown'}<br/>`;
                            if (cellData.details) {
                                tooltipText += `<strong>Details:</strong> ${cellData.details}`;
                            }
                            showTooltip(event, tooltipText);
                        })
                        .on('mouseout', function() {
                            d3.select(this)
                                .transition()
                                .duration(200)
                                .attr('r', radius)
                                .attr('opacity', 0.8);
                            hideTooltip();
                        });
                }
            });
        });
        
        // Listen for panel close event to reset all elements
        window.addEventListener('speciesPanelClosed', function() {
            speciesLabels.forEach(lbl => {
                lbl.transition().duration(300).style('opacity', 1);
            });
            svg.selectAll('.matrix-circle')
                .transition()
                .duration(300)
                .style('opacity', 0.8);
        });
        
        // Reset on clicking SVG background
        svg.on('click', function(event) {
            if (event.target.tagName === 'svg' || event.target === this) {
                speciesLabels.forEach(lbl => {
                    lbl.transition().duration(300).style('opacity', 1);
                });
                svg.selectAll('.matrix-circle')
                    .transition()
                    .duration(300)
                    .style('opacity', 0.8);
            }
        });
    }
});

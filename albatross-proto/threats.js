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

        // Define conservation status priority (lower number = higher priority)
        const statusPriority = {
            'CR': 1,  // Critically Endangered
            'EN': 2,  // Endangered
            'VU': 3,  // Vulnerable
            'NT': 4,  // Near Threatened
            'LC': 5   // Least Concern
        };

        // Sort species by conservation status priority, then alphabetically
        const species = Array.from(speciesSet).sort((a, b) => {
            const statusA = speciesStatus[a] || 'LC';
            const statusB = speciesStatus[b] || 'LC';
            const priorityA = statusPriority[statusA] || 999;
            const priorityB = statusPriority[statusB] || 999;
            
            const priorityDiff = priorityA - priorityB;
            if (priorityDiff !== 0) return priorityDiff;
            return a.localeCompare(b);
        });
        
        // Count occurrences of each threat
        const threatCounts = {};
        data.forEach(row => {
            if (row.Threat) {
                threatCounts[row.Threat] = (threatCounts[row.Threat] || 0) + 1;
            }
        });
        
        // Sort threats by count (descending), then alphabetically
        const threats = Array.from(threatSet).sort((a, b) => {
            const countDiff = (threatCounts[b] || 0) - (threatCounts[a] || 0);
            if (countDiff !== 0) return countDiff;
            return a.localeCompare(b);
        });

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
            .attr('height', height)
            .style('transition', 'transform 0.3s ease');

        // Listen for panel open/close to shift diagram
        window.addEventListener('openSpeciesPanelByName', function() {
            svg.style('transform', 'translateX(-225px)'); // Shift left by half the panel width
        });
        
        window.addEventListener('speciesPanelClosed', function() {
            svg.style('transform', 'translateX(0)'); // Reset position
        });

        // Draw vertical grid lines
        threats.forEach((threat, i) => {
            svg.append('line')
                .attr('class', 'grid-line vertical')
                .attr('x1', leftMargin + i * cellWidth + cellWidth / 2)
                .attr('y1', topMargin)
                .attr('x2', leftMargin + i * cellWidth + cellWidth / 2)
                .attr('y2', topMargin + species.length * cellHeight)
                .attr('stroke', '#e5e7eb')
                .attr('stroke-width', 1);
        });

        // Draw horizontal grid lines
        species.forEach((sp, i) => {
            svg.append('line')
                .attr('class', 'grid-line')
                .attr('x1', leftMargin)
                .attr('y1', topMargin + i * cellHeight + cellHeight / 2)
                .attr('x2', leftMargin + threats.length * cellWidth)
                .attr('y2', topMargin + i * cellHeight + cellHeight / 2)
                .attr('stroke', '#e5e7eb')
                .attr('stroke-width', 1);
        });

        // Add species labels (rows) with click handlers and color coding by conservation status
        const speciesLabels = [];
        species.forEach((sp, i) => {
            const status = speciesStatus[sp] || 'LC'; // default to Least Concern if not found
            
            const label = svg.append('text')
                .attr('class', 'species-label')
                .attr('data-species', sp)
                .attr('x', leftMargin - 10)
                .attr('y', topMargin + i * cellHeight + cellHeight / 2 + 4)
                .text(sp)
                .style('cursor', 'pointer')
                .style('fill', '#2c3e50')
                .style('font-weight', 'normal')
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
                    
                    // Color/gray out circles
                    svg.selectAll('.matrix-circle').each(function() {
                        const circle = d3.select(this);
                        const circleSpecies = circle.attr('data-species');
                        if (circleSpecies !== sp) {
                            circle
                                .attr('fill', '#d3d3d3')
                                .transition()
                                .duration(300)
                                .style('opacity', 0.1);
                        } else {
                            // Color by conservation status for this species
                            const status = speciesStatus[sp] || 'LC';
                            const speciesColor = statusColors[status] || statusColors['LC'];
                            circle
                                .attr('fill', speciesColor)
                                .transition()
                                .duration(300)
                                .style('opacity', 0.8);
                        }
                    });
                    
                    // Open panel with species name
                    if (typeof window.openSpeciesPanel === 'function') {
                        window.openSpeciesPanel(sp);
                    } else {
                        window.dispatchEvent(new CustomEvent('openSpeciesPanelByName', { detail: { speciesName: sp } }));
                    }
                    
                    // Shift diagram left when panel opens
                    svg.style('transform', 'translateX(-225px)');
                });
            
            speciesLabels.push(label);
        });

        // Add threat labels (columns) - rotated
        const threatLabels = [];
        const selectedThreats = new Set();
        const selectionOrder = []; // Track order of selection
        let threatOrder = [...threats]; // Keep track of current order
        
        function updateThreatPositions() {
            // Move selected threats to the front in their selection order
            const selected = selectionOrder.filter(t => selectedThreats.has(t));
            const unselected = threats.filter(t => !selectedThreats.has(t));
            threatOrder = [...selected, ...unselected];
            
            // Update label positions with animation
            threatLabels.forEach(labelObj => {
                const threat = labelObj.label.attr('data-threat');
                const newIndex = threatOrder.indexOf(threat);
                const newX = leftMargin + newIndex * cellWidth + cellWidth / 2;
                
                labelObj.label
                    .transition()
                    .duration(500)
                    .attr('x', newX)
                    .attr('transform', `rotate(-45, ${newX}, ${topMargin - 10})`);
            });
            
            // Update circle positions with animation
            svg.selectAll('.matrix-circle').each(function() {
                const circle = d3.select(this);
                const threat = circle.attr('data-threat');
                const newIndex = threatOrder.indexOf(threat);
                const newCx = leftMargin + newIndex * cellWidth + cellWidth / 2;
                
                circle.transition().duration(500).attr('cx', newCx);
            });
            
            // Update grid line positions
            svg.selectAll('.grid-line.vertical').each(function(d, i) {
                const line = d3.select(this);
                const newX = leftMargin + i * cellWidth + cellWidth / 2;
                line.transition().duration(500)
                    .attr('x1', newX)
                    .attr('x2', newX);
            });
        }
        
        threats.forEach((threat, i) => {
            const label = svg.append('text')
                .attr('class', 'threat-label')
                .attr('data-threat', threat)
                .attr('x', leftMargin + i * cellWidth + cellWidth / 2)
                .attr('y', topMargin - 10)
                .attr('transform', `rotate(-45, ${leftMargin + i * cellWidth + cellWidth / 2}, ${topMargin - 10})`)
                .text(threat)
                .style('cursor', 'pointer')
                .on('click', function(event) {
                    event.stopPropagation();
                    
                    // Toggle: if clicking a selected threat, deselect it
                    if (selectedThreats.has(threat)) {
                        selectedThreats.delete(threat);
                        // Remove from selection order
                        const index = selectionOrder.indexOf(threat);
                        if (index > -1) {
                            selectionOrder.splice(index, 1);
                        }
                        
                        // If no threats selected, reset all
                        if (selectedThreats.size === 0) {
                            threatLabels.forEach(lbl => {
                                lbl.label.transition().duration(300).style('opacity', 1);
                            });
                            svg.selectAll('.matrix-circle')
                                .attr('fill', '#d3d3d3')
                                .transition()
                                .duration(300)
                                .style('opacity', 0.8);
                        } else {
                            // Update opacity for this threat label
                            d3.select(this).transition().duration(300).style('opacity', 0.2);
                            
                            // Update all circles to reflect remaining selections
                            svg.selectAll('.matrix-circle').each(function() {
                                const circle = d3.select(this);
                                const circleThreat = circle.attr('data-threat');
                                const circleSpecies = circle.attr('data-species');
                                const status = speciesStatus[circleSpecies] || 'LC';
                                const speciesColor = statusColors[status] || statusColors['LC'];
                                
                                if (selectedThreats.has(circleThreat)) {
                                    // Still selected threats: keep colored
                                    circle
                                        .attr('fill', speciesColor)
                                        .style('opacity', 0.8);
                                } else {
                                    // Deselected threats: gray and faded
                                    circle
                                        .attr('fill', '#d3d3d3')
                                        .style('opacity', 0.1);
                                }
                            });
                        }
                        
                        // Update positions after colors are set
                        updateThreatPositions();
                        
                    } else {
                        // Select this threat - ADD it first
                        selectedThreats.add(threat);
                        // Add to selection order
                        if (!selectionOrder.includes(threat)) {
                            selectionOrder.push(threat);
                        }
                        
                        // Keep selected threats at full opacity, gray out others
                        threatLabels.forEach(lbl => {
                            const lblThreat = lbl.label.attr('data-threat');
                            if (selectedThreats.has(lblThreat)) {
                                lbl.label.transition().duration(300).style('opacity', 1);
                            } else {
                                lbl.label.transition().duration(300).style('opacity', 0.2);
                            }
                        });
                        
                        // Update all circles based on current selection state
                        svg.selectAll('.matrix-circle').each(function() {
                            const circle = d3.select(this);
                            const circleThreat = circle.attr('data-threat');
                            const circleSpecies = circle.attr('data-species');
                            const status = speciesStatus[circleSpecies] || 'LC';
                            const speciesColor = statusColors[status] || statusColors['LC'];
                            
                            if (selectedThreats.has(circleThreat)) {
                                // Selected threats: color by conservation status
                                circle
                                    .attr('fill', speciesColor)
                                    .style('opacity', 0.8);
                            } else {
                                // Unselected threats: gray and faded
                                circle
                                    .attr('fill', '#d3d3d3')
                                    .style('opacity', 0.1);
                            }
                        });
                        
                        // Update positions after colors are set
                        updateThreatPositions();
                    }
                });
            
            threatLabels.push({ label, threat });
        });

        // Draw circles for species-threat intersections
        species.forEach((sp, rowIdx) => {
            threats.forEach((threat, colIdx) => {
                const cellData = matrix[sp][threat];
                if (cellData) {
                    const cx = leftMargin + colIdx * cellWidth + cellWidth / 2;
                    const cy = topMargin + rowIdx * cellHeight + cellHeight / 2;
                    const radius = impactRadius[cellData.impact] || impactRadius[''];

                    svg.append('circle')
                        .attr('class', 'matrix-circle')
                        .attr('data-species', sp)
                        .attr('data-threat', threat)
                        .attr('cx', cx)
                        .attr('cy', cy)
                        .attr('r', radius)
                        .attr('fill', '#d3d3d3') // Start with light gray
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
                            
                            // Color/gray out circles
                            svg.selectAll('.matrix-circle').each(function() {
                                const circle = d3.select(this);
                                const circleSpecies = circle.attr('data-species');
                                if (circleSpecies !== sp) {
                                    circle
                                        .attr('fill', '#d3d3d3')
                                        .transition()
                                        .duration(300)
                                        .style('opacity', 0.1);
                                } else {
                                    // Color by conservation status for this species
                                    const status = speciesStatus[sp] || 'LC';
                                    const speciesColor = statusColors[status] || statusColors['LC'];
                                    circle
                                        .attr('fill', speciesColor)
                                        .transition()
                                        .duration(300)
                                        .style('opacity', 0.8);
                                }
                            });
                            
                            // Open panel with species name
                            if (typeof window.openSpeciesPanel === 'function') {
                                window.openSpeciesPanel(sp);
                            } else {
                                window.dispatchEvent(new CustomEvent('openSpeciesPanelByName', { detail: { speciesName: sp } }));
                            }
                            
                            // Shift diagram left when panel opens
                            svg.style('transform', 'translateX(-225px)');
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
            // Reset opacity
            speciesLabels.forEach(lbl => {
                lbl.transition().duration(300).style('opacity', 1);
            });
            svg.selectAll('.matrix-circle')
                .attr('fill', '#d3d3d3')
                .transition()
                .duration(300)
                .style('opacity', 0.8);
            
            // Reset diagram position
            svg.style('transform', 'translateX(0)');
        });
        
        // Reset on clicking SVG background
        svg.on('click', function(event) {
            if (event.target.tagName === 'svg' || event.target === this) {
                selectedThreats.clear();
                selectionOrder.length = 0; // Clear selection order
                threatOrder = [...threats]; // Reset to original order
                
                speciesLabels.forEach(lbl => {
                    lbl.transition().duration(300).style('opacity', 1);
                });
                threatLabels.forEach(lbl => {
                    lbl.label.transition().duration(300).style('opacity', 1);
                });
                svg.selectAll('.matrix-circle')
                    .transition()
                    .duration(300)
                    .attr('fill', '#d3d3d3') // Reset to light gray
                    .style('opacity', 0.8);
                
                // Reset positions
                threatLabels.forEach(labelObj => {
                    const threat = labelObj.threat;
                    const originalIndex = threats.indexOf(threat);
                    const originalX = leftMargin + originalIndex * cellWidth + cellWidth / 2;
                    
                    labelObj.label
                        .transition()
                        .duration(500)
                        .attr('x', originalX)
                        .attr('transform', `rotate(-45, ${originalX}, ${topMargin - 10})`);
                });
                
                svg.selectAll('.matrix-circle').each(function() {
                    const circle = d3.select(this);
                    const threat = circle.attr('data-threat');
                    const originalIndex = threats.indexOf(threat);
                    const originalCx = leftMargin + originalIndex * cellWidth + cellWidth / 2;
                    
                    circle.transition().duration(500).attr('cx', originalCx);
                });
            }
        });
    }
});

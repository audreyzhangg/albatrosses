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

    // Color mapping for impact levels
    const impactColors = {
        'High': '#e74c3c',
        'Medium': '#f39c12',
        'Low': '#3498db',
        '': '#95a5a6'  // Unknown/missing impact
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
        const cellWidth = 40;
        const cellHeight = 25;
        const leftMargin = 200;
        const topMargin = 150;
        const circleRadius = 6;

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

        // Add species labels (rows) with click handlers
        species.forEach((sp, i) => {
            svg.append('text')
                .attr('class', 'species-label')
                .attr('x', leftMargin - 10)
                .attr('y', topMargin + i * cellHeight + cellHeight / 2 + 4)
                .text(sp)
                .style('cursor', 'pointer')
                .on('click', function(event) {
                    event.stopPropagation();
                    // Open panel with species name
                    if (typeof window.openSpeciesPanel === 'function') {
                        window.openSpeciesPanel(sp);
                    } else {
                        window.dispatchEvent(new CustomEvent('openSpeciesPanelByName', { detail: { speciesName: sp } }));
                    }
                });
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
            threats.forEach((threat, colIdx) => {
                const cellData = matrix[sp][threat];
                if (cellData) {
                    const cx = leftMargin + colIdx * cellWidth + cellWidth / 2;
                    const cy = topMargin + rowIdx * cellHeight + cellHeight / 2;
                    const color = impactColors[cellData.impact] || impactColors[''];

                    svg.append('circle')
                        .attr('class', 'matrix-circle')
                        .attr('cx', cx)
                        .attr('cy', cy)
                        .attr('r', circleRadius)
                        .attr('fill', color)
                        .attr('opacity', 0.8)
                        .on('mouseover', function(event) {
                            d3.select(this)
                                .transition()
                                .duration(200)
                                .attr('r', circleRadius * 1.5)
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
                                .attr('r', circleRadius)
                                .attr('opacity', 0.8);
                            hideTooltip();
                        });
                }
            });
        });
    }
});

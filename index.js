// Global variables
let cosmicEvents = [];
let xScale, yScale;
let svg, g, xAxisG, yAxisG, tooltip;
let currentZoom = 'year';

// Color mapping for event types
const colorMap = {
    cosmic: '#ff6b6b',
    geological: '#4ecdc4', 
    life: '#45b7d1',
    human: '#ffa726'
};

// Set up dimensions and margins
const margin = { top: 40, right: 60, bottom: 60, left: 60 };
const width = 1000 - margin.left - margin.right;
const height = 300 - margin.top - margin.bottom;

// Initialize the visualization
async function init() {
    try {
        // Load the cosmic events data
        const response = await fetch('data/cosmic-events.json');
        const data = await response.json();
        
        // Convert date strings to Date objects
        cosmicEvents = data.map(event => ({
            ...event,
            date: new Date(event.date)
        }));

        console.log('Loaded', cosmicEvents.length, 'cosmic events');
        setupVisualization();
        updateVisualization();
        
    } catch (error) {
        console.error('Error loading cosmic events data:', error);
        // Fallback message for users
        document.getElementById('timeline').innerHTML = 
            '<p style="text-align: center; color: #ff6b6b;">Error loading timeline data. Please check that all files are present.</p>';
    }
}

function setupVisualization() {
    // Create SVG
    svg = d3.select("#timeline")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    xScale = d3.scaleTime()
        .domain([new Date(2024, 0, 1), new Date(2024, 11, 31, 23, 59, 59)])
        .range([0, width]);

    yScale = d3.scaleBand()
        .domain(Object.keys(colorMap))
        .range([height - 60, 20])
        .padding(0.3);

    // Create axis groups (will be populated in updateVisualization)
    xAxisG = g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height - 40})`);

    yAxisG = g.append("g")
        .attr("class", "axis");

    // Initialize tooltip
    tooltip = d3.select("#tooltip");

    // Add zoom interaction
    const zoom = d3.zoom()
        .scaleExtent([0.1, 50])
        .on("zoom", function(event) {
            const transform = event.transform;
            const newScale = transform.rescaleX(d3.scaleTime()
                .domain([new Date(2024, 0, 1), new Date(2024, 11, 31, 23, 59, 59)])
                .range([0, width]));
            
            xScale = newScale;
            updateVisualization();
        });

    svg.call(zoom);
}

function updateVisualization() {
    // Filter events based on zoom level and current time domain
    const [startDate, endDate] = xScale.domain();
    const visibleEvents = cosmicEvents.filter(d => d.date >= startDate && d.date <= endDate);

    // Dynamic axis formatting based on zoom level
    const timeSpan = endDate - startDate;
    const days = timeSpan / (1000 * 60 * 60 * 24);
    
    let xAxis;
    if (days > 300) {
        // Full year view - show months
        xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%B"));
    } else if (days > 25) {
        // Month view - show days
        xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b %d"));
    } else if (days >= 1) {
        // Day view - show hours
        xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%H:%M"));
    } else {
        // Hour view - show minutes
        xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%H:%M:%S"));
    }
    
    const yAxis = d3.axisLeft(yScale);
    
    xAxisG.call(xAxis);
    yAxisG.call(yAxis);

    // Bind data to dots
    const dots = g.selectAll(".event-dot")
        .data(visibleEvents, d => d.name);

    // Remove old dots
    dots.exit()
        .transition()
        .duration(500)
        .attr("r", 0)
        .style("opacity", 0)
        .remove();

    // Add new dots
    const newDots = dots.enter()
        .append("circle")
        .attr("class", "event-dot")
        .attr("r", 0)
        .style("opacity", 0);

    // Update all dots
    dots.merge(newDots)
        .transition()
        .duration(750)
        .attr("cx", d => xScale(d.date))
        .attr("cy", d => yScale(d.type) + yScale.bandwidth() / 2)
        .attr("r", d => Math.max(3, d.importance / 2))
        .attr("fill", d => colorMap[d.type])
        .style("opacity", 1);

    // Add event handlers to all dots
    g.selectAll(".event-dot")
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

    updateStats(visibleEvents);
}

function handleMouseOver(event, d) {
    // Highlight dot
    d3.select(this)
        .transition()
        .duration(200)
        .attr("r", d => Math.max(6, d.importance / 1.5));

    // Show tooltip
    tooltip
        .style("opacity", 1)
        .html(`<h4>${d.name}</h4><p>${d.description}</p>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
}

function handleMouseOut(event, d) {
    // Reset dot size
    d3.select(this)
        .transition()
        .duration(200)
        .attr("r", d => Math.max(3, d.importance / 2));

    // Hide tooltip
    tooltip.style("opacity", 0);
}

function updateStats(events) {
    const stats = document.getElementById('stats');
    const timeSpan = xScale.domain()[1] - xScale.domain()[0];
    const days = timeSpan / (1000 * 60 * 60 * 24);
    
    if (days > 300) {
        stats.textContent = `Viewing full year - ${events.length} major events across 13.8 billion years`;
    } else if (days > 25) {
        stats.textContent = `Viewing ${Math.round(days)} days - Notice how life accelerates in recent time!`;
    } else if (days >= 1) {
        stats.textContent = `Viewing ${Math.round(days)} day(s) - All of human history fits here`;
    } else {
        const hours = timeSpan / (1000 * 60 * 60);
        stats.textContent = `Viewing ${Math.round(hours)} hour(s) - Written history is just minutes ago!`;
    }
}

function updatePeriodInfo(label, range) {
    document.getElementById('current-period').textContent = label;
    document.getElementById('time-range').textContent = range;
}

// Zoom functions (called by buttons in HTML)
function resetZoom() {
    xScale.domain([new Date(2024, 0, 1), new Date(2024, 11, 31, 23, 59, 59)]);
    currentZoom = 'year';
    updatePeriodInfo('Full Year View', 'January 1 - December 31');
    updateVisualization();
}

function zoomToDecember() {
    xScale.domain([new Date(2024, 11, 1), new Date(2024, 11, 31, 23, 59, 59)]);
    currentZoom = 'month';
    updatePeriodInfo('December - Life Explodes', 'Complex life emerges');
    updateVisualization();
}

function zoomToLastDay() {
    xScale.domain([new Date(2024, 11, 31, 0, 0), new Date(2024, 11, 31, 23, 59, 59)]);
    currentZoom = 'day';
    updatePeriodInfo('December 31 - The Human Day', 'All of human evolution');
    updateVisualization();
}

function zoomToLastHour() {
    xScale.domain([new Date(2024, 11, 31, 23, 0), new Date(2024, 11, 31, 23, 59, 59)]);
    currentZoom = 'hour';
    updatePeriodInfo('Final Hour - Human Civilization', 'All of recorded history');
    updateVisualization();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
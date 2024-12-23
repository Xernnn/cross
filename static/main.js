// Add these functions near the top of the file
function updateChartColors(chartId, selectedPoints) {
    const chart = document.getElementById(chartId);
    if (!chart || !chart.data) return;

    // Determine which color set to use based on the chart ID
    let normalColor, lightColor, boldColor;
    switch(chartId) {
        case 'yearly-chart':
            normalColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-blue').trim();
            lightColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-blue-light').trim();
            boldColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-blue-bold').trim();
            break;
        case 'group-chart':
            normalColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-green').trim();
            lightColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-green-light').trim();
            boldColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-green-bold').trim();
            break;
        default:
            return; // Exit if chart ID is not recognized
    }

    const update = {
        'marker.color': [Array(chart.data[0].x.length).fill(lightColor)]
    };

    selectedPoints.forEach(point => {
        const index = chart.data[0].x.indexOf(point);
        if (index !== -1) {
            update['marker.color'][0][index] = boldColor;
        }
    });

    Plotly.update(chartId, update);
}

function resetAllCharts() {
    currentSelections = {}; // Clear all selections
    // Reset yearly chart
    Plotly.update('yearly-chart', {
        'marker.color': [Array(currentData.yearly_avg.length).fill(
            getComputedStyle(document.documentElement)
                .getPropertyValue('--chart-blue').trim()
        )]
    });

    // Reset group chart
    Plotly.update('group-chart', {
        'marker.color': [Array(currentData.group_avg.length).fill(
            getComputedStyle(document.documentElement)
                .getPropertyValue('--chart-green').trim()
        )]
    });

    // Reset pass-fail chart
    Plotly.restyle('pass-fail-chart', {
        'marker.colors': [[
            getComputedStyle(document.documentElement)
                .getPropertyValue('--chart-green').trim(),
            getComputedStyle(document.documentElement)
                .getPropertyValue('--chart-red').trim()
        ]]
    });

    // Reset all filters
    $('input[type="checkbox"]').prop('checked', true);
    updateDropdownLabels();
    fetchData();
}

$(document).ready(function() {
    // Initial data fetch and chart rendering
    fetchData();
    updateDropdownLabels();

    // Variables for drag selection
    let isDragging = false;
    let startIndex = -1;
    let lastSelected = -1;

    // Prevent text selection during drag
    $('.checkbox-container').on('selectstart', function(e) {
        if (isDragging) e.preventDefault();
    });

    // Handle mousedown on checkbox items
    $('.checkbox-item').on('mousedown', function(e) {
        if (e.button !== 0) return; // Only handle left click
        
        const $container = $(this).closest('.checkbox-container');
        startIndex = $container.find('.checkbox-item').index(this);
        isDragging = true;
        
        // Handle Ctrl+Click
        if (e.ctrlKey) {
            const $checkbox = $(this).find('input[type="checkbox"]');
            $checkbox.prop('checked', !$checkbox.prop('checked'));
            updateFiltersAndCharts();
            e.preventDefault();
        }
        // Handle Shift+Click
        else if (e.shiftKey && lastSelected !== -1) {
            const $items = $container.find('.checkbox-item');
            const start = Math.min(lastSelected, startIndex);
            const end = Math.max(lastSelected, startIndex);
            
            $items.slice(start, end + 1).find('input[type="checkbox"]').prop('checked', true);
            updateFiltersAndCharts();
            e.preventDefault();
        }
        
        lastSelected = startIndex;
    });

    // Handle mousemove for drag selection
    $(document).on('mousemove', function(e) {
        if (!isDragging) return;
        
        const $container = $('.checkbox-container:hover');
        if ($container.length) {
            const $items = $container.find('.checkbox-item');
            const currentIndex = $items.index($items.filter(':hover'));
            
            if (currentIndex !== -1) {
                // Clear previous selection
                $items.find('input[type="checkbox"]').prop('checked', false);
                
                // Select items in drag region
                const start = Math.min(startIndex, currentIndex);
                const end = Math.max(startIndex, currentIndex);
                $items.slice(start, end + 1).find('input[type="checkbox"]').prop('checked', true);
                
                updateFiltersAndCharts();
            }
        }
    });

    // Handle mouseup to end drag
    $(document).on('mouseup', function() {
        isDragging = false;
    });

    // Update the existing checkbox change handlers
    $('input[id$="-all"]').on('change', function() {
        const type = this.id.replace('-all', '');
        $(`input[name="${type}"]`).prop('checked', $(this).is(':checked'));
        updateDropdownLabel(type);
        fetchData();
    });

    $(document).on('change', 'input[type="checkbox"]:not([id$="-all"])', function() {
        const type = $(this).attr('name');
        const allChecked = $(`input[name="${type}"]:checked`).length === $(`input[name="${type}"]`).length;
        $(`#${type}-all`).prop('checked', allChecked);
        updateDropdownLabel(type);
        fetchData();
    });

    // Add dropdown toggle functionality
    $('.dropdown-btn').click(function(e) {
        e.stopPropagation();
        const $content = $(this).siblings('.dropdown-content');
        $('.dropdown-content').not($content).removeClass('show');
        $('.dropdown-btn').not(this).removeClass('active');
        $(this).toggleClass('active');
        $content.toggleClass('show');
    });

    // Close dropdowns when clicking outside
    $(document).click(function(e) {
        if (!$(e.target).closest('.filter-dropdown').length) {
            $('.dropdown-content').removeClass('show');
            $('.dropdown-btn').removeClass('active');
        }
    });
});

function updateDropdownLabels() {
    const types = ['year', 'position', 'test-position', 'employee-id', 'birthplace', 'result', 'score'];
    types.forEach(updateDropdownLabel);
}

function updateDropdownLabel(type) {
    const $btn = $(`.dropdown-btn[data-type="${type}"]`);
    const $checked = $(`input[name="${type}"]:checked`);
    const totalOptions = $(`input[name="${type}"]`).length;
    
    let label = $btn.data('default-text');
    
    if ($checked.length === 0 || $checked.length === totalOptions || $(`#${type}-all`).prop('checked')) {
        label = 'All';
    } else if ($checked.length === 1) {
        label = $checked.first().val();
    } else if ($checked.length > 1) {
        label = 'Multiple Selected';
    }
    
    $btn.find('.btn-text').text(label);
}

function getSelectedValues(name) {
    const selectedValues = $(`input[name="${name}"]:checked`).map(function() {
        return this.value;
    }).get();
    
    // Debug logging
    console.log(`Selected ${name}:`, selectedValues);
    return selectedValues;
}

function fetchData() {
    const filters = {
        years: getSelectedValues('year'),
        positions: getSelectedValues('position'),
        testPositions: getSelectedValues('test-position'),
        employeeIds: getSelectedValues('employee-id'),
        birthplaces: getSelectedValues('birthplace'),
        results: getSelectedValues('result'),
        scores: getSelectedValues('score')
    };
    
    // Handle "Select all" cases
    if ($("#year-all").prop('checked')) filters.years = [];
    if ($("#position-all").prop('checked')) filters.positions = [];
    if ($("#test-position-all").prop('checked')) filters.testPositions = [];
    if ($("#employee-id-all").prop('checked')) filters.employeeIds = [];
    if ($("#birthplace-all").prop('checked')) filters.birthplaces = [];
    if ($("#result-all").prop('checked')) filters.results = [];
    if ($("#score-all").prop('checked')) filters.scores = [];
    
    // Handle empty selections (treat as "all" selected)
    if (filters.years.length === 0) delete filters.years;
    if (filters.positions.length === 0) delete filters.positions;
    if (filters.testPositions.length === 0) delete filters.testPositions;
    if (filters.employeeIds.length === 0) delete filters.employeeIds;
    if (filters.birthplaces.length === 0) delete filters.birthplaces;
    if (filters.results.length === 0) delete filters.results;
    if (filters.scores.length === 0) delete filters.scores;
    
    $.ajax({
        url: '/get_data',
        method: 'GET',
        data: { filters: JSON.stringify(filters) },
        success: function(data) {
            if (!data) {
                console.error('No data received');
                return;
            }
            
            currentData = data;
            
            // Preserve current selections when updating charts
            const currentYearSelection = currentSelections['yearly-chart'] || [];
            const currentGroupSelection = currentSelections['group-chart'] || [];
            
            // Create charts with filtered data
            createYearlyChart(data);
            createGroupChart(data);
            createPassFailChart(data);
            updateStats(data);
            
            // Reapply selections if they still exist in filtered data
            if (currentYearSelection.length > 0) {
                const validYears = currentYearSelection.filter(year => 
                    Object.keys(data.yearly_avg).includes(year));
                if (validYears.length > 0) {
                    updateChartColors('yearly-chart', validYears);
                }
            }
            
            if (currentGroupSelection.length > 0) {
                const validGroups = currentGroupSelection.filter(group => 
                    Object.keys(data.group_avg).includes(group));
                if (validGroups.length > 0) {
                    updateChartColors('group-chart', validGroups);
                }
            }
        },
        error: function(err) {
            console.error('Error fetching data:', err);
            clearCharts();
        }
    });
}

function clearCharts() {
    Plotly.purge('yearly-chart');
    Plotly.purge('group-chart');
    Plotly.purge('pass-fail-chart');
    $('#total-candidates .stat-value').text('-');
    $('#pass-rate .stat-value').text('-');
}

function updateStats(data) {
    $('#total-candidates .stat-value').text(data.total_candidates);
    $('#pass-rate .stat-value').text(data.pass_rate + '%');
}

// Add this function to track currently selected points
function addToSelection(chartId, newPoint) {
    if (!currentSelections[chartId]) {
        currentSelections[chartId] = [];
    }
    if (!currentSelections[chartId].includes(newPoint)) {
        currentSelections[chartId].push(newPoint);
    }
    return currentSelections[chartId];
}

// Add this at the top of the file with other global variables
let currentSelections = {};

function createYearlyChart(data) {
    const trace1 = {
        x: Object.keys(data.yearly_avg),
        y: Object.values(data.yearly_avg),
        type: 'bar',
        name: 'Average Score',
        marker: {
            color: getComputedStyle(document.documentElement)
                  .getPropertyValue('--chart-blue').trim()
        }
    };

    const layout = {
        title: 'ĐIỂM TRUNG BÌNH THEO NĂM',
        margin: { t: 40 },
        dragmode: 'select',
        selectdirection: 'h',
        hovermode: 'closest',
        // Add selection styling
        selectionrevision: false,
        selectedpoints: false
    };

    const config = {
        modeBarButtonsToAdd: ['lasso2d', 'select2d'],
        displayModeBar: true
    };

    Plotly.newPlot('yearly-chart', [trace1], layout, config);

    // Update click handler
    document.getElementById('yearly-chart').on('plotly_click', function(eventData) {
        if (!eventData || !eventData.points) return;

        const clickedYear = eventData.points[0].x;
        let selectedYears;
        
        if (eventData.event.ctrlKey) {
            // Add to current selection if Ctrl is pressed
            selectedYears = addToSelection('yearly-chart', clickedYear);
        } else {
            // New single selection if Ctrl is not pressed
            selectedYears = [clickedYear];
            currentSelections['yearly-chart'] = selectedYears;
        }
        
        // Update colors for this chart
        updateChartColors('yearly-chart', selectedYears);
        
        // Cross filter other charts
        const filters = { years: selectedYears };
        crossFilterCharts(filters);
        
        // Update sidebar filters
        $('input[name="year"]').prop('checked', false);
        selectedYears.forEach(year => {
            $(`input[name="year"][value="${year}"]`).prop('checked', true);
        });
    });

    // Update selection handler for drag
    document.getElementById('yearly-chart').on('plotly_selected', function(eventData) {
        if (!eventData || !eventData.points) {
            // Reset all charts to original state
            resetAllCharts();
            return;
        }

        const selectedYears = [...new Set(eventData.points.map(pt => pt.x))];
        currentSelections['yearly-chart'] = selectedYears; // Update current selection
        
        // Update colors for this chart
        updateChartColors('yearly-chart', selectedYears);
        
        // Cross filter other charts
        const filters = { years: selectedYears };
        crossFilterCharts(filters);
        
        // Update sidebar filters
        $('input[name="year"]').prop('checked', false);
        selectedYears.forEach(year => {
            $(`input[name="year"][value="${year}"]`).prop('checked', true);
        });
    });

    // Update double-click handler
    document.getElementById('yearly-chart').on('plotly_doubleclick', function() {
        currentSelections = {}; // Clear selections
        resetAllCharts();
    });
}

function createGroupChart(data) {
    // First, ensure we're getting all groups and sorting them correctly
    const sortedEntries = Object.entries(data.group_avg)
        .sort((a, b) => b[1] - a[1]);  // Sort by average score in descending order
    
    console.log("Sorted groups:", sortedEntries); // Debug log
    
    const trace = {
        y: sortedEntries.map(entry => entry[0]), // Groups on y-axis
        x: sortedEntries.map(entry => entry[1]), // Values on x-axis
        type: 'bar',
        orientation: 'h',
        marker: {
            color: getComputedStyle(document.documentElement)
                  .getPropertyValue('--chart-green').trim()
        },
        text: sortedEntries.map(entry => entry[1].toFixed(2)),
        textposition: 'auto',
        hoverinfo: 'y+x'
    };

    const layout = {
        title: 'ĐIỂM TRUNG BÌNH THEO NHÓM',
        margin: { t: 40, l: 150, r: 30, b: 40 }, // Adjust margins
        dragmode: 'select',
        selectdirection: 'v',
        hovermode: 'closest',
        height: 600, // Increase height to fit all bars
        barmode: 'relative',
        bargap: 0.15, // Reduce gap between bars
        xaxis: {
            title: 'Điểm trung bình',
            range: [0, 5],
            fixedrange: true // Prevent x-axis zooming
        },
        yaxis: {
            automargin: true,
            side: 'left',
            autorange: 'reversed', // This ensures the order is top-to-bottom
            tickfont: { size: 11 } // Adjust font size if needed
        }
    };

    const config = {
        modeBarButtonsToAdd: ['lasso2d', 'select2d'],
        displayModeBar: true,
        responsive: true
    };

    Plotly.newPlot('group-chart', [trace], layout, config);

    // Update click handler
    document.getElementById('group-chart').on('plotly_click', function(eventData) {
        if (!eventData || !eventData.points) return;

        const clickedGroup = eventData.points[0].y;
        let selectedGroups;
        
        if (eventData.event.ctrlKey) {
            // Add to current selection if Ctrl is pressed
            selectedGroups = addToSelection('group-chart', clickedGroup);
        } else {
            // New single selection if Ctrl is not pressed
            selectedGroups = [clickedGroup];
            currentSelections['group-chart'] = selectedGroups;
        }
        
        // Update colors for this chart
        updateChartColors('group-chart', selectedGroups);
        
        // Cross filter other charts
        const filters = { testPositions: selectedGroups };
        crossFilterCharts(filters);
        
        // Update sidebar filters
        $('input[name="test-position"]').prop('checked', false);
        selectedGroups.forEach(group => {
            $(`input[name="test-position"][value="${group}"]`).prop('checked', true);
        });
    });

    // Update selection handler for drag
    document.getElementById('group-chart').on('plotly_selected', function(eventData) {
        if (!eventData || !eventData.points) {
            resetAllCharts();
            return;
        }

        const selectedGroups = [...new Set(eventData.points.map(pt => pt.y))];
        currentSelections['group-chart'] = selectedGroups; // Update current selection
        
        // Update colors for this chart
        updateChartColors('group-chart', selectedGroups);
        
        // Cross filter other charts
        const filters = { testPositions: selectedGroups };
        crossFilterCharts(filters);
        
        // Update sidebar filters
        $('input[name="test-position"]').prop('checked', false);
        selectedGroups.forEach(group => {
            $(`input[name="test-position"][value="${group}"]`).prop('checked', true);
        });
    });

    // Update double-click handler
    document.getElementById('group-chart').on('plotly_doubleclick', function() {
        currentSelections = {}; // Clear selections
        resetAllCharts();
    });
}

function createPassFailChart(data) {
    const trace = {
        labels: Object.keys(data.pass_fail),
        values: Object.values(data.pass_fail),
        type: 'pie',
        hole: 0.4,
        marker: {
            colors: [
                getComputedStyle(document.documentElement)
                    .getPropertyValue('--chart-green').trim(),
                getComputedStyle(document.documentElement)
                    .getPropertyValue('--chart-red').trim()
            ]
        }
    };

    const layout = {
        title: 'TỈ LỆ ĐẠT/TRƯỢT',
        margin: { t: 40 }
    };

    Plotly.newPlot('pass-fail-chart', [trace], layout);

    document.getElementById('pass-fail-chart').on('plotly_click', function(eventData) {
        if (!eventData || !eventData.points) return;

        const clickedResult = eventData.points[0].label;
        
        // Update pie chart colors with bold focus
        const colors = [
            getComputedStyle(document.documentElement)
                .getPropertyValue('--chart-green-light').trim(),
            getComputedStyle(document.documentElement)
                .getPropertyValue('--chart-red-light').trim()
        ];
        
        colors[eventData.points[0].pointNumber] = clickedResult === 'đạt' 
            ? getComputedStyle(document.documentElement)
                .getPropertyValue('--chart-green-bold').trim()
            : getComputedStyle(document.documentElement)
                .getPropertyValue('--chart-red-bold').trim();
        
        Plotly.restyle('pass-fail-chart', {
            'marker.colors': [colors]
        });

        // Cross filter other charts
        const filters = { results: [clickedResult] };
        crossFilterCharts(filters);
    });

    // Add double-click to reset
    document.getElementById('pass-fail-chart').on('plotly_doubleclick', resetAllCharts);
}

// Add helper function for updating filters and charts
function updateFiltersAndCharts() {
    // Update "Select all" checkboxes
    $('.checkbox-container').each(function() {
        const type = $(this).find('input[type="checkbox"]').first().attr('name');
        if (!type) return;
        
        const allChecked = $(this).find(`input[name="${type}"]:checked`).length === 
                          $(this).find(`input[name="${type}"]`).length;
        $(`#${type}-all`).prop('checked', allChecked);
        updateDropdownLabel(type);
    });
    
    fetchData();
}

// Add visual feedback for drag selection
function addDragStyles() {
    $('<style>')
        .text(`
            .checkbox-item {
                user-select: none;
                cursor: pointer;
            }
            .checkbox-item.dragging {
                background-color: rgba(26, 115, 232, 0.1);
            }
            .checkbox-container {
                position: relative;
            }
            .drag-selection {
                position: absolute;
                background-color: rgba(26, 115, 232, 0.2);
                border: 1px solid rgba(26, 115, 232, 0.5);
                pointer-events: none;
            }
        `)
        .appendTo('head');
}

// Update the filtered version as well
function updateGroupChartFiltered(selectedYears) {
    const filteredData = filterDataByYears(selectedYears);
    
    const sortedEntries = Object.entries(filteredData.group_avg)
        .sort((a, b) => b[1] - a[1]);
    
    console.log("Filtered sorted groups:", sortedEntries); // Debug log
    
    const normalColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--chart-green').trim();
    
    Plotly.update('group-chart', {
        y: [sortedEntries.map(entry => entry[0])],
        x: [sortedEntries.map(entry => entry[1])],
        'marker.color': [Array(sortedEntries.length).fill(normalColor)],
        text: [sortedEntries.map(entry => entry[1].toFixed(2))]
    });
}

// Function to update pass/fail chart based on selection
function updatePassFailChartFiltered(selectedYears) {
    const filteredData = filterDataByYears(selectedYears);
    const trace = {
        labels: Object.keys(filteredData.pass_fail),
        values: Object.values(filteredData.pass_fail),
        type: 'pie',
        hole: 0.4,
        marker: {
            colors: ['#34a853', '#ea4335']
        }
    };
    
    Plotly.update('pass-fail-chart', {
        labels: [trace.labels],
        values: [trace.values]
    });
}

// Function to filter data based on selected years
function filterDataByYears(selectedYears) {
    // This should make an AJAX call to get filtered data
    return $.ajax({
        url: '/get_data',
        data: {
            filters: JSON.stringify({
                years: selectedYears,
                // Include other current filters
                positions: getCheckedValues('position'),
                testPositions: getCheckedValues('testPosition'),
                employeeIds: getCheckedValues('employeeId'),
                birthplaces: getCheckedValues('birthplace'),
                results: getCheckedValues('result'),
                scores: getCheckedValues('score')
            })
        },
        async: false
    }).responseJSON;
}

// Helper function to reset chart colors
function resetChartColors() {
    Plotly.update('yearly-chart', {
        'marker.color': [Array(Object.keys(currentData.yearly_avg).length).fill(SELECTED_COLOR)]
    });
    
    Plotly.update('group-chart', {
        'marker.color': [Array(Object.keys(currentData.group_avg).length).fill(GROUP_COLOR)]
    });
}

// Helper function to get checked values from filters
function getCheckedValues(filterName) {
    return $(`input[name="${filterName}"]:checked`).map(function() {
        return $(this).val();
    }).get();
}

// Store the current data globally
let currentData = null;

// Modify the existing fetchData function
function fetchData() {
    const filters = {
        years: getSelectedValues('year'),
        positions: getSelectedValues('position'),
        testPositions: getSelectedValues('test-position'),
        employeeIds: getSelectedValues('employee-id'),
        birthplaces: getSelectedValues('birthplace'),
        results: getSelectedValues('result'),
        scores: getSelectedValues('score')
    };
    
    // Handle "Select all" cases
    if ($("#year-all").prop('checked')) filters.years = [];
    if ($("#position-all").prop('checked')) filters.positions = [];
    if ($("#test-position-all").prop('checked')) filters.testPositions = [];
    if ($("#employee-id-all").prop('checked')) filters.employeeIds = [];
    if ($("#birthplace-all").prop('checked')) filters.birthplaces = [];
    if ($("#result-all").prop('checked')) filters.results = [];
    if ($("#score-all").prop('checked')) filters.scores = [];
    
    // Handle empty selections (treat as "all" selected)
    if (filters.years.length === 0) delete filters.years;
    if (filters.positions.length === 0) delete filters.positions;
    if (filters.testPositions.length === 0) delete filters.testPositions;
    if (filters.employeeIds.length === 0) delete filters.employeeIds;
    if (filters.birthplaces.length === 0) delete filters.birthplaces;
    if (filters.results.length === 0) delete filters.results;
    if (filters.scores.length === 0) delete filters.scores;
    
    $.get('/get_data', { filters: JSON.stringify(filters) })
        .done(function(data) {
            currentData = data;  // Store the data
            createYearlyChart(data);
            createGroupChart(data);
            createPassFailChart(data);
            updateStats(data);
        });
}

// Add new function for cross-filtering
function crossFilterCharts(filters) {
    // Merge with existing sidebar filters
    const currentFilters = {
        years: getSelectedValues('year'),
        positions: getSelectedValues('position'),
        testPositions: getSelectedValues('test-position'),
        employeeIds: getSelectedValues('employee-id'),
        birthplaces: getSelectedValues('birthplace'),
        results: getSelectedValues('result'),
        scores: getSelectedValues('score'),
        ...filters  // Override with new filters
    };

    // Update checkboxes based on new filters
    Object.entries(filters).forEach(([key, values]) => {
        const filterName = key.toLowerCase().replace('testpositions', 'test-position');
        $(`input[name="${filterName}"]`).prop('checked', false);
        values.forEach(value => {
            $(`input[name="${filterName}"][value="${value}"]`).prop('checked', true);
        });
        updateDropdownLabel(filterName);
    });

    // Fetch filtered data and update charts
    $.ajax({
        url: '/get_data',
        method: 'GET',
        data: { filters: JSON.stringify(currentFilters) },
        success: function(data) {
            if (!data) {
                console.error('No data received');
                return;
            }
            
            currentData = data;
            updateStats(data);
            
            // Update charts while preserving selections
            if (!filters.years) {
                createYearlyChart(data);
                if (currentSelections['yearly-chart']) {
                    updateChartColors('yearly-chart', currentSelections['yearly-chart']);
                }
            }
            if (!filters.testPositions) {
                createGroupChart(data);
                if (currentSelections['group-chart']) {
                    updateChartColors('group-chart', currentSelections['group-chart']);
                }
            }
            if (!filters.results) {
                createPassFailChart(data);
            }
        },
        error: function(err) {
            console.error('Error fetching filtered data:', err);
        }
    });
}

// Visualization Panel Component
// Charts from datasets + metrics

import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';

export class VisualizationPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentDataset = null;
        this.currentMetrics = [];
        this.charts = [];
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        // Refresh dataset list periodically to catch new datasets
        setInterval(() => this.refreshDatasetList(), 2000);
    }
    
    render() {
        this.container.innerHTML = `
            <div class="visualization-panel">
                <div class="visualization-builder">
                    <h3>Chart Builder</h3>
                    <div class="builder-form">
                        <div class="form-group">
                            <label for="dataset-select">Dataset:</label>
                            <select id="dataset-select" class="form-control">
                                <option value="">-- Select Dataset --</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="x-column-select">X Axis:</label>
                            <select id="x-column-select" class="form-control" disabled>
                                <option value="">-- Select X Column --</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="y-select-type">Y Axis Type:</label>
                            <select id="y-select-type" class="form-control" disabled>
                                <option value="column">Column</option>
                                <option value="metric">Metric</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="y-column-select">Y Axis:</label>
                            <select id="y-column-select" class="form-control" disabled>
                                <option value="">-- Select Y Column --</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="chart-type-select">Chart Type:</label>
                            <select id="chart-type-select" class="form-control">
                                <option value="line">Line Chart</option>
                                <option value="bar">Bar Chart</option>
                                <option value="scatter">Scatter Plot</option>
                            </select>
                        </div>
                        
                        <div class="form-actions">
                            <button id="render-chart-btn" class="btn btn-primary" disabled>Render Chart</button>
                        </div>
                    </div>
                </div>
                
                <div id="charts-container" class="charts-container"></div>
            </div>
        `;
        
        this.refreshDatasetList();
    }
    
    attachEventListeners() {
        const datasetSelect = this.container.querySelector('#dataset-select');
        const xColumnSelect = this.container.querySelector('#x-column-select');
        const ySelectType = this.container.querySelector('#y-select-type');
        const yColumnSelect = this.container.querySelector('#y-column-select');
        const renderBtn = this.container.querySelector('#render-chart-btn');
        
        datasetSelect.addEventListener('change', () => this.onDatasetSelected());
        xColumnSelect.addEventListener('change', () => this.updateRenderButtonState());
        ySelectType.addEventListener('change', () => this.onYTypeChanged());
        yColumnSelect.addEventListener('change', () => this.updateRenderButtonState());
        renderBtn.addEventListener('click', () => this.renderChart());
    }
    
    refreshDatasetList() {
        const datasetSelect = this.container.querySelector('#dataset-select');
        if (!datasetSelect) return;
        
        const currentValue = datasetSelect.value;
        const datasets = datasetStore.getAll();
        
        // Clear and rebuild options
        datasetSelect.innerHTML = '<option value="">-- Select Dataset --</option>';
        
        datasets.forEach(dataset => {
            const option = document.createElement('option');
            option.value = dataset.id;
            option.textContent = dataset.name;
            datasetSelect.appendChild(option);
        });
        
        // Restore selection if it still exists
        if (currentValue && datasets.find(d => d.id === currentValue)) {
            datasetSelect.value = currentValue;
            this.onDatasetSelected();
        }
    }
    
    onDatasetSelected() {
        const datasetSelect = this.container.querySelector('#dataset-select');
        const datasetId = datasetSelect.value;
        const xColumnSelect = this.container.querySelector('#x-column-select');
        const yColumnSelect = this.container.querySelector('#y-column-select');
        const ySelectType = this.container.querySelector('#y-select-type');
        const renderBtn = this.container.querySelector('#render-chart-btn');
        
        if (!datasetId) {
            xColumnSelect.disabled = true;
            yColumnSelect.disabled = true;
            ySelectType.disabled = true;
            renderBtn.disabled = true;
            xColumnSelect.innerHTML = '<option value="">-- Select X Column --</option>';
            yColumnSelect.innerHTML = '<option value="">-- Select Y Column --</option>';
            this.currentDataset = null;
            return;
        }
        
        const dataset = datasetStore.get(datasetId);
        if (!dataset) {
            return;
        }
        
        this.currentDataset = dataset;
        
        // Enable controls
        ySelectType.disabled = false;
        
        // Populate X column options
        xColumnSelect.innerHTML = '<option value="">-- Select X Column --</option>';
        if (dataset.columns && dataset.columns.length > 0) {
            dataset.columns.forEach(column => {
                const option = document.createElement('option');
                option.value = column;
                option.textContent = this.formatColumnName(column);
                xColumnSelect.appendChild(option);
            });
            xColumnSelect.disabled = false;
        }
        
        // Populate Y column options
        this.updateYColumnOptions();
        
        // Update render button state
        this.updateRenderButtonState();
    }
    
    onYTypeChanged() {
        this.updateYColumnOptions();
        this.updateRenderButtonState();
    }
    
    updateYColumnOptions() {
        const ySelectType = this.container.querySelector('#y-select-type');
        const yColumnSelect = this.container.querySelector('#y-column-select');
        const yType = ySelectType ? ySelectType.value : 'column';
        
        if (!this.currentDataset) {
            yColumnSelect.innerHTML = '<option value="">-- Select Y Column --</option>';
            yColumnSelect.disabled = true;
            return;
        }
        
        yColumnSelect.innerHTML = '<option value="">-- Select --</option>';
        
        if (yType === 'column') {
            // Show dataset columns
            if (this.currentDataset.columns && this.currentDataset.columns.length > 0) {
                this.currentDataset.columns.forEach(column => {
                    const option = document.createElement('option');
                    option.value = column;
                    option.textContent = this.formatColumnName(column);
                    yColumnSelect.appendChild(option);
                });
            }
            yColumnSelect.disabled = false;
        } else if (yType === 'metric') {
            // Show metrics for this dataset
            const metrics = metricsStore.getByDataset(this.currentDataset.id);
            if (metrics && metrics.length > 0) {
                metrics.forEach(metric => {
                    const option = document.createElement('option');
                    option.value = metric.id;
                    option.textContent = `${metric.name} (${metric.value})`;
                    yColumnSelect.appendChild(option);
                });
            } else {
                yColumnSelect.innerHTML = '<option value="">No metrics available</option>';
            }
            yColumnSelect.disabled = false;
        }
    }
    
    updateRenderButtonState() {
        const datasetSelect = this.container.querySelector('#dataset-select');
        const xColumnSelect = this.container.querySelector('#x-column-select');
        const yColumnSelect = this.container.querySelector('#y-column-select');
        const renderBtn = this.container.querySelector('#render-chart-btn');
        
        const canRender = datasetSelect.value && 
                         xColumnSelect.value && 
                         yColumnSelect.value;
        
        renderBtn.disabled = !canRender;
    }
    
    formatColumnName(column) {
        return column
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }
    
    /**
     * Converts dataset rows (array of arrays) to data objects (array of objects)
     * @param {Object} dataset - Dataset with rows and columns
     * @returns {Array} Array of data objects
     */
    getDatasetData(dataset) {
        // Convert rows (array of arrays) to data (array of objects) if needed
        if (dataset.data) {
            return dataset.data;
        }
        
        if (dataset.rows && dataset.columns) {
            return dataset.rows.map(row => {
                const rowObj = {};
                dataset.columns.forEach((column, index) => {
                    rowObj[column] = row[index];
                });
                return rowObj;
            });
        }
        
        return [];
    }
    
    /**
     * Converts dataset rows into Highcharts series format
     * @param {Array} data - Array of data objects
     * @param {string} xColumn - Column name for X axis
     * @param {string} yColumn - Column name for Y axis
     * @param {string} chartType - Type of chart (line, bar, scatter)
     * @returns {Object} Object with chartData and metadata
     */
    convertToHighchartsSeries(data, xColumn, yColumn, chartType) {
        if (!data || data.length === 0) {
            return { chartData: [], isXNumeric: false, categories: [] };
        }
        
        // Extract and validate data points
        const points = data
            .map(row => {
                const xValue = row[xColumn];
                const yValue = row[yColumn];
                
                // Skip rows with missing values
                if (xValue === null || xValue === undefined || 
                    yValue === null || yValue === undefined) {
                    return null;
                }
                
                return {
                    x: xValue,
                    y: parseFloat(yValue) || 0,
                    name: String(xValue) // For tooltips
                };
            })
            .filter(point => point !== null);
        
        if (points.length === 0) {
            return { chartData: [], isXNumeric: false, categories: [] };
        }
        
        // Determine if x values are numeric
        const isXNumeric = typeof points[0].x === 'number';
        
        // Sort data for line and bar charts
        if (chartType === 'line' || chartType === 'bar') {
            points.sort((a, b) => {
                if (isXNumeric) {
                    return a.x - b.x;
                }
                return String(a.x).localeCompare(String(b.x));
            });
        }
        
        // Convert to Highcharts format
        let chartData;
        let categories = [];
        
        if (chartType === 'scatter') {
            // Scatter plot: array of [x, y] pairs
            chartData = points.map(point => [parseFloat(point.x) || 0, point.y]);
        } else if (chartType === 'line') {
            if (isXNumeric) {
                // Line chart with numeric x-axis: use [x, y] format
                chartData = points.map(point => [parseFloat(point.x) || 0, point.y]);
            } else {
                // Line chart with categorical x-axis: use y values with categories
                categories = points.map(point => String(point.x));
                chartData = points.map(point => point.y);
            }
        } else if (chartType === 'bar') {
            // Bar charts always use categories for better display
            categories = points.map(point => String(point.x));
            chartData = points.map(point => point.y);
        } else {
            // Default: just y values
            chartData = points.map(point => point.y);
        }
        
        return {
            chartData,
            isXNumeric,
            categories
        };
    }
    
    renderChart() {
        const datasetSelect = this.container.querySelector('#dataset-select');
        const xColumnSelect = this.container.querySelector('#x-column-select');
        const yColumnSelect = this.container.querySelector('#y-column-select');
        const ySelectType = this.container.querySelector('#y-select-type');
        const chartTypeSelect = this.container.querySelector('#chart-type-select');
        
        const datasetId = datasetSelect.value;
        const xColumn = xColumnSelect.value;
        const yValue = yColumnSelect.value;
        const yType = ySelectType.value;
        const chartType = chartTypeSelect.value;
        
        if (!datasetId || !xColumn || !yValue) {
            alert('Please select dataset, X column, and Y column/metric.');
            return;
        }
        
        const dataset = datasetStore.get(datasetId);
        if (!dataset) {
            alert('Dataset not found.');
            return;
        }
        
        const data = this.getDatasetData(dataset);
        if (!data || data.length === 0) {
            alert('Dataset has no data.');
            return;
        }
        
        // Create chart container div
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        // Prepare chart data and labels
        let seriesData;
        let yLabel;
        
        if (yType === 'metric') {
            const metric = metricsStore.get(yValue);
            if (!metric) {
                alert('Metric not found.');
                chartContainer.remove();
                return;
            }
            // For metrics, create a constant value chart
            const metricData = data.map(row => ({
                x: row[xColumn],
                y: parseFloat(metric.value) || 0
            }));
            seriesData = this.convertToHighchartsSeries(metricData, 'x', 'y', chartType);
            yLabel = metric.name;
        } else {
            // Use Y column from dataset - convert rows to Highcharts series format
            seriesData = this.convertToHighchartsSeries(data, xColumn, yValue, chartType);
            yLabel = this.formatColumnName(yValue);
        }
        
        // Render with Highcharts
        this.renderHighchart(chartId, chartType, seriesData, {
            xLabel: this.formatColumnName(xColumn),
            yLabel: yLabel,
            title: `${yLabel} vs ${this.formatColumnName(xColumn)}`
        });
    }
    
    /**
     * Renders a Highcharts chart inside a div container
     * @param {string} containerId - ID of the div container to render chart in
     * @param {string} chartType - Type of chart (line, bar, scatter)
     * @param {Object} seriesData - Object with chartData, isXNumeric, and categories
     * @param {Object} options - Chart options (xLabel, yLabel, title)
     */
    renderHighchart(containerId, chartType, seriesData, options) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Chart container with ID "${containerId}" not found`);
            return;
        }
        
        // Check if Highcharts is available
        if (typeof Highcharts === 'undefined') {
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">Highcharts library not loaded. Please check that Highcharts is included in the page.</p>
                </div>
            `;
            return;
        }
        
        // Validate series data
        if (!seriesData || !seriesData.chartData || seriesData.chartData.length === 0) {
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">No data available to render chart.</p>
                </div>
            `;
            return;
        }
        
        const { chartData, isXNumeric, categories } = seriesData;
        
        // Configure X axis based on chart type and data type
        let xAxisConfig = {
            title: {
                text: options.xLabel || 'X Axis'
            }
        };
        
        if (chartType === 'scatter') {
            // Scatter plot always uses linear/numeric axis
            xAxisConfig.type = 'linear';
        } else if (chartType === 'line') {
            if (isXNumeric) {
                // Line chart with numeric x-axis
                xAxisConfig.type = 'linear';
            } else {
                // Line chart with categorical x-axis
                xAxisConfig.type = 'category';
                if (categories && categories.length > 0) {
                    xAxisConfig.categories = categories;
                }
            }
        } else if (chartType === 'bar') {
            // Bar charts always use category axis for better display
            xAxisConfig.type = 'category';
            if (categories && categories.length > 0) {
                xAxisConfig.categories = categories;
            }
        }
        
        // Build Highcharts configuration
        const chartConfig = {
            chart: {
                type: chartType === 'scatter' ? 'scatter' : chartType,
                renderTo: containerId,
                height: 400
            },
            title: {
                text: options.title || 'Chart'
            },
            xAxis: xAxisConfig,
            yAxis: {
                title: {
                    text: options.yLabel || 'Y Axis'
                }
            },
            series: [{
                name: options.yLabel || 'Series 1',
                data: chartData
            }],
            legend: {
                enabled: true
            },
            credits: {
                enabled: false
            },
            tooltip: {
                enabled: true,
                shared: false
            },
            plotOptions: {
                line: {
                    marker: {
                        enabled: true,
                        radius: 4
                    }
                },
                bar: {
                    dataLabels: {
                        enabled: false
                    }
                },
                scatter: {
                    marker: {
                        radius: 5
                    }
                }
            }
        };
        
        // Render the chart
        try {
            const chart = new Highcharts.Chart(chartConfig);
            
            // Store chart reference for potential updates
            container._highchartsChart = chart;
            
            // Add to charts array for management
            this.charts.push({
                id: containerId,
                chart: chart,
                container: container
            });
        } catch (error) {
            console.error('Error rendering Highcharts chart:', error);
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">Error rendering chart: ${error.message}</p>
                    <p>Please check the browser console for more details.</p>
                </div>
            `;
        }
    }
    
    updateDataset(dataset) {
        this.currentDataset = dataset;
        // Update selection if this dataset is currently selected
        const datasetSelect = this.container.querySelector('#dataset-select');
        if (datasetSelect && dataset && datasetSelect.value === dataset.id) {
            this.onDatasetSelected();
        }
        this.refreshCharts();
    }
    
    updateMetrics(metrics) {
        this.currentMetrics = metrics;
        // Refresh Y column options if metric type is selected
        const ySelectType = this.container.querySelector('#y-select-type');
        if (ySelectType && ySelectType.value === 'metric') {
            this.updateYColumnOptions();
        }
        this.refreshCharts();
    }
    
    refreshCharts() {
        // Refresh all existing charts with new data
        // This is a placeholder - could be enhanced to update existing charts
    }
}


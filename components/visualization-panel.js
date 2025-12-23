// Visualization Panel Component
// Charts from datasets + metrics

import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';
import { Modal } from '../utils/modal.js';

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
                        
                        <div class="form-group" id="metric-display-mode-group" style="display: none;">
                            <label for="metric-display-mode">Metric Display:</label>
                            <select id="metric-display-mode" class="form-control">
                                <option value="kpi">KPI Card</option>
                                <option value="reference">Reference Line (Overlay)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="y-column-select">Y Axis:</label>
                            <select id="y-column-select" class="form-control" disabled>
                                <option value="">-- Select Y Column --</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="chart-type-group">
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
                    
                    <div class="styling-options">
                        <button type="button" class="styling-toggle" id="styling-toggle">
                            <span>Chart Styling Options</span>
                            <span class="toggle-icon">▼</span>
                        </button>
                        <div class="styling-panel" id="styling-panel" style="display: none;">
                            <div class="styling-form">
                                <div class="form-group">
                                    <label for="chart-title-input">Chart Title:</label>
                                    <input type="text" id="chart-title-input" class="form-control" placeholder="Auto-generated">
                                </div>
                                
                                <div class="form-group">
                                    <label for="x-axis-label-input">X Axis Label:</label>
                                    <input type="text" id="x-axis-label-input" class="form-control" placeholder="Auto-generated">
                                </div>
                                
                                <div class="form-group">
                                    <label for="y-axis-label-input">Y Axis Label:</label>
                                    <input type="text" id="y-axis-label-input" class="form-control" placeholder="Auto-generated">
                                </div>
                                
                                <div class="form-group">
                                    <label for="series-color-input">Series Color:</label>
                                    <div class="color-input-wrapper">
                                        <input type="color" id="series-color-input" class="form-control color-picker" value="#007bff">
                                        <input type="text" id="series-color-text" class="form-control color-text" value="#007bff" placeholder="#007bff">
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="trendline-toggle" class="form-checkbox">
                                        <span>Show Trendline</span>
                                    </label>
                                </div>
                            </div>
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
        const metricDisplayMode = this.container.querySelector('#metric-display-mode');
        const renderBtn = this.container.querySelector('#render-chart-btn');
        const stylingToggle = this.container.querySelector('#styling-toggle');
        const seriesColorInput = this.container.querySelector('#series-color-input');
        const seriesColorText = this.container.querySelector('#series-color-text');
        
        datasetSelect.addEventListener('change', () => this.onDatasetSelected());
        xColumnSelect.addEventListener('change', () => this.updateRenderButtonState());
        ySelectType.addEventListener('change', () => this.onYTypeChanged());
        yColumnSelect.addEventListener('change', () => this.updateRenderButtonState());
        metricDisplayMode.addEventListener('change', () => this.onMetricDisplayModeChanged());
        renderBtn.addEventListener('click', () => this.renderChart());
        
        // Styling controls
        if (stylingToggle) {
            stylingToggle.addEventListener('click', () => this.toggleStylingPanel());
        }
        
        // Sync color picker and text input
        if (seriesColorInput && seriesColorText) {
            seriesColorInput.addEventListener('input', (e) => {
                seriesColorText.value = e.target.value;
            });
            seriesColorText.addEventListener('input', (e) => {
                const color = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    seriesColorInput.value = color;
                }
            });
        }
    }
    
    toggleStylingPanel() {
        const panel = this.container.querySelector('#styling-panel');
        const toggle = this.container.querySelector('#styling-toggle');
        const icon = toggle.querySelector('.toggle-icon');
        
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            icon.textContent = '▲';
        } else {
            panel.style.display = 'none';
            icon.textContent = '▼';
        }
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
        const ySelectType = this.container.querySelector('#y-select-type');
        const metricDisplayModeGroup = this.container.querySelector('#metric-display-mode-group');
        const chartTypeGroup = this.container.querySelector('#chart-type-group');
        const xColumnSelect = this.container.querySelector('#x-column-select');
        
        if (ySelectType.value === 'metric') {
            // Show metric display mode selector
            metricDisplayModeGroup.style.display = 'block';
            this.onMetricDisplayModeChanged();
        } else {
            // Hide metric display mode selector
            metricDisplayModeGroup.style.display = 'none';
            chartTypeGroup.style.display = 'block';
            xColumnSelect.disabled = false;
        }
        
        this.updateYColumnOptions();
        this.updateRenderButtonState();
    }
    
    onMetricDisplayModeChanged() {
        const metricDisplayMode = this.container.querySelector('#metric-display-mode');
        const chartTypeGroup = this.container.querySelector('#chart-type-group');
        const xColumnSelect = this.container.querySelector('#x-column-select');
        
        if (metricDisplayMode.value === 'kpi') {
            // KPI mode: hide chart type and X column (not needed for KPI)
            chartTypeGroup.style.display = 'none';
            xColumnSelect.disabled = true;
        } else {
            // Reference line mode: show chart type and enable X column
            chartTypeGroup.style.display = 'block';
            xColumnSelect.disabled = false;
        }
        
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
        const ySelectType = this.container.querySelector('#y-select-type');
        const metricDisplayMode = this.container.querySelector('#metric-display-mode');
        const renderBtn = this.container.querySelector('#render-chart-btn');
        
        let canRender = false;
        
        if (datasetSelect.value && yColumnSelect.value) {
            if (ySelectType.value === 'metric') {
                const displayMode = metricDisplayMode ? metricDisplayMode.value : 'kpi';
                if (displayMode === 'kpi') {
                    // KPI mode: only needs dataset and metric
                    canRender = true;
                } else {
                    // Reference line mode: needs X column too
                    canRender = xColumnSelect.value && !xColumnSelect.disabled;
                }
            } else {
                // Column mode: needs X and Y columns
                canRender = xColumnSelect.value && !xColumnSelect.disabled;
            }
        }
        
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
            throw new Error('Cannot create chart: No data available');
        }
        
        // Validate columns exist in data
        const firstRow = data[0];
        if (!firstRow || typeof firstRow !== 'object') {
            throw new Error('Cannot create chart: Invalid data format');
        }
        
        if (!(xColumn in firstRow)) {
            throw new Error(`Cannot create chart: Column "${xColumn}" not found in data`);
        }
        
        if (!(yColumn in firstRow)) {
            throw new Error(`Cannot create chart: Column "${yColumn}" not found in data`);
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
            throw new Error('Cannot create chart: No valid data points found. All rows contain null or undefined values.');
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
    
    async renderChart() {
        const datasetSelect = this.container.querySelector('#dataset-select');
        const xColumnSelect = this.container.querySelector('#x-column-select');
        const yColumnSelect = this.container.querySelector('#y-column-select');
        const ySelectType = this.container.querySelector('#y-select-type');
        const chartTypeSelect = this.container.querySelector('#chart-type-select');
        const metricDisplayMode = this.container.querySelector('#metric-display-mode');
        
        const datasetId = datasetSelect.value;
        const xColumn = xColumnSelect.value;
        const yValue = yColumnSelect.value;
        const yType = ySelectType.value;
        const chartType = chartTypeSelect ? chartTypeSelect.value : 'line';
        const displayMode = metricDisplayMode ? metricDisplayMode.value : 'kpi';
        
        if (!datasetId || !yValue) {
            this.showError('Please select a dataset and Y axis column or metric to create a chart.');
            return;
        }
        
        // Handle metric-based visualizations
        if (yType === 'metric') {
            const metric = metricsStore.get(yValue);
            if (!metric) {
                this.showError('Cannot create chart: Selected metric not found. Please select a valid metric.');
                return;
            }
            
            // Check if metric has a valid value
            if (metric.value === null || metric.value === undefined) {
                this.showError(`Cannot create chart: Metric "${metric.name}" has no value. The metric calculation may have failed.`);
                return;
            }
            
            if (displayMode === 'kpi') {
                // Render KPI card
                this.renderKPICard(metric);
                return;
            } else {
                // Reference line mode: need X column and dataset data
                if (!xColumn) {
                    this.showError('Please select an X axis column for the reference line overlay.');
                    return;
                }
                
                const dataset = datasetStore.get(datasetId);
                if (!dataset) {
                    this.showError('Cannot create chart: Dataset not found. Please select a valid dataset.');
                    return;
                }
                
                // Check if dataset is empty
                if (!dataset.rows || dataset.rows.length === 0) {
                    this.showError('Cannot create chart: The selected dataset is empty. Please select a dataset with data.');
                    return;
                }
                
                // Check if dataset has columns
                if (!dataset.columns || dataset.columns.length === 0) {
                    this.showError('Cannot create chart: The selected dataset has no columns.');
                    return;
                }
                
                // Validate that selected columns exist
                if (!dataset.columns.includes(xColumn)) {
                    this.showError(`Cannot create chart: Column "${xColumn}" not found in dataset. Available columns: ${dataset.columns.join(', ')}`);
                    return;
                }
                
                const data = this.getDatasetData(dataset);
                if (!data || data.length === 0) {
                    this.showError('Cannot create chart: The dataset contains no data rows.');
                    return;
                }
                
                // Render chart with metric as reference line
                await this.renderChartWithReferenceLine(datasetId, xColumn, yValue, chartType, metric);
                return;
            }
        }
        
        // Handle column-based charts (existing logic)
        if (!xColumn) {
            this.showError('Please select an X axis column to create a chart.');
            return;
        }
        
        const dataset = datasetStore.get(datasetId);
        if (!dataset) {
            this.showError('Cannot create chart: Dataset not found. Please select a valid dataset.');
            return;
        }
        
        // Check if dataset is empty
        if (!dataset.rows || dataset.rows.length === 0) {
            this.showError('Cannot create chart: The selected dataset is empty. Please select a dataset with data.');
            return;
        }
        
        // Check if dataset has columns
        if (!dataset.columns || dataset.columns.length === 0) {
            this.showError('Cannot create chart: The selected dataset has no columns.');
            return;
        }
        
        // Validate that selected columns exist
        if (!dataset.columns.includes(xColumn)) {
            this.showError(`Cannot create chart: Column "${xColumn}" not found in dataset. Available columns: ${dataset.columns.join(', ')}`);
            return;
        }
        
        if (yType === 'column' && !dataset.columns.includes(yValue)) {
            this.showError(`Cannot create chart: Column "${yValue}" not found in dataset. Available columns: ${dataset.columns.join(', ')}`);
            return;
        }
        
        const data = this.getDatasetData(dataset);
        if (!data || data.length === 0) {
            this.showError('Cannot create chart: The dataset contains no data rows.');
            return;
        }
        
        // Create chart container div
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        // Use Y column from dataset - convert rows to Highcharts series format
        let seriesData;
        let yLabel;
        try {
            seriesData = this.convertToHighchartsSeries(data, xColumn, yValue, chartType);
            yLabel = this.formatColumnName(yValue);
        } catch (error) {
            this.showError(error.message || 'Error preparing chart data');
            chartContainer.remove();
            return;
        }
        
        // Collect styling options
        const stylingOptions = this.getStylingOptions();
        
        // Render with Highcharts
        this.renderHighchart(chartId, chartType, seriesData, {
            xLabel: stylingOptions.xLabel || this.formatColumnName(xColumn),
            yLabel: stylingOptions.yLabel || yLabel,
            title: stylingOptions.title || `${yLabel} vs ${this.formatColumnName(xColumn)}`,
            color: stylingOptions.color,
            showTrendline: stylingOptions.showTrendline
        });
    }
    
    /**
     * Collects styling options from the form
     * @returns {Object} Styling options object
     */
    getStylingOptions() {
        const titleInput = this.container.querySelector('#chart-title-input');
        const xLabelInput = this.container.querySelector('#x-axis-label-input');
        const yLabelInput = this.container.querySelector('#y-axis-label-input');
        const colorInput = this.container.querySelector('#series-color-input');
        const trendlineToggle = this.container.querySelector('#trendline-toggle');
        
        return {
            title: titleInput && titleInput.value.trim() ? titleInput.value.trim() : null,
            xLabel: xLabelInput && xLabelInput.value.trim() ? xLabelInput.value.trim() : null,
            yLabel: yLabelInput && yLabelInput.value.trim() ? yLabelInput.value.trim() : null,
            color: colorInput ? colorInput.value : '#007bff',
            showTrendline: trendlineToggle ? trendlineToggle.checked : false
        };
    }
    
    /**
     * Renders a single-value KPI card for a metric
     * @param {Object} metric - Metric object with name, value, type, etc.
     */
    renderKPICard(metric) {
        const kpiId = `kpi_${Date.now()}`;
        const kpiContainer = document.createElement('div');
        kpiContainer.id = kpiId;
        kpiContainer.className = 'kpi-card';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(kpiContainer);
        
        const value = parseFloat(metric.value);
        const formattedValue = isNaN(value) ? metric.value : this.formatNumber(value);
        
        kpiContainer.innerHTML = `
            <div class="kpi-header">
                <h4 class="kpi-title">${metric.name || 'Metric'}</h4>
                ${metric.type ? `<span class="kpi-type">${metric.type}</span>` : ''}
            </div>
            <div class="kpi-value">${formattedValue}</div>
            ${metric.column ? `<div class="kpi-meta">Column: ${this.formatColumnName(metric.column)}</div>` : ''}
            ${metric.operation ? `<div class="kpi-meta">Operation: ${metric.operation}</div>` : ''}
        `;
        
        // Store reference
        this.charts.push({
            id: kpiId,
            type: 'kpi',
            container: kpiContainer,
            metric: metric
        });
    }
    
    /**
     * Renders a chart with a metric value as a horizontal reference line
     * @param {string} datasetId - Dataset ID
     * @param {string} xColumn - X axis column name
     * @param {string} metricId - Metric ID to use as reference line
     * @param {string} chartType - Chart type (line, bar)
     * @param {Object} metric - Metric object
     */
    async renderChartWithReferenceLine(datasetId, xColumn, metricId, chartType, metric) {
        const dataset = datasetStore.get(datasetId);
        if (!dataset) {
            await Modal.alert('Dataset not found.');
            return;
        }
        
        const data = this.getDatasetData(dataset);
        if (!data || data.length === 0) {
            await Modal.alert('Dataset has no data.');
            return;
        }
        
        // For reference line, we need a Y column to plot
        // Let's use the first numeric column as the main series
        const numericColumns = dataset.columns.filter(col => {
            const sampleValue = data[0] && data[0][col];
            return sampleValue !== null && sampleValue !== undefined && 
                   (typeof sampleValue === 'number' || !isNaN(parseFloat(sampleValue)));
        });
        
        if (numericColumns.length === 0) {
            await Modal.alert('No numeric columns found in dataset for reference line chart.');
            return;
        }
        
        // Use the first numeric column (or allow user to select - for now use first)
        const yColumn = numericColumns[0];
        
        // Create chart container div
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        // Convert dataset to Highcharts series format
        const seriesData = this.convertToHighchartsSeries(data, xColumn, yColumn, chartType);
        const yLabel = this.formatColumnName(yColumn);
        const metricValue = parseFloat(metric.value) || 0;
        
        // Render chart with reference line
        this.renderHighchartWithReferenceLine(chartId, chartType, seriesData, {
            xLabel: this.formatColumnName(xColumn),
            yLabel: yLabel,
            title: `${yLabel} vs ${this.formatColumnName(xColumn)} (${metric.name}: ${metricValue})`,
            referenceLine: {
                value: metricValue,
                name: metric.name || 'Reference Line',
                color: '#ff6b6b'
            }
        });
    }
    
    /**
     * Formats a number for display in KPI cards
     * @param {number} value - Numeric value
     * @returns {string} Formatted number string
     */
    formatNumber(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(2) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(2) + 'K';
        } else if (value % 1 === 0) {
            return value.toString();
        } else {
            return value.toFixed(2);
        }
    }
    
    /**
     * Calculates trendline data using linear regression
     * @param {Array} chartData - Chart data array
     * @param {boolean} isXNumeric - Whether X values are numeric
     * @param {Array} categories - Category labels (if categorical)
     * @returns {Array} Trendline data points
     */
    calculateTrendline(chartData, isXNumeric, categories) {
        if (!chartData || chartData.length < 2) {
            return [];
        }
        
        // Convert chart data to [x, y] pairs for regression
        let points = [];
        
        if (isXNumeric || chartData[0] instanceof Array) {
            // Data is already in [x, y] format
            points = chartData.map(point => {
                if (Array.isArray(point)) {
                    return { x: point[0], y: point[1] };
                }
                return null;
            }).filter(p => p !== null && !isNaN(p.x) && !isNaN(p.y));
        } else {
            // Data is array of y values, use index as x
            points = chartData.map((y, index) => ({
                x: index,
                y: parseFloat(y) || 0
            })).filter(p => !isNaN(p.y));
        }
        
        if (points.length < 2) {
            return [];
        }
        
        // Calculate linear regression: y = mx + b
        const n = points.length;
        const sumX = points.reduce((sum, p) => sum + p.x, 0);
        const sumY = points.reduce((sum, p) => sum + p.y, 0);
        const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
        const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
        
        const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const b = (sumY - m * sumX) / n;
        
        // Generate trendline points
        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));
        
        // For categorical data (no numeric x), return y values
        // For numeric x, return [x, y] pairs
        if (!isXNumeric && categories && categories.length > 0) {
            // Categorical: return array of y values matching the number of categories
            return categories.map((_, index) => m * index + b);
        } else {
            // Numeric: return [x, y] pairs for the trendline endpoints
            return [
                [minX, m * minX + b],
                [maxX, m * maxX + b]
            ];
        }
    }
    
    /**
     * Renders a Highcharts chart inside a div container
     * @param {string} containerId - ID of the div container to render chart in
     * @param {string} chartType - Type of chart (line, bar, scatter)
     * @param {Object} seriesData - Object with chartData, isXNumeric, and categories
     * @param {Object} options - Chart options (xLabel, yLabel, title, color, showTrendline)
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
                data: chartData,
                color: options.color || '#007bff'
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
        
        // Add trendline if requested and chart type supports it
        if (options.showTrendline && (chartType === 'line' || chartType === 'scatter')) {
            const trendlineData = this.calculateTrendline(chartData, isXNumeric, categories);
            if (trendlineData && trendlineData.length > 0) {
                chartConfig.series.push({
                    name: 'Trendline',
                    type: 'line',
                    data: trendlineData,
                    color: '#ff9800',
                    dashStyle: 'dash',
                    marker: {
                        enabled: false
                    },
                    enableMouseTracking: false,
                    zIndex: 1
                });
            }
        }
        
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
    
    /**
     * Renders a Highcharts chart with a metric value as a horizontal reference line
     * @param {string} containerId - ID of the div container to render chart in
     * @param {string} chartType - Type of chart (line, bar)
     * @param {Object} seriesData - Object with chartData, isXNumeric, and categories
     * @param {Object} options - Chart options including referenceLine
     */
    renderHighchartWithReferenceLine(containerId, chartType, seriesData, options) {
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
        
        if (!options.referenceLine || options.referenceLine.value === undefined) {
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">Reference line value not provided.</p>
                </div>
            `;
            return;
        }
        
        const { chartData, isXNumeric, categories } = seriesData;
        const { referenceLine } = options;
        
        // Configure X axis
        let xAxisConfig = {
            title: {
                text: options.xLabel || 'X Axis'
            }
        };
        
        if (chartType === 'line') {
            if (isXNumeric) {
                xAxisConfig.type = 'linear';
            } else {
                xAxisConfig.type = 'category';
                if (categories && categories.length > 0) {
                    xAxisConfig.categories = categories;
                }
            }
        } else if (chartType === 'bar') {
            xAxisConfig.type = 'category';
            if (categories && categories.length > 0) {
                xAxisConfig.categories = categories;
            }
        }
        
        // Build Highcharts configuration with reference line
        const chartConfig = {
            chart: {
                type: chartType,
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
                },
                plotLines: [{
                    value: referenceLine.value,
                    color: referenceLine.color || '#ff6b6b',
                    width: 2,
                    dashStyle: 'dash',
                    label: {
                        text: referenceLine.name || 'Reference',
                        align: 'right',
                        style: {
                            color: referenceLine.color || '#ff6b6b',
                            fontWeight: 'bold'
                        }
                    },
                    zIndex: 5
                }]
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
                }
            }
        };
        
        // Render the chart
        try {
            const chart = new Highcharts.Chart(chartConfig);
            
            // Store chart reference
            container._highchartsChart = chart;
            
            // Add to charts array for management
            this.charts.push({
                id: containerId,
                chart: chart,
                container: container,
                type: 'chart-with-reference-line'
            });
        } catch (error) {
            console.error('Error rendering Highcharts chart with reference line:', error);
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
    
    showError(message) {
        // Create a temporary error message in the charts container
        const chartsContainer = this.container.querySelector('#charts-container');
        if (!chartsContainer) return;
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-error-message';
        errorDiv.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-text">${this.escapeHtml(message)}</div>
        `;
        
        // Remove any existing error messages
        const existingErrors = chartsContainer.querySelectorAll('.chart-error-message');
        existingErrors.forEach(err => err.remove());
        
        chartsContainer.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


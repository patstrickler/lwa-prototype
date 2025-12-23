// Visualization Panel Component
// Charts from datasets + metrics

import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';
import { debounceRAF } from '../utils/debounce.js';
import { Modal } from '../utils/modal.js';

export class VisualizationPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentDataset = null;
        this.currentMetrics = [];
        this.charts = [];
        this.xAxisSelection = null; // { type: 'column'|'metric', value: string, datasetId: string }
        this.yAxisSelection = null;
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
                            <label>X Axis Selection:</label>
                            <div class="axis-selection-display" id="x-axis-display">
                                <span class="selection-placeholder">Click a column or metric from the left panel</span>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Y Axis Selection:</label>
                            <div class="axis-selection-display" id="y-axis-display">
                                <span class="selection-placeholder">Click a column or metric from the left panel</span>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="chart-type-select">Chart Type:</label>
                            <select id="chart-type-select" class="form-control">
                                <option value="line">Line Chart</option>
                                <option value="bar">Bar Chart</option>
                                <option value="scatter">Scatter Plot</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <button type="button" class="btn btn-secondary" id="clear-selections-btn">Clear Selections</button>
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
        const chartTypeSelect = this.container.querySelector('#chart-type-select');
        const clearBtn = this.container.querySelector('#clear-selections-btn');
        const stylingToggle = this.container.querySelector('#styling-toggle');
        const seriesColorInput = this.container.querySelector('#series-color-input');
        const seriesColorText = this.container.querySelector('#series-color-text');
        const trendlineToggle = this.container.querySelector('#trendline-toggle');
        const titleInput = this.container.querySelector('#chart-title-input');
        const xLabelInput = this.container.querySelector('#x-axis-label-input');
        const yLabelInput = this.container.querySelector('#y-axis-label-input');
        
        // Auto-render on selection changes (debounced)
        chartTypeSelect.addEventListener('change', () => {
            // Small delay to debounce rapid changes
            this.autoRender();
        });
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelections());
        }
        
        // Styling controls - also trigger auto-render
        if (stylingToggle) {
            stylingToggle.addEventListener('click', () => this.toggleStylingPanel());
        }
        
        // Sync color picker and text input, trigger render
        if (seriesColorInput && seriesColorText) {
            seriesColorInput.addEventListener('input', (e) => {
                seriesColorText.value = e.target.value;
                this.autoRender();
            });
            seriesColorText.addEventListener('input', (e) => {
                const color = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    seriesColorInput.value = color;
                    this.autoRender();
                }
            });
        }
        
        // Trendline toggle triggers render
        if (trendlineToggle) {
            trendlineToggle.addEventListener('change', () => this.autoRender());
        }
        
        // Label inputs trigger render (with debounce)
        if (titleInput) {
            let titleTimeout;
            titleInput.addEventListener('input', () => {
                clearTimeout(titleTimeout);
                titleTimeout = setTimeout(() => this.autoRender(), 500);
            });
        }
        if (xLabelInput) {
            let xLabelTimeout;
            xLabelInput.addEventListener('input', () => {
                clearTimeout(xLabelTimeout);
                xLabelTimeout = setTimeout(() => this.autoRender(), 500);
            });
        }
        if (yLabelInput) {
            let yLabelTimeout;
            yLabelInput.addEventListener('input', () => {
                clearTimeout(yLabelTimeout);
                yLabelTimeout = setTimeout(() => this.autoRender(), 500);
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
        
        // Filter out deleted datasets
        const validDatasets = datasets.filter(ds => datasetStore.exists(ds.id));
        
        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select Dataset --';
        fragment.appendChild(placeholder);
        
        validDatasets.forEach(dataset => {
            const option = document.createElement('option');
            option.value = dataset.id;
            option.textContent = dataset.name;
            fragment.appendChild(option);
        });
        
        // Batch DOM update with requestAnimationFrame
        requestAnimationFrame(() => {
            datasetSelect.innerHTML = '';
            datasetSelect.appendChild(fragment);
            
            // Restore selection if it still exists
            if (currentValue && validDatasets.find(d => d.id === currentValue)) {
                datasetSelect.value = currentValue;
                // Debounce the selection handler
                if (this._selectionTimeout) {
                    clearTimeout(this._selectionTimeout);
                }
                this._selectionTimeout = setTimeout(() => {
                    this.onDatasetSelected();
                }, 50);
            }
        });
    }
    
    onDatasetSelected() {
        // Use requestAnimationFrame to batch DOM updates
        requestAnimationFrame(() => {
            const datasetSelect = this.container.querySelector('#dataset-select');
            const datasetId = datasetSelect.value;
            const xAxisSelect = this.container.querySelector('#x-axis-select');
            const yAxisSelect = this.container.querySelector('#y-axis-select');
            
            if (!datasetId) {
                xAxisSelect.disabled = true;
                yAxisSelect.disabled = true;
                xAxisSelect.innerHTML = '<option value="">-- Select X Axis --</option>';
                yAxisSelect.innerHTML = '<option value="">-- Select Y Axis --</option>';
                this.currentDataset = null;
                return;
            }
            
            const dataset = datasetStore.get(datasetId);
            if (!dataset) {
                return;
            }
            
            this.currentDataset = dataset;
            
            // Populate both X and Y axis selectors with columns and metrics
            // Use document fragment for better performance
            this.populateAxisSelector(xAxisSelect, dataset);
            this.populateAxisSelector(yAxisSelect, dataset);
            
            xAxisSelect.disabled = false;
            yAxisSelect.disabled = false;
        });
    }
    
    /**
     * Populates an axis selector with columns and metrics from the dataset
     * @param {HTMLElement} selector - The select element to populate
     * @param {Object} dataset - The dataset object
     */
    populateAxisSelector(selector, dataset) {
        selector.innerHTML = '<option value="">-- Select --</option>';
        
        // Add columns section
        if (dataset.columns && dataset.columns.length > 0) {
            const columnGroup = document.createElement('optgroup');
            columnGroup.label = 'Columns';
            dataset.columns.forEach(column => {
                const option = document.createElement('option');
                option.value = `column:${column}`;
                option.textContent = `📊 ${this.formatColumnName(column)}`;
                columnGroup.appendChild(option);
            });
            selector.appendChild(columnGroup);
        }
        
        // Add metrics section
        const metrics = metricsStore.getByDataset(dataset.id);
        if (metrics && metrics.length > 0) {
            const metricGroup = document.createElement('optgroup');
            metricGroup.label = 'Metrics';
            metrics.forEach(metric => {
                const option = document.createElement('option');
                option.value = `metric:${metric.id}`;
                option.textContent = `📈 ${metric.name} (${this.formatMetricValue(metric.value)})`;
                metricGroup.appendChild(option);
            });
            selector.appendChild(metricGroup);
        }
    }
    
    formatMetricValue(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return String(value);
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        } else if (num % 1 === 0) {
            return num.toString();
        } else {
            return num.toFixed(2);
        }
    }
    
    /**
     * Auto-renders the chart when selections change
     * Debounced to prevent jitter from rapid changes
     */
    autoRender() {
        // Clear any pending render
        if (this._autoRenderTimeout) {
            clearTimeout(this._autoRenderTimeout);
        }
        
        // Debounce the render
        this._autoRenderTimeout = setTimeout(() => {
            requestAnimationFrame(() => {
                this._performAutoRender();
            });
        }, 200);
    }
    
    _performAutoRender() {
        if (!this.xAxisSelection || !this.yAxisSelection) {
            // Clear chart if not all required fields are selected
            this.clearChart();
            return;
        }
        
        // Ensure both selections are from the same dataset
        if (this.xAxisSelection.datasetId !== this.yAxisSelection.datasetId) {
            this.clearChart();
            return;
        }
        
        // Render chart automatically
        this.renderChart();
    }
    
    /**
     * Clears the current chart
     */
    clearChart() {
        const chartsContainer = this.container.querySelector('#charts-container');
        if (chartsContainer) {
            chartsContainer.innerHTML = '';
        }
        this.charts = [];
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
    
    renderChart() {
        if (!this.xAxisSelection || !this.yAxisSelection) {
            return;
        }
        
        const chartTypeSelect = this.container.querySelector('#chart-type-select');
        const chartType = chartTypeSelect ? chartTypeSelect.value : 'line';
        
        const datasetId = this.xAxisSelection.datasetId;
        const dataset = datasetStore.get(datasetId);
        if (!dataset) {
            return;
        }
        
        // Clear previous chart
        this.clearChart();
        
        const xAxis = this.xAxisSelection;
        const yAxis = this.yAxisSelection;
        
        // Handle special case: both axes are metrics - show KPI cards
        if (xAxis.type === 'metric' && yAxis.type === 'metric') {
            const xMetric = metricsStore.get(xAxis.value);
            const yMetric = metricsStore.get(yAxis.value);
            if (xMetric) this.renderKPICard(xMetric);
            if (yMetric) this.renderKPICard(yMetric);
            return;
        }
        
        // Handle case where Y is a metric but X is a column - show reference line
        if (yAxis.type === 'metric' && xAxis.type === 'column') {
            const metric = metricsStore.get(yAxis.value);
            if (!metric) return;
            
            const data = this.getDatasetData(dataset);
            if (!data || data.length === 0) return;
            
            // Find a numeric column for the main series
            const numericColumns = dataset.columns.filter(col => {
                const sampleValue = data[0] && data[0][col];
                return sampleValue !== null && sampleValue !== undefined && 
                       (typeof sampleValue === 'number' || !isNaN(parseFloat(sampleValue)));
            });
            
            if (numericColumns.length === 0) {
                // No numeric columns, just show the metric as reference line with X column
                this.renderChartWithReferenceLine(datasetId, xAxis.value, yAxis.value, chartType, metric);
                return;
            }
            
            // Use first numeric column as main series
            const mainColumn = numericColumns[0];
            this.renderChartWithReferenceLine(datasetId, xAxis.value, yAxis.value, chartType, metric, mainColumn);
            return;
        }
        
        // Standard case: both axes are columns, or X is metric and Y is column
        // For now, we'll require at least one column for the chart
        if (xAxis.type !== 'column' && yAxis.type !== 'column') {
            return;
        }
        
        const data = this.getDatasetData(dataset);
        if (!data || data.length === 0) return;
        
        // Determine X and Y columns/values
        let xColumn, yColumn, yLabel;
        
        if (xAxis.type === 'column') {
            xColumn = xAxis.value;
        } else {
            // X is metric - use index or first column
            xColumn = dataset.columns[0] || 'index';
        }
        
        if (yAxis.type === 'column') {
            yColumn = yAxis.value;
            yLabel = this.formatColumnName(yColumn);
        } else {
            // Y is metric - create constant value series
            const metric = metricsStore.get(yAxis.value);
            if (!metric) return;
            
            // Create data with metric value
            const metricData = data.map(row => ({
                x: row[xColumn],
                y: parseFloat(metric.value) || 0
            }));
            
            const seriesData = this.convertToHighchartsSeries(metricData, 'x', 'y', chartType);
            yLabel = metric.name;
            
            const chartId = `chart_${Date.now()}`;
            const chartContainer = document.createElement('div');
            chartContainer.id = chartId;
            chartContainer.className = 'chart-wrapper';
            
            const chartsContainer = this.container.querySelector('#charts-container');
            chartsContainer.appendChild(chartContainer);
            
            const stylingOptions = this.getStylingOptions();
            
            this.renderHighchart(chartId, chartType, seriesData, {
                xLabel: stylingOptions.xLabel || this.formatColumnName(xColumn),
                yLabel: stylingOptions.yLabel || yLabel,
                title: stylingOptions.title || `${yLabel} vs ${this.formatColumnName(xColumn)}`,
                color: stylingOptions.color,
                showTrendline: stylingOptions.showTrendline
            });
            return;
        }
        
        // Both are columns - standard chart
        let seriesData;
        try {
            seriesData = this.convertToHighchartsSeries(data, xColumn, yColumn, chartType);
        } catch (error) {
            console.error('Error preparing chart data:', error);
            return;
        }
        
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        const stylingOptions = this.getStylingOptions();
        
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
    renderChartWithReferenceLine(datasetId, xColumn, metricId, chartType, metric, mainColumn = null) {
        const dataset = datasetStore.get(datasetId);
        if (!dataset) {
            return;
        }
        
        const data = this.getDatasetData(dataset);
        if (!data || data.length === 0) {
            return;
        }
        
        // For reference line, we need a Y column to plot
        let yColumn = mainColumn;
        
        if (!yColumn) {
            // Use the first numeric column as the main series
            const numericColumns = dataset.columns.filter(col => {
                const sampleValue = data[0] && data[0][col];
                return sampleValue !== null && sampleValue !== undefined && 
                       (typeof sampleValue === 'number' || !isNaN(parseFloat(sampleValue)));
            });
            
            if (numericColumns.length === 0) {
                // No numeric columns - just show the reference line
                yColumn = null;
            } else {
                yColumn = numericColumns[0];
            }
        }
        
        if (!yColumn) {
            // Can't render without a Y column
            return;
        }
        
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
        // Check if dataset exists
        if (dataset && !datasetStore.exists(dataset.id)) {
            this.showDatasetMissingError(dataset);
            this.currentDataset = null;
            this.refreshCharts();
            return;
        }
        
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
    
    /**
     * Selects a dataset in the visualization builder
     * @param {string} datasetId - Dataset ID to select
     */
    showDatasetMissingError(dataset) {
        const chartsContainer = this.container.querySelector('#charts-container');
        if (chartsContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'chart-error-message';
            errorDiv.innerHTML = `
                <div class="error-icon">⚠️</div>
                <div class="error-text">
                    <strong>Dataset "${dataset.name}" is missing or has been deleted.</strong>
                    <p>Charts for this dataset cannot be displayed. Please select a different dataset.</p>
                </div>
            `;
            chartsContainer.innerHTML = '';
            chartsContainer.appendChild(errorDiv);
        }
    }
    
    selectDataset(datasetId) {
        // Check if dataset exists
        if (!datasetStore.exists(datasetId)) {
            const dataset = { id: datasetId, name: 'Unknown Dataset' };
            this.showDatasetMissingError(dataset);
            this.currentDataset = null;
            return;
        }
        const datasetSelect = this.container.querySelector('#dataset-select');
        if (datasetSelect) {
            datasetSelect.value = datasetId;
            this.onDatasetSelected();
        }
    }
}


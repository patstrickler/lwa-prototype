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
                            <div class="axis-selection-display droppable-axis" 
                                 id="x-axis-display" 
                                 data-axis="x"
                                 draggable="false">
                                <div class="axis-selection-content">
                                    <span class="selection-placeholder">Drag & drop or click to select</span>
                                </div>
                                <button class="axis-select-btn" data-axis="x" title="Click to select field">▼</button>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Y Axis Selection:</label>
                            <div class="axis-selection-display droppable-axis" 
                                 id="y-axis-display" 
                                 data-axis="y"
                                 draggable="false">
                                <div class="axis-selection-content">
                                    <span class="selection-placeholder">Drag & drop or click to select</span>
                                </div>
                                <button class="axis-select-btn" data-axis="y" title="Click to select field">▼</button>
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
        
        // Update axis displays if selections exist
        if (this.xAxisSelection) {
            this.updateAxisDisplay('x-axis-display', this.xAxisSelection);
        }
        if (this.yAxisSelection) {
            this.updateAxisDisplay('y-axis-display', this.yAxisSelection);
        }
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
        
        // Drag and drop handlers for axis selection
        const xAxisDisplay = this.container.querySelector('#x-axis-display');
        const yAxisDisplay = this.container.querySelector('#y-axis-display');
        
        if (xAxisDisplay) {
            this.setupDragAndDrop(xAxisDisplay, 'x');
        }
        if (yAxisDisplay) {
            this.setupDragAndDrop(yAxisDisplay, 'y');
        }
        
        // Click handlers for axis selection dropdown
        const axisSelectBtns = this.container.querySelectorAll('.axis-select-btn');
        axisSelectBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const axis = btn.getAttribute('data-axis');
                this.showAxisSelectionDropdown(axis, btn);
            });
        });
        
        // Click on axis display to show dropdown
        if (xAxisDisplay) {
            xAxisDisplay.addEventListener('click', (e) => {
                if (!e.target.closest('.axis-select-btn') && !e.target.closest('.selected-item')) {
                    this.showAxisSelectionDropdown('x', xAxisDisplay.querySelector('.axis-select-btn'));
                }
            });
        }
        if (yAxisDisplay) {
            yAxisDisplay.addEventListener('click', (e) => {
                if (!e.target.closest('.axis-select-btn') && !e.target.closest('.selected-item')) {
                    this.showAxisSelectionDropdown('y', yAxisDisplay.querySelector('.axis-select-btn'));
                }
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.axis-selection-dropdown') && !e.target.closest('.axis-select-btn') && !e.target.closest('.axis-selection-display')) {
                this.closeAxisSelectionDropdown();
            }
        });
        
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
        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select --';
        fragment.appendChild(placeholder);
        
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
            fragment.appendChild(columnGroup);
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
            fragment.appendChild(metricGroup);
        }
        
        // Batch DOM update
        requestAnimationFrame(() => {
            selector.innerHTML = '';
            selector.appendChild(fragment);
        });
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
    
    /**
     * Sets up drag and drop for an axis selection display
     * @param {HTMLElement} axisDisplay - The axis display element
     * @param {string} axis - 'x' or 'y'
     */
    setupDragAndDrop(axisDisplay, axis) {
        if (!axisDisplay) return;
        
        // Store drag type for visual feedback
        let currentDragType = null;
        
        // Listen for dragenter to detect type from source
        document.addEventListener('dragstart', (e) => {
            const draggableItem = e.target.closest('.draggable-item');
            if (draggableItem) {
                currentDragType = draggableItem.getAttribute('data-type');
            }
        });
        
        document.addEventListener('dragend', () => {
            currentDragType = null;
        });
        
        // Allow dropping
        axisDisplay.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            axisDisplay.classList.add('drag-over');
            
            // Add type-specific class for visual feedback
            if (currentDragType === 'column') {
                axisDisplay.classList.add('column-drop');
                axisDisplay.classList.remove('metric-drop');
            } else if (currentDragType === 'metric') {
                axisDisplay.classList.add('metric-drop');
                axisDisplay.classList.remove('column-drop');
            }
        });
        
        axisDisplay.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove classes if we're actually leaving the drop zone
            if (!axisDisplay.contains(e.relatedTarget)) {
                axisDisplay.classList.remove('drag-over', 'column-drop', 'metric-drop');
            }
        });
        
        axisDisplay.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            axisDisplay.classList.remove('drag-over', 'column-drop', 'metric-drop');
            
            const dragData = e.dataTransfer.getData('application/json');
            if (dragData) {
                try {
                    const data = JSON.parse(dragData);
                    if (data.type && data.value && data.datasetId) {
                        this.selectAxis(data.type, data.value, data.datasetId, axis);
                    }
                } catch (error) {
                    console.error('Error parsing drag data:', error);
                }
            }
            currentDragType = null;
        });
    }
    
    /**
     * Shows a dropdown with available fields for axis selection
     * @param {string} axis - 'x' or 'y'
     * @param {HTMLElement} triggerElement - Element that triggered the dropdown
     */
    showAxisSelectionDropdown(axis, triggerElement) {
        // Close any existing dropdown
        this.closeAxisSelectionDropdown();
        
        // Get current dataset from browser or stored selection
        let dataset = null;
        if (this.xAxisSelection) {
            dataset = datasetStore.get(this.xAxisSelection.datasetId);
        } else if (this.yAxisSelection) {
            dataset = datasetStore.get(this.yAxisSelection.datasetId);
        }
        
        // If no dataset, try to get from dataset browser
        if (!dataset) {
            const datasetBrowser = document.querySelector('#dataset-browser-visualization');
            if (datasetBrowser) {
                const select = datasetBrowser.querySelector('.dataset-browser-select');
                if (select && select.value) {
                    dataset = datasetStore.get(select.value);
                }
            }
        }
        
        if (!dataset) {
            alert('Please select a dataset first from the left panel.');
            return;
        }
        
        const axisDisplay = this.container.querySelector(`#${axis}-axis-display`);
        if (!axisDisplay || !triggerElement) return;
        
        // Get position for dropdown
        const rect = triggerElement.getBoundingClientRect();
        const axisRect = axisDisplay.getBoundingClientRect();
        
        // Get columns and metrics
        const columns = dataset.columns || [];
        const metrics = metricsStore.getByDataset(dataset.id) || [];
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'axis-selection-dropdown';
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.left = `${axisRect.left}px`;
        dropdown.style.width = `${axisRect.width}px`;
        dropdown.style.zIndex = '1000';
        
        dropdown.innerHTML = `
            <div class="dropdown-header">
                <span>Select ${axis.toUpperCase()} Axis</span>
                <button class="dropdown-close" onclick="this.closest('.axis-selection-dropdown').remove()">×</button>
            </div>
            <div class="dropdown-content">
                ${columns.length > 0 ? `
                    <div class="dropdown-section">
                        <div class="dropdown-section-title">Columns</div>
                        ${columns.map(col => `
                            <div class="dropdown-item column-item" 
                                 data-type="column" 
                                 data-value="${this.escapeHtml(col)}"
                                 data-dataset="${dataset.id}">
                                <span class="item-icon">📊</span>
                                <span class="item-name">${this.escapeHtml(this.formatColumnName(col))}</span>
                                <span class="item-type">${this.inferColumnType(dataset, col)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${metrics.length > 0 ? `
                    <div class="dropdown-section">
                        <div class="dropdown-section-title">Metrics</div>
                        ${metrics.map(metric => `
                            <div class="dropdown-item metric-item" 
                                 data-type="metric" 
                                 data-value="${metric.id}"
                                 data-dataset="${dataset.id}">
                                <span class="item-icon">📈</span>
                                <div class="item-info">
                                    <span class="item-name">${this.escapeHtml(metric.name)}</span>
                                    <span class="item-value">${this.formatMetricValue(metric.value)}</span>
                                </div>
                                <span class="item-operation">${this.escapeHtml(metric.operation || '')}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${columns.length === 0 && metrics.length === 0 ? `
                    <div class="empty-state-small">No columns or metrics available</div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(dropdown);
        
        // Add click handlers for dropdown items
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.getAttribute('data-type');
                const value = item.getAttribute('data-value');
                const datasetId = item.getAttribute('data-dataset');
                this.selectAxis(type, value, datasetId, axis);
                this.closeAxisSelectionDropdown();
            });
        });
        
        // Store reference for closing
        this.currentDropdown = dropdown;
    }
    
    /**
     * Closes the axis selection dropdown
     */
    closeAxisSelectionDropdown() {
        if (this.currentDropdown) {
            this.currentDropdown.remove();
            this.currentDropdown = null;
        }
    }
    
    /**
     * Handles axis selection from the dataset browser or dropdown
     * @param {string} type - 'column' or 'metric'
     * @param {string} value - Column name or metric ID
     * @param {string} datasetId - Dataset ID
     * @param {string} axis - 'x' or 'y'
     */
    selectAxis(type, value, datasetId, axis = null) {
        if (!axis) {
            // If no axis specified, use the one that's not set, or default to X
            axis = !this.xAxisSelection ? 'x' : (!this.yAxisSelection ? 'y' : 'x');
        }
        
        const selection = { type, value, datasetId };
        
        if (axis === 'x') {
            this.xAxisSelection = selection;
            this.updateAxisDisplay('x-axis-display', selection);
        } else {
            this.yAxisSelection = selection;
            this.updateAxisDisplay('y-axis-display', selection);
        }
        
        this.autoRender();
    }
    
    /**
     * Updates the axis selection display
     * @param {string} displayId - ID of the display element
     * @param {Object} selection - Selection object or null
     */
    updateAxisDisplay(displayId, selection) {
        const display = this.container.querySelector(`#${displayId}`);
        if (!display) return;
        
        // Get or create content container
        let contentContainer = display.querySelector('.axis-selection-content');
        if (!contentContainer) {
            contentContainer = document.createElement('div');
            contentContainer.className = 'axis-selection-content';
            const placeholder = display.querySelector('.selection-placeholder');
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.insertBefore(contentContainer, placeholder);
            } else {
                display.insertBefore(contentContainer, display.querySelector('.axis-select-btn'));
            }
        }
        
        // Clear content container
        contentContainer.innerHTML = '';
        
        // Clear placeholder
        const placeholder = display.querySelector('.selection-placeholder');
        if (placeholder) {
            placeholder.style.display = selection ? 'none' : 'block';
        }
        
        if (!selection) {
            return;
        }
        
        const dataset = datasetStore.get(selection.datasetId);
        if (!dataset) return;
        
        const selectedItem = document.createElement('div');
        
        if (selection.type === 'column') {
            selectedItem.className = 'selected-item column-selected';
            selectedItem.innerHTML = `
                <span class="item-icon">📊</span>
                <span class="item-name">${this.escapeHtml(this.formatColumnName(selection.value))}</span>
                <span class="item-type">Column</span>
                <button class="remove-selection" title="Remove selection">×</button>
            `;
        } else {
            const metric = metricsStore.get(selection.value);
            if (metric) {
                selectedItem.className = 'selected-item metric-selected';
                selectedItem.innerHTML = `
                    <span class="item-icon">📈</span>
                    <div class="item-info">
                        <span class="item-name">${this.escapeHtml(metric.name)}</span>
                        <span class="item-value">${this.formatMetricValue(metric.value)}</span>
                    </div>
                    <span class="item-type">Metric</span>
                    <button class="remove-selection" title="Remove selection">×</button>
                `;
            }
        }
        
        // Add remove button handler
        const removeBtn = selectedItem.querySelector('.remove-selection');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (displayId === 'x-axis-display') {
                    this.xAxisSelection = null;
                } else {
                    this.yAxisSelection = null;
                }
                this.updateAxisDisplay(displayId, null);
                this.autoRender();
            });
        }
        
        contentContainer.appendChild(selectedItem);
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
    
    inferColumnType(dataset, columnName) {
        if (!dataset.rows || dataset.rows.length === 0) {
            return 'unknown';
        }
        
        const columnIndex = dataset.columns.indexOf(columnName);
        if (columnIndex === -1) return 'unknown';
        
        const sampleValues = dataset.rows
            .map(row => row[columnIndex])
            .filter(val => val !== null && val !== undefined)
            .slice(0, 10);
        
        if (sampleValues.length === 0) return 'unknown';
        
        const allNumeric = sampleValues.every(val => {
            const num = parseFloat(val);
            return !isNaN(num) && isFinite(num);
        });
        
        if (allNumeric) return 'numeric';
        
        const allDates = sampleValues.every(val => {
            const str = String(val);
            return /^\d{4}-\d{2}-\d{2}/.test(str) || !isNaN(Date.parse(str));
        });
        
        if (allDates) return 'date';
        
        return 'text';
    }
    
    /**
     * Handles item selection from dataset browser
     * @param {string} type - 'column' or 'metric'
     * @param {string} value - Column name or metric ID
     * @param {string} datasetId - Dataset ID
     */
    handleBrowserItemSelection(type, value, datasetId) {
        if (!value) {
            // Item was deselected
            return;
        }
        
        // Determine which axis to set (alternate between X and Y)
        if (!this.xAxisSelection) {
            this.selectAxis(type, value, datasetId, 'x');
        } else if (!this.yAxisSelection) {
            this.selectAxis(type, value, datasetId, 'y');
        } else {
            // Both are set, replace the one that was clicked (we'll need to track last click)
            // For now, replace Y axis
            this.selectAxis(type, value, datasetId, 'y');
        }
    }
    
    clearSelections() {
        this.xAxisSelection = null;
        this.yAxisSelection = null;
        this.updateAxisDisplay('x-axis-display', null);
        this.updateAxisDisplay('y-axis-display', null);
        this.clearChart();
    }
}


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
        ySelectType.addEventListener('change', () => this.onYTypeChanged());
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
        
        // Create chart container
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        // Prepare chart data
        let chartData;
        let yLabel;
        
        if (yType === 'metric') {
            const metric = metricsStore.get(yValue);
            if (!metric) {
                alert('Metric not found.');
                chartContainer.remove();
                return;
            }
            // For metrics, create a constant value chart
            chartData = data.map(row => ({
                x: row[xColumn],
                y: parseFloat(metric.value) || 0
            }));
            yLabel = metric.name;
        } else {
            // Use Y column from dataset
            chartData = data.map(row => ({
                x: row[xColumn],
                y: parseFloat(row[yValue]) || 0
            }));
            yLabel = this.formatColumnName(yValue);
        }
        
        // Render with Highcharts
        this.renderHighchart(chartId, chartType, chartData, {
            xLabel: this.formatColumnName(xColumn),
            yLabel: yLabel,
            title: `${yLabel} vs ${this.formatColumnName(xColumn)}`
        });
    }
    
    renderHighchart(containerId, chartType, data, options) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Sort data by x value for line and bar charts
        if (chartType === 'line' || chartType === 'bar') {
            data.sort((a, b) => {
                if (typeof a.x === 'number' && typeof b.x === 'number') {
                    return a.x - b.x;
                }
                return String(a.x).localeCompare(String(b.x));
            });
        }
        
        const chartConfig = {
            chart: {
                type: chartType === 'scatter' ? 'scatter' : chartType,
                renderTo: containerId
            },
            title: {
                text: options.title || 'Chart'
            },
            xAxis: {
                title: {
                    text: options.xLabel || 'X Axis'
                },
                type: chartType === 'scatter' ? 'linear' : 'category'
            },
            yAxis: {
                title: {
                    text: options.yLabel || 'Y Axis'
                }
            },
            series: [{
                name: options.yLabel || 'Series 1',
                data: data.map(point => chartType === 'scatter' ? [point.x, point.y] : point.y)
            }],
            legend: {
                enabled: true
            },
            credits: {
                enabled: false
            }
        };
        
        // For line and bar charts, set categories from x values
        if (chartType === 'line' || chartType === 'bar') {
            chartConfig.xAxis.categories = data.map(point => String(point.x));
        }
        
        try {
            new Highcharts.Chart(chartConfig);
        } catch (error) {
            console.error('Error rendering chart:', error);
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">Error rendering chart: ${error.message}</p>
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


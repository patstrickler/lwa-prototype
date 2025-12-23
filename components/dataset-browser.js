// Dataset Browser Component
// Displays available datasets with their columns and metrics in a sidebar

import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';

export class DatasetBrowser {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.selectedDataset = null;
        this.onDatasetSelectCallbacks = [];
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        // Refresh periodically to catch new datasets and metrics
        setInterval(() => this.refresh(), 2000);
    }
    
    render() {
        if (!this.container) return;
        
        const datasets = datasetStore.getAll();
        
        this.container.innerHTML = `
            <div class="dataset-browser">
                <div class="browser-header">
                    <h3>Datasets</h3>
                </div>
                <div class="browser-content">
                    ${datasets.length === 0 
                        ? '<div class="empty-state">No datasets available. Create a dataset from the Query Builder.</div>'
                        : datasets.map(dataset => this.renderDataset(dataset)).join('')
                    }
                </div>
            </div>
        `;
    }
    
    renderDataset(dataset) {
        const metrics = metricsStore.getByDataset(dataset.id);
        const isSelected = this.selectedDataset && this.selectedDataset.id === dataset.id;
        
        const columnsHtml = dataset.columns && dataset.columns.length > 0
            ? dataset.columns.map(col => `
                <div class="dataset-column" data-dataset="${dataset.id}" data-column="${col}">
                    <span class="column-icon">📊</span>
                    <span class="column-name">${this.formatColumnName(col)}</span>
                    <span class="column-type">${this.inferColumnType(dataset, col)}</span>
                </div>
            `).join('')
            : '<div class="empty-state-small">No columns</div>';
        
        const metricsHtml = metrics && metrics.length > 0
            ? metrics.map(metric => `
                <div class="dataset-metric" data-dataset="${dataset.id}" data-metric="${metric.id}">
                    <span class="metric-icon">📈</span>
                    <div class="metric-info">
                        <span class="metric-name">${metric.name}</span>
                        <span class="metric-value">${this.formatMetricValue(metric.value)}</span>
                    </div>
                    <span class="metric-operation">${metric.operation || ''}</span>
                </div>
            `).join('')
            : '<div class="empty-state-small">No metrics defined</div>';
        
        return `
            <div class="dataset-item ${isSelected ? 'selected' : ''}" data-dataset="${dataset.id}">
                <div class="dataset-header" data-dataset="${dataset.id}">
                    <span class="dataset-icon">🗂️</span>
                    <span class="dataset-name">${dataset.name}</span>
                    <span class="dataset-toggle">${isSelected ? '▲' : '▼'}</span>
                </div>
                <div class="dataset-info">
                    <div class="dataset-meta">
                        <span class="meta-item">${dataset.columns ? dataset.columns.length : 0} columns</span>
                        <span class="meta-item">${dataset.rows ? dataset.rows.length : 0} rows</span>
                    </div>
                </div>
                <div class="dataset-details" style="display: ${isSelected ? 'block' : 'none'};">
                    <div class="dataset-section">
                        <div class="section-header">
                            <span class="section-icon">📋</span>
                            <span class="section-title">Columns</span>
                        </div>
                        <div class="dataset-columns">
                            ${columnsHtml}
                        </div>
                    </div>
                    <div class="dataset-section">
                        <div class="section-header">
                            <span class="section-icon">📈</span>
                            <span class="section-title">Metrics</span>
                        </div>
                        <div class="dataset-metrics">
                            ${metricsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    formatColumnName(column) {
        return column
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
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
        
        // Sample first few non-null values
        const sampleValues = dataset.rows
            .map(row => row[columnIndex])
            .filter(val => val !== null && val !== undefined)
            .slice(0, 10);
        
        if (sampleValues.length === 0) return 'unknown';
        
        // Check if all samples are numbers
        const allNumeric = sampleValues.every(val => {
            const num = parseFloat(val);
            return !isNaN(num) && isFinite(num);
        });
        
        if (allNumeric) {
            return 'numeric';
        }
        
        // Check if all samples look like dates
        const allDates = sampleValues.every(val => {
            const str = String(val);
            return /^\d{4}-\d{2}-\d{2}/.test(str) || !isNaN(Date.parse(str));
        });
        
        if (allDates) {
            return 'date';
        }
        
        return 'text';
    }
    
    attachEventListeners() {
        if (!this.container) return;
        
        // Dataset header click to expand/collapse and select
        this.container.addEventListener('click', (e) => {
            const datasetHeader = e.target.closest('.dataset-header');
            if (datasetHeader) {
                const datasetId = datasetHeader.getAttribute('data-dataset');
                this.toggleDataset(datasetId);
                e.stopPropagation();
                return;
            }
            
            // Column click
            const column = e.target.closest('.dataset-column');
            if (column) {
                const datasetId = column.getAttribute('data-dataset');
                const columnName = column.getAttribute('data-column');
                this.onColumnClick(datasetId, columnName);
                e.stopPropagation();
                return;
            }
            
            // Metric click
            const metric = e.target.closest('.dataset-metric');
            if (metric) {
                const datasetId = metric.getAttribute('data-dataset');
                const metricId = metric.getAttribute('data-metric');
                this.onMetricClick(datasetId, metricId);
                e.stopPropagation();
                return;
            }
        });
    }
    
    toggleDataset(datasetId) {
        const dataset = datasetStore.get(datasetId);
        if (!dataset) return;
        
        if (this.selectedDataset && this.selectedDataset.id === datasetId) {
            // Collapse if already selected
            this.selectedDataset = null;
        } else {
            // Select and expand
            this.selectedDataset = dataset;
            this.notifyDatasetSelected(dataset);
        }
        
        this.render();
    }
    
    onColumnClick(datasetId, columnName) {
        // Could emit event or highlight in visualization builder
        console.log('Column clicked:', datasetId, columnName);
    }
    
    onMetricClick(datasetId, metricId) {
        // Could emit event or highlight in visualization builder
        console.log('Metric clicked:', datasetId, metricId);
    }
    
    refresh() {
        // Only re-render if we have a selected dataset to preserve state
        if (this.selectedDataset) {
            const currentId = this.selectedDataset.id;
            const updated = datasetStore.get(currentId);
            if (updated) {
                this.selectedDataset = updated;
            }
        }
        this.render();
    }
    
    onDatasetSelect(callback) {
        this.onDatasetSelectCallbacks.push(callback);
    }
    
    notifyDatasetSelected(dataset) {
        this.onDatasetSelectCallbacks.forEach(callback => callback(dataset));
    }
    
    selectDataset(datasetId) {
        const dataset = datasetStore.get(datasetId);
        if (dataset) {
            this.selectedDataset = dataset;
            this.render();
            this.notifyDatasetSelected(dataset);
        }
    }
}

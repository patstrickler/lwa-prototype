// Analysis Panel Component
// Metrics & scripts on datasets

import { DatasetSelector } from './dataset-selector.js';
import { MetricDefinitionDialog } from './metric-definition-dialog.js';
import { metricsStore } from '../data/metrics.js';

export class AnalysisPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentDataset = null;
        this.metricsCallbacks = [];
        this.datasetCallbacks = [];
        this.datasetSelector = null;
        this.metricDialog = null;
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.initDatasetSelector();
        this.initMetricDialog();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="analysis-panel">
                <div id="dataset-selector-container"></div>
                
                <div class="metrics-section">
                    <h3>Metrics</h3>
                    <div id="metrics-list"></div>
                    <button id="add-metric" class="btn btn-primary">Add Metric</button>
                </div>
                
                <div class="scripts-section">
                    <h3>Analysis Scripts</h3>
                    <div id="scripts-list"></div>
                    <button id="add-script" class="btn btn-primary">Add Script</button>
                </div>
            </div>
        `;
    }
    
    initDatasetSelector() {
        this.datasetSelector = new DatasetSelector('#dataset-selector-container');
        this.datasetSelector.onSelection((dataset) => {
            this.setDataset(dataset);
        });
    }
    
    initMetricDialog() {
        this.metricDialog = new MetricDefinitionDialog();
        this.metricDialog.onCreated((metric) => {
            this.updateMetricsList();
            this.notifyMetricsUpdated([metric]);
        });
    }
    
    attachEventListeners() {
        const addMetricBtn = this.container.querySelector('#add-metric');
        const addScriptBtn = this.container.querySelector('#add-script');
        
        addMetricBtn.addEventListener('click', () => this.showAddMetricDialog());
        addScriptBtn.addEventListener('click', () => this.showAddScriptDialog());
    }
    
    setDataset(dataset) {
        this.currentDataset = dataset;
        if (this.datasetSelector) {
            this.datasetSelector.setSelectedDataset(dataset);
        }
        this.updateMetricsList();
        this.notifyDatasetUpdated(dataset);
    }
    
    refreshDatasetSelector() {
        if (this.datasetSelector) {
            this.datasetSelector.refresh();
        }
    }
    
    updateMetricsList() {
        const metricsList = this.container.querySelector('#metrics-list');
        
        if (!this.currentDataset) {
            metricsList.innerHTML = '<p class="empty-message">Select a dataset to view metrics.</p>';
            return;
        }
        
        const metrics = metricsStore.getByDataset(this.currentDataset.id);
        
        if (metrics.length === 0) {
            metricsList.innerHTML = '<p class="empty-message">No metrics yet. Add a metric to get started.</p>';
            return;
        }
        
        metricsList.innerHTML = metrics.map(metric => {
            const operationLabel = {
                'mean': 'Mean',
                'sum': 'Sum',
                'min': 'Min',
                'max': 'Max',
                'stdev': 'Std Dev'
            }[metric.operation] || metric.operation;
            
            const columnName = metric.column ? this.formatColumnName(metric.column) : 'N/A';
            
            return `
                <div class="metric-item">
                    <div class="metric-header">
                        <span class="metric-name">${this.escapeHtml(metric.name)}</span>
                        <span class="metric-value">${this.formatValue(metric.value)}</span>
                    </div>
                    <div class="metric-details">
                        <span class="metric-operation">${operationLabel}</span>
                        <span class="metric-separator">•</span>
                        <span class="metric-column">${columnName}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    formatColumnName(column) {
        return column
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }
    
    formatValue(value) {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        if (typeof value === 'number') {
            return value.toLocaleString('en-US', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 4 
            });
        }
        return String(value);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showAddMetricDialog() {
        if (this.metricDialog) {
            this.metricDialog.show();
        }
    }
    
    showAddScriptDialog() {
        // TODO: Implement script creation dialog
        alert('Add Script dialog - to be implemented');
    }
    
    onMetricsUpdated(callback) {
        this.metricsCallbacks.push(callback);
    }
    
    onDatasetUpdated(callback) {
        this.datasetCallbacks.push(callback);
    }
    
    notifyMetricsUpdated(metrics) {
        this.metricsCallbacks.forEach(callback => callback(metrics));
    }
    
    notifyDatasetUpdated(dataset) {
        this.datasetCallbacks.forEach(callback => callback(dataset));
    }
}


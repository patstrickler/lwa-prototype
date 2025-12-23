// Analysis Panel Component
// Metrics & scripts on datasets

import { DatasetSelector } from './dataset-selector.js';
import { MetricDefinitionDialog } from './metric-definition-dialog.js';
import { ScriptExecutionPanel } from './script-execution-panel.js';
import { metricsStore } from '../data/metrics.js';
import { datasetStore } from '../data/datasets.js';
import { metricExecutionEngine } from '../utils/metric-execution-engine.js';
import { scriptsStore } from '../data/scripts.js';

export class AnalysisPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentDataset = null;
        this.metricsCallbacks = [];
        this.datasetCallbacks = [];
        this.datasetSelector = null;
        this.metricDialog = null;
        this.scriptPanel = null;
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.initDatasetSelector();
        this.initMetricDialog();
        this.initScriptPanel();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="analysis-panel">
                <div id="dataset-selector-container"></div>
                
                <div class="metrics-section">
                    <div class="metrics-header">
                        <h3>Metrics</h3>
                        <button id="refresh-metrics" class="btn btn-secondary" title="Re-execute all metrics">Refresh</button>
                    </div>
                    <div id="metrics-list"></div>
                    <button id="add-metric" class="btn btn-primary">Add Metric</button>
                </div>
                
                <div class="scripts-section">
                    <h3>Analysis Scripts</h3>
                    <div id="script-execution-container"></div>
                    <div id="scripts-list"></div>
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
    
    initScriptPanel() {
        this.scriptPanel = new ScriptExecutionPanel('#script-execution-container');
        this.scriptPanel.onSaved(() => {
            this.updateScriptsList();
        });
        this.updateScriptsList();
    }
    
    attachEventListeners() {
        const addMetricBtn = this.container.querySelector('#add-metric');
        const refreshMetricsBtn = this.container.querySelector('#refresh-metrics');
        
        addMetricBtn.addEventListener('click', () => this.showAddMetricDialog());
        refreshMetricsBtn.addEventListener('click', () => this.reExecuteMetrics());
    }
    
    setDataset(dataset) {
        // Check if dataset exists
        if (dataset && !datasetStore.exists(dataset.id)) {
            this.showDatasetMissingError(dataset);
            this.currentDataset = null;
            if (this.datasetSelector) {
                this.datasetSelector.setSelectedDataset(null);
            }
            if (this.scriptPanel) {
                this.scriptPanel.setDataset(null);
            }
            this.updateMetricsList();
            this.notifyDatasetUpdated(null);
            return;
        }
        
        this.currentDataset = dataset;
        if (this.datasetSelector) {
            this.datasetSelector.setSelectedDataset(dataset);
        }
        // Update script panel with current dataset
        if (this.scriptPanel) {
            this.scriptPanel.setDataset(dataset);
        }
        // Re-execute metrics when dataset changes to ensure values are up-to-date
        if (dataset) {
            this.reExecuteMetrics();
        } else {
            this.updateMetricsList();
        }
        this.notifyDatasetUpdated(dataset);
    }
    
    showDatasetMissingError(dataset) {
        const datasetSelector = this.container.querySelector('#dataset-selector-container');
        if (datasetSelector) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'dataset-missing-error';
            errorDiv.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">
                        <strong>Dataset "${dataset.name}" is missing or has been deleted.</strong>
                        <p>This dataset is no longer available. Please select a different dataset.</p>
                    </div>
                </div>
            `;
            datasetSelector.innerHTML = '';
            datasetSelector.appendChild(errorDiv);
        }
    }
    
    /**
     * Re-executes all metrics for the current dataset
     * Updates metric values using the execution engine
     */
    reExecuteMetrics() {
        if (!this.currentDataset) {
            return;
        }
        
        // Check if dataset still exists
        if (!datasetStore.exists(this.currentDataset.id)) {
            this.showDatasetMissingError(this.currentDataset);
            this.currentDataset = null;
            this.updateMetricsList();
            return;
        }
        
        const metrics = metricsStore.getByDataset(this.currentDataset.id);
        if (metrics.length === 0) {
            this.updateMetricsList();
            return;
        }
        
        // Get fresh dataset data
        const dataset = datasetStore.get(this.currentDataset.id);
        if (!dataset) {
            console.error('Dataset not found for re-execution');
            this.updateMetricsList();
            return;
        }
        
        // Re-execute each metric
        const updatedMetrics = [];
        metrics.forEach(metric => {
            try {
                // Check if dataset is empty
                if (!dataset.rows || dataset.rows.length === 0) {
                    throw new Error('Dataset is empty. Cannot calculate metrics on an empty dataset.');
                }
                
                // Check if dataset has columns
                if (!dataset.columns || dataset.columns.length === 0) {
                    throw new Error('Dataset has no columns. Cannot calculate metrics.');
                }
                
                const newValue = metricExecutionEngine.executeMetric(metric, dataset);
                const updated = metricsStore.updateValue(metric.id, newValue);
                if (updated) {
                    updatedMetrics.push(updated);
                }
            } catch (error) {
                console.error(`Error re-executing metric ${metric.id}:`, error);
                // Update with null value to indicate error
                metricsStore.updateValue(metric.id, null);
                // Store error message for display
                if (metric) {
                    metric._error = error.message || 'Error calculating metric';
                }
            }
        });
        
        // Update display and notify
        this.updateMetricsList();
        if (updatedMetrics.length > 0) {
            this.notifyMetricsUpdated(updatedMetrics);
        }
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
        
        // Check if dataset still exists
        if (!datasetStore.exists(this.currentDataset.id)) {
            metricsList.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">
                        <strong>Dataset "${this.currentDataset.name}" is missing or has been deleted.</strong>
                        <p>Metrics for this dataset cannot be displayed. Please select a different dataset.</p>
                    </div>
                </div>
            `;
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
                'stdev': 'Std Dev',
                'count': 'Count',
                'count_distinct': 'Count Distinct'
            }[metric.operation] || metric.operation;
            
            const columnName = metric.column ? this.formatColumnName(metric.column) : 'N/A';
            
            // Check if metric has an error
            const hasError = metric.value === null || metric._error;
            const errorMessage = metric._error || (metric.value === null ? 'Calculation failed' : null);
            
            return `
                <div class="metric-item ${hasError ? 'metric-error' : ''}">
                    <div class="metric-header">
                        <span class="metric-name">${this.escapeHtml(metric.name)}</span>
                        <span class="metric-value ${hasError ? 'metric-value-error' : ''}">${hasError ? 'Error' : this.formatValue(metric.value)}</span>
                    </div>
                    <div class="metric-details">
                        <span class="metric-operation">${operationLabel}</span>
                        <span class="metric-separator">•</span>
                        <span class="metric-column">${columnName}</span>
                    </div>
                    ${errorMessage ? `<div class="metric-error-message">${this.escapeHtml(errorMessage)}</div>` : ''}
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
    
    updateScriptsList() {
        const scriptsList = this.container.querySelector('#scripts-list');
        if (!scriptsList) return;
        
        const scripts = scriptsStore.getAll();
        
        if (scripts.length === 0) {
            scriptsList.innerHTML = '<p class="empty-message">No saved scripts yet. Create and save a script to see it here.</p>';
            return;
        }
        
        scriptsList.innerHTML = scripts.map(script => {
            const languageLabel = script.language === 'python' ? 'Python' : 'R';
            const resultType = script.result ? script.result.type : 'none';
            const resultValue = script.result ? this.formatScriptResult(script.result) : 'Not executed';
            
            return `
                <div class="script-item">
                    <div class="script-header">
                        <span class="script-name">${this.escapeHtml(script.name)}</span>
                        <span class="script-language">${languageLabel}</span>
                    </div>
                    <div class="script-code-preview">${this.escapeHtml(script.code.substring(0, 100))}${script.code.length > 100 ? '...' : ''}</div>
                    <div class="script-result-preview">
                        <strong>Last Result:</strong> ${resultType !== 'none' ? `${resultType} - ${resultValue}` : 'Not executed'}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    formatScriptResult(result) {
        if (!result) return 'N/A';
        
        switch (result.type) {
            case 'scalar':
                return typeof result.value === 'number' 
                    ? result.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
                    : String(result.value);
            case 'series':
                return `[${result.value.length} values]`;
            case 'image':
                return 'Chart/Plot';
            default:
                return 'Unknown';
        }
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


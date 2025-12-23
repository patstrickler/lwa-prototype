// Unified Analysis Builder Component
// Combines metric definition and script editing in a single interface

import { MetricDefinitionDialog } from './metric-definition-dialog.js';
import { ScriptExecutionPanel } from './script-execution-panel.js';
import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';
import { metricExecutionEngine } from '../utils/metric-execution-engine.js';

export class UnifiedAnalysisBuilder {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.mode = 'metric'; // 'metric' or 'script'
        this.metricDialog = null;
        this.scriptPanel = null;
        this.currentDataset = null;
        this.init();
    }
    
    init() {
        this.render();
        this.initComponents();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="unified-analysis-builder">
                <div class="builder-header">
                    <div class="mode-selector">
                        <label for="analysis-mode">Analysis Type:</label>
                        <select id="analysis-mode" class="form-control">
                            <option value="metric" selected>Metric</option>
                            <option value="script">Custom Script</option>
                        </select>
                    </div>
                </div>
                
                <div id="metric-builder-container" class="builder-content" style="display: block;">
                    <!-- Metric builder will be rendered here -->
                </div>
                
                <div id="script-builder-container" class="builder-content" style="display: none;">
                    <!-- Script builder will be rendered here -->
                </div>
            </div>
        `;
    }
    
    initComponents() {
        // Initialize metric dialog (it creates its own modal, used for notifications)
        this.metricDialog = new MetricDefinitionDialog();
        
        // Initialize script panel when switching to script mode
        // Don't initialize immediately to avoid rendering issues
    }
    
    initScriptPanel() {
        if (this.scriptPanel) {
            return; // Already initialized
        }
        
        const scriptContainer = this.container.querySelector('#script-builder-container');
        if (scriptContainer && scriptContainer.style.display !== 'none') {
            // Only initialize if container is visible
            this.scriptPanel = new ScriptExecutionPanel('#script-builder-container');
            if (this.currentDataset && this.scriptPanel) {
                this.scriptPanel.setDataset(this.currentDataset);
            }
        }
    }
    
    attachEventListeners() {
        const modeSelect = this.container.querySelector('#analysis-mode');
        modeSelect.addEventListener('change', (e) => {
            this.setMode(e.target.value);
        });
    }
    
    setMode(mode) {
        this.mode = mode;
        const metricContainer = this.container.querySelector('#metric-builder-container');
        const scriptContainer = this.container.querySelector('#script-builder-container');
        
        if (mode === 'metric') {
            metricContainer.style.display = 'block';
            scriptContainer.style.display = 'none';
            this.renderMetricBuilder();
        } else {
            metricContainer.style.display = 'none';
            scriptContainer.style.display = 'block';
            this.initScriptPanel();
        }
    }
    
    renderMetricBuilder() {
        const metricContainer = this.container.querySelector('#metric-builder-container');
        
        // Check if already rendered
        if (metricContainer.querySelector('.metric-builder-form')) {
            return;
        }
        
        metricContainer.innerHTML = `
            <div class="metric-builder-form">
                <div class="form-group">
                    <label for="metric-dataset-select">Dataset:</label>
                    <select id="metric-dataset-select" class="form-control">
                        <option value="">-- Select a dataset --</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="metric-column-select">Column:</label>
                    <select id="metric-column-select" class="form-control" disabled>
                        <option value="">-- Select a column --</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="metric-operation-select">Operation:</label>
                    <select id="metric-operation-select" class="form-control">
                        <option value="">-- Select an operation --</option>
                        <option value="mean">Mean (Average)</option>
                        <option value="sum">Sum</option>
                        <option value="min">Minimum</option>
                        <option value="max">Maximum</option>
                        <option value="stdev">Standard Deviation</option>
                        <option value="count">Count</option>
                        <option value="count_distinct">Count Distinct</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="metric-name-input">Metric Name:</label>
                    <input type="text" id="metric-name-input" class="form-control" placeholder="e.g., Average Sales">
                </div>
                
                <div class="form-actions">
                    <button id="create-metric" class="btn btn-primary" disabled>Create Metric</button>
                    <button id="clear-metric-form" class="btn btn-secondary">Clear</button>
                </div>
                
                <div id="metric-result" class="metric-result"></div>
            </div>
        `;
        
        this.attachMetricListeners();
        this.populateDatasets();
    }
    
    attachMetricListeners() {
        const datasetSelect = this.container.querySelector('#metric-dataset-select');
        const columnSelect = this.container.querySelector('#metric-column-select');
        const operationSelect = this.container.querySelector('#metric-operation-select');
        const nameInput = this.container.querySelector('#metric-name-input');
        const createBtn = this.container.querySelector('#create-metric');
        const clearBtn = this.container.querySelector('#clear-metric-form');
        
        datasetSelect.addEventListener('change', (e) => {
            const datasetId = e.target.value;
            if (datasetId) {
                const dataset = datasetStore.get(datasetId);
                if (dataset) {
                    this.populateColumns(dataset);
                }
            } else {
                columnSelect.innerHTML = '<option value="">-- Select a column --</option>';
                columnSelect.disabled = true;
            }
            this.updateCreateButtonState();
        });
        
        columnSelect.addEventListener('change', () => this.updateCreateButtonState());
        operationSelect.addEventListener('change', () => this.updateCreateButtonState());
        nameInput.addEventListener('input', () => this.updateCreateButtonState());
        
        createBtn.addEventListener('click', () => this.createMetric());
        clearBtn.addEventListener('click', () => this.clearMetricForm());
    }
    
    populateDatasets() {
        const datasetSelect = this.container.querySelector('#metric-dataset-select');
        if (!datasetSelect) return;
        
        const datasets = datasetStore.getAll();
        datasetSelect.innerHTML = '<option value="">-- Select a dataset --</option>';
        
        datasets.forEach(dataset => {
            const option = document.createElement('option');
            option.value = dataset.id;
            option.textContent = dataset.name;
            if (this.currentDataset && dataset.id === this.currentDataset.id) {
                option.selected = true;
            }
            datasetSelect.appendChild(option);
        });
        
        // If current dataset is set, populate columns
        if (this.currentDataset) {
            this.populateColumns(this.currentDataset);
        }
    }
    
    populateColumns(dataset) {
        const columnSelect = this.container.querySelector('#metric-column-select');
        if (!columnSelect) return;
        
        columnSelect.innerHTML = '<option value="">-- Select a column --</option>';
        
        if (dataset && dataset.columns) {
            dataset.columns.forEach(column => {
                const option = document.createElement('option');
                option.value = column;
                option.textContent = this.formatColumnName(column);
                columnSelect.appendChild(option);
            });
            columnSelect.disabled = false;
        } else {
            columnSelect.disabled = true;
        }
    }
    
    formatColumnName(column) {
        return column
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }
    
    updateCreateButtonState() {
        const createBtn = this.container.querySelector('#create-metric');
        const datasetSelect = this.container.querySelector('#metric-dataset-select');
        const columnSelect = this.container.querySelector('#metric-column-select');
        const operationSelect = this.container.querySelector('#metric-operation-select');
        const nameInput = this.container.querySelector('#metric-name-input');
        
        if (!createBtn) return;
        
        const isValid = 
            datasetSelect.value !== '' &&
            columnSelect.value !== '' &&
            operationSelect.value !== '' &&
            nameInput.value.trim() !== '';
        
        createBtn.disabled = !isValid;
    }
    
    async createMetric() {
        const datasetSelect = this.container.querySelector('#metric-dataset-select');
        const columnSelect = this.container.querySelector('#metric-column-select');
        const operationSelect = this.container.querySelector('#metric-operation-select');
        const nameInput = this.container.querySelector('#metric-name-input');
        const resultContainer = this.container.querySelector('#metric-result');
        
        const datasetId = datasetSelect.value;
        const column = columnSelect.value;
        const operation = operationSelect.value;
        const name = nameInput.value.trim();
        
        if (!datasetId || !column || !operation || !name) {
            return;
        }
        
        const dataset = datasetStore.get(datasetId);
        if (!dataset) {
            resultContainer.innerHTML = '<div class="error">Error: Dataset not found</div>';
            return;
        }
        
        // Build metric definition
        const metricDefinition = {
            operation: operation,
            column: column
        };
        
        // Validate metric definition
        const validation = metricExecutionEngine.validate(metricDefinition, dataset.columns);
        if (!validation.isValid) {
            resultContainer.innerHTML = `<div class="error">Error: ${validation.errors.join(', ')}</div>`;
            return;
        }
        
        // Show loading
        resultContainer.innerHTML = '<div class="loading">Calculating metric...</div>';
        
        try {
            // Execute metric using execution engine
            const value = metricExecutionEngine.execute(metricDefinition, dataset.rows, dataset.columns);
            
            if (value === null) {
                resultContainer.innerHTML = '<div class="error">Error: Could not calculate metric. Please ensure the column contains appropriate values.</div>';
                return;
            }
            
            // Create the metric
            const metric = metricsStore.create(
                datasetId,
                name,
                value,
                'calculated',
                column,
                operation
            );
            
            // Show success
            resultContainer.innerHTML = `
                <div class="success">
                    <strong>Metric created successfully!</strong><br>
                    <span class="metric-result-value">${name}: ${this.formatValue(value)}</span>
                </div>
            `;
            
            // Notify listeners
            if (this.metricDialog) {
                this.metricDialog.notifyCreated(metric);
            }
            
            // Clear form after a moment
            setTimeout(() => {
                this.clearMetricForm();
            }, 2000);
            
        } catch (error) {
            resultContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
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
    
    clearMetricForm() {
        const datasetSelect = this.container.querySelector('#metric-dataset-select');
        const columnSelect = this.container.querySelector('#metric-column-select');
        const operationSelect = this.container.querySelector('#metric-operation-select');
        const nameInput = this.container.querySelector('#metric-name-input');
        const resultContainer = this.container.querySelector('#metric-result');
        
        datasetSelect.value = '';
        columnSelect.innerHTML = '<option value="">-- Select a column --</option>';
        columnSelect.disabled = true;
        operationSelect.value = '';
        nameInput.value = '';
        if (resultContainer) resultContainer.innerHTML = '';
    }
    
    setDataset(dataset) {
        this.currentDataset = dataset;
        
        // Update metric builder if in metric mode
        if (this.mode === 'metric') {
            const datasetSelect = this.container.querySelector('#metric-dataset-select');
            if (datasetSelect && dataset) {
                datasetSelect.value = dataset.id;
                this.populateColumns(dataset);
            }
        }
        
        // Update script panel (initialize if needed)
        if (this.mode === 'script') {
            this.initScriptPanel();
        }
        if (this.scriptPanel) {
            this.scriptPanel.setDataset(dataset);
        }
    }
    
    onMetricCreated(callback) {
        if (this.metricDialog) {
            this.metricDialog.onCreated(callback);
        }
    }
    
    onScriptSaved(callback) {
        if (this.scriptPanel) {
            this.scriptPanel.onSaved(callback);
        }
    }
    
    editMetric(metricId) {
        // Switch to metric mode
        this.setMode('metric');
        
        // Load metric into form
        const metric = metricsStore.get(metricId);
        if (!metric) return;
        
        const datasetSelect = this.container.querySelector('#metric-dataset-select');
        const columnSelect = this.container.querySelector('#metric-column-select');
        const operationSelect = this.container.querySelector('#metric-operation-select');
        const nameInput = this.container.querySelector('#metric-name-input');
        
        if (datasetSelect) datasetSelect.value = metric.datasetId;
        if (operationSelect) operationSelect.value = metric.operation || '';
        if (nameInput) nameInput.value = metric.name || '';
        
        const dataset = datasetStore.get(metric.datasetId);
        if (dataset) {
            this.populateColumns(dataset);
            if (columnSelect && metric.column) {
                columnSelect.value = metric.column;
            }
        }
        
        this.updateCreateButtonState();
    }
    
    editScript(scriptId) {
        // Switch to script mode
        this.setMode('script');
        
        // Load script for editing
        if (this.scriptPanel) {
            this.scriptPanel.loadScriptForEditing(scriptId);
        }
    }
}


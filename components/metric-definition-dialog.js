// Metric Definition Dialog Component
// UI to define calculated metrics: select dataset, column, operation

import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';
import { metricExecutionEngine } from '../utils/metric-execution-engine.js';
import { Modal } from '../utils/modal.js';

export class MetricDefinitionDialog {
    constructor() {
        this.dialog = null;
        this.selectedDataset = null;
        this.createCallbacks = [];
        this.editingMetricId = null;
        this.init();
    }
    
    init() {
        this.createDialog();
    }
    
    createDialog() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'metric-dialog-overlay';
        
        // Create dialog container
        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        dialog.id = 'metric-dialog';
        
        dialog.innerHTML = `
            <div class="modal-header">
                <h3>Create Calculated Metric</h3>
                <button class="modal-close" id="metric-dialog-close">&times;</button>
            </div>
            <div class="modal-body">
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
            </div>
            <div class="modal-footer">
                <button id="metric-dialog-cancel" class="btn btn-secondary">Cancel</button>
                <button id="metric-dialog-create" class="btn btn-primary" disabled>Create Metric</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        this.dialog = overlay;
        this.attachEventListeners();
        this.populateDatasets();
    }
    
    attachEventListeners() {
        const closeBtn = this.dialog.querySelector('#metric-dialog-close');
        const cancelBtn = this.dialog.querySelector('#metric-dialog-cancel');
        const createBtn = this.dialog.querySelector('#metric-dialog-create');
        const datasetSelect = this.dialog.querySelector('#metric-dataset-select');
        const columnSelect = this.dialog.querySelector('#metric-column-select');
        const operationSelect = this.dialog.querySelector('#metric-operation-select');
        const nameInput = this.dialog.querySelector('#metric-name-input');
        
        // Close dialog
        closeBtn.addEventListener('click', () => this.hide());
        cancelBtn.addEventListener('click', () => this.hide());
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.hide();
            }
        });
        
        // Dataset selection (debounced to prevent jitter)
        let datasetChangeTimeout;
        datasetSelect.addEventListener('change', (e) => {
            clearTimeout(datasetChangeTimeout);
            datasetChangeTimeout = setTimeout(() => {
                requestAnimationFrame(() => {
                    const datasetId = e.target.value;
                    if (datasetId) {
                        this.selectedDataset = datasetStore.get(datasetId);
                        this.populateColumns(this.selectedDataset);
                    } else {
                        this.selectedDataset = null;
                        columnSelect.innerHTML = '<option value="">-- Select a column --</option>';
                        columnSelect.disabled = true;
                    }
                    this.updateCreateButtonState();
                });
            }, 100);
        });
        
        // Column and operation selection
        columnSelect.addEventListener('change', () => this.updateCreateButtonState());
        operationSelect.addEventListener('change', () => this.updateCreateButtonState());
        nameInput.addEventListener('input', () => this.updateCreateButtonState());
        
        // Create metric
        createBtn.addEventListener('click', () => this.createMetric());
    }
    
    async populateDatasets() {
        const datasetSelect = this.dialog.querySelector('#metric-dataset-select');
        const allDatasets = datasetStore.getAll();
        
        // Filter datasets based on access control
        const { UserManager } = await import('../utils/user-manager.js');
        const userManager = new UserManager();
        const datasets = allDatasets.filter(dataset => {
            return userManager.hasAccessToDataset(dataset);
        });
        
        datasets.forEach(dataset => {
            const option = document.createElement('option');
            option.value = dataset.id;
            option.textContent = dataset.name;
            datasetSelect.appendChild(option);
        });
    }
    
    populateColumns(dataset) {
        const columnSelect = this.dialog.querySelector('#metric-column-select');
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
        const createBtn = this.dialog.querySelector('#metric-dialog-create');
        const datasetSelect = this.dialog.querySelector('#metric-dataset-select');
        const columnSelect = this.dialog.querySelector('#metric-column-select');
        const operationSelect = this.dialog.querySelector('#metric-operation-select');
        const nameInput = this.dialog.querySelector('#metric-name-input');
        
        const isValid = 
            datasetSelect.value !== '' &&
            columnSelect.value !== '' &&
            operationSelect.value !== '' &&
            nameInput.value.trim() !== '';
        
        createBtn.disabled = !isValid;
    }
    
    async createMetric() {
        console.log('[MetricDefinitionDialog.createMetric] Starting metric creation');
        
        const datasetSelect = this.dialog.querySelector('#metric-dataset-select');
        const columnSelect = this.dialog.querySelector('#metric-column-select');
        const operationSelect = this.dialog.querySelector('#metric-operation-select');
        const nameInput = this.dialog.querySelector('#metric-name-input');
        
        const datasetId = datasetSelect.value;
        const column = columnSelect.value;
        const operation = operationSelect.value;
        const name = nameInput.value.trim();
        
        if (!datasetId || !column || !operation || !name) {
            console.warn('[MetricDefinitionDialog.createMetric] Missing required fields', {
                hasDatasetId: !!datasetId,
                hasColumn: !!column,
                hasOperation: !!operation,
                hasName: !!name
            });
            return;
        }
        
        console.log('[MetricDefinitionDialog.createMetric] Creating metric', {
            datasetId,
            column,
            operation,
            name,
            editingMetricId: this.editingMetricId || null
        });
        
        const dataset = datasetStore.get(datasetId);
        if (!dataset) {
            console.error('[MetricDefinitionDialog.createMetric] Dataset not found', { datasetId });
            await Modal.alert('Error: Dataset not found');
            return;
        }
        
        // Build metric definition
        const metricDefinition = {
            operation: operation,
            column: column
        };
        
        // Check if dataset is empty
        if (!dataset.rows || dataset.rows.length === 0) {
            console.error('[MetricDefinitionDialog.createMetric] Dataset is empty', { datasetId });
            await Modal.alert('Error: Cannot calculate metric on an empty dataset. Please select a dataset with data.');
            return;
        }
        
        // Check if dataset has columns
        if (!dataset.columns || dataset.columns.length === 0) {
            console.error('[MetricDefinitionDialog.createMetric] Dataset has no columns', { datasetId });
            await Modal.alert('Error: Dataset has no columns. Cannot calculate metric.');
            return;
        }
        
        // Validate metric definition
        const validation = metricExecutionEngine.validate(metricDefinition, dataset.columns);
        if (!validation.isValid) {
            console.error('[MetricDefinitionDialog.createMetric] Validation failed', {
                errors: validation.errors,
                metricDefinition
            });
            await Modal.alert(`Error: ${validation.errors.join(', ')}`);
            return;
        }
        
        // Execute metric using execution engine
        let value;
        try {
            value = metricExecutionEngine.execute(metricDefinition, dataset.rows, dataset.columns);
            console.log('[MetricDefinitionDialog.createMetric] Metric executed successfully', {
                operation,
                column,
                value
            });
        } catch (error) {
            console.error('[MetricDefinitionDialog.createMetric] Error executing metric:', {
                error: error.message,
                stack: error.stack,
                metricDefinition,
                datasetId,
                rowCount: dataset.rows.length,
                timestamp: new Date().toISOString()
            });
            // Provide user-friendly error messages
            let errorMessage = 'Error executing metric.';
            if (error.message) {
                if (error.message.includes('empty')) {
                    errorMessage = 'Cannot calculate metric: The dataset is empty. Please select a dataset with data.';
                } else if (error.message.includes('Column') && error.message.includes('not found')) {
                    errorMessage = error.message;
                } else if (error.message.includes('numeric values')) {
                    errorMessage = error.message;
                } else {
                    errorMessage = `Error: ${error.message}`;
                }
            }
            await Modal.alert(errorMessage);
            return;
        }
        
        if (value === null) {
            console.warn('[MetricDefinitionDialog.createMetric] Metric calculation returned null', {
                operation,
                column
            });
            await Modal.alert('Error: Could not calculate metric. The column may not contain numeric values, or the calculation failed.');
            return;
        }
        
        // Update existing metric or create new one
        let metric;
        if (this.editingMetricId) {
            console.log('[MetricDefinitionDialog.createMetric] Updating existing metric', {
                metricId: this.editingMetricId
            });
            // Update existing metric
            const existingMetric = metricsStore.get(this.editingMetricId);
            if (existingMetric) {
                // Update the metric value
                metric = metricsStore.updateValue(this.editingMetricId, value);
                // Note: We can't update name, column, operation without modifying the store
                // For now, we'll just update the value
                this.editingMetricId = null;
            }
        } else {
            console.log('[MetricDefinitionDialog.createMetric] Creating new metric');
            // Create new metric
            metric = metricsStore.create(
                datasetId,
                name,
                value,
                'calculated',
                column,
                operation
            );
            console.log('[MetricDefinitionDialog.createMetric] Metric created successfully', {
                metricId: metric.id,
                metricName: metric.name
            });
        }
        
        // Notify listeners
        this.notifyCreated(metric);
        
        // Reset form and hide dialog
        this.resetForm();
        this.hide();
    }
    
    resetForm() {
        const datasetSelect = this.dialog.querySelector('#metric-dataset-select');
        const columnSelect = this.dialog.querySelector('#metric-column-select');
        const operationSelect = this.dialog.querySelector('#metric-operation-select');
        const nameInput = this.dialog.querySelector('#metric-name-input');
        const header = this.dialog.querySelector('.modal-header h3');
        
        datasetSelect.value = '';
        columnSelect.innerHTML = '<option value="">-- Select a column --</option>';
        columnSelect.disabled = true;
        operationSelect.value = '';
        nameInput.value = '';
        this.selectedDataset = null;
        this.editingMetricId = null;
        
        // Reset header
        if (header) {
            header.textContent = 'Create Calculated Metric';
        }
    }
    
    show(metricId = null) {
        if (this.dialog) {
            this.dialog.style.display = 'flex';
            this.populateDatasets();
            
            if (metricId) {
                // Load metric for editing
                const metric = metricsStore.get(metricId);
                if (metric) {
                    this.loadMetricForEditing(metric);
                } else {
                    this.resetForm();
                }
            } else {
                // Reset form when creating new
                this.resetForm();
            }
        }
    }
    
    loadMetricForEditing(metric) {
        const datasetSelect = this.dialog.querySelector('#metric-dataset-select');
        const columnSelect = this.dialog.querySelector('#metric-column-select');
        const operationSelect = this.dialog.querySelector('#metric-operation-select');
        const nameInput = this.dialog.querySelector('#metric-name-input');
        const header = this.dialog.querySelector('.modal-header h3');
        
        // Update header
        if (header) {
            header.textContent = 'Edit Calculated Metric';
        }
        
        // Set dataset
        datasetSelect.value = metric.datasetId;
        const dataset = datasetStore.get(metric.datasetId);
        if (dataset) {
            this.selectedDataset = dataset;
            this.populateColumns(dataset);
            
            // Set column
            if (metric.column) {
                columnSelect.value = metric.column;
            }
        }
        
        // Set operation
        if (metric.operation) {
            operationSelect.value = metric.operation;
        }
        
        // Set name
        if (metric.name) {
            nameInput.value = metric.name;
        }
        
        // Store metric ID for update
        this.editingMetricId = metric.id;
    }
    
    hide() {
        if (this.dialog) {
            this.dialog.style.display = 'none';
        }
    }
    
    onCreated(callback) {
        this.createCallbacks.push(callback);
    }
    
    notifyCreated(metric) {
        this.createCallbacks.forEach(callback => callback(metric));
    }
}


// Dataset Browser Component
// Displays dataset selection dropdown and available columns in a sidebar

import { datasetStore } from '../data/datasets.js';

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
        
        // Filter out any datasets that don't exist (safety check)
        const validDatasets = datasets.filter(ds => {
            const dataset = datasetStore.get(ds.id);
            return dataset !== undefined;
        });
        
        const selectedId = this.selectedDataset ? this.selectedDataset.id : '';
        
        this.container.innerHTML = `
            <div class="dataset-browser">
                <div class="browser-header">
                    <h3>Dataset Selection</h3>
                </div>
                <div class="browser-content">
                    <div class="dataset-selector-section">
                        <label for="dataset-browser-select">Select Dataset:</label>
                        <select id="dataset-browser-select" class="form-control">
                            <option value="">-- Choose Dataset --</option>
                            ${validDatasets.map(ds => `
                                <option value="${ds.id}" ${ds.id === selectedId ? 'selected' : ''}>${ds.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    ${this.selectedDataset ? this.renderDatasetDetails(this.selectedDataset) : ''}
                </div>
            </div>
        `;
    }
    
    renderDatasetDetails(dataset) {
        return `
            <div class="dataset-details-panel">
                <div class="dataset-info-header">
                    <h4>${this.escapeHtml(dataset.name)}</h4>
                    <div class="dataset-stats">
                        <span>${dataset.columns ? dataset.columns.length : 0} columns</span>
                        <span>•</span>
                        <span>${dataset.rows ? dataset.rows.length : 0} rows</span>
                    </div>
                </div>
                
                <div class="columns-section">
                    <div class="section-title">
                        <span class="section-icon">📊</span>
                        <span>Available Columns</span>
                    </div>
                    <div class="columns-list">
                        ${dataset.columns && dataset.columns.length > 0
                            ? dataset.columns.map(col => `
                                <div class="column-item" 
                                     data-column="${this.escapeHtml(col)}"
                                     data-dataset="${dataset.id}">
                                    <span class="column-icon">📊</span>
                                    <div class="column-info">
                                        <span class="column-name">${this.escapeHtml(this.formatColumnName(col))}</span>
                                        <span class="column-original">${this.escapeHtml(col)}</span>
                                    </div>
                                    <span class="column-type-badge">${this.inferColumnType(dataset, col)}</span>
                                </div>
                            `).join('')
                            : '<div class="empty-state-small">No columns available</div>'
                        }
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
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        
        // Dataset dropdown selection
        this.container.addEventListener('change', (e) => {
            if (e.target.id === 'dataset-browser-select') {
                const datasetId = e.target.value;
                if (datasetId) {
                    const dataset = datasetStore.get(datasetId);
                    if (dataset) {
                        this.selectedDataset = dataset;
                        this.render();
                        this.notifyDatasetSelected(dataset);
                    }
                } else {
                    this.selectedDataset = null;
                    this.render();
                }
            }
        });
        
        // Column click (for potential future use)
        this.container.addEventListener('click', (e) => {
            const columnItem = e.target.closest('.column-item');
            if (columnItem) {
                const columnName = columnItem.getAttribute('data-column');
                const datasetId = columnItem.getAttribute('data-dataset');
                // Could emit event for column selection if needed
                console.log('Column selected:', columnName, 'from dataset:', datasetId);
            }
        });
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

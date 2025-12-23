// Dataset Browser Component
// Displays dataset selection dropdown and available columns in a sidebar

import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';

export class DatasetBrowser {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.selectedDataset = null;
        this.onDatasetSelectCallbacks = [];
        this.onItemSelectCallbacks = [];
        this.onEditMetricCallbacks = [];
        this.onEditScriptCallbacks = [];
        this.columnsExpanded = true; // Default to expanded
        this.init();
    }
    
    init() {
        this.attachEventListeners();
        this.render();
        // Refresh periodically to catch new datasets and metrics
        setInterval(() => this.refresh(), 2000);
    }
    
    render() {
        if (!this.container) {
            console.warn('DatasetBrowser: Container not found');
            return;
        }
        
        const datasets = datasetStore.getAll();
        
        // Filter out any datasets that don't exist (safety check)
        const validDatasets = datasets.filter(ds => {
            const dataset = datasetStore.get(ds.id);
            return dataset !== undefined;
        });
        
        const selectedId = this.selectedDataset ? this.selectedDataset.id : '';
        
        // Use a unique ID for the select to avoid conflicts if multiple instances exist
        const selectId = `dataset-browser-select-${Math.random().toString(36).substr(2, 9)}`;
        
        this.container.innerHTML = `
            <div class="dataset-browser">
                <div class="browser-header">
                    <h3>Dataset Selection</h3>
                </div>
                <div class="browser-content">
                    <div class="dataset-selector-section">
                        <label for="${selectId}">Select Dataset:</label>
                        <select id="${selectId}" class="form-control dataset-browser-select">
                            <option value="">-- Choose Dataset --</option>
                            ${validDatasets.map(ds => `
                                <option value="${ds.id}" ${ds.id === selectedId ? 'selected' : ''}>${this.escapeHtml(ds.name)}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    ${this.selectedDataset ? this.renderDatasetDetails(this.selectedDataset) : ''}
                </div>
            </div>
        `;
    }
    
    renderDatasetDetails(dataset) {
        const metrics = metricsStore.getByDataset(dataset.id);
        const scripts = scriptsStore.getAll(); // Show all scripts for now
        
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
                    <div class="section-title clickable" data-toggle="columns">
                        <span class="section-icon">📊</span>
                        <span>Columns</span>
                        <span class="toggle-icon">${this.columnsExpanded ? '▼' : '▶'}</span>
                    </div>
                    <div class="items-list" style="display: ${this.columnsExpanded ? 'block' : 'none'};">
                        ${dataset.columns && dataset.columns.length > 0
                            ? dataset.columns.map(col => `
                                <div class="selectable-item column-item" 
                                     data-type="column"
                                     data-value="${this.escapeHtml(col)}"
                                     data-dataset="${dataset.id}">
                                    <span class="item-icon">📊</span>
                                    <span class="item-name">${this.escapeHtml(this.formatColumnName(col))}</span>
                                    <span class="item-type">${this.inferColumnType(dataset, col)}</span>
                                </div>
                            `).join('')
                            : '<div class="empty-state-small">No columns available</div>'
                        }
                    </div>
                </div>
                
                <div class="metrics-section">
                    <div class="section-title">
                        <span class="section-icon">📈</span>
                        <span>Metrics</span>
                    </div>
                    <div class="items-list editable-items">
                        ${metrics && metrics.length > 0
                            ? metrics.map(metric => `
                                <div class="editable-item metric-item" 
                                     data-type="metric"
                                     data-id="${metric.id}"
                                     data-dataset="${dataset.id}">
                                    <span class="item-icon">📈</span>
                                    <div class="item-info">
                                        <span class="item-name">${this.escapeHtml(metric.name)}</span>
                                        <span class="item-value">${this.formatMetricValue(metric.value)}</span>
                                    </div>
                                    <span class="item-operation">${this.escapeHtml(metric.operation || '')}</span>
                                    <button class="edit-btn" title="Edit metric">✏️</button>
                                </div>
                            `).join('')
                            : '<div class="empty-state-small">No metrics defined</div>'
                        }
                    </div>
                </div>
                
                <div class="scripts-section">
                    <div class="section-title">
                        <span class="section-icon">📝</span>
                        <span>Scripts</span>
                    </div>
                    <div class="items-list editable-items">
                        ${scripts && scripts.length > 0
                            ? scripts.map(script => `
                                <div class="editable-item script-item" 
                                     data-type="script"
                                     data-id="${script.id}">
                                    <span class="item-icon">📝</span>
                                    <div class="item-info">
                                        <span class="item-name">${this.escapeHtml(script.name)}</span>
                                        <span class="item-language">${script.language || 'N/A'}</span>
                                    </div>
                                    <button class="edit-btn" title="Edit script">✏️</button>
                                </div>
                            `).join('')
                            : '<div class="empty-state-small">No scripts defined</div>'
                        }
                    </div>
                </div>
            </div>
        `;
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
        
        // Use event delegation - no need to remove/re-add listeners
        // Dataset dropdown selection - use class selector to handle dynamic IDs
        this.container.addEventListener('change', (e) => {
            if (e.target.classList.contains('dataset-browser-select')) {
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
        
        // Column/Metric click to select for axes
        this.container.addEventListener('click', (e) => {
            // Handle column expand/collapse
            const toggleTitle = e.target.closest('.section-title.clickable');
            if (toggleTitle && toggleTitle.getAttribute('data-toggle') === 'columns') {
                this.columnsExpanded = !this.columnsExpanded;
                const itemsList = toggleTitle.nextElementSibling;
                if (itemsList) {
                    itemsList.style.display = this.columnsExpanded ? 'block' : 'none';
                }
                const toggleIcon = toggleTitle.querySelector('.toggle-icon');
                if (toggleIcon) {
                    toggleIcon.textContent = this.columnsExpanded ? '▼' : '▶';
                }
                e.stopPropagation();
                return;
            }
            
            // Handle edit button clicks
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                const editableItem = editBtn.closest('.editable-item');
                if (editableItem) {
                    const type = editableItem.getAttribute('data-type');
                    const id = editableItem.getAttribute('data-id');
                    
                    if (type === 'metric') {
                        this.notifyEditMetric(id);
                    } else if (type === 'script') {
                        this.notifyEditScript(id);
                    }
                    e.stopPropagation();
                    return;
                }
            }
            
            // Handle column selection
            const selectableItem = e.target.closest('.selectable-item');
            if (selectableItem) {
                const type = selectableItem.getAttribute('data-type');
                const value = selectableItem.getAttribute('data-value');
                const datasetId = selectableItem.getAttribute('data-dataset');
                
                // Toggle selection state
                const isSelected = selectableItem.classList.contains('selected');
                
                // Remove selection from other items of same type
                const sameTypeItems = this.container.querySelectorAll(`.selectable-item[data-type="${type}"]`);
                sameTypeItems.forEach(item => item.classList.remove('selected'));
                
                // Toggle current item
                if (!isSelected) {
                    selectableItem.classList.add('selected');
                    this.notifyItemSelected(type, value, datasetId);
                } else {
                    this.notifyItemSelected(type, null, datasetId);
                }
                
                e.stopPropagation();
            }
        });
    }
    
    onItemSelect(callback) {
        this.onItemSelectCallbacks.push(callback);
    }
    
    notifyItemSelected(type, value, datasetId) {
        this.onItemSelectCallbacks.forEach(callback => callback(type, value, datasetId));
    }
    
    onEditMetric(callback) {
        this.onEditMetricCallbacks.push(callback);
    }
    
    notifyEditMetric(metricId) {
        this.onEditMetricCallbacks.forEach(callback => callback(metricId));
    }
    
    onEditScript(callback) {
        this.onEditScriptCallbacks.push(callback);
    }
    
    notifyEditScript(scriptId) {
        this.onEditScriptCallbacks.forEach(callback => callback(scriptId));
    }
    
    refresh() {
        // Preserve columns expanded state
        const wasExpanded = this.columnsExpanded;
        
        // Only re-render if we have a selected dataset to preserve state
        if (this.selectedDataset) {
            const currentId = this.selectedDataset.id;
            const updated = datasetStore.get(currentId);
            if (updated) {
                this.selectedDataset = updated;
            }
        }
        
        this.render();
        
        // Restore columns expanded state after render
        this.columnsExpanded = wasExpanded;
        if (this.container) {
            const columnsList = this.container.querySelector('.columns-section .items-list');
            const toggleIcon = this.container.querySelector('.columns-section .toggle-icon');
            if (columnsList) {
                columnsList.style.display = this.columnsExpanded ? 'block' : 'none';
            }
            if (toggleIcon) {
                toggleIcon.textContent = this.columnsExpanded ? '▼' : '▶';
            }
        }
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

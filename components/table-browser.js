// Table Browser Component
// Displays available database tables in a sidebar

import { getAllTables } from '../utils/sql-engine.js';

export class TableBrowser {
    constructor(containerSelector, savedDatasetsContainerSelector = null) {
        this.container = document.querySelector(containerSelector);
        this.savedDatasetsContainer = savedDatasetsContainerSelector 
            ? document.querySelector(savedDatasetsContainerSelector) 
            : null;
        this.tables = getAllTables();
        this.onTableClickCallbacks = [];
        this.onColumnClickCallbacks = [];
        this.onDatasetSelectCallbacks = [];
        this.onDatasetDeletedCallbacks = [];
        this.savedDatasets = [];
        this.init();
    }
    
    async init() {
        try {
            await this.loadSavedDatasets();
            this.render();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error initializing TableBrowser:', error);
            // Render anyway with empty datasets
            this.render();
            this.attachEventListeners();
        }
    }
    
    async loadSavedDatasets() {
        const { datasetStore } = await import('../data/datasets.js');
        this.savedDatasets = datasetStore.getAll() || [];
        // Sort by creation date (newest first)
        this.savedDatasets.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });
    }
    
    render() {
        // Render saved datasets dropdown in separate container if provided
        const savedDatasetsHtml = `
            <div class="saved-datasets-dropdown-container">
                <label for="saved-datasets-select" class="dropdown-label">Saved Datasets</label>
                <select id="saved-datasets-select" class="saved-datasets-dropdown">
                    <option value="">-- Select a saved dataset --</option>
                    ${this.savedDatasets.map(dataset => `
                        <option value="${dataset.id}">${this.escapeHtml(dataset.name)}</option>
                    `).join('')}
                </select>
                <div class="dataset-dropdown-actions">
                    <button id="edit-dataset-btn" class="btn-icon" title="Edit" disabled>✏️</button>
                    <button id="delete-dataset-btn" class="btn-icon" title="Delete" disabled>🗑️</button>
                    <button id="refresh-datasets-btn" class="btn-icon" title="Refresh">🔄</button>
                </div>
            </div>
        `;
        
        if (this.savedDatasetsContainer) {
            // Render saved datasets in the separate container
            this.savedDatasetsContainer.innerHTML = savedDatasetsHtml;
        } else {
            // Render saved datasets in the main container (backward compatibility)
            this.container.innerHTML = savedDatasetsHtml;
        }
        
        // Render table browser in the main container
        const tableBrowserHtml = `
            <div class="table-browser">
                <div class="table-browser-header">
                    <h3>Database Tables</h3>
                </div>
                <div class="table-list">
                    ${this.tables.map(table => this.renderTable(table)).join('')}
                </div>
            </div>
        `;
        
        if (this.savedDatasetsContainer) {
            // If saved datasets are in separate container, append table browser to main container
            this.container.innerHTML = tableBrowserHtml;
        } else {
            // Otherwise, append to existing content
            this.container.innerHTML += tableBrowserHtml;
        }
    }
    
    renderTable(table) {
        const columnsHtml = table.columns.map(col => `
            <div class="table-column" data-table="${table.name}" data-column="${col}">
                <span class="column-icon">📊</span>
                <span class="column-name">${col}</span>
            </div>
        `).join('');
        
        return `
            <div class="table-item" data-table="${table.name}">
                <div class="table-header">
                    <span class="table-icon">🗂️</span>
                    <span class="table-name">${table.name}</span>
                    <span class="table-toggle">▼</span>
                </div>
                <div class="table-description">${table.description}</div>
                <div class="table-columns" style="display: none;">
                    ${columnsHtml}
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        // Saved datasets dropdown - look in separate container first, then main container
        const searchContainer = this.savedDatasetsContainer || this.container;
        const datasetSelect = searchContainer.querySelector('#saved-datasets-select');
        const editBtn = searchContainer.querySelector('#edit-dataset-btn');
        const deleteBtn = searchContainer.querySelector('#delete-dataset-btn');
        const refreshBtn = searchContainer.querySelector('#refresh-datasets-btn');
        
        if (!datasetSelect || !editBtn || !deleteBtn || !refreshBtn) {
            console.warn('Saved datasets controls not found');
            return;
        }
        
        datasetSelect.addEventListener('change', (e) => {
            const datasetId = e.target.value;
            if (datasetId) {
                editBtn.disabled = false;
                deleteBtn.disabled = false;
                this.notifyDatasetSelect(datasetId);
            } else {
                editBtn.disabled = true;
                deleteBtn.disabled = true;
            }
        });
        
        editBtn.addEventListener('click', async () => {
            const datasetId = datasetSelect.value;
            if (datasetId) {
                // Trigger the selection callback to load the dataset
                this.notifyDatasetSelect(datasetId);
            } else {
                // If no dataset selected, disable buttons
                editBtn.disabled = true;
                deleteBtn.disabled = true;
            }
        });
        
        deleteBtn.addEventListener('click', async () => {
            const datasetId = datasetSelect.value;
            if (datasetId) {
                await this.deleteDataset(datasetId);
            }
        });
        
        refreshBtn.addEventListener('click', async () => {
            await this.loadSavedDatasets();
            this.render();
            this.attachEventListeners();
        });
        
        // Table header click to expand/collapse
        this.container.querySelectorAll('.table-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const tableItem = header.closest('.table-item');
                const columns = tableItem.querySelector('.table-columns');
                const toggle = header.querySelector('.table-toggle');
                
                if (columns.style.display === 'none') {
                    columns.style.display = 'block';
                    toggle.textContent = '▲';
                    tableItem.classList.add('expanded');
                } else {
                    columns.style.display = 'none';
                    toggle.textContent = '▼';
                    tableItem.classList.remove('expanded');
                }
            });
        });
        
        // Table name click to insert into SQL
        this.container.querySelectorAll('.table-name').forEach(tableName => {
            tableName.addEventListener('click', (e) => {
                e.stopPropagation();
                const tableItem = tableName.closest('.table-item');
                const tableNameValue = tableItem.dataset.table;
                this.notifyTableClick(tableNameValue);
            });
        });
        
        // Column click to insert into SQL
        this.container.querySelectorAll('.table-column').forEach(column => {
            column.addEventListener('click', (e) => {
                e.stopPropagation();
                const table = column.dataset.table;
                const columnName = column.dataset.column;
                this.notifyColumnClick(table, columnName);
            });
        });
    }
    
    async deleteDataset(datasetId) {
        const { datasetStore } = await import('../data/datasets.js');
        const { Modal } = await import('../utils/modal.js');
        const dataset = datasetStore.get(datasetId);
        
        if (!dataset) {
            await Modal.alert('Dataset not found.');
            return;
        }
        
        const confirmed = await Modal.confirm(
            `Are you sure you want to delete "${dataset.name}"?`
        );
        
        if (!confirmed) {
            return;
        }
        
        const result = datasetStore.delete(datasetId);
        
        if (result.deleted) {
            await Modal.alert(`Dataset "${dataset.name}" deleted successfully.`);
            
            // Refresh saved datasets dropdown
            await this.loadSavedDatasets();
            this.render();
            this.attachEventListeners();
            
            // Reset dropdown selection - look in separate container first, then main container
            const searchContainer = this.savedDatasetsContainer || this.container;
            const datasetSelect = searchContainer.querySelector('#saved-datasets-select');
            const editBtn = searchContainer.querySelector('#edit-dataset-btn');
            const deleteBtn = searchContainer.querySelector('#delete-dataset-btn');
            if (datasetSelect) {
                datasetSelect.value = '';
            }
            if (editBtn) {
                editBtn.disabled = true;
            }
            if (deleteBtn) {
                deleteBtn.disabled = true;
            }
            
            // Notify all components about the deletion
            this.notifyDatasetDeleted(datasetId, dataset);
        } else {
            await Modal.alert('Failed to delete dataset.');
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    onTableClick(callback) {
        this.onTableClickCallbacks.push(callback);
    }
    
    onColumnClick(callback) {
        this.onColumnClickCallbacks.push(callback);
    }
    
    notifyTableClick(tableName) {
        this.onTableClickCallbacks.forEach(callback => callback(tableName));
    }
    
    notifyColumnClick(tableName, columnName) {
        this.onColumnClickCallbacks.forEach(callback => callback(tableName, columnName));
    }
    
    onDatasetSelect(callback) {
        this.onDatasetSelectCallbacks.push(callback);
    }
    
    notifyDatasetSelect(datasetId) {
        this.onDatasetSelectCallbacks.forEach(callback => callback(datasetId));
    }
    
    onDatasetDeleted(callback) {
        this.onDatasetDeletedCallbacks.push(callback);
    }
    
    notifyDatasetDeleted(datasetId, dataset) {
        this.onDatasetDeletedCallbacks.forEach(callback => callback(datasetId, dataset));
    }
}


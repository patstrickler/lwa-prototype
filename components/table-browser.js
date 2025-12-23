// Table Browser Component
// Displays available database tables in a sidebar

import { getAllTables } from '../utils/sql-engine.js';

export class TableBrowser {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.tables = getAllTables();
        this.onTableClickCallbacks = [];
        this.onColumnClickCallbacks = [];
        this.onQuerySelectCallbacks = [];
        this.onDatasetDeletedCallbacks = [];
        this.savedQueries = [];
        this.init();
    }
    
    init() {
        this.loadSavedQueries();
        this.render();
        this.attachEventListeners();
    }
    
    async loadSavedQueries() {
        const { datasetStore } = await import('../data/datasets.js');
        this.savedQueries = datasetStore.getAll();
        // Sort by creation date (newest first)
        this.savedQueries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    render() {
        this.container.innerHTML = `
            <div class="saved-queries-dropdown-container">
                <label for="saved-queries-select" class="dropdown-label">Saved Queries</label>
                <select id="saved-queries-select" class="saved-queries-dropdown">
                    <option value="">-- Select a saved query --</option>
                    ${this.savedQueries.map(query => `
                        <option value="${query.id}">${this.escapeHtml(query.name)}</option>
                    `).join('')}
                </select>
                <div class="query-dropdown-actions">
                    <button id="edit-query-btn" class="btn-icon" title="Edit" disabled>✏️</button>
                    <button id="delete-query-btn" class="btn-icon" title="Delete" disabled>🗑️</button>
                    <button id="refresh-queries-btn" class="btn-icon" title="Refresh">🔄</button>
                </div>
            </div>
            <div class="table-browser">
                <div class="table-browser-header">
                    <h3>Database Tables</h3>
                </div>
                <div class="table-list">
                    ${this.tables.map(table => this.renderTable(table)).join('')}
                </div>
            </div>
        `;
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
        // Saved queries dropdown
        const querySelect = this.container.querySelector('#saved-queries-select');
        const editBtn = this.container.querySelector('#edit-query-btn');
        const deleteBtn = this.container.querySelector('#delete-query-btn');
        const refreshBtn = this.container.querySelector('#refresh-queries-btn');
        
        querySelect.addEventListener('change', (e) => {
            const queryId = e.target.value;
            if (queryId) {
                editBtn.disabled = false;
                deleteBtn.disabled = false;
                this.notifyQuerySelect(queryId);
            } else {
                editBtn.disabled = true;
                deleteBtn.disabled = true;
            }
        });
        
        editBtn.addEventListener('click', async () => {
            const queryId = querySelect.value;
            if (queryId) {
                this.notifyQuerySelect(queryId);
            }
        });
        
        deleteBtn.addEventListener('click', async () => {
            const queryId = querySelect.value;
            if (queryId) {
                await this.deleteQuery(queryId);
            }
        });
        
        refreshBtn.addEventListener('click', async () => {
            await this.loadSavedQueries();
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
    
    async deleteQuery(queryId) {
        const { datasetStore } = await import('../data/datasets.js');
        const { Modal } = await import('../utils/modal.js');
        const dataset = datasetStore.get(queryId);
        
        if (!dataset) {
            await Modal.alert('Query not found.');
            return;
        }
        
        const confirmed = await Modal.confirm(
            `Are you sure you want to delete "${dataset.name}"?`
        );
        
        if (!confirmed) {
            return;
        }
        
        const result = datasetStore.delete(queryId);
        
        if (result.deleted) {
            await Modal.alert(`Query "${dataset.name}" deleted successfully.`);
            
            // Refresh saved queries dropdown
            await this.loadSavedQueries();
            this.render();
            this.attachEventListeners();
            
            // Notify all components about the deletion
            this.notifyDatasetDeleted(queryId, dataset);
        } else {
            await Modal.alert('Failed to delete query.');
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
    
    onQuerySelect(callback) {
        this.onQuerySelectCallbacks.push(callback);
    }
    
    notifyQuerySelect(queryId) {
        this.onQuerySelectCallbacks.forEach(callback => callback(queryId));
    }
    
    onDatasetDeleted(callback) {
        this.onDatasetDeletedCallbacks.push(callback);
    }
    
    notifyDatasetDeleted(datasetId, dataset) {
        this.onDatasetDeletedCallbacks.forEach(callback => callback(datasetId, dataset));
    }
}


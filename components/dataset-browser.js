// Dataset Browser Component
// Shows all available datasets (queries) and their columns in a sidebar

import { datasetStore } from '../data/datasets.js';

export class DatasetBrowser {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.selectionCallbacks = [];
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.refresh();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="dataset-browser">
                <div class="browser-header">
                    <h3>Datasets</h3>
                    <button id="refresh-datasets" class="btn-icon" title="Refresh">↻</button>
                </div>
                <div id="datasets-list" class="datasets-list">
                    <div class="loading">Loading datasets...</div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const refreshBtn = this.container.querySelector('#refresh-datasets');
        refreshBtn.addEventListener('click', () => this.refresh());
    }
    
    refresh() {
        const datasetsList = this.container.querySelector('#datasets-list');
        const datasets = datasetStore.getAll();
        
        if (datasets.length === 0) {
            datasetsList.innerHTML = '<div class="empty-state">No datasets yet.<br>Create a dataset from a query to see it here.</div>';
            return;
        }
        
        datasetsList.innerHTML = datasets.map(dataset => {
            const columnsHtml = dataset.columns.map(column => {
                const formattedName = this.formatColumnName(column);
                return `
                    <div class="column-item" data-column="${column}">
                        <span class="column-icon">📊</span>
                        <span class="column-name">${this.escapeHtml(formattedName)}</span>
                        <span class="column-original">${this.escapeHtml(column)}</span>
                    </div>
                `;
            }).join('');
            
            const rowCount = dataset.rows ? dataset.rows.length : 0;
            const createdDate = new Date(dataset.createdAt).toLocaleDateString();
            
            return `
                <div class="dataset-item" data-dataset-id="${dataset.id}">
                    <div class="dataset-header">
                        <button class="dataset-toggle" aria-expanded="false">
                            <span class="toggle-icon">▶</span>
                            <span class="dataset-name">${this.escapeHtml(dataset.name)}</span>
                        </button>
                        <div class="dataset-meta">
                            <span class="dataset-rows">${rowCount} rows</span>
                        </div>
                    </div>
                    <div class="dataset-details" style="display: none;">
                        <div class="dataset-info">
                            <div class="info-item">
                                <span class="info-label">Created:</span>
                                <span class="info-value">${createdDate}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Columns:</span>
                                <span class="info-value">${dataset.columns.length}</span>
                            </div>
                        </div>
                        <div class="columns-list">
                            <div class="columns-header">Columns:</div>
                            ${columnsHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Attach event listeners to dataset items
        this.attachDatasetListeners();
    }
    
    attachDatasetListeners() {
        const datasetItems = this.container.querySelectorAll('.dataset-item');
        
        datasetItems.forEach(item => {
            const toggleBtn = item.querySelector('.dataset-toggle');
            const details = item.querySelector('.dataset-details');
            const datasetId = item.getAttribute('data-dataset-id');
            
            toggleBtn.addEventListener('click', () => {
                const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                toggleBtn.setAttribute('aria-expanded', !isExpanded);
                
                const icon = toggleBtn.querySelector('.toggle-icon');
                icon.textContent = isExpanded ? '▶' : '▼';
                
                details.style.display = isExpanded ? 'none' : 'block';
            });
            
            // Allow clicking on dataset name to select it
            const datasetName = item.querySelector('.dataset-name');
            datasetName.style.cursor = 'pointer';
            datasetName.addEventListener('click', () => {
                const dataset = datasetStore.get(datasetId);
                if (dataset) {
                    this.notifySelection(dataset);
                }
            });
        });
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
    
    onSelection(callback) {
        this.selectionCallbacks.push(callback);
    }
    
    notifySelection(dataset) {
        this.selectionCallbacks.forEach(callback => callback(dataset));
    }
}


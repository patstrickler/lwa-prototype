// Table Browser Component
// Displays available database tables in a sidebar

import { getAllTables } from '../utils/sql-engine.js';

/**
 * Determines the data type of a column based on its name
 * @param {string} columnName - Name of the column
 * @returns {string} Data type: 'text', 'numeric', 'boolean', 'date', 'email', 'id'
 */
function getColumnType(columnName) {
    const colLower = columnName.toLowerCase();
    
    // Date columns
    if (colLower.includes('date') || colLower.includes('_at') || colLower.includes('time')) {
        return 'date';
    }
    
    // ID columns
    if (colLower.includes('_id') || colLower.endsWith('id')) {
        return 'id';
    }
    
    // Email columns
    if (colLower.includes('email')) {
        return 'email';
    }
    
    // Numeric columns
    if (colLower.includes('value') || colLower.includes('result') || 
        colLower.includes('price') || colLower.includes('amount') || 
        colLower.includes('total') || colLower.includes('quantity') || 
        colLower.includes('count') || colLower.includes('unit') ||
        colLower.includes('range')) {
        return 'numeric';
    }
    
    // Boolean-like columns
    if (colLower === 'status' || colLower.includes('is_') || colLower.includes('has_')) {
        return 'boolean';
    }
    
    // Default to text
    return 'text';
}

/**
 * Gets Material UI icon for a column type
 * @param {string} columnType - Type of column
 * @returns {string} Material icon name
 */
function getColumnTypeIcon(columnType) {
    const iconMap = {
        'text': 'short_text',
        'numeric': 'numbers',
        'boolean': 'toggle_on',
        'date': 'calendar_today',
        'email': 'email',
        'id': 'label'
    };
    
    return iconMap[columnType] || 'short_text';
}

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
        const { UserManager } = await import('../utils/user-manager.js');
        
        const allDatasets = datasetStore.getAll() || [];
        
        // Filter datasets based on access control
        const userManager = new UserManager();
        this.savedDatasets = allDatasets.filter(dataset => {
            return userManager.hasAccessToDataset(dataset);
        });
        
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
                    <button id="edit-dataset-btn" class="btn btn-sm btn-icon" title="Edit" disabled><span class="material-icons">edit</span></button>
                    <button id="duplicate-dataset-btn" class="btn btn-sm btn-icon" title="Duplicate" disabled><span class="material-icons">content_copy</span></button>
                    <button id="manage-access-btn" class="btn btn-sm btn-icon" title="Manage Access" disabled><span class="material-icons">people</span></button>
                    <button id="delete-dataset-btn" class="btn btn-sm btn-icon" title="Delete" disabled><span class="material-icons">delete</span></button>
                    <button id="refresh-datasets-btn" class="btn btn-sm btn-icon" title="Refresh"><span class="material-icons">refresh</span></button>
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
        const columnsHtml = table.columns.map(col => {
            const columnType = getColumnType(col);
            const iconName = getColumnTypeIcon(columnType);
            return `
            <div class="table-column" data-table="${table.name}" data-column="${col}">
                <span class="material-symbols-outlined column-icon" title="${columnType}">${iconName}</span>
                <span class="column-name">${col}</span>
            </div>
        `;
        }).join('');
        
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
        const duplicateBtn = searchContainer.querySelector('#duplicate-dataset-btn');
        const manageAccessBtn = searchContainer.querySelector('#manage-access-btn');
        const deleteBtn = searchContainer.querySelector('#delete-dataset-btn');
        const refreshBtn = searchContainer.querySelector('#refresh-datasets-btn');
        
        if (!datasetSelect || !editBtn || !duplicateBtn || !manageAccessBtn || !deleteBtn || !refreshBtn) {
            console.warn('Saved datasets controls not found');
            return;
        }
        
        datasetSelect.addEventListener('change', (e) => {
            const datasetId = e.target.value;
            if (datasetId) {
                editBtn.disabled = false;
                duplicateBtn.disabled = false;
                manageAccessBtn.disabled = false;
                deleteBtn.disabled = false;
                this.notifyDatasetSelect(datasetId);
            } else {
                editBtn.disabled = true;
                duplicateBtn.disabled = true;
                manageAccessBtn.disabled = true;
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
                duplicateBtn.disabled = true;
                manageAccessBtn.disabled = true;
                deleteBtn.disabled = true;
            }
        });
        
        duplicateBtn.addEventListener('click', async () => {
            const datasetId = datasetSelect.value;
            if (datasetId) {
                await this.duplicateDataset(datasetId);
            }
        });
        
        manageAccessBtn.addEventListener('click', async () => {
            const datasetId = datasetSelect.value;
            if (datasetId) {
                await this.manageDatasetAccess(datasetId);
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
            const duplicateBtn = searchContainer.querySelector('#duplicate-dataset-btn');
            const manageAccessBtn = searchContainer.querySelector('#manage-access-btn');
            const deleteBtn = searchContainer.querySelector('#delete-dataset-btn');
            if (datasetSelect) {
                datasetSelect.value = '';
            }
            if (editBtn) {
                editBtn.disabled = true;
            }
            if (duplicateBtn) {
                duplicateBtn.disabled = true;
            }
            if (manageAccessBtn) {
                manageAccessBtn.disabled = true;
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
    
    async duplicateDataset(datasetId) {
        const { datasetStore } = await import('../data/datasets.js');
        const { Modal } = await import('../utils/modal.js');
        const dataset = datasetStore.get(datasetId);
        
        if (!dataset) {
            await Modal.alert('Dataset not found.');
            return;
        }
        
        // Get new name from user
        const newName = await Modal.prompt(
            'Enter a name for the duplicated dataset:',
            `${dataset.name} (Copy)`
        );
        
        if (!newName || !newName.trim()) {
            return; // User cancelled or entered empty name
        }
        
        try {
            // Create duplicate using datasetStore.duplicate method
            const duplicated = datasetStore.duplicate(datasetId, newName.trim());
            
            if (duplicated) {
                await Modal.alert(`Dataset "${newName}" duplicated successfully! (ID: ${duplicated.id})`);
                
                // Refresh saved datasets dropdown
                await this.loadSavedDatasets();
                this.render();
                this.attachEventListeners();
                
                // Select the new dataset
                const searchContainer = this.savedDatasetsContainer || this.container;
                const datasetSelect = searchContainer.querySelector('#saved-datasets-select');
                if (datasetSelect) {
                    datasetSelect.value = duplicated.id;
                    // Trigger change event to enable buttons
                    datasetSelect.dispatchEvent(new Event('change'));
                }
            } else {
                await Modal.alert('Failed to duplicate dataset.');
            }
        } catch (error) {
            console.error('Error duplicating dataset:', error);
            await Modal.alert(`Failed to duplicate dataset: ${error.message || 'Unknown error'}`);
        }
    }
    
    async manageDatasetAccess(datasetId) {
        const { datasetStore } = await import('../data/datasets.js');
        const { Modal } = await import('../utils/modal.js');
        const { UserManager } = await import('../utils/user-manager.js');
        
        const dataset = datasetStore.get(datasetId);
        
        if (!dataset) {
            await Modal.alert('Dataset not found.');
            return;
        }
        
        // Get available users and groups
        const userManager = new UserManager();
        const allUsers = userManager.getAllUsers();
        const allGroups = userManager.getAllGroups();
        
        // Get current access control (default to empty if not set)
        const accessControl = dataset.accessControl || {
            type: 'public', // 'public', 'restricted'
            users: [],
            userGroups: []
        };
        
        // Build HTML for access management modal
        const accessHtml = `
            <div class="access-management-form">
                <div class="form-group">
                    <label>
                        <input type="radio" name="access-type" value="public" ${accessControl.type === 'public' ? 'checked' : ''}>
                        Public (All users can access)
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="radio" name="access-type" value="restricted" ${accessControl.type === 'restricted' ? 'checked' : ''}>
                        Restricted (Selected users/groups only)
                    </label>
                </div>
                
                <div id="restricted-access-options" style="display: ${accessControl.type === 'restricted' ? 'block' : 'none'}; margin-top: 15px;">
                    <div class="form-group">
                        <div class="form-label"><strong>Allowed Users:</strong></div>
                        <div class="checkbox-list" style="max-height: 150px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;" role="group" aria-label="Allowed users">
                            ${allUsers.map(user => `
                                <label style="display: block; margin: 5px 0;">
                                    <input type="checkbox" name="allowed-users" value="${user.id}" ${accessControl.users.includes(user.id) ? 'checked' : ''}>
                                    ${this.escapeHtml(user.name)} (${user.email})
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="form-label"><strong>Allowed User Groups:</strong></div>
                        <div class="checkbox-list" style="max-height: 150px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;" role="group" aria-label="Allowed user groups">
                            ${allGroups.map(group => `
                                <label style="display: block; margin: 5px 0;">
                                    <input type="checkbox" name="allowed-groups" value="${group.id}" ${accessControl.userGroups.includes(group.id) ? 'checked' : ''}>
                                    ${this.escapeHtml(group.name)}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const result = await Modal.custom({
            title: `Manage Access: ${this.escapeHtml(dataset.name)}`,
            content: accessHtml,
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', value: false },
                { text: 'Save', class: 'btn-primary', value: true }
            ]
        });
        
        if (!result) {
            return; // User cancelled
        }
        
        // Get form values
        const form = document.querySelector('.access-management-form');
        if (!form) {
            return;
        }
        
        const accessType = form.querySelector('input[name="access-type"]:checked')?.value || 'public';
        
        let newAccessControl = {
            type: accessType,
            users: [],
            userGroups: []
        };
        
        if (accessType === 'restricted') {
            const userCheckboxes = form.querySelectorAll('input[name="allowed-users"]:checked');
            const groupCheckboxes = form.querySelectorAll('input[name="allowed-groups"]:checked');
            
            newAccessControl.users = Array.from(userCheckboxes).map(cb => cb.value);
            newAccessControl.userGroups = Array.from(groupCheckboxes).map(cb => cb.value);
        }
        
        // Update dataset with new access control
        try {
            datasetStore.update(datasetId, { accessControl: newAccessControl });
            await Modal.alert('Access settings updated successfully!');
        } catch (error) {
            console.error('Error updating access control:', error);
            await Modal.alert(`Failed to update access settings: ${error.message || 'Unknown error'}`);
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


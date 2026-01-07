// Reports/Dashboards Panel Component
// Allows analysts to create, edit, preview, and export reports/dashboards
// Allows viewers to view, filter, and export reports/dashboards they have access to

import { reportsStore } from '../data/reports.js';
import { visualizationsStore } from '../data/visualizations.js';
import { datasetStore } from '../data/datasets.js';
import { Modal } from '../utils/modal.js';
import { userContext } from '../utils/user-context.js';

export class ReportsPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentReport = null;
        this.activeFilters = {}; // Store active filter values for the current report
        this.isViewer = userContext.isViewer();
        this.dashboardFilters = {}; // Store filters applied from visualization clicks
        this.init();
        
        // Listen for user context changes
        window.addEventListener('userContextChanged', () => {
            this.isViewer = userContext.isViewer();
            this.render();
        });
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.isViewer = userContext.isViewer();
        // Always show button - access control handled in create function
        this.container.innerHTML = `
            <div class="reports-panel">
                <div class="reports-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 10px 0;">
                    <h2 style="margin: 0;">Reports & Dashboards</h2>
                    <button type="button" class="btn btn-primary btn-lg" id="create-report-btn" ${this.isViewer ? 'style="display: none;"' : ''}>
                        <strong>+ New Report/Dashboard</strong>
                    </button>
                </div>
                
                <div class="reports-list-container" id="reports-list-container">
                    <!-- Reports list will be populated here -->
                </div>
                
                <div class="report-editor-container" id="report-editor-container" style="display: none;">
                    <!-- Report editor will be populated here -->
                </div>
                
                <div class="report-preview-container" id="report-preview-container" style="display: none;">
                    <!-- Report preview will be populated here -->
                </div>
                
                <div class="report-view-mode" id="report-view-mode" style="display: none;">
                    <!-- Report view mode will be populated here -->
                </div>
            </div>
        `;
        
        this.renderReportsList();
    }
    
    attachEventListeners() {
        const createBtn = this.container.querySelector('#create-report-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCreateReportDialog());
        }
    }
    
    renderReportsList() {
        const container = this.container.querySelector('#reports-list-container');
        let reports = reportsStore.getAll();
        
        // Filter reports based on user access if viewer
        if (this.isViewer) {
            reports = reports.filter(report => userContext.hasAccess(report.access));
        }
        
        if (reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>${this.isViewer ? 'No reports/dashboards available to you.' : 'No reports/dashboards yet. Create one to get started!'}</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="reports-grid">
                ${reports.map(report => this.renderReportCard(report)).join('')}
            </div>
        `;
        
        // Attach event listeners for each card
        reports.forEach(report => {
            const card = container.querySelector(`[data-report-id="${report.id}"]`);
            if (card) {
                const editBtn = card.querySelector('.edit-report-btn');
                const duplicateBtn = card.querySelector('.duplicate-report-btn');
                const deleteBtn = card.querySelector('.delete-report-btn');
                const previewBtn = card.querySelector('.preview-report-btn');
                const viewBtn = card.querySelector('.view-report-btn');
                const viewModeBtn = card.querySelector('.view-mode-btn');
                
                if (editBtn) {
                    editBtn.addEventListener('click', () => this.editReport(report.id));
                }
                if (duplicateBtn) {
                    duplicateBtn.addEventListener('click', () => this.duplicateReport(report.id));
                }
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => this.deleteReport(report.id));
                }
                if (previewBtn) {
                    previewBtn.addEventListener('click', () => this.previewReport(report.id));
                }
                if (viewBtn) {
                    viewBtn.addEventListener('click', () => this.previewReport(report.id));
                }
                if (viewModeBtn) {
                    viewModeBtn.addEventListener('click', () => this.showViewMode(report.id));
                }
            }
        });
    }
    
    renderReportCard(report) {
        const createdDate = new Date(report.createdAt).toLocaleDateString();
        const updatedDate = report.updatedAt ? new Date(report.updatedAt).toLocaleDateString() : '';
        
        return `
            <div class="report-card" data-report-id="${report.id}">
                <div class="report-card-header">
                    <h3>${this.escapeHtml(report.title)}</h3>
                    <span class="report-badge">${report.visualizationIds.length} visualization(s)</span>
                </div>
                <div class="report-card-body">
                    <p class="report-meta">
                        Created: ${createdDate}
                        ${updatedDate ? `<br>Updated: ${updatedDate}` : ''}
                    </p>
                    <p class="report-meta">
                        Filters: ${report.filters.length}
                        <br>Access: ${report.access.users.length} user(s), ${report.access.groups.length} group(s)
                    </p>
                </div>
                <div class="report-card-actions">
                    ${this.isViewer 
                        ? '<button type="button" class="btn btn-sm btn-primary view-report-btn">View</button>'
                        : `
                            <button type="button" class="btn btn-sm btn-primary view-mode-btn">View Mode</button>
                            <button type="button" class="btn btn-sm btn-secondary preview-report-btn">Preview</button>
                            <button type="button" class="btn btn-sm btn-secondary edit-report-btn">Edit</button>
                            <button type="button" class="btn btn-sm btn-secondary duplicate-report-btn">Duplicate</button>
                            <button type="button" class="btn btn-sm btn-danger delete-report-btn">Delete</button>
                        `
                    }
                </div>
            </div>
        `;
    }
    
    async showCreateReportDialog() {
        // Check if user is viewer - if so, show message
        if (this.isViewer) {
            await Modal.alert('Only analysts can create reports. Please contact an administrator to change your role.');
            return;
        }
        
        // Get available visualizations and datasets
        const visualizations = visualizationsStore.getAll();
        const datasets = datasetStore.getAll();
        
        return new Promise((resolve) => {
            // Create backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            backdrop.style.display = 'flex';
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.maxWidth = '700px';
            modal.style.width = '90%';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            // Header
            const modalHeader = document.createElement('div');
            modalHeader.className = 'modal-header';
            const modalTitle = document.createElement('h3');
            modalTitle.className = 'modal-title';
            modalTitle.textContent = 'Create New Report/Dashboard';
            modalHeader.appendChild(modalTitle);
            
            // Body
            const modalBody = document.createElement('div');
            modalBody.className = 'modal-body';
            modalBody.style.maxHeight = '70vh';
            modalBody.style.overflowY = 'auto';
            
            // Title input
            const titleGroup = document.createElement('div');
            titleGroup.style.marginBottom = '20px';
            const titleLabel = document.createElement('label');
            titleLabel.style.display = 'block';
            titleLabel.style.marginBottom = '8px';
            titleLabel.style.fontWeight = '600';
            titleLabel.textContent = 'Report/Dashboard Title:';
            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.id = 'new-report-title';
            titleInput.className = 'form-control';
            titleInput.placeholder = 'Enter report title';
            titleInput.value = 'New Report';
            titleInput.style.width = '100%';
            titleInput.style.padding = '8px';
            titleGroup.appendChild(titleLabel);
            titleGroup.appendChild(titleInput);
            modalBody.appendChild(titleGroup);
            
            // Visualizations section
            const vizGroup = document.createElement('div');
            vizGroup.style.marginBottom = '20px';
            const vizLabel = document.createElement('label');
            vizLabel.style.display = 'block';
            vizLabel.style.marginBottom = '8px';
            vizLabel.style.fontWeight = '600';
            vizLabel.textContent = 'Visualizations to Display:';
            const vizContainer = document.createElement('div');
            vizContainer.id = 'new-report-visualizations';
            vizContainer.style.maxHeight = '200px';
            vizContainer.style.overflowY = 'auto';
            vizContainer.style.border = '1px solid #ddd';
            vizContainer.style.borderRadius = '4px';
            vizContainer.style.padding = '10px';
            vizContainer.style.background = '#f9f9f9';
            
            if (visualizations.length === 0) {
                const noVizMsg = document.createElement('p');
                noVizMsg.style.color = '#666';
                noVizMsg.style.fontStyle = 'italic';
                noVizMsg.style.margin = '0';
                noVizMsg.textContent = 'No saved visualizations. Create visualizations first in the Visualization page.';
                vizContainer.appendChild(noVizMsg);
            } else {
                visualizations.forEach(viz => {
                    const label = document.createElement('label');
                    label.style.display = 'block';
                    label.style.padding = '8px';
                    label.style.marginBottom = '4px';
                    label.style.cursor = 'pointer';
                    label.style.borderRadius = '4px';
                    label.addEventListener('mouseenter', () => label.style.background = '#e9ecef');
                    label.addEventListener('mouseleave', () => label.style.background = 'transparent');
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'new-report-viz-checkbox';
                    checkbox.value = viz.id;
                    checkbox.style.marginRight = '8px';
                    
                    const span = document.createElement('span');
                    span.innerHTML = `${this.escapeHtml(viz.name)} <span style="color: #666;">(${viz.type})</span>`;
                    
                    label.appendChild(checkbox);
                    label.appendChild(span);
                    vizContainer.appendChild(label);
                });
            }
            
            vizGroup.appendChild(vizLabel);
            vizGroup.appendChild(vizContainer);
            modalBody.appendChild(vizGroup);
            
            // Filters section
            const filterGroup = document.createElement('div');
            filterGroup.style.marginBottom = '20px';
            const filterLabel = document.createElement('label');
            filterLabel.style.display = 'block';
            filterLabel.style.marginBottom = '8px';
            filterLabel.style.fontWeight = '600';
            filterLabel.textContent = 'Filters to Apply:';
            const filterContainer = document.createElement('div');
            filterContainer.id = 'new-report-filters';
            filterContainer.style.minHeight = '100px';
            filterContainer.style.border = '1px solid #ddd';
            filterContainer.style.borderRadius = '4px';
            filterContainer.style.padding = '10px';
            filterContainer.style.background = '#f9f9f9';
            const filterMsg = document.createElement('p');
            filterMsg.style.color = '#666';
            filterMsg.style.fontStyle = 'italic';
            filterMsg.style.margin = '0';
            filterMsg.textContent = 'No filters added. You can add filters after creating the report.';
            filterContainer.appendChild(filterMsg);
            filterGroup.appendChild(filterLabel);
            filterGroup.appendChild(filterContainer);
            modalBody.appendChild(filterGroup);
            
            // Footer
            const modalFooter = document.createElement('div');
            modalFooter.className = 'modal-footer';
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => {
                Modal.closeModal(backdrop);
                resolve(false);
            });
            const createBtn = document.createElement('button');
            createBtn.className = 'btn btn-primary';
            createBtn.textContent = 'Create Report';
            createBtn.addEventListener('click', async () => {
                const title = titleInput.value.trim();
                if (!title) {
                    await Modal.alert('Report title is required.');
                    return;
                }
                
                const vizCheckboxes = modalBody.querySelectorAll('.new-report-viz-checkbox:checked');
                const visualizationIds = Array.from(vizCheckboxes).map(cb => cb.value);
                const filters = [];
                
                try {
                    this.currentReport = reportsStore.create(title, visualizationIds, filters, { users: [], groups: [] }, [], []);
                    Modal.closeModal(backdrop);
                    await Modal.alert(`Report "${title}" created successfully!`);
                    this.showReportEditor();
                    resolve(true);
                } catch (error) {
                    console.error('Error creating report:', error);
                    await Modal.alert(`Error creating report: ${error.message || 'Unknown error'}`);
                }
            });
            modalFooter.appendChild(cancelBtn);
            modalFooter.appendChild(createBtn);
            
            // Assemble modal
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modalContent.appendChild(modalFooter);
            modal.appendChild(modalContent);
            backdrop.appendChild(modal);
            document.body.appendChild(backdrop);
            
            // Focus title input
            setTimeout(() => {
                titleInput.focus();
                titleInput.select();
            }, 100);
            
            // Close on backdrop click
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    Modal.closeModal(backdrop);
                    resolve(false);
                }
            });
        });
    }
    
    showReportEditor() {
        const editorContainer = this.container.querySelector('#report-editor-container');
        const listContainer = this.container.querySelector('#reports-list-container');
        const previewContainer = this.container.querySelector('#report-preview-container');
        
        listContainer.style.display = 'none';
        previewContainer.style.display = 'none';
        editorContainer.style.display = 'block';
        
        this.renderReportEditor();
    }
    
    renderReportEditor() {
        if (!this.currentReport) {
            return;
        }
        
        const report = reportsStore.get(this.currentReport.id);
        if (!report) {
            this.currentReport = null;
            return;
        }
        
        const editorContainer = this.container.querySelector('#report-editor-container');
        const visualizations = visualizationsStore.getAll();
        const datasets = datasetStore.getAll();
        
        // Get selected visualizations
        const selectedVizIds = new Set(report.visualizationIds);
        
        editorContainer.innerHTML = `
            <div class="report-editor">
                <div class="editor-header">
                    <h2>Edit Report: ${this.escapeHtml(report.title)}</h2>
                    <div class="editor-actions">
                        <button type="button" class="btn btn-secondary" id="back-to-list-btn">Back to List</button>
                        <button type="button" class="btn btn-primary" id="preview-report-btn">Preview</button>
                        <button type="button" class="btn btn-primary" id="save-report-btn">Save Report</button>
                    </div>
                </div>
                
                <div class="editor-content">
                    <div class="editor-section">
                        <h3>Report Title</h3>
                        <input type="text" id="report-title-input" class="form-control" value="${this.escapeHtml(report.title)}" placeholder="Enter report title">
                    </div>
                    
                    <div class="editor-section">
                        <h3>Visualizations</h3>
                        <p class="help-text">Select visualizations to include in this report/dashboard:</p>
                        <div class="visualizations-list" id="visualizations-list">
                            ${visualizations.length === 0 
                                ? '<p class="empty-state">No saved visualizations. Create visualizations first in the Visualization page.</p>'
                                : visualizations.map(viz => `
                                    <label class="checkbox-label">
                                        <input type="checkbox" class="viz-checkbox" value="${viz.id}" ${selectedVizIds.has(viz.id) ? 'checked' : ''}>
                                        <span>${this.escapeHtml(viz.name)} (${viz.type})</span>
                                    </label>
                                `).join('')}
                        </div>
                    </div>
                    
                    <div class="editor-section">
                        <h3>Filters</h3>
                        <p class="help-text">Add filters to display in the report (e.g., date ranges, dataset fields):</p>
                        <div id="filters-list">
                            ${this.renderFilters(report.filters, datasets)}
                        </div>
                        <button type="button" class="btn btn-secondary" id="add-filter-btn">Add Filter</button>
                    </div>
                    
                    <div class="editor-section">
                        <h3>Custom Text</h3>
                        <p class="help-text">Add custom text blocks to display in the report/dashboard:</p>
                        <div id="custom-texts-list">
                            ${this.renderCustomTexts(report.customTexts || [])}
                        </div>
                        <button type="button" class="btn btn-secondary" id="add-custom-text-btn">Add Custom Text</button>
                    </div>
                    
                    <div class="editor-section">
                        <h3>Custom Buttons</h3>
                        <p class="help-text">Add custom buttons that can open LIMS windows/workflows or navigate to other reports:</p>
                        <div id="custom-buttons-list">
                            ${this.renderCustomButtons(report.customButtons || [])}
                        </div>
                        <button type="button" class="btn btn-secondary" id="add-custom-button-btn">Add Custom Button</button>
                    </div>
                    
                    <div class="editor-section">
                        <h3>Access Control</h3>
                        <p class="help-text">Manage user and group access to this report:</p>
                        
                        <div class="access-section">
                            <h4>Users</h4>
                            <div id="users-list">
                                ${this.renderAccessList(report.access.users, 'user')}
                            </div>
                            <div class="add-access-row">
                                <input type="text" id="add-user-input" class="form-control" placeholder="Enter username">
                                <button type="button" class="btn btn-sm btn-secondary" id="add-user-btn">Add User</button>
                            </div>
                        </div>
                        
                        <div class="access-section">
                            <h4>Groups</h4>
                            <div id="groups-list">
                                ${this.renderAccessList(report.access.groups, 'group')}
                            </div>
                            <div class="add-access-row">
                                <input type="text" id="add-group-input" class="form-control" placeholder="Enter group name">
                                <button type="button" class="btn btn-sm btn-secondary" id="add-group-btn">Add Group</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.attachEditorEventListeners();
    }
    
    renderFilters(filters, datasets) {
        if (filters.length === 0) {
            return '<p class="empty-state">No filters added.</p>';
        }
        
        return filters.map((filter, index) => `
            <div class="filter-item" data-filter-index="${index}">
                <div class="filter-row">
                    <select class="form-control filter-dataset" data-index="${index}">
                        <option value="">-- Select Dataset --</option>
                        ${datasets.map(ds => `
                            <option value="${ds.id}" ${filter.datasetId === ds.id ? 'selected' : ''}>${this.escapeHtml(ds.name)}</option>
                        `).join('')}
                    </select>
                    <select class="form-control filter-field" data-index="${index}">
                        <option value="">-- Select Field --</option>
                        ${filter.datasetId && datasets.find(ds => ds.id === filter.datasetId) 
                            ? datasets.find(ds => ds.id === filter.datasetId).columns.map(col => `
                                <option value="${col}" ${filter.field === col ? 'selected' : ''}>${this.escapeHtml(col)}</option>
                            `).join('')
                            : ''}
                    </select>
                    <select class="form-control filter-type" data-index="${index}">
                        <option value="date" ${filter.type === 'date' ? 'selected' : ''}>Date</option>
                        <option value="text" ${filter.type === 'text' ? 'selected' : ''}>Text</option>
                        <option value="number" ${filter.type === 'number' ? 'selected' : ''}>Number</option>
                        <option value="select" ${filter.type === 'select' ? 'selected' : ''}>Select</option>
                    </select>
                    <button type="button" class="btn btn-sm btn-danger remove-filter-btn" data-index="${index}">Remove</button>
                </div>
            </div>
        `).join('');
    }
    
    renderAccessList(items, type) {
        if (items.length === 0) {
            return `<p class="empty-state">No ${type}s added.</p>`;
        }
        
        return items.map((item, index) => `
            <div class="access-item" data-type="${type}" data-index="${index}">
                <span>${this.escapeHtml(item)}</span>
                <button type="button" class="btn btn-sm btn-danger remove-access-btn" data-type="${type}" data-index="${index}">Remove</button>
            </div>
        `).join('');
    }
    
    attachEditorEventListeners() {
        const backBtn = this.container.querySelector('#back-to-list-btn');
        const saveBtn = this.container.querySelector('#save-report-btn');
        const previewBtn = this.container.querySelector('#preview-report-btn');
        const addFilterBtn = this.container.querySelector('#add-filter-btn');
        const addUserBtn = this.container.querySelector('#add-user-btn');
        const addGroupBtn = this.container.querySelector('#add-group-btn');
        const addCustomTextBtn = this.container.querySelector('#add-custom-text-btn');
        const addCustomButtonBtn = this.container.querySelector('#add-custom-button-btn');
        
        if (backBtn) {
            backBtn.addEventListener('click', () => this.backToList());
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveReport());
        }
        
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewReport(this.currentReport.id));
        }
        
        if (addFilterBtn) {
            addFilterBtn.addEventListener('click', () => this.addFilter());
        }
        
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.addAccessItem('user'));
        }
        
        if (addGroupBtn) {
            addGroupBtn.addEventListener('click', () => this.addAccessItem('group'));
        }
        
        if (addCustomTextBtn) {
            addCustomTextBtn.addEventListener('click', () => this.addCustomText());
        }
        
        if (addCustomButtonBtn) {
            addCustomButtonBtn.addEventListener('click', () => this.addCustomButton());
        }
        
        // Custom text and button event listeners
        this.container.querySelectorAll('.remove-custom-text-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.removeCustomText(index);
            });
        });
        
        this.container.querySelectorAll('.remove-custom-button-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.removeCustomButton(index);
            });
        });
        
        this.container.querySelectorAll('.edit-custom-text-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.editCustomText(index);
            });
        });
        
        this.container.querySelectorAll('.edit-custom-button-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.editCustomButton(index);
            });
        });
        
        // Remove filter buttons
        this.container.querySelectorAll('.remove-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.removeFilter(index);
            });
        });
        
        // Remove access buttons
        this.container.querySelectorAll('.remove-access-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.getAttribute('data-type');
                const index = parseInt(e.target.getAttribute('data-index'));
                this.removeAccessItem(type, index);
            });
        });
        
        // Dataset change handler for filters
        this.container.querySelectorAll('.filter-dataset').forEach(select => {
            select.addEventListener('change', (e) => {
                const datasetId = e.target.value;
                const index = parseInt(e.target.getAttribute('data-index'));
                this.updateFilterDataset(index, datasetId);
            });
        });
    }
    
    addFilter() {
        const report = reportsStore.get(this.currentReport.id);
        if (!report) return;
        
        const newFilter = {
            datasetId: '',
            field: '',
            type: 'date',
            label: ''
        };
        
        report.filters.push(newFilter);
        reportsStore.update(this.currentReport.id, { filters: report.filters });
        this.renderReportEditor();
    }
    
    removeFilter(index) {
        const report = reportsStore.get(this.currentReport.id);
        if (!report) return;
        
        report.filters.splice(index, 1);
        reportsStore.update(this.currentReport.id, { filters: report.filters });
        this.renderReportEditor();
    }
    
    updateFilterDataset(index, datasetId) {
        const report = reportsStore.get(this.currentReport.id);
        if (!report || !report.filters[index]) return;
        
        report.filters[index].datasetId = datasetId;
        report.filters[index].field = ''; // Reset field when dataset changes
        reportsStore.update(this.currentReport.id, { filters: report.filters });
        this.renderReportEditor();
    }
    
    addAccessItem(type) {
        const report = reportsStore.get(this.currentReport.id);
        if (!report) return;
        
        const input = this.container.querySelector(`#add-${type}-input`);
        const value = input ? input.value.trim() : '';
        
        if (!value) {
            return;
        }
        
        if (report.access[type + 's'].includes(value)) {
            Modal.alert(`${type.charAt(0).toUpperCase() + type.slice(1)} already added.`);
            return;
        }
        
        report.access[type + 's'].push(value);
        reportsStore.update(this.currentReport.id, { access: report.access });
        
        if (input) {
            input.value = '';
        }
        
        this.renderReportEditor();
    }
    
    removeAccessItem(type, index) {
        const report = reportsStore.get(this.currentReport.id);
        if (!report) return;
        
        report.access[type + 's'].splice(index, 1);
        reportsStore.update(this.currentReport.id, { access: report.access });
        this.renderReportEditor();
    }
    
    async saveReport() {
        if (!this.currentReport) {
            return;
        }
        
        const titleInput = this.container.querySelector('#report-title-input');
        const title = titleInput ? titleInput.value.trim() : '';
        
        if (!title) {
            await Modal.alert('Report title is required.');
            return;
        }
        
        // Get selected visualizations
        const vizCheckboxes = this.container.querySelectorAll('.viz-checkbox:checked');
        const visualizationIds = Array.from(vizCheckboxes).map(cb => cb.value);
        
        // Get filters
        const report = reportsStore.get(this.currentReport.id);
        const filters = report ? report.filters : [];
        
        // Get access
        const access = report ? report.access : { users: [], groups: [] };
        
        // Get custom texts and buttons
        const customTexts = report ? (report.customTexts || []) : [];
        const customButtons = report ? (report.customButtons || []) : [];
        
        // Update report
        reportsStore.update(this.currentReport.id, {
            title,
            visualizationIds,
            filters,
            access,
            customTexts,
            customButtons
        });
        
        await Modal.alert('Report saved successfully!');
        this.backToList();
    }
    
    async editReport(reportId) {
        this.currentReport = { id: reportId };
        this.showReportEditor();
    }
    
    async duplicateReport(reportId) {
        const newReport = reportsStore.duplicate(reportId);
        if (newReport) {
            await Modal.alert('Report duplicated successfully!');
            this.renderReportsList();
        } else {
            await Modal.alert('Error duplicating report.');
        }
    }
    
    async deleteReport(reportId) {
        const confirmed = await Modal.confirm('Are you sure you want to delete this report?');
        if (!confirmed) {
            return;
        }
        
        reportsStore.delete(reportId);
        this.renderReportsList();
        
        if (this.currentReport && this.currentReport.id === reportId) {
            this.currentReport = null;
            this.backToList();
        }
    }
    
    async previewReport(reportId) {
        const report = reportsStore.get(reportId);
        if (!report) {
            await Modal.alert('Report not found.');
            return;
        }
        
        const previewContainer = this.container.querySelector('#report-preview-container');
        const listContainer = this.container.querySelector('#reports-list-container');
        const editorContainer = this.container.querySelector('#report-editor-container');
        const viewModeContainer = this.container.querySelector('#report-view-mode');
        
        listContainer.style.display = 'none';
        editorContainer.style.display = 'none';
        viewModeContainer.style.display = 'none';
        previewContainer.style.display = 'block';
        
        this.renderPreview(report);
    }
    
    async showViewMode(reportId) {
        const report = reportsStore.get(reportId);
        if (!report) {
            await Modal.alert('Report not found.');
            return;
        }
        
        // Hide all other containers
        const listContainer = this.container.querySelector('#reports-list-container');
        const editorContainer = this.container.querySelector('#report-editor-container');
        const previewContainer = this.container.querySelector('#report-preview-container');
        const viewModeContainer = this.container.querySelector('#report-view-mode');
        
        listContainer.style.display = 'none';
        editorContainer.style.display = 'none';
        previewContainer.style.display = 'none';
        viewModeContainer.style.display = 'block';
        
        // Make view mode full screen
        viewModeContainer.classList.add('view-mode-active');
        
        this.renderViewMode(report);
    }
    
    renderViewMode(report) {
        const viewModeContainer = this.container.querySelector('#report-view-mode');
        const visualizations = report.visualizationIds
            .map(id => visualizationsStore.get(id))
            .filter(viz => viz !== undefined);
        
        // Get datasets for filter options
        const datasets = datasetStore.getAll();
        
        // Initialize active filters if not set
        if (!this.activeFilters[report.id]) {
            this.activeFilters[report.id] = {};
        }
        
        viewModeContainer.innerHTML = `
            <div class="view-mode-wrapper">
                <div class="view-mode-header">
                    <div class="view-mode-title">
                        <h1>${this.escapeHtml(report.title)}</h1>
                        <p class="view-mode-subtitle">Preview of how this report appears to viewers</p>
                    </div>
                    <div class="view-mode-actions">
                        <button type="button" class="btn btn-sm btn-secondary" id="exit-view-mode-btn" title="Exit View Mode (ESC)">
                            <span class="material-icons">close</span> Exit View Mode
                        </button>
                    </div>
                </div>
                
                <div class="view-mode-content">
                    ${(report.customTexts && report.customTexts.length > 0) ? `
                        <div class="view-mode-custom-texts">
                            ${report.customTexts.map(textItem => `
                                <div class="view-mode-text-block">${this.escapeHtml(textItem.text)}</div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${(report.customButtons && report.customButtons.length > 0) ? `
                        <div class="view-mode-custom-buttons">
                            ${report.customButtons.map((button, index) => `
                                <button type="button" class="btn btn-primary view-mode-action-button" 
                                        data-button-index="${index}" 
                                        data-report-id="${report.id}">
                                    ${this.escapeHtml(button.label)}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${report.filters.length > 0 ? `
                        <div class="view-mode-filters">
                            <h3>Filters</h3>
                            <div class="filters-controls">
                                ${this.renderFilterControls(report.filters, datasets, report.id)}
                            </div>
                            <div class="filter-actions">
                                <button type="button" class="btn btn-primary" id="view-mode-apply-filters-btn">Apply Filters</button>
                                <button type="button" class="btn btn-secondary" id="view-mode-clear-filters-btn">Clear Filters</button>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="view-mode-visualizations" id="view-mode-visualizations">
                        ${visualizations.length === 0 
                            ? '<div class="empty-state"><p>No visualizations in this report.</p></div>'
                            : this.renderVisualizations(visualizations, report.id)
                        }
                    </div>
                </div>
            </div>
        `;
        
        // Attach event listeners
        const exitBtn = viewModeContainer.querySelector('#exit-view-mode-btn');
        const applyFiltersBtn = viewModeContainer.querySelector('#view-mode-apply-filters-btn');
        const clearFiltersBtn = viewModeContainer.querySelector('#view-mode-clear-filters-btn');
        
        if (exitBtn) {
            exitBtn.addEventListener('click', () => this.exitViewMode());
        }
        
        // Add ESC key listener to exit view mode
        const escHandler = (e) => {
            if (e.key === 'Escape' && viewModeContainer.style.display !== 'none') {
                this.exitViewMode();
            }
        };
        document.addEventListener('keydown', escHandler);
        this.viewModeEscHandler = escHandler;
        
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFiltersInViewMode(report.id));
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFiltersInViewMode(report.id));
        }
        
        // Attach custom button click handlers
        viewModeContainer.querySelectorAll('.view-mode-action-button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const buttonIndex = parseInt(e.target.getAttribute('data-button-index'));
                const reportId = e.target.getAttribute('data-report-id');
                const report = reportsStore.get(reportId);
                if (report && report.customButtons && report.customButtons[buttonIndex]) {
                    await this.executeButtonAction(report.customButtons[buttonIndex], reportId);
                }
            });
        });
        
        // Render visualizations after DOM is ready
        setTimeout(() => {
            this.renderVisualizationCharts(visualizations, report.id, '#view-mode-visualizations');
        }, 100);
    }
    
    applyFiltersInViewMode(reportId) {
        const viewModeContainer = this.container.querySelector('#report-view-mode');
        if (!viewModeContainer) return;
        
        // Collect filter values from inputs
        const filterInputs = viewModeContainer.querySelectorAll('.filter-input');
        const activeFilters = {};
        
        filterInputs.forEach(input => {
            const filterKey = input.getAttribute('data-filter-key');
            const value = input.value.trim();
            if (filterKey) {
                if (value) {
                    activeFilters[filterKey] = value;
                } else {
                    delete activeFilters[filterKey];
                }
            }
        });
        
        // Store active filters (combine with dashboard filters if they exist)
        this.activeFilters[reportId] = { ...(this.activeFilters[reportId] || {}), ...activeFilters };
        if (this.dashboardFilters) {
            this.dashboardFilters = { ...this.dashboardFilters, ...activeFilters };
        }
        
        // Re-render visualizations with filters applied
        const report = reportsStore.get(reportId);
        if (report) {
            const visualizations = report.visualizationIds
                .map(id => visualizationsStore.get(id))
                .filter(viz => viz !== undefined);
            
            const visualizationsContainer = viewModeContainer.querySelector('#view-mode-visualizations');
            if (visualizationsContainer) {
                visualizationsContainer.innerHTML = this.renderVisualizations(visualizations, reportId);
                // Re-render charts
                setTimeout(() => {
                    this.renderVisualizationCharts(visualizations, reportId, '#view-mode-visualizations');
                }, 100);
            }
        }
    }
    
    clearFiltersInViewMode(reportId) {
        // Clear all filter values
        this.activeFilters[reportId] = {};
        if (this.dashboardFilters) {
            this.dashboardFilters = {};
        }
        
        // Reset filter inputs
        const viewModeContainer = this.container.querySelector('#report-view-mode');
        if (viewModeContainer) {
            const filterInputs = viewModeContainer.querySelectorAll('.filter-input');
            filterInputs.forEach(input => {
                input.value = '';
            });
        }
        
        // Re-render visualizations without filters
        const report = reportsStore.get(reportId);
        if (report) {
            const visualizations = report.visualizationIds
                .map(id => visualizationsStore.get(id))
                .filter(viz => viz !== undefined);
            
            const visualizationsContainer = viewModeContainer.querySelector('#view-mode-visualizations');
            if (visualizationsContainer) {
                visualizationsContainer.innerHTML = this.renderVisualizations(visualizations, reportId);
                // Re-render charts
                setTimeout(() => {
                    this.renderVisualizationCharts(visualizations, reportId, '#view-mode-visualizations');
                }, 100);
            }
        }
    }
    
    exitViewMode() {
        const viewModeContainer = this.container.querySelector('#report-view-mode');
        const listContainer = this.container.querySelector('#reports-list-container');
        
        if (viewModeContainer) {
            viewModeContainer.style.display = 'none';
            viewModeContainer.classList.remove('view-mode-active');
        }
        
        if (listContainer) {
            listContainer.style.display = 'block';
        }
        
        // Remove ESC key listener
        if (this.viewModeEscHandler) {
            document.removeEventListener('keydown', this.viewModeEscHandler);
            this.viewModeEscHandler = null;
        }
    }
    
    renderPreview(report) {
        const previewContainer = this.container.querySelector('#report-preview-container');
        const visualizations = report.visualizationIds
            .map(id => visualizationsStore.get(id))
            .filter(viz => viz !== undefined);
        
        // Get datasets for filter options
        const datasets = datasetStore.getAll();
        
        // Initialize active filters if not set
        if (!this.activeFilters[report.id]) {
            this.activeFilters[report.id] = {};
        }
        
        previewContainer.innerHTML = `
            <div class="report-preview">
                <div class="preview-header">
                    <h2>${this.escapeHtml(report.title)}</h2>
                    <div class="preview-actions">
                        <button type="button" class="btn btn-secondary" id="back-from-preview-btn">Back</button>
                        <button type="button" class="btn btn-primary" id="export-pdf-btn">Export as PDF</button>
                    </div>
                </div>
                
                ${(report.customTexts && report.customTexts.length > 0) ? `
                    <div class="preview-custom-texts">
                        ${report.customTexts.map(textItem => `
                            <div class="custom-text-block">${this.escapeHtml(textItem.text)}</div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${(report.customButtons && report.customButtons.length > 0) ? `
                    <div class="preview-custom-buttons">
                        ${report.customButtons.map((button, index) => `
                            <button type="button" class="btn btn-primary custom-action-button" 
                                    data-button-index="${index}" 
                                    data-report-id="${report.id}">
                                ${this.escapeHtml(button.label)}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${report.filters.length > 0 ? `
                    <div class="preview-filters">
                        <h3>Filters</h3>
                        <p class="help-text">Use the filters below to filter the data displayed in the visualizations:</p>
                        <div class="filters-controls">
                            ${this.renderFilterControls(report.filters, datasets, report.id)}
                        </div>
                        <div class="filter-actions">
                            <button type="button" class="btn btn-sm btn-primary" id="apply-filters-btn">Apply Filters</button>
                            <button type="button" class="btn btn-sm btn-secondary" id="clear-filters-btn">Clear Filters</button>
                        </div>
                    </div>
                ` : ''}
                
                <div class="preview-visualizations" id="preview-visualizations">
                    ${visualizations.length === 0 
                        ? '<p class="empty-state">No visualizations in this report.</p>'
                        : this.renderVisualizations(visualizations, report.id)
                    }
                </div>
            </div>
        `;
        
        // Attach event listeners
        const backBtn = previewContainer.querySelector('#back-from-preview-btn');
        const exportBtn = previewContainer.querySelector('#export-pdf-btn');
        const applyFiltersBtn = previewContainer.querySelector('#apply-filters-btn');
        const clearFiltersBtn = previewContainer.querySelector('#clear-filters-btn');
        
        if (backBtn) {
            backBtn.addEventListener('click', () => this.backToList());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToPDF(report.id));
        }
        
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters(report.id));
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters(report.id));
        }
        
        // Attach custom button click handlers
        previewContainer.querySelectorAll('.custom-action-button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const buttonIndex = parseInt(e.target.getAttribute('data-button-index'));
                const reportId = e.target.getAttribute('data-report-id');
                const report = reportsStore.get(reportId);
                if (report && report.customButtons && report.customButtons[buttonIndex]) {
                    await this.executeButtonAction(report.customButtons[buttonIndex], reportId);
                }
            });
        });
        
        // Render visualizations after DOM is ready
        setTimeout(() => {
            this.renderVisualizationCharts(visualizations, report.id, '#preview-visualizations');
        }, 100);
    }
    
    getFilterLabel(filter) {
        if (filter.field) {
            return filter.field;
        }
        if (filter.datasetId) {
            const dataset = datasetStore.get(filter.datasetId);
            return dataset ? dataset.name : 'Unknown Dataset';
        }
        return 'Unnamed Filter';
    }
    
    renderFilterControls(filters, datasets, reportId) {
        const activeFilters = this.activeFilters[reportId] || {};
        
        return filters.map((filter, index) => {
            const filterKey = `${filter.datasetId}_${filter.field}_${index}`;
            const currentValue = activeFilters[filterKey] || '';
            
            // Get dataset for field options
            const dataset = filter.datasetId ? datasetStore.get(filter.datasetId) : null;
            const fieldIndex = dataset && filter.field ? dataset.columns.indexOf(filter.field) : -1;
            
            // Get unique values for select type filters
            let options = [];
            if (filter.type === 'select' && dataset && fieldIndex >= 0) {
                const uniqueValues = new Set();
                dataset.rows.forEach(row => {
                    if (row[fieldIndex] !== null && row[fieldIndex] !== undefined) {
                        uniqueValues.add(String(row[fieldIndex]));
                    }
                });
                options = Array.from(uniqueValues).sort();
            }
            
            let filterControl = '';
            const label = filter.label || filter.field || 'Unnamed Filter';
            
            // Use filterKey instead of index to ensure unique IDs
            const filterId = `filter-${filterKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
            
            if (filter.type === 'date') {
                filterControl = `
                    <div class="filter-control-group">
                        <label for="${filterId}">${this.escapeHtml(label)}</label>
                        <input type="date" id="${filterId}" class="form-control filter-input" 
                               data-filter-key="${filterKey}" value="${currentValue}">
                    </div>
                `;
            } else if (filter.type === 'select' && options.length > 0) {
                filterControl = `
                    <div class="filter-control-group">
                        <label for="${filterId}">${this.escapeHtml(label)}</label>
                        <select id="${filterId}" class="form-control filter-input" 
                                data-filter-key="${filterKey}">
                            <option value="">All</option>
                            ${options.map(opt => `
                                <option value="${this.escapeHtml(opt)}" ${currentValue === opt ? 'selected' : ''}>
                                    ${this.escapeHtml(opt)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
            } else if (filter.type === 'number') {
                filterControl = `
                    <div class="filter-control-group">
                        <label for="${filterId}">${this.escapeHtml(label)}</label>
                        <input type="number" id="${filterId}" class="form-control filter-input" 
                               data-filter-key="${filterKey}" value="${currentValue}" placeholder="Enter number">
                    </div>
                `;
            } else {
                // Text input
                filterControl = `
                    <div class="filter-control-group">
                        <label for="${filterId}">${this.escapeHtml(label)}</label>
                        <input type="text" id="${filterId}" class="form-control filter-input" 
                               data-filter-key="${filterKey}" value="${currentValue}" 
                               placeholder="Enter text to filter">
                    </div>
                `;
            }
            
            return `
                <div class="filter-control-item" data-filter-index="${index}">
                    ${filterControl}
                </div>
            `;
        }).join('');
    }
    
    renderVisualizations(visualizations, reportId) {
        if (visualizations.length === 0) {
            return '<p class="empty-state">No visualizations in this report.</p>';
        }
        
        // Combine active filters and dashboard filters if they exist
        const activeFilters = this.activeFilters[reportId] || {};
        const allFilters = this.dashboardFilters ? { ...activeFilters, ...this.dashboardFilters } : activeFilters;
        
        return visualizations.map(viz => {
            // Get the dataset for this visualization
            const dataset = viz.datasetId ? datasetStore.get(viz.datasetId) : null;
            let filteredData = null;
            
            if (dataset) {
                // Apply filters to dataset
                filteredData = this.applyFiltersToDataset(dataset, allFilters, reportId);
            }
            
            // Render visualization with container for chart rendering
            return `
                <div class="preview-viz-item" data-viz-id="${viz.id}">
                    <h4>${this.escapeHtml(viz.name)}</h4>
                    <div id="viz-container-${viz.id}" class="viz-preview-container">
                        ${this.renderVisualizationPreview(viz, filteredData || dataset)}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderVisualizationPreview(viz, dataset) {
        if (!dataset) {
            return '<p class="empty-state">No dataset associated with this visualization.</p>';
        }
        
        // In a real implementation, this would render the actual chart
        // For now, we'll show a simplified preview with data summary
        const rowCount = dataset.rows.length;
        const columnCount = dataset.columns.length;
        
        // Show a preview table with first few rows
        const previewRows = dataset.rows.slice(0, 5);
        
        return `
            <div class="viz-preview-content">
                <div class="viz-preview-info">
                    <span>Type: ${viz.type}</span>
                    <span>Data: ${rowCount} rows, ${columnCount} columns</span>
                </div>
                <div class="viz-preview-table">
                    <table class="data-table">
                        <thead>
                            <tr>
                                ${dataset.columns.map(col => `<th>${this.escapeHtml(col)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${previewRows.map(row => `
                                <tr>
                                    ${row.map(cell => `<td>${this.escapeHtml(String(cell))}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${rowCount > 5 ? `<p class="help-text">Showing first 5 of ${rowCount} rows</p>` : ''}
                </div>
                <p class="help-text">Note: In a full implementation, this would render a ${viz.type} chart based on the configuration.</p>
            </div>
        `;
    }
    
    applyFiltersToDataset(dataset, activeFilters, reportId) {
        if (!dataset || !activeFilters || Object.keys(activeFilters).length === 0) {
            return dataset;
        }
        
        // Get report to find filters for this dataset
        const report = reportsStore.get(reportId);
        if (!report || !report.filters) {
            return dataset;
        }
        
        // Find filters that apply to this dataset
        const applicableFilters = report.filters.filter(f => f.datasetId === dataset.id);
        
        if (applicableFilters.length === 0) {
            return dataset;
        }
        
        // Filter rows based on active filter values
        let filteredRows = dataset.rows.filter(row => {
            return applicableFilters.every((filter, index) => {
                const filterKey = `${filter.datasetId}_${filter.field}_${index}`;
                const filterValue = activeFilters[filterKey];
                
                // If no filter value is set, include the row
                if (!filterValue || filterValue === '') {
                    return true;
                }
                
                // Get the column index
                const fieldIndex = dataset.columns.indexOf(filter.field);
                if (fieldIndex < 0) {
                    return true; // Field doesn't exist, include row
                }
                
                const cellValue = row[fieldIndex];
                
                // Apply filter based on type
                if (filter.type === 'date') {
                    // Date comparison
                    const cellDate = new Date(cellValue);
                    const filterDate = new Date(filterValue);
                    if (isNaN(cellDate.getTime()) || isNaN(filterDate.getTime())) {
                        return true;
                    }
                    return cellDate.toDateString() === filterDate.toDateString();
                } else if (filter.type === 'number') {
                    // Number comparison
                    const cellNum = parseFloat(cellValue);
                    const filterNum = parseFloat(filterValue);
                    if (isNaN(cellNum) || isNaN(filterNum)) {
                        return true;
                    }
                    return cellNum === filterNum;
                } else if (filter.type === 'select') {
                    // Exact match
                    return String(cellValue) === String(filterValue);
                } else {
                    // Text contains
                    return String(cellValue).toLowerCase().includes(String(filterValue).toLowerCase());
                }
            });
        });
        
        // Create a filtered dataset copy
        return {
            ...dataset,
            rows: filteredRows
        };
    }
    
    applyFilters(reportId) {
        const previewContainer = this.container.querySelector('#report-preview-container');
        if (!previewContainer) return;
        
        // Collect filter values from inputs
        const filterInputs = previewContainer.querySelectorAll('.filter-input');
        const activeFilters = {};
        
        filterInputs.forEach(input => {
            const filterKey = input.getAttribute('data-filter-key');
            const value = input.value.trim();
            if (filterKey) {
                if (value) {
                    activeFilters[filterKey] = value;
                } else {
                    delete activeFilters[filterKey];
                }
            }
        });
        
        // Store active filters (combine with dashboard filters if they exist)
        this.activeFilters[reportId] = { ...(this.activeFilters[reportId] || {}), ...activeFilters };
        if (this.dashboardFilters) {
            this.dashboardFilters = { ...this.dashboardFilters, ...activeFilters };
        }
        
        // Re-render visualizations with filters applied
        const report = reportsStore.get(reportId);
        if (report) {
            const visualizations = report.visualizationIds
                .map(id => visualizationsStore.get(id))
                .filter(viz => viz !== undefined);
            
            const visualizationsContainer = previewContainer.querySelector('#preview-visualizations');
            if (visualizationsContainer) {
                visualizationsContainer.innerHTML = this.renderVisualizations(visualizations, reportId);
            }
        }
    }
    
    clearFilters(reportId) {
        // Clear all filter values
        this.activeFilters[reportId] = {};
        if (this.dashboardFilters) {
            this.dashboardFilters = {};
        }
        
        // Reset filter inputs
        const previewContainer = this.container.querySelector('#report-preview-container');
        if (previewContainer) {
            const filterInputs = previewContainer.querySelectorAll('.filter-input');
            filterInputs.forEach(input => {
                input.value = '';
            });
        }
        
        // Re-render visualizations without filters
        const report = reportsStore.get(reportId);
        if (report) {
            const visualizations = report.visualizationIds
                .map(id => visualizationsStore.get(id))
                .filter(viz => viz !== undefined);
            
            const visualizationsContainer = previewContainer.querySelector('#preview-visualizations');
            if (visualizationsContainer) {
                visualizationsContainer.innerHTML = this.renderVisualizations(visualizations, reportId);
            }
        }
    }
    
    async exportToPDF(reportId) {
        const report = reportsStore.get(reportId);
        if (!report) {
            await Modal.alert('Report not found.');
            return;
        }
        
        try {
            // Get active filters if any
            const activeFilters = this.activeFilters[reportId] || {};
            const hasActiveFilters = Object.keys(activeFilters).length > 0;
            
            // Get visualizations
            const visualizations = report.visualizationIds
                .map(id => visualizationsStore.get(id))
                .filter(viz => viz !== undefined);
            
            // Create a simplified version for printing
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${this.escapeHtml(report.title)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #333; margin-bottom: 10px; }
                        h2 { color: #555; margin-top: 20px; margin-bottom: 10px; }
                        h3 { color: #666; margin-top: 15px; margin-bottom: 8px; }
                        .report-meta { color: #777; font-size: 12px; margin-bottom: 15px; }
                        .filter-display-item { margin: 8px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; }
                        .filter-active { background: #e7f3ff; border-color: #007bff; }
                        .viz-preview-placeholder { margin: 20px 0; padding: 20px; border: 1px solid #ddd; background: #f9f9f9; border-radius: 4px; }
                        .data-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
                        .data-table th, .data-table td { padding: 6px; border: 1px solid #ddd; text-align: left; }
                        .data-table th { background: #f0f0f0; font-weight: bold; }
                        @media print {
                            @page { size: letter; margin: 0.75in; }
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <h1>${this.escapeHtml(report.title)}</h1>
                    <p class="report-meta">Generated on: ${new Date().toLocaleString()}</p>
                    ${hasActiveFilters ? `
                        <h2>Active Filters</h2>
                        ${report.filters.map((filter, index) => {
                            const filterKey = `${filter.datasetId}_${filter.field}_${index}`;
                            const filterValue = activeFilters[filterKey];
                            if (!filterValue) return '';
                            return `
                                <div class="filter-display-item filter-active">
                                    <strong>${this.getFilterLabel(filter)}</strong>: ${this.escapeHtml(String(filterValue))} (${filter.type})
                                </div>
                            `;
                        }).filter(f => f).join('')}
                    ` : ''}
                    ${report.filters.length > 0 && !hasActiveFilters ? `
                        <h2>Available Filters</h2>
                        <p class="report-meta">No filters applied. All available filters:</p>
                        ${report.filters.map(filter => `
                            <div class="filter-display-item">
                                <strong>${this.getFilterLabel(filter)}</strong> (${filter.type})
                            </div>
                        `).join('')}
                    ` : ''}
                    <h2>Visualizations</h2>
                    ${visualizations.map(viz => {
                        const dataset = viz.datasetId ? datasetStore.get(viz.datasetId) : null;
                        let filteredDataset = dataset;
                        
                        if (dataset && hasActiveFilters) {
                            filteredDataset = this.applyFiltersToDataset(dataset, activeFilters, reportId);
                        }
                        
                        const rowCount = filteredDataset ? filteredDataset.rows.length : 0;
                        const columnCount = filteredDataset ? filteredDataset.columns.length : 0;
                        const previewRows = filteredDataset ? filteredDataset.rows.slice(0, 10) : [];
                        
                        return `
                            <div class="viz-preview-placeholder">
                                <h3>${this.escapeHtml(viz.name)}</h3>
                                <p><strong>Type:</strong> ${viz.type}</p>
                                <p><strong>Data:</strong> ${rowCount} rows, ${columnCount} columns</p>
                                ${filteredDataset && previewRows.length > 0 ? `
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                ${filteredDataset.columns.map(col => `<th>${this.escapeHtml(col)}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${previewRows.map(row => `
                                                <tr>
                                                    ${row.map(cell => `<td>${this.escapeHtml(String(cell))}</td>`).join('')}
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                    ${rowCount > 10 ? `<p><em>Showing first 10 of ${rowCount} rows</em></p>` : ''}
                                ` : '<p>No data available.</p>'}
                                <p class="report-meta">Note: Charts would be rendered here in a full implementation.</p>
                            </div>
                        `;
                    }).join('')}
                </body>
                </html>
            `);
            printWindow.document.close();
            
            // Wait a bit then trigger print
            setTimeout(() => {
                printWindow.print();
            }, 250);
            
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            await Modal.alert(`Error exporting to PDF: ${error.message || 'Unknown error'}`);
        }
    }
    
    backToList() {
        const listContainer = this.container.querySelector('#reports-list-container');
        const editorContainer = this.container.querySelector('#report-editor-container');
        const previewContainer = this.container.querySelector('#report-preview-container');
        
        editorContainer.style.display = 'none';
        previewContainer.style.display = 'none';
        listContainer.style.display = 'block';
        
        this.currentReport = null;
        this.renderReportsList();
    }
    
    renderCustomTexts(customTexts) {
        if (customTexts.length === 0) {
            return '<p class="empty-state">No custom text added.</p>';
        }
        
        return customTexts.map((textItem, index) => `
            <div class="custom-text-item" data-index="${index}">
                <div class="custom-text-content">
                    <strong>Text:</strong> ${this.escapeHtml(textItem.text || '').substring(0, 50)}${(textItem.text || '').length > 50 ? '...' : ''}
                </div>
                <div class="custom-text-actions">
                    <button type="button" class="btn btn-sm btn-secondary edit-custom-text-btn" data-index="${index}">Edit</button>
                    <button type="button" class="btn btn-sm btn-danger remove-custom-text-btn" data-index="${index}">Remove</button>
                </div>
            </div>
        `).join('');
    }
    
    renderCustomButtons(customButtons) {
        if (customButtons.length === 0) {
            return '<p class="empty-state">No custom buttons added.</p>';
        }
        
        return customButtons.map((button, index) => `
            <div class="custom-button-item" data-index="${index}">
                <div class="custom-button-content">
                    <strong>Label:</strong> ${this.escapeHtml(button.label || '')}
                    <br><strong>Type:</strong> ${button.actionType || 'unknown'}
                    ${button.actionType === 'report' ? `<br><strong>Report:</strong> ${button.targetReportId || 'N/A'}` : ''}
                    ${button.actionType === 'lims' ? `<br><strong>LIMS:</strong> ${button.limsWindow || 'N/A'}` : ''}
                </div>
                <div class="custom-button-actions">
                    <button type="button" class="btn btn-sm btn-secondary edit-custom-button-btn" data-index="${index}">Edit</button>
                    <button type="button" class="btn btn-sm btn-danger remove-custom-button-btn" data-index="${index}">Remove</button>
                </div>
            </div>
        `).join('');
    }
    
    async addCustomText() {
        const report = reportsStore.get(this.currentReport.id);
        if (!report) return;
        
        const text = await Modal.prompt('Enter custom text:', '');
        if (!text || !text.trim()) {
            return;
        }
        
        const customTexts = report.customTexts || [];
        customTexts.push({
            id: `text_${Date.now()}`,
            text: text.trim(),
            order: customTexts.length
        });
        
        reportsStore.update(this.currentReport.id, { customTexts });
        this.renderReportEditor();
    }
    
    async editCustomText(index) {
        const report = reportsStore.get(this.currentReport.id);
        if (!report || !report.customTexts || !report.customTexts[index]) return;
        
        const currentText = report.customTexts[index].text || '';
        const newText = await Modal.prompt('Edit custom text:', currentText);
        if (newText === null) {
            return; // User cancelled
        }
        
        report.customTexts[index].text = newText.trim();
        reportsStore.update(this.currentReport.id, { customTexts: report.customTexts });
        this.renderReportEditor();
    }
    
    removeCustomText(index) {
        const report = reportsStore.get(this.currentReport.id);
        if (!report || !report.customTexts) return;
        
        report.customTexts.splice(index, 1);
        reportsStore.update(this.currentReport.id, { customTexts: report.customTexts });
        this.renderReportEditor();
    }
    
    async addCustomButton() {
        const report = reportsStore.get(this.currentReport.id);
        if (!report) return;
        
        const label = await Modal.prompt('Enter button label:', '');
        if (!label || !label.trim()) {
            return;
        }
        
        // Get action type
        const actionType = await Modal.select('Select button action:', [
            { value: 'lims', label: 'Open LIMS Window/Workflow' },
            { value: 'report', label: 'Open Another Report/Dashboard' }
        ]);
        
        if (!actionType) {
            return;
        }
        
        const customButtons = report.customButtons || [];
        const button = {
            id: `button_${Date.now()}`,
            label: label.trim(),
            actionType: actionType,
            order: customButtons.length
        };
        
        if (actionType === 'lims') {
            const limsWindow = await Modal.prompt('Enter LIMS window/workflow name or ID:', '');
            if (limsWindow) {
                button.limsWindow = limsWindow.trim();
            }
            const context = await Modal.prompt('Enter context data (JSON format, optional):', '{}');
            if (context) {
                try {
                    button.context = JSON.parse(context);
                } catch (e) {
                    await Modal.alert('Invalid JSON format. Context will be empty.');
                    button.context = {};
                }
            }
        } else if (actionType === 'report') {
            const reports = reportsStore.getAll();
            const reportOptions = reports
                .filter(r => r.id !== report.id)
                .map(r => ({ value: r.id, label: r.title }));
            
            if (reportOptions.length === 0) {
                await Modal.alert('No other reports available.');
                return;
            }
            
            const targetReportId = await Modal.select('Select target report:', reportOptions);
            if (!targetReportId) {
                return;
            }
            
            button.targetReportId = targetReportId;
            const context = await Modal.prompt('Enter context data (JSON format, optional):', '{}');
            if (context) {
                try {
                    button.context = JSON.parse(context);
                } catch (e) {
                    await Modal.alert('Invalid JSON format. Context will be empty.');
                    button.context = {};
                }
            }
        }
        
        customButtons.push(button);
        reportsStore.update(this.currentReport.id, { customButtons });
        this.renderReportEditor();
    }
    
    async editCustomButton(index) {
        const report = reportsStore.get(this.currentReport.id);
        if (!report || !report.customButtons || !report.customButtons[index]) return;
        
        const button = report.customButtons[index];
        
        const label = await Modal.prompt('Edit button label:', button.label || '');
        if (label === null) {
            return; // User cancelled
        }
        
        button.label = label.trim();
        
        // Update action-specific fields
        if (button.actionType === 'lims') {
            const limsWindow = await Modal.prompt('Edit LIMS window/workflow:', button.limsWindow || '');
            if (limsWindow !== null) {
                button.limsWindow = limsWindow.trim();
            }
        } else if (button.actionType === 'report') {
            const reports = reportsStore.getAll();
            const reportOptions = reports
                .filter(r => r.id !== report.id)
                .map(r => ({ value: r.id, label: r.title }));
            
            if (reportOptions.length > 0) {
                const targetReportId = await Modal.select('Select target report:', reportOptions, button.targetReportId);
                if (targetReportId) {
                    button.targetReportId = targetReportId;
                }
            }
        }
        
        reportsStore.update(this.currentReport.id, { customButtons: report.customButtons });
        this.renderReportEditor();
    }
    
    removeCustomButton(index) {
        const report = reportsStore.get(this.currentReport.id);
        if (!report || !report.customButtons) return;
        
        report.customButtons.splice(index, 1);
        reportsStore.update(this.currentReport.id, { customButtons: report.customButtons });
        this.renderReportEditor();
    }
    
    renderFilterControls(filters, datasets, reportId) {
        if (filters.length === 0) {
            return '<p class="empty-state">No filters configured.</p>';
        }
        
        const activeFilters = this.activeFilters[reportId] || {};
        
        return filters.map((filter, index) => {
            const filterKey = `${filter.datasetId}_${filter.field}`;
            const currentValue = activeFilters[filterKey] || '';
            const filterId = `active-filter-${filterKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
            
            return `
                <div class="filter-control" data-filter-index="${index}">
                    <label for="${filterId}">${this.getFilterLabel(filter)}:</label>
                    ${this.renderFilterInput(filter, currentValue, filterKey, filterId)}
                </div>
            `;
        }).join('');
    }
    
    renderFilterInput(filter, value, filterKey, filterId = null) {
        const idAttr = filterId ? `id="${filterId}"` : '';
        switch (filter.type) {
            case 'date':
                return `<input type="date" ${idAttr} class="form-control filter-input" data-filter-key="${filterKey}" value="${value}">`;
            case 'number':
                return `<input type="number" ${idAttr} class="form-control filter-input" data-filter-key="${filterKey}" value="${value}">`;
            case 'select':
                // For select, we'd need to get unique values from the dataset
                return `<input type="text" ${idAttr} class="form-control filter-input" data-filter-key="${filterKey}" value="${value}" placeholder="Enter value">`;
            case 'text':
            default:
                return `<input type="text" ${idAttr} class="form-control filter-input" data-filter-key="${filterKey}" value="${value}" placeholder="Enter text">`;
        }
    }
    
    
    async executeButtonAction(button, reportId) {
        if (button.actionType === 'lims') {
            // Open LIMS window/workflow
            const context = button.context || {};
            const limsWindow = button.limsWindow || '';
            
            // In a real implementation, this would integrate with LIMS API
            // For now, we'll show an alert and log the action
            console.log('Opening LIMS window/workflow:', limsWindow, 'with context:', context);
            await Modal.alert(`Opening LIMS window/workflow: ${limsWindow}\n\nContext: ${JSON.stringify(context, null, 2)}`);
            
            // Dispatch custom event for potential integration
            window.dispatchEvent(new CustomEvent('limsWindowOpen', {
                detail: {
                    window: limsWindow,
                    context: context,
                    reportId: reportId
                }
            }));
            
        } else if (button.actionType === 'report') {
            // Navigate to another report with context
            const targetReportId = button.targetReportId;
            const context = button.context || {};
            
            if (!targetReportId) {
                await Modal.alert('Target report not specified.');
                return;
            }
            
            const targetReport = reportsStore.get(targetReportId);
            if (!targetReport) {
                await Modal.alert('Target report not found.');
                return;
            }
            
            // Apply context as filters
            this.dashboardFilters = context;
            
            // Navigate to reports page and show the target report
            const navLink = document.querySelector('[data-page="reports"]');
            if (navLink) {
                navLink.click();
            }
            
            // Wait a bit for navigation, then show the report
            setTimeout(() => {
                this.previewReport(targetReportId);
            }, 100);
        }
    }
    
    applyVisualizationFilter(vizId, filterData) {
        // filterData should contain: { field, value, datasetId }
        // This will filter all visualizations in the current report
        
        const previewContainer = this.container.querySelector('#report-preview-container');
        if (!previewContainer || previewContainer.style.display === 'none') {
            return;
        }
        
        // Try to find the current report ID from the preview
        const reportTitle = previewContainer.querySelector('.preview-header h2');
        if (!reportTitle) return;
        
        const allReports = reportsStore.getAll();
        const report = allReports.find(r => r.title === reportTitle.textContent);
        if (!report) return;
        
        // Add filter to dashboard filters
        const filterKey = `${filterData.datasetId}_${filterData.field}`;
        this.dashboardFilters[filterKey] = filterData.value;
        
        // Also update active filters for this report
        if (!this.activeFilters[report.id]) {
            this.activeFilters[report.id] = {};
        }
        this.activeFilters[report.id][filterKey] = filterData.value;
        
        // Re-render preview with new filters
        this.renderPreview(report);
    }
    
    getCurrentReportFromPreview() {
        const previewContainer = this.container.querySelector('#report-preview-container');
        if (!previewContainer || previewContainer.style.display === 'none') {
            return null;
        }
        
        // Try to find report ID from the preview
        const reportTitle = previewContainer.querySelector('.preview-header h2');
        if (!reportTitle) return null;
        
        // Find report by title
        const allReports = reportsStore.getAll();
        return allReports.find(r => r.title === reportTitle.textContent) || null;
    }
    
    async renderVisualizationCharts(visualizations, reportId, containerSelector = '#preview-visualizations') {
        // Find the parent container (preview or view mode)
        const parentContainer = containerSelector === '#view-mode-visualizations' 
            ? this.container.querySelector('#report-view-mode')
            : this.container.querySelector('#report-preview-container');
        
        if (!parentContainer) return;
        
        // Combine active filters and dashboard filters
        const allFilters = { ...(this.activeFilters[reportId] || {}), ...this.dashboardFilters };
        
        for (const viz of visualizations) {
            const containerId = `viz-container-${viz.id}`;
            const container = parentContainer.querySelector(`#${containerId}`);
            if (!container) continue;
            
            // Clear container before rendering
            container.innerHTML = '';
            
            try {
                // Get dataset
                const dataset = viz.datasetId ? datasetStore.get(viz.datasetId) : null;
                if (!dataset) {
                    container.innerHTML = `<div class="chart-error">Dataset not found for visualization: ${this.escapeHtml(viz.name)}</div>`;
                    continue;
                }
                
                // Apply filters to dataset rows
                let filteredRows = dataset.rows;
                if (Object.keys(allFilters).length > 0) {
                    filteredRows = this.applyFiltersToRows(dataset, allFilters);
                }
                
                // Render based on visualization type
                if (viz.type === 'table') {
                    this.renderTableVisualization(container, viz, dataset, filteredRows, reportId);
                } else {
                    this.renderChartVisualization(container, viz, dataset, filteredRows, reportId);
                }
            } catch (error) {
                console.error(`Error rendering visualization ${viz.id}:`, error);
                container.innerHTML = `<div class="chart-error">Error rendering visualization: ${error.message}</div>`;
            }
        }
    }
    
    applyFiltersToRows(dataset, filters) {
        let filteredRows = dataset.rows;
        
        for (const [filterKey, filterValue] of Object.entries(filters)) {
            const [datasetId, field] = filterKey.split('_');
            if (datasetId !== dataset.id) continue;
            
            const fieldIndex = dataset.columns.indexOf(field);
            if (fieldIndex === -1) continue;
            
            filteredRows = filteredRows.filter(row => {
                const cellValue = String(row[fieldIndex] || '').toLowerCase();
                const filterVal = String(filterValue || '').toLowerCase();
                return cellValue.includes(filterVal);
            });
        }
        
        return filteredRows;
    }
    
    renderTableVisualization(container, viz, dataset, rows, reportId) {
        const config = viz.config || {};
        const tableFields = config.tableFields || dataset.columns;
        
        let html = '<table class="report-table"><thead><tr>';
        tableFields.forEach(field => {
            html += `<th>${this.escapeHtml(field)}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        rows.forEach((row, rowIndex) => {
            html += '<tr>';
            tableFields.forEach(field => {
                const colIndex = dataset.columns.indexOf(field);
                const cellValue = colIndex >= 0 ? (row[colIndex] || '') : '';
                html += `<td class="table-cell-clickable" data-field="${this.escapeHtml(field)}" data-value="${this.escapeHtml(String(cellValue))}" data-dataset-id="${dataset.id}">${this.escapeHtml(String(cellValue))}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
        // Add click handlers to table cells
        container.querySelectorAll('.table-cell-clickable').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const field = e.target.getAttribute('data-field');
                const value = e.target.getAttribute('data-value');
                const datasetId = e.target.getAttribute('data-dataset-id');
                
                this.applyVisualizationFilter(viz.id, {
                    field: field,
                    value: value,
                    datasetId: datasetId
                });
            });
        });
    }
    
    renderChartVisualization(container, viz, dataset, rows, reportId) {
        const config = viz.config || {};
        const chartType = viz.type || 'bar';
        
        // Extract chart data based on config - support multiple config formats
        let xField = config.xAxis?.field || config.xAxis?.column || config.xField || config.xColumn;
        let yField = config.yAxis?.field || config.yAxis?.column || config.yField || config.yColumn;
        
        // If still no fields, try to use first two columns
        if (!xField && dataset.columns.length > 0) {
            xField = dataset.columns[0];
        }
        if (!yField && dataset.columns.length > 1) {
            yField = dataset.columns[1];
        }
        
        if (!xField || !yField) {
            container.innerHTML = `<div class="chart-error">Chart configuration incomplete. Need at least 2 columns in dataset.</div>`;
            return;
        }
        
        const xIndex = dataset.columns.indexOf(xField);
        const yIndex = dataset.columns.indexOf(yField);
        
        if (xIndex === -1 || yIndex === -1) {
            container.innerHTML = `<div class="chart-error">Chart fields not found in dataset</div>`;
            return;
        }
        
        // Prepare chart data
        const chartData = rows.map(row => ({
            name: String(row[xIndex] || ''),
            y: parseFloat(row[yIndex]) || 0,
            rowIndex: rows.indexOf(row)
        }));
        
        // Create a unique container div for Highcharts
        const chartDiv = document.createElement('div');
        chartDiv.style.width = '100%';
        chartDiv.style.height = '400px';
        container.appendChild(chartDiv);
        
        // Create chart configuration
        const chartConfig = {
            chart: {
                type: chartType === 'pie' || chartType === 'donut' ? 'pie' : chartType,
                renderTo: chartDiv
            },
            title: {
                text: config.title || viz.name || 'Chart'
            },
            xAxis: chartType !== 'pie' && chartType !== 'donut' ? {
                title: { text: config.xAxis?.label || xField },
                categories: chartType === 'bar' || chartType === 'line' ? [...new Set(chartData.map(d => d.name))] : undefined
            } : undefined,
            yAxis: chartType !== 'pie' && chartType !== 'donut' ? {
                title: { text: config.yAxis?.label || yField }
            } : undefined,
            series: chartType === 'pie' || chartType === 'donut' ? [{
                name: config.yAxis?.label || yField,
                data: chartData.map(d => ({ 
                    name: d.name, 
                    y: d.y,
                    customData: { xField, yField, datasetId: dataset.id, reportId }
                }))
            }] : [{
                name: config.yAxis?.label || yField,
                data: chartData.map((d, idx) => ({
                    y: d.y,
                    name: d.name,
                    customData: { xField, yField, datasetId: dataset.id, reportId, index: idx }
                }))
            }],
            plotOptions: {
                series: {
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: (e) => {
                                const point = e.point || e.target;
                                this.handleChartPointClick(point, xField, yField, dataset.id, reportId);
                            }
                        }
                    }
                },
                [chartType]: {
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: (e) => {
                                const point = e.point || e.target;
                                this.handleChartPointClick(point, xField, yField, dataset.id, reportId);
                            }
                        }
                    }
                },
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true
                    },
                    point: {
                        events: {
                            click: (e) => {
                                const point = e.point || e.target;
                                this.handleChartPointClick(point, xField, yField, dataset.id, reportId);
                            }
                        }
                    }
                }
            },
            tooltip: {
                enabled: true
            },
            credits: {
                enabled: false
            }
        };
        
        // Render chart
        try {
            if (typeof Highcharts !== 'undefined') {
                new Highcharts.Chart(chartConfig);
            } else {
                container.innerHTML = `<div class="chart-error">Highcharts library not loaded</div>`;
            }
        } catch (error) {
            console.error('Error rendering chart:', error);
            container.innerHTML = `<div class="chart-error">Error rendering chart: ${error.message}</div>`;
        }
    }
    
    handleChartPointClick(point, xField, yField, datasetId, reportId) {
        // Extract clicked data point information
        let filterData = {};
        
        // Try to get custom data first
        if (point.options && point.options.customData) {
            const customData = point.options.customData;
            filterData = {
                field: customData.xField || xField,
                value: point.name || point.category || String(point.y || ''),
                datasetId: customData.datasetId || datasetId
            };
        } else if (point.category !== undefined) {
            // For bar/line charts
            filterData = {
                field: xField,
                value: String(point.category || ''),
                datasetId: datasetId
            };
        } else if (point.name !== undefined) {
            // For pie/donut charts
            filterData = {
                field: xField,
                value: String(point.name || ''),
                datasetId: datasetId
            };
        }
        
        if (filterData.field && filterData.value) {
            this.applyVisualizationFilter(null, filterData);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


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
        this.container.innerHTML = `
            <div class="reports-panel">
                <div class="reports-header">
                    <h2>Reports & Dashboards</h2>
                    ${!this.isViewer ? '<button type="button" class="btn btn-primary" id="create-report-btn">Create New Report</button>' : ''}
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
                            <button type="button" class="btn btn-sm btn-primary preview-report-btn">Preview</button>
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
        const title = await Modal.prompt('Enter report/dashboard title:', 'New Report');
        if (!title || !title.trim()) {
            return;
        }
        
        this.currentReport = reportsStore.create(title.trim(), [], [], { users: [], groups: [] }, [], []);
        this.showReportEditor();
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
        
        // Update report
        reportsStore.update(this.currentReport.id, {
            title,
            visualizationIds,
            filters,
            access
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
        
        listContainer.style.display = 'none';
        editorContainer.style.display = 'none';
        previewContainer.style.display = 'block';
        
        this.renderPreview(report);
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
            
            if (filter.type === 'date') {
                filterControl = `
                    <div class="filter-control-group">
                        <label for="filter-${index}">${this.escapeHtml(label)}</label>
                        <input type="date" id="filter-${index}" class="form-control filter-input" 
                               data-filter-key="${filterKey}" value="${currentValue}">
                    </div>
                `;
            } else if (filter.type === 'select' && options.length > 0) {
                filterControl = `
                    <div class="filter-control-group">
                        <label for="filter-${index}">${this.escapeHtml(label)}</label>
                        <select id="filter-${index}" class="form-control filter-input" 
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
                        <label for="filter-${index}">${this.escapeHtml(label)}</label>
                        <input type="number" id="filter-${index}" class="form-control filter-input" 
                               data-filter-key="${filterKey}" value="${currentValue}" placeholder="Enter number">
                    </div>
                `;
            } else {
                // Text input
                filterControl = `
                    <div class="filter-control-group">
                        <label for="filter-${index}">${this.escapeHtml(label)}</label>
                        <input type="text" id="filter-${index}" class="form-control filter-input" 
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
        // Apply filters to get filtered datasets
        const activeFilters = this.activeFilters[reportId] || {};
        
        return visualizations.map(viz => {
            // Get the dataset for this visualization
            const dataset = viz.datasetId ? datasetStore.get(viz.datasetId) : null;
            let filteredData = null;
            
            if (dataset) {
                // Apply filters to dataset
                filteredData = this.applyFiltersToDataset(dataset, activeFilters, reportId);
            }
            
            // Render visualization (simplified - in production would use actual chart rendering)
            return `
                <div class="preview-viz-item" data-viz-id="${viz.id}">
                    <h4>${this.escapeHtml(viz.name)}</h4>
                    <div class="viz-preview-container">
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
        
        // Store active filters
        this.activeFilters[reportId] = activeFilters;
        
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
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


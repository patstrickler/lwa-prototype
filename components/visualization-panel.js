// Visualization Panel Component
// Charts from datasets + metrics

import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';
import { visualizationsStore } from '../data/visualizations.js';
import { debounceRAF } from '../utils/debounce.js';
import { Modal } from '../utils/modal.js';
import { calculateMetric } from '../utils/metric-calculator.js';
import { metricExecutionEngine } from '../utils/metric-execution-engine.js';
import { datasetSelectionManager } from '../utils/dataset-selection-manager.js';

export class VisualizationPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentDataset = null;
        this.currentMetrics = [];
        this.charts = [];
        this.xAxisSelection = null; // { type: 'column'|'metric', value: string, datasetId: string, aggregation?: string }
        this.yAxisSelection = null;
        this.zAxisSelection = null; // For scatter plots
        this.tableFields = []; // For table visualizations
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        // Refresh dataset list periodically to catch new datasets
        setInterval(() => this.refreshDatasetList(), 2000);
    }
    
    render() {
        // Main preview area
        this.container.innerHTML = `
            <div class="visualization-panel">
                <div id="charts-container" class="charts-container preview-container">
                </div>
            </div>
        `;
        
        // Render builder sidebar in separate container
        this.renderBuilderSidebar();
        
        // Update axis displays if selections exist
        if (this.xAxisSelection) {
            this.updateAxisDisplay('x-axis-display', this.xAxisSelection);
        }
        if (this.yAxisSelection) {
            this.updateAxisDisplay('y-axis-display', this.yAxisSelection);
        }
    }
    
    renderBuilderSidebar() {
        const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
        if (!sidebarContainer) return;
        
        sidebarContainer.innerHTML = `
            <div class="visualization-builder-sidebar">
                    <div class="builder-form">
                    <div class="form-group" style="padding: 8px; background-color: #f8f9fa; border-radius: 4px; margin-bottom: 8px;">
                        <label style="font-size: 11px; color: #6c757d; margin-bottom: 4px;">Dataset:</label>
                        <div id="current-dataset-display" style="font-size: 12px; font-weight: 500; color: #495057;">
                            <span class="text-muted">Select a dataset from the left pane</span>
                        </div>
                        </div>
                        
                        <div class="form-group">
                        <label for="chart-type-select">Chart Type:</label>
                        <select id="chart-type-select" class="form-control">
                            <option value="">-- Select Chart Type --</option>
                            <option value="line">Line Chart</option>
                            <option value="bar">Bar Chart</option>
                            <option value="scatter">Scatter Plot</option>
                            <option value="pie">Pie Chart</option>
                            <option value="donut">Donut Chart</option>
                            <option value="table">Table</option>
                            <option value="scorecard">Scorecard</option>
                            </select>
                        </div>
                        
                    <div id="field-selection-container" style="display: none;">
                        <!-- Dynamic field selection will be populated here -->
                    </div>
                    
                    <div class="styling-options">
                        <button type="button" class="styling-toggle" id="styling-toggle">
                            <span>Chart Styling Options</span>
                            <span class="toggle-icon">▼</span>
                        </button>
                        <div class="styling-panel" id="styling-panel" style="display: none;">
                            <div class="styling-form">
                        <div class="form-group">
                                    <label for="chart-title-input">Chart Title:</label>
                                    <input type="text" id="chart-title-input" class="form-control" placeholder="Auto-generated">
                        </div>
                        
                                <div class="form-group">
                                    <label for="x-axis-label-input">X Axis Label:</label>
                                    <input type="text" id="x-axis-label-input" class="form-control" placeholder="Auto-generated">
                        </div>
                        
                        <div class="form-group">
                                    <label for="y-axis-label-input">Y Axis Label:</label>
                                    <input type="text" id="y-axis-label-input" class="form-control" placeholder="Auto-generated">
                        </div>
                        
                                <div class="form-group">
                                    <label for="series-color-input">Series Color:</label>
                                    <div class="color-input-wrapper">
                                        <input type="color" id="series-color-input" class="form-control color-picker" value="#007bff">
                                        <input type="text" id="series-color-text" class="form-control color-text" value="#007bff" placeholder="#007bff">
                                    </div>
                        </div>
                        
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="trendline-toggle" class="form-checkbox">
                                        <span>Show Trendline</span>
                                    </label>
                                </div>
                        </div>
                    </div>
                </div>
                
                    <div class="form-group" style="display: flex; gap: 4px; flex-direction: column; margin-top: 8px;">
                        <button type="button" class="btn btn-secondary btn-sm" id="clear-selections-btn">Clear</button>
                        <button type="button" class="btn btn-primary btn-sm" id="save-visualization-btn">Save</button>
                    </div>
                </div>
            </div>
        `;
        
        this.refreshDatasetList();
    }
    
    attachEventListeners() {
        // Find selectors in sidebar or main container
        const findSelector = (id) => {
            return document.querySelector(`#${id}`) || this.container.querySelector(`#${id}`);
        };
        
        const chartTypeSelect = findSelector('chart-type-select');
        const clearBtn = findSelector('clear-selections-btn');
        const stylingToggle = findSelector('styling-toggle');
        const seriesColorInput = findSelector('series-color-input');
        const seriesColorText = findSelector('series-color-text');
        const trendlineToggle = findSelector('trendline-toggle');
        const titleInput = findSelector('chart-title-input');
        const xLabelInput = findSelector('x-axis-label-input');
        const yLabelInput = findSelector('y-axis-label-input');
        // Dataset selection is now handled by the left pane dataset browser
        // The dataset is selected via the left pane and synced through app.js -> selectDataset() method
        
        // Chart type change - update field selection UI and preserve selections
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', () => {
                const chartType = chartTypeSelect.value;
                this.updateFieldSelectionUI(chartType);
                // Preserve selections and auto-render if valid
                requestAnimationFrame(() => {
                    this.autoRender();
                });
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelections());
        }
        
        const previewBtn = this.container.querySelector('#preview-visualization-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewVisualization());
        }
        
        const saveBtn = this.container.querySelector('#save-visualization-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveVisualization());
        }
        
        // Drag and drop handlers for axis selection (use event delegation since elements are in sidebar)
        const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
        const xAxisDisplay = (sidebarContainer || this.container).querySelector('[data-axis="x"]');
        const yAxisDisplay = (sidebarContainer || this.container).querySelector('[data-axis="y"]');
        
        if (xAxisDisplay) {
            this.setupDragAndDrop(xAxisDisplay, 'x');
        }
        if (yAxisDisplay) {
            this.setupDragAndDrop(yAxisDisplay, 'y');
        }
        
        // Use event delegation for axis selection buttons (they're dynamically created)
        const fieldContainer = sidebarContainer ? sidebarContainer.querySelector('#field-selection-container') : this.container.querySelector('#field-selection-container');
        if (fieldContainer) {
            fieldContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.axis-select-btn');
                if (btn) {
                    e.stopPropagation();
                    const axis = btn.getAttribute('data-axis') || btn.getAttribute('data-field-index');
                    if (axis) {
                        if (btn.hasAttribute('data-field-index')) {
                            // Table field
                            const fieldIndex = parseInt(btn.getAttribute('data-field-index'));
                            this.showTableFieldDropdown(fieldIndex, btn);
                        } else {
                            // Axis field
                            this.showAxisSelectionDropdown(axis, btn);
                        }
                    }
                }
                
                // Click on axis display to show dropdown
                const axisDisplay = e.target.closest('.axis-selection-display');
                if (axisDisplay && !e.target.closest('.axis-select-btn') && !e.target.closest('.selected-item')) {
                    const axis = axisDisplay.getAttribute('data-axis');
                    if (axis) {
                        const btn = axisDisplay.querySelector('.axis-select-btn');
                        if (btn) {
                            this.showAxisSelectionDropdown(axis, btn);
                        }
                    }
                }
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.axis-selection-dropdown') && !e.target.closest('.axis-select-btn') && !e.target.closest('.axis-selection-display')) {
                this.closeAxisSelectionDropdown();
            }
        });
        
        // Styling controls - also trigger auto-render
        if (stylingToggle) {
            stylingToggle.addEventListener('click', () => this.toggleStylingPanel());
        }
        
        // Sync color picker and text input, trigger render
        if (seriesColorInput && seriesColorText) {
            seriesColorInput.addEventListener('input', (e) => {
                seriesColorText.value = e.target.value;
                this.autoRender();
            });
            seriesColorText.addEventListener('input', (e) => {
                const color = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    seriesColorInput.value = color;
                    this.autoRender();
                }
            });
        }
        
        // Trendline toggle triggers render
        if (trendlineToggle) {
            trendlineToggle.addEventListener('change', () => this.autoRender());
        }
        
        // Label inputs trigger render (with debounce)
        if (titleInput) {
            let titleTimeout;
            titleInput.addEventListener('input', () => {
                clearTimeout(titleTimeout);
                titleTimeout = setTimeout(() => this.autoRender(), 500);
            });
        }
        if (xLabelInput) {
            let xLabelTimeout;
            xLabelInput.addEventListener('input', () => {
                clearTimeout(xLabelTimeout);
                xLabelTimeout = setTimeout(() => this.autoRender(), 500);
            });
        }
        if (yLabelInput) {
            let yLabelTimeout;
            yLabelInput.addEventListener('input', () => {
                clearTimeout(yLabelTimeout);
                yLabelTimeout = setTimeout(() => this.autoRender(), 500);
            });
        }
    }
    
    toggleStylingPanel() {
        const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
        const findSelector = (id) => {
            return sidebarContainer ? sidebarContainer.querySelector(`#${id}`) : this.container.querySelector(`#${id}`);
        };
        const panel = findSelector('styling-panel');
        const toggle = findSelector('styling-toggle');
        if (!toggle) return;
        const icon = toggle.querySelector('.toggle-icon');
        
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            icon.textContent = '▲';
        } else {
            panel.style.display = 'none';
            icon.textContent = 'expand_more';
            icon.className = 'material-icons toggle-icon';
        }
    }
    
    /**
     * Updates the field selection UI based on the selected chart type
     * @param {string} chartType - The selected chart type
     */
    updateFieldSelectionUI(chartType) {
        const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
        const container = sidebarContainer ? sidebarContainer.querySelector('#field-selection-container') : this.container.querySelector('#field-selection-container');
        if (!container) return;
        
        if (!chartType) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }
        
        container.style.display = 'block';
        
        let html = '';
        
        if (chartType === 'scatter') {
            // Scatter plot: X, Y, Z
            html = `
                <div class="form-group">
                    <label for="x-axis-display-scatter">X Axis:</label>
                    <div class="axis-selection-display droppable-axis" id="x-axis-display-scatter" data-axis="x" draggable="false" role="button" tabindex="0" aria-label="X Axis selection">
                        <div class="axis-selection-content">
                            <span class="selection-placeholder">Drag & drop or click to select</span>
                        </div>
                        <button class="axis-select-btn" data-axis="x" title="Click to select field">▼</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="y-axis-display-scatter">Y Axis:</label>
                    <div class="axis-selection-display droppable-axis" id="y-axis-display-scatter" data-axis="y" draggable="false" role="button" tabindex="0" aria-label="Y Axis selection">
                        <div class="axis-selection-content">
                            <span class="selection-placeholder">Drag & drop or click to select</span>
                        </div>
                        <button class="axis-select-btn" data-axis="y" title="Click to select field">▼</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="z-axis-display-scatter">Z Axis (Size):</label>
                    <div class="axis-selection-display droppable-axis" id="z-axis-display-scatter" data-axis="z" draggable="false" role="button" tabindex="0" aria-label="Z Axis selection">
                        <div class="axis-selection-content">
                            <span class="selection-placeholder">Drag & drop or click to select (optional)</span>
                        </div>
                        <button class="axis-select-btn" data-axis="z" title="Click to select field">▼</button>
                    </div>
                </div>
            `;
        } else if (chartType === 'table') {
            // Table: Multiple fields
            html = `
                <div class="form-group">
                    <label for="table-fields-list">Table Fields:</label>
                    <div id="table-fields-list" class="table-fields-list" role="group" aria-label="Table fields">
                        ${this.tableFields.length > 0 ? this.tableFields.map((field, idx) => `
                            <div class="table-field-item">
                                <div class="axis-selection-display droppable-axis" data-field-index="${idx}" draggable="false">
                                    <div class="axis-selection-content">
                                        ${field ? this.renderFieldDisplay(field) : '<span class="selection-placeholder">Drag & drop or click to select</span>'}
                                    </div>
                                    <button class="axis-select-btn" data-field-index="${idx}" title="Click to select field">▼</button>
                                    <button class="remove-field-btn" data-field-index="${idx}" title="Remove field">×</button>
                                </div>
                            </div>
                        `).join('') : ''}
                        <button type="button" class="btn btn-sm btn-secondary" id="add-table-field-btn">+ Add Field</button>
                    </div>
                </div>
            `;
        } else if (chartType === 'scorecard') {
            // Scorecard: Y only
            html = `
                <div class="form-group">
                    <label for="y-axis-display-scorecard">Value:</label>
                    <div class="axis-selection-display droppable-axis" id="y-axis-display-scorecard" data-axis="y" draggable="false" role="button" tabindex="0" aria-label="Value selection">
                        <div class="axis-selection-content">
                            <span class="selection-placeholder">Drag & drop or click to select</span>
                        </div>
                        <button class="axis-select-btn" data-axis="y" title="Click to select field">▼</button>
                    </div>
                </div>
            `;
        } else {
            // Bar, Line, Pie, Donut: X and Y
            const isPieOrDonut = chartType === 'pie' || chartType === 'donut';
            html = `
                <div class="form-group">
                    <label for="x-axis-display-${chartType}">${isPieOrDonut ? 'Category Field (X):' : 'X Axis:'}</label>
                    <div class="axis-selection-display droppable-axis" id="x-axis-display-${chartType}" data-axis="x" draggable="false" role="button" tabindex="0" aria-label="${isPieOrDonut ? 'Category Field' : 'X Axis'} selection">
                        <div class="axis-selection-content">
                            <span class="selection-placeholder">Drag & drop or click to select</span>
                        </div>
                        <button class="axis-select-btn" data-axis="x" title="Click to select field">▼</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="y-axis-display-${chartType}">${isPieOrDonut ? 'Value Field (Y - Aggregated):' : 'Y Axis:'}</label>
                    <div class="axis-selection-display droppable-axis" id="y-axis-display-${chartType}" data-axis="y" draggable="false" role="button" tabindex="0" aria-label="${isPieOrDonut ? 'Value Field' : 'Y Axis'} selection">
                        <div class="axis-selection-content">
                            <span class="selection-placeholder">Drag & drop or click to select</span>
                        </div>
                        <button class="axis-select-btn" data-axis="y" title="Click to select field">▼</button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Re-attach event listeners
        this.attachFieldSelectionListeners(chartType);
        
        // Preserve and map existing selections to new chart type
        if (chartType === 'table') {
            // For table, preserve existing selections as table fields
            // Only initialize if tableFields is empty
            if (this.tableFields.length === 0) {
                // Map X and Y to first two table fields if they exist
                if (this.xAxisSelection) {
                    this.tableFields.push(this.xAxisSelection);
                }
                if (this.yAxisSelection) {
                    this.tableFields.push(this.yAxisSelection);
                }
            }
            // Update table field displays
            this.tableFields.forEach((field, idx) => {
                if (field) {
                    const fieldDisplay = container.querySelector(`[data-field-index="${idx}"]`);
                    if (fieldDisplay) {
                        const contentContainer = fieldDisplay.querySelector('.axis-selection-content');
                        if (contentContainer) {
                            contentContainer.innerHTML = this.renderFieldDisplay(field);
                        }
                    }
                }
            });
        } else {
            // For other chart types, preserve X, Y, Z as applicable
            // Use data-axis attribute to find elements since IDs include chart type
            const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
            const searchContainer = sidebarContainer || this.container;
            
            if (this.xAxisSelection && (chartType === 'scatter' || chartType === 'line' || chartType === 'bar' || chartType === 'pie' || chartType === 'donut')) {
                const xDisplay = searchContainer.querySelector('.axis-selection-display[data-axis="x"]');
                if (xDisplay) {
                    this.updateAxisDisplay(xDisplay.id || 'x-axis-display', this.xAxisSelection);
                }
            }
            if (this.yAxisSelection) {
                // Y axis is used in all chart types
                const yDisplay = searchContainer.querySelector('.axis-selection-display[data-axis="y"]');
                if (yDisplay) {
                    this.updateAxisDisplay(yDisplay.id || 'y-axis-display', this.yAxisSelection);
                }
            }
            if (this.zAxisSelection && chartType === 'scatter') {
                const zDisplay = searchContainer.querySelector('.axis-selection-display[data-axis="z"]');
                if (zDisplay) {
                    this.updateAxisDisplay(zDisplay.id || 'z-axis-display', this.zAxisSelection);
                }
            }
        }
    }
    
    /**
     * Renders a field display for table fields
     * @param {Object} field - Field selection object
     * @returns {string} HTML string
     */
    renderFieldDisplay(field) {
        if (!field) return '';
        
        const dataset = datasetStore.get(field.datasetId);
        if (!dataset) return '';
        
        if (field.type === 'column') {
            return `
                <div class="selected-item column-selected">
                    <span class="item-icon">📊</span>
                    <span class="item-name">${this.escapeHtml(this.formatColumnName(field.value))}</span>
                    <span class="item-type">Column</span>
                </div>
            `;
        } else {
            const metric = metricsStore.get(field.value);
            if (metric) {
                return `
                    <div class="selected-item metric-selected">
                        <span class="item-icon">📈</span>
                        <div class="item-info">
                            <span class="item-name">${this.escapeHtml(metric.name)}</span>
                            <span class="item-value">${this.formatMetricValue(metric.value)}</span>
                        </div>
                        <span class="item-type">Metric</span>
                    </div>
                `;
            }
        }
        return '';
    }
    
    /**
     * Attaches event listeners for field selection
     * @param {string} chartType - The chart type
     */
    attachFieldSelectionListeners(chartType) {
        // Find elements in sidebar or main container
        const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
        const searchContainer = sidebarContainer || this.container;
        
        // Setup drag and drop for all axis displays
        const axisDisplays = searchContainer.querySelectorAll('.axis-selection-display');
        axisDisplays.forEach(display => {
            const axis = display.getAttribute('data-axis');
            if (axis) {
                this.setupDragAndDrop(display, axis);
            }
        });
        
        // Click handlers for axis selection buttons
        const axisSelectBtns = searchContainer.querySelectorAll('.axis-select-btn');
        axisSelectBtns.forEach(btn => {
            // Remove existing listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const axis = newBtn.getAttribute('data-axis');
                const fieldIndex = newBtn.getAttribute('data-field-index');
                if (axis) {
                    this.showAxisSelectionDropdown(axis, newBtn);
                } else if (fieldIndex !== null) {
                    this.showTableFieldDropdown(parseInt(fieldIndex), newBtn);
                }
            });
        });
        
        // Click on axis display to show dropdown
        axisDisplays.forEach(display => {
            // Remove existing listeners by cloning
            const newDisplay = display.cloneNode(true);
            display.parentNode.replaceChild(newDisplay, display);
            
            newDisplay.addEventListener('click', (e) => {
                if (!e.target.closest('.axis-select-btn') && !e.target.closest('.selected-item') && !e.target.closest('.remove-field-btn')) {
                    const axis = newDisplay.getAttribute('data-axis');
                    const fieldIndex = newDisplay.getAttribute('data-field-index');
                    const btn = newDisplay.querySelector('.axis-select-btn');
                    if (btn && axis) {
                        this.showAxisSelectionDropdown(axis, btn);
                    } else if (btn && fieldIndex !== null) {
                        this.showTableFieldDropdown(parseInt(fieldIndex), btn);
                    }
                }
            });
        });
        
        // Add field button for tables
        if (chartType === 'table') {
            const addFieldBtn = searchContainer.querySelector('#add-table-field-btn');
            if (addFieldBtn) {
                addFieldBtn.addEventListener('click', () => {
                    this.tableFields.push(null);
                    this.updateFieldSelectionUI('table');
                });
            }
            
            // Remove field buttons
            const removeBtns = searchContainer.querySelectorAll('.remove-field-btn');
            removeBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(btn.getAttribute('data-field-index'));
                    this.tableFields.splice(index, 1);
                    this.updateFieldSelectionUI('table');
                });
            });
        }
    }
    
    /**
     * Shows dropdown for table field selection
     * @param {number} fieldIndex - Index of the field in tableFields array
     * @param {HTMLElement} triggerElement - Element that triggered the dropdown
     */
    async showTableFieldDropdown(fieldIndex, triggerElement) {
        // Similar to showAxisSelectionDropdown but for table fields
        this.closeAxisSelectionDropdown();
        
        // Get dataset from any existing selection
        let dataset = null;
        if (this.tableFields[fieldIndex]) {
            dataset = datasetStore.get(this.tableFields[fieldIndex].datasetId);
        } else if (this.xAxisSelection) {
            dataset = datasetStore.get(this.xAxisSelection.datasetId);
        } else if (this.yAxisSelection) {
            dataset = datasetStore.get(this.yAxisSelection.datasetId);
        }
        
        // Try to get from dataset browser
        if (!dataset) {
            const datasetBrowser = document.querySelector('#dataset-browser-visualization');
            if (datasetBrowser) {
                const select = datasetBrowser.querySelector('.dataset-browser-select');
                if (select && select.value) {
                    dataset = datasetStore.get(select.value);
                }
            }
        }
        
        if (!dataset) {
            await Modal.alert('Please select a dataset first from the left panel.');
            return;
        }
        
        const fieldDisplay = triggerElement.closest('.axis-selection-display');
        if (!fieldDisplay || !triggerElement) return;
        
        const rect = triggerElement.getBoundingClientRect();
        const fieldRect = fieldDisplay.getBoundingClientRect();
        
        const columns = dataset.columns || [];
        const metrics = metricsStore.getByDataset(dataset.id) || [];
        
        const dropdown = document.createElement('div');
        dropdown.className = 'axis-selection-dropdown';
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.left = `${fieldRect.left}px`;
        dropdown.style.width = `${fieldRect.width}px`;
        dropdown.style.zIndex = '1000';
        
        dropdown.innerHTML = `
            <div class="dropdown-header">
                <span>Select Field</span>
                <button class="dropdown-close" onclick="this.closest('.axis-selection-dropdown').remove()">×</button>
            </div>
            <div class="dropdown-content">
                ${columns.length > 0 ? `
                    <div class="dropdown-section">
                        <div class="dropdown-section-title">Columns</div>
                        ${columns.map(col => `
                            <div class="dropdown-item column-item" 
                                 data-type="column" 
                                 data-value="${this.escapeHtml(col)}"
                                 data-dataset="${dataset.id}">
                                <span class="item-icon">📊</span>
                                <span class="item-name">${this.escapeHtml(this.formatColumnName(col))}</span>
                                <span class="item-type">${this.inferColumnType(dataset, col)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${metrics.length > 0 ? `
                    <div class="dropdown-section">
                        <div class="dropdown-section-title">Metrics</div>
                        ${metrics.map(metric => `
                            <div class="dropdown-item metric-item" 
                                 data-type="metric" 
                                 data-value="${metric.id}"
                                 data-dataset="${dataset.id}">
                                <span class="item-icon">📈</span>
                                <div class="item-info">
                                    <span class="item-name">${this.escapeHtml(metric.name)}</span>
                                    <span class="item-value">${this.formatMetricValue(metric.value)}</span>
                                </div>
                                <span class="item-operation">${this.escapeHtml(metric.operation || '')}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(dropdown);
        
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.getAttribute('data-type');
                const value = item.getAttribute('data-value');
                const datasetId = item.getAttribute('data-dataset');
                this.selectTableField(fieldIndex, type, value, datasetId);
                this.closeAxisSelectionDropdown();
            });
        });
        
        this.currentDropdown = dropdown;
    }
    
    /**
     * Selects a field for table visualization
     * @param {number} fieldIndex - Index in tableFields array
     * @param {string} type - 'column' or 'metric'
     * @param {string} value - Column name or metric ID
     * @param {string} datasetId - Dataset ID
     */
    selectTableField(fieldIndex, type, value, datasetId) {
        this.tableFields[fieldIndex] = { type, value, datasetId };
        this.updateFieldSelectionUI('table');
        this.autoRender();
    }
    
    async refreshDatasetList() {
        // Dataset selection is now handled by the left pane dataset browser
        // Just update the display if we have a current dataset
        if (this.currentDataset) {
            this.updateDatasetDisplay(this.currentDataset);
        }
        return;
        
        const currentValue = datasetSelect.value;
        const allDatasets = datasetStore.getAll();
        
        // Filter datasets based on access control
        const { UserManager } = await import('../utils/user-manager.js');
        const userManager = new UserManager();
        
        // Filter out deleted datasets and check access control
        const validDatasets = allDatasets.filter(ds => {
            if (!datasetStore.exists(ds.id)) return false;
            const dataset = datasetStore.get(ds.id);
            return userManager.hasAccessToDataset(dataset);
        });
        
        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select Dataset --';
        fragment.appendChild(placeholder);
        
        validDatasets.forEach(dataset => {
            const option = document.createElement('option');
            option.value = dataset.id;
            option.textContent = dataset.name;
            fragment.appendChild(option);
        });
        
        // Batch DOM update with requestAnimationFrame
        requestAnimationFrame(() => {
            datasetSelect.innerHTML = '';
            datasetSelect.appendChild(fragment);
        
        // Restore selection if it still exists
            if (currentValue && validDatasets.find(d => d.id === currentValue)) {
            datasetSelect.value = currentValue;
                // Debounce the selection handler
                if (this._selectionTimeout) {
                    clearTimeout(this._selectionTimeout);
                }
                this._selectionTimeout = setTimeout(() => {
            this.onDatasetSelected();
                }, 50);
        }
        });
    }
    
    onDatasetSelected() {
        // Use requestAnimationFrame to batch DOM updates
        requestAnimationFrame(() => {
            // Get dataset from currentDataset or from old selector if it exists
        const datasetSelect = this.container.querySelector('#dataset-select');
            const datasetId = this.currentDataset ? this.currentDataset.id : (datasetSelect ? datasetSelect.value : null);
            if (!datasetId) return;
            const xAxisSelect = this.container.querySelector('#x-axis-select');
            const yAxisSelect = this.container.querySelector('#y-axis-select');
        
        if (!datasetId) {
                if (xAxisSelect) {
                    xAxisSelect.disabled = true;
                    xAxisSelect.innerHTML = '<option value="">-- Select X Axis --</option>';
                }
                if (yAxisSelect) {
                    yAxisSelect.disabled = true;
                    yAxisSelect.innerHTML = '<option value="">-- Select Y Axis --</option>';
                }
            this.currentDataset = null;
            return;
        }
        
        const dataset = datasetStore.get(datasetId);
        if (!dataset) {
            return;
        }
        
        this.currentDataset = dataset;
        
            // Populate both X and Y axis selectors with columns and metrics
            // Use document fragment for better performance
            if (xAxisSelect) {
                this.populateAxisSelector(xAxisSelect, dataset);
                xAxisSelect.disabled = false;
            }
            if (yAxisSelect) {
                this.populateAxisSelector(yAxisSelect, dataset);
                yAxisSelect.disabled = false;
            }
        });
    }
    
    /**
     * Populates an axis selector with columns and metrics from the dataset
     * @param {HTMLElement} selector - The select element to populate
     * @param {Object} dataset - The dataset object
     */
    populateAxisSelector(selector, dataset) {
        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select --';
        fragment.appendChild(placeholder);
        
        // Add columns section
        if (dataset.columns && dataset.columns.length > 0) {
            const columnGroup = document.createElement('optgroup');
            columnGroup.label = 'Columns';
            dataset.columns.forEach(column => {
                const option = document.createElement('option');
                option.value = `column:${column}`;
                option.textContent = `📊 ${this.formatColumnName(column)}`;
                columnGroup.appendChild(option);
            });
            fragment.appendChild(columnGroup);
        }
        
        // Add metrics section
        const metrics = metricsStore.getByDataset(dataset.id);
        if (metrics && metrics.length > 0) {
            const metricGroup = document.createElement('optgroup');
            metricGroup.label = 'Metrics';
            metrics.forEach(metric => {
                const option = document.createElement('option');
                option.value = `metric:${metric.id}`;
                option.textContent = `📈 ${metric.name} (${this.formatMetricValue(metric.value)})`;
                metricGroup.appendChild(option);
            });
            fragment.appendChild(metricGroup);
        }
        
        // Batch DOM update
        requestAnimationFrame(() => {
            if (!selector) {
                console.warn('populateAxisSelector: selector element not found');
                return;
            }
            selector.innerHTML = '';
            selector.appendChild(fragment);
        });
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
    
    /**
     * Auto-renders the chart when selections change
     * Debounced to prevent jitter from rapid changes
     */
    autoRender() {
        // Clear any pending render
        if (this._autoRenderTimeout) {
            clearTimeout(this._autoRenderTimeout);
        }
        
        // Debounce the render
        this._autoRenderTimeout = setTimeout(() => {
            requestAnimationFrame(() => {
                this._performAutoRender();
            });
        }, 200);
    }
    
    _performAutoRender() {
        // Get chart type from sidebar
        const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
        const chartTypeSelect = sidebarContainer ? sidebarContainer.querySelector('#chart-type-select') : this.container.querySelector('#chart-type-select');
        const chartType = chartTypeSelect ? chartTypeSelect.value : '';
        
        if (!chartType) {
            // No chart type selected, clear chart
            this.clearChart();
            return;
        }
        
        // Check required fields based on chart type
        if (chartType === 'scorecard') {
            if (!this.yAxisSelection) {
                this.clearChart();
                return;
            }
        } else if (chartType === 'table') {
            if (!this.tableFields || this.tableFields.length === 0 || this.tableFields.every(f => !f)) {
                this.clearChart();
                return;
            }
        } else if (chartType === 'scatter') {
            if (!this.xAxisSelection || !this.yAxisSelection) {
                this.clearChart();
                return;
            }
            // Ensure both selections are from the same dataset
            if (this.xAxisSelection.datasetId !== this.yAxisSelection.datasetId) {
                this.clearChart();
                return;
            }
            } else {
            // Bar, Line, Pie, Donut require X and Y
            if (!this.xAxisSelection || !this.yAxisSelection) {
                this.clearChart();
                return;
            }
            // Ensure both selections are from the same dataset
            if (this.xAxisSelection.datasetId !== this.yAxisSelection.datasetId) {
                this.clearChart();
                return;
            }
        }
        
        // Check if dataset exists
        let datasetId = null;
        if (this.xAxisSelection) {
            datasetId = this.xAxisSelection.datasetId;
        } else if (this.yAxisSelection) {
            datasetId = this.yAxisSelection.datasetId;
        } else if (this.tableFields && this.tableFields.length > 0 && this.tableFields[0]) {
            datasetId = this.tableFields[0].datasetId;
        } else if (this.currentDataset) {
            datasetId = this.currentDataset.id;
        }
        
        if (!datasetId) {
            this.clearChart();
            return;
        }
        
        // Render chart automatically
        this.renderChart();
    }
    
    /**
     * Clears the current chart
     */
    clearChart() {
        const chartsContainer = this.container.querySelector('#charts-container');
        if (chartsContainer) {
            chartsContainer.innerHTML = '';
        }
        this.charts = [];
    }
    
    formatColumnName(column) {
        return column
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }
    
    /**
     * Converts dataset rows (array of arrays) to data objects (array of objects)
     * @param {Object} dataset - Dataset with rows and columns
     * @returns {Array} Array of data objects
     */
    getDatasetData(dataset) {
        // Convert rows (array of arrays) to data (array of objects) if needed
        if (dataset.data) {
            return dataset.data;
        }
        
        if (dataset.rows && dataset.columns) {
            return dataset.rows.map(row => {
                const rowObj = {};
                dataset.columns.forEach((column, index) => {
                    rowObj[column] = row[index];
                });
                return rowObj;
            });
        }
        
        return [];
    }
    
    /**
     * Converts dataset rows into Highcharts series format
     * @param {Array} data - Array of data objects
     * @param {string} xColumn - Column name for X axis
     * @param {string} yColumn - Column name for Y axis
     * @param {string} chartType - Type of chart (line, bar, scatter)
     * @returns {Object} Object with chartData and metadata
     */
    convertToHighchartsSeries(data, xColumn, yColumn, chartType) {
        if (!data || data.length === 0) {
            throw new Error('Cannot create chart: No data available');
        }
        
        // Validate columns exist in data
        const firstRow = data[0];
        if (!firstRow || typeof firstRow !== 'object') {
            throw new Error('Cannot create chart: Invalid data format');
        }
        
        if (!(xColumn in firstRow)) {
            throw new Error(`Cannot create chart: Column "${xColumn}" not found in data`);
        }
        
        if (!(yColumn in firstRow)) {
            throw new Error(`Cannot create chart: Column "${yColumn}" not found in data`);
        }
        
        // Extract and validate data points
        const points = data
            .map(row => {
                const xValue = row[xColumn];
                const yValue = row[yColumn];
                
                // Skip rows with missing values
                if (xValue === null || xValue === undefined || 
                    yValue === null || yValue === undefined) {
                    return null;
                }
                
                return {
                    x: xValue,
                    y: parseFloat(yValue) || 0,
                    name: String(xValue) // For tooltips
                };
            })
            .filter(point => point !== null);
        
        if (points.length === 0) {
            throw new Error('Cannot create chart: No valid data points found. All rows contain null or undefined values.');
        }
        
        // Determine if x values are numeric
        const isXNumeric = typeof points[0].x === 'number';
        
        // Sort data for line and bar charts
        if (chartType === 'line' || chartType === 'bar') {
            points.sort((a, b) => {
                if (isXNumeric) {
                    return a.x - b.x;
                }
                return String(a.x).localeCompare(String(b.x));
            });
        }
        
        // Convert to Highcharts format
        let chartData;
        let categories = [];
        
        if (chartType === 'scatter') {
            // Scatter plot: array of [x, y] pairs
            chartData = points.map(point => [parseFloat(point.x) || 0, point.y]);
        } else if (chartType === 'line') {
            if (isXNumeric) {
                // Line chart with numeric x-axis: use [x, y] format
                chartData = points.map(point => [parseFloat(point.x) || 0, point.y]);
            } else {
                // Line chart with categorical x-axis: use y values with categories
                categories = points.map(point => String(point.x));
                chartData = points.map(point => point.y);
            }
        } else if (chartType === 'bar') {
            // Bar charts always use categories for better display
            categories = points.map(point => String(point.x));
            chartData = points.map(point => point.y);
        } else {
            // Default: just y values
            chartData = points.map(point => point.y);
        }
        
        return {
            chartData,
            isXNumeric,
            categories
        };
    }
    
    renderChart() {
        try {
            console.log('[VisualizationPanel.renderChart] Starting chart render');
            
            // Find chart type selector in sidebar or main container
            const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
            const chartTypeSelect = sidebarContainer ? sidebarContainer.querySelector('#chart-type-select') : this.container.querySelector('#chart-type-select');
            const chartType = chartTypeSelect ? chartTypeSelect.value : '';
            
            if (!chartType) {
                console.warn('[VisualizationPanel.renderChart] No chart type selected');
            return;
        }
        
            console.log('[VisualizationPanel.renderChart] Chart type selected', { chartType });
            
            // Check required fields based on chart type
            if (chartType === 'scorecard') {
                if (!this.yAxisSelection) {
                    console.warn('[VisualizationPanel.renderChart] Scorecard requires Y axis selection');
                return;
            }
            } else if (chartType === 'table') {
                if (!this.tableFields || this.tableFields.length === 0 || this.tableFields.every(f => !f)) {
                    console.warn('[VisualizationPanel.renderChart] Table requires at least one field');
                return;
                }
            } else if (chartType === 'scatter') {
                if (!this.xAxisSelection || !this.yAxisSelection) {
                    console.warn('[VisualizationPanel.renderChart] Scatter chart requires X and Y axis selections');
                    return;
                }
            } else {
                // Bar, Line, Pie, Donut require X and Y
                if (!this.xAxisSelection || !this.yAxisSelection) {
                    console.warn('[VisualizationPanel.renderChart] Chart type requires X and Y axis selections', { chartType });
                    return;
                }
            }
            
            // Get dataset from first available selection or currentDataset
            let datasetId = null;
            if (this.xAxisSelection) {
                datasetId = this.xAxisSelection.datasetId;
            } else if (this.yAxisSelection) {
                datasetId = this.yAxisSelection.datasetId;
            } else if (this.tableFields && this.tableFields.length > 0 && this.tableFields[0]) {
                datasetId = this.tableFields[0].datasetId;
            } else if (this.currentDataset) {
                datasetId = this.currentDataset.id;
            }
            
            if (!datasetId) {
                console.error('[VisualizationPanel.renderChart] No dataset ID found');
                    return;
                }
                
                const dataset = datasetStore.get(datasetId);
                if (!dataset) {
                console.error('[VisualizationPanel.renderChart] Dataset not found', { datasetId });
                    return;
                }
            
            console.log('[VisualizationPanel.renderChart] Dataset loaded', {
                datasetId,
                datasetName: dataset.name,
                columns: dataset.columns?.length || 0,
                rows: dataset.rows?.length || 0
            });
        
        // Clear previous chart
        this.clearChart();
        
        const xAxis = this.xAxisSelection;
        const yAxis = this.yAxisSelection;
        const zAxis = this.zAxisSelection;
        
        // Handle special case: both axes are metrics - show KPI cards
        if (xAxis.type === 'metric' && yAxis.type === 'metric') {
            const xMetric = metricsStore.get(xAxis.value);
            const yMetric = metricsStore.get(yAxis.value);
            if (xMetric) this.renderKPICard(xMetric);
            if (yMetric) this.renderKPICard(yMetric);
            return;
        }
        
        // Handle special chart types first (before metric/column logic)
        if (chartType === 'table') {
            this.renderTableWithFields(dataset);
            return;
        }
        
        // Handle case where Y is a metric but X is a column
        // Group by X and recalculate metric for each group
        // Only for Highcharts chart types (not table, scorecard)
        if (yAxis.type === 'metric' && xAxis.type === 'column' && 
            (chartType === 'line' || chartType === 'bar' || chartType === 'scatter')) {
            const metric = metricsStore.get(yAxis.value);
            if (!metric) return;
                
                const data = this.getDatasetData(dataset);
            if (!data || data.length === 0) return;
            
            // If metric has operation and column, group by X and recalculate for each group
            if (metric.operation && metric.column) {
                // Apply date grouping if X axis is a date column with grouping
                let processedData = data;
                if (xAxis.type === 'column' && xAxis.dateGrouping && xAxis.dateGrouping !== 'day') {
                    processedData = this.applyDateGrouping(data, xAxis.value, xAxis.dateGrouping);
                }
                
                // Group data by X column
                const groups = {};
                processedData.forEach(row => {
                    const xValue = row[xAxis.value];
                    if (xValue === null || xValue === undefined) return;
                    const xKey = String(xValue);
                    if (!groups[xKey]) {
                        groups[xKey] = [];
                    }
                    groups[xKey].push(row);
                });
                
                console.log('Metric grouping:', {
                    totalRows: data.length,
                    groupsCount: Object.keys(groups).length,
                    groupSizes: Object.entries(groups).map(([key, rows]) => ({ key, size: rows.length })),
                    metricOperation: metric.operation,
                    metricColumn: metric.column,
                    xAxisColumn: xAxis.value
                });
                
                // Recalculate metric for each group
                const aggregated = [];
                Object.entries(groups).forEach(([xKey, groupRows]) => {
                    // Convert group rows to dataset format for metric calculation
                    const groupRowsArray = groupRows.map(row => {
                        return dataset.columns.map(col => row[col]);
                    });
                    
                    try {
                        // Calculate metric for this group
                        const metricValue = calculateMetric(
                            groupRowsArray,
                            dataset.columns,
                            metric.column,
                            metric.operation
                        );
                        
                        console.log(`Group ${xKey}: ${groupRows.length} rows, COUNT_DISTINCT(${metric.column}) = ${metricValue}`);
                        
                        aggregated.push({
                            x: groupRows[0][xAxis.value],
                            y: metricValue !== null && metricValue !== undefined ? metricValue : 0
                        });
                    } catch (error) {
                        console.error('Error calculating metric for group:', error, {
                            xKey,
                            groupSize: groupRows.length,
                            operation: metric.operation,
                            column: metric.column
                        });
                        aggregated.push({
                            x: groupRows[0][xAxis.value],
                            y: 0
                        });
                    }
                });
                
                // Sort by X value
                aggregated.sort((a, b) => {
                    if (typeof a.x === 'number' && typeof b.x === 'number') {
                        return a.x - b.x;
                    }
                    return String(a.x).localeCompare(String(b.x));
                });
                
                // Convert to Highcharts format
                const isXNumeric = typeof aggregated[0]?.x === 'number';
                let chartData, categories;
                
                if (chartType === 'line') {
                    if (isXNumeric) {
                        chartData = aggregated.map(p => [parseFloat(p.x) || 0, p.y]);
                    } else {
                        categories = aggregated.map(p => String(p.x));
                        chartData = aggregated.map(p => p.y);
                    }
                } else if (chartType === 'bar') {
                    categories = aggregated.map(p => String(p.x));
                    chartData = aggregated.map(p => p.y);
                } else {
                    // Scatter
                    chartData = aggregated.map(p => [parseFloat(p.x) || 0, p.y]);
                }
                
                const seriesData = { chartData, isXNumeric, categories };
                
                const chartId = `chart_${Date.now()}`;
                const chartContainer = document.createElement('div');
                chartContainer.id = chartId;
                chartContainer.className = 'chart-wrapper';
                
                const chartsContainer = this.container.querySelector('#charts-container');
                chartsContainer.appendChild(chartContainer);
                
                const stylingOptions = this.getStylingOptions();
                const yLabel = stylingOptions.yLabel || metric.name;
                
                this.renderHighchart(chartId, chartType, seriesData, {
                    xLabel: stylingOptions.xLabel || this.formatColumnName(xAxis.value),
                    yLabel: yLabel,
                    title: stylingOptions.title || `${yLabel} by ${this.formatColumnName(xAxis.value)}`,
                    color: stylingOptions.color,
                    showTrendline: stylingOptions.showTrendline
                });
                    return;
                }
                
            // If metric has an expression (like IF statements), group by X and recalculate expression for each group
            if (metric.expression) {
                // Apply date grouping if X axis is a date column with grouping
                let processedData = data;
                if (xAxis.type === 'column' && xAxis.dateGrouping && xAxis.dateGrouping !== 'day') {
                    processedData = this.applyDateGrouping(data, xAxis.value, xAxis.dateGrouping);
                }
                
                // Group data by X column
                const groups = {};
                processedData.forEach(row => {
                    const xValue = row[xAxis.value];
                    if (xValue === null || xValue === undefined) return;
                    const xKey = String(xValue);
                    if (!groups[xKey]) {
                        groups[xKey] = [];
                    }
                    groups[xKey].push(row);
                });
                
                console.log('Metric expression grouping:', {
                    totalRows: data.length,
                    groupsCount: Object.keys(groups).length,
                    groupSizes: Object.entries(groups).map(([key, rows]) => ({ key, size: rows.length })),
                    metricExpression: metric.expression,
                    xAxisColumn: xAxis.value
                });
                
                // Recalculate metric expression for each group
                const aggregated = [];
                Object.entries(groups).forEach(([xKey, groupRows]) => {
                    // Convert group rows to dataset format
                    const groupRowsArray = groupRows.map(row => {
                        return dataset.columns.map(col => row[col]);
                    });
                    
                    // Create a subset dataset for this group
                    const groupDataset = {
                        id: dataset.id,
                        name: dataset.name,
                        columns: dataset.columns,
                        rows: groupRowsArray
                    };
                    
                    try {
                        // Calculate metric expression for this group using the execution engine
                        const metricValue = metricExecutionEngine.executeMetric(metric, groupDataset);
                        
                        console.log(`Group ${xKey}: ${groupRows.length} rows, expression result = ${metricValue}`);
                        
                        aggregated.push({
                            x: groupRows[0][xAxis.value],
                            y: metricValue !== null && metricValue !== undefined ? metricValue : 0
                        });
                    } catch (error) {
                        console.error('Error calculating metric expression for group:', error, {
                            xKey,
                            groupSize: groupRows.length,
                            expression: metric.expression
                        });
                        aggregated.push({
                            x: groupRows[0][xAxis.value],
                            y: 0
                        });
                    }
                });
                
                // Sort by X value
                aggregated.sort((a, b) => {
                    if (typeof a.x === 'number' && typeof b.x === 'number') {
                        return a.x - b.x;
                    }
                    return String(a.x).localeCompare(String(b.x));
                });
                
                // Convert to Highcharts format
                const isXNumeric = typeof aggregated[0]?.x === 'number';
                let chartData, categories;
                
                if (chartType === 'line') {
                    if (isXNumeric) {
                        chartData = aggregated.map(p => [parseFloat(p.x) || 0, p.y]);
                    } else {
                        categories = aggregated.map(p => String(p.x));
                        chartData = aggregated.map(p => p.y);
                    }
                } else if (chartType === 'bar') {
                    categories = aggregated.map(p => String(p.x));
                    chartData = aggregated.map(p => p.y);
                } else {
                    // Scatter
                    chartData = aggregated.map(p => [parseFloat(p.x) || 0, p.y]);
                }
                
                const seriesData = { chartData, isXNumeric, categories };
                
                const chartId = `chart_${Date.now()}`;
                const chartContainer = document.createElement('div');
                chartContainer.id = chartId;
                chartContainer.className = 'chart-wrapper';
                
                const chartsContainer = this.container.querySelector('#charts-container');
                chartsContainer.appendChild(chartContainer);
                
                const stylingOptions = this.getStylingOptions();
                const yLabel = stylingOptions.yLabel || metric.name;
                
                this.renderHighchart(chartId, chartType, seriesData, {
                    xLabel: stylingOptions.xLabel || this.formatColumnName(xAxis.value),
                    yLabel: yLabel,
                    title: stylingOptions.title || `${yLabel} by ${this.formatColumnName(xAxis.value)}`,
                    color: stylingOptions.color,
                    showTrendline: stylingOptions.showTrendline
                });
                return;
            }
            
            // Fallback: metric doesn't have operation/column, show as reference line
            // Find a numeric column for the main series
            const numericColumns = dataset.columns.filter(col => {
                const sampleValue = data[0] && data[0][col];
                return sampleValue !== null && sampleValue !== undefined && 
                       (typeof sampleValue === 'number' || !isNaN(parseFloat(sampleValue)));
            });
            
            if (numericColumns.length === 0) {
                // No numeric columns, just show the metric as reference line with X column
                this.renderChartWithReferenceLine(datasetId, xAxis.value, yAxis.value, chartType, metric);
                return;
            }
            
            // Use first numeric column as main series
            const mainColumn = numericColumns[0];
            this.renderChartWithReferenceLine(datasetId, xAxis.value, yAxis.value, chartType, metric, mainColumn);
            return;
        }
        
        // Standard case: both axes are columns, or X is metric and Y is column
        // For now, we'll require at least one column for the chart
        if (xAxis.type !== 'column' && yAxis.type !== 'column') {
            return;
        }
        
        let data = this.getDatasetData(dataset);
        if (!data || data.length === 0) return;
        
        // Handle special chart types first (before determining columns)
        if (chartType === 'scorecard') {
            // Scorecard works best with just Y axis (metric or column)
            if (yAxis && yAxis.type === 'metric') {
                const metric = metricsStore.get(yAxis.value);
                if (metric) {
                    this.renderScorecardFromMetric(metric);
                    return;
                }
            }
            if (yAxis && yAxis.type === 'column') {
                // Apply aggregation if specified
                const scorecardData = this.getDatasetData(dataset);
                let aggregatedValue = null;
                if (yAxis.aggregation && scorecardData.length > 0) {
                    // For scorecard, aggregate all values
                    const values = scorecardData.map(row => row[yAxis.value]).filter(v => v !== null && v !== undefined);
                    if (values.length > 0) {
                        switch (yAxis.aggregation) {
                            case 'COUNT':
                                aggregatedValue = values.length;
                                break;
                            case 'COUNT_DISTINCT':
                                aggregatedValue = new Set(values).size;
                                break;
                            case 'SUM':
                                aggregatedValue = values.reduce((sum, v) => {
                                    const num = parseFloat(v);
                                    return sum + (isNaN(num) ? 0 : num);
                                }, 0);
                                break;
                            case 'AVG':
                                const sum = values.reduce((s, v) => {
                                    const num = parseFloat(v);
                                    return s + (isNaN(num) ? 0 : num);
                                }, 0);
                                aggregatedValue = values.length > 0 ? sum / values.length : 0;
                                break;
                            case 'MIN':
                                const nums = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
                                aggregatedValue = nums.length > 0 ? Math.min(...nums) : null;
                                break;
                            case 'MAX':
                                const nums2 = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
                                aggregatedValue = nums2.length > 0 ? Math.max(...nums2) : null;
                                break;
                        }
                    }
                }
                this.renderScorecard(dataset, null, yAxis.value, aggregatedValue, yAxis.aggregation);
                return;
            }
            return;
        }
        
        if (chartType === 'pie' || chartType === 'donut') {
            // Pie/donut requires X (categorical) and Y (aggregated field)
            if (xAxis && xAxis.type === 'column' && yAxis && yAxis.type === 'column') {
                // For pie/donut, Y axis must have aggregation
                // If not specified, default based on column type
                if (!yAxis.aggregation) {
                    const columnType = this.inferColumnType(dataset, yAxis.value);
                    if (columnType === 'numeric') {
                        yAxis.aggregation = 'SUM'; // Default to SUM for numeric
                    } else {
                        yAxis.aggregation = 'COUNT'; // Default to COUNT for non-numeric
                    }
                }
                
                // Apply aggregation
                let pieData = this.getDatasetData(dataset);
                pieData = this.applyAggregation(pieData, xAxis.value, yAxis.value, yAxis.aggregation);
                // Convert aggregated data back to row format for pie chart
                pieData = pieData.map(item => ({
                    [xAxis.value]: item.x,
                    [yAxis.value]: item.y
                }));
                
                this.renderPieChart(dataset, xAxis.value, yAxis.value, chartType, pieData, yAxis.aggregation);
                return;
            } else {
                this.showError('Pie/Donut charts require X axis (categorical field) and Y axis (aggregated field) to be columns.');
                return;
            }
        }
        
        if (chartType === 'scatter') {
            // Scatter plot with optional Z axis
            if (xAxis && xAxis.type === 'column' && yAxis && yAxis.type === 'column') {
                // Note: Scatter plots typically don't use aggregation, but we could support it
                this.renderScatterChart(dataset, xAxis.value, yAxis.value, zAxis ? zAxis.value : null);
                return;
            } else {
                this.showError('Scatter plots require X and Y axes to be columns.');
                return;
            }
        }
        
        // Determine X and Y columns/values for standard charts (line, bar)
        let xColumn, yColumn, yLabel;
        
        if (xAxis.type === 'column') {
            xColumn = xAxis.value;
            // Validate column exists in dataset
            if (!dataset.columns.includes(xColumn)) {
                this.showError(`Column "${xColumn}" not found in dataset "${dataset.name}"`);
                return;
            }
            
            // Apply date grouping if specified
            if (xAxis.dateGrouping && xAxis.dateGrouping !== 'day') {
                data = this.applyDateGrouping(data, xColumn, xAxis.dateGrouping);
            }
        } else {
            // X is metric - use index or first column
            xColumn = dataset.columns[0] || 'index';
        }
        
        if (yAxis.type === 'column') {
            yColumn = yAxis.value;
            // Validate column exists in dataset
            if (!dataset.columns.includes(yColumn)) {
                this.showError(`Column "${yColumn}" not found in dataset "${dataset.name}"`);
                return;
            }
            
            // If aggregation is specified, apply it
            if (yAxis.aggregation) {
                data = this.applyAggregation(data, xColumn, yColumn, yAxis.aggregation);
                yLabel = `${yAxis.aggregation}(${this.formatColumnName(yColumn)})`;
            } else {
                yLabel = this.formatColumnName(yColumn);
            }
        } else {
            // Y is metric - create constant value series
            const metric = metricsStore.get(yAxis.value);
            if (!metric) return;
            
            // Create data with metric value
            const metricData = data.map(row => ({
                x: row[xColumn],
                y: parseFloat(metric.value) || 0
            }));
            
            const seriesData = this.convertToHighchartsSeries(metricData, 'x', 'y', chartType);
            yLabel = metric.name;
            
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
            const stylingOptions = this.getStylingOptions();
        
        this.renderHighchart(chartId, chartType, seriesData, {
                xLabel: stylingOptions.xLabel || this.formatColumnName(xColumn),
                yLabel: stylingOptions.yLabel || yLabel,
                title: stylingOptions.title || `${yLabel} vs ${this.formatColumnName(xColumn)}`,
                color: stylingOptions.color,
                showTrendline: stylingOptions.showTrendline
            });
            return;
        }
        
        // Both are columns - standard chart (line, bar)
        // If aggregation was applied, data is already in {x, y} format
        let seriesData;
        try {
            if (yAxis.aggregation) {
                // Data is already aggregated, convert to Highcharts format
                const points = data.map(row => ({
                    x: row.x,
                    y: row.y,
                    name: String(row.x)
                }));
                
                const isXNumeric = typeof points[0]?.x === 'number';
                let chartData, categories;
                
                if (chartType === 'line') {
                    if (isXNumeric) {
                        chartData = points.map(p => [parseFloat(p.x) || 0, p.y]);
                    } else {
                        categories = points.map(p => String(p.x));
                        chartData = points.map(p => p.y);
                    }
                } else if (chartType === 'bar') {
                    categories = points.map(p => String(p.x));
                    chartData = points.map(p => p.y);
                } else {
                    chartData = points.map(p => p.y);
                }
                
                seriesData = { chartData, isXNumeric, categories };
            } else {
                // No aggregation, use standard conversion
                // Verify columns exist in data
                if (data.length > 0) {
                    const firstRow = data[0];
                    if (!(xColumn in firstRow)) {
                        this.showError(`Column "${xColumn}" not found in data. Available columns: ${Object.keys(firstRow).join(', ')}`);
                        return;
                    }
                    if (!(yColumn in firstRow)) {
                        this.showError(`Column "${yColumn}" not found in data. Available columns: ${Object.keys(firstRow).join(', ')}`);
                        return;
                    }
                }
                seriesData = this.convertToHighchartsSeries(data, xColumn, yColumn, chartType);
            }
        } catch (error) {
            console.error('[VisualizationPanel.renderChart] Error preparing chart data:', {
                error: error.message,
                stack: error.stack,
                chartType,
                xColumn,
                yColumn,
                dataLength: data?.length || 0,
                timestamp: new Date().toISOString()
            });
            this.showError(`Error preparing chart data: ${error.message}`);
            return;
        }
        
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        const stylingOptions = this.getStylingOptions();
        
        this.renderHighchart(chartId, chartType, seriesData, {
            xLabel: stylingOptions.xLabel || this.formatColumnName(xColumn),
            yLabel: stylingOptions.yLabel || yLabel,
            title: stylingOptions.title || `${yLabel} vs ${this.formatColumnName(xColumn)}`,
            color: stylingOptions.color,
            showTrendline: stylingOptions.showTrendline
        });
        
        console.log('[VisualizationPanel.renderChart] Chart rendered successfully', {
            chartType,
            chartId
        });
        } catch (error) {
            console.error('[VisualizationPanel.renderChart] Error rendering chart:', {
                error: error.message,
                stack: error.stack,
                chartType,
                datasetId,
                timestamp: new Date().toISOString()
            });
            this.showError(`Error rendering chart: ${error.message || 'Unknown error'}`);
        }
    }
    
    /**
     * Collects styling options from the form
     * @returns {Object} Styling options object
     */
    getStylingOptions() {
        const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
        const findSelector = (id) => {
            return sidebarContainer ? sidebarContainer.querySelector(`#${id}`) : this.container.querySelector(`#${id}`);
        };
        const titleInput = findSelector('chart-title-input');
        const xLabelInput = findSelector('x-axis-label-input');
        const yLabelInput = findSelector('y-axis-label-input');
        const colorInput = findSelector('series-color-input');
        const trendlineToggle = findSelector('trendline-toggle');
        
        return {
            title: titleInput && titleInput.value.trim() ? titleInput.value.trim() : null,
            xLabel: xLabelInput && xLabelInput.value.trim() ? xLabelInput.value.trim() : null,
            yLabel: yLabelInput && yLabelInput.value.trim() ? yLabelInput.value.trim() : null,
            color: colorInput ? colorInput.value : '#007bff',
            showTrendline: trendlineToggle ? trendlineToggle.checked : false
        };
    }
    
    /**
     * Renders a single-value KPI card for a metric
     * @param {Object} metric - Metric object with name, value, type, etc.
     */
    renderKPICard(metric) {
        const kpiId = `kpi_${Date.now()}`;
        const kpiContainer = document.createElement('div');
        kpiContainer.id = kpiId;
        kpiContainer.className = 'kpi-card';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(kpiContainer);
        
        const value = parseFloat(metric.value);
        const formattedValue = isNaN(value) ? metric.value : this.formatNumber(value);
        
        kpiContainer.innerHTML = `
            <div class="kpi-header">
                <h4 class="kpi-title">${metric.name || 'Metric'}</h4>
                ${metric.type ? `<span class="kpi-type">${metric.type}</span>` : ''}
            </div>
            <div class="kpi-value">${formattedValue}</div>
            ${metric.column ? `<div class="kpi-meta">Column: ${this.formatColumnName(metric.column)}</div>` : ''}
            ${metric.operation ? `<div class="kpi-meta">Operation: ${metric.operation}</div>` : ''}
        `;
        
        // Store reference
        this.charts.push({
            id: kpiId,
            type: 'kpi',
            container: kpiContainer,
            metric: metric
        });
    }
    
    /**
     * Renders a chart with a metric value as a horizontal reference line
     * @param {string} datasetId - Dataset ID
     * @param {string} xColumn - X axis column name
     * @param {string} metricId - Metric ID to use as reference line
     * @param {string} chartType - Chart type (line, bar)
     * @param {Object} metric - Metric object
     */
    renderChartWithReferenceLine(datasetId, xColumn, metricId, chartType, metric, mainColumn = null) {
        const dataset = datasetStore.get(datasetId);
        if (!dataset) {
            return;
        }
        
        const data = this.getDatasetData(dataset);
        if (!data || data.length === 0) {
            return;
        }
        
        // For reference line, we need a Y column to plot
        let yColumn = mainColumn;
        
        if (!yColumn) {
            // Use the first numeric column as the main series
        const numericColumns = dataset.columns.filter(col => {
            const sampleValue = data[0] && data[0][col];
            return sampleValue !== null && sampleValue !== undefined && 
                   (typeof sampleValue === 'number' || !isNaN(parseFloat(sampleValue)));
        });
        
        if (numericColumns.length === 0) {
                // No numeric columns - just show the reference line
                yColumn = null;
            } else {
                yColumn = numericColumns[0];
            }
        }
        
        if (!yColumn) {
            // Can't render without a Y column
            return;
        }
        
        // Create chart container div
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        // Convert dataset to Highcharts series format
        const seriesData = this.convertToHighchartsSeries(data, xColumn, yColumn, chartType);
        const yLabel = this.formatColumnName(yColumn);
        const metricValue = parseFloat(metric.value) || 0;
        
        // Render chart with reference line
        this.renderHighchartWithReferenceLine(chartId, chartType, seriesData, {
            xLabel: this.formatColumnName(xColumn),
            yLabel: yLabel,
            title: `${yLabel} vs ${this.formatColumnName(xColumn)} (${metric.name}: ${metricValue})`,
            referenceLine: {
                value: metricValue,
                name: metric.name || 'Reference Line',
                color: '#ff6b6b'
            }
        });
    }
    
    /**
     * Formats a number for display in KPI cards
     * @param {number} value - Numeric value
     * @returns {string} Formatted number string
     */
    formatNumber(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(2) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(2) + 'K';
        } else if (value % 1 === 0) {
            return value.toString();
        } else {
            return value.toFixed(2);
        }
    }
    
    /**
     * Calculates trendline data using linear regression
     * @param {Array} chartData - Chart data array
     * @param {boolean} isXNumeric - Whether X values are numeric
     * @param {Array} categories - Category labels (if categorical)
     * @returns {Array} Trendline data points
     */
    calculateTrendline(chartData, isXNumeric, categories) {
        if (!chartData || chartData.length < 2) {
            return [];
        }
        
        // Convert chart data to [x, y] pairs for regression
        let points = [];
        
        if (isXNumeric || chartData[0] instanceof Array) {
            // Data is already in [x, y] format
            points = chartData.map(point => {
                if (Array.isArray(point)) {
                    return { x: point[0], y: point[1] };
                }
                return null;
            }).filter(p => p !== null && !isNaN(p.x) && !isNaN(p.y));
        } else {
            // Data is array of y values, use index as x
            points = chartData.map((y, index) => ({
                x: index,
                y: parseFloat(y) || 0
            })).filter(p => !isNaN(p.y));
        }
        
        if (points.length < 2) {
            return [];
        }
        
        // Calculate linear regression: y = mx + b
        const n = points.length;
        const sumX = points.reduce((sum, p) => sum + p.x, 0);
        const sumY = points.reduce((sum, p) => sum + p.y, 0);
        const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
        const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
        
        const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const b = (sumY - m * sumX) / n;
        
        // Generate trendline points
        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));
        
        // For categorical data (no numeric x), return y values
        // For numeric x, return [x, y] pairs
        if (!isXNumeric && categories && categories.length > 0) {
            // Categorical: return array of y values matching the number of categories
            return categories.map((_, index) => m * index + b);
        } else {
            // Numeric: return [x, y] pairs for the trendline endpoints
            return [
                [minX, m * minX + b],
                [maxX, m * maxX + b]
            ];
        }
    }
    
    /**
     * Renders a Highcharts chart inside a div container
     * @param {string} containerId - ID of the div container to render chart in
     * @param {string} chartType - Type of chart (line, bar, scatter)
     * @param {Object} seriesData - Object with chartData, isXNumeric, and categories
     * @param {Object} options - Chart options (xLabel, yLabel, title, color, showTrendline)
     */
    renderHighchart(containerId, chartType, seriesData, options) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Chart container with ID "${containerId}" not found`);
            return;
        }
        
        // Check if Highcharts is available
        if (typeof Highcharts === 'undefined') {
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">Highcharts library not loaded. Please check that Highcharts is included in the page.</p>
                </div>
            `;
            return;
        }
        
        // Validate series data
        if (!seriesData || !seriesData.chartData || seriesData.chartData.length === 0) {
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">No data available to render chart.</p>
                </div>
            `;
            return;
        }
        
        const { chartData, isXNumeric, categories } = seriesData;
        
        // Configure X axis based on chart type and data type
        let xAxisConfig = {
            title: {
                text: options.xLabel || 'X Axis'
            }
        };
        
        if (chartType === 'scatter') {
            // Scatter plot always uses linear/numeric axis
            xAxisConfig.type = 'linear';
        } else if (chartType === 'line') {
            if (isXNumeric) {
                // Line chart with numeric x-axis
                xAxisConfig.type = 'linear';
            } else {
                // Line chart with categorical x-axis
                xAxisConfig.type = 'category';
                if (categories && categories.length > 0) {
                    xAxisConfig.categories = categories;
                }
            }
        } else if (chartType === 'bar') {
            // Bar charts always use category axis for better display
            xAxisConfig.type = 'category';
            if (categories && categories.length > 0) {
                xAxisConfig.categories = categories;
            }
        }
        
        // Convert 'donut' to 'pie' - Highcharts doesn't have a separate donut type
        const normalizedChartType = chartType === 'donut' ? 'pie' : (chartType === 'scatter' ? 'scatter' : chartType);
        
        // Build Highcharts configuration
        const chartConfig = {
            chart: {
                type: normalizedChartType,
                renderTo: containerId,
                height: 400
            },
            accessibility: {
                enabled: false
            },
            title: {
                text: options.title || 'Chart'
            },
            xAxis: xAxisConfig,
            yAxis: {
                title: {
                    text: options.yLabel || 'Y Axis'
                }
            },
            series: [{
                name: options.yLabel || 'Series 1',
                data: chartData,
                color: options.color || '#007bff'
            }],
            legend: {
                enabled: true
            },
            credits: {
                enabled: false
            },
            tooltip: {
                enabled: true,
                shared: false
            },
            plotOptions: {
                line: {
                    marker: {
                        enabled: true,
                        radius: 4
                    }
                },
                bar: {
                    dataLabels: {
                        enabled: false
                    }
                },
                scatter: {
                    marker: {
                        radius: 5
                    }
                }
            }
        };
        
        // Add trendline if requested and chart type supports it
        if (options.showTrendline && (chartType === 'line' || chartType === 'scatter')) {
            const trendlineData = this.calculateTrendline(chartData, isXNumeric, categories);
            if (trendlineData && trendlineData.length > 0) {
                chartConfig.series.push({
                    name: 'Trendline',
                    type: 'line',
                    data: trendlineData,
                    color: '#ff9800',
                    dashStyle: 'dash',
                    marker: {
                        enabled: false
                    },
                    enableMouseTracking: false,
                    zIndex: 1
                });
            }
        }
        
        // Render the chart
        try {
            const chart = new Highcharts.Chart(chartConfig);
            
            // Store chart reference for potential updates
            container._highchartsChart = chart;
            
            // Add to charts array for management
            this.charts.push({
                id: containerId,
                chart: chart,
                container: container
            });
        } catch (error) {
            console.error('Error rendering Highcharts chart:', error);
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">Error rendering chart: ${error.message}</p>
                    <p>Please check the browser console for more details.</p>
                </div>
            `;
        }
    }
    
    /**
     * Renders a Highcharts chart with a metric value as a horizontal reference line
     * @param {string} containerId - ID of the div container to render chart in
     * @param {string} chartType - Type of chart (line, bar)
     * @param {Object} seriesData - Object with chartData, isXNumeric, and categories
     * @param {Object} options - Chart options including referenceLine
     */
    renderHighchartWithReferenceLine(containerId, chartType, seriesData, options) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Chart container with ID "${containerId}" not found`);
            return;
        }
        
        // Check if Highcharts is available
        if (typeof Highcharts === 'undefined') {
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">Highcharts library not loaded. Please check that Highcharts is included in the page.</p>
                </div>
            `;
            return;
        }
        
        // Validate series data
        if (!seriesData || !seriesData.chartData || seriesData.chartData.length === 0) {
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">No data available to render chart.</p>
                </div>
            `;
            return;
        }
        
        if (!options.referenceLine || options.referenceLine.value === undefined) {
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">Reference line value not provided.</p>
                </div>
            `;
            return;
        }
        
        const { chartData, isXNumeric, categories } = seriesData;
        const { referenceLine } = options;
        
        // Configure X axis
        let xAxisConfig = {
            title: {
                text: options.xLabel || 'X Axis'
            }
        };
        
        // Convert 'donut' to 'pie' - Highcharts doesn't have a separate donut type
        const normalizedChartType = chartType === 'donut' ? 'pie' : chartType;
        
        if (normalizedChartType === 'line') {
            if (isXNumeric) {
                xAxisConfig.type = 'linear';
            } else {
                xAxisConfig.type = 'category';
                if (categories && categories.length > 0) {
                    xAxisConfig.categories = categories;
                }
            }
        } else if (normalizedChartType === 'bar') {
            xAxisConfig.type = 'category';
            if (categories && categories.length > 0) {
                xAxisConfig.categories = categories;
            }
        }
        
        // Build Highcharts configuration with reference line
        const chartConfig = {
            chart: {
                type: normalizedChartType,
                renderTo: containerId,
                height: 400
            },
            accessibility: {
                enabled: false
            },
            title: {
                text: options.title || 'Chart'
            },
            xAxis: xAxisConfig,
            yAxis: {
                title: {
                    text: options.yLabel || 'Y Axis'
                },
                plotLines: [{
                    value: referenceLine.value,
                    color: referenceLine.color || '#ff6b6b',
                    width: 2,
                    dashStyle: 'dash',
                    label: {
                        text: referenceLine.name || 'Reference',
                        align: 'right',
                        style: {
                            color: referenceLine.color || '#ff6b6b',
                            fontWeight: 'bold'
                        }
                    },
                    zIndex: 5
                }]
            },
            series: [{
                name: options.yLabel || 'Series 1',
                data: chartData
            }],
            legend: {
                enabled: true
            },
            credits: {
                enabled: false
            },
            tooltip: {
                enabled: true,
                shared: false
            },
            plotOptions: {
                line: {
                    marker: {
                        enabled: true,
                        radius: 4
                    }
                },
                bar: {
                    dataLabels: {
                        enabled: false
                    }
                }
            }
        };
        
        // Render the chart
        try {
            const chart = new Highcharts.Chart(chartConfig);
            
            // Store chart reference
            container._highchartsChart = chart;
            
            // Add to charts array for management
            this.charts.push({
                id: containerId,
                chart: chart,
                container: container,
                type: 'chart-with-reference-line'
            });
        } catch (error) {
            console.error('Error rendering Highcharts chart with reference line:', error);
            container.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">Error rendering chart: ${error.message}</p>
                    <p>Please check the browser console for more details.</p>
                </div>
            `;
        }
    }
    
    updateDataset(dataset) {
        // Check if dataset exists
        if (dataset && !datasetStore.exists(dataset.id)) {
            this.showDatasetMissingError(dataset);
            this.currentDataset = null;
            // Update global selection manager
            datasetSelectionManager.setSelectedDatasetId(null);
            this.refreshCharts();
            return;
        }
        
        this.currentDataset = dataset;
        // Update global selection manager
        if (dataset) {
            datasetSelectionManager.setSelectedDatasetId(dataset.id);
        } else {
            datasetSelectionManager.setSelectedDatasetId(null);
        }
        // Update selection if this dataset is currently selected
        const datasetSelect = this.container.querySelector('#dataset-select');
        if (datasetSelect && dataset && datasetSelect.value === dataset.id) {
            this.onDatasetSelected();
        }
        this.refreshCharts();
    }
    
    updateMetrics(metrics) {
        this.currentMetrics = metrics;
        // Refresh Y column options if metric type is selected
        const ySelectType = this.container.querySelector('#y-select-type');
        if (ySelectType && ySelectType.value === 'metric') {
            this.updateYColumnOptions();
        }
        this.refreshCharts();
    }
    
    refreshCharts() {
        // Refresh all existing charts with new data
        // This is a placeholder - could be enhanced to update existing charts
    }
    
    showError(message) {
        // Create a temporary error message in the charts container
        const chartsContainer = this.container.querySelector('#charts-container');
        if (!chartsContainer) return;
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-error-message';
        errorDiv.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-text">${this.escapeHtml(message)}</div>
        `;
        
        // Remove any existing error messages
        const existingErrors = chartsContainer.querySelectorAll('.chart-error-message');
        existingErrors.forEach(err => err.remove());
        
        chartsContainer.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Selects a dataset in the visualization builder
     * @param {string} datasetId - Dataset ID to select
     */
    showDatasetMissingError(dataset) {
        const chartsContainer = this.container.querySelector('#charts-container');
        if (chartsContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'chart-error-message';
            errorDiv.innerHTML = `
                <div class="error-icon">⚠️</div>
                <div class="error-text">
                    <strong>Dataset "${dataset.name}" is missing or has been deleted.</strong>
                    <p>Charts for this dataset cannot be displayed. Please select a different dataset.</p>
                </div>
            `;
            chartsContainer.innerHTML = '';
            chartsContainer.appendChild(errorDiv);
        }
    }
    
    selectDataset(datasetId) {
        // Update global selection manager
        if (datasetId) {
            datasetSelectionManager.setSelectedDatasetId(datasetId);
        } else {
            datasetSelectionManager.setSelectedDatasetId(null);
        }
        
        // Check if dataset exists
        if (!datasetId || !datasetStore.exists(datasetId)) {
            if (datasetId) {
                const dataset = { id: datasetId, name: 'Unknown Dataset' };
                this.showDatasetMissingError(dataset);
            }
            this.currentDataset = null;
            this.updateDatasetDisplay(null);
            return;
        }
        
        // Store the dataset
        this.currentDataset = datasetStore.get(datasetId);
        this.updateDatasetDisplay(this.currentDataset);
        
        // Also update old selector if it exists
        const datasetSelect = this.container.querySelector('#dataset-select');
        if (datasetSelect) {
            datasetSelect.value = datasetId;
            this.onDatasetSelected();
        }
    }
    
    /**
     * Updates the dataset display in the sidebar
     * @param {Object|null} dataset - Dataset object or null
     */
    updateDatasetDisplay(dataset) {
        const display = document.querySelector('#current-dataset-display');
        if (display) {
            if (dataset) {
                display.innerHTML = `<span style="color: #28a745;">${this.escapeHtml(dataset.name)}</span>`;
            } else {
                display.innerHTML = '<span class="text-muted">Select a dataset from the left pane</span>';
            }
        }
    }
    
    /**
     * Sets up drag and drop for an axis selection display
     * @param {HTMLElement} axisDisplay - The axis display element
     * @param {string} axis - 'x' or 'y'
     */
    setupDragAndDrop(axisDisplay, axis) {
        if (!axisDisplay) return;
        
        // Store drag type for visual feedback
        let currentDragType = null;
        
        // Listen for dragenter to detect type from source
        document.addEventListener('dragstart', (e) => {
            const draggableItem = e.target.closest('.draggable-item');
            if (draggableItem) {
                currentDragType = draggableItem.getAttribute('data-type');
            }
        });
        
        document.addEventListener('dragend', () => {
            currentDragType = null;
        });
        
        // Allow dropping
        axisDisplay.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            axisDisplay.classList.add('drag-over');
            
            // Add type-specific class for visual feedback
            if (currentDragType === 'column') {
                axisDisplay.classList.add('column-drop');
                axisDisplay.classList.remove('metric-drop');
            } else if (currentDragType === 'metric') {
                axisDisplay.classList.add('metric-drop');
                axisDisplay.classList.remove('column-drop');
            }
        });
        
        axisDisplay.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove classes if we're actually leaving the drop zone
            if (!axisDisplay.contains(e.relatedTarget)) {
                axisDisplay.classList.remove('drag-over', 'column-drop', 'metric-drop');
            }
        });
        
        axisDisplay.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            axisDisplay.classList.remove('drag-over', 'column-drop', 'metric-drop');
            
            const dragData = e.dataTransfer.getData('application/json');
            if (dragData) {
                try {
                    const data = JSON.parse(dragData);
                    if (data.type && data.value && data.datasetId) {
                        this.selectAxis(data.type, data.value, data.datasetId, axis);
                    }
                } catch (error) {
                    console.error('Error parsing drag data:', error);
                }
            }
            currentDragType = null;
        });
    }
    
    /**
     * Shows a dropdown with available fields for axis selection
     * @param {string} axis - 'x' or 'y'
     * @param {HTMLElement} triggerElement - Element that triggered the dropdown
     */
    async showAxisSelectionDropdown(axis, triggerElement) {
        // Close any existing dropdown
        this.closeAxisSelectionDropdown();
        
        // Get current dataset from stored selection or sidebar selector
        let dataset = null;
        if (this.xAxisSelection) {
            dataset = datasetStore.get(this.xAxisSelection.datasetId);
        } else if (this.yAxisSelection) {
            dataset = datasetStore.get(this.yAxisSelection.datasetId);
        }
        
        // If no dataset, try to get from currentDataset (set by left pane selection)
        if (!dataset && this.currentDataset) {
            dataset = this.currentDataset;
        }
        
        // Fallback to dataset browser (left panel) if still no dataset
        if (!dataset) {
            const datasetBrowser = document.querySelector('#dataset-browser-visualization');
            if (datasetBrowser) {
                const select = datasetBrowser.querySelector('.dataset-browser-select');
                if (select && select.value) {
                    dataset = datasetStore.get(select.value);
                }
            }
        }
        
        if (!dataset) {
            await Modal.alert('Please select a dataset first from the Chart Builder sidebar.');
            return;
        }
        
        // Find axis display in sidebar or main container
        const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
        const searchContainer = sidebarContainer || this.container;
        const axisDisplay = searchContainer.querySelector(`.axis-selection-display[data-axis="${axis}"]`);
        if (!axisDisplay || !triggerElement) return;
        
        // Get position for dropdown
        const rect = triggerElement.getBoundingClientRect();
        const axisRect = axisDisplay.getBoundingClientRect();
        
        // Get columns and metrics
        const columns = dataset.columns || [];
        const metrics = metricsStore.getByDataset(dataset.id) || [];
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'axis-selection-dropdown';
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.left = `${axisRect.left}px`;
        dropdown.style.width = `${axisRect.width}px`;
        dropdown.style.zIndex = '1000';
        
        dropdown.innerHTML = `
            <div class="dropdown-header">
                <span>Select ${axis.toUpperCase()} Axis</span>
                <button class="dropdown-close" onclick="this.closest('.axis-selection-dropdown').remove()">×</button>
            </div>
            <div class="dropdown-content">
                ${columns.length > 0 ? `
                    <div class="dropdown-section">
                        <div class="dropdown-section-title">Columns</div>
                        ${columns.map(col => `
                            <div class="dropdown-item column-item" 
                                 data-type="column" 
                                 data-value="${this.escapeHtml(col)}"
                                 data-dataset="${dataset.id}">
                                <span class="item-icon">📊</span>
                                <span class="item-name">${this.escapeHtml(this.formatColumnName(col))}</span>
                                <span class="item-type">${this.inferColumnType(dataset, col)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${metrics.length > 0 ? `
                    <div class="dropdown-section">
                        <div class="dropdown-section-title">Metrics</div>
                        ${metrics.map(metric => `
                            <div class="dropdown-item metric-item" 
                                 data-type="metric" 
                                 data-value="${metric.id}"
                                 data-dataset="${dataset.id}">
                                <span class="item-icon">📈</span>
                                <div class="item-info">
                                    <span class="item-name">${this.escapeHtml(metric.name)}</span>
                                    <span class="item-value">${this.formatMetricValue(metric.value)}</span>
                                </div>
                                <span class="item-operation">${this.escapeHtml(metric.operation || '')}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${columns.length === 0 && metrics.length === 0 ? `
                    <div class="empty-state-small">No columns or metrics available</div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(dropdown);
        
        // Add click handlers for dropdown items
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.getAttribute('data-type');
                const value = item.getAttribute('data-value');
                const datasetId = item.getAttribute('data-dataset');
                this.selectAxis(type, value, datasetId, axis);
                this.closeAxisSelectionDropdown();
            });
        });
        
        // Store reference for closing
        this.currentDropdown = dropdown;
    }
    
    /**
     * Closes the axis selection dropdown
     */
    closeAxisSelectionDropdown() {
        if (this.currentDropdown) {
            this.currentDropdown.remove();
            this.currentDropdown = null;
        }
    }
    
    /**
     * Handles axis selection from the dataset browser or dropdown
     * @param {string} type - 'column' or 'metric'
     * @param {string} value - Column name or metric ID
     * @param {string} datasetId - Dataset ID
     * @param {string} axis - 'x', 'y', or 'z'
     * @param {string} aggregation - Optional aggregation function (COUNT, COUNT_DISTINCT, SUM, AVG, etc.)
     */
    selectAxis(type, value, datasetId, axis = null, aggregation = null) {
        if (!axis) {
            // If no axis specified, use the one that's not set, or default to X
            axis = !this.xAxisSelection ? 'x' : (!this.yAxisSelection ? 'y' : (!this.zAxisSelection ? 'z' : 'x'));
        }
        
        const selection = { type, value, datasetId };
        
        // If it's a column on Y axis (metric slot), check if aggregation is needed
        if (type === 'column' && axis === 'y') {
            const dataset = datasetStore.get(datasetId);
            if (dataset) {
                const columnType = this.inferColumnType(dataset, value);
                const availableAggregations = this.getAvailableAggregations(columnType);
                
                // If aggregation is not provided and column is not numeric, prompt for aggregation
                if (!aggregation && availableAggregations.length > 0) {
                    // Default to first available aggregation
                    aggregation = availableAggregations[0].value;
                }
                
                if (aggregation) {
                    selection.aggregation = aggregation;
                }
            }
        }
        
        if (axis === 'x') {
            this.xAxisSelection = selection;
            // Find the actual display element by data-axis attribute
            const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
            const searchContainer = sidebarContainer || this.container;
            const xDisplay = searchContainer.querySelector(`.axis-selection-display[data-axis="x"]`);
            if (xDisplay) {
                this.updateAxisDisplay(xDisplay.id || 'x-axis-display', selection);
            }
        } else if (axis === 'y') {
            this.yAxisSelection = selection;
            // Find the actual display element by data-axis attribute
            const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
            const searchContainer = sidebarContainer || this.container;
            const yDisplay = searchContainer.querySelector(`.axis-selection-display[data-axis="y"]`);
            if (yDisplay) {
                this.updateAxisDisplay(yDisplay.id || 'y-axis-display', selection);
            }
        } else if (axis === 'z') {
            this.zAxisSelection = selection;
            // Find the actual display element by data-axis attribute
            const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
            const searchContainer = sidebarContainer || this.container;
            const zDisplay = searchContainer.querySelector(`.axis-selection-display[data-axis="z"]`);
            if (zDisplay) {
                this.updateAxisDisplay(zDisplay.id || 'z-axis-display', selection);
            }
        }
        
        this.autoRender();
    }
    
    /**
     * Gets available aggregation functions for a column type
     * @param {string} columnType - 'numeric', 'text', 'date', or 'unknown'
     * @returns {Array} Array of { value: string, label: string } objects
     */
    getAvailableAggregations(columnType) {
        if (columnType === 'numeric') {
            return [
                { value: 'SUM', label: 'Sum' },
                { value: 'AVG', label: 'Average' },
                { value: 'MIN', label: 'Min' },
                { value: 'MAX', label: 'Max' },
                { value: 'COUNT', label: 'Count' },
                { value: 'COUNT_DISTINCT', label: 'Count Distinct' }
            ];
        } else if (columnType === 'text' || columnType === 'date') {
            return [
                { value: 'COUNT', label: 'Count' },
                { value: 'COUNT_DISTINCT', label: 'Count Distinct' }
            ];
        }
        // For unknown type, provide basic options
        return [
            { value: 'COUNT', label: 'Count' },
            { value: 'COUNT_DISTINCT', label: 'Count Distinct' }
        ];
    }
    
    /**
     * Updates the axis selection display
     * @param {string} displayId - ID of the display element
     * @param {Object} selection - Selection object or null
     */
    updateAxisDisplay(displayId, selection) {
        const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
        const searchContainer = sidebarContainer || this.container;
        
        // Try to find by ID first
        let display = searchContainer.querySelector(`#${displayId}`);
        
        // If not found and displayId contains axis info, try to find by data-axis attribute
        if (!display && displayId && displayId.includes('axis-display')) {
            // Extract axis from displayId (e.g., 'x-axis-display' -> 'x')
            const axis = displayId.split('-')[0];
            display = searchContainer.querySelector(`.axis-selection-display[data-axis="${axis}"]`);
        }
        
        if (!display) {
            console.warn(`Could not find axis display with ID "${displayId}"`);
            return;
        }
        
        // Get or create content container
        let contentContainer = display.querySelector('.axis-selection-content');
        if (!contentContainer) {
            contentContainer = document.createElement('div');
            contentContainer.className = 'axis-selection-content';
            const placeholder = display.querySelector('.selection-placeholder');
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.insertBefore(contentContainer, placeholder);
            } else {
                display.insertBefore(contentContainer, display.querySelector('.axis-select-btn'));
            }
        }
        
        // Clear content container
        contentContainer.innerHTML = '';
        
        // Clear placeholder
        const placeholder = display.querySelector('.selection-placeholder');
        if (placeholder) {
            placeholder.style.display = selection ? 'none' : 'block';
        }
        
        if (!selection) {
            return;
        }
        
        const dataset = datasetStore.get(selection.datasetId);
        if (!dataset) return;
        
        const selectedItem = document.createElement('div');
        
        if (selection.type === 'column') {
            selectedItem.className = 'selected-item column-selected';
            
            // Check if this is Y axis (metric slot) and needs aggregation
            const isYAxis = displayId === 'y-axis-display';
            const isXAxis = displayId === 'x-axis-display';
            const columnType = this.inferColumnType(dataset, selection.value);
            const availableAggregations = isYAxis ? this.getAvailableAggregations(columnType) : [];
            const hasAggregation = selection.aggregation && availableAggregations.length > 0;
            
            // Check if this is X axis with date column - show date grouping selector
            const isDateColumn = columnType === 'date';
            const dateGroupingOptions = [
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'quarter', label: 'Quarter' },
                { value: 'year', label: 'Year' }
            ];
            
            let aggregationSelector = '';
            if (isYAxis && availableAggregations.length > 0) {
                aggregationSelector = `
                    <select class="aggregation-select" data-axis="${displayId}">
                        ${availableAggregations.map(agg => `
                            <option value="${agg.value}" ${selection.aggregation === agg.value ? 'selected' : ''}>
                                ${agg.label}
                            </option>
                        `).join('')}
                    </select>
                `;
            }
            
            let dateGroupingSelector = '';
            if (isXAxis && isDateColumn) {
                const currentGrouping = selection.dateGrouping || 'day';
                dateGroupingSelector = `
                    <select class="date-grouping-select" data-axis="${displayId}">
                        ${dateGroupingOptions.map(opt => `
                            <option value="${opt.value}" ${currentGrouping === opt.value ? 'selected' : ''}>
                                ${opt.label}
                            </option>
                        `).join('')}
                    </select>
                `;
            }
            
            selectedItem.innerHTML = `
                <span class="item-icon">📊</span>
                <span class="item-name">${this.escapeHtml(this.formatColumnName(selection.value))}</span>
                ${hasAggregation ? `<span class="item-aggregation">${this.escapeHtml(selection.aggregation)}</span>` : ''}
                ${isDateColumn && isXAxis && selection.dateGrouping ? `<span class="item-date-grouping">${this.escapeHtml(selection.dateGrouping)}</span>` : ''}
                <span class="item-type">Column</span>
                ${aggregationSelector}
                ${dateGroupingSelector}
                <button class="remove-selection" title="Remove selection">×</button>
            `;
            
            // Add aggregation change handler
            if (isYAxis && availableAggregations.length > 0) {
                const aggSelect = selectedItem.querySelector('.aggregation-select');
                if (aggSelect) {
                    aggSelect.addEventListener('change', (e) => {
                        const newAggregation = e.target.value;
                        if (displayId === 'y-axis-display' && this.yAxisSelection) {
                            this.yAxisSelection.aggregation = newAggregation;
                            this.updateAxisDisplay('y-axis-display', this.yAxisSelection);
                            this.autoRender();
                        }
                    });
                }
            }
            
            // Add date grouping change handler
            if (isXAxis && isDateColumn) {
                const dateGroupingSelect = selectedItem.querySelector('.date-grouping-select');
                if (dateGroupingSelect) {
                    // Set default if not set
                    if (!selection.dateGrouping) {
                        selection.dateGrouping = 'day';
                    }
                    
                    dateGroupingSelect.addEventListener('change', (e) => {
                        const newDateGrouping = e.target.value;
                        if (displayId === 'x-axis-display' && this.xAxisSelection) {
                            this.xAxisSelection.dateGrouping = newDateGrouping;
                            this.updateAxisDisplay('x-axis-display', this.xAxisSelection);
                            this.autoRender();
                        }
                    });
                }
            }
        } else {
            const metric = metricsStore.get(selection.value);
            if (metric) {
                selectedItem.className = 'selected-item metric-selected';
                selectedItem.innerHTML = `
                    <span class="item-icon">📈</span>
                    <div class="item-info">
                        <span class="item-name">${this.escapeHtml(metric.name)}</span>
                        <span class="item-value">${this.formatMetricValue(metric.value)}</span>
                    </div>
                    <span class="item-type">Metric</span>
                    <button class="remove-selection" title="Remove selection">×</button>
                `;
            }
        }
        
        // Add remove button handler
        const removeBtn = selectedItem.querySelector('.remove-selection');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (displayId === 'x-axis-display') {
                    this.xAxisSelection = null;
                } else if (displayId === 'y-axis-display') {
                    this.yAxisSelection = null;
                } else if (displayId === 'z-axis-display') {
                    this.zAxisSelection = null;
                }
                this.updateAxisDisplay(displayId, null);
                this.autoRender();
            });
        }
        
        contentContainer.appendChild(selectedItem);
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
    
    inferColumnType(dataset, columnName) {
        if (!dataset.rows || dataset.rows.length === 0) {
            return 'unknown';
        }
        
        const columnIndex = dataset.columns.indexOf(columnName);
        if (columnIndex === -1) return 'unknown';
        
        const sampleValues = dataset.rows
            .map(row => row[columnIndex])
            .filter(val => val !== null && val !== undefined)
            .slice(0, 10);
        
        if (sampleValues.length === 0) return 'unknown';
        
        const allNumeric = sampleValues.every(val => {
            const num = parseFloat(val);
            return !isNaN(num) && isFinite(num);
        });
        
        if (allNumeric) return 'numeric';
        
        const allDates = sampleValues.every(val => {
            const str = String(val);
            return /^\d{4}-\d{2}-\d{2}/.test(str) || !isNaN(Date.parse(str));
        });
        
        if (allDates) return 'date';
        
        return 'text';
    }
    
    /**
     * Applies date grouping to data
     * @param {Array} data - Array of data objects
     * @param {string} dateColumn - Column name containing dates
     * @param {string} grouping - Grouping level: 'day', 'week', 'month', 'quarter', 'year'
     * @returns {Array} Data with grouped dates
     */
    applyDateGrouping(data, dateColumn, grouping) {
        if (!data || data.length === 0) return [];
        
        // Group by date grouping level
        const groups = {};
        data.forEach(row => {
            const dateValue = row[dateColumn];
            if (dateValue === null || dateValue === undefined) return;
            
            let date;
            try {
                date = new Date(dateValue);
                if (isNaN(date.getTime())) return;
            } catch (e) {
                return;
            }
            
            let groupKey;
            switch (grouping) {
                case 'week':
                    // Get week of year (ISO week)
                    const week = this.getWeekOfYear(date);
                    groupKey = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
                    break;
                case 'month':
                    groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'quarter':
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    groupKey = `${date.getFullYear()}-Q${quarter}`;
                    break;
                case 'year':
                    groupKey = String(date.getFullYear());
                    break;
                case 'day':
                default:
                    groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            }
            
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(row);
        });
        
        // Aggregate data within each group (use first row as base, update date column)
        const grouped = Object.entries(groups).map(([groupKey, groupRows]) => {
            const baseRow = { ...groupRows[0] };
            baseRow[dateColumn] = groupKey;
            return baseRow;
        });
        
        // Sort by group key
        grouped.sort((a, b) => {
            return String(a[dateColumn]).localeCompare(String(b[dateColumn]));
        });
        
        return grouped;
    }
    
    /**
     * Gets ISO week number for a date
     * @param {Date} date - Date object
     * @returns {number} Week number (1-53)
     */
    getWeekOfYear(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    
    /**
     * Applies aggregation to data grouped by X column
     * @param {Array} data - Array of data objects
     * @param {string} xColumn - Column to group by
     * @param {string} yColumn - Column to aggregate
     * @param {string} aggregation - Aggregation function (COUNT, COUNT_DISTINCT, SUM, AVG, MIN, MAX)
     * @returns {Array} Aggregated data
     */
    applyAggregation(data, xColumn, yColumn, aggregation) {
        if (!data || data.length === 0) return [];
        
        // Group by X column
        const groups = {};
        data.forEach(row => {
            const xValue = row[xColumn];
            if (xValue === null || xValue === undefined) return;
            
            const xKey = String(xValue);
            if (!groups[xKey]) {
                groups[xKey] = {
                    x: xValue,
                    values: []
                };
            }
            groups[xKey].values.push(row[yColumn]);
        });
        
        // Apply aggregation to each group
        const aggregated = Object.values(groups).map(group => {
            const values = group.values.filter(v => v !== null && v !== undefined);
            let yValue;
            
            switch (aggregation) {
                case 'COUNT':
                    yValue = values.length;
                    break;
                case 'COUNT_DISTINCT':
                    yValue = new Set(values).size;
                    break;
                case 'SUM':
                    yValue = values.reduce((sum, v) => {
                        const num = parseFloat(v);
                        return sum + (isNaN(num) ? 0 : num);
                    }, 0);
                    break;
                case 'AVG':
                    const sum = values.reduce((s, v) => {
                        const num = parseFloat(v);
                        return s + (isNaN(num) ? 0 : num);
                    }, 0);
                    yValue = values.length > 0 ? sum / values.length : 0;
                    break;
                case 'MIN':
                    const nums = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
                    yValue = nums.length > 0 ? Math.min(...nums) : 0;
                    break;
                case 'MAX':
                    const nums2 = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
                    yValue = nums2.length > 0 ? Math.max(...nums2) : 0;
                    break;
                default:
                    yValue = values.length;
            }
            
            return {
                x: group.x,
                y: yValue
            };
        });
        
        // Sort by X value
        aggregated.sort((a, b) => {
            if (typeof a.x === 'number' && typeof b.x === 'number') {
                return a.x - b.x;
            }
            return String(a.x).localeCompare(String(b.x));
        });
        
        return aggregated;
    }
    
    /**
     * Handles item selection from dataset browser
     * @param {string} type - 'column' or 'metric'
     * @param {string} value - Column name or metric ID
     * @param {string} datasetId - Dataset ID
     */
    handleBrowserItemSelection(type, value, datasetId) {
        if (!value) {
            // Item was deselected
            return;
        }
        
        // Determine which axis to set (alternate between X and Y)
        if (!this.xAxisSelection) {
            this.selectAxis(type, value, datasetId, 'x');
        } else if (!this.yAxisSelection) {
            this.selectAxis(type, value, datasetId, 'y');
        } else {
            // Both are set, replace the one that was clicked (we'll need to track last click)
            // For now, replace Y axis
            this.selectAxis(type, value, datasetId, 'y');
        }
    }
    
    clearSelections() {
        this.xAxisSelection = null;
        this.yAxisSelection = null;
        this.zAxisSelection = null;
        this.tableFields = [];
        this.updateAxisDisplay('x-axis-display', null);
        this.updateAxisDisplay('y-axis-display', null);
        this.updateAxisDisplay('z-axis-display', null);
        this.clearChart();
        // Refresh field selection UI to clear table fields
        const sidebarContainer = document.querySelector('#visualization-builder-sidebar');
        const chartTypeSelect = sidebarContainer ? sidebarContainer.querySelector('#chart-type-select') : this.container.querySelector('#chart-type-select');
        if (chartTypeSelect && chartTypeSelect.value) {
            this.updateFieldSelectionUI(chartTypeSelect.value);
        }
    }
    
    /**
     * Renders a data table visualization with multiple fields
     * @param {Object} dataset - Dataset object
     */
    renderTableWithFields(dataset) {
        const data = this.getDatasetData(dataset);
        if (!data || data.length === 0) return;
        
        // Filter out null fields
        const validFields = this.tableFields.filter(f => f !== null && f !== undefined);
        if (validFields.length === 0) return;
        
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper table-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        const stylingOptions = this.getStylingOptions();
        const title = stylingOptions.title || 'Data Table';
        
        // Build column headers
        const headers = validFields.map(field => {
            if (field.type === 'column') {
                return this.formatColumnName(field.value);
            } else {
                const metric = metricsStore.get(field.value);
                return metric ? metric.name : 'Unknown';
            }
        });
        
        // Build table HTML
        const tableHTML = `
            <div class="table-chart-header">
                <h4>${this.escapeHtml(title)}</h4>
            </div>
            <div class="table-chart-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                ${validFields.map(field => {
                                    let value;
                                    if (field.type === 'column') {
                                        value = row[field.value];
                                    } else {
                                        const metric = metricsStore.get(field.value);
                                        value = metric ? metric.value : '';
                                    }
                                    const isNumeric = typeof value === 'number' || !isNaN(parseFloat(value));
                                    return `<td class="${isNumeric ? 'numeric' : ''}">${this.escapeHtml(String(value || ''))}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        chartContainer.innerHTML = tableHTML;
    }
    
    /**
     * Renders a data table visualization
     * @param {Object} dataset - Dataset object
     * @param {string} xColumn - X column name
     * @param {string} yColumn - Y column name
     */
    renderTable(dataset, xColumn, yColumn) {
        const data = this.getDatasetData(dataset);
        if (!data || data.length === 0) return;
        
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper table-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        const stylingOptions = this.getStylingOptions();
        const title = stylingOptions.title || `${this.formatColumnName(yColumn)} by ${this.formatColumnName(xColumn)}`;
        
        // Build table HTML
        const tableHTML = `
            <div class="table-chart-header">
                <h4>${this.escapeHtml(title)}</h4>
            </div>
            <div class="table-chart-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>${this.escapeHtml(this.formatColumnName(xColumn))}</th>
                            <th>${this.escapeHtml(this.formatColumnName(yColumn))}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                <td>${this.escapeHtml(String(row[xColumn] || ''))}</td>
                                <td class="numeric">${this.formatNumericValue(row[yColumn])}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        chartContainer.innerHTML = tableHTML;
    }
    
    /**
     * Renders a scorecard from a metric
     * @param {Object} metric - Metric object
     */
    renderScorecardFromMetric(metric) {
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper scorecard-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        const stylingOptions = this.getStylingOptions();
        const title = stylingOptions.title || metric.name;
        
        const scorecardHTML = `
            <div class="scorecard">
                <div class="scorecard-header">
                    <h4>${this.escapeHtml(title)}</h4>
                    <span class="scorecard-operation">${this.escapeHtml(metric.operation || 'Metric')}</span>
                </div>
                <div class="scorecard-value">${this.formatNumericValue(metric.value)}</div>
            </div>
        `;
        
        chartContainer.innerHTML = scorecardHTML;
    }
    
    /**
     * Renders a scorecard/KPI visualization
     * @param {Object} dataset - Dataset object
     * @param {string} xColumn - X column name (optional for scorecard)
     * @param {string} yColumn - Y column name (the value to display)
     */
    renderScorecard(dataset, xColumn, yColumn, aggregatedValue = null, aggregation = null) {
        const data = this.getDatasetData(dataset);
        if (!data || data.length === 0) return;
        
        let displayValue;
        let operation = 'Total';
        
        if (aggregatedValue !== null) {
            // Use provided aggregated value
            displayValue = aggregatedValue;
            operation = aggregation || 'Aggregate';
        } else {
            // Calculate aggregate value (sum, average, or single value)
            const values = data.map(row => {
                const val = row[yColumn];
                return val !== null && val !== undefined ? parseFloat(val) : null;
            }).filter(v => v !== null && !isNaN(v));
            
            if (values.length === 0) {
                displayValue = 'N/A';
            } else if (values.length === 1) {
                displayValue = values[0];
                operation = 'Value';
            } else {
                // Use average for multiple values
                const sum = values.reduce((a, b) => a + b, 0);
                displayValue = sum / values.length;
                operation = 'Average';
            }
        }
        
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper scorecard-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        const stylingOptions = this.getStylingOptions();
        const title = stylingOptions.title || this.formatColumnName(yColumn);
        
        const scorecardHTML = `
            <div class="scorecard">
                <div class="scorecard-header">
                    <h4>${this.escapeHtml(title)}</h4>
                    <span class="scorecard-operation">${operation}</span>
                </div>
                <div class="scorecard-value">${this.formatNumericValue(displayValue)}</div>
                ${xColumn ? `<div class="scorecard-meta">Grouped by: ${this.escapeHtml(this.formatColumnName(xColumn))}</div>` : ''}
            </div>
        `;
        
        chartContainer.innerHTML = scorecardHTML;
    }
    
    /**
     * Renders a pie or donut chart
     * @param {Object} dataset - Dataset object
     * @param {string} xColumn - X column name (categories)
     * @param {string} yColumn - Y column name (values)
     * @param {string} chartType - 'pie' or 'donut'
     * @param {Array} preAggregatedData - Pre-aggregated data in row format (optional)
     * @param {string} aggregation - Aggregation function used (for display)
     */
    renderPieChart(dataset, xColumn, yColumn, chartType, preAggregatedData = null, aggregation = 'SUM') {
        let pieData;
        
        if (preAggregatedData && preAggregatedData.length > 0) {
            // Data is in row format from applyAggregation conversion
            // Each row has {[xColumn]: category, [yColumn]: aggregatedValue}
            const aggregated = {};
            preAggregatedData.forEach(row => {
                const category = String(row[xColumn] || 'Unknown');
                const value = parseFloat(row[yColumn]) || 0;
                if (!aggregated[category]) {
                    aggregated[category] = 0;
                }
                aggregated[category] += value;
            });
            
            pieData = Object.entries(aggregated).map(([name, value]) => ({
                name: name,
                y: value
            }));
        } else {
            // Fallback: aggregate from raw data (shouldn't happen with new flow)
            const data = this.getDatasetData(dataset);
            if (!data || data.length === 0) return;
            
            const aggregated = {};
            data.forEach(row => {
                const category = String(row[xColumn] || 'Unknown');
                const value = parseFloat(row[yColumn]) || 0;
                if (!aggregated[category]) {
                    aggregated[category] = 0;
                }
                aggregated[category] += value;
            });
            
            pieData = Object.entries(aggregated).map(([name, value]) => ({
                name: name,
                y: value
            }));
        }
        
        if (pieData.length === 0) return;
        
        if (pieData.length === 0) return;
        
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        const stylingOptions = this.getStylingOptions();
        const title = stylingOptions.title || `${this.formatColumnName(yColumn)} by ${this.formatColumnName(xColumn)}`;
        
        const isDonut = chartType === 'donut';
        
        // Always use 'pie' as the chart type - donut is just a pie with innerSize
        const chartConfig = {
            chart: {
                type: 'pie',  // Always use 'pie' type (donut is just pie with innerSize)
                height: 400
            },
            accessibility: {
                enabled: false
            },
            title: {
                text: title
            },
            tooltip: {
                pointFormat: '<b>{point.percentage:.1f}%</b><br/>Value: {point.y}'
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                    },
                    innerSize: isDonut ? '50%' : '0%',  // Donut has inner hole, pie doesn't
                    showInLegend: true
                }
            },
            series: [{
                name: aggregation ? `${aggregation}(${this.formatColumnName(yColumn)})` : this.formatColumnName(yColumn),
                colorByPoint: true,
                data: pieData
            }]
        };
        
        // Apply custom color if specified (only for pie, not donut)
        if (stylingOptions.color && !isDonut) {
            chartConfig.series[0].colors = [stylingOptions.color];
        }
        
        try {
            // Wait for DOM to be ready before rendering
            requestAnimationFrame(() => {
                try {
                    const container = document.getElementById(chartId);
                    if (!container) {
                        throw new Error('Chart container not found');
                    }
                    
                    // Use Highcharts.chart() with explicit pie type
                    // Donut is just a pie chart with innerSize set
                    Highcharts.chart(chartId, chartConfig);
                } catch (error) {
                    console.error('Error rendering pie/donut chart:', error);
                    const errorContainer = document.getElementById(chartId);
                    if (errorContainer) {
                        errorContainer.innerHTML = `
                            <div class="chart-placeholder">
                                <p class="error">Error rendering ${isDonut ? 'donut' : 'pie'} chart: ${error.message}</p>
                            </div>
                        `;
                    }
                }
            });
        } catch (error) {
            console.error('Error setting up pie/donut chart:', error);
            chartContainer.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">Error rendering ${isDonut ? 'donut' : 'pie'} chart: ${error.message}</p>
                </div>
            `;
        }
    }
    
    /**
     * Renders a scatter plot with optional Z axis (bubble size)
     * @param {Object} dataset - Dataset object
     * @param {string} xColumn - X column name
     * @param {string} yColumn - Y column name
     * @param {string} zColumn - Z column name (optional, for bubble size)
     */
    renderScatterChart(dataset, xColumn, yColumn, zColumn = null) {
        const data = this.getDatasetData(dataset);
        if (!data || data.length === 0) return;
        
        // Prepare scatter data
        const scatterData = data
            .map(row => {
                const x = parseFloat(row[xColumn]);
                const y = parseFloat(row[yColumn]);
                const z = zColumn ? parseFloat(row[zColumn]) : null;
                
                if (isNaN(x) || isNaN(y)) {
                    return null;
                }
                
                return {
                    x: x,
                    y: y,
                    z: z && !isNaN(z) ? z : null
                };
            })
            .filter(point => point !== null);
        
        if (scatterData.length === 0) return;
        
        const chartId = `chart_${Date.now()}`;
        const chartContainer = document.createElement('div');
        chartContainer.id = chartId;
        chartContainer.className = 'chart-wrapper';
        
        const chartsContainer = this.container.querySelector('#charts-container');
        chartsContainer.appendChild(chartContainer);
        
        const stylingOptions = this.getStylingOptions();
        const title = stylingOptions.title || `${this.formatColumnName(yColumn)} vs ${this.formatColumnName(xColumn)}`;
        
        const chartConfig = {
            chart: {
                type: 'scatter',
                renderTo: chartId,
                height: 400
            },
            accessibility: {
                enabled: false
            },
            title: {
                text: title
            },
            xAxis: {
                title: {
                    text: stylingOptions.xLabel || this.formatColumnName(xColumn)
                },
                type: 'linear'
            },
            yAxis: {
                title: {
                    text: stylingOptions.yLabel || this.formatColumnName(yColumn)
                }
            },
            tooltip: {
                pointFormat: `X: {point.x}<br/>Y: {point.y}${zColumn ? '<br/>Size: {point.z}' : ''}`
            },
            series: [{
                name: `${this.formatColumnName(yColumn)} vs ${this.formatColumnName(xColumn)}`,
                color: stylingOptions.color || '#007bff',
                data: scatterData.map(point => zColumn && point.z !== null 
                    ? [point.x, point.y, point.z] 
                    : [point.x, point.y]
                ),
                marker: {
                    radius: zColumn ? 5 : 4
                }
            }]
        };
        
        // If Z axis is provided, use bubble chart
        if (zColumn) {
            chartConfig.chart.type = 'bubble';
            chartConfig.plotOptions = {
                bubble: {
                    minSize: 5,
                    maxSize: 50
                }
            };
        }
        
        try {
            requestAnimationFrame(() => {
                try {
                    Highcharts.chart(chartId, chartConfig);
                } catch (error) {
                    console.error('Error rendering scatter chart:', error);
                    chartContainer.innerHTML = `
                        <div class="chart-placeholder">
                            <p class="error">Error rendering scatter chart: ${error.message}</p>
                        </div>
                    `;
                }
            });
        } catch (error) {
            console.error('Error setting up scatter chart:', error);
            chartContainer.innerHTML = `
                <div class="chart-placeholder">
                    <p class="error">Error rendering scatter chart: ${error.message}</p>
                </div>
            `;
        }
    }
    
    /**
     * Formats a numeric value for display
     * @param {*} value - Value to format
     * @returns {string} Formatted value
     */
    formatNumericValue(value) {
        if (value === null || value === undefined || value === 'N/A') {
            return 'N/A';
        }
        
        const num = parseFloat(value);
        if (isNaN(num)) {
            return String(value);
        }
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        } else if (num % 1 === 0) {
            return num.toLocaleString();
        } else {
            return num.toFixed(2);
        }
    }
    
    /**
     * Saves the current visualization
     */
    previewVisualization() {
        // Render the chart in preview mode (temporary, not saved)
        this.autoRender();
    }
    
    async saveVisualization() {
        const chartTypeSelect = this.container.querySelector('#chart-type-select');
        const chartType = chartTypeSelect ? chartTypeSelect.value : '';
        
        if (!chartType) {
            await Modal.alert('Please select a chart type first.');
            return;
        }
        
        // Check if we have at least one chart rendered
        if (this.charts.length === 0) {
            await Modal.alert('Please create a visualization first.');
            return;
        }
        
        // Get chart title from styling options to use as default name
        const stylingOptions = this.getStylingOptions();
        const chartTitle = stylingOptions.title;
        
        // Use chart title as default, or fall back to auto-generated name
        const defaultName = chartTitle && chartTitle.trim() 
            ? chartTitle.trim() 
            : `Visualization ${new Date().toLocaleString()}`;
        
        // Get visualization name
        const visualizationName = await Modal.prompt('Enter a name for this visualization:', defaultName);
        
        if (!visualizationName || !visualizationName.trim()) {
            return; // User cancelled
        }
        
        try {
            // Get dataset ID from current selections
            let datasetId = null;
            if (this.xAxisSelection) {
                datasetId = this.xAxisSelection.datasetId;
            } else if (this.yAxisSelection) {
                datasetId = this.yAxisSelection.datasetId;
            } else if (this.tableFields && this.tableFields.length > 0) {
                datasetId = this.tableFields[0].datasetId;
            } else if (this.currentDataset) {
                datasetId = this.currentDataset.id;
            }
            
            // Build visualization config
            const config = {
                chartType,
                xAxis: this.xAxisSelection ? { ...this.xAxisSelection } : null,
                yAxis: this.yAxisSelection ? { ...this.yAxisSelection } : null,
                zAxis: this.zAxisSelection ? { ...this.zAxisSelection } : null,
                tableFields: this.tableFields ? this.tableFields.map(f => f ? { ...f } : null) : [],
                styling: this.getStylingOptions()
            };
            
            // Save visualization
            const visualization = visualizationsStore.create(
                visualizationName.trim(),
                chartType,
                config,
                datasetId
            );
            
            await Modal.alert(`Visualization "${visualizationName}" saved successfully!`);
            
            // Emit event if listeners exist
            if (this.onVisualizationSaved) {
                this.onVisualizationSaved(visualization);
            }
        } catch (error) {
            console.error('Error saving visualization:', error);
            await Modal.alert(`Error saving visualization: ${error.message || 'Unknown error'}`);
        }
    }
}


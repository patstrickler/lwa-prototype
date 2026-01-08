// Calculations Panel Component
// Displays available calculations/metrics for the selected dataset

import { metricsStore } from '../data/metrics.js';
import { datasetStore } from '../data/datasets.js';
import { Modal } from '../utils/modal.js';
import { formatMetricValue } from '../utils/metric-formatter.js';
import { datasetSelectionManager } from '../utils/dataset-selection-manager.js';

export class CalculationsPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentDataset = null;
        this.onEditMetricCallbacks = [];
        this.onMetricDeletedCallbacks = [];
        this.init();
    }
    
    init() {
        // Check if there's a globally selected dataset on initialization
        const selectedDatasetId = datasetSelectionManager.getSelectedDatasetId();
        if (selectedDatasetId) {
            const dataset = datasetStore.get(selectedDatasetId);
            if (dataset) {
                this.currentDataset = dataset;
            }
        }
        
        this.render();
        this.attachEventListeners();
        // Refresh periodically to catch new metrics
        setInterval(() => this.refresh(), 2000);
    }
    
    render() {
        if (!this.container) {
            console.warn('CalculationsPanel: Container not found');
            return;
        }
        
        const metrics = this.currentDataset ? metricsStore.getByDataset(this.currentDataset.id) : [];
        
        this.container.innerHTML = `
            <div class="calculations-panel">
                ${this.currentDataset ? this.renderCalculations(metrics) : this.renderEmptyState()}
            </div>
        `;
        
        // Re-attach event listeners after rendering
        this.attachEventListeners();
    }
    
    renderEmptyState() {
        return `
            <div class="empty-state-small" style="padding: 20px; text-align: center; color: #6c757d;">
                <p style="margin: 0; font-size: 0.9rem;">Select a dataset to view calculations</p>
            </div>
        `;
    }
    
    renderCalculations(metrics) {
        if (!metrics || metrics.length === 0) {
            return `
                <div class="empty-state-small" style="padding: 20px; text-align: center; color: #6c757d;">
                    <p style="margin: 0; font-size: 0.9rem;">No calculations defined</p>
                    <p style="margin: 8px 0 0 0; font-size: 0.8rem; color: #999;">Create calculations in the Analyze panel</p>
                </div>
            `;
        }
        
        return `
            <div class="calculations-list">
                ${metrics.map(metric => `
                    <div class="calculation-item" 
                         data-id="${metric.id}"
                         data-type="metric">
                        <div class="calculation-header">
                            <span class="material-icons calculation-icon" style="font-size: 18px; color: #007bff;">calculate</span>
                            <span class="calculation-name">${this.escapeHtml(metric.name)}</span>
                        </div>
                        <div class="calculation-value">${formatMetricValue(metric.value, metric.displayType, metric.decimalPlaces)}</div>
                        ${metric.expression ? `
                            <div class="calculation-expression" title="${this.escapeHtml(metric.expression)}">
                                ${this.escapeHtml(this.truncateExpression(metric.expression, 40))}
                            </div>
                        ` : ''}
                        <div class="calculation-actions">
                            <button class="btn btn-sm btn-icon edit-calc-btn" title="Edit" data-id="${metric.id}" type="button">
                                <span class="material-icons" style="font-size: 16px; pointer-events: none;">edit</span>
                            </button>
                            <button class="btn btn-sm btn-icon duplicate-calc-btn" title="Duplicate" data-id="${metric.id}" type="button">
                                <span class="material-icons" style="font-size: 16px; pointer-events: none;">content_copy</span>
                            </button>
                            <button class="btn btn-sm btn-icon delete-calc-btn" title="Delete" data-id="${metric.id}" type="button">
                                <span class="material-icons" style="font-size: 16px; pointer-events: none;">delete</span>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    attachEventListeners() {
        if (!this.container) return;
        
        // Remove any existing listeners first to avoid duplicates
        if (this._clickHandler) {
            this.container.removeEventListener('click', this._clickHandler);
        }
        
        // Use event delegation for dynamically added buttons
        const clickHandler = (e) => {
            // Check for delete button first (most specific)
            let deleteBtn = e.target.closest('.delete-calc-btn');
            if (!deleteBtn && e.target.classList.contains('material-icons')) {
                // If clicking on icon, find parent button
                deleteBtn = e.target.closest('.calculation-actions')?.querySelector('.delete-calc-btn');
            }
            
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                const metricId = deleteBtn.getAttribute('data-id');
                if (metricId) {
                    console.log('CalculationsPanel: Delete button clicked for metric:', metricId);
                    this.handleDeleteMetric(metricId);
                } else {
                    console.error('CalculationsPanel: Delete button found but no data-id attribute');
                }
                return;
            }
            
            // Check for edit button
            const editBtn = e.target.closest('.edit-calc-btn');
            if (editBtn) {
                e.preventDefault();
                e.stopPropagation();
                const metricId = editBtn.getAttribute('data-id');
                if (metricId) {
                    this.notifyEditMetric(metricId, false);
                }
                return;
            }
            
            // Check for duplicate button
            const duplicateBtn = e.target.closest('.duplicate-calc-btn');
            if (duplicateBtn) {
                e.preventDefault();
                e.stopPropagation();
                const metricId = duplicateBtn.getAttribute('data-id');
                if (metricId) {
                    this.notifyEditMetric(metricId, true);
                }
                return;
            }
        };
        
        // Store handler reference for potential cleanup
        this._clickHandler = clickHandler;
        this.container.addEventListener('click', clickHandler, true); // Use capture phase for better event handling
    }
    
    setDataset(dataset) {
        this.currentDataset = dataset;
        this.render();
    }
    
    refresh() {
        this.render();
    }
    
    onEditMetric(callback) {
        this.onEditMetricCallbacks.push(callback);
    }
    
    notifyEditMetric(metricId, isDuplicate = false) {
        this.onEditMetricCallbacks.forEach(callback => callback(metricId, isDuplicate));
    }
    
    async handleDeleteMetric(metricId) {
        if (!metricId) {
            console.error('CalculationsPanel: No metric ID provided for deletion');
            await Modal.alert('Error: No calculation ID provided for deletion.');
            return;
        }
        
        const metric = metricsStore.get(metricId);
        if (!metric) {
            console.warn(`CalculationsPanel: Metric with ID ${metricId} not found`);
            await Modal.alert('Calculation not found. It may have already been deleted.');
            this.render(); // Refresh to update the list
            return;
        }
        
        const metricName = metric.name || 'this calculation';
        try {
            const confirmed = await Modal.confirm(
                `Are you sure you want to delete "${metricName}"? This action cannot be undone.`
            );
            if (confirmed) {
                const deleted = metricsStore.delete(metricId);
                if (deleted) {
                    // Refresh the panel
                    this.render();
                    
                    // Notify callbacks if any
                    if (this.onMetricDeletedCallbacks) {
                        this.onMetricDeletedCallbacks.forEach(callback => callback(metricId));
                    }
                } else {
                    console.error(`CalculationsPanel: Failed to delete metric ${metricId}`);
                    await Modal.alert('Failed to delete calculation. Please try again.');
                }
            }
        } catch (error) {
            console.error('CalculationsPanel: Error deleting metric:', error);
            await Modal.alert(`Error deleting calculation: ${error.message || 'Unknown error'}`);
        }
    }
    
    
    truncateExpression(expression, maxLength) {
        if (!expression) return '';
        if (expression.length <= maxLength) return expression;
        return expression.substring(0, maxLength) + '...';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


// Calculations Panel Component
// Displays available calculations/metrics for the selected dataset

import { metricsStore } from '../data/metrics.js';
import { datasetStore } from '../data/datasets.js';
import { Modal } from '../utils/modal.js';

export class CalculationsPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentDataset = null;
        this.onEditMetricCallbacks = [];
        this.init();
    }
    
    init() {
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
                        <div class="calculation-value">${this.formatMetricValue(metric.value)}</div>
                        ${metric.expression ? `
                            <div class="calculation-expression" title="${this.escapeHtml(metric.expression)}">
                                ${this.escapeHtml(this.truncateExpression(metric.expression, 40))}
                            </div>
                        ` : ''}
                        <div class="calculation-actions">
                            <button class="btn btn-sm btn-icon edit-calc-btn" title="Edit" data-id="${metric.id}">
                                <span class="material-icons" style="font-size: 16px;">edit</span>
                            </button>
                            <button class="btn btn-sm btn-icon duplicate-calc-btn" title="Duplicate" data-id="${metric.id}">
                                <span class="material-icons" style="font-size: 16px;">content_copy</span>
                            </button>
                            <button class="btn btn-sm btn-icon delete-calc-btn" title="Delete" data-id="${metric.id}">
                                <span class="material-icons" style="font-size: 16px;">delete</span>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    attachEventListeners() {
        if (!this.container) return;
        
        // Use event delegation for dynamically added buttons
        this.container.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-calc-btn');
            if (editBtn) {
                const metricId = editBtn.getAttribute('data-id');
                this.notifyEditMetric(metricId, false);
                e.stopPropagation();
                return;
            }
            
            const duplicateBtn = e.target.closest('.duplicate-calc-btn');
            if (duplicateBtn) {
                const metricId = duplicateBtn.getAttribute('data-id');
                this.notifyEditMetric(metricId, true);
                e.stopPropagation();
                return;
            }
            
            const deleteBtn = e.target.closest('.delete-calc-btn');
            if (deleteBtn) {
                const metricId = deleteBtn.getAttribute('data-id');
                this.handleDeleteMetric(metricId);
                e.stopPropagation();
                return;
            }
        });
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
        const metric = metricsStore.get(metricId);
        if (!metric) {
            return;
        }
        
        const metricName = metric.name || 'this calculation';
        const confirmed = await Modal.confirm(
            `Are you sure you want to delete "${metricName}"? This action cannot be undone.`
        );
        if (confirmed) {
            const deleted = metricsStore.delete(metricId);
            if (deleted) {
                this.render();
            }
        }
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


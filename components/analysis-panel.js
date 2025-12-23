// Analysis Panel Component
// Metrics & scripts on datasets

import { UnifiedAnalysisBuilder } from './unified-analysis-builder.js';
import { metricsStore } from '../data/metrics.js';
import { datasetStore } from '../data/datasets.js';
import { metricExecutionEngine } from '../utils/metric-execution-engine.js';
import { scriptsStore } from '../data/scripts.js';
import { executeSQL } from '../utils/sql-engine.js';

export class AnalysisPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentDataset = null;
        this.metricsCallbacks = [];
        this.datasetCallbacks = [];
        this.unifiedBuilder = null;
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.initDatasetSelector();
        this.initUnifiedBuilder();
        this.updateScriptsList();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="analysis-panel">
                <div id="unified-analysis-builder-container"></div>
            </div>
        `;
    }
    
    initDatasetSelector() {
        // Dataset selector is now handled by the sidebar component
        // This method is kept for compatibility but does nothing
    }
    
    initMetricDialog() {
        // Replaced by unified builder
    }
    
    initScriptPanel() {
        // Replaced by unified builder
    }
    
    initUnifiedBuilder() {
        this.unifiedBuilder = new UnifiedAnalysisBuilder('#unified-analysis-builder-container');
        this.unifiedBuilder.onMetricCreated((metric) => {
            // Refresh dataset browser to show new metric
            this.notifyMetricsUpdated([metric]);
        });
        this.unifiedBuilder.onScriptSaved(() => {
            // Scripts are displayed in side panel, no action needed
        });
    }
    
    attachEventListeners() {
        // Event listeners are handled by unified builder
        // Note: refresh metrics button was removed, but if it exists, handle it
        const refreshBtn = this.container.querySelector('#refresh-metrics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.reExecuteMetrics());
        }
    }
    
    setDataset(dataset) {
        // Check if dataset exists
        if (dataset && !datasetStore.exists(dataset.id)) {
            this.showDatasetMissingError(dataset);
            this.currentDataset = null;
            if (this.datasetSelector) {
                this.datasetSelector.setSelectedDataset(null);
            }
            if (this.unifiedBuilder) {
                this.unifiedBuilder.setDataset(null);
            }
            this.updateMetricsList();
            this.notifyDatasetUpdated(null);
            return;
        }
        
        this.currentDataset = dataset;
        if (this.datasetSelector) {
            this.datasetSelector.setSelectedDataset(dataset);
        }
        // Update unified builder with current dataset
        if (this.unifiedBuilder) {
            this.unifiedBuilder.setDataset(dataset);
        }
        // Re-execute metrics when dataset changes to ensure values are up-to-date
        // Debounce to prevent jitter from rapid dataset changes
        if (this._reExecuteTimeout) {
            clearTimeout(this._reExecuteTimeout);
        }
        
        if (dataset) {
            // Small delay to batch updates
            this._reExecuteTimeout = setTimeout(() => {
                requestAnimationFrame(() => {
                    this.reExecuteMetrics();
                });
            }, 100);
        } else {
            requestAnimationFrame(() => {
                this.updateMetricsList();
            });
        }
        this.notifyDatasetUpdated(dataset);
    }
    
    showDatasetMissingError(dataset) {
        const datasetSelector = this.container.querySelector('#dataset-selector-container');
        if (datasetSelector) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'dataset-missing-error';
            errorDiv.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">
                        <strong>Dataset "${dataset.name}" is missing or has been deleted.</strong>
                        <p>This dataset is no longer available. Please select a different dataset.</p>
                    </div>
                </div>
            `;
            datasetSelector.innerHTML = '';
            datasetSelector.appendChild(errorDiv);
        }
    }
    
    /**
     * Re-executes all metrics for the current dataset
     * Updates metric values using the execution engine
     */
    async reExecuteMetrics() {
        if (!this.currentDataset) {
            return;
        }
        
        // Check if dataset still exists
        if (!datasetStore.exists(this.currentDataset.id)) {
            this.showDatasetMissingError(this.currentDataset);
            this.currentDataset = null;
            this.updateMetricsList();
            return;
        }
        
        const metrics = metricsStore.getByDataset(this.currentDataset.id);
        if (metrics.length === 0) {
            this.updateMetricsList();
            return;
        }
        
        // Get fresh dataset data
        const storedDataset = datasetStore.get(this.currentDataset.id);
        if (!storedDataset) {
            console.error('Dataset not found for re-execution');
            this.updateMetricsList();
            return;
        }
        
        // Get full dataset (re-execute SQL without LIMIT if available)
        const fullDataset = await this.getFullDataset(storedDataset);
        
        // Re-execute each metric
        const updatedMetrics = [];
        metrics.forEach(metric => {
            try {
                // Check if dataset is empty
                if (!fullDataset.rows || fullDataset.rows.length === 0) {
                    throw new Error('Dataset is empty. Cannot calculate metrics on an empty dataset.');
                }
                
                // Check if dataset has columns
                if (!fullDataset.columns || fullDataset.columns.length === 0) {
                    throw new Error('Dataset has no columns. Cannot calculate metrics.');
                }
                
                const newValue = metricExecutionEngine.executeMetric(metric, fullDataset);
                const updated = metricsStore.updateValue(metric.id, newValue);
                if (updated) {
                    updatedMetrics.push(updated);
                }
            } catch (error) {
                console.error(`Error re-executing metric ${metric.id}:`, error);
                // Update with null value to indicate error
                metricsStore.updateValue(metric.id, null);
                // Store error message for display
                if (metric) {
                    metric._error = error.message || 'Error calculating metric';
                }
            }
        });
        
        // Update display and notify
        this.updateMetricsList();
        if (updatedMetrics.length > 0) {
            this.notifyMetricsUpdated(updatedMetrics);
        }
    }
    
    refreshDatasetSelector() {
        if (this.datasetSelector) {
            this.datasetSelector.refresh();
        }
    }
    
    updateMetricsList() {
        // Metrics are now displayed in the side panel (dataset browser)
        // This method is kept for compatibility but does nothing
    }
    
    formatColumnName(column) {
        return column
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }
    
    formatValue(value) {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        if (typeof value === 'number') {
            return value.toLocaleString('en-US', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 4 
            });
        }
        return String(value);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showAddMetricDialog() {
        // Handled by unified builder now
    }
    
    updateScriptsList() {
        // Scripts are now displayed in the side panel (dataset browser)
        // This method is kept for compatibility but does nothing
    }
    
    formatScriptResult(result) {
        if (!result) return 'N/A';
        
        switch (result.type) {
            case 'scalar':
                return typeof result.value === 'number' 
                    ? result.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
                    : String(result.value);
            case 'series':
                return `[${result.value.length} values]`;
            case 'image':
                return 'Chart/Plot';
            default:
                return 'Unknown';
        }
    }
    
    onMetricsUpdated(callback) {
        this.metricsCallbacks.push(callback);
    }
    
    onDatasetUpdated(callback) {
        this.datasetCallbacks.push(callback);
    }
    
    notifyMetricsUpdated(metrics) {
        this.metricsCallbacks.forEach(callback => callback(metrics));
    }
    
    notifyDatasetUpdated(dataset) {
        this.datasetCallbacks.forEach(callback => callback(dataset));
    }
    
    /**
     * Gets the full dataset by re-executing SQL without LIMIT if available
     * @param {Object} dataset - Dataset object (may have limited rows)
     * @returns {Promise<Object>} Dataset with all rows
     */
    async getFullDataset(dataset) {
        if (!dataset) {
            return dataset;
        }
        
        // If dataset has SQL query, re-execute it without LIMIT to get all rows
        if (dataset.sql && dataset.sql.trim()) {
            try {
                // Remove any existing LIMIT clause
                let sqlWithoutLimit = dataset.sql
                    .replace(/;\s*$/, '') // Remove trailing semicolon
                    .replace(/\s+limit\s+\d+/gi, '') // Remove LIMIT clause
                    .trim();
                
                // Re-execute query without LIMIT to get all rows
                // Use a large number for the mock engine's row generation
                const sqlResult = await executeSQL(sqlWithoutLimit, 10000);
                
                if (sqlResult && sqlResult.rows && sqlResult.rows.length > 0) {
                    // Return dataset with all rows
                    return {
                        ...dataset,
                        rows: sqlResult.rows,
                        columns: sqlResult.columns || dataset.columns
                    };
                }
            } catch (error) {
                console.warn('Could not re-execute SQL for full dataset, using stored dataset:', error);
                // Fall through to return original dataset
            }
        }
        
        // Return original dataset if no SQL or re-execution failed
        return dataset;
    }
}


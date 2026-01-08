// Metrics storage with localStorage persistence
// This will store computed metrics for datasets

const STORAGE_KEY = 'lwa_metrics';
const NEXT_ID_KEY = 'lwa_metrics_nextId';

class MetricsStore {
    constructor() {
        this.metrics = new Map();
        this.nextId = 1;
        this.loadFromStorage();
    }
    
    /**
     * Loads metrics from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const storedNextId = localStorage.getItem(NEXT_ID_KEY);
            
            if (stored) {
                const metrics = JSON.parse(stored);
                metrics.forEach(metric => {
                    this.metrics.set(metric.id, metric);
                });
            }
            
            if (storedNextId) {
                this.nextId = parseInt(storedNextId, 10);
            }
        } catch (error) {
            console.error('Error loading metrics from localStorage:', error);
        }
    }
    
    /**
     * Saves metrics to localStorage
     */
    saveToStorage() {
        try {
            const metrics = Array.from(this.metrics.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
            localStorage.setItem(NEXT_ID_KEY, String(this.nextId));
        } catch (error) {
            console.error('Error saving metrics to localStorage:', error);
            // If storage quota exceeded, try to clear and retry
            if (error.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded, attempting to clear old data...');
            }
        }
    }
    
    create(datasetId, name, value, type, column = null, operation = null, expression = null, displayType = 'numeric', decimalPlaces = 2) {
        const id = `metric_${this.nextId++}`;
        const metric = {
            id,
            datasetId,
            name,
            value,
            type,
            column,
            operation,
            expression,
            displayType: displayType || 'numeric',
            decimalPlaces: decimalPlaces !== undefined && decimalPlaces !== null ? decimalPlaces : 2,
            createdAt: new Date().toISOString()
        };
        this.metrics.set(id, metric);
        this.saveToStorage();
        return metric;
    }
    
    /**
     * Updates a metric's formatting options
     * @param {string} id - Metric ID
     * @param {string} displayType - Display type: 'numeric', 'currency', or 'percentage'
     * @param {number} decimalPlaces - Number of decimal places (0-10)
     * @returns {Object|null} Updated metric or null if not found
     */
    updateFormatting(id, displayType, decimalPlaces) {
        const metric = this.metrics.get(id);
        if (!metric) {
            return null;
        }
        
        metric.displayType = displayType || 'numeric';
        metric.decimalPlaces = decimalPlaces !== undefined && decimalPlaces !== null ? decimalPlaces : 2;
        
        this.saveToStorage();
        return metric;
    }
    
    /**
     * Updates an existing metric
     * @param {string} id - Metric ID
     * @param {Object} updates - Object with fields to update (name, value, expression, displayType, decimalPlaces, etc.)
     * @returns {Object|null} Updated metric or null if not found
     */
    update(id, updates) {
        const metric = this.metrics.get(id);
        if (!metric) {
            return null;
        }
        
        // Update provided fields
        if (updates.name !== undefined) metric.name = updates.name;
        if (updates.value !== undefined) metric.value = updates.value;
        if (updates.expression !== undefined) metric.expression = updates.expression;
        if (updates.displayType !== undefined) metric.displayType = updates.displayType || 'numeric';
        if (updates.decimalPlaces !== undefined) metric.decimalPlaces = updates.decimalPlaces !== null ? updates.decimalPlaces : 2;
        if (updates.column !== undefined) metric.column = updates.column;
        if (updates.operation !== undefined) metric.operation = updates.operation;
        
        this.saveToStorage();
        return metric;
    }
    
    get(id) {
        return this.metrics.get(id);
    }
    
    getByDataset(datasetId) {
        return Array.from(this.metrics.values())
            .filter(metric => metric.datasetId === datasetId);
    }
    
    getAll() {
        return Array.from(this.metrics.values());
    }
    
    /**
     * Updates a metric's value (e.g., after re-execution)
     * @param {string} id - Metric ID
     * @param {number|null} value - New metric value
     * @param {string} [executedAt] - Optional execution timestamp
     * @returns {Object|null} Updated metric or null if not found
     */
    updateValue(id, value, executedAt = null) {
        const metric = this.metrics.get(id);
        if (!metric) {
            return null;
        }
        
        metric.value = value;
        if (executedAt) {
            metric.executedAt = executedAt;
        } else {
            metric.executedAt = new Date().toISOString();
        }
        
        this.saveToStorage();
        return metric;
    }
    
    delete(id) {
        const deleted = this.metrics.delete(id);
        if (deleted) {
            this.saveToStorage();
        }
        return deleted;
    }
}

export const metricsStore = new MetricsStore();

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
    
    create(datasetId, name, value, type, column = null, operation = null) {
        const id = `metric_${this.nextId++}`;
        const metric = {
            id,
            datasetId,
            name,
            value,
            type,
            column,
            operation,
            createdAt: new Date().toISOString()
        };
        this.metrics.set(id, metric);
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
    
    delete(id) {
        const deleted = this.metrics.delete(id);
        if (deleted) {
            this.saveToStorage();
        }
        return deleted;
    }
}

export const metricsStore = new MetricsStore();

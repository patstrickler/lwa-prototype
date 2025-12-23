// Mock metrics storage (in-memory)
// This will store computed metrics for datasets

class MetricsStore {
    constructor() {
        this.metrics = new Map();
        this.nextId = 1;
    }
    
    create(datasetId, name, value, type) {
        const id = `metric_${this.nextId++}`;
        const metric = {
            id,
            datasetId,
            name,
            value,
            type,
            createdAt: new Date().toISOString()
        };
        this.metrics.set(id, metric);
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
        return this.metrics.delete(id);
    }
}

export const metricsStore = new MetricsStore();


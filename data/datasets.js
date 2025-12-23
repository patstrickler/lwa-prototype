// Mock datasets storage (in-memory)
// This will store datasets created from SQL queries

class DatasetStore {
    constructor() {
        this.datasets = new Map();
        this.nextId = 1;
    }
    
    create(name, data, columns) {
        const id = `dataset_${this.nextId++}`;
        const dataset = {
            id,
            name,
            data,
            columns,
            createdAt: new Date().toISOString()
        };
        this.datasets.set(id, dataset);
        return dataset;
    }
    
    get(id) {
        return this.datasets.get(id);
    }
    
    getAll() {
        return Array.from(this.datasets.values());
    }
    
    delete(id) {
        return this.datasets.delete(id);
    }
}

export const datasetStore = new DatasetStore();


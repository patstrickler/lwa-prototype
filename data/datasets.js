// Mock datasets storage (in-memory)
// This will store datasets created from SQL queries

class DatasetStore {
    constructor() {
        this.datasets = new Map();
        this.nextId = 1;
    }
    
    /**
     * Creates a new dataset
     * @param {string} name - Dataset name
     * @param {string} sql - SQL query string
     * @param {string[]} columns - Column names
     * @param {any[][]} rows - Array of row arrays
     * @returns {Object} Dataset object
     */
    create(name, sql, columns, rows) {
        const id = `ds_${this.nextId++}`;
        const dataset = {
            id,
            name,
            sql,
            columns,
            rows,
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


// Datasets storage with localStorage persistence
// This will store datasets created from SQL queries

const STORAGE_KEY = 'lwa_datasets';
const NEXT_ID_KEY = 'lwa_datasets_nextId';

class DatasetStore {
    constructor() {
        this.datasets = new Map();
        this.nextId = 1;
        this.loadFromStorage();
    }
    
    /**
     * Loads datasets from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const storedNextId = localStorage.getItem(NEXT_ID_KEY);
            
            if (stored) {
                const datasets = JSON.parse(stored);
                datasets.forEach(dataset => {
                    this.datasets.set(dataset.id, dataset);
                });
            }
            
            if (storedNextId) {
                this.nextId = parseInt(storedNextId, 10);
            }
        } catch (error) {
            console.error('Error loading datasets from localStorage:', error);
        }
    }
    
    /**
     * Saves datasets to localStorage
     */
    saveToStorage() {
        try {
            const datasets = Array.from(this.datasets.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets));
            localStorage.setItem(NEXT_ID_KEY, String(this.nextId));
        } catch (error) {
            console.error('Error saving datasets to localStorage:', error);
            // If storage quota exceeded, try to clear and retry
            if (error.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded, attempting to clear old data...');
            }
        }
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
        this.saveToStorage();
        return dataset;
    }
    
    get(id) {
        return this.datasets.get(id);
    }
    
    getAll() {
        return Array.from(this.datasets.values());
    }
    
    delete(id) {
        const deleted = this.datasets.delete(id);
        if (deleted) {
            this.saveToStorage();
        }
        return deleted;
    }
}

export const datasetStore = new DatasetStore();


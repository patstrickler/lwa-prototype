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
        // Validate inputs
        if (!name || typeof name !== 'string' || !name.trim()) {
            throw new Error('Dataset name is required');
        }
        
        if (!Array.isArray(columns)) {
            throw new Error('Columns must be an array');
        }
        
        if (!Array.isArray(rows)) {
            throw new Error('Rows must be an array');
        }
        
        // Ensure sql is a string (can be empty for non-SQL datasets)
        const sqlString = sql || '';
        
        const id = `ds_${this.nextId++}`;
        const dataset = {
            id,
            name: name.trim(),
            sql: sqlString,
            columns: [...columns], // Create a copy to avoid reference issues
            rows: rows.map(row => Array.isArray(row) ? [...row] : []), // Create copies of rows
            createdAt: new Date().toISOString()
        };
        
        try {
            this.datasets.set(id, dataset);
            this.saveToStorage();
        } catch (error) {
            console.error('Error creating dataset:', error);
            // Remove from map if storage failed
            this.datasets.delete(id);
            throw new Error(`Failed to save dataset: ${error.message || 'Storage error'}`);
        }
        
        return dataset;
    }
    
    get(id) {
        return this.datasets.get(id);
    }
    
    getAll() {
        return Array.from(this.datasets.values());
    }
    
    /**
     * Updates an existing dataset
     * @param {string} id - Dataset ID
     * @param {Object} updates - Fields to update (name, sql, columns, rows)
     * @returns {Object|null} Updated dataset or null if not found
     */
    update(id, updates) {
        const dataset = this.datasets.get(id);
        if (!dataset) {
            return null;
        }
        
        // Update fields
        if (updates.name !== undefined) {
            dataset.name = updates.name;
        }
        if (updates.sql !== undefined) {
            dataset.sql = updates.sql;
        }
        if (updates.columns !== undefined) {
            dataset.columns = updates.columns;
        }
        if (updates.rows !== undefined) {
            dataset.rows = updates.rows;
        }
        
        // Update timestamp
        dataset.updatedAt = new Date().toISOString();
        
        this.datasets.set(id, dataset);
        this.saveToStorage();
        return dataset;
    }
    
    /**
     * Checks if a dataset exists
     * @param {string} id - Dataset ID
     * @returns {boolean}
     */
    exists(id) {
        return this.datasets.has(id);
    }
    
    delete(id) {
        const dataset = this.datasets.get(id);
        const deleted = this.datasets.delete(id);
        if (deleted) {
            this.saveToStorage();
            // Return dataset info for cleanup
            return { deleted: true, dataset };
        }
        return { deleted: false, dataset: null };
    }
}

export const datasetStore = new DatasetStore();


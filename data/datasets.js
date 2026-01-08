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
            const dataSize = JSON.stringify(datasets).length;
            
            console.log('[DatasetStore.saveToStorage] Saving to localStorage', {
                datasetCount: datasets.length,
                dataSize: `${(dataSize / 1024).toFixed(2)} KB`,
                nextId: this.nextId
            });
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets));
            localStorage.setItem(NEXT_ID_KEY, String(this.nextId));
        } catch (error) {
            console.error('[DatasetStore.saveToStorage] Error saving datasets to localStorage:', {
                error: error.message,
                errorName: error.name,
                stack: error.stack,
                datasetCount: this.datasets.size,
                timestamp: new Date().toISOString()
            });
            // If storage quota exceeded, try to clear and retry
            if (error.name === 'QuotaExceededError') {
                console.warn('[DatasetStore.saveToStorage] localStorage quota exceeded, attempting to clear old data...');
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
        console.log('[DatasetStore.create] Creating new dataset', {
            name: name?.substring(0, 50),
            columnsCount: columns?.length || 0,
            rowsCount: rows?.length || 0,
            sqlLength: sql?.length || 0
        });
        
        // Validate inputs
        if (!name || typeof name !== 'string' || !name.trim()) {
            console.error('[DatasetStore.create] Validation failed: name is required');
            throw new Error('Dataset name is required');
        }
        
        if (!Array.isArray(columns)) {
            console.error('[DatasetStore.create] Validation failed: columns must be an array', {
                columnsType: typeof columns,
                columnsValue: columns
            });
            throw new Error('Columns must be an array');
        }
        
        if (!Array.isArray(rows)) {
            console.error('[DatasetStore.create] Validation failed: rows must be an array', {
                rowsType: typeof rows,
                rowsValue: rows
            });
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
            console.log('[DatasetStore.create] Dataset created successfully', {
                id,
                name: dataset.name,
                columnsCount: dataset.columns.length,
                rowsCount: dataset.rows.length
            });
        } catch (error) {
            console.error('[DatasetStore.create] Error creating dataset:', {
                error: error.message,
                stack: error.stack,
                id,
                name: dataset.name,
                errorName: error.name,
                timestamp: new Date().toISOString()
            });
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
        console.log('[DatasetStore.update] Updating dataset', {
            id,
            updateFields: Object.keys(updates || {})
        });
        
        const dataset = this.datasets.get(id);
        if (!dataset) {
            console.error('[DatasetStore.update] Dataset not found', { id });
            return null;
        }
        
        try {
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
            if (updates.accessControl !== undefined) {
                dataset.accessControl = updates.accessControl;
            }
            
            // Update timestamp
            dataset.updatedAt = new Date().toISOString();
            
            this.datasets.set(id, dataset);
            this.saveToStorage();
            
            console.log('[DatasetStore.update] Dataset updated successfully', {
                id,
                name: dataset.name,
                columnsCount: dataset.columns?.length || 0,
                rowsCount: dataset.rows?.length || 0
            });
            
            return dataset;
        } catch (error) {
            console.error('[DatasetStore.update] Error updating dataset:', {
                error: error.message,
                stack: error.stack,
                id,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    
    /**
     * Duplicates an existing dataset
     * @param {string} id - Dataset ID to duplicate
     * @param {string} newName - Name for the duplicated dataset
     * @returns {Object|null} New dataset or null if not found
     */
    duplicate(id, newName) {
        const original = this.datasets.get(id);
        if (!original) {
            return null;
        }
        
        // Create a deep copy of the dataset
        const duplicated = this.create(
            newName,
            original.sql,
            [...original.columns],
            original.rows.map(row => [...row])
        );
        
        // Copy access control if it exists
        if (original.accessControl) {
            duplicated.accessControl = JSON.parse(JSON.stringify(original.accessControl));
            this.datasets.set(duplicated.id, duplicated);
            this.saveToStorage();
        }
        
        return duplicated;
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
        console.log('[DatasetStore.delete] Attempting to delete dataset', { id });
        
        const dataset = this.datasets.get(id);
        if (!dataset) {
            console.warn('[DatasetStore.delete] Dataset not found', { id });
            return { deleted: false, dataset: null };
        }
        
        try {
            const deleted = this.datasets.delete(id);
            if (deleted) {
                this.saveToStorage();
                console.log('[DatasetStore.delete] Dataset deleted successfully', {
                    id,
                    name: dataset.name
                });
                // Return dataset info for cleanup
                return { deleted: true, dataset };
            }
            console.warn('[DatasetStore.delete] Failed to delete from map', { id });
            return { deleted: false, dataset: null };
        } catch (error) {
            console.error('[DatasetStore.delete] Error deleting dataset:', {
                error: error.message,
                stack: error.stack,
                id,
                timestamp: new Date().toISOString()
            });
            return { deleted: false, dataset: null };
        }
    }
}

export const datasetStore = new DatasetStore();


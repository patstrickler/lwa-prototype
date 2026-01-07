// Visualizations storage with localStorage persistence
// This will store saved visualizations (charts, tables, KPIs)

const STORAGE_KEY = 'lwa_visualizations';
const NEXT_ID_KEY = 'lwa_visualizations_nextId';

class VisualizationsStore {
    constructor() {
        this.visualizations = new Map();
        this.nextId = 1;
        this.loadFromStorage();
    }
    
    /**
     * Loads visualizations from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const storedNextId = localStorage.getItem(NEXT_ID_KEY);
            
            if (stored) {
                const visualizations = JSON.parse(stored);
                visualizations.forEach(viz => {
                    this.visualizations.set(viz.id, viz);
                });
            }
            
            if (storedNextId) {
                this.nextId = parseInt(storedNextId, 10);
            }
        } catch (error) {
            console.error('Error loading visualizations from localStorage:', error);
        }
    }
    
    /**
     * Saves visualizations to localStorage
     */
    saveToStorage() {
        try {
            const visualizations = Array.from(this.visualizations.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(visualizations));
            localStorage.setItem(NEXT_ID_KEY, String(this.nextId));
        } catch (error) {
            console.error('Error saving visualizations to localStorage:', error);
            if (error.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded, attempting to clear old data...');
            }
        }
    }
    
    /**
     * Creates a new visualization
     * @param {string} name - Visualization name
     * @param {string} type - Visualization type (line, bar, pie, table, scorecard, etc.)
     * @param {Object} config - Visualization configuration
     * @param {string} datasetId - Associated dataset ID
     * @returns {Object} Visualization object
     */
    create(name, type, config, datasetId = null) {
        if (!name || typeof name !== 'string' || !name.trim()) {
            throw new Error('Visualization name is required');
        }
        
        if (!type || typeof type !== 'string') {
            throw new Error('Visualization type is required');
        }
        
        const id = `viz_${this.nextId++}`;
        const visualization = {
            id,
            name: name.trim(),
            type,
            config: { ...config }, // Deep copy
            datasetId,
            createdAt: new Date().toISOString()
        };
        
        try {
            this.visualizations.set(id, visualization);
            this.saveToStorage();
        } catch (error) {
            console.error('Error creating visualization:', error);
            this.visualizations.delete(id);
            throw new Error(`Failed to save visualization: ${error.message || 'Storage error'}`);
        }
        
        return visualization;
    }
    
    get(id) {
        return this.visualizations.get(id);
    }
    
    getAll() {
        return Array.from(this.visualizations.values());
    }
    
    /**
     * Gets visualizations by dataset
     * @param {string} datasetId - Dataset ID
     * @returns {Array} Array of visualizations
     */
    getByDataset(datasetId) {
        return Array.from(this.visualizations.values())
            .filter(viz => viz.datasetId === datasetId);
    }
    
    /**
     * Updates a visualization
     * @param {string} id - Visualization ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated visualization or null if not found
     */
    update(id, updates) {
        const visualization = this.visualizations.get(id);
        if (!visualization) {
            return null;
        }
        
        if (updates.name !== undefined) {
            visualization.name = updates.name;
        }
        if (updates.type !== undefined) {
            visualization.type = updates.type;
        }
        if (updates.config !== undefined) {
            visualization.config = { ...visualization.config, ...updates.config };
        }
        if (updates.datasetId !== undefined) {
            visualization.datasetId = updates.datasetId;
        }
        
        visualization.updatedAt = new Date().toISOString();
        
        this.visualizations.set(id, visualization);
        this.saveToStorage();
        return visualization;
    }
    
    exists(id) {
        return this.visualizations.has(id);
    }
    
    delete(id) {
        const visualization = this.visualizations.get(id);
        const deleted = this.visualizations.delete(id);
        if (deleted) {
            this.saveToStorage();
            return { deleted: true, visualization };
        }
        return { deleted: false, visualization: null };
    }
}

export const visualizationsStore = new VisualizationsStore();


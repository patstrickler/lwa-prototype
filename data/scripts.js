// Scripts storage with localStorage persistence
// This will store analysis scripts that can be applied to datasets

const STORAGE_KEY = 'lwa_scripts';
const NEXT_ID_KEY = 'lwa_scripts_nextId';

class ScriptsStore {
    constructor() {
        this.scripts = new Map();
        this.nextId = 1;
        this.loadFromStorage();
    }
    
    /**
     * Loads scripts from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const storedNextId = localStorage.getItem(NEXT_ID_KEY);
            
            if (stored) {
                const scripts = JSON.parse(stored);
                scripts.forEach(script => {
                    this.scripts.set(script.id, script);
                });
            }
            
            if (storedNextId) {
                this.nextId = parseInt(storedNextId, 10);
            }
        } catch (error) {
            console.error('Error loading scripts from localStorage:', error);
        }
    }
    
    /**
     * Saves scripts to localStorage
     */
    saveToStorage() {
        try {
            const scripts = Array.from(this.scripts.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
            localStorage.setItem(NEXT_ID_KEY, String(this.nextId));
        } catch (error) {
            console.error('Error saving scripts to localStorage:', error);
            // If storage quota exceeded, try to clear and retry
            if (error.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded, attempting to clear old data...');
            }
        }
    }
    
    create(name, code, language, description = '', result = null) {
        const id = `script_${this.nextId++}`;
        const script = {
            id,
            name,
            code,
            language,
            description,
            result,
            createdAt: new Date().toISOString()
        };
        this.scripts.set(id, script);
        this.saveToStorage();
        return script;
    }
    
    /**
     * Updates a script's result after execution
     * @param {string} id - Script ID
     * @param {Object} result - Result object with type and value
     * @returns {Object|null} Updated script or null if not found
     */
    updateResult(id, result) {
        const script = this.scripts.get(id);
        if (!script) {
            return null;
        }
        
        script.result = result;
        script.executedAt = new Date().toISOString();
        this.saveToStorage();
        return script;
    }
    
    getByDataset(datasetId) {
        // Scripts are not tied to specific datasets in this implementation
        // but this method exists for consistency with metrics
        return Array.from(this.scripts.values());
    }
    
    get(id) {
        return this.scripts.get(id);
    }
    
    getAll() {
        return Array.from(this.scripts.values());
    }
    
    delete(id) {
        const deleted = this.scripts.delete(id);
        if (deleted) {
            this.saveToStorage();
        }
        return deleted;
    }
}

export const scriptsStore = new ScriptsStore();


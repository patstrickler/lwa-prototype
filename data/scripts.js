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
    
    create(name, code, description) {
        const id = `script_${this.nextId++}`;
        const script = {
            id,
            name,
            code,
            description,
            createdAt: new Date().toISOString()
        };
        this.scripts.set(id, script);
        this.saveToStorage();
        return script;
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


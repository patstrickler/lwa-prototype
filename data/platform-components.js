// Platform components storage with localStorage persistence
// Stores installed platform components in LIMS environment

const STORAGE_KEY = 'lwa_platform_components';
const NEXT_ID_KEY = 'lwa_platform_components_nextId';

class PlatformComponentsStore {
    constructor() {
        this.components = new Map();
        this.nextId = 1;
        this.loadFromStorage();
    }
    
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const storedNextId = localStorage.getItem(NEXT_ID_KEY);
            
            if (stored) {
                const components = JSON.parse(stored);
                components.forEach(component => {
                    this.components.set(component.id, component);
                });
            }
            
            if (storedNextId) {
                this.nextId = parseInt(storedNextId, 10);
            }
        } catch (error) {
            console.error('Error loading platform components from localStorage:', error);
        }
    }
    
    saveToStorage() {
        try {
            const components = Array.from(this.components.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
            localStorage.setItem(NEXT_ID_KEY, String(this.nextId));
        } catch (error) {
            console.error('Error saving platform components to localStorage:', error);
        }
    }
    
    /**
     * Installs a new platform component
     * @param {string} name - Component name
     * @param {string} version - Component version
     * @param {string} type - Component type (e.g., 'module', 'plugin', 'integration')
     * @param {Object} config - Configuration object
     * @returns {Object} Component object
     */
    install(name, version, type, config = {}) {
        if (!name || typeof name !== 'string' || !name.trim()) {
            throw new Error('Component name is required');
        }
        
        if (!version || typeof version !== 'string' || !version.trim()) {
            throw new Error('Component version is required');
        }
        
        const id = `comp_${this.nextId++}`;
        const component = {
            id,
            name: name.trim(),
            version: version.trim(),
            type: type || 'module',
            config,
            installedAt: new Date().toISOString(),
            status: 'active',
            enabled: true
        };
        
        try {
            this.components.set(id, component);
            this.saveToStorage();
        } catch (error) {
            console.error('Error installing component:', error);
            this.components.delete(id);
            throw new Error(`Failed to install component: ${error.message || 'Storage error'}`);
        }
        
        return component;
    }
    
    get(id) {
        return this.components.get(id);
    }
    
    getAll() {
        return Array.from(this.components.values());
    }
    
    /**
     * Updates a component
     * @param {string} id - Component ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated component or null if not found
     */
    update(id, updates) {
        const component = this.components.get(id);
        if (!component) {
            return null;
        }
        
        if (updates.name !== undefined) component.name = updates.name;
        if (updates.version !== undefined) component.version = updates.version;
        if (updates.type !== undefined) component.type = updates.type;
        if (updates.config !== undefined) component.config = updates.config;
        if (updates.status !== undefined) component.status = updates.status;
        if (updates.enabled !== undefined) component.enabled = updates.enabled;
        
        component.updatedAt = new Date().toISOString();
        
        this.components.set(id, component);
        this.saveToStorage();
        return component;
    }
    
    delete(id) {
        const component = this.components.get(id);
        const deleted = this.components.delete(id);
        if (deleted) {
            this.saveToStorage();
            return { deleted: true, component };
        }
        return { deleted: false, component: null };
    }
    
    /**
     * Enables or disables a component
     * @param {string} id - Component ID
     * @param {boolean} enabled - Enable/disable flag
     * @returns {Object|null} Updated component or null if not found
     */
    setEnabled(id, enabled) {
        return this.update(id, { enabled });
    }
}

export const platformComponentsStore = new PlatformComponentsStore();


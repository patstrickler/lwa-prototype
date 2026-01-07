// Access permissions storage with localStorage persistence
// Stores access control rules for platform, functions, and data

const STORAGE_KEY = 'lwa_access_permissions';
const NEXT_ID_KEY = 'lwa_access_permissions_nextId';

class AccessPermissionsStore {
    constructor() {
        this.permissions = new Map();
        this.nextId = 1;
        this.loadFromStorage();
    }
    
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const storedNextId = localStorage.getItem(NEXT_ID_KEY);
            
            if (stored) {
                const permissions = JSON.parse(stored);
                permissions.forEach(permission => {
                    this.permissions.set(permission.id, permission);
                });
            }
            
            if (storedNextId) {
                this.nextId = parseInt(storedNextId, 10);
            }
        } catch (error) {
            console.error('Error loading access permissions from localStorage:', error);
        }
    }
    
    saveToStorage() {
        try {
            const permissions = Array.from(this.permissions.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
            localStorage.setItem(NEXT_ID_KEY, String(this.nextId));
        } catch (error) {
            console.error('Error saving access permissions to localStorage:', error);
        }
    }
    
    /**
     * Creates a new access permission
     * @param {string} subjectType - Subject type: 'user' or 'group'
     * @param {string} subjectId - User ID or Group ID
     * @param {string} resourceType - Resource type: 'platform', 'function', or 'data'
     * @param {string} resourceId - Resource identifier
     * @param {string[]} actions - Allowed actions (e.g., ['read', 'write', 'execute'])
     * @returns {Object} Permission object
     */
    create(subjectType, subjectId, resourceType, resourceId, actions = ['read']) {
        if (!['user', 'group'].includes(subjectType)) {
            throw new Error('Subject type must be "user" or "group"');
        }
        
        if (!subjectId || typeof subjectId !== 'string') {
            throw new Error('Subject ID is required');
        }
        
        if (!['platform', 'function', 'data'].includes(resourceType)) {
            throw new Error('Resource type must be "platform", "function", or "data"');
        }
        
        if (!resourceId || typeof resourceId !== 'string') {
            throw new Error('Resource ID is required');
        }
        
        // Check for duplicate permission
        const existing = Array.from(this.permissions.values()).find(
            p => p.subjectType === subjectType &&
                 p.subjectId === subjectId &&
                 p.resourceType === resourceType &&
                 p.resourceId === resourceId
        );
        
        if (existing) {
            throw new Error('Permission already exists');
        }
        
        const id = `perm_${this.nextId++}`;
        const permission = {
            id,
            subjectType,
            subjectId,
            resourceType,
            resourceId,
            actions: Array.isArray(actions) ? [...actions] : ['read'],
            createdAt: new Date().toISOString(),
            enabled: true
        };
        
        try {
            this.permissions.set(id, permission);
            this.saveToStorage();
        } catch (error) {
            console.error('Error creating access permission:', error);
            this.permissions.delete(id);
            throw new Error(`Failed to save permission: ${error.message || 'Storage error'}`);
        }
        
        return permission;
    }
    
    get(id) {
        return this.permissions.get(id);
    }
    
    getAll() {
        return Array.from(this.permissions.values());
    }
    
    /**
     * Gets permissions for a specific subject (user or group)
     * @param {string} subjectType - 'user' or 'group'
     * @param {string} subjectId - Subject ID
     * @returns {Object[]} Array of permissions
     */
    getBySubject(subjectType, subjectId) {
        return Array.from(this.permissions.values()).filter(
            p => p.subjectType === subjectType && p.subjectId === subjectId
        );
    }
    
    /**
     * Gets permissions for a specific resource
     * @param {string} resourceType - 'platform', 'function', or 'data'
     * @param {string} resourceId - Resource ID
     * @returns {Object[]} Array of permissions
     */
    getByResource(resourceType, resourceId) {
        return Array.from(this.permissions.values()).filter(
            p => p.resourceType === resourceType && p.resourceId === resourceId
        );
    }
    
    /**
     * Updates a permission
     * @param {string} id - Permission ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated permission or null if not found
     */
    update(id, updates) {
        const permission = this.permissions.get(id);
        if (!permission) {
            return null;
        }
        
        if (updates.actions !== undefined) permission.actions = Array.isArray(updates.actions) ? [...updates.actions] : [];
        if (updates.enabled !== undefined) permission.enabled = updates.enabled;
        
        permission.updatedAt = new Date().toISOString();
        
        this.permissions.set(id, permission);
        this.saveToStorage();
        return permission;
    }
    
    delete(id) {
        const permission = this.permissions.get(id);
        const deleted = this.permissions.delete(id);
        if (deleted) {
            this.saveToStorage();
            return { deleted: true, permission };
        }
        return { deleted: false, permission: null };
    }
}

export const accessPermissionsStore = new AccessPermissionsStore();


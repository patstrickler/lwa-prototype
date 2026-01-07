// User groups storage with localStorage persistence
// Stores user groups for access control

const STORAGE_KEY = 'lwa_user_groups';
const NEXT_ID_KEY = 'lwa_user_groups_nextId';

class UserGroupsStore {
    constructor() {
        this.groups = new Map();
        this.nextId = 1;
        this.loadFromStorage();
    }
    
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const storedNextId = localStorage.getItem(NEXT_ID_KEY);
            
            if (stored) {
                const groups = JSON.parse(stored);
                groups.forEach(group => {
                    this.groups.set(group.id, group);
                });
            }
            
            if (storedNextId) {
                this.nextId = parseInt(storedNextId, 10);
            }
        } catch (error) {
            console.error('Error loading user groups from localStorage:', error);
        }
    }
    
    saveToStorage() {
        try {
            const groups = Array.from(this.groups.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
            localStorage.setItem(NEXT_ID_KEY, String(this.nextId));
        } catch (error) {
            console.error('Error saving user groups to localStorage:', error);
        }
    }
    
    /**
     * Creates a new user group
     * @param {string} name - Group name
     * @param {string} description - Group description
     * @param {string[]} userIds - Array of user IDs in the group
     * @returns {Object} Group object
     */
    create(name, description = '', userIds = []) {
        if (!name || typeof name !== 'string' || !name.trim()) {
            throw new Error('Group name is required');
        }
        
        // Check if group name already exists
        const existing = Array.from(this.groups.values()).find(g => g.name === name.trim());
        if (existing) {
            throw new Error('Group name already exists');
        }
        
        const id = `group_${this.nextId++}`;
        const group = {
            id,
            name: name.trim(),
            description: description || '',
            userIds: Array.isArray(userIds) ? [...userIds] : [],
            createdAt: new Date().toISOString()
        };
        
        try {
            this.groups.set(id, group);
            this.saveToStorage();
        } catch (error) {
            console.error('Error creating user group:', error);
            this.groups.delete(id);
            throw new Error(`Failed to save group: ${error.message || 'Storage error'}`);
        }
        
        return group;
    }
    
    get(id) {
        return this.groups.get(id);
    }
    
    getAll() {
        return Array.from(this.groups.values());
    }
    
    /**
     * Updates a group
     * @param {string} id - Group ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated group or null if not found
     */
    update(id, updates) {
        const group = this.groups.get(id);
        if (!group) {
            return null;
        }
        
        if (updates.name !== undefined) {
            // Check for duplicate name
            const existing = Array.from(this.groups.values()).find(g => g.name === updates.name && g.id !== id);
            if (existing) {
                throw new Error('Group name already exists');
            }
            group.name = updates.name;
        }
        if (updates.description !== undefined) group.description = updates.description;
        if (updates.userIds !== undefined) group.userIds = Array.isArray(updates.userIds) ? [...updates.userIds] : [];
        
        group.updatedAt = new Date().toISOString();
        
        this.groups.set(id, group);
        this.saveToStorage();
        return group;
    }
    
    delete(id) {
        const group = this.groups.get(id);
        const deleted = this.groups.delete(id);
        if (deleted) {
            this.saveToStorage();
            return { deleted: true, group };
        }
        return { deleted: false, group: null };
    }
    
    /**
     * Adds a user to a group
     * @param {string} groupId - Group ID
     * @param {string} userId - User ID
     * @returns {Object|null} Updated group or null if not found
     */
    addUser(groupId, userId) {
        const group = this.groups.get(groupId);
        if (!group) {
            return null;
        }
        
        if (!group.userIds.includes(userId)) {
            group.userIds.push(userId);
            return this.update(groupId, { userIds: group.userIds });
        }
        
        return group;
    }
    
    /**
     * Removes a user from a group
     * @param {string} groupId - Group ID
     * @param {string} userId - User ID
     * @returns {Object|null} Updated group or null if not found
     */
    removeUser(groupId, userId) {
        const group = this.groups.get(groupId);
        if (!group) {
            return null;
        }
        
        group.userIds = group.userIds.filter(id => id !== userId);
        return this.update(groupId, { userIds: group.userIds });
    }
}

export const userGroupsStore = new UserGroupsStore();


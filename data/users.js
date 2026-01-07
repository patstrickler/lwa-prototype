// Users storage with localStorage persistence
// Stores user accounts for the platform

const STORAGE_KEY = 'lwa_users';
const NEXT_ID_KEY = 'lwa_users_nextId';

class UsersStore {
    constructor() {
        this.users = new Map();
        this.nextId = 1;
        this.loadFromStorage();
    }
    
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const storedNextId = localStorage.getItem(NEXT_ID_KEY);
            
            if (stored) {
                const users = JSON.parse(stored);
                users.forEach(user => {
                    this.users.set(user.id, user);
                });
            }
            
            if (storedNextId) {
                this.nextId = parseInt(storedNextId, 10);
            }
        } catch (error) {
            console.error('Error loading users from localStorage:', error);
        }
    }
    
    saveToStorage() {
        try {
            const users = Array.from(this.users.values());
            // Don't store passwords in plain text (in production, this should be hashed)
            const sanitized = users.map(user => {
                const { password, ...rest } = user;
                return rest;
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
            localStorage.setItem(NEXT_ID_KEY, String(this.nextId));
        } catch (error) {
            console.error('Error saving users to localStorage:', error);
        }
    }
    
    /**
     * Creates a new user
     * @param {string} username - Username
     * @param {string} email - Email address
     * @param {string} password - Password (in production, should be hashed)
     * @param {string[]} groups - Array of group IDs
     * @param {string} role - User role (e.g., 'admin', 'analyst', 'viewer')
     * @returns {Object} User object
     */
    create(username, email, password, groups = [], role = 'viewer') {
        if (!username || typeof username !== 'string' || !username.trim()) {
            throw new Error('Username is required');
        }
        
        if (!email || typeof email !== 'string' || !email.trim()) {
            throw new Error('Email is required');
        }
        
        // Check if username already exists
        const existing = Array.from(this.users.values()).find(u => u.username === username.trim());
        if (existing) {
            throw new Error('Username already exists');
        }
        
        const id = `user_${this.nextId++}`;
        const user = {
            id,
            username: username.trim(),
            email: email.trim(),
            password: password || '', // In production, this should be hashed
            groups: Array.isArray(groups) ? [...groups] : [],
            role: role || 'viewer',
            createdAt: new Date().toISOString(),
            enabled: true,
            lastLogin: null
        };
        
        try {
            this.users.set(id, user);
            this.saveToStorage();
        } catch (error) {
            console.error('Error creating user:', error);
            this.users.delete(id);
            throw new Error(`Failed to save user: ${error.message || 'Storage error'}`);
        }
        
        return user;
    }
    
    get(id) {
        return this.users.get(id);
    }
    
    getByUsername(username) {
        return Array.from(this.users.values()).find(u => u.username === username);
    }
    
    getAll() {
        return Array.from(this.users.values());
    }
    
    /**
     * Updates a user
     * @param {string} id - User ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated user or null if not found
     */
    update(id, updates) {
        const user = this.users.get(id);
        if (!user) {
            return null;
        }
        
        if (updates.username !== undefined) {
            // Check for duplicate username
            const existing = Array.from(this.users.values()).find(u => u.username === updates.username && u.id !== id);
            if (existing) {
                throw new Error('Username already exists');
            }
            user.username = updates.username;
        }
        if (updates.email !== undefined) user.email = updates.email;
        if (updates.password !== undefined) user.password = updates.password;
        if (updates.groups !== undefined) user.groups = Array.isArray(updates.groups) ? [...updates.groups] : [];
        if (updates.role !== undefined) user.role = updates.role;
        if (updates.enabled !== undefined) user.enabled = updates.enabled;
        if (updates.lastLogin !== undefined) user.lastLogin = updates.lastLogin;
        
        user.updatedAt = new Date().toISOString();
        
        this.users.set(id, user);
        this.saveToStorage();
        return user;
    }
    
    delete(id) {
        const user = this.users.get(id);
        const deleted = this.users.delete(id);
        if (deleted) {
            this.saveToStorage();
            return { deleted: true, user };
        }
        return { deleted: false, user: null };
    }
    
    /**
     * Enables or disables a user
     * @param {string} id - User ID
     * @param {boolean} enabled - Enable/disable flag
     * @returns {Object|null} Updated user or null if not found
     */
    setEnabled(id, enabled) {
        return this.update(id, { enabled });
    }
}

export const usersStore = new UsersStore();


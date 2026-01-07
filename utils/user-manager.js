// User and User Group Management
// Mock user system for prototype

const STORAGE_KEY_USERS = 'lwa_users';
const STORAGE_KEY_GROUPS = 'lwa_user_groups';
const STORAGE_KEY_CURRENT_USER = 'lwa_current_user';

class UserManager {
    constructor() {
        this.users = new Map();
        this.groups = new Map();
        this.currentUser = null;
        this.loadFromStorage();
        this.initializeDefaults();
    }
    
    /**
     * Loads users and groups from localStorage
     */
    loadFromStorage() {
        try {
            const storedUsers = localStorage.getItem(STORAGE_KEY_USERS);
            const storedGroups = localStorage.getItem(STORAGE_KEY_GROUPS);
            const storedCurrentUser = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
            
            if (storedUsers) {
                const users = JSON.parse(storedUsers);
                users.forEach(user => {
                    this.users.set(user.id, user);
                });
            }
            
            if (storedGroups) {
                const groups = JSON.parse(storedGroups);
                groups.forEach(group => {
                    this.groups.set(group.id, group);
                });
            }
            
            if (storedCurrentUser) {
                this.currentUser = JSON.parse(storedCurrentUser);
            }
        } catch (error) {
            console.error('Error loading users/groups from localStorage:', error);
        }
    }
    
    /**
     * Saves users and groups to localStorage
     */
    saveToStorage() {
        try {
            const users = Array.from(this.users.values());
            const groups = Array.from(this.groups.values());
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
            localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
            if (this.currentUser) {
                localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(this.currentUser));
            }
        } catch (error) {
            console.error('Error saving users/groups to localStorage:', error);
        }
    }
    
    /**
     * Initializes default users and groups if none exist
     */
    initializeDefaults() {
        if (this.users.size === 0) {
            // Create default users
            this.createUser('John Doe', 'john.doe@example.com', 'Engineer');
            this.createUser('Jane Smith', 'jane.smith@example.com', 'Manager');
            this.createUser('Bob Johnson', 'bob.johnson@example.com', 'Analyst');
            this.createUser('Alice Williams', 'alice.williams@example.com', 'Engineer');
        }
        
        if (this.groups.size === 0) {
            // Create default groups
            this.createGroup('Engineering Team');
            this.createGroup('Management Team');
            this.createGroup('Analytics Team');
        }
        
        // Set default current user if not set
        if (!this.currentUser) {
            const firstUser = Array.from(this.users.values())[0];
            if (firstUser) {
                this.setCurrentUser(firstUser.id);
            }
        }
    }
    
    /**
     * Creates a new user
     * @param {string} name - User name
     * @param {string} email - User email
     * @param {string} role - User role
     * @returns {Object} User object
     */
    createUser(name, email, role = 'User') {
        const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const user = {
            id,
            name: name.trim(),
            email: email.trim(),
            role: role.trim(),
            createdAt: new Date().toISOString()
        };
        
        this.users.set(id, user);
        this.saveToStorage();
        return user;
    }
    
    /**
     * Creates a new user group
     * @param {string} name - Group name
     * @param {string} description - Group description
     * @returns {Object} Group object
     */
    createGroup(name, description = '') {
        const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const group = {
            id,
            name: name.trim(),
            description: description.trim(),
            createdAt: new Date().toISOString()
        };
        
        this.groups.set(id, group);
        this.saveToStorage();
        return group;
    }
    
    /**
     * Gets a user by ID
     * @param {string} id - User ID
     * @returns {Object|null} User object or null
     */
    getUser(id) {
        return this.users.get(id) || null;
    }
    
    /**
     * Gets a group by ID
     * @param {string} id - Group ID
     * @returns {Object|null} Group object or null
     */
    getGroup(id) {
        return this.groups.get(id) || null;
    }
    
    /**
     * Gets all users
     * @returns {Array} Array of user objects
     */
    getAllUsers() {
        return Array.from(this.users.values());
    }
    
    /**
     * Gets all groups
     * @returns {Array} Array of group objects
     */
    getAllGroups() {
        return Array.from(this.groups.values());
    }
    
    /**
     * Sets the current user
     * @param {string} userId - User ID
     */
    setCurrentUser(userId) {
        const user = this.users.get(userId);
        if (user) {
            this.currentUser = user;
            this.saveToStorage();
        }
    }
    
    /**
     * Gets the current user
     * @returns {Object|null} Current user object or null
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Checks if a user has access to a dataset based on access control
     * @param {Object} dataset - Dataset object
     * @param {string} userId - User ID (optional, uses current user if not provided)
     * @returns {boolean} True if user has access
     */
    hasAccessToDataset(dataset, userId = null) {
        // If no access control, default to public access
        if (!dataset.accessControl || dataset.accessControl.type === 'public') {
            return true;
        }
        
        // If restricted, check user and group access
        if (dataset.accessControl.type === 'restricted') {
            const user = userId ? this.users.get(userId) : this.currentUser;
            if (!user) {
                return false;
            }
            
            // Check direct user access
            if (dataset.accessControl.users && dataset.accessControl.users.includes(user.id)) {
                return true;
            }
            
            // Check group access (for prototype, we'll assume all users are in all groups)
            // In a real system, you'd have a user-group mapping
            if (dataset.accessControl.userGroups && dataset.accessControl.userGroups.length > 0) {
                // For prototype: allow access if any group is specified
                // In production, check actual user-group membership
                return true;
            }
            
            return false;
        }
        
        return true; // Default to allow access
    }
}

export { UserManager };


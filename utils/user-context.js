// User Context Manager
// Manages current user, role, and groups for access control

const USER_CONTEXT_KEY = 'lwa_user_context';

class UserContext {
    constructor() {
        this.currentUser = null;
        this.currentRole = 'analyst'; // 'analyst' or 'viewer'
        this.currentGroups = [];
        this.loadFromStorage();
    }
    
    /**
     * Loads user context from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(USER_CONTEXT_KEY);
            if (stored) {
                const context = JSON.parse(stored);
                this.currentUser = context.user || null;
                this.currentRole = context.role || 'analyst';
                this.currentGroups = context.groups || [];
            }
        } catch (error) {
            console.error('Error loading user context from localStorage:', error);
        }
    }
    
    /**
     * Saves user context to localStorage
     */
    saveToStorage() {
        try {
            const context = {
                user: this.currentUser,
                role: this.currentRole,
                groups: this.currentGroups
            };
            localStorage.setItem(USER_CONTEXT_KEY, JSON.stringify(context));
        } catch (error) {
            console.error('Error saving user context to localStorage:', error);
        }
    }
    
    /**
     * Sets the current user
     * @param {string} username - Username
     * @param {string} role - User role ('analyst' or 'viewer')
     * @param {Array<string>} groups - User groups
     */
    setUser(username, role = 'analyst', groups = []) {
        this.currentUser = username;
        this.currentRole = role;
        this.currentGroups = Array.isArray(groups) ? [...groups] : [];
        this.saveToStorage();
        
        // Dispatch event for components to react
        window.dispatchEvent(new CustomEvent('userContextChanged', {
            detail: {
                user: this.currentUser,
                role: this.currentRole,
                groups: this.currentGroups
            }
        }));
    }
    
    /**
     * Gets the current user
     * @returns {string|null}
     */
    getUser() {
        return this.currentUser;
    }
    
    /**
     * Gets the current role
     * @returns {string}
     */
    getRole() {
        return this.currentRole;
    }
    
    /**
     * Gets the current groups
     * @returns {Array<string>}
     */
    getGroups() {
        return [...this.currentGroups];
    }
    
    /**
     * Checks if the current user is a viewer
     * @returns {boolean}
     */
    isViewer() {
        return this.currentRole === 'viewer';
    }
    
    /**
     * Checks if the current user is an analyst
     * @returns {boolean}
     */
    isAnalyst() {
        return this.currentRole === 'analyst';
    }
    
    /**
     * Checks if the current user has access to a resource
     * @param {Object} access - Access control object with users and groups arrays
     * @returns {boolean}
     */
    hasAccess(access) {
        if (!access) {
            return true; // No access control means accessible to all
        }
        
        // If empty access control, assume accessible to all
        if ((!access.users || access.users.length === 0) && 
            (!access.groups || access.groups.length === 0)) {
            return true;
        }
        
        // Check if user is explicitly granted access
        if (access.users && this.currentUser && access.users.includes(this.currentUser)) {
            return true;
        }
        
        // Check if user's groups are granted access
        if (access.groups && this.currentGroups.length > 0) {
            const hasGroupAccess = this.currentGroups.some(group => 
                access.groups.includes(group)
            );
            if (hasGroupAccess) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Clears the current user context
     */
    clear() {
        this.currentUser = null;
        this.currentRole = 'analyst';
        this.currentGroups = [];
        localStorage.removeItem(USER_CONTEXT_KEY);
        
        window.dispatchEvent(new CustomEvent('userContextChanged', {
            detail: {
                user: null,
                role: 'analyst',
                groups: []
            }
        }));
    }
}

export const userContext = new UserContext();

// For development/demo purposes, set a default viewer user
// In production, this would be set by authentication system
if (!userContext.getUser()) {
    userContext.setUser('viewer1', 'viewer', ['viewers', 'employees']);
}


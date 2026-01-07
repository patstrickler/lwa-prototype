// Database connections storage with localStorage persistence
// Stores LIMS database connection configurations

const STORAGE_KEY = 'lwa_database_connections';
const NEXT_ID_KEY = 'lwa_database_connections_nextId';

class DatabaseConnectionsStore {
    constructor() {
        this.connections = new Map();
        this.nextId = 1;
        this.loadFromStorage();
    }
    
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const storedNextId = localStorage.getItem(NEXT_ID_KEY);
            
            if (stored) {
                const connections = JSON.parse(stored);
                connections.forEach(connection => {
                    this.connections.set(connection.id, connection);
                });
            }
            
            if (storedNextId) {
                this.nextId = parseInt(storedNextId, 10);
            }
        } catch (error) {
            console.error('Error loading database connections from localStorage:', error);
        }
    }
    
    saveToStorage() {
        try {
            const connections = Array.from(this.connections.values());
            // Don't store passwords in plain text (in production, this should be encrypted)
            const sanitized = connections.map(conn => {
                const { password, ...rest } = conn;
                return rest;
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
            localStorage.setItem(NEXT_ID_KEY, String(this.nextId));
        } catch (error) {
            console.error('Error saving database connections to localStorage:', error);
        }
    }
    
    /**
     * Creates a new database connection
     * @param {string} name - Connection name
     * @param {string} host - Database host
     * @param {number} port - Database port
     * @param {string} database - Database name
     * @param {string} username - Username
     * @param {string} password - Password
     * @param {string} type - Database type (e.g., 'postgresql', 'mysql', 'mssql')
     * @returns {Object} Connection object
     */
    create(name, host, port, database, username, password, type = 'postgresql') {
        if (!name || typeof name !== 'string' || !name.trim()) {
            throw new Error('Connection name is required');
        }
        
        if (!host || typeof host !== 'string' || !host.trim()) {
            throw new Error('Database host is required');
        }
        
        if (!database || typeof database !== 'string' || !database.trim()) {
            throw new Error('Database name is required');
        }
        
        const id = `db_${this.nextId++}`;
        const connection = {
            id,
            name: name.trim(),
            host: host.trim(),
            port: port || 5432,
            database: database.trim(),
            username: username || '',
            password: password || '', // In production, this should be encrypted
            type: type || 'postgresql',
            createdAt: new Date().toISOString(),
            status: 'disconnected',
            lastConnected: null
        };
        
        try {
            this.connections.set(id, connection);
            this.saveToStorage();
        } catch (error) {
            console.error('Error creating database connection:', error);
            this.connections.delete(id);
            throw new Error(`Failed to save connection: ${error.message || 'Storage error'}`);
        }
        
        return connection;
    }
    
    get(id) {
        return this.connections.get(id);
    }
    
    getAll() {
        return Array.from(this.connections.values());
    }
    
    /**
     * Updates a connection
     * @param {string} id - Connection ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated connection or null if not found
     */
    update(id, updates) {
        const connection = this.connections.get(id);
        if (!connection) {
            return null;
        }
        
        if (updates.name !== undefined) connection.name = updates.name;
        if (updates.host !== undefined) connection.host = updates.host;
        if (updates.port !== undefined) connection.port = updates.port;
        if (updates.database !== undefined) connection.database = updates.database;
        if (updates.username !== undefined) connection.username = updates.username;
        if (updates.password !== undefined) connection.password = updates.password;
        if (updates.type !== undefined) connection.type = updates.type;
        if (updates.status !== undefined) connection.status = updates.status;
        if (updates.lastConnected !== undefined) connection.lastConnected = updates.lastConnected;
        
        connection.updatedAt = new Date().toISOString();
        
        this.connections.set(id, connection);
        this.saveToStorage();
        return connection;
    }
    
    delete(id) {
        const connection = this.connections.get(id);
        const deleted = this.connections.delete(id);
        if (deleted) {
            this.saveToStorage();
            return { deleted: true, connection };
        }
        return { deleted: false, connection: null };
    }
    
    /**
     * Tests a database connection (simulated)
     * @param {string} id - Connection ID
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection(id) {
        const connection = this.connections.get(id);
        if (!connection) {
            throw new Error('Connection not found');
        }
        
        // Simulate connection test
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulate 80% success rate
                const success = Math.random() > 0.2;
                if (success) {
                    this.update(id, {
                        status: 'connected',
                        lastConnected: new Date().toISOString()
                    });
                } else {
                    this.update(id, { status: 'error' });
                }
                resolve(success);
            }, 1000);
        });
    }
}

export const databaseConnectionsStore = new DatabaseConnectionsStore();


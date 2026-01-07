// Reports/Dashboards storage with localStorage persistence
// This will store saved reports/dashboards with visualizations, filters, and access control

const STORAGE_KEY = 'lwa_reports';
const NEXT_ID_KEY = 'lwa_reports_nextId';

class ReportsStore {
    constructor() {
        this.reports = new Map();
        this.nextId = 1;
        this.loadFromStorage();
    }
    
    /**
     * Loads reports from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const storedNextId = localStorage.getItem(NEXT_ID_KEY);
            
            if (stored) {
                const reports = JSON.parse(stored);
                reports.forEach(report => {
                    this.reports.set(report.id, report);
                });
            }
            
            if (storedNextId) {
                this.nextId = parseInt(storedNextId, 10);
            }
        } catch (error) {
            console.error('Error loading reports from localStorage:', error);
        }
    }
    
    /**
     * Saves reports to localStorage
     */
    saveToStorage() {
        try {
            const reports = Array.from(this.reports.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
            localStorage.setItem(NEXT_ID_KEY, String(this.nextId));
        } catch (error) {
            console.error('Error saving reports to localStorage:', error);
            if (error.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded, attempting to clear old data...');
            }
        }
    }
    
    /**
     * Creates a new report/dashboard
     * @param {string} title - Report/dashboard title
     * @param {Array<string>} visualizationIds - Array of visualization IDs to display
     * @param {Array<Object>} filters - Array of filter configurations
     * @param {Object} access - Access control settings
     * @returns {Object} Report object
     */
    create(title, visualizationIds = [], filters = [], access = { users: [], groups: [] }) {
        if (!title || typeof title !== 'string' || !title.trim()) {
            throw new Error('Report title is required');
        }
        
        if (!Array.isArray(visualizationIds)) {
            throw new Error('Visualization IDs must be an array');
        }
        
        if (!Array.isArray(filters)) {
            throw new Error('Filters must be an array');
        }
        
        const id = `report_${this.nextId++}`;
        const report = {
            id,
            title: title.trim(),
            visualizationIds: [...visualizationIds],
            filters: filters.map(f => ({ ...f })), // Deep copy
            access: {
                users: access.users ? [...access.users] : [],
                groups: access.groups ? [...access.groups] : []
            },
            createdAt: new Date().toISOString()
        };
        
        try {
            this.reports.set(id, report);
            this.saveToStorage();
        } catch (error) {
            console.error('Error creating report:', error);
            this.reports.delete(id);
            throw new Error(`Failed to save report: ${error.message || 'Storage error'}`);
        }
        
        return report;
    }
    
    get(id) {
        return this.reports.get(id);
    }
    
    getAll() {
        return Array.from(this.reports.values());
    }
    
    /**
     * Updates a report
     * @param {string} id - Report ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated report or null if not found
     */
    update(id, updates) {
        const report = this.reports.get(id);
        if (!report) {
            return null;
        }
        
        if (updates.title !== undefined) {
            report.title = updates.title;
        }
        if (updates.visualizationIds !== undefined) {
            report.visualizationIds = [...updates.visualizationIds];
        }
        if (updates.filters !== undefined) {
            report.filters = updates.filters.map(f => ({ ...f }));
        }
        if (updates.access !== undefined) {
            report.access = {
                users: updates.access.users ? [...updates.access.users] : [],
                groups: updates.access.groups ? [...updates.access.groups] : []
            };
        }
        
        report.updatedAt = new Date().toISOString();
        
        this.reports.set(id, report);
        this.saveToStorage();
        return report;
    }
    
    /**
     * Duplicates a report
     * @param {string} id - Report ID to duplicate
     * @returns {Object|null} New report or null if not found
     */
    duplicate(id) {
        const report = this.reports.get(id);
        if (!report) {
            return null;
        }
        
        return this.create(
            `${report.title} (Copy)`,
            [...report.visualizationIds],
            report.filters.map(f => ({ ...f })),
            {
                users: [...report.access.users],
                groups: [...report.access.groups]
            }
        );
    }
    
    exists(id) {
        return this.reports.has(id);
    }
    
    delete(id) {
        const report = this.reports.get(id);
        const deleted = this.reports.delete(id);
        if (deleted) {
            this.saveToStorage();
            return { deleted: true, report };
        }
        return { deleted: false, report: null };
    }
}

export const reportsStore = new ReportsStore();


// Platform health and performance metrics storage with localStorage persistence
// Stores platform health metrics, errors, load times, etc.

const STORAGE_KEY = 'lwa_health_metrics';
const MAX_METRICS = 1000; // Limit stored metrics to prevent storage bloat

class HealthMetricsStore {
    constructor() {
        this.metrics = [];
        this.loadFromStorage();
        this.startCollecting();
    }
    
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.metrics = JSON.parse(stored);
                // Keep only recent metrics if too many
                if (this.metrics.length > MAX_METRICS) {
                    this.metrics = this.metrics.slice(-MAX_METRICS);
                    this.saveToStorage();
                }
            }
        } catch (error) {
            console.error('Error loading health metrics from localStorage:', error);
            this.metrics = [];
        }
    }
    
    saveToStorage() {
        try {
            // Keep only recent metrics
            const recent = this.metrics.slice(-MAX_METRICS);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
        } catch (error) {
            console.error('Error saving health metrics to localStorage:', error);
        }
    }
    
    /**
     * Records a health metric
     * @param {string} type - Metric type (e.g., 'error', 'load_time', 'api_call', 'query_execution')
     * @param {Object} data - Metric data
     * @returns {Object} Metric object
     */
    record(type, data = {}) {
        const metric = {
            id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            timestamp: new Date().toISOString(),
            ...data
        };
        
        this.metrics.push(metric);
        
        // Keep only recent metrics
        if (this.metrics.length > MAX_METRICS) {
            this.metrics = this.metrics.slice(-MAX_METRICS);
        }
        
        this.saveToStorage();
        return metric;
    }
    
    /**
     * Records an error
     * @param {string} message - Error message
     * @param {string} source - Error source (e.g., 'api', 'query', 'component')
     * @param {Object} details - Additional error details
     * @returns {Object} Error metric
     */
    recordError(message, source = 'unknown', details = {}) {
        return this.record('error', {
            message,
            source,
            severity: details.severity || 'error',
            ...details
        });
    }
    
    /**
     * Records a load time metric
     * @param {string} operation - Operation name (e.g., 'page_load', 'query_execution')
     * @param {number} duration - Duration in milliseconds
     * @returns {Object} Load time metric
     */
    recordLoadTime(operation, duration) {
        return this.record('load_time', {
            operation,
            duration,
            unit: 'ms'
        });
    }
    
    /**
     * Gets all metrics
     * @param {Object} filters - Optional filters (type, startTime, endTime)
     * @returns {Object[]} Array of metrics
     */
    getAll(filters = {}) {
        let results = [...this.metrics];
        
        if (filters.type) {
            results = results.filter(m => m.type === filters.type);
        }
        
        if (filters.startTime) {
            const start = new Date(filters.startTime);
            results = results.filter(m => new Date(m.timestamp) >= start);
        }
        
        if (filters.endTime) {
            const end = new Date(filters.endTime);
            results = results.filter(m => new Date(m.timestamp) <= end);
        }
        
        return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    /**
     * Gets recent metrics (last N minutes)
     * @param {number} minutes - Number of minutes to look back
     * @returns {Object[]} Array of recent metrics
     */
    getRecent(minutes = 60) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        return this.getAll({ startTime: cutoff.toISOString() });
    }
    
    /**
     * Gets error summary
     * @param {number} minutes - Number of minutes to look back
     * @returns {Object} Error summary
     */
    getErrorSummary(minutes = 60) {
        const errors = this.getRecent(minutes).filter(m => m.type === 'error');
        const bySource = {};
        const bySeverity = {};
        
        errors.forEach(error => {
            bySource[error.source] = (bySource[error.source] || 0) + 1;
            bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
        });
        
        return {
            total: errors.length,
            bySource,
            bySeverity,
            recent: errors.slice(0, 10)
        };
    }
    
    /**
     * Gets performance summary
     * @param {number} minutes - Number of minutes to look back
     * @returns {Object} Performance summary
     */
    getPerformanceSummary(minutes = 60) {
        const loadTimes = this.getRecent(minutes).filter(m => m.type === 'load_time');
        const byOperation = {};
        
        loadTimes.forEach(metric => {
            if (!byOperation[metric.operation]) {
                byOperation[metric.operation] = {
                    count: 0,
                    total: 0,
                    min: Infinity,
                    max: -Infinity
                };
            }
            
            const stats = byOperation[metric.operation];
            stats.count++;
            stats.total += metric.duration;
            stats.min = Math.min(stats.min, metric.duration);
            stats.max = Math.max(stats.max, metric.duration);
        });
        
        // Calculate averages
        Object.keys(byOperation).forEach(op => {
            const stats = byOperation[op];
            stats.avg = stats.total / stats.count;
        });
        
        return {
            total: loadTimes.length,
            byOperation
        };
    }
    
    /**
     * Starts collecting automatic metrics (page load time, etc.)
     */
    startCollecting() {
        // Record page load time
        if (typeof window !== 'undefined' && window.performance) {
            window.addEventListener('load', () => {
                const perfData = window.performance.timing;
                const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                this.recordLoadTime('page_load', loadTime);
            });
        }
    }
    
    /**
     * Clears old metrics
     * @param {number} daysToKeep - Number of days of metrics to keep
     */
    clearOld(daysToKeep = 7) {
        const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
        this.metrics = this.metrics.filter(m => new Date(m.timestamp) >= cutoff);
        this.saveToStorage();
    }
}

export const healthMetricsStore = new HealthMetricsStore();


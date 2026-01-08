// Metric Execution Engine
// Executes metric definitions on dataset rows and returns scalar values

import { calculateMean, calculateSum, calculateMin, calculateMax, calculateStdev, calculateCount, calculateCountDistinct } from './metric-calculator.js';
import { evaluateMetricScript } from './metric-script-parser.js';

/**
 * Metric Execution Engine
 * Accepts dataset rows, applies aggregation functions, and returns scalar values
 */
export class MetricExecutionEngine {
    constructor() {
        // Registry of available aggregation functions
        this.aggregationFunctions = {
            'mean': calculateMean,
            'sum': calculateSum,
            'min': calculateMin,
            'max': calculateMax,
            'stdev': calculateStdev,
            'count': calculateCount,
            'count_distinct': calculateCountDistinct
        };
    }
    
    /**
     * Executes a metric definition on dataset rows
     * @param {Object} metricDefinition - Metric definition object
     * @param {string} metricDefinition.operation - Aggregation operation (mean, sum, min, max, stdev, count, count_distinct)
     * @param {string} metricDefinition.column - Column name to aggregate
     * @param {any[][]} rows - Dataset rows (array of arrays)
     * @param {string[]} columns - Dataset column names
     * @returns {number|null} Scalar result value or null if execution fails
     * @throws {Error} If metric definition is invalid or operation is not supported
     */
    execute(metricDefinition, rows, columns) {
        // Validate inputs
        if (!metricDefinition) {
            throw new Error('Metric definition is required');
        }
        
        if (!rows || !Array.isArray(rows)) {
            throw new Error('Dataset rows must be an array');
        }
        
        if (rows.length === 0) {
            throw new Error('Cannot calculate metric: dataset is empty');
        }
        
        if (!columns || !Array.isArray(columns)) {
            throw new Error('Dataset columns must be an array');
        }
        
        if (columns.length === 0) {
            throw new Error('Cannot calculate metric: dataset has no columns');
        }
        
        const { operation, column } = metricDefinition;
        
        if (!operation) {
            throw new Error('Metric operation is required');
        }
        
        if (!column) {
            throw new Error('Metric column is required');
        }
        
        // Check if operation is supported
        if (!this.aggregationFunctions[operation]) {
            const supportedOps = Object.keys(this.aggregationFunctions).join(', ');
            throw new Error(`Unsupported aggregation operation: "${operation}". Supported operations: ${supportedOps}`);
        }
        
        // Check if column exists in dataset
        if (!columns.includes(column)) {
            throw new Error(`Column "${column}" not found in dataset. Available columns: ${columns.join(', ')}`);
        }
        
        // Execute the aggregation function
        try {
            console.log('[MetricExecutionEngine.execute] Executing metric', {
                operation,
                column,
                rowCount: rows.length,
                columnCount: columns.length
            });
            
            const aggregationFn = this.aggregationFunctions[operation];
            const result = aggregationFn(rows, columns, column);
            
            console.log('[MetricExecutionEngine.execute] Metric executed successfully', {
                operation,
                column,
                result
            });
            
            // Return scalar value (null if calculation failed)
            return result;
        } catch (error) {
            console.error('[MetricExecutionEngine.execute] Error executing metric:', {
                error: error.message,
                stack: error.stack,
                operation,
                column,
                rowCount: rows.length,
                columnCount: columns.length,
                timestamp: new Date().toISOString()
            });
            throw new Error(`Failed to execute metric: ${error.message}`);
        }
    }
    
    /**
     * Executes a metric by ID using stored metric definition and dataset
     * @param {string} metricId - Metric ID
     * @param {Object} dataset - Dataset object with rows and columns
     * @param {Object} metric - Metric object from store
     * @returns {number|null} Scalar result value
     */
    executeMetric(metric, dataset) {
        if (!metric) {
            throw new Error('Metric is required');
        }
        
        if (!dataset) {
            throw new Error('Dataset is required');
        }
        
        // If metric has an expression, use the script parser
        if (metric.expression) {
            try {
                return evaluateMetricScript(metric.expression, dataset);
            } catch (error) {
                console.error('Error evaluating metric expression:', error);
                throw new Error(`Failed to evaluate metric expression: ${error.message}`);
            }
        }
        
        // Otherwise, use column-based execution
        // Build metric definition from stored metric
        const metricDefinition = {
            operation: metric.operation,
            column: metric.column
        };
        
        // Execute using dataset rows and columns
        return this.execute(metricDefinition, dataset.rows, dataset.columns);
    }
    
    /**
     * Validates a metric definition without executing it
     * @param {Object} metricDefinition - Metric definition to validate
     * @param {string[]} columns - Available column names
     * @returns {Object} Validation result with isValid and errors
     */
    validate(metricDefinition, columns) {
        const errors = [];
        
        if (!metricDefinition) {
            errors.push('Metric definition is required');
            return { isValid: false, errors };
        }
        
        const { operation, column } = metricDefinition;
        
        if (!operation) {
            errors.push('Operation is required');
        } else if (!this.aggregationFunctions[operation]) {
            errors.push(`Unsupported operation: ${operation}`);
        }
        
        if (!column) {
            errors.push('Column is required');
        } else if (columns && !columns.includes(column)) {
            errors.push(`Column "${column}" not found in dataset`);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Gets list of supported aggregation operations
     * @returns {string[]} Array of operation names
     */
    getSupportedOperations() {
        return Object.keys(this.aggregationFunctions);
    }
    
    /**
     * Registers a custom aggregation function
     * @param {string} name - Operation name
     * @param {Function} fn - Aggregation function (rows, columns, columnName) => number|null
     */
    registerAggregationFunction(name, fn) {
        if (typeof fn !== 'function') {
            throw new Error('Aggregation function must be a function');
        }
        this.aggregationFunctions[name] = fn;
    }
}

// Export singleton instance
export const metricExecutionEngine = new MetricExecutionEngine();


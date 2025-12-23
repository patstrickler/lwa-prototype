// Metric Calculation Utilities
// Functions to calculate statistical metrics on dataset columns

/**
 * Calculates the mean (average) of numeric values in a column
 * @param {any[][]} rows - Array of row arrays
 * @param {string[]} columns - Column names array
 * @param {string} columnName - Name of the column to calculate on
 * @returns {number|null}
 */
export function calculateMean(rows, columns, columnName) {
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) return null;
    
    const values = rows
        .map(row => row[columnIndex])
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));
    
    if (values.length === 0) return null;
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    return parseFloat((sum / values.length).toFixed(4));
}

/**
 * Calculates the sum of numeric values in a column
 * @param {any[][]} rows - Array of row arrays
 * @param {string[]} columns - Column names array
 * @param {string} columnName - Name of the column to calculate on
 * @returns {number|null}
 */
export function calculateSum(rows, columns, columnName) {
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) return null;
    
    const values = rows
        .map(row => row[columnIndex])
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));
    
    if (values.length === 0) return null;
    
    return parseFloat(values.reduce((acc, val) => acc + val, 0).toFixed(4));
}

/**
 * Calculates the minimum value in a column
 * @param {any[][]} rows - Array of row arrays
 * @param {string[]} columns - Column names array
 * @param {string} columnName - Name of the column to calculate on
 * @returns {number|null}
 */
export function calculateMin(rows, columns, columnName) {
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) return null;
    
    const values = rows
        .map(row => row[columnIndex])
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));
    
    if (values.length === 0) return null;
    
    return Math.min(...values);
}

/**
 * Calculates the maximum value in a column
 * @param {any[][]} rows - Array of row arrays
 * @param {string[]} columns - Column names array
 * @param {string} columnName - Name of the column to calculate on
 * @returns {number|null}
 */
export function calculateMax(rows, columns, columnName) {
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) return null;
    
    const values = rows
        .map(row => row[columnIndex])
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));
    
    if (values.length === 0) return null;
    
    return Math.max(...values);
}

/**
 * Calculates the standard deviation of numeric values in a column
 * @param {any[][]} rows - Array of row arrays
 * @param {string[]} columns - Column names array
 * @param {string} columnName - Name of the column to calculate on
 * @returns {number|null}
 */
export function calculateStdev(rows, columns, columnName) {
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) return null;
    
    const values = rows
        .map(row => row[columnIndex])
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));
    
    if (values.length === 0) return null;
    if (values.length === 1) return 0;
    
    // Calculate mean
    const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
    
    // Calculate variance
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    
    // Standard deviation is square root of variance
    return parseFloat(Math.sqrt(variance).toFixed(4));
}

/**
 * Calculates a metric based on operation type
 * @param {any[][]} rows - Array of row arrays
 * @param {string[]} columns - Column names array
 * @param {string} columnName - Name of the column to calculate on
 * @param {string} operation - Operation type: 'mean', 'sum', 'min', 'max', 'stdev'
 * @returns {number|null}
 */
export function calculateMetric(rows, columns, columnName, operation) {
    switch (operation.toLowerCase()) {
        case 'mean':
            return calculateMean(rows, columns, columnName);
        case 'sum':
            return calculateSum(rows, columns, columnName);
        case 'min':
            return calculateMin(rows, columns, columnName);
        case 'max':
            return calculateMax(rows, columns, columnName);
        case 'stdev':
            return calculateStdev(rows, columns, columnName);
        default:
            return null;
    }
}


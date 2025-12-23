// Metric Calculation Utilities
// Functions to calculate statistical metrics on dataset columns

/**
 * Calculates the mean (average) of numeric values in a column
 * @param {any[][]} rows - Array of row arrays
 * @param {string[]} columns - Column names array
 * @param {string} columnName - Name of the column to calculate on
 * @returns {number|null}
 * @throws {Error} If column is missing or dataset is empty
 */
export function calculateMean(rows, columns, columnName) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
        throw new Error('Cannot calculate mean: dataset is empty');
    }
    
    if (!columns || !Array.isArray(columns)) {
        throw new Error('Cannot calculate mean: column names are missing');
    }
    
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) {
        throw new Error(`Column "${columnName}" not found in dataset. Available columns: ${columns.join(', ')}`);
    }
    
    const values = rows
        .map(row => {
            if (!row || !Array.isArray(row) || row.length <= columnIndex) {
                return null;
            }
            return row[columnIndex];
        })
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));
    
    if (values.length === 0) {
        throw new Error(`Cannot calculate mean: column "${columnName}" contains no numeric values`);
    }
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    return parseFloat((sum / values.length).toFixed(4));
}

/**
 * Calculates the sum of numeric values in a column
 * @param {any[][]} rows - Array of row arrays
 * @param {string[]} columns - Column names array
 * @param {string} columnName - Name of the column to calculate on
 * @returns {number|null}
 * @throws {Error} If column is missing or dataset is empty
 */
export function calculateSum(rows, columns, columnName) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
        throw new Error('Cannot calculate sum: dataset is empty');
    }
    
    if (!columns || !Array.isArray(columns)) {
        throw new Error('Cannot calculate sum: column names are missing');
    }
    
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) {
        throw new Error(`Column "${columnName}" not found in dataset. Available columns: ${columns.join(', ')}`);
    }
    
    const values = rows
        .map(row => {
            if (!row || !Array.isArray(row) || row.length <= columnIndex) {
                return null;
            }
            return row[columnIndex];
        })
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));
    
    if (values.length === 0) {
        throw new Error(`Cannot calculate sum: column "${columnName}" contains no numeric values`);
    }
    
    return parseFloat(values.reduce((acc, val) => acc + val, 0).toFixed(4));
}

/**
 * Calculates the minimum value in a column
 * @param {any[][]} rows - Array of row arrays
 * @param {string[]} columns - Column names array
 * @param {string} columnName - Name of the column to calculate on
 * @returns {number|null}
 * @throws {Error} If column is missing or dataset is empty
 */
export function calculateMin(rows, columns, columnName) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
        throw new Error('Cannot calculate minimum: dataset is empty');
    }
    
    if (!columns || !Array.isArray(columns)) {
        throw new Error('Cannot calculate minimum: column names are missing');
    }
    
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) {
        throw new Error(`Column "${columnName}" not found in dataset. Available columns: ${columns.join(', ')}`);
    }
    
    const values = rows
        .map(row => {
            if (!row || !Array.isArray(row) || row.length <= columnIndex) {
                return null;
            }
            return row[columnIndex];
        })
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));
    
    if (values.length === 0) {
        throw new Error(`Cannot calculate minimum: column "${columnName}" contains no numeric values`);
    }
    
    return Math.min(...values);
}

/**
 * Calculates the maximum value in a column
 * @param {any[][]} rows - Array of row arrays
 * @param {string[]} columns - Column names array
 * @param {string} columnName - Name of the column to calculate on
 * @returns {number|null}
 * @throws {Error} If column is missing or dataset is empty
 */
export function calculateMax(rows, columns, columnName) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
        throw new Error('Cannot calculate maximum: dataset is empty');
    }
    
    if (!columns || !Array.isArray(columns)) {
        throw new Error('Cannot calculate maximum: column names are missing');
    }
    
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) {
        throw new Error(`Column "${columnName}" not found in dataset. Available columns: ${columns.join(', ')}`);
    }
    
    const values = rows
        .map(row => {
            if (!row || !Array.isArray(row) || row.length <= columnIndex) {
                return null;
            }
            return row[columnIndex];
        })
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));
    
    if (values.length === 0) {
        throw new Error(`Cannot calculate maximum: column "${columnName}" contains no numeric values`);
    }
    
    return Math.max(...values);
}

/**
 * Calculates the standard deviation of numeric values in a column
 * @param {any[][]} rows - Array of row arrays
 * @param {string[]} columns - Column names array
 * @param {string} columnName - Name of the column to calculate on
 * @returns {number|null}
 * @throws {Error} If column is missing or dataset is empty
 */
export function calculateStdev(rows, columns, columnName) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
        throw new Error('Cannot calculate standard deviation: dataset is empty');
    }
    
    if (!columns || !Array.isArray(columns)) {
        throw new Error('Cannot calculate standard deviation: column names are missing');
    }
    
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) {
        throw new Error(`Column "${columnName}" not found in dataset. Available columns: ${columns.join(', ')}`);
    }
    
    const values = rows
        .map(row => {
            if (!row || !Array.isArray(row) || row.length <= columnIndex) {
                return null;
            }
            return row[columnIndex];
        })
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(val => Number(val));
    
    if (values.length === 0) {
        throw new Error(`Cannot calculate standard deviation: column "${columnName}" contains no numeric values`);
    }
    
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
 * @throws {Error} If operation is invalid or calculation fails
 */
export function calculateMetric(rows, columns, columnName, operation) {
    if (!operation) {
        throw new Error('Operation type is required');
    }
    
    const operationLower = operation.toLowerCase();
    switch (operationLower) {
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
            throw new Error(`Unsupported operation: "${operation}". Supported operations: mean, sum, min, max, stdev`);
    }
}


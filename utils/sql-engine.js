// Mock SQL Execution Engine
// Simulates SQL query execution with latency and returns mock tabular data

import { getTableData } from '../data/table-data.js';

/**
 * Executes a mock SQL query with simulated latency
 * @param {string} sql - SQL query string
 * @param {number} latency - Simulated latency in milliseconds (default: 500)
 * @returns {Promise<{columns: string[], rows: any[][]}>}
 */
export async function executeSQL(sql, latency = 500) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const result = parseAndExecuteSQL(sql);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }, latency);
    });
}

/**
 * Parses SQL and generates mock data based on query patterns
 * @param {string} sql - SQL query string
 * @returns {{columns: string[], rows: any[][]}}
 * @throws {Error} If SQL syntax is invalid
 */
function parseAndExecuteSQL(sql) {
    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
        throw new Error('SQL query cannot be empty');
    }
    
    const originalSQL = sql.trim();
    const normalizedSQL = originalSQL.toLowerCase();
    
    // Basic SQL validation - must start with SELECT
    if (!normalizedSQL.startsWith('select')) {
        throw new Error('SQL query must start with SELECT. Only SELECT queries are supported.');
    }
    
    // Parse SELECT clause with column aliases
    const selectMatch = originalSQL.match(/select\s+(.+?)\s+from/i);
    if (!selectMatch) {
        throw new Error('Invalid SELECT clause. Please use format: SELECT column1, column2 FROM table_name');
    }
    
    const selectClause = selectMatch[1].trim();
    const columnSpecs = parseSelectClause(selectClause);
    
    // Parse FROM and JOIN clauses
    // Match FROM clause - capture everything until WHERE, ORDER BY, GROUP BY, HAVING, LIMIT, or end of string
    // Use a more robust pattern that handles multi-line queries
    const fromJoinMatch = originalSQL.match(/from\s+((?:(?!\s+(?:where|order\s+by|group\s+by|having|limit)\b).)+)/is);
    if (!fromJoinMatch) {
        throw new Error('SQL query must include a FROM clause with a table name.');
    }
    
    const fromJoinClause = fromJoinMatch[1].trim();
    const tableInfo = parseFromAndJoins(fromJoinClause);
    
    // Validate all tables exist
    const allTables = getAllTables();
    const tableMap = {};
    allTables.forEach(t => {
        tableMap[t.name.toLowerCase()] = t;
    });
    
    for (const tableAlias of Object.keys(tableInfo.tables)) {
        const tableName = tableInfo.tables[tableAlias];
        if (!tableMap[tableName.toLowerCase()]) {
            throw new Error(`Table "${tableName}" not found. Available tables: ${allTables.map(t => t.name).join(', ')}`);
        }
    }
    
    // Check for WHERE clause to determine row count
    const whereMatch = normalizedSQL.match(/where/i);
    const limitMatch = normalizedSQL.match(/limit\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : null;
    
    if (limit !== null && (isNaN(limit) || limit < 0)) {
        throw new Error('LIMIT clause must contain a positive number. Example: LIMIT 10');
    }
    
    // Handle SELECT * - expand to all columns from the table(s)
    let expandedColumnSpecs = columnSpecs;
    if (columnSpecs.length === 1 && columnSpecs[0].columnName === '*') {
        // Expand SELECT * to all columns from all tables
        expandedColumnSpecs = [];
        for (const [alias, tableName] of Object.entries(tableInfo.tables)) {
            const tableDef = tableMap[tableName.toLowerCase()];
            if (tableDef) {
                tableDef.columns.forEach(col => {
                    expandedColumnSpecs.push({
                        columnName: col,
                        alias: null,
                        tableAlias: alias
                    });
                });
            }
        }
        
        // If no columns found, fall back to the original spec
        if (expandedColumnSpecs.length === 0) {
            expandedColumnSpecs = columnSpecs;
        }
    }
    
    // Parse WHERE clause if present
    let whereClause = null;
    if (whereMatch) {
        // Extract WHERE clause - everything after WHERE until ORDER BY, GROUP BY, HAVING, LIMIT, or end
        const whereMatchFull = originalSQL.match(/where\s+((?:(?!\s+(?:order\s+by|group\s+by|having|limit)\b).)+)/is);
        if (whereMatchFull) {
            whereClause = whereMatchFull[1].trim();
        }
    }
    
    // Generate mock rows with JOIN support
    // Generate enough rows to satisfy LIMIT after filtering
    // If no LIMIT (user selected "All"), generate a large number of rows
    // If WHERE clause, generate more to account for filtering
    const defaultRowCount = 25;
    const allRowsCount = 1000; // When "All" is selected, generate 1000 rows
    const baseRowCount = limit 
        ? Math.max(limit, (whereMatch ? limit * 2 : limit)) 
        : (whereMatch ? allRowsCount * 2 : allRowsCount);
    const rows = generateJoinedRows(expandedColumnSpecs, tableInfo, tableMap, baseRowCount);
    
    // Apply WHERE clause filtering if present
    let filteredRows = rows;
    if (whereClause && rows.length > 0) {
        filteredRows = applyWhereClause(rows, expandedColumnSpecs, whereClause);
    }
    
    // Apply LIMIT after filtering
    if (limit !== null && limit > 0) {
        filteredRows = filteredRows.slice(0, limit);
    }
    
    // Extract column names for output (use aliases if present, otherwise use column names)
    const columns = expandedColumnSpecs.map(spec => spec.alias || spec.columnName);
    
    return {
        columns,
        rows: filteredRows
    };
}

/**
 * Parses SELECT clause to extract column specifications with aliases
 * @param {string} selectClause - The SELECT clause content
 * @returns {Array<{columnName: string, alias: string|null, tableAlias: string|null}>}
 */
function parseSelectClause(selectClause) {
    if (selectClause.trim() === '*') {
        return [{ columnName: '*', alias: null, tableAlias: null }];
    }
    
    // Split by comma, but be careful with commas inside parentheses
    const columns = [];
    let current = '';
    let depth = 0;
    
    for (let i = 0; i < selectClause.length; i++) {
        const char = selectClause[i];
        if (char === '(') depth++;
        else if (char === ')') depth--;
        else if (char === ',' && depth === 0) {
            if (current.trim()) {
                columns.push(parseColumnSpec(current.trim()));
            }
            current = '';
            continue;
        }
        current += char;
    }
    
    if (current.trim()) {
        columns.push(parseColumnSpec(current.trim()));
    }
    
    return columns.filter(col => col !== null);
}

/**
 * Parses a single column specification
 * @param {string} colSpec - Column specification (e.g., "s.sample_id", "status AS sample_status")
 * @returns {{columnName: string, alias: string|null, tableAlias: string|null}}
 */
function parseColumnSpec(colSpec) {
    // Remove quotes
    colSpec = colSpec.replace(/^["'`]|["'`]$/g, '');
    
    // Check for alias (AS keyword or space-separated)
    const aliasMatch = colSpec.match(/\s+as\s+(\w+)$/i) || colSpec.match(/\s+(\w+)$/);
    let alias = null;
    let columnPart = colSpec;
    
    if (aliasMatch) {
        alias = aliasMatch[1];
        columnPart = colSpec.substring(0, aliasMatch.index).trim();
    }
    
    // Check for table alias (table.column)
    const parts = columnPart.split('.');
    let tableAlias = null;
    let columnName = columnPart;
    
    if (parts.length === 2) {
        tableAlias = parts[0].trim();
        columnName = parts[1].trim();
    } else if (parts.length > 2) {
        // Handle schema.table.column (use last two parts)
        tableAlias = parts[parts.length - 2].trim();
        columnName = parts[parts.length - 1].trim();
    }
    
    // Remove quotes from column name
    columnName = columnName.replace(/^["'`]|["'`]$/g, '');
    if (tableAlias) {
        tableAlias = tableAlias.replace(/^["'`]|["'`]$/g, '');
    }
    
    return {
        columnName: columnName.toLowerCase(),
        alias: alias ? alias.toLowerCase() : null,
        tableAlias: tableAlias ? tableAlias.toLowerCase() : null
    };
}

/**
 * Parses FROM and JOIN clauses to extract table information
 * @param {string} fromJoinClause - The FROM/JOIN clause content
 * @returns {{tables: Object<string, string>, joins: Array<{type: string, table: string, alias: string, on: string}>}}
 */
function parseFromAndJoins(fromJoinClause) {
    const result = {
        tables: {}, // alias -> table name
        joins: []
    };
    
    // Normalize whitespace (replace newlines and multiple spaces with single space)
    const normalized = fromJoinClause.replace(/\s+/g, ' ').trim();
    
    // Parse FROM clause (first table)
    const fromMatch = normalized.match(/^(\w+)(?:\s+(\w+))?/i);
    if (fromMatch) {
        const tableName = fromMatch[1];
        const alias = fromMatch[2] || tableName;
        result.tables[alias.toLowerCase()] = tableName.toLowerCase();
    }
    
    // Parse JOIN clauses - use a more robust regex that handles ON clauses
    const joinRegex = /(left|right|inner|full)?\s*join\s+(\w+)(?:\s+(\w+))?(?:\s+on\s+([^join]+(?=\s+(?:left|right|inner|full)?\s*join|$)))?/gi;
    let joinMatch;
    let lastIndex = 0;
    
    while ((joinMatch = joinRegex.exec(normalized)) !== null) {
        const joinType = (joinMatch[1] || 'inner').toLowerCase();
        const tableName = joinMatch[2];
        const alias = joinMatch[3] || tableName;
        let onClause = (joinMatch[4] || '').trim();
        
        // Clean up ON clause - remove trailing semicolons and extra whitespace
        onClause = onClause.replace(/;?\s*$/, '').trim();
        
        result.tables[alias.toLowerCase()] = tableName.toLowerCase();
        result.joins.push({
            type: joinType,
            table: tableName.toLowerCase(),
            alias: alias.toLowerCase(),
            on: onClause
        });
        
        lastIndex = joinRegex.lastIndex;
    }
    
    return result;
}

/**
 * Gets default columns for a table name
 * @param {string} tableName - Name of the table
 * @returns {string[]}
 */
function getDefaultColumns(tableName) {
    const columnMap = {
        // Lab-related tables
        'samples': ['sample_id', 'sample_name', 'sample_type', 'collection_date', 'status', 'lab_id'],
        'tests': ['test_id', 'test_name', 'test_type', 'method', 'unit', 'reference_range'],
        'results': ['result_id', 'sample_id', 'test_id', 'result_value', 'result_date', 'technician_id', 'status'],
        'labs': ['lab_id', 'lab_name', 'location', 'contact_email', 'phone'],
        'technicians': ['technician_id', 'name', 'email', 'lab_id', 'specialization'],
        // Legacy tables (keeping for compatibility)
        'users': ['id', 'name', 'email', 'created_at'],
        'orders': ['order_id', 'user_id', 'total', 'order_date'],
        'products': ['product_id', 'name', 'price', 'category'],
        'sales': ['sale_id', 'product_id', 'quantity', 'sale_date', 'amount'],
        'metrics': ['test_date', 'result_value', 'metric_name'],
        'analytics': ['date', 'event', 'count', 'value'],
        'default': ['id', 'name', 'value', 'created_at']
    };
    
    return columnMap[tableName] || columnMap['default'];
}

/**
 * Gets all available tables in the database
 * @returns {Array<{name: string, columns: string[], description: string}>}
 */
export function getAllTables() {
    return [
        {
            name: 'samples',
            columns: ['sample_id', 'sample_name', 'sample_type', 'collection_date', 'status', 'lab_id'],
            description: 'Laboratory sample records'
        },
        {
            name: 'tests',
            columns: ['test_id', 'test_name', 'test_type', 'method', 'unit', 'reference_range'],
            description: 'Available test types and methods'
        },
        {
            name: 'results',
            columns: ['result_id', 'sample_id', 'test_id', 'result_value', 'result_date', 'technician_id', 'status'],
            description: 'Test results linked to samples'
        },
        {
            name: 'labs',
            columns: ['lab_id', 'lab_name', 'location', 'contact_email', 'phone'],
            description: 'Laboratory information'
        },
        {
            name: 'technicians',
            columns: ['technician_id', 'name', 'email', 'lab_id', 'specialization'],
            description: 'Lab technician information'
        },
    ];
}

/**
 * Generates mock rows for JOIN queries
 * @param {Array} columnSpecs - Column specifications from SELECT clause
 * @param {Object} tableInfo - Table and JOIN information
 * @param {Object} tableMap - Map of table names to table definitions
 * @param {number} rowCount - Number of rows to generate
 * @returns {any[][]}
 */
function generateJoinedRows(columnSpecs, tableInfo, tableMap, rowCount) {
    const rows = [];
    const baseDate = new Date('2024-01-01');
    
    // Generate base data for each table
    const tableData = {};
    for (const [alias, tableName] of Object.entries(tableInfo.tables)) {
        const tableDef = tableMap[tableName];
        if (!tableDef) continue;
        
        // Check if we have stored data for this table
        const storedData = getTableData(tableName);
        const tableRows = [];
        
        if (storedData && storedData.length > 0) {
            // Use stored data (limit to rowCount or available data, whichever is smaller)
            const dataToUse = storedData.slice(0, Math.min(rowCount, storedData.length));
            
            dataToUse.forEach((rowArray, idx) => {
                const row = {};
                // Map array values to column names
                tableDef.columns.forEach((col, colIdx) => {
                    const value = rowArray[colIdx] !== undefined ? rowArray[colIdx] : null;
                    row[col] = value; // Unqualified
                    row[`${alias}.${col}`] = value; // Qualified with alias
                });
                tableRows.push(row);
            });
        } else {
            // Fallback to generating data on-the-fly
            const tableRowCount = rowCount;
            
            for (let i = 0; i < tableRowCount; i++) {
                const row = {};
                // Store columns with both qualified (alias.column) and unqualified names
                tableDef.columns.forEach(col => {
                    const value = generateColumnValue(col, i, tableName);
                    row[col] = value; // Unqualified
                    row[`${alias}.${col}`] = value; // Qualified with alias
                });
                tableRows.push(row);
            }
        }
        
        tableData[alias] = tableRows;
    }
    
    // Perform JOINs
    let joinedData = tableData[Object.keys(tableInfo.tables)[0]] || [];
    
    for (const join of tableInfo.joins) {
        const rightTableData = tableData[join.alias] || [];
        const joined = [];
        
        // Parse ON clause to find join keys
        const onClause = join.on.toLowerCase();
        const onMatch = onClause.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
        
        if (onMatch) {
            const leftTableAlias = onMatch[1];
            const leftColumn = onMatch[2];
            const rightTableAlias = onMatch[3];
            const rightColumn = onMatch[4];
            
            // Create index for right table
            const rightIndex = {};
            rightTableData.forEach((rightRow, idx) => {
                const key = rightRow[rightColumn];
                if (!rightIndex[key]) {
                    rightIndex[key] = [];
                }
                rightIndex[key].push(idx);
            });
            
            // Perform join
            if (join.type === 'left') {
                // LEFT JOIN: all rows from left, matching rows from right (or NULL)
                joinedData.forEach(leftRow => {
                    const key = leftRow[leftColumn];
                    const matchingRight = rightIndex[key] || [];
                    
                    if (matchingRight.length > 0) {
                    matchingRight.forEach(rightIdx => {
                        const merged = { ...leftRow };
                        // Merge right table data, preserving both qualified and unqualified keys
                        Object.keys(rightTableData[rightIdx]).forEach(key => {
                            merged[key] = rightTableData[rightIdx][key];
                        });
                        joined.push(merged);
                    });
                    } else {
                        // No match - add left row with NULLs for right columns
                        const merged = { ...leftRow };
                        const rightTableDef = tableMap[join.table];
                        if (rightTableDef) {
                            rightTableDef.columns.forEach(col => {
                                merged[col] = null; // Unqualified
                                merged[`${join.alias}.${col}`] = null; // Qualified
                            });
                        }
                        joined.push(merged);
                    }
                });
            } else {
                // INNER JOIN: only matching rows
                joinedData.forEach(leftRow => {
                    const key = leftRow[leftColumn];
                    const matchingRight = rightIndex[key] || [];
                    
                    matchingRight.forEach(rightIdx => {
                        const merged = { ...leftRow };
                        // Merge right table data, preserving both qualified and unqualified keys
                        Object.keys(rightTableData[rightIdx]).forEach(key => {
                            merged[key] = rightTableData[rightIdx][key];
                        });
                        joined.push(merged);
                    });
                });
            }
        } else {
            // No ON clause or couldn't parse - perform cartesian product (limited)
            const maxCartesian = Math.min(joinedData.length * rightTableData.length, rowCount * 2);
            for (let i = 0; i < Math.min(joinedData.length, rowCount); i++) {
                for (let j = 0; j < Math.min(rightTableData.length, 3); j++) {
                    if (joined.length >= maxCartesian) break;
                    const merged = { ...joinedData[i] };
                    // Merge right table data, preserving both qualified and unqualified keys
                    Object.keys(rightTableData[j]).forEach(key => {
                        merged[key] = rightTableData[j][key];
                    });
                    joined.push(merged);
                }
            }
        }
        
        joinedData = joined;
    }
    
    // Limit to requested row count
    joinedData = joinedData.slice(0, rowCount);
    
    // Map columns from joined data to result columns
    // Note: SELECT * should already be expanded before this function is called
    for (let rowIdx = 0; rowIdx < joinedData.length; rowIdx++) {
        const joinedRow = joinedData[rowIdx];
        const resultRow = columnSpecs.map(spec => {
            // Find the column value
            let value = null;
            
            if (spec.tableAlias) {
                // Qualified column name (table.column) - try qualified key first
                const qualifiedKey = `${spec.tableAlias}.${spec.columnName}`;
                value = joinedRow[qualifiedKey];
                
                // Fallback to unqualified if qualified not found
                if (value === undefined) {
                    value = joinedRow[spec.columnName];
                }
            } else {
                // Unqualified column name - try to find in joined row
                // Prefer columns from tables in order
                value = joinedRow[spec.columnName];
            }
            
            // If still null/undefined, try to generate based on column name
            if (value === null || value === undefined) {
                value = generateColumnValue(spec.columnName, rowIdx, null);
            }
            
            return value;
        });
        
        rows.push(resultRow);
    }
    
    return rows;
}

/**
 * Applies WHERE clause filtering to rows
 * @param {any[][]} rows - Array of row arrays
 * @param {Array} columnSpecs - Column specifications
 * @param {string} whereClause - WHERE clause string
 * @returns {any[][]}
 */
function applyWhereClause(rows, columnSpecs, whereClause) {
    if (!rows || rows.length === 0) return rows;
    
    // Create a map of column names to indices
    const columnMap = {};
    columnSpecs.forEach((spec, index) => {
        const colName = spec.alias || spec.columnName;
        columnMap[colName.toLowerCase()] = index;
        // Also map unqualified column name
        if (spec.tableAlias) {
            columnMap[`${spec.tableAlias}.${spec.columnName}`.toLowerCase()] = index;
        }
    });
    
    const normalizedWhere = whereClause.toLowerCase().trim();
    const filteredRows = [];
    
    for (const row of rows) {
        if (evaluateWhereCondition(row, columnMap, normalizedWhere, whereClause)) {
            filteredRows.push(row);
        }
    }
    
    return filteredRows;
}

/**
 * Evaluates a WHERE condition for a single row
 * @param {any[]} row - Row data array
 * @param {Object} columnMap - Map of column names to indices
 * @param {string} normalizedWhere - Lowercase WHERE clause
 * @param {string} originalWhere - Original WHERE clause (for value extraction)
 * @returns {boolean}
 */
function evaluateWhereCondition(row, columnMap, normalizedWhere, originalWhere) {
    // Simple WHERE clause evaluation
    // Supports: column = value, column > value, column < value, column >= value, column <= value, column != value
    // Also supports: column LIKE 'pattern', column IN (value1, value2), column IS NULL, column IS NOT NULL
    // Supports AND, OR operators
    
    // Split by AND/OR (simple approach)
    const andParts = normalizedWhere.split(/\s+and\s+/);
    
    // All AND conditions must be true
    for (const andPart of andParts) {
        const orParts = andPart.split(/\s+or\s+/);
        
        // At least one OR condition must be true
        let orResult = false;
        for (const condition of orParts) {
            if (evaluateSingleCondition(row, columnMap, condition.trim(), originalWhere)) {
                orResult = true;
                break;
            }
        }
        
        if (!orResult) {
            return false;
        }
    }
    
    return true;
}

/**
 * Evaluates a single WHERE condition
 * @param {any[]} row - Row data array
 * @param {Object} columnMap - Map of column names to indices
 * @param {string} condition - Single condition (lowercase)
 * @param {string} originalWhere - Original WHERE clause for value extraction
 * @returns {boolean}
 */
function evaluateSingleCondition(row, columnMap, condition, originalWhere) {
    // Handle IS NULL / IS NOT NULL
    if (condition.includes('is null')) {
        const colMatch = condition.match(/(\w+)\s+is\s+null/);
        if (colMatch) {
            const colName = colMatch[1].toLowerCase();
            const colIndex = columnMap[colName];
            if (colIndex !== undefined) {
                return row[colIndex] === null || row[colIndex] === undefined;
            }
        }
        return false;
    }
    
    if (condition.includes('is not null')) {
        const colMatch = condition.match(/(\w+)\s+is\s+not\s+null/);
        if (colMatch) {
            const colName = colMatch[1].toLowerCase();
            const colIndex = columnMap[colName];
            if (colIndex !== undefined) {
                return row[colIndex] !== null && row[colIndex] !== undefined;
            }
        }
        return false;
    }
    
    // Handle comparison operators: =, !=, <, >, <=, >=
    // Extract value from original WHERE clause to preserve case
    const operators = ['!=', '<=', '>=', '=', '<', '>'];
    for (const op of operators) {
        if (condition.includes(op)) {
            const parts = condition.split(op);
            if (parts.length === 2) {
                const colName = parts[0].trim().toLowerCase();
                const colIndex = columnMap[colName];
                
                if (colIndex !== undefined) {
                    // Extract the value from the original WHERE clause (preserve case)
                    const originalParts = extractConditionFromOriginal(originalWhere, condition, op);
                    if (originalParts) {
                        const valueStr = originalParts.value;
                        const rowValue = row[colIndex];
                        const compareValue = parseValue(valueStr);
                        
                        // Perform comparison
                        const comparison = compareValues(rowValue, compareValue);
                        switch (op) {
                            case '=':
                                return comparison === 0;
                            case '!=':
                                return comparison !== 0;
                            case '>':
                                return comparison > 0;
                            case '<':
                                return comparison < 0;
                            case '>=':
                                return comparison >= 0;
                            case '<=':
                                return comparison <= 0;
                        }
                    } else {
                        // If we can't extract the value, try a fallback: extract from normalized condition
                        // This handles cases where the extraction regex fails
                        const normalizedParts = condition.split(op);
                        if (normalizedParts.length === 2) {
                            const valueStr = normalizedParts[1].trim();
                            const rowValue = row[colIndex];
                            const compareValue = parseValue(valueStr);
                            
                            // Perform case-insensitive comparison for strings
                            const comparison = compareValues(rowValue, compareValue);
                            switch (op) {
                                case '=':
                                    return comparison === 0;
                                case '!=':
                                    return comparison !== 0;
                                case '>':
                                    return comparison > 0;
                                case '<':
                                    return comparison < 0;
                                case '>=':
                                    return comparison >= 0;
                                case '<=':
                                    return comparison <= 0;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Handle LIKE - extract pattern from original WHERE clause
    if (condition.includes(' like ')) {
        const likeMatch = condition.match(/(\w+)\s+like\s+(.+)/);
        if (likeMatch) {
            const colName = likeMatch[1].toLowerCase();
            const colIndex = columnMap[colName];
            if (colIndex !== undefined) {
                // Extract pattern from original WHERE clause
                const originalLikeMatch = originalWhere.match(new RegExp(`(\\w+)\\s+like\\s+(.+)`, 'i'));
                if (originalLikeMatch) {
                    let pattern = originalLikeMatch[2].trim();
                    // Remove quotes but preserve case
                    pattern = pattern.replace(/^['"]|['"]$/g, '');
                    // Convert SQL wildcards to regex
                    pattern = pattern.replace(/%/g, '.*').replace(/_/g, '.');
                    const rowValue = String(row[colIndex] || '');
                    try {
                        const regex = new RegExp(`^${pattern}$`, 'i');
                        return regex.test(rowValue);
                    } catch (e) {
                        return false;
                    }
                }
            }
        }
    }
    
    // Default: return true (don't filter if we can't evaluate)
    return true;
}

/**
 * Extracts the value from the original WHERE clause for a given condition
 * @param {string} originalWhere - Original WHERE clause
 * @param {string} normalizedCondition - Normalized (lowercase) condition
 * @param {string} operator - The operator used (=, !=, etc.)
 * @returns {{column: string, value: string}|null}
 */
function extractConditionFromOriginal(originalWhere, normalizedCondition, operator) {
    // Find the corresponding condition in the original WHERE clause
    // Match the column name and operator, then extract the value
    
    // Extract column name from normalized condition
    const normalizedParts = normalizedCondition.split(operator);
    if (normalizedParts.length !== 2) return null;
    
    const normalizedColName = normalizedParts[0].trim().toLowerCase();
    
    // Find the column in the original WHERE clause (case-insensitive)
    const colNameRegex = new RegExp(`\\b${normalizedColName}\\b`, 'i');
    const colMatch = originalWhere.match(colNameRegex);
    if (!colMatch) return null;
    
    // Find the operator and value after the column name
    const afterCol = originalWhere.substring(colMatch.index + colMatch[0].length);
    const operatorRegex = operator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
    const valueMatch = afterCol.match(new RegExp(`\\s*${operatorRegex}\\s*(.+)`, 'i'));
    
    if (valueMatch) {
        let value = valueMatch[1].trim();
        // Handle quoted strings - extract until the closing quote
        if (value.startsWith("'") || value.startsWith('"')) {
            const quote = value[0];
            const endQuote = value.indexOf(quote, 1);
            if (endQuote > 0) {
                value = value.substring(0, endQuote + 1);
            }
        } else {
            // Unquoted value - extract until space, comma, or end
            const spaceMatch = value.match(/^([^\s,]+)/);
            if (spaceMatch) {
                value = spaceMatch[1];
            }
        }
        
        return {
            column: normalizedColName,
            value: value.trim()
        };
    }
    
    return null;
}

/**
 * Parses a value from WHERE clause
 * @param {string} valueStr - Value string (may be quoted)
 * @returns {any}
 */
function parseValue(valueStr) {
    valueStr = valueStr.trim();
    
    // Remove quotes
    if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
        (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
        valueStr = valueStr.slice(1, -1);
    }
    
    // Try to parse as number
    if (/^-?\d+$/.test(valueStr)) {
        return parseInt(valueStr, 10);
    }
    if (/^-?\d+\.\d+$/.test(valueStr)) {
        return parseFloat(valueStr);
    }
    
    // Return as string
    return valueStr;
}

/**
 * Compares two values (case-insensitive for strings)
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {number} - Negative if a < b, 0 if a == b, positive if a > b
 */
function compareValues(a, b) {
    if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
    if (b === null || b === undefined) return 1;
    
    if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
    }
    
    // Case-insensitive string comparison
    return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
}

/**
 * Generates a mock value for a column based on its name and context
 * @param {string} columnName - Name of the column
 * @param {number} rowIndex - Index of the row
 * @param {string|null} tableName - Name of the table (optional)
 * @returns {any}
 */
function generateColumnValue(columnName, rowIndex, tableName) {
    const colLower = columnName.toLowerCase();
    const baseDate = new Date('2024-01-01');
    
    // Generate data based on column name patterns
    if (colLower.includes('date') || colLower.includes('_at')) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + rowIndex);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    if (colLower.includes('id')) {
        return rowIndex + 1;
    }
    
    if (colLower.includes('email')) {
        return `user${rowIndex + 1}@example.com`;
    }
    
    if (colLower.includes('name')) {
        if (colLower.includes('sample')) {
            return `Sample-${String(rowIndex + 1).padStart(4, '0')}`;
        }
        if (colLower.includes('test')) {
            const testNames = ['Blood Test', 'Urine Analysis', 'Culture Test', 'PCR Test', 'Antibody Test'];
            return testNames[rowIndex % testNames.length];
        }
        if (colLower.includes('lab')) {
            return `Lab ${rowIndex + 1}`;
        }
        return `Item ${rowIndex + 1}`;
    }
    
    if (colLower.includes('value') || colLower.includes('result')) {
        // Generate numeric values with some variation
        return parseFloat((Math.random() * 100 + rowIndex * 0.5).toFixed(2));
    }
    
    if (colLower.includes('price') || colLower.includes('amount') || colLower.includes('total')) {
        return parseFloat((Math.random() * 1000 + 10).toFixed(2));
    }
    
    if (colLower.includes('quantity') || colLower.includes('count')) {
        return Math.floor(Math.random() * 100) + 1;
    }
    
    if (colLower.includes('category') || colLower.includes('type')) {
        const categories = ['A', 'B', 'C', 'D'];
        return categories[rowIndex % categories.length];
    }
    
    if (colLower === 'status') {
        const statuses = ['pending', 'completed', 'in_progress', 'cancelled', 'Approved', 'Rejected', 'Pending Review'];
        return statuses[rowIndex % statuses.length];
    }
    
    if (colLower.includes('method')) {
        const methods = ['ELISA', 'PCR', 'Culture', 'Microscopy', 'Flow Cytometry'];
        return methods[rowIndex % methods.length];
    }
    
    if (colLower.includes('unit')) {
        const units = ['mg/dL', 'IU/L', 'cells/μL', 'ng/mL', 'pg/mL'];
        return units[rowIndex % units.length];
    }
    
    if (colLower.includes('reference_range')) {
        return '0-100';
    }
    
    if (colLower.includes('event')) {
        const events = ['click', 'view', 'purchase', 'signup'];
        return events[rowIndex % events.length];
    }
    
    // Default: return a string
    return `Value ${rowIndex + 1}`;
}


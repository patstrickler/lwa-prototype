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
    const fromJoinMatch = originalSQL.match(/from\s+(.+?)(?:\s+where|\s+order\s+by|\s+group\s+by|\s+having|\s+limit|$)/i);
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
    // Add test_types as alias for tests
    tableMap['test_types'] = tableMap['tests'];
    
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
    
    // Generate mock rows with JOIN support
    const rowCount = limit || (whereMatch ? 5 : 10);
    const rows = generateJoinedRows(expandedColumnSpecs, tableInfo, tableMap, rowCount);
    
    // Extract column names for output (use aliases if present, otherwise use column names)
    const columns = expandedColumnSpecs.map(spec => spec.alias || spec.columnName);
    
    return {
        columns,
        rows
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
        'test_types': ['test_id', 'test_name', 'test_type', 'method', 'unit', 'reference_range'], // Alias for tests
        'results': ['result_id', 'sample_id', 'test_id', 'result_value', 'result_date', 'technician_id', 'status'],
        'labs': ['lab_id', 'lab_name', 'location', 'contact_email', 'phone'],
        'technicians': ['technician_id', 'name', 'email', 'lab_id', 'specialization'],
        'sample_types': ['type_id', 'type_name', 'description', 'storage_requirements'],
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
            name: 'test_types',
            columns: ['test_id', 'test_name', 'test_type', 'method', 'unit', 'reference_range'],
            description: 'Available test types and methods (alias for tests)'
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
        {
            name: 'sample_types',
            columns: ['type_id', 'type_name', 'description', 'storage_requirements'],
            description: 'Sample type definitions'
        }
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
        const statuses = ['pending', 'completed', 'in_progress', 'cancelled'];
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


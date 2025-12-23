// Mock SQL Execution Engine
// Simulates SQL query execution with latency and returns mock tabular data

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
 */
function parseAndExecuteSQL(sql) {
    const normalizedSQL = sql.trim().toLowerCase();
    
    // Extract table name from FROM clause
    const fromMatch = normalizedSQL.match(/from\s+(\w+)/);
    const tableName = fromMatch ? fromMatch[1] : 'default';
    
    // Extract column names from SELECT clause
    const selectMatch = normalizedSQL.match(/select\s+(.+?)\s+from/i);
    let columns = [];
    
    if (selectMatch) {
        const selectClause = selectMatch[1].trim();
        if (selectClause === '*') {
            // Use default columns for the table
            columns = getDefaultColumns(tableName);
        } else {
            // Parse column names
            columns = selectClause
                .split(',')
                .map(col => col.trim().replace(/\s+as\s+\w+/i, ''))
                .map(col => col.replace(/^["'`]|["'`]$/g, ''))
                .filter(col => col.length > 0);
        }
    } else {
        columns = getDefaultColumns(tableName);
    }
    
    // Check for WHERE clause to determine row count
    const whereMatch = normalizedSQL.match(/where/i);
    const limitMatch = normalizedSQL.match(/limit\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : null;
    
    // Generate mock rows
    const rowCount = limit || (whereMatch ? 5 : 10);
    const rows = generateMockRows(columns, rowCount, tableName);
    
    return {
        columns,
        rows
    };
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
        'test_results': ['result_id', 'sample_id', 'test_id', 'result_value', 'result_date', 'technician_id', 'status'],
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
            name: 'test_results',
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
 * Generates mock rows based on column names
 * @param {string[]} columns - Column names
 * @param {number} rowCount - Number of rows to generate
 * @param {string} tableName - Table name for context
 * @returns {any[][]}
 */
function generateMockRows(columns, rowCount, tableName) {
    const rows = [];
    const baseDate = new Date('2024-01-01');
    
    for (let i = 0; i < rowCount; i++) {
        const row = columns.map(column => {
            const colLower = column.toLowerCase();
            
            // Generate data based on column name patterns
            if (colLower.includes('date') || colLower.includes('_at')) {
                const date = new Date(baseDate);
                date.setDate(date.getDate() + i);
                return date.toISOString().split('T')[0]; // YYYY-MM-DD format
            }
            
            if (colLower.includes('id')) {
                return i + 1;
            }
            
            if (colLower.includes('email')) {
                return `user${i + 1}@example.com`;
            }
            
            if (colLower.includes('name')) {
                return `Item ${i + 1}`;
            }
            
            if (colLower.includes('value') || colLower.includes('result')) {
                // Generate numeric values with some variation
                return parseFloat((Math.random() * 100 + i * 0.5).toFixed(2));
            }
            
            if (colLower.includes('price') || colLower.includes('amount') || colLower.includes('total')) {
                return parseFloat((Math.random() * 1000 + 10).toFixed(2));
            }
            
            if (colLower.includes('quantity') || colLower.includes('count')) {
                return Math.floor(Math.random() * 100) + 1;
            }
            
            if (colLower.includes('category') || colLower.includes('type')) {
                const categories = ['A', 'B', 'C', 'D'];
                return categories[i % categories.length];
            }
            
            if (colLower.includes('event')) {
                const events = ['click', 'view', 'purchase', 'signup'];
                return events[i % events.length];
            }
            
            // Default: return a string
            return `Value ${i + 1}`;
        });
        
        rows.push(row);
    }
    
    return rows;
}


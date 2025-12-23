// SQL Autocomplete Utility
// Provides suggestions for SQL keywords, tables, and columns

import { getAllTables } from './sql-engine.js';

// SQL keywords
const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
    'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'INNER JOIN',
    'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'ON', 'AS', 'DISTINCT', 'COUNT',
    'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'IS NULL', 'IS NOT NULL', 'UNION', 'UNION ALL', 'INSERT', 'UPDATE', 'DELETE'
];

// Get table schema dynamically
function getTableSchema() {
    const tables = getAllTables();
    const schema = {};
    tables.forEach(table => {
        schema[table.name.toLowerCase()] = table.columns;
    });
    return schema;
}

function getTableNames() {
    const tables = getAllTables();
    return tables.map(t => t.name);
}

/**
 * Gets suggestions based on current SQL context
 * @param {string} sql - Current SQL text
 * @param {number} cursorPosition - Current cursor position
 * @returns {Array<{text: string, type: string}>}
 */
export function getSuggestions(sql, cursorPosition) {
    const textBeforeCursor = sql.substring(0, cursorPosition);
    const currentWord = getCurrentWord(textBeforeCursor);
    
    if (!currentWord) {
        return [];
    }
    
    const wordLower = currentWord.toLowerCase();
    const context = getSQLContext(textBeforeCursor);
    
    let suggestions = [];
    
    const TABLE_SCHEMA = getTableSchema();
    const TABLE_NAMES = getTableNames();
    
    // Suggest based on context
    if (context.expectingTable) {
        // After FROM, suggest table names
        suggestions = TABLE_NAMES
            .filter(table => table.toLowerCase().startsWith(wordLower))
            .map(table => ({ text: table, type: 'table' }));
    } else if (context.expectingColumn) {
        // After SELECT or in WHERE, suggest columns
        const tableName = context.currentTable;
        if (tableName && TABLE_SCHEMA[tableName.toLowerCase()]) {
            suggestions = TABLE_SCHEMA[tableName.toLowerCase()]
                .filter(col => col.toLowerCase().startsWith(wordLower))
                .map(col => ({ text: col, type: 'column' }));
        }
        // Also suggest all columns from all tables
        if (suggestions.length === 0) {
            Object.entries(TABLE_SCHEMA).forEach(([table, columns]) => {
                columns.forEach(col => {
                    if (col.toLowerCase().startsWith(wordLower)) {
                        suggestions.push({ text: `${table}.${col}`, type: 'column' });
                    }
                });
            });
        }
    } else {
        // Suggest SQL keywords
        suggestions = SQL_KEYWORDS
            .filter(keyword => keyword.toLowerCase().startsWith(wordLower))
            .map(keyword => ({ text: keyword, type: 'keyword' }));
        
        // Also suggest table names
        TABLE_NAMES.forEach(table => {
            if (table.toLowerCase().startsWith(wordLower)) {
                suggestions.push({ text: table, type: 'table' });
            }
        });
    }
    
    // Sort: exact matches first, then by type (keywords, tables, columns)
    suggestions.sort((a, b) => {
        if (a.text.toLowerCase() === wordLower) return -1;
        if (b.text.toLowerCase() === wordLower) return 1;
        const typeOrder = { keyword: 0, table: 1, column: 2 };
        return typeOrder[a.type] - typeOrder[b.type];
    });
    
    return suggestions.slice(0, 10); // Limit to 10 suggestions
}

/**
 * Gets the current word being typed
 * @param {string} text - Text before cursor
 * @returns {string}
 */
function getCurrentWord(text) {
    const match = text.match(/(\w+)$/);
    return match ? match[1] : '';
}

/**
 * Analyzes SQL context to determine what suggestions to show
 * @param {string} text - Text before cursor
 * @returns {Object}
 */
function getSQLContext(text) {
    const normalized = text.toLowerCase().trim();
    
    // Check if we're after FROM
    const fromMatch = normalized.match(/from\s+(\w*)$/);
    if (fromMatch) {
        return {
            expectingTable: true,
            expectingColumn: false,
            currentTable: null
        };
    }
    
    // Check if we're in SELECT clause
    const selectMatch = normalized.match(/select\s+(.*?)(?:\s+from|$)/i);
    if (selectMatch) {
        // Extract table name from FROM clause if present
        const fromTableMatch = normalized.match(/from\s+(\w+)/);
        const currentTable = fromTableMatch ? fromTableMatch[1] : null;
        
        return {
            expectingTable: false,
            expectingColumn: true,
            currentTable: currentTable
        };
    }
    
    // Check if we're in WHERE clause
    const whereMatch = normalized.match(/where\s+(.*?)$/i);
    if (whereMatch) {
        const fromTableMatch = normalized.match(/from\s+(\w+)/);
        const currentTable = fromTableMatch ? fromTableMatch[1] : null;
        
        return {
            expectingTable: false,
            expectingColumn: true,
            currentTable: currentTable
        };
    }
    
    return {
        expectingTable: false,
        expectingColumn: false,
        currentTable: null
    };
}

/**
 * Gets the start position of the current word
 * @param {string} text - Text before cursor
 * @returns {number}
 */
export function getWordStartPosition(text) {
    const match = text.match(/(\w+)$/);
    return match ? text.length - match[1].length : text.length;
}


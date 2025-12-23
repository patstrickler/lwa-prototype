// Metric Script Parser
// Parses and evaluates metric expressions with built-in functions and operators
// Example: MEAN(sales) + SUM(revenue) / COUNT(orders)

import { calculateMean, calculateSum, calculateMin, calculateMax, calculateStdev, calculateCount, calculateCountDistinct } from './metric-calculator.js';

/**
 * Parses and evaluates a metric script expression
 * Supports functions: SUM, MEAN, MIN, MAX, STDDEV, COUNT, COUNT_DISTINCT, IF
 * Supports operators: +, -, *, /
 * Supports comparisons: >, <, >=, <=, ==, !=
 * @param {string} expression - Metric expression (e.g., "MEAN(sales) + SUM(revenue)" or "IF(MEAN(sales) > 100, SUM(revenue), 0)")
 * @param {Object} dataset - Dataset object with rows and columns
 * @returns {number} Calculated result
 */
export function evaluateMetricScript(expression, dataset) {
    if (!expression || !expression.trim()) {
        throw new Error('Metric expression is required');
    }
    
    if (!dataset || !dataset.rows || !dataset.columns) {
        throw new Error('Dataset is required');
    }
    
    // Tokenize the expression
    const tokens = tokenize(expression);
    
    // Parse into an AST (Abstract Syntax Tree)
    const ast = parse(tokens);
    
    // Evaluate the AST
    return evaluate(ast, dataset);
}

/**
 * Tokenizes the expression into tokens
 * @param {string} expression - Metric expression
 * @returns {Array} Array of tokens
 */
function tokenize(expression) {
    const tokens = [];
    let i = 0;
    
    while (i < expression.length) {
        // Skip whitespace
        if (/\s/.test(expression[i])) {
            i++;
            continue;
        }
        
        // Match numbers (including negative numbers)
        if (/\d/.test(expression[i]) || (expression[i] === '-' && i + 1 < expression.length && /\d/.test(expression[i + 1]))) {
            // Check if this is a negative number (not subtraction)
            let isNegative = false;
            if (expression[i] === '-') {
                // Check if previous token is operator, opening paren, or start of expression
                const prevToken = tokens.length > 0 ? tokens[tokens.length - 1] : null;
                if (!prevToken || prevToken.type === '(' || ['+', '-', '*', '/'].includes(prevToken.type)) {
                    isNegative = true;
                    i++; // consume the minus sign
                }
            }
            
            let num = '';
            while (i < expression.length && (/\d/.test(expression[i]) || expression[i] === '.')) {
                num += expression[i];
                i++;
            }
            const value = parseFloat(num);
            tokens.push({ type: 'NUMBER', value: isNegative ? -value : value });
            continue;
        }
        
        // Match string literals (quoted strings)
        if (expression[i] === '"' || expression[i] === "'") {
            const quote = expression[i];
            i++; // consume opening quote
            let str = '';
            while (i < expression.length && expression[i] !== quote) {
                if (expression[i] === '\\' && i + 1 < expression.length) {
                    // Handle escape sequences
                    i++;
                    if (expression[i] === 'n') str += '\n';
                    else if (expression[i] === 't') str += '\t';
                    else if (expression[i] === '\\') str += '\\';
                    else if (expression[i] === quote) str += quote;
                    else str += expression[i];
                } else {
                    str += expression[i];
                }
                i++;
            }
            if (i >= expression.length) {
                throw new Error('Unclosed string literal');
            }
            i++; // consume closing quote
            tokens.push({ type: 'STRING', value: str });
            continue;
        }
        
        // Match comparison operators (>=, <=, ==, !=)
        if (i + 1 < expression.length) {
            const twoChar = expression.substring(i, i + 2);
            if (['>=', '<=', '==', '!='].includes(twoChar)) {
                tokens.push({ type: 'COMPARISON', value: twoChar });
                i += 2;
                continue;
            }
        }
        
        // Match single character comparison operators (>, <, =)
        if (['>', '<', '='].includes(expression[i])) {
            // Check if = is part of == (already handled above) or standalone
            if (expression[i] === '=' && i + 1 < expression.length && expression[i + 1] === '=') {
                // This is ==, should have been caught above, but handle it
                tokens.push({ type: 'COMPARISON', value: '==' });
                i += 2;
            } else if (expression[i] === '=') {
                // Single = for string comparison
                tokens.push({ type: 'COMPARISON', value: '=' });
                i++;
            } else {
                tokens.push({ type: 'COMPARISON', value: expression[i] });
                i++;
            }
            continue;
        }
        
        // Match operators
        if (['+', '-', '*', '/', '(', ')', ','].includes(expression[i])) {
            tokens.push({ type: expression[i], value: expression[i] });
            i++;
            continue;
        }
        
        // Match identifiers (function names, column names)
        if (/[a-zA-Z_]/.test(expression[i])) {
            let ident = '';
            while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
                ident += expression[i];
                i++;
            }
            tokens.push({ type: 'IDENTIFIER', value: ident });
            continue;
        }
        
        throw new Error(`Unexpected character: ${expression[i]}`);
    }
    
    return tokens;
}

/**
 * Parses tokens into an AST using recursive descent
 * Supports: +, -, *, / with proper precedence
 * Supports: >, <, >=, <=, ==, != for comparisons
 * @param {Array} tokens - Array of tokens
 * @returns {Object} AST node
 */
function parse(tokens) {
    let index = 0;
    
    function parseExpression() {
        return parseConditional();
    }
    
    function parseConditional() {
        return parseComparison();
    }
    
    function parseComparison() {
        let left = parseAddition();
        
        // Check for comparison operators
        if (index < tokens.length && tokens[index].type === 'COMPARISON') {
            const op = tokens[index].value;
            index++;
            const right = parseAddition();
            return { type: 'COMPARISON', operator: op, left, right };
        }
        
        return left;
    }
    
    function parseAddition() {
        let left = parseMultiplication();
        
        while (index < tokens.length && (tokens[index].type === '+' || tokens[index].type === '-')) {
            const op = tokens[index].type;
            index++;
            const right = parseMultiplication();
            left = { type: 'BINARY_OP', operator: op, left, right };
        }
        
        return left;
    }
    
    function parseMultiplication() {
        let left = parsePrimary();
        
        while (index < tokens.length && (tokens[index].type === '*' || tokens[index].type === '/')) {
            const op = tokens[index].type;
            index++;
            const right = parsePrimary();
            left = { type: 'BINARY_OP', operator: op, left, right };
        }
        
        return left;
    }
    
    function parsePrimary() {
        if (index >= tokens.length) {
            throw new Error('Unexpected end of expression');
        }
        
        const token = tokens[index];
        
        // Number
        if (token.type === 'NUMBER') {
            index++;
            return { type: 'NUMBER', value: token.value };
        }
        
        // String literal
        if (token.type === 'STRING') {
            index++;
            return { type: 'STRING', value: token.value };
        }
        
        // Function call
        if (token.type === 'IDENTIFIER' && index + 1 < tokens.length && tokens[index + 1].type === '(') {
            const funcName = token.value.toUpperCase();
            index++; // consume identifier
            index++; // consume (
            
            const args = [];
            if (tokens[index].type !== ')') {
                args.push(parseExpression());
                while (tokens[index].type === ',') {
                    index++; // consume ,
                    args.push(parseExpression());
                }
            }
            
            if (tokens[index].type !== ')') {
                throw new Error('Expected ) after function arguments');
            }
            index++; // consume )
            
            return { type: 'FUNCTION', name: funcName, args };
        }
        
        // Column reference (identifier)
        if (token.type === 'IDENTIFIER') {
            index++;
            return { type: 'COLUMN', name: token.value };
        }
        
        // Parentheses
        if (token.type === '(') {
            index++; // consume (
            const expr = parseExpression();
            if (tokens[index].type !== ')') {
                throw new Error('Expected )');
            }
            index++; // consume )
            return expr;
        }
        
        throw new Error(`Unexpected token: ${token.type}`);
    }
    
    const ast = parseExpression();
    
    if (index < tokens.length) {
        throw new Error(`Unexpected token at position ${index}`);
    }
    
    return ast;
}

/**
 * Evaluates the AST against a dataset
 * @param {Object} node - AST node
 * @param {Object} dataset - Dataset object
 * @returns {number} Calculated value
 */
function evaluate(node, dataset) {
    switch (node.type) {
        case 'NUMBER':
            return node.value;
            
        case 'STRING':
            return node.value;
            
        case 'COLUMN':
            // For text comparisons, we need to get the column value
            // But we can't evaluate a column directly - it needs context
            // For now, throw an error and suggest using a function
            throw new Error(`Column "${node.name}" must be used within a function (e.g., SUM(${node.name})) or for text comparison use a function that returns text`);
            
        case 'FUNCTION':
            return evaluateFunction(node.name, node.args, dataset);
            
        case 'BINARY_OP':
            const left = evaluate(node.left, dataset);
            const right = evaluate(node.right, dataset);
            
            switch (node.operator) {
                case '+':
                    return left + right;
                case '-':
                    return left - right;
                case '*':
                    return left * right;
                case '/':
                    if (right === 0) {
                        throw new Error('Division by zero');
                    }
                    return left / right;
                default:
                    throw new Error(`Unknown operator: ${node.operator}`);
            }
            
        case 'COMPARISON':
            const compLeft = evaluate(node.left, dataset);
            const compRight = evaluate(node.right, dataset);
            
            // Handle both numeric and string comparisons
            const leftIsString = typeof compLeft === 'string';
            const rightIsString = typeof compRight === 'string';
            
            // If either side is a string, do string comparison
            if (leftIsString || rightIsString) {
                const leftStr = String(compLeft);
                const rightStr = String(compRight);
                
                switch (node.operator) {
                    case '=':
                    case '==':
                        return leftStr === rightStr ? 1 : 0;
                    case '!=':
                        return leftStr !== rightStr ? 1 : 0;
                    case '>':
                        return leftStr.localeCompare(rightStr) > 0 ? 1 : 0;
                    case '<':
                        return leftStr.localeCompare(rightStr) < 0 ? 1 : 0;
                    case '>=':
                        return leftStr.localeCompare(rightStr) >= 0 ? 1 : 0;
                    case '<=':
                        return leftStr.localeCompare(rightStr) <= 0 ? 1 : 0;
                    default:
                        throw new Error(`Unknown comparison operator: ${node.operator}`);
                }
            }
            
            // Numeric comparison
            const leftNum = Number(compLeft);
            const rightNum = Number(compRight);
            
            if (isNaN(leftNum) || isNaN(rightNum)) {
                throw new Error(`Cannot compare non-numeric values: ${compLeft} and ${compRight}`);
            }
            
            switch (node.operator) {
                case '>':
                    return leftNum > rightNum ? 1 : 0;
                case '<':
                    return leftNum < rightNum ? 1 : 0;
                case '>=':
                    return leftNum >= rightNum ? 1 : 0;
                case '<=':
                    return leftNum <= rightNum ? 1 : 0;
                case '=':
                case '==':
                    return leftNum === rightNum ? 1 : 0;
                case '!=':
                    return leftNum !== rightNum ? 1 : 0;
                default:
                    throw new Error(`Unknown comparison operator: ${node.operator}`);
            }
            
        default:
            throw new Error(`Unknown node type: ${node.type}`);
    }
}

/**
 * Evaluates a function call
 * @param {string} funcName - Function name (uppercase)
 * @param {Array} args - Function arguments (AST nodes)
 * @param {Object} dataset - Dataset object
 * @returns {number|string} Function result
 */
function evaluateFunction(funcName, args, dataset) {
    // Handle IF function specially
    if (funcName === 'IF') {
        if (args.length !== 3) {
            throw new Error('IF function expects exactly 3 arguments: IF(condition, value_if_true, value_if_false)');
        }
        
        const condition = evaluate(args[0], dataset);
        // Treat non-zero as true, zero as false
        const isTrue = condition !== 0 && !isNaN(condition);
        
        if (isTrue) {
            return evaluate(args[1], dataset);
        } else {
            return evaluate(args[2], dataset);
        }
    }
    
    // Handle TEXT function - returns first text value from a column
    if (funcName === 'TEXT' || funcName === 'FIRST_TEXT') {
        if (args.length !== 1) {
            throw new Error('TEXT function expects exactly 1 argument (column name)');
        }
        
        const argNode = args[0];
        if (argNode.type !== 'COLUMN') {
            throw new Error('TEXT function expects a column name as argument');
        }
        
        const columnName = argNode.name;
        
        // Check if column exists
        if (!dataset.columns.includes(columnName)) {
            throw new Error(`Column "${columnName}" not found in dataset. Available columns: ${dataset.columns.join(', ')}`);
        }
        
        // Get the column index
        const columnIndex = dataset.columns.indexOf(columnName);
        
        // Return first non-null value as string, or empty string if no values
        if (dataset.rows && dataset.rows.length > 0) {
            for (let i = 0; i < dataset.rows.length; i++) {
                const value = dataset.rows[i][columnIndex];
                if (value !== null && value !== undefined) {
                    return String(value);
                }
            }
        }
        
        return '';
    }
    
    // All other functions expect exactly 1 argument (column name)
    if (args.length !== 1) {
        throw new Error(`Function ${funcName} expects exactly 1 argument (column name)`);
    }
    
    const argNode = args[0];
    if (argNode.type !== 'COLUMN') {
        throw new Error(`Function ${funcName} expects a column name as argument`);
    }
    
    const columnName = argNode.name;
    
    // Check if column exists
    if (!dataset.columns.includes(columnName)) {
        throw new Error(`Column "${columnName}" not found in dataset. Available columns: ${dataset.columns.join(', ')}`);
    }
    
    // Call the appropriate calculation function
    // Function names are case-insensitive
    const funcUpper = funcName.toUpperCase();
    switch (funcUpper) {
        case 'MEAN':
        case 'AVG':
        case 'AVERAGE':
            return calculateMean(dataset.rows, dataset.columns, columnName);
            
        case 'SUM':
            return calculateSum(dataset.rows, dataset.columns, columnName);
            
        case 'MIN':
        case 'MINIMUM':
            return calculateMin(dataset.rows, dataset.columns, columnName);
            
        case 'MAX':
        case 'MAXIMUM':
            return calculateMax(dataset.rows, dataset.columns, columnName);
            
        case 'STDDEV':
        case 'STDEV':
            return calculateStdev(dataset.rows, dataset.columns, columnName);
            
        case 'COUNT':
            return calculateCount(dataset.rows, dataset.columns, columnName);
            
        case 'COUNT_DISTINCT':
        case 'COUNTDISTINCT':
            return calculateCountDistinct(dataset.rows, dataset.columns, columnName);
            
        default:
            throw new Error(`Unknown function: ${funcName}. Supported functions: SUM, MEAN, MIN, MAX, STDDEV, COUNT, COUNT_DISTINCT, IF, TEXT`);
    }
}


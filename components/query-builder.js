// Query Builder Component
// SQL editor → Dataset

import { executeSQL } from '../utils/sql-engine.js';
import { getAllTables } from '../utils/sql-engine.js';
import { Modal } from '../utils/modal.js';

export class QueryBuilder {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.datasetCallbacks = [];
        this.currentResult = null;
        this.currentDatasetId = null; // Track if we're editing an existing dataset
        this.editor = null;
        this.init();
    }
    
    async init() {
        await this.loadMonaco();
        this.render();
        this.attachEventListeners();
        this.initMonacoEditor();
    }
    
    async loadMonaco() {
        return new Promise((resolve, reject) => {
            if (window.monaco) {
                resolve();
                return;
            }
            
            require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
            require(['vs/editor/editor.main'], () => {
                resolve();
            }, (err) => {
                reject(err);
            });
        });
    }
    
    render() {
        this.container.innerHTML = `
            <div class="query-builder">
                <div class="sql-editor-wrapper">
                    <div id="monaco-editor-container" class="monaco-editor-container"></div>
                </div>
                <div class="query-actions">
                    <button id="run-query" class="btn btn-primary">Run Query</button>
                    <button id="clear-query" class="btn btn-secondary">Clear</button>
                </div>
                <div id="query-results" class="query-results">
                    <div class="results-table-container">
                        <table id="results-table" class="results-table">
                            <thead id="results-thead"></thead>
                            <tbody id="results-tbody">
                                <tr>
                                    <td colspan="100%" class="empty-placeholder">No results yet. Run a query to see results.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="results-actions">
                        <button id="save-dataset" class="btn btn-primary" disabled>Save as Dataset</button>
                        <button id="update-dataset" class="btn btn-secondary" disabled style="display: none;">Update Dataset</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    initMonacoEditor() {
        const container = this.container.querySelector('#monaco-editor-container');
        if (!container || !window.monaco) {
            console.error('Monaco Editor not loaded');
            return;
        }
        
        // Get table and column information for autocomplete
        const tables = getAllTables();
        const tableSchemas = {};
        tables.forEach(table => {
            tableSchemas[table.name] = table.columns;
        });
        
        // Configure SQL language with custom autocomplete
        monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (model, position) => {
                const textUntilPosition = model.getValueInRange({
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                });
                
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };
                
                const suggestions = [];
                const textLower = textUntilPosition.toLowerCase();
                
                // SQL Keywords
                const sqlKeywords = [
                    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
                    'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'INNER JOIN',
                    'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'ON', 'AS', 'DISTINCT', 'COUNT',
                    'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
                    'IS NULL', 'IS NOT NULL', 'UNION', 'UNION ALL'
                ];
                
                // Context-aware suggestions
                if (textLower.match(/from\s+(\w*)$/)) {
                    // After FROM, suggest tables
                    tables.forEach(table => {
                        if (table.name.toLowerCase().startsWith(word.word.toLowerCase())) {
                            suggestions.push({
                                label: table.name,
                                kind: monaco.languages.CompletionItemKind.Class,
                                insertText: table.name,
                                detail: table.description,
                                range: range
                            });
                        }
                    });
                } else if (textLower.match(/select\s+(.*?)(?:\s+from|$)/i) || textLower.match(/where\s+(.*?)$/i)) {
                    // In SELECT or WHERE, suggest columns
                    const fromMatch = textLower.match(/from\s+(\w+)/);
                    if (fromMatch) {
                        const tableName = fromMatch[1];
                        if (tableSchemas[tableName]) {
                            tableSchemas[tableName].forEach(col => {
                                if (col.toLowerCase().startsWith(word.word.toLowerCase())) {
                                    suggestions.push({
                                        label: col,
                                        kind: monaco.languages.CompletionItemKind.Field,
                                        insertText: col,
                                        range: range
                                    });
                                }
                            });
                        }
                    }
                    // Also suggest all columns from all tables
                    Object.entries(tableSchemas).forEach(([table, columns]) => {
                        columns.forEach(col => {
                            if (col.toLowerCase().startsWith(word.word.toLowerCase())) {
                                suggestions.push({
                                    label: `${table}.${col}`,
                                    kind: monaco.languages.CompletionItemKind.Field,
                                    insertText: `${table}.${col}`,
                                    detail: `Column from ${table}`,
                                    range: range
                                });
                            }
                        });
                    });
                }
                
                // Always suggest SQL keywords
                sqlKeywords.forEach(keyword => {
                    if (keyword.toLowerCase().startsWith(word.word.toLowerCase())) {
                        suggestions.push({
                            label: keyword,
                            kind: monaco.languages.CompletionItemKind.Keyword,
                            insertText: keyword,
                            range: range
                        });
                    }
                });
                
                // Also suggest table names
                tables.forEach(table => {
                    if (table.name.toLowerCase().startsWith(word.word.toLowerCase())) {
                        suggestions.push({
                            label: table.name,
                            kind: monaco.languages.CompletionItemKind.Class,
                            insertText: table.name,
                            detail: table.description,
                            range: range
                        });
                    }
                });
                
                return { suggestions: suggestions.slice(0, 50) };
            },
            triggerCharacters: ['.', ' ']
        });
        
        // Create editor instance
        this.editor = monaco.editor.create(container, {
            value: '',
            language: 'sql',
            theme: 'vs',
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
            lineNumbers: 'on',
            roundedSelection: false,
            cursorStyle: 'line',
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
                other: true,
                comments: false,
                strings: false
            },
            tabSize: 2,
            insertSpaces: true
        });
        
        // Add placeholder
        this.editor.onDidChangeModelContent(() => {
            const value = this.editor.getValue();
            if (value === '') {
                container.classList.add('empty');
            } else {
                container.classList.remove('empty');
            }
        });
    }
    
    attachEventListeners() {
        const runBtn = this.container.querySelector('#run-query');
        const clearBtn = this.container.querySelector('#clear-query');
        const saveBtn = this.container.querySelector('#save-dataset');
        const updateBtn = this.container.querySelector('#update-dataset');
        
        runBtn.addEventListener('click', () => this.executeQuery());
        clearBtn.addEventListener('click', () => this.clearQuery());
        saveBtn.addEventListener('click', () => this.saveAsDataset());
        updateBtn.addEventListener('click', () => this.updateDataset());
    }
    
    async executeQuery() {
        if (!this.editor) return;
        
        const query = this.editor.getValue().trim();
        const saveBtn = this.container.querySelector('#save-dataset');
        const runBtn = this.container.querySelector('#run-query');
        
        if (!query) {
            this.showError('Please enter a SQL query.');
            return;
        }
        
        // Show loading state
        runBtn.disabled = true;
        runBtn.textContent = 'Running...';
        this.showLoading();
        
        try {
            // Execute SQL query with mock engine
            const sqlResult = await executeSQL(query, 500);
            
            // Check if result is empty
            if (!sqlResult || !sqlResult.columns || sqlResult.columns.length === 0) {
                this.showError('Query executed successfully but returned no columns. Please check your SELECT clause.');
                this.currentResult = null;
                saveBtn.disabled = true;
                return;
            }
            
            if (!sqlResult.rows || sqlResult.rows.length === 0) {
                // Empty result set is valid - show message
                const result = {
                    id: `result_${Date.now()}`,
                    name: 'Query Result',
                    data: [],
                    columns: sqlResult.columns,
                    query: query
                };
                this.currentResult = result;
                this.displayResults(result);
                saveBtn.disabled = false;
                return;
            }
            
            // Convert rows (array of arrays) to data (array of objects)
            const data = sqlResult.rows.map(row => {
                const rowObj = {};
                sqlResult.columns.forEach((column, index) => {
                    rowObj[column] = row[index];
                });
                return rowObj;
            });
            
            // Create result object in expected format
            const result = {
                id: `result_${Date.now()}`,
                name: 'Query Result',
                data: data,
                columns: sqlResult.columns,
                query: query
            };
            
            this.currentResult = result;
            this.displayResults(result);
            saveBtn.disabled = false;
        } catch (error) {
            // Provide user-friendly error messages
            let errorMessage = 'An error occurred while executing the query.';
            
            if (error.message) {
                if (error.message.includes('empty')) {
                    errorMessage = 'SQL query cannot be empty. Please enter a query.';
                } else if (error.message.includes('SELECT')) {
                    errorMessage = error.message;
                } else if (error.message.includes('FROM')) {
                    errorMessage = error.message;
                } else if (error.message.includes('Table')) {
                    errorMessage = error.message;
                } else if (error.message.includes('column')) {
                    errorMessage = error.message;
                } else {
                    errorMessage = `SQL Error: ${error.message}`;
                }
            }
            
            this.showError(errorMessage);
            this.currentResult = null;
            saveBtn.disabled = true;
        } finally {
            // Reset button state
            runBtn.disabled = false;
            runBtn.textContent = 'Run Query';
        }
    }
    
    showLoading() {
        const thead = this.container.querySelector('#results-thead');
        const tbody = this.container.querySelector('#results-tbody');
        
        thead.innerHTML = '';
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="empty-placeholder">Executing query...</td>
            </tr>
        `;
    }
    
    displayResults(result) {
        const thead = this.container.querySelector('#results-thead');
        const tbody = this.container.querySelector('#results-tbody');
        const saveBtn = this.container.querySelector('#save-dataset');
        
        // Clear previous results
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        // Validate result structure
        if (!result || !result.columns || !Array.isArray(result.columns) || result.columns.length === 0) {
            // Show empty placeholder
            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" class="empty-placeholder">No results yet. Run a query to see results.</td>
                </tr>
            `;
            saveBtn.disabled = true;
            return;
        }
        
        // Build table header dynamically from columns
        const headerRow = document.createElement('tr');
        result.columns.forEach(column => {
            const th = document.createElement('th');
            // Format column name (replace underscores with spaces, capitalize)
            th.textContent = this.formatColumnName(column);
            th.setAttribute('data-column', column); // Store original column name
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        
        // Build table body dynamically from rows
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            result.data.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');
                result.columns.forEach(column => {
                    const td = document.createElement('td');
                    const value = row[column];
                    
                    // Format cell value based on data type
                    td.textContent = this.formatCellValue(value);
                    
                    // Add data attribute for potential styling/filtering
                    td.setAttribute('data-column', column);
                    td.setAttribute('data-value', value !== null && value !== undefined ? String(value) : '');
                    
                    // Add class for numeric values for potential right-alignment
                    if (this.isNumeric(value)) {
                        td.classList.add('numeric');
                    }
                    
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
        } else {
            // Empty result set - show message spanning all columns
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = result.columns.length;
            emptyCell.className = 'empty-placeholder';
            emptyCell.textContent = 'Query executed successfully. No rows returned.';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
        }
        
        saveBtn.disabled = false;
    }
    
    /**
     * Formats column name for display
     * @param {string} column - Column name
     * @returns {string}
     */
    formatColumnName(column) {
        return column
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }
    
    /**
     * Formats cell value for display
     * @param {any} value - Cell value
     * @returns {string}
     */
    formatCellValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        // Format numbers with appropriate precision
        if (typeof value === 'number') {
            // Check if it's an integer or float
            if (Number.isInteger(value)) {
                return String(value);
            } else {
                // Format floats to 2 decimal places, but remove trailing zeros
                return parseFloat(value.toFixed(2)).toString();
            }
        }
        
        // Format dates if they're in ISO format
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString();
                }
            } catch (e) {
                // If date parsing fails, return original string
            }
        }
        
        return String(value);
    }
    
    /**
     * Checks if a value is numeric
     * @param {any} value - Value to check
     * @returns {boolean}
     */
    isNumeric(value) {
        return typeof value === 'number' && !isNaN(value);
    }
    
    showError(message) {
        const thead = this.container.querySelector('#results-thead');
        const tbody = this.container.querySelector('#results-tbody');
        const saveBtn = this.container.querySelector('#save-dataset');
        
        thead.innerHTML = '';
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="error-message">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">${this.escapeHtml(message)}</div>
                </td>
            </tr>
        `;
        saveBtn.disabled = true;
    }
    
    clearQuery() {
        if (this.editor) {
            this.editor.setValue('');
        }
        
        const thead = this.container.querySelector('#results-thead');
        const tbody = this.container.querySelector('#results-tbody');
        const saveBtn = this.container.querySelector('#save-dataset');
        const updateBtn = this.container.querySelector('#update-dataset');
        
        thead.innerHTML = '';
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="empty-placeholder">No results yet. Run a query to see results.</td>
            </tr>
        `;
        saveBtn.disabled = true;
        saveBtn.style.display = 'inline-block';
        updateBtn.style.display = 'none';
        updateBtn.disabled = true;
        this.currentResult = null;
        this.currentDatasetId = null;
    }
    
    async saveAsDataset() {
        if (!this.currentResult) {
            await Modal.alert('No query results to save. Please run a query first.');
            return;
        }
        
        try {
            // Import datasetStore
            const { datasetStore } = await import('../data/datasets.js');
            
            // Get dataset name from user
            const datasetName = await Modal.prompt('Enter a name for this dataset:', `Dataset ${new Date().toLocaleString()}`);
            
            if (!datasetName || !datasetName.trim()) {
                return; // User cancelled or entered empty name
            }
            
            // Validate that we have columns
            const columns = this.currentResult.columns || [];
            if (columns.length === 0) {
                await Modal.alert('Cannot save dataset: No columns found in query results.');
                return;
            }
            
            // Convert data (array of objects) to rows (array of arrays)
            const data = this.currentResult.data || [];
            const rows = data.map(row => {
                if (!row || typeof row !== 'object') {
                    // If row is not an object, return empty array for this row
                    return columns.map(() => null);
                }
                return columns.map(column => {
                    // Handle case where column might not exist in row
                    return row.hasOwnProperty(column) ? row[column] : null;
                });
            });
            
            // Get the SQL query from currentResult or from the SQL editor
            const sqlEditor = this.container.querySelector('#sql-editor');
            const sqlQuery = this.currentResult.query || (sqlEditor ? sqlEditor.value.trim() : '');
            
            // Create dataset with SQL, columns, and rows
            const dataset = datasetStore.create(
                datasetName.trim(),
                sqlQuery,
                columns,
                rows
            );
            
            // Notify listeners
            this.notifyDatasetCreated(dataset);
            
            // Refresh table browser if callback exists
            if (this.refreshTableBrowserCallback) {
                this.refreshTableBrowserCallback();
            }
            
            // Show success message
            await Modal.alert(`Dataset "${datasetName}" saved successfully! (ID: ${dataset.id})`);
        } catch (error) {
            console.error('Error saving dataset:', error);
            await Modal.alert(`Failed to save dataset: ${error.message || 'Unknown error'}`);
        }
    }
    
    /**
     * Sets a callback to refresh the table browser when queries are saved/updated
     */
    onRefreshTableBrowser(callback) {
        this.refreshTableBrowserCallback = callback;
    }
    
    /**
     * Sets a callback for when datasets are deleted
     */
    onDatasetDeleted(callback) {
        this.onDatasetDeletedCallback = callback;
    }
    
    onDatasetCreated(callback) {
        this.datasetCallbacks.push(callback);
    }
    
    notifyDatasetCreated(dataset) {
        this.datasetCallbacks.forEach(callback => callback(dataset));
    }
    
    // Autocomplete methods
    handleInput(e) {
        this.updateSuggestions();
    }
    
    handleKeyDown(e) {
        const sqlEditor = this.container.querySelector('#sql-editor');
        
        // Handle Tab for autocomplete completion
        if (e.key === 'Tab' && this.autocompleteVisible && this.suggestions.length > 0) {
            e.preventDefault();
            // If a suggestion is selected, complete it
            if (this.selectedSuggestionIndex >= 0) {
                this.insertSuggestion(this.suggestions[this.selectedSuggestionIndex]);
            } else {
                // If no suggestion selected, select and complete the first one
                this.selectedSuggestionIndex = 0;
                this.insertSuggestion(this.suggestions[0]);
            }
            return;
        }
        
        if (!this.autocompleteVisible || this.suggestions.length === 0) {
            return;
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.min(
                    this.selectedSuggestionIndex + 1,
                    this.suggestions.length - 1
                );
                this.highlightSuggestion();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
                this.highlightSuggestion();
                break;
                
            case 'Enter':
                if (this.selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    this.insertSuggestion(this.suggestions[this.selectedSuggestionIndex]);
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideSuggestions();
                break;
        }
    }
    
    updateSuggestions() {
        const sqlEditor = this.container.querySelector('#sql-editor');
        const sql = sqlEditor.value;
        const cursorPosition = sqlEditor.selectionStart;
        
        this.suggestions = getSuggestions(sql, cursorPosition);
        
        if (this.suggestions.length > 0) {
            // Reset selection when new suggestions appear
            this.selectedSuggestionIndex = -1;
            this.showSuggestions();
            this.showInlineCompletion();
            // Reposition after a short delay to ensure DOM is updated
            requestAnimationFrame(() => {
                this.positionSuggestions();
                this.positionInlineCompletion();
            });
        } else {
            this.hideSuggestions();
            this.hideInlineCompletion();
        }
    }
    
    showSuggestions() {
        const sqlEditor = this.container.querySelector('#sql-editor');
        const suggestionsDiv = this.container.querySelector('#autocomplete-suggestions');
        
        if (!suggestionsDiv || this.suggestions.length === 0) {
            return;
        }
        
        // Build suggestions HTML
        suggestionsDiv.innerHTML = this.suggestions.map((suggestion, index) => {
            const typeClass = `suggestion-${suggestion.type}`;
            const selectedClass = index === this.selectedSuggestionIndex ? 'selected' : '';
            return `
                <div class="suggestion-item ${typeClass} ${selectedClass}" data-index="${index}">
                    <span class="suggestion-type">${suggestion.type}</span>
                    <span class="suggestion-text">${this.escapeHtml(suggestion.text)}</span>
                </div>
            `;
        }).join('');
        
        // Position suggestions near cursor (will be repositioned after render)
        this.positionSuggestions();
        
        // Add click handlers
        suggestionsDiv.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.insertSuggestion(this.suggestions[index]);
            });
        });
        
        suggestionsDiv.style.display = 'block';
        this.autocompleteVisible = true;
        
        // Reposition after render to get accurate measurements
        requestAnimationFrame(() => {
            this.positionSuggestions();
        });
    }
    
    hideSuggestions() {
        const suggestionsDiv = this.container.querySelector('#autocomplete-suggestions');
        if (suggestionsDiv) {
            suggestionsDiv.style.display = 'none';
        }
        this.autocompleteVisible = false;
        this.selectedSuggestionIndex = -1;
        this.hideInlineCompletion();
    }
    
    showInlineCompletion() {
        if (this.suggestions.length === 0) {
            this.hideInlineCompletion();
            return;
        }
        
        const sqlEditor = this.container.querySelector('#sql-editor');
        const inlineCompletion = this.container.querySelector('#inline-completion');
        if (!sqlEditor || !inlineCompletion) return;
        
        const sql = sqlEditor.value;
        const cursorPosition = sqlEditor.selectionStart;
        const textBeforeCursor = sql.substring(0, cursorPosition);
        const currentWord = getCurrentWord(textBeforeCursor);
        
        if (!currentWord || this.suggestions.length === 0) {
            this.hideInlineCompletion();
            return;
        }
        
        // Show the first suggestion as inline completion
        const firstSuggestion = this.suggestions[0];
        const completionText = firstSuggestion.text.substring(currentWord.length);
        
        if (completionText.length === 0) {
            this.hideInlineCompletion();
            return;
        }
        
        inlineCompletion.textContent = completionText;
        inlineCompletion.style.display = 'block';
        this.inlineCompletionVisible = true;
        this.positionInlineCompletion();
    }
    
    hideInlineCompletion() {
        const inlineCompletion = this.container.querySelector('#inline-completion');
        if (inlineCompletion) {
            inlineCompletion.style.display = 'none';
        }
        this.inlineCompletionVisible = false;
    }
    
    positionInlineCompletion() {
        const sqlEditor = this.container.querySelector('#sql-editor');
        const inlineCompletion = this.container.querySelector('#inline-completion');
        
        if (!sqlEditor || !inlineCompletion || !this.inlineCompletionVisible) return;
        
        const cursorPosition = sqlEditor.selectionStart;
        const textBeforeCursor = sqlEditor.value.substring(0, cursorPosition);
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length - 1;
        const currentColumn = lines[currentLine].length;
        
        // Create mirror to measure text width
        const mirror = document.createElement('div');
        const computedStyle = window.getComputedStyle(sqlEditor);
        
        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordWrap = 'break-word';
        mirror.style.font = computedStyle.font;
        mirror.style.fontSize = computedStyle.fontSize;
        mirror.style.fontFamily = computedStyle.fontFamily;
        mirror.style.fontWeight = computedStyle.fontWeight;
        mirror.style.letterSpacing = computedStyle.letterSpacing;
        mirror.style.wordSpacing = computedStyle.wordSpacing;
        mirror.style.padding = computedStyle.padding;
        mirror.style.border = computedStyle.border;
        mirror.style.width = computedStyle.width;
        mirror.style.boxSizing = computedStyle.boxSizing;
        mirror.style.lineHeight = computedStyle.lineHeight;
        
        mirror.textContent = lines[currentLine].substring(0, currentColumn);
        
        document.body.appendChild(mirror);
        const textWidth = mirror.offsetWidth;
        const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
        document.body.removeChild(mirror);
        
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 12;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 12;
        const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 1;
        const borderTop = parseFloat(computedStyle.borderTopWidth) || 1;
        
        const scrollTop = sqlEditor.scrollTop;
        const scrollLeft = sqlEditor.scrollLeft;
        
        const left = textWidth + paddingLeft + borderLeft - scrollLeft;
        const top = (currentLine + 1) * lineHeight + paddingTop + borderTop - scrollTop;
        
        inlineCompletion.style.left = `${left}px`;
        inlineCompletion.style.top = `${top}px`;
    }
    
    highlightSuggestion() {
        const suggestionsDiv = this.container.querySelector('#autocomplete-suggestions');
        if (!suggestionsDiv) return;
        
        const items = suggestionsDiv.querySelectorAll('.suggestion-item');
        items.forEach((item, index) => {
            if (index === this.selectedSuggestionIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    positionSuggestions() {
        const sqlEditor = this.container.querySelector('#sql-editor');
        const suggestionsDiv = this.container.querySelector('#autocomplete-suggestions');
        
        if (!sqlEditor || !suggestionsDiv) return;
        
        // Calculate cursor position in the textarea
        const cursorPosition = sqlEditor.selectionStart;
        const textBeforeCursor = sqlEditor.value.substring(0, cursorPosition);
        
        // Split text into lines to find current line
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length - 1;
        const currentColumn = lines[currentLine].length;
        
        // Create a mirror element to measure text width accurately
        const mirror = document.createElement('div');
        const computedStyle = window.getComputedStyle(sqlEditor);
        
        // Copy all relevant styles from textarea to mirror for accurate measurement
        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordWrap = 'break-word';
        mirror.style.font = computedStyle.font;
        mirror.style.fontSize = computedStyle.fontSize;
        mirror.style.fontFamily = computedStyle.fontFamily;
        mirror.style.fontWeight = computedStyle.fontWeight;
        mirror.style.fontStyle = computedStyle.fontStyle;
        mirror.style.letterSpacing = computedStyle.letterSpacing;
        mirror.style.wordSpacing = computedStyle.wordSpacing;
        mirror.style.textTransform = computedStyle.textTransform;
        mirror.style.padding = computedStyle.padding;
        mirror.style.border = computedStyle.border;
        mirror.style.width = computedStyle.width;
        mirror.style.boxSizing = computedStyle.boxSizing;
        mirror.style.lineHeight = computedStyle.lineHeight;
        mirror.style.textIndent = computedStyle.textIndent;
        
        // Set text content up to cursor on current line
        mirror.textContent = lines[currentLine].substring(0, currentColumn);
        
        document.body.appendChild(mirror);
        
        // Get measurements
        const textWidth = mirror.offsetWidth;
        const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
        
        // Clean up
        document.body.removeChild(mirror);
        
        // Get textarea position and scroll
        const editorRect = sqlEditor.getBoundingClientRect();
        const wrapper = sqlEditor.parentElement;
        
        // Calculate position relative to wrapper
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 12;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 12;
        const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 1;
        const borderTop = parseFloat(computedStyle.borderTopWidth) || 1;
        
        // Account for textarea scroll
        const scrollTop = sqlEditor.scrollTop;
        const scrollLeft = sqlEditor.scrollLeft;
        
        // Calculate absolute position at cursor
        // Position suggestions directly at cursor location
        const left = textWidth + paddingLeft + borderLeft - scrollLeft;
        const top = (currentLine + 1) * lineHeight + paddingTop + borderTop - scrollTop;
        
        // Get wrapper bounds for constraint checking
        const wrapperRect = wrapper.getBoundingClientRect();
        const wrapperLeft = wrapperRect.left - editorRect.left;
        const wrapperTop = wrapperRect.top - editorRect.top;
        
        // Ensure suggestions don't go outside wrapper horizontally
        const maxLeft = wrapperRect.width - suggestionsDiv.offsetWidth - 10;
        const adjustedLeft = Math.max(wrapperLeft + 5, Math.min(left, maxLeft));
        
        // Position vertically - try to show below cursor, but above if no room
        const spaceBelow = editorRect.height - top;
        const spaceAbove = top - lineHeight;
        const suggestionHeight = suggestionsDiv.offsetHeight;
        
        let adjustedTop;
        if (spaceBelow >= suggestionHeight + 5) {
            // Show below cursor
            adjustedTop = top + 2;
        } else if (spaceAbove >= suggestionHeight + 5) {
            // Show above cursor
            adjustedTop = top - suggestionHeight - lineHeight - 2;
        } else {
            // Show below, even if it goes outside (user can scroll)
            adjustedTop = top + 2;
        }
        
        // Ensure it doesn't go above the wrapper
        adjustedTop = Math.max(wrapperTop + 5, adjustedTop);
        
        suggestionsDiv.style.left = `${adjustedLeft}px`;
        suggestionsDiv.style.top = `${adjustedTop}px`;
    }
    
    insertSuggestion(suggestion) {
        const sqlEditor = this.container.querySelector('#sql-editor');
        const sql = sqlEditor.value;
        const cursorPosition = sqlEditor.selectionStart;
        const textBeforeCursor = sql.substring(0, cursorPosition);
        
        const wordStart = getWordStartPosition(textBeforeCursor);
        const wordEnd = cursorPosition;
        
        // Replace current word with suggestion
        const newSql = sql.substring(0, wordStart) + suggestion.text + sql.substring(wordEnd);
        
        // Update textarea
        sqlEditor.value = newSql;
        
        // Set cursor position after inserted text
        const newCursorPosition = wordStart + suggestion.text.length;
        sqlEditor.setSelectionRange(newCursorPosition, newCursorPosition);
        
        // Hide suggestions and update
        this.hideSuggestions();
        this.hideInlineCompletion();
        this.updateSuggestions();
        
        // Focus back on editor
        sqlEditor.focus();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Inserts text at the current cursor position in the SQL editor
     * @param {string} text - Text to insert
     */
    insertText(text) {
        const sqlEditor = this.container.querySelector('#sql-editor');
        if (!sqlEditor) return;
        
        const start = sqlEditor.selectionStart;
        const end = sqlEditor.selectionEnd;
        const sql = sqlEditor.value;
        
        // Insert text at cursor position
        const newSql = sql.substring(0, start) + text + sql.substring(end);
        sqlEditor.value = newSql;
        
        // Set cursor position after inserted text
        const newCursorPosition = start + text.length;
        sqlEditor.setSelectionRange(newCursorPosition, newCursorPosition);
        
        // Focus editor and update suggestions
        sqlEditor.focus();
        this.updateSuggestions();
    }
    
    
    /**
     * Loads a saved query into the editor for editing
     * @param {string} datasetId - Dataset ID to load
     */
    async loadQuery(datasetId) {
        const { datasetStore } = await import('../data/datasets.js');
        const dataset = datasetStore.get(datasetId);
        
        if (!dataset) {
            await Modal.alert('Query not found.');
            return;
        }
        
        const sqlEditor = this.container.querySelector('#sql-editor');
        const saveBtn = this.container.querySelector('#save-dataset');
        const updateBtn = this.container.querySelector('#update-dataset');
        
        // Load SQL into editor
        sqlEditor.value = dataset.sql;
        
        // Set current dataset ID for updating
        this.currentDatasetId = datasetId;
        
        // Show update button, hide save button
        saveBtn.style.display = 'none';
        updateBtn.style.display = 'inline-block';
        updateBtn.disabled = false;
        
        // Execute the query to show results
        await this.executeQuery();
        
        // Focus editor
        sqlEditor.focus();
    }
    
    /**
     * Updates an existing dataset with current query results
     */
    async updateDataset() {
        if (!this.currentDatasetId || !this.currentResult) {
            return;
        }
        
        const { datasetStore } = await import('../data/datasets.js');
        const sqlEditor = this.container.querySelector('#sql-editor');
        const query = sqlEditor.value.trim();
        
        if (!query) {
            await Modal.alert('Please enter a SQL query.');
            return;
        }
        
        // Convert data to rows
        const columns = this.currentResult.columns || [];
        const data = this.currentResult.data || [];
        const rows = data.map(row => {
            return columns.map(column => row[column]);
        });
        
        // Update dataset
        const updated = datasetStore.update(this.currentDatasetId, {
            sql: query,
            columns: columns,
            rows: rows
        });
        
        if (updated) {
            await Modal.alert(`Dataset "${updated.name}" updated successfully!`);
            
            // Refresh table browser if callback exists
            if (this.refreshTableBrowserCallback) {
                this.refreshTableBrowserCallback();
            }
            
            // Notify listeners
            this.notifyDatasetCreated(updated);
        } else {
            await Modal.alert('Failed to update dataset.');
        }
    }
    
    /**
     * Deletes a saved query
     * @param {string} datasetId - Dataset ID to delete
     */
    async deleteQuery(datasetId) {
        const { datasetStore } = await import('../data/datasets.js');
        const dataset = datasetStore.get(datasetId);
        
        if (!dataset) {
            await Modal.alert('Query not found.');
            return;
        }
        
        const confirmed = await Modal.confirm(
            `Are you sure you want to delete "${dataset.name}"?`
        );
        
        if (!confirmed) {
            return;
        }
        
        const result = datasetStore.delete(datasetId);
        
        if (result.deleted) {
            await Modal.alert(`Query "${dataset.name}" deleted successfully.`);
            
            // Refresh table browser if callback exists
            if (this.refreshTableBrowserCallback) {
                this.refreshTableBrowserCallback();
            }
            
            // Notify about deletion
            if (this.onDatasetDeletedCallback) {
                this.onDatasetDeletedCallback(datasetId, result.dataset);
            }
            
            // If we were editing this query, clear the editor
            if (this.currentDatasetId === datasetId) {
                this.clearQuery();
            }
        } else {
            await Modal.alert('Failed to delete query.');
        }
    }
}


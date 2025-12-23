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
            
            // Wait for require to be available (from loader.js)
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds total (50 * 100ms)
            
            const checkRequire = () => {
                attempts++;
                
                if (typeof require !== 'undefined') {
                    try {
                        // Ensure require is configured
                        if (!require.config || typeof require.config !== 'function') {
                            reject(new Error('Monaco Editor require.config is not available'));
                            return;
                        }
                        
                        // Configure require with the correct base path
                        require.config({ 
                            paths: { vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' } 
                        });
                        
                        // Load the editor main module
                        require(['vs/editor/editor.main'], () => {
                            if (window.monaco) {
                                resolve();
                            } else {
                                reject(new Error('Monaco Editor failed to initialize - window.monaco is undefined'));
                            }
                        }, (err) => {
                            console.error('Monaco Editor load error:', err);
                            const errorMsg = err && err.message ? err.message : (err && err.toString ? err.toString() : 'Unknown error');
                            reject(new Error(`Failed to load Monaco Editor: ${errorMsg}`));
                        });
                    } catch (error) {
                        console.error('Error configuring Monaco Editor:', error);
                        reject(new Error(`Error configuring Monaco Editor: ${error.message || error}`));
                    }
                } else if (attempts < maxAttempts) {
                    // Retry after a short delay
                    setTimeout(checkRequire, 100);
                } else {
                    reject(new Error('Monaco Editor loader (require) not found after 5 seconds. Please ensure loader.js is loaded before app.js.'));
                }
            };
            
            // Start checking after a brief delay to ensure loader.js has loaded
            setTimeout(checkRequire, 100);
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
            insertSpaces: true,
            padding: {
                top: 12,
                bottom: 12
            },
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
                useShadows: false,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                verticalScrollbarSize: 12,
                horizontalScrollbarSize: 12
            }
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
                query: query || (this.editor ? this.editor.getValue().trim() : '')
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
            const sqlQuery = this.currentResult.query || (this.editor ? this.editor.getValue().trim() : '');
            
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
    
    /**
     * Inserts text at the current cursor position in the SQL editor
     * @param {string} text - Text to insert
     */
    insertText(text) {
        if (!this.editor) return;
        
        const selection = this.editor.getSelection();
        const range = new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
        );
        
        const op = {
            range: range,
            text: text,
            forceMoveMarkers: true
        };
        
        this.editor.executeEdits('insert-text', [op]);
        this.editor.focus();
    }
    
    
    /**
     * Loads a saved dataset into the editor for editing
     * @param {string} datasetId - Dataset ID to load
     */
    async loadDataset(datasetId) {
        try {
            const { datasetStore } = await import('../data/datasets.js');
            const dataset = datasetStore.get(datasetId);
            
            if (!dataset) {
                await Modal.alert('Dataset not found.');
                return;
            }
            
            if (!this.editor) {
                console.warn('Monaco Editor not ready yet. Please wait a moment and try again.');
                // Retry after a short delay
                setTimeout(() => this.loadDataset(datasetId), 500);
                return;
            }
            
            const saveBtn = this.container.querySelector('#save-dataset');
            const updateBtn = this.container.querySelector('#update-dataset');
            
            // Load SQL into editor
            this.editor.setValue(dataset.sql || '');
            
            // Set current dataset ID for updating
            this.currentDatasetId = datasetId;
            
            // Show update button, hide save button
            if (saveBtn) {
                saveBtn.style.display = 'none';
            }
            if (updateBtn) {
                updateBtn.style.display = 'inline-block';
                updateBtn.disabled = false;
            }
            
            // Execute the query to show results
            await this.executeQuery();
            
            // Focus editor
            this.editor.focus();
        } catch (error) {
            console.error('Error loading dataset:', error);
            await Modal.alert(`Failed to load dataset: ${error.message || 'Unknown error'}`);
        }
    }
    
    /**
     * Updates an existing dataset with current query results
     */
    async updateDataset() {
        if (!this.currentDatasetId || !this.currentResult || !this.editor) {
            return;
        }
        
        const { datasetStore } = await import('../data/datasets.js');
        const query = this.editor.getValue().trim();
        
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
     * Deletes a saved dataset
     * @param {string} datasetId - Dataset ID to delete
     */
    async deleteDataset(datasetId) {
        const { datasetStore } = await import('../data/datasets.js');
        const dataset = datasetStore.get(datasetId);
        
        if (!dataset) {
            await Modal.alert('Dataset not found.');
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
            await Modal.alert(`Dataset "${dataset.name}" deleted successfully.`);
            
            // Refresh table browser if callback exists
            if (this.refreshTableBrowserCallback) {
                this.refreshTableBrowserCallback();
            }
            
            // Notify about deletion
            if (this.onDatasetDeletedCallback) {
                this.onDatasetDeletedCallback(datasetId, result.dataset);
            }
            
            // If we were editing this dataset, clear the editor
            if (this.currentDatasetId === datasetId) {
                this.clearQuery();
            }
        } else {
            await Modal.alert('Failed to delete dataset.');
        }
    }
}


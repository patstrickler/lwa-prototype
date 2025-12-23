// Query Builder Component
// SQL editor → Dataset

import { executeSQL } from '../utils/sql-engine.js';
import { getSuggestions, getWordStartPosition } from '../utils/autocomplete.js';
import { Modal } from '../utils/modal.js';

export class QueryBuilder {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.datasetCallbacks = [];
        this.currentResult = null;
        this.suggestions = [];
        this.selectedSuggestionIndex = -1;
        this.autocompleteVisible = false;
        this.currentDatasetId = null; // Track if we're editing an existing dataset
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="query-builder">
                <div class="sql-editor-wrapper">
                    <textarea id="sql-editor" placeholder="Enter your SQL query here..."></textarea>
                    <div id="autocomplete-suggestions" class="autocomplete-suggestions" style="display: none;"></div>
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
    
    attachEventListeners() {
        const runBtn = this.container.querySelector('#run-query');
        const clearBtn = this.container.querySelector('#clear-query');
        const saveBtn = this.container.querySelector('#save-dataset');
        const updateBtn = this.container.querySelector('#update-dataset');
        const sqlEditor = this.container.querySelector('#sql-editor');
        
        runBtn.addEventListener('click', () => this.executeQuery());
        clearBtn.addEventListener('click', () => this.clearQuery());
        saveBtn.addEventListener('click', () => this.saveAsDataset());
        updateBtn.addEventListener('click', () => this.updateDataset());
        
        // Autocomplete event listeners
        sqlEditor.addEventListener('input', (e) => this.handleInput(e));
        sqlEditor.addEventListener('keydown', (e) => this.handleKeyDown(e));
        sqlEditor.addEventListener('click', () => this.updateSuggestions());
        sqlEditor.addEventListener('scroll', () => this.updateSuggestions());
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }
    
    async executeQuery() {
        const sqlEditor = this.container.querySelector('#sql-editor');
        const query = sqlEditor.value.trim();
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
        const sqlEditor = this.container.querySelector('#sql-editor');
        const thead = this.container.querySelector('#results-thead');
        const tbody = this.container.querySelector('#results-tbody');
        const saveBtn = this.container.querySelector('#save-dataset');
        const updateBtn = this.container.querySelector('#update-dataset');
        
        sqlEditor.value = '';
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
            return;
        }
        
        // Import datasetStore
        const { datasetStore } = await import('../data/datasets.js');
        const datasetName = await Modal.prompt('Enter a name for this dataset:', `Dataset ${new Date().toLocaleString()}`);
        
        if (!datasetName || !datasetName.trim()) {
            return; // User cancelled or entered empty name
        }
        
        // Convert data (array of objects) to rows (array of arrays)
        const columns = this.currentResult.columns || [];
        const data = this.currentResult.data || [];
        const rows = data.map(row => {
            return columns.map(column => row[column]);
        });
        
        // Create dataset with SQL, columns, and rows
        const dataset = datasetStore.create(
            datasetName.trim(),
            this.currentResult.query || '',
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
    }
    
    /**
     * Sets a callback to refresh the table browser when queries are saved/updated
     */
    onRefreshTableBrowser(callback) {
        this.refreshTableBrowserCallback = callback;
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
        const suggestionsDiv = this.container.querySelector('#autocomplete-suggestions');
        
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
            case 'Tab':
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
            this.selectedSuggestionIndex = -1;
            this.showSuggestions();
        } else {
            this.hideSuggestions();
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
        
        // Position suggestions near cursor
        this.positionSuggestions();
        
        // Add click handlers
        suggestionsDiv.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.insertSuggestion(this.suggestions[index]);
            });
        });
        
        suggestionsDiv.style.display = 'block';
        this.autocompleteVisible = true;
    }
    
    hideSuggestions() {
        const suggestionsDiv = this.container.querySelector('#autocomplete-suggestions');
        if (suggestionsDiv) {
            suggestionsDiv.style.display = 'none';
        }
        this.autocompleteVisible = false;
        this.selectedSuggestionIndex = -1;
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
        
        // Simple positioning: place dropdown below the textarea
        // For more precise positioning, we'd need to calculate cursor position
        // which is complex with textareas. This simpler approach works well.
        const wrapper = sqlEditor.parentElement;
        const wrapperRect = wrapper.getBoundingClientRect();
        const editorRect = sqlEditor.getBoundingClientRect();
        
        // Position relative to wrapper
        suggestionsDiv.style.left = '0px';
        suggestionsDiv.style.top = `${editorRect.height + 2}px`;
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
        
        const deleted = datasetStore.delete(datasetId);
        
        if (deleted) {
            await Modal.alert(`Query "${dataset.name}" deleted successfully.`);
            
            // Refresh table browser if callback exists
            if (this.refreshTableBrowserCallback) {
                this.refreshTableBrowserCallback();
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


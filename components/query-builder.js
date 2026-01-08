// Query Builder Component
// SQL editor → Dataset

import { executeSQL } from '../utils/sql-engine.js';
import { getAllTables } from '../utils/sql-engine.js';
import { Modal } from '../utils/modal.js';
import { getSuggestions, getWordStartPosition } from '../utils/autocomplete.js';

export class QueryBuilder {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.datasetCallbacks = [];
        this.currentResult = null;
        this.currentDatasetId = null; // Track if we're editing an existing dataset
        this.editor = null; // Will be the textarea element
        this.columnMetadata = {}; // Store metadata for hover tooltips
        this.fullQuery = null; // Store the full query without LIMIT
        this.totalRecordCount = null; // Store total record count
        this.selectedColumns = []; // Track selected columns for auto-query generation
        this.selectedTables = new Set(); // Track selected tables
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="query-builder">
                <div class="sql-editor-wrapper" id="query-drop-zone">
                    <div class="drop-zone-indicator" id="drop-zone-indicator" style="display: none;">
                        <span class="material-symbols-outlined">add_circle</span>
                        <span>Drop column here to add to query</span>
                    </div>
                    <textarea id="sql-editor" class="sql-editor" placeholder="Enter your SQL query here or drag columns from the database tables..."></textarea>
                    <div id="sql-autocomplete-suggestions" class="autocomplete-suggestions" style="display: none;"></div>
                </div>
                <div class="query-actions">
                    <div class="query-controls">
                        <label for="preview-limit" class="record-limit-label">Preview Limit:</label>
                        <select id="preview-limit" class="record-limit-select">
                            <option value="10" selected>10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="250">250</option>
                            <option value="500">500</option>
                            <option value="1000">1000</option>
                            <option value="0">All</option>
                        </select>
                        <span id="total-records-indicator" class="total-records-indicator" style="display: none;"></span>
                    </div>
                    <div class="query-buttons">
                        <button id="save-dataset" class="btn btn-primary" disabled>Save as Dataset</button>
                        <button id="update-dataset" class="btn btn-secondary" disabled style="display: none;">Update Dataset</button>
                        <div class="button-separator"></div>
                        <button id="run-query" class="btn btn-primary">Run Query</button>
                        <button id="clear-query" class="btn btn-secondary">Clear</button>
                    </div>
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
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        // Get the textarea element
        this.editor = this.container.querySelector('#sql-editor');
        
        const runBtn = this.container.querySelector('#run-query');
        const clearBtn = this.container.querySelector('#clear-query');
        const saveBtn = this.container.querySelector('#save-dataset');
        const updateBtn = this.container.querySelector('#update-dataset');
        
        if (!this.editor || !runBtn || !clearBtn || !saveBtn || !updateBtn) {
            console.error('Query builder elements not found');
            return;
        }
        
        // Autocomplete state
        this.suggestions = [];
        this.selectedSuggestionIndex = -1;
        this.autocompleteVisible = false;
        
        // Input handler for autocomplete
        this.editor.addEventListener('input', (e) => this.handleInput(e));
        this.editor.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideSuggestions();
            }
        });
        
        runBtn.addEventListener('click', () => this.executeQuery());
        clearBtn.addEventListener('click', () => this.clearQuery());
        saveBtn.addEventListener('click', () => this.saveAsDataset());
        updateBtn.addEventListener('click', () => this.updateDataset());
        
        // Preview limit change handler - update display without re-running query
        const previewLimitSelect = this.container.querySelector('#preview-limit');
        if (previewLimitSelect) {
            previewLimitSelect.addEventListener('change', () => {
                if (this.currentResult && this.currentResult.data) {
                    this.updatePreviewDisplay();
                }
            });
        }
        
        // Drag and drop handlers
        this.setupDragAndDrop();
    }
    
    /**
     * Updates the preview display based on current preview limit
     * without re-running the query
     */
    updatePreviewDisplay() {
        const previewLimitSelect = this.container.querySelector('#preview-limit');
        const previewLimit = previewLimitSelect ? parseInt(previewLimitSelect.value, 10) : 10;
        
        if (!this.currentResult || !this.currentResult.data) {
            return;
        }
        
        // Get preview data based on limit
        const previewData = previewLimit > 0 && previewLimit < this.currentResult.data.length 
            ? this.currentResult.data.slice(0, previewLimit)
            : this.currentResult.data;
        
        // Create preview result
        const previewResult = {
            ...this.currentResult,
            data: previewData
        };
        
        // Update display
        this.displayResults(previewResult);
    }
    
    setupDragAndDrop() {
        const dropZone = this.container.querySelector('#query-drop-zone');
        const dropIndicator = this.container.querySelector('#drop-zone-indicator');
        
        if (!dropZone) return;
        
        // Prevent default drag behavior
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            dropIndicator.style.display = 'flex';
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            // Only hide if we're leaving the drop zone entirely
            if (!dropZone.contains(e.relatedTarget)) {
                dropIndicator.style.display = 'none';
                dropZone.classList.remove('drag-over');
            }
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropIndicator.style.display = 'none';
            dropZone.classList.remove('drag-over');
            
            try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                if (data.table && data.column) {
                    this.addColumnToQuery(data.table, data.column);
                }
            } catch (error) {
                console.error('Error parsing drag data:', error);
            }
        });
    }
    
    /**
     * Adds a column to the query and regenerates SQL
     * @param {string} tableName - Name of the table
     * @param {string} columnName - Name of the column
     */
    addColumnToQuery(tableName, columnName) {
        // Check if column is already selected
        const existingIndex = this.selectedColumns.findIndex(
            col => col.table === tableName && col.column === columnName
        );
        
        if (existingIndex === -1) {
            // Add new column
            this.selectedColumns.push({ table: tableName, column: columnName });
            this.selectedTables.add(tableName);
        } else {
            // Remove if already selected (toggle behavior)
            this.selectedColumns.splice(existingIndex, 1);
            // Check if table is still needed
            const tableStillNeeded = this.selectedColumns.some(col => col.table === tableName);
            if (!tableStillNeeded) {
                this.selectedTables.delete(tableName);
            }
        }
        
        // Regenerate query
        this.generateQueryFromSelections();
    }
    
    /**
     * Generates SQL query from selected columns and tables
     */
    generateQueryFromSelections() {
        if (this.selectedColumns.length === 0) {
            this.editor.value = '';
            return;
        }
        
        // Build SELECT clause
        const selectClause = this.selectedColumns
            .map(col => `${col.table}.${col.column}`)
            .join(', ');
        
        // Determine primary table (first table selected)
        const primaryTable = Array.from(this.selectedTables)[0];
        
        // Build FROM clause
        let fromClause = primaryTable;
        
        // Build JOIN clauses
        const joinClauses = this.buildJoinClauses(primaryTable);
        
        // Combine into full query
        const query = `SELECT ${selectClause}\nFROM ${fromClause}${joinClauses.length > 0 ? '\n' + joinClauses.join('\n') : ''}`;
        
        // Update editor
        this.editor.value = query;
        
        // Trigger input event to update autocomplete
        this.editor.dispatchEvent(new Event('input'));
    }
    
    /**
     * Builds JOIN clauses based on table relationships
     * @param {string} primaryTable - Primary table name
     * @returns {string[]} Array of JOIN clause strings
     */
    buildJoinClauses(primaryTable) {
        const joins = [];
        const allTables = getAllTables();
        const tableMap = {};
        allTables.forEach(t => {
            tableMap[t.name.toLowerCase()] = t;
        });
        
        // Define relationships (foreign key patterns)
        const relationships = {
            'results': [
                { foreignKey: 'sample_id', references: 'samples', referenceKey: 'sample_id' },
                { foreignKey: 'test_id', references: 'tests', referenceKey: 'test_id' },
                { foreignKey: 'technician_id', references: 'technicians', referenceKey: 'technician_id' }
            ],
            'samples': [
                { foreignKey: 'lab_id', references: 'labs', referenceKey: 'lab_id' }
            ],
            'technicians': [
                { foreignKey: 'lab_id', references: 'labs', referenceKey: 'lab_id' }
            ]
        };
        
        const processedTables = new Set([primaryTable.toLowerCase()]);
        const tablesToProcess = Array.from(this.selectedTables).filter(t => t.toLowerCase() !== primaryTable.toLowerCase());
        
        // Try to join tables in order
        for (const table of tablesToProcess) {
            const tableLower = table.toLowerCase();
            if (processedTables.has(tableLower)) continue;
            
            // Find a relationship path
            const joinPath = this.findJoinPath(primaryTable, table, relationships, tableMap, processedTables);
            if (joinPath) {
                joins.push(...joinPath);
                processedTables.add(tableLower);
            }
        }
        
        return joins;
    }
    
    /**
     * Finds a join path between two tables
     * @param {string} fromTable - Starting table
     * @param {string} toTable - Target table
     * @param {Object} relationships - Relationship definitions
     * @param {Object} tableMap - Map of table names to table definitions
     * @param {Set} processedTables - Set of already processed tables
     * @returns {string[]|null} Array of JOIN clauses or null if no path found
     */
    findJoinPath(fromTable, toTable, relationships, tableMap, processedTables) {
        const fromLower = fromTable.toLowerCase();
        const toLower = toTable.toLowerCase();
        
        // Direct relationship from fromTable to toTable
        if (relationships[fromLower]) {
            const rel = relationships[fromLower].find(r => r.references.toLowerCase() === toLower);
            if (rel) {
                return [`LEFT JOIN ${toTable} ON ${fromTable}.${rel.foreignKey} = ${toTable}.${rel.referenceKey}`];
            }
        }
        
        // Reverse relationship (toTable has FK to fromTable)
        if (relationships[toLower]) {
            const rel = relationships[toLower].find(r => r.references.toLowerCase() === fromLower);
            if (rel) {
                return [`LEFT JOIN ${toTable} ON ${fromTable}.${rel.referenceKey} = ${toTable}.${rel.foreignKey}`];
            }
        }
        
        // Try intermediate tables
        for (const [tableName, rels] of Object.entries(relationships)) {
            if (processedTables.has(tableName.toLowerCase())) continue;
            
            // Check if this table connects fromTable to toTable
            const fromRel = rels.find(r => r.references.toLowerCase() === fromLower);
            const toRel = rels.find(r => r.references.toLowerCase() === toLower);
            
            if (fromRel && toRel) {
                const joins = [];
                joins.push(`LEFT JOIN ${tableName} ON ${fromTable}.${fromRel.referenceKey} = ${tableName}.${fromRel.foreignKey}`);
                joins.push(`LEFT JOIN ${toTable} ON ${tableName}.${toRel.foreignKey} = ${toTable}.${toRel.referenceKey}`);
                return joins;
            }
        }
        
        // Default: try common ID patterns
        const fromTableDef = tableMap[fromLower];
        const toTableDef = tableMap[toLower];
        
        if (fromTableDef && toTableDef) {
            // Try to find a common column name pattern
            const fromIdCol = fromTableDef.columns.find(col => col.toLowerCase().includes('_id') || col.toLowerCase().endsWith('id'));
            const toIdCol = toTableDef.columns.find(col => col.toLowerCase().includes('_id') || col.toLowerCase().endsWith('id'));
            
            if (fromIdCol && toIdCol && fromIdCol === toIdCol) {
                return [`LEFT JOIN ${toTable} ON ${fromTable}.${fromIdCol} = ${toTable}.${toIdCol}`];
            }
        }
        
        return null;
    }
    
    handleInput(e) {
        this.updateSuggestions();
    }
    
    handleKeyDown(e) {
        const suggestionsDiv = this.container.querySelector('#sql-autocomplete-suggestions');
        
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
        if (!this.editor) return;
        
        const sql = this.editor.value;
        const cursorPosition = this.editor.selectionStart;
        
        this.suggestions = getSuggestions(sql, cursorPosition);
        
        if (this.suggestions.length > 0) {
            this.selectedSuggestionIndex = -1;
            this.showSuggestions();
        } else {
            this.hideSuggestions();
        }
    }
    
    showSuggestions() {
        const suggestionsDiv = this.container.querySelector('#sql-autocomplete-suggestions');
        if (!suggestionsDiv || !this.editor) return;
        
        this.autocompleteVisible = true;
        suggestionsDiv.innerHTML = this.suggestions.map((suggestion, index) => {
            const typeClass = `suggestion-type-${suggestion.type}`;
            return `
                <div class="suggestion-item ${index === this.selectedSuggestionIndex ? 'selected' : ''}" data-index="${index}">
                    <span class="suggestion-text">${this.escapeHtml(suggestion.text)}</span>
                    <span class="suggestion-type ${typeClass}">${suggestion.type}</span>
                </div>
            `;
        }).join('');
        
        suggestionsDiv.style.display = 'block';
        this.positionSuggestions();
        
        // Add click handlers
        suggestionsDiv.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.insertSuggestion(this.suggestions[index]);
            });
        });
    }
    
    hideSuggestions() {
        const suggestionsDiv = this.container.querySelector('#sql-autocomplete-suggestions');
        if (suggestionsDiv) {
            suggestionsDiv.style.display = 'none';
        }
        this.autocompleteVisible = false;
        this.selectedSuggestionIndex = -1;
    }
    
    highlightSuggestion() {
        const suggestionsDiv = this.container.querySelector('#sql-autocomplete-suggestions');
        if (!suggestionsDiv) return;
        
        suggestionsDiv.querySelectorAll('.suggestion-item').forEach((item, index) => {
            if (index === this.selectedSuggestionIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    insertSuggestion(suggestion) {
        if (!this.editor || !suggestion) return;
        
        const textarea = this.editor;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const sql = textarea.value;
        const textBeforeCursor = sql.substring(0, start);
        
        // Find the current word to replace
        const wordStart = getWordStartPosition(textBeforeCursor);
        const wordEnd = start;
        
        // Replace the word with the suggestion
        const newValue = sql.substring(0, wordStart) + suggestion.text + sql.substring(wordEnd);
        textarea.value = newValue;
        
        // Set cursor position after inserted text
        const newPosition = wordStart + suggestion.text.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
        
        this.hideSuggestions();
    }
    
    positionSuggestions() {
        const suggestionsDiv = this.container.querySelector('#sql-autocomplete-suggestions');
        const editor = this.editor;
        if (!suggestionsDiv || !editor) return;
        
        // Position below the cursor
        const rect = editor.getBoundingClientRect();
        const scrollTop = editor.scrollTop;
        const lineHeight = 20; // Approximate line height
        
        // Calculate cursor position (simplified)
        const textBeforeCursor = editor.value.substring(0, editor.selectionStart);
        const lines = textBeforeCursor.split('\n');
        const lineNumber = lines.length - 1;
        const column = lines[lines.length - 1].length;
        
        suggestionsDiv.style.top = `${(lineNumber + 1) * lineHeight + 12}px`;
        suggestionsDiv.style.left = `${column * 8 + 12}px`; // Approximate character width
    }
    
    async executeQuery() {
        if (!this.editor) return;
        
        const query = this.editor.value.trim();
        const saveBtn = this.container.querySelector('#save-dataset');
        const runBtn = this.container.querySelector('#run-query');
        const previewLimitSelect = this.container.querySelector('#preview-limit');
        
        if (!query) {
            this.showError('Please enter a SQL query.');
            return;
        }
        
        // Get preview limit from selector (default to 10)
        const previewLimit = previewLimitSelect ? parseInt(previewLimitSelect.value, 10) : 10;
        
        // Show loading state
        runBtn.disabled = true;
        runBtn.textContent = 'Running...';
        this.showLoading();
        
        try {
            // Store the full query (without LIMIT/TOP) for saving datasets
            // Remove any existing LIMIT or TOP from the query
            let fullQuery = query;
            
            // Remove LIMIT clause if present
            const existingLimitMatch = /\blimit\s+\d+\b/i.exec(fullQuery);
            if (existingLimitMatch) {
                // Remove LIMIT clause from query
                fullQuery = fullQuery.substring(0, existingLimitMatch.index).trim();
                // Remove trailing semicolon if present
                if (fullQuery.endsWith(';')) {
                    fullQuery = fullQuery.slice(0, -1).trim();
                }
            }
            
            // Remove TOP clause if present (SQL Server syntax)
            const existingTopMatch = /select\s+top\s+\d+\s+/i.exec(fullQuery);
            if (existingTopMatch) {
                // Replace "SELECT TOP N " with "SELECT "
                fullQuery = fullQuery.replace(/select\s+top\s+\d+\s+/i, 'SELECT ');
            }
            
            this.fullQuery = fullQuery;
            
            // Execute the FULL query (no LIMIT) to get all data
            const fullSqlResult = await executeSQL(fullQuery, 500);
            
            // Get total count from full result
            const totalCount = fullSqlResult.rows ? fullSqlResult.rows.length : 0;
            this.totalRecordCount = totalCount;
            this.updateTotalRecordsIndicator();
            
            // Check if result is empty
            if (!fullSqlResult || !fullSqlResult.columns || fullSqlResult.columns.length === 0) {
                this.showError('Query executed successfully but returned no columns. Please check your SELECT clause.');
                this.currentResult = null;
                saveBtn.disabled = true;
                return;
            }
            
            // Convert full rows (array of arrays) to data (array of objects)
            const fullData = fullSqlResult.rows.map(row => {
                const rowObj = {};
                fullSqlResult.columns.forEach((column, index) => {
                    rowObj[column] = row[index];
                });
                return rowObj;
            });
            
            // Create result object with FULL dataset
            const fullResult = {
                id: `result_${Date.now()}`,
                name: 'Query Result',
                data: fullData, // Store ALL data
                columns: fullSqlResult.columns,
                query: this.fullQuery || query || (this.editor ? this.editor.value.trim() : '')
            };
            
            // Store the full result
            this.currentResult = fullResult;
            this.columnMetadata = this.calculateMetadata(fullResult);
            
            // Create preview result with limited rows for display
            const previewData = previewLimit > 0 && previewLimit < fullData.length 
                ? fullData.slice(0, previewLimit)
                : fullData;
            
            const previewResult = {
                ...fullResult,
                data: previewData // Only preview data for display
            };
            
            // Display only the preview
            this.displayResults(previewResult);
            saveBtn.disabled = false;
        } catch (error) {
            // Log error with context for debugging
            console.error('[QueryBuilder.executeQuery] Error executing query:', {
                error: error.message,
                stack: error.stack,
                query: query?.substring(0, 100) + (query?.length > 100 ? '...' : ''),
                timestamp: new Date().toISOString()
            });
            
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
            th.classList.add('column-header-hoverable');
            
            // Add hover tooltip with metadata
            if (this.columnMetadata && this.columnMetadata[column]) {
                const meta = this.columnMetadata[column];
                th.setAttribute('data-metadata', JSON.stringify(meta));
                this.attachColumnHover(th, meta);
            }
            
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
                    
                    // Add class for null/empty values
                    if (value === null || value === undefined || value === '') {
                        td.classList.add('null-value');
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
     * Calculates metadata for all columns
     * @param {Object} result - Result object with data and columns
     * @returns {Object} Map of column name to metadata
     */
    calculateMetadata(result) {
        if (!result || !result.data || !result.columns) {
            return {};
        }
        
        const data = result.data;
        const columns = result.columns;
        const metadata = {};
        
        if (data.length === 0) {
            return metadata;
        }
        
        // Calculate metadata for each column
        columns.forEach(column => {
            const values = data.map(row => row[column]);
            const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
            const nullCount = values.length - nonNullValues.length;
            const nullPercentage = nonNullValues.length > 0 ? ((nullCount / values.length) * 100).toFixed(1) : '100.0';
            
            // Calculate unique values
            const uniqueValues = new Set(nonNullValues.map(v => String(v)));
            const uniqueCount = uniqueValues.size;
            const uniquePercentage = nonNullValues.length > 0 ? ((uniqueCount / nonNullValues.length) * 100).toFixed(1) : '0.0';
            
            // Calculate distribution (top 5 most common values)
            const valueCounts = {};
            nonNullValues.forEach(v => {
                const key = String(v);
                valueCounts[key] = (valueCounts[key] || 0) + 1;
            });
            
            const sortedValues = Object.entries(valueCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([value, count]) => ({
                    value: value.length > 30 ? value.substring(0, 30) + '...' : value,
                    count: count,
                    percentage: nonNullValues.length > 0 ? ((count / nonNullValues.length) * 100).toFixed(1) : '0.0'
                }));
            
            // Determine data type
            let dataType = 'mixed';
            if (nonNullValues.length > 0) {
                const firstValue = nonNullValues[0];
                if (typeof firstValue === 'number') {
                    dataType = 'numeric';
                } else if (typeof firstValue === 'string') {
                    if (/^\d{4}-\d{2}-\d{2}/.test(firstValue)) {
                        dataType = 'date';
                    } else {
                        dataType = 'text';
                    }
                } else if (firstValue instanceof Date) {
                    dataType = 'date';
                }
            }
            
            metadata[column] = {
                column,
                totalRows: values.length,
                nonNullCount: nonNullValues.length,
                nullCount,
                nullPercentage,
                uniqueCount,
                uniquePercentage,
                distribution: sortedValues,
                dataType
            };
        });
        
        return metadata;
    }
    
    /**
     * Attaches hover tooltip to column header
     * @param {HTMLElement} th - Table header element
     * @param {Object} meta - Metadata for the column
     */
    attachColumnHover(th, meta) {
        let tooltip = null;
        
        th.addEventListener('mouseenter', (e) => {
            // Create tooltip
            tooltip = document.createElement('div');
            tooltip.className = 'column-metadata-tooltip';
            tooltip.innerHTML = `
                <div class="tooltip-header">
                    <strong>${this.escapeHtml(this.formatColumnName(meta.column))}</strong>
                    <span class="metadata-type-badge type-${meta.dataType}">${meta.dataType}</span>
                </div>
                <div class="tooltip-stats">
                    <div class="tooltip-stat-item">
                        <span class="tooltip-label">Unique Values:</span>
                        <span class="tooltip-value">${meta.uniqueCount} (${meta.uniquePercentage}%)</span>
                    </div>
                    <div class="tooltip-stat-item">
                        <span class="tooltip-label">Missing Values:</span>
                        <span class="tooltip-value">${meta.nullCount} (${meta.nullPercentage}%)</span>
                    </div>
                    ${meta.distribution.length > 0 ? `
                        <div class="tooltip-distribution">
                            <span class="tooltip-label">Top Values:</span>
                            <div class="tooltip-distribution-list">
                                ${meta.distribution.map(dist => `
                                    <div class="tooltip-dist-item">
                                        <span class="tooltip-dist-value">${this.escapeHtml(dist.value)}</span>
                                        <span class="tooltip-dist-count">${dist.count} (${dist.percentage}%)</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            document.body.appendChild(tooltip);
            
            // Position tooltip
            const rect = th.getBoundingClientRect();
            tooltip.style.top = `${rect.bottom + 5}px`;
            tooltip.style.left = `${rect.left}px`;
            
            // Adjust if tooltip goes off screen
            setTimeout(() => {
                if (tooltip) {
                    const tooltipRect = tooltip.getBoundingClientRect();
                    if (tooltipRect.right > window.innerWidth) {
                        tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
                    }
                    if (tooltipRect.bottom > window.innerHeight) {
                        tooltip.style.top = `${rect.top - tooltipRect.height - 5}px`;
                    }
                }
            }, 0);
        });
        
        th.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
        });
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
    
    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML string
     */
    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
    
    clearQuery() {
        if (this.editor) {
            this.editor.value = '';
        }
        
        // Reset selections
        this.selectedColumns = [];
        this.selectedTables.clear();
        
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
        this.fullQuery = null;
        this.totalRecordCount = null;
        this.updateTotalRecordsIndicator();
    }
    
    /**
     * Updates the total records indicator next to the preview limit selector
     */
    updateTotalRecordsIndicator() {
        const indicator = this.container.querySelector('#total-records-indicator');
        if (!indicator) return;
        
        if (this.totalRecordCount !== null && this.totalRecordCount !== undefined) {
            const previewLimitSelect = this.container.querySelector('#preview-limit');
            const previewLimit = previewLimitSelect ? parseInt(previewLimitSelect.value, 10) : 10;
            const totalCount = typeof this.totalRecordCount === 'number' 
                ? this.totalRecordCount.toLocaleString() 
                : this.totalRecordCount;
            
            // Show preview count vs total count
            if (this.currentResult && this.currentResult.data) {
                const displayedCount = previewLimit > 0 && previewLimit < this.currentResult.data.length 
                    ? previewLimit 
                    : this.currentResult.data.length;
                indicator.textContent = `(Showing ${displayedCount.toLocaleString()} of ${totalCount} records)`;
            } else {
                indicator.textContent = `(Total: ${totalCount} records)`;
            }
            indicator.style.display = 'inline-block';
        } else {
            indicator.style.display = 'none';
        }
    }
    
    async saveAsDataset() {
        if (!this.currentResult) {
            console.warn('[QueryBuilder.saveAsDataset] No query results to save');
            await Modal.alert('No query results to save. Please run a query first.');
            return;
        }
        
        try {
            console.log('[QueryBuilder.saveAsDataset] Starting dataset save', {
                columns: this.currentResult.columns?.length || 0,
                rows: this.currentResult.data?.length || 0
            });
            
            // Import datasetStore
            const { datasetStore } = await import('../data/datasets.js');
            
            // Get dataset name from user
            const datasetName = await Modal.prompt('Enter a name for this dataset:', `Dataset ${new Date().toLocaleString()}`);
            
            if (!datasetName || !datasetName.trim()) {
                console.log('[QueryBuilder.saveAsDataset] User cancelled or entered empty name');
                return; // User cancelled or entered empty name
            }
            
            // Validate that we have columns
            const columns = this.currentResult.columns || [];
            if (columns.length === 0) {
                console.error('[QueryBuilder.saveAsDataset] No columns found in query results');
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
            
            // Get the SQL query - use full query (without LIMIT) for saving
            const sqlQuery = this.fullQuery || this.currentResult.query || (this.editor ? this.editor.value.trim() : '');
            
            // Create dataset with SQL, columns, and rows
            const dataset = datasetStore.create(
                datasetName.trim(),
                sqlQuery,
                columns,
                rows
            );
            
            console.log('[QueryBuilder.saveAsDataset] Dataset saved successfully', {
                datasetId: dataset.id,
                datasetName: dataset.name,
                columns: dataset.columns.length,
                rows: dataset.rows.length
            });
            
            // Notify listeners
            this.notifyDatasetCreated(dataset);
            
            // Refresh table browser if callback exists
            if (this.refreshTableBrowserCallback) {
                this.refreshTableBrowserCallback();
            }
            
            // Show success message
            await Modal.alert(`Dataset "${datasetName}" saved successfully! (ID: ${dataset.id})`);
        } catch (error) {
            console.error('[QueryBuilder.saveAsDataset] Error saving dataset:', {
                error: error.message,
                stack: error.stack,
                resultColumns: this.currentResult?.columns?.length || 0,
                resultRows: this.currentResult?.data?.length || 0,
                timestamp: new Date().toISOString()
            });
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
        
        const textarea = this.editor;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = textarea.value;
        
        // Insert text at cursor position
        textarea.value = currentValue.substring(0, start) + text + currentValue.substring(end);
        
        // Set cursor position after inserted text
        const newPosition = start + text.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
    }
    
    
    /**
     * Loads a saved dataset into the editor for editing
     * @param {string} datasetId - Dataset ID to load
     */
    async loadDataset(datasetId) {
        try {
            console.log('[QueryBuilder.loadDataset] Loading dataset', { datasetId });
            
            const { datasetStore } = await import('../data/datasets.js');
            const dataset = datasetStore.get(datasetId);
            
            if (!dataset) {
                console.error('[QueryBuilder.loadDataset] Dataset not found', { datasetId });
                await Modal.alert('Dataset not found.');
                return;
            }
            
            if (!this.editor) {
                this.editor = this.container.querySelector('#sql-editor');
            }
            
            if (!this.editor) {
                console.error('[QueryBuilder.loadDataset] SQL editor not found');
                await Modal.alert('SQL editor not found.');
                return;
            }
            
            const saveBtn = this.container.querySelector('#save-dataset');
            const updateBtn = this.container.querySelector('#update-dataset');
            
            // Load SQL into editor
            this.editor.value = dataset.sql || '';
            
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
            
            console.log('[QueryBuilder.loadDataset] Executing query for loaded dataset', {
                datasetId,
                sqlLength: dataset.sql?.length || 0,
                columns: dataset.columns?.length || 0
            });
            
            // Execute the query to show results
            await this.executeQuery();
            
            // Focus editor
            this.editor.focus();
            
            console.log('[QueryBuilder.loadDataset] Dataset loaded successfully', { datasetId });
        } catch (error) {
            console.error('[QueryBuilder.loadDataset] Error loading dataset:', {
                error: error.message,
                stack: error.stack,
                datasetId,
                timestamp: new Date().toISOString()
            });
            await Modal.alert(`Failed to load dataset: ${error.message || 'Unknown error'}`);
        }
    }
    
    /**
     * Updates an existing dataset with current query results
     */
    async updateDataset() {
        if (!this.currentDatasetId || !this.currentResult || !this.editor) {
            console.warn('[QueryBuilder.updateDataset] Missing required data', {
                hasDatasetId: !!this.currentDatasetId,
                hasResult: !!this.currentResult,
                hasEditor: !!this.editor
            });
            return;
        }
        
        try {
            console.log('[QueryBuilder.updateDataset] Updating dataset', {
                datasetId: this.currentDatasetId,
                columns: this.currentResult.columns?.length || 0,
                rows: this.currentResult.data?.length || 0
            });
            
            const { datasetStore } = await import('../data/datasets.js');
            
            // Use the full query (without LIMIT) for updating
            const query = this.fullQuery || this.editor.value.trim();
            
            if (!query) {
                console.warn('[QueryBuilder.updateDataset] No SQL query provided');
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
                console.log('[QueryBuilder.updateDataset] Dataset updated successfully', {
                    datasetId: updated.id,
                    datasetName: updated.name
                });
                
                await Modal.alert(`Dataset "${updated.name}" updated successfully!`);
                
                // Refresh table browser if callback exists
                if (this.refreshTableBrowserCallback) {
                    this.refreshTableBrowserCallback();
                }
                
                // Notify listeners
                this.notifyDatasetCreated(updated);
            } else {
                console.error('[QueryBuilder.updateDataset] Failed to update dataset', {
                    datasetId: this.currentDatasetId
                });
                await Modal.alert('Failed to update dataset.');
            }
        } catch (error) {
            console.error('[QueryBuilder.updateDataset] Error updating dataset:', {
                error: error.message,
                stack: error.stack,
                datasetId: this.currentDatasetId,
                timestamp: new Date().toISOString()
            });
            await Modal.alert(`Failed to update dataset: ${error.message || 'Unknown error'}`);
        }
    }
    
    /**
     * Deletes a saved dataset
     * @param {string} datasetId - Dataset ID to delete
     */
    async deleteDataset(datasetId) {
        try {
            console.log('[QueryBuilder.deleteDataset] Attempting to delete dataset', { datasetId });
            
            const { datasetStore } = await import('../data/datasets.js');
            const dataset = datasetStore.get(datasetId);
            
            if (!dataset) {
                console.error('[QueryBuilder.deleteDataset] Dataset not found', { datasetId });
                await Modal.alert('Dataset not found.');
                return;
            }
            
            const confirmed = await Modal.confirm(
                `Are you sure you want to delete "${dataset.name}"?`
            );
            
            if (!confirmed) {
                console.log('[QueryBuilder.deleteDataset] User cancelled deletion', { datasetId });
                return;
            }
            
            const result = datasetStore.delete(datasetId);
            
            if (result.deleted) {
                console.log('[QueryBuilder.deleteDataset] Dataset deleted successfully', {
                    datasetId,
                    datasetName: dataset.name
                });
                
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
                console.error('[QueryBuilder.deleteDataset] Failed to delete dataset', { datasetId });
                await Modal.alert('Failed to delete dataset.');
            }
        } catch (error) {
            console.error('[QueryBuilder.deleteDataset] Error deleting dataset:', {
                error: error.message,
                stack: error.stack,
                datasetId,
                timestamp: new Date().toISOString()
            });
            await Modal.alert(`Failed to delete dataset: ${error.message || 'Unknown error'}`);
        }
    }
}


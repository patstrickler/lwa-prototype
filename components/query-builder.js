// Query Builder Component
// SQL editor → Dataset

export class QueryBuilder {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.datasetCallbacks = [];
        this.currentResult = null;
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="query-builder">
                <textarea id="sql-editor" placeholder="Enter your SQL query here..."></textarea>
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
                    </div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const runBtn = this.container.querySelector('#run-query');
        const clearBtn = this.container.querySelector('#clear-query');
        const saveBtn = this.container.querySelector('#save-dataset');
        
        runBtn.addEventListener('click', () => this.executeQuery());
        clearBtn.addEventListener('click', () => this.clearQuery());
        saveBtn.addEventListener('click', () => this.saveAsDataset());
    }
    
    executeQuery() {
        const sqlEditor = this.container.querySelector('#sql-editor');
        const query = sqlEditor.value.trim();
        const resultsDiv = this.container.querySelector('#query-results');
        const saveBtn = this.container.querySelector('#save-dataset');
        
        if (!query) {
            this.showError('Please enter a SQL query.');
            return;
        }
        
        // Mock query execution - will be replaced with actual SQL parser/executor
        try {
            const result = this.mockExecuteQuery(query);
            this.currentResult = result;
            this.displayResults(result);
            saveBtn.disabled = false;
        } catch (error) {
            this.showError(`Error: ${error.message}`);
            this.currentResult = null;
            saveBtn.disabled = true;
        }
    }
    
    mockExecuteQuery(query) {
        // Mock implementation - returns sample dataset
        // This will be replaced with actual SQL execution logic
        // For now, return empty result or sample data
        return {
            id: `result_${Date.now()}`,
            name: 'Query Result',
            data: [],
            columns: [],
            query: query
        };
    }
    
    displayResults(result) {
        const thead = this.container.querySelector('#results-thead');
        const tbody = this.container.querySelector('#results-tbody');
        const saveBtn = this.container.querySelector('#save-dataset');
        
        // Clear previous results
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        if (!result || !result.columns || result.columns.length === 0) {
            // Show empty placeholder
            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" class="empty-placeholder">No results yet. Run a query to see results.</td>
                </tr>
            `;
            saveBtn.disabled = true;
            return;
        }
        
        // Build table header
        const headerRow = document.createElement('tr');
        result.columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        
        // Build table body
        if (result.data && result.data.length > 0) {
            result.data.forEach(row => {
                const tr = document.createElement('tr');
                result.columns.forEach(column => {
                    const td = document.createElement('td');
                    td.textContent = row[column] !== undefined ? row[column] : '';
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
        } else {
            // Empty result set
            tbody.innerHTML = `
                <tr>
                    <td colspan="${result.columns.length}" class="empty-placeholder">Query executed successfully. No rows returned.</td>
                </tr>
            `;
        }
        
        saveBtn.disabled = false;
    }
    
    showError(message) {
        const thead = this.container.querySelector('#results-thead');
        const tbody = this.container.querySelector('#results-tbody');
        const saveBtn = this.container.querySelector('#save-dataset');
        
        thead.innerHTML = '';
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="error">${message}</td>
            </tr>
        `;
        saveBtn.disabled = true;
    }
    
    clearQuery() {
        const sqlEditor = this.container.querySelector('#sql-editor');
        const thead = this.container.querySelector('#results-thead');
        const tbody = this.container.querySelector('#results-tbody');
        const saveBtn = this.container.querySelector('#save-dataset');
        
        sqlEditor.value = '';
        thead.innerHTML = '';
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="empty-placeholder">No results yet. Run a query to see results.</td>
            </tr>
        `;
        saveBtn.disabled = true;
        this.currentResult = null;
    }
    
    saveAsDataset() {
        if (!this.currentResult) {
            return;
        }
        
        // Import datasetStore
        import('../data/datasets.js').then(({ datasetStore }) => {
            const datasetName = prompt('Enter a name for this dataset:', `Dataset ${new Date().toLocaleString()}`);
            
            if (!datasetName) {
                return; // User cancelled
            }
            
            const dataset = datasetStore.create(
                datasetName,
                this.currentResult.data || [],
                this.currentResult.columns || []
            );
            
            // Notify listeners
            this.notifyDatasetCreated(dataset);
            
            // Show success message
            alert(`Dataset "${datasetName}" saved successfully!`);
        });
    }
    
    onDatasetCreated(callback) {
        this.datasetCallbacks.push(callback);
    }
    
    notifyDatasetCreated(dataset) {
        this.datasetCallbacks.forEach(callback => callback(dataset));
    }
}


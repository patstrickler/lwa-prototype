// Query Builder Component
// SQL editor → Dataset

export class QueryBuilder {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.datasetCallbacks = [];
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
                    <button id="execute-query" class="btn btn-primary">Execute Query</button>
                    <button id="clear-query" class="btn btn-secondary">Clear</button>
                </div>
                <div id="query-results" class="query-results"></div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const executeBtn = this.container.querySelector('#execute-query');
        const clearBtn = this.container.querySelector('#clear-query');
        
        executeBtn.addEventListener('click', () => this.executeQuery());
        clearBtn.addEventListener('click', () => this.clearQuery());
    }
    
    executeQuery() {
        const sqlEditor = this.container.querySelector('#sql-editor');
        const query = sqlEditor.value.trim();
        const resultsDiv = this.container.querySelector('#query-results');
        
        if (!query) {
            resultsDiv.innerHTML = '<p class="error">Please enter a SQL query.</p>';
            return;
        }
        
        // Mock query execution - will be replaced with actual SQL parser/executor
        try {
            const dataset = this.mockExecuteQuery(query);
            this.displayResults(dataset);
            this.notifyDatasetCreated(dataset);
        } catch (error) {
            resultsDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        }
    }
    
    mockExecuteQuery(query) {
        // Mock implementation - returns sample dataset
        // This will be replaced with actual SQL execution logic
        return {
            id: `dataset_${Date.now()}`,
            name: 'Query Result',
            data: [],
            columns: [],
            query: query
        };
    }
    
    displayResults(dataset) {
        const resultsDiv = this.container.querySelector('#query-results');
        resultsDiv.innerHTML = `
            <div class="dataset-info">
                <h3>Dataset: ${dataset.name}</h3>
                <p>Columns: ${dataset.columns.length}</p>
                <p>Rows: ${dataset.data.length}</p>
            </div>
        `;
    }
    
    clearQuery() {
        const sqlEditor = this.container.querySelector('#sql-editor');
        const resultsDiv = this.container.querySelector('#query-results');
        sqlEditor.value = '';
        resultsDiv.innerHTML = '';
    }
    
    onDatasetCreated(callback) {
        this.datasetCallbacks.push(callback);
    }
    
    notifyDatasetCreated(dataset) {
        this.datasetCallbacks.forEach(callback => callback(dataset));
    }
}


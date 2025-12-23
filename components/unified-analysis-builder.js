// Unified Analysis Builder Component
// Combines metric definition and script editing in a single interface

import { MetricDefinitionDialog } from './metric-definition-dialog.js';
import { ScriptExecutionPanel } from './script-execution-panel.js';
import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';
import { metricExecutionEngine } from '../utils/metric-execution-engine.js';
import { evaluateMetricScript } from '../utils/metric-script-parser.js';
import { getColumnSuggestions, getWordStartPosition } from '../utils/script-autocomplete.js';

export class UnifiedAnalysisBuilder {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.mode = 'metric'; // 'metric' or 'script'
        this.metricDialog = null;
        this.scriptPanel = null;
        this.currentDataset = null;
        this.metricSuggestions = [];
        this.selectedSuggestionIndex = -1;
        this.autocompleteVisible = false;
        this.init();
    }
    
    init() {
        this.render();
        this.initComponents();
        this.attachEventListeners();
        // Ensure metric mode is visible by default
        this.setMode('metric');
    }
    
    render() {
        this.container.innerHTML = `
            <div class="unified-analysis-builder">
                <div class="builder-header">
                    <div class="mode-selector">
                        <label for="analysis-mode">Analysis Type:</label>
                        <select id="analysis-mode" class="form-control">
                            <option value="metric" selected>Metric</option>
                            <option value="script">Custom Script</option>
                        </select>
                    </div>
                </div>
                
                <div id="metric-builder-container" class="builder-content" style="display: block;">
                    <!-- Metric builder will be rendered here -->
                </div>
                
                <div id="script-builder-container" class="builder-content" style="display: none;">
                    <!-- Script builder will be rendered here -->
                </div>
            </div>
        `;
    }
    
    initComponents() {
        // Initialize metric dialog (it creates its own modal, used for notifications)
        this.metricDialog = new MetricDefinitionDialog();
        
        // Initialize script panel when switching to script mode
        // Don't initialize immediately to avoid rendering issues
    }
    
    initScriptPanel() {
        if (this.scriptPanel) {
            return; // Already initialized
        }
        
        const scriptContainer = this.container.querySelector('#script-builder-container');
        if (scriptContainer && scriptContainer.style.display !== 'none') {
            // Only initialize if container is visible
            this.scriptPanel = new ScriptExecutionPanel('#script-builder-container');
            if (this.currentDataset && this.scriptPanel) {
                this.scriptPanel.setDataset(this.currentDataset);
            }
        }
    }
    
    attachEventListeners() {
        const modeSelect = this.container.querySelector('#analysis-mode');
        modeSelect.addEventListener('change', (e) => {
            this.setMode(e.target.value);
        });
    }
    
    setMode(mode) {
        this.mode = mode;
        const metricContainer = this.container.querySelector('#metric-builder-container');
        const scriptContainer = this.container.querySelector('#script-builder-container');
        
        if (mode === 'metric') {
            metricContainer.style.display = 'block';
            scriptContainer.style.display = 'none';
            // Render metric builder if not already rendered
            if (!metricContainer.querySelector('.metric-script-builder')) {
                this.renderMetricBuilder();
            }
        } else {
            metricContainer.style.display = 'none';
            scriptContainer.style.display = 'block';
            this.initScriptPanel();
        }
    }
    
    renderMetricBuilder() {
        const metricContainer = this.container.querySelector('#metric-builder-container');
        
        // Check if already rendered
        if (metricContainer.querySelector('.metric-script-builder')) {
            return;
        }
        
        metricContainer.innerHTML = `
            <div class="metric-script-builder">
                <div class="metric-controls">
                    <div class="form-group">
                        <label>Dataset:</label>
                        <div id="metric-dataset-display" class="dataset-display">
                            ${this.currentDataset ? this.escapeHtml(this.currentDataset.name) : '<span class="no-dataset">No dataset selected. Please select a dataset from the left pane.</span>'}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="metric-name-input">Metric Name:</label>
                        <input type="text" id="metric-name-input" class="form-control" placeholder="e.g., Average Sales">
                    </div>
                </div>
                
                <div class="form-group metric-editor-wrapper">
                    <label for="metric-expression-editor">Metric Expression:</label>
                    <div class="metric-editor-container">
                        <textarea id="metric-expression-editor" class="metric-expression-editor" placeholder="Enter metric expression, e.g., MEAN(sales) or SUM(revenue) / COUNT(orders)"></textarea>
                        <div id="metric-autocomplete-suggestions" class="autocomplete-suggestions" style="display: none;"></div>
                    </div>
                    <div class="metric-help">
                        <strong>Available Functions:</strong> SUM(), MEAN(), MIN(), MAX(), STDDEV(), COUNT(), COUNT_DISTINCT(), IF()<br>
                        <strong>Operators:</strong> +, -, *, /<br>
                        <strong>Comparisons:</strong> &gt;, &lt;, &gt;=, &lt;=, ==, !=<br>
                        <strong>Examples:</strong> MEAN(sales) + SUM(revenue) / COUNT(orders)<br>
                        IF(MEAN(sales) &gt; 100, SUM(revenue), 0)
                    </div>
                </div>
                
                <div class="form-actions">
                    <button id="create-metric" class="btn btn-primary" disabled>Create Metric</button>
                    <button id="clear-metric-form" class="btn btn-secondary">Clear</button>
                </div>
                
                <div id="metric-result" class="metric-result"></div>
            </div>
        `;
        
        this.attachMetricListeners();
        this.updateDatasetDisplay();
        if (this.currentDataset) {
            this.updateMetricSuggestions();
        }
    }
    
    attachMetricListeners() {
        const nameInput = this.container.querySelector('#metric-name-input');
        const expressionEditor = this.container.querySelector('#metric-expression-editor');
        const createBtn = this.container.querySelector('#create-metric');
        const clearBtn = this.container.querySelector('#clear-metric-form');
        
        if (!nameInput || !expressionEditor) return;
        
        nameInput.addEventListener('input', () => this.updateCreateButtonState());
        
        expressionEditor.addEventListener('input', (e) => {
            this.updateCreateButtonState();
            this.handleMetricInput(e);
        });
        
        // Handle keyboard events for autocomplete
        expressionEditor.addEventListener('keydown', (e) => this.handleMetricKeyDown(e));
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideMetricSuggestions();
            }
        });
        
        createBtn.addEventListener('click', () => this.createMetric());
        clearBtn.addEventListener('click', () => this.clearMetricForm());
    }
    
    handleMetricInput(e) {
        this.updateMetricSuggestions();
    }
    
    handleMetricKeyDown(e) {
        const suggestionsDiv = this.container.querySelector('#metric-autocomplete-suggestions');
        
        if (!this.autocompleteVisible || this.metricSuggestions.length === 0) {
            return;
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.min(
                    this.selectedSuggestionIndex + 1,
                    this.metricSuggestions.length - 1
                );
                this.highlightMetricSuggestion();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
                this.highlightMetricSuggestion();
                break;
                
            case 'Enter':
            case 'Tab':
                if (this.selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    this.insertMetricSuggestion(this.metricSuggestions[this.selectedSuggestionIndex]);
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideMetricSuggestions();
                break;
        }
    }
    
    updateMetricSuggestions() {
        const expressionEditor = this.container.querySelector('#metric-expression-editor');
        if (!expressionEditor) return;
        
        const expression = expressionEditor.value;
        const cursorPosition = expressionEditor.selectionStart;
        
        // Use current dataset
        const dataset = this.currentDataset;
        
        // Get function and column suggestions
        this.metricSuggestions = this.getMetricSuggestions(expression, cursorPosition, dataset);
        
        if (this.metricSuggestions.length > 0) {
            this.selectedSuggestionIndex = -1;
            this.showMetricSuggestions();
        } else {
            this.hideMetricSuggestions();
        }
    }
    
    getMetricSuggestions(expression, cursorPosition, dataset) {
        const suggestions = [];
        const textBeforeCursor = expression.substring(0, cursorPosition);
        const currentWord = this.getCurrentWord(textBeforeCursor);
        
        if (!currentWord) {
            return suggestions;
        }
        
        const wordLower = currentWord.toLowerCase();
        
        // Function suggestions
        const functions = ['SUM', 'MEAN', 'AVG', 'MIN', 'MAX', 'STDDEV', 'COUNT', 'COUNT_DISTINCT', 'IF'];
        functions.forEach(func => {
            if (func.toLowerCase().startsWith(wordLower)) {
                let display = func;
                if (func === 'IF') {
                    display = 'IF(condition, value_if_true, value_if_false)';
                }
                suggestions.push({ text: func, type: 'function', display: display });
            }
        });
        
        // Column suggestions (if dataset is available)
        if (dataset && dataset.columns) {
            dataset.columns.forEach(column => {
                if (column.toLowerCase().startsWith(wordLower)) {
                    suggestions.push({ 
                        text: column, 
                        type: 'column', 
                        display: this.formatColumnName(column) 
                    });
                }
            });
        }
        
        return suggestions.slice(0, 10);
    }
    
    getCurrentWord(text) {
        const match = text.match(/[\w._]+$/);
        return match ? match[0] : '';
    }
    
    showMetricSuggestions() {
        const expressionEditor = this.container.querySelector('#metric-expression-editor');
        const suggestionsDiv = this.container.querySelector('#metric-autocomplete-suggestions');
        
        if (!suggestionsDiv || this.metricSuggestions.length === 0) {
            return;
        }
        
        suggestionsDiv.innerHTML = this.metricSuggestions.map((suggestion, index) => {
            const typeClass = `suggestion-${suggestion.type}`;
            const selectedClass = index === this.selectedSuggestionIndex ? 'selected' : '';
            return `
                <div class="suggestion-item ${typeClass} ${selectedClass}" data-index="${index}">
                    <span class="suggestion-type">${suggestion.type}</span>
                    <span class="suggestion-text">${this.escapeHtml(suggestion.display || suggestion.text)}</span>
                </div>
            `;
        }).join('');
        
        this.positionMetricSuggestions();
        
        suggestionsDiv.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.insertMetricSuggestion(this.metricSuggestions[index]);
            });
        });
        
        suggestionsDiv.style.display = 'block';
        this.autocompleteVisible = true;
    }
    
    hideMetricSuggestions() {
        const suggestionsDiv = this.container.querySelector('#metric-autocomplete-suggestions');
        if (suggestionsDiv) {
            suggestionsDiv.style.display = 'none';
        }
        this.autocompleteVisible = false;
        this.selectedSuggestionIndex = -1;
    }
    
    highlightMetricSuggestion() {
        const suggestionsDiv = this.container.querySelector('#metric-autocomplete-suggestions');
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
    
    positionMetricSuggestions() {
        const expressionEditor = this.container.querySelector('#metric-expression-editor');
        const suggestionsDiv = this.container.querySelector('#metric-autocomplete-suggestions');
        const editorContainer = expressionEditor ? expressionEditor.closest('.metric-editor-container') : null;
        
        if (!expressionEditor || !suggestionsDiv || !editorContainer) return;
        
        suggestionsDiv.style.left = '0px';
        suggestionsDiv.style.top = `${expressionEditor.offsetHeight + 2}px`;
    }
    
    insertMetricSuggestion(suggestion) {
        const expressionEditor = this.container.querySelector('#metric-expression-editor');
        const expression = expressionEditor.value;
        const cursorPosition = expressionEditor.selectionStart;
        const textBeforeCursor = expression.substring(0, cursorPosition);
        
        const wordStart = getWordStartPosition(textBeforeCursor);
        const wordEnd = cursorPosition;
        
        let insertText = suggestion.text;
        
        // If it's a function, add parentheses
        if (suggestion.type === 'function') {
            insertText += '()';
        }
        
        const newExpression = expression.substring(0, wordStart) + insertText + expression.substring(wordEnd);
        expressionEditor.value = newExpression;
        
        const newCursorPosition = wordStart + insertText.length;
        if (suggestion.type === 'function') {
            // Position cursor inside parentheses
            expressionEditor.setSelectionRange(newCursorPosition - 1, newCursorPosition - 1);
        } else {
            expressionEditor.setSelectionRange(newCursorPosition, newCursorPosition);
        }
        
        this.hideMetricSuggestions();
        this.updateMetricSuggestions();
        expressionEditor.focus();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateDatasetDisplay() {
        const datasetDisplay = this.container.querySelector('#metric-dataset-display');
        if (datasetDisplay) {
            if (this.currentDataset) {
                datasetDisplay.innerHTML = `<span class="dataset-name">${this.escapeHtml(this.currentDataset.name)}</span>`;
            } else {
                datasetDisplay.innerHTML = '<span class="no-dataset">No dataset selected. Please select a dataset from the left pane.</span>';
            }
        }
    }
    
    
    formatColumnName(column) {
        return column
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }
    
    updateCreateButtonState() {
        const createBtn = this.container.querySelector('#create-metric');
        const nameInput = this.container.querySelector('#metric-name-input');
        const expressionEditor = this.container.querySelector('#metric-expression-editor');
        
        if (!createBtn) return;
        
        const isValid = 
            this.currentDataset !== null &&
            nameInput && nameInput.value.trim() !== '' &&
            expressionEditor && expressionEditor.value.trim() !== '';
        
        createBtn.disabled = !isValid;
    }
    
    async createMetric() {
        const nameInput = this.container.querySelector('#metric-name-input');
        const expressionEditor = this.container.querySelector('#metric-expression-editor');
        const resultContainer = this.container.querySelector('#metric-result');
        
        if (!this.currentDataset) {
            resultContainer.innerHTML = '<div class="error">Error: No dataset selected. Please select a dataset from the left pane.</div>';
            return;
        }
        
        const name = nameInput.value.trim();
        const expression = expressionEditor.value.trim();
        
        if (!name || !expression) {
            return;
        }
        
        const dataset = this.currentDataset;
        
        // Show loading
        resultContainer.innerHTML = '<div class="loading">Calculating metric...</div>';
        
        try {
            // Evaluate metric script expression
            const value = evaluateMetricScript(expression, dataset);
            
            if (value === null || isNaN(value)) {
                resultContainer.innerHTML = '<div class="error">Error: Could not calculate metric. Please check your expression.</div>';
                return;
            }
            
            // Extract column and operation from expression for storage
            // Try to extract the first column and operation used
            const columnMatch = expression.match(/(?:SUM|MEAN|AVG|MIN|MAX|STDDEV|COUNT|COUNT_DISTINCT)\s*\(\s*(\w+)\s*\)/);
            const column = columnMatch ? columnMatch[1] : null;
            
            // Determine operation type (for simple expressions)
            let operation = 'custom';
            if (expression.match(/^MEAN|AVG|AVERAGE/i)) {
                operation = 'mean';
            } else if (expression.match(/^SUM/i)) {
                operation = 'sum';
            } else if (expression.match(/^MIN/i)) {
                operation = 'min';
            } else if (expression.match(/^MAX/i)) {
                operation = 'max';
            } else if (expression.match(/^STDDEV|STDEV/i)) {
                operation = 'stdev';
            } else if (expression.match(/^COUNT_DISTINCT/i)) {
                operation = 'count_distinct';
            } else if (expression.match(/^COUNT/i)) {
                operation = 'count';
            }
            
            // Create the metric with expression
            const metric = metricsStore.create(
                dataset.id,
                name,
                value,
                'calculated',
                column,
                operation,
                expression
            );
            
            // Show success
            resultContainer.innerHTML = `
                <div class="success">
                    <strong>Metric created successfully!</strong><br>
                    <span class="metric-result-value">${this.escapeHtml(name)}: ${this.formatValue(value)}</span>
                </div>
            `;
            
            // Notify listeners
            if (this.metricDialog) {
                this.metricDialog.notifyCreated(metric);
            }
            
            // Clear form after a moment
            setTimeout(() => {
                this.clearMetricForm();
            }, 2000);
            
        } catch (error) {
            resultContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    }
    
    formatValue(value) {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        if (typeof value === 'number') {
            return value.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 4
            });
        }
        return String(value);
    }
    
    clearMetricForm() {
        const nameInput = this.container.querySelector('#metric-name-input');
        const expressionEditor = this.container.querySelector('#metric-expression-editor');
        const resultContainer = this.container.querySelector('#metric-result');
        
        if (nameInput) nameInput.value = '';
        if (expressionEditor) expressionEditor.value = '';
        if (resultContainer) resultContainer.innerHTML = '';
        this.hideMetricSuggestions();
    }
    
    setDataset(dataset) {
        this.currentDataset = dataset;
        
        // Update metric builder if in metric mode
        if (this.mode === 'metric') {
            this.updateDatasetDisplay();
            this.updateMetricSuggestions();
            this.updateCreateButtonState();
        }
        
        // Update script panel (initialize if needed)
        if (this.mode === 'script') {
            this.initScriptPanel();
        }
        if (this.scriptPanel) {
            this.scriptPanel.setDataset(dataset);
        }
    }
    
    onMetricCreated(callback) {
        if (this.metricDialog) {
            this.metricDialog.onCreated(callback);
        }
    }
    
    onScriptSaved(callback) {
        if (this.scriptPanel) {
            this.scriptPanel.onSaved(callback);
        }
    }
    
    editMetric(metricId) {
        // Switch to metric mode
        this.setMode('metric');
        
        // Load metric into editor
        const metric = metricsStore.get(metricId);
        if (!metric) return;
        
        // Set the dataset if not already set
        if (!this.currentDataset || this.currentDataset.id !== metric.datasetId) {
            const dataset = datasetStore.get(metric.datasetId);
            if (dataset) {
                this.setDataset(dataset);
            }
        }
        
        const nameInput = this.container.querySelector('#metric-name-input');
        const expressionEditor = this.container.querySelector('#metric-expression-editor');
        
        if (nameInput) nameInput.value = metric.name || '';
        
        // Reconstruct expression from metric or use stored expression
        if (metric.expression) {
            if (expressionEditor) expressionEditor.value = metric.expression;
        } else if (metric.column && metric.operation) {
            // Reconstruct from old format
            const operationMap = {
                'mean': 'MEAN',
                'sum': 'SUM',
                'min': 'MIN',
                'max': 'MAX',
                'stdev': 'STDDEV',
                'count': 'COUNT',
                'count_distinct': 'COUNT_DISTINCT'
            };
            const funcName = operationMap[metric.operation] || metric.operation.toUpperCase();
            if (expressionEditor) expressionEditor.value = `${funcName}(${metric.column})`;
        }
        
        this.updateCreateButtonState();
        this.updateMetricSuggestions();
    }
    
    editScript(scriptId) {
        // Switch to script mode
        this.setMode('script');
        
        // Load script for editing
        if (this.scriptPanel) {
            this.scriptPanel.loadScriptForEditing(scriptId);
        }
    }
}


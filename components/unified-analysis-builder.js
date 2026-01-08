// Unified Analysis Builder Component
// Metric definition interface

import { MetricDefinitionDialog } from './metric-definition-dialog.js';
import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';
import { metricExecutionEngine } from '../utils/metric-execution-engine.js';
import { evaluateMetricScript } from '../utils/metric-script-parser.js';
import { getColumnSuggestions, getWordStartPosition } from '../utils/script-autocomplete.js';
import { executeSQL } from '../utils/sql-engine.js';
import { formatMetricValue } from '../utils/metric-formatter.js';

export class UnifiedAnalysisBuilder {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.metricDialog = null;
        this.currentDataset = null;
        this.metricSuggestions = [];
        this.selectedSuggestionIndex = -1;
        this.autocompleteVisible = false;
        this.fullDatasetCache = new Map(); // Cache full datasets to avoid re-execution
        // Use unique IDs to avoid conflicts with other components
        this._metricNameInputId = `metric-name-input-builder-${Math.random().toString(36).substr(2, 9)}`;
        this._metricExpressionEditorId = `metric-expression-editor-builder-${Math.random().toString(36).substr(2, 9)}`;
        this._metricAutocompleteId = `metric-autocomplete-suggestions-builder-${Math.random().toString(36).substr(2, 9)}`;
        this._metricDisplayTypeId = `metric-display-type-${Math.random().toString(36).substr(2, 9)}`;
        this._metricDecimalPlacesId = `metric-decimal-places-${Math.random().toString(36).substr(2, 9)}`;
        this.init();
    }
    
    init() {
        this.render();
        this.initComponents();
        this.renderMetricBuilder();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="unified-analysis-builder">
                <div id="metric-builder-container" class="builder-content" style="display: block;">
                    <!-- Metric builder will be rendered here -->
                </div>
            </div>
        `;
    }
    
    initComponents() {
        // Initialize metric dialog (it creates its own modal, used for notifications)
        this.metricDialog = new MetricDefinitionDialog();
    }
    
    attachEventListeners() {
        // No mode selector needed - only metrics are supported
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
                        <label for="${this._metricNameInputId}">Metric Name:</label>
                        <input type="text" id="${this._metricNameInputId}" class="form-control" placeholder="e.g., Average Sales">
                    </div>
                    
                    <div class="form-group">
                        <label for="${this._metricDisplayTypeId}">Display Type:</label>
                        <select id="${this._metricDisplayTypeId}" class="form-control">
                            <option value="numeric">Numeric</option>
                            <option value="currency">Currency</option>
                            <option value="percentage">Percentage</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="${this._metricDecimalPlacesId}">Decimal Places:</label>
                        <input type="number" id="${this._metricDecimalPlacesId}" class="form-control" min="0" max="10" value="2">
                    </div>
                </div>
                
                <div class="form-group metric-editor-wrapper">
                    <label for="${this._metricExpressionEditorId}">Metric Expression:</label>
                    <div class="metric-editor-container">
                        <textarea id="${this._metricExpressionEditorId}" class="metric-expression-editor" placeholder="Enter metric expression, e.g., MEAN(sales) or SUM(revenue) / COUNT(orders)"></textarea>
                        <div id="${this._metricAutocompleteId}" class="autocomplete-suggestions" style="display: none;"></div>
                    </div>
                    <div class="metric-help">
                        <strong>Available Functions:</strong> SUM(), MEAN(), MIN(), MAX(), STDDEV(), COUNT(), COUNT_DISTINCT(), IF()<br>
                        <strong>Operators:</strong> +, -, *, /<br>
                        <strong>Comparisons:</strong> &gt;, &lt;, &gt;=, &lt;=, ==, !=, = (for text)<br>
                        <strong>Examples:</strong> MEAN(sales) + SUM(revenue) / COUNT(orders)<br>
                        IF(MEAN(sales) &gt; 100, SUM(revenue), 0)<br>
                        IF(status = "In Progress", COUNT_DISTINCT(sample_id), 0)
                    </div>
                </div>
                
                <div class="form-actions">
                    <button id="preview-metric" class="btn btn-secondary">Preview</button>
                    <button id="create-metric" class="btn btn-primary" disabled>Create Metric</button>
                    <button id="update-metric" class="btn btn-primary" disabled style="display: none;">Update Metric</button>
                    <button id="clear-metric-form" class="btn btn-secondary">Clear</button>
                </div>
                
                <div id="metric-result" class="metric-result"></div>
            </div>
        `;
        
        this.attachMetricListeners();
        if (this.currentDataset) {
            this.updateMetricSuggestions();
        }
    }
    
    attachMetricListeners() {
        const nameInput = this.container.querySelector(`#${this._metricNameInputId}`);
        const expressionEditor = this.container.querySelector(`#${this._metricExpressionEditorId}`);
        const previewBtn = this.container.querySelector('#preview-metric');
        const createBtn = this.container.querySelector('#create-metric');
        const updateBtn = this.container.querySelector('#update-metric');
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
        
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewMetric());
        }
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createMetric());
        }
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.updateMetric());
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearMetricForm());
        }
    }
    
    handleMetricInput(e) {
        this.updateMetricSuggestions();
    }
    
    handleMetricKeyDown(e) {
        const suggestionsDiv = this.container.querySelector(`#${this._metricAutocompleteId}`);
        
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
                if (this.selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    this.insertMetricSuggestion(this.metricSuggestions[this.selectedSuggestionIndex]);
                }
                break;
                
            case 'Tab':
                // Tab should accept the first suggestion if none is selected, or the selected one
                e.preventDefault();
                const indexToUse = this.selectedSuggestionIndex >= 0 
                    ? this.selectedSuggestionIndex 
                    : 0; // Use first suggestion if none selected
                if (indexToUse < this.metricSuggestions.length) {
                    this.insertMetricSuggestion(this.metricSuggestions[indexToUse]);
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideMetricSuggestions();
                break;
        }
    }
    
    updateMetricSuggestions() {
        const expressionEditor = this.container.querySelector(`#${this._metricExpressionEditorId}`);
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
        const expressionEditor = this.container.querySelector(`#${this._metricExpressionEditorId}`);
        const suggestionsDiv = this.container.querySelector(`#${this._metricAutocompleteId}`);
        
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
        const suggestionsDiv = this.container.querySelector(`#${this._metricAutocompleteId}`);
        if (suggestionsDiv) {
            suggestionsDiv.style.display = 'none';
        }
        this.autocompleteVisible = false;
        this.selectedSuggestionIndex = -1;
    }
    
    highlightMetricSuggestion() {
        const suggestionsDiv = this.container.querySelector(`#${this._metricAutocompleteId}`);
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
        const expressionEditor = this.container.querySelector(`#${this._metricExpressionEditorId}`);
        const suggestionsDiv = this.container.querySelector(`#${this._metricAutocompleteId}`);
        const editorContainer = expressionEditor ? expressionEditor.closest('.metric-editor-container') : null;
        
        if (!expressionEditor || !suggestionsDiv || !editorContainer) return;
        
        suggestionsDiv.style.left = '0px';
        suggestionsDiv.style.top = `${expressionEditor.offsetHeight + 2}px`;
    }
    
    insertMetricSuggestion(suggestion) {
        const expressionEditor = this.container.querySelector(`#${this._metricExpressionEditorId}`);
        if (!expressionEditor) return;
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
    
    
    
    formatColumnName(column) {
        return column
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }
    
    updateCreateButtonState() {
        const createBtn = this.container.querySelector('#create-metric');
        const updateBtn = this.container.querySelector('#update-metric');
        const previewBtn = this.container.querySelector('#preview-metric');
        const nameInput = this.container.querySelector(`#${this._metricNameInputId}`);
        const expressionEditor = this.container.querySelector(`#${this._metricExpressionEditorId}`);
        
        if (!nameInput || !expressionEditor) return;
        
        const hasName = nameInput.value.trim().length > 0;
        const hasExpression = expressionEditor.value.trim().length > 0;
        const isValid = hasName && hasExpression && this.currentDataset !== null;
        
        if (createBtn) {
            createBtn.disabled = !isValid;
        }
        if (updateBtn) {
            updateBtn.disabled = !isValid;
        }
        if (previewBtn) {
            previewBtn.disabled = !this.currentDataset || !hasExpression;
        }
    }
    
    async previewMetric() {
        const expressionEditor = this.container.querySelector(`#${this._metricExpressionEditorId}`);
        const resultContainer = this.container.querySelector('#metric-result');
        
        if (!expressionEditor) {
            console.error('CalculationsPanel: Expression editor not found');
            return;
        }
        
        if (!resultContainer) {
            console.error('CalculationsPanel: Result container not found');
            return;
        }
        
        if (!this.currentDataset) {
            resultContainer.innerHTML = '<div class="error">Error: No dataset selected. Please select a dataset from the left pane.</div>';
            return;
        }
        
        const expression = expressionEditor.value.trim();
        
        if (!expression) {
            resultContainer.innerHTML = '<div class="error">Please enter a metric expression to preview.</div>';
            return;
        }
        
        // Show loading immediately
        resultContainer.innerHTML = '<div class="loading">Calculating preview...</div>';
        
        try {
            // Get full dataset (re-execute SQL without LIMIT if available, with caching)
            const fullDataset = await this.getFullDataset(this.currentDataset);
            
            // Evaluate metric script expression on full dataset
            const value = evaluateMetricScript(expression, fullDataset);
            
            if (value === null || isNaN(value)) {
                resultContainer.innerHTML = '<div class="error">Error: Could not calculate metric. Please check your expression.</div>';
                return;
            }
            
            // Get formatting options for preview
            const displayTypeSelect = this.container.querySelector(`#${this._metricDisplayTypeId}`);
            const decimalPlacesInput = this.container.querySelector(`#${this._metricDecimalPlacesId}`);
            const displayType = displayTypeSelect ? displayTypeSelect.value : 'numeric';
            const decimalPlaces = decimalPlacesInput ? parseInt(decimalPlacesInput.value, 10) : 2;
            
            // Show preview result
            resultContainer.innerHTML = `
                <div class="preview-result">
                    <strong>Preview Result:</strong><br>
                    <span class="metric-result-value">${this.formatValue(value, displayType, decimalPlaces)}</span>
                    <div class="preview-note">This is a preview. Click "Create Metric" to save.</div>
                </div>
            `;
            
        } catch (error) {
            resultContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    }
    
    async createMetric() {
        const nameInput = this.container.querySelector(`#${this._metricNameInputId}`);
        const expressionEditor = this.container.querySelector(`#${this._metricExpressionEditorId}`);
        const displayTypeSelect = this.container.querySelector(`#${this._metricDisplayTypeId}`);
        const decimalPlacesInput = this.container.querySelector(`#${this._metricDecimalPlacesId}`);
        const resultContainer = this.container.querySelector('#metric-result');
        
        if (!this.currentDataset) {
            if (resultContainer) {
                resultContainer.innerHTML = '<div class="error">Error: No dataset selected. Please select a dataset from the left pane.</div>';
            }
            return;
        }
        
        const name = nameInput ? nameInput.value.trim() : '';
        const expression = expressionEditor ? expressionEditor.value.trim() : '';
        const displayType = displayTypeSelect ? displayTypeSelect.value : 'numeric';
        const decimalPlaces = decimalPlacesInput ? parseInt(decimalPlacesInput.value, 10) : 2;
        
        if (!name || !expression) {
            return;
        }
        
        // Show loading immediately
        resultContainer.innerHTML = '<div class="loading">Calculating metric...</div>';
        
        try {
            // Get full dataset (re-execute SQL without LIMIT if available, with caching)
            const fullDataset = await this.getFullDataset(this.currentDataset);
            
            // Evaluate metric script expression on full dataset
            const value = evaluateMetricScript(expression, fullDataset);
            
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
            
            // Create the metric with expression and formatting options
            const metric = metricsStore.create(
                fullDataset.id,
                name,
                value,
                'calculated',
                column,
                operation,
                expression,
                displayType,
                decimalPlaces
            );
            
            // Show success with formatted value
            resultContainer.innerHTML = `
                <div class="success">
                    <strong>Metric created successfully!</strong><br>
                    <span class="metric-result-value">${this.escapeHtml(name)}: ${this.formatValue(value, displayType, decimalPlaces)}</span>
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
    
    formatValue(value, displayType = 'numeric', decimalPlaces = 2) {
        return formatMetricValue(value, displayType, decimalPlaces);
    }
    
    clearMetricForm() {
        const nameInput = this.container.querySelector(`#${this._metricNameInputId}`);
        const expressionEditor = this.container.querySelector(`#${this._metricExpressionEditorId}`);
        const displayTypeSelect = this.container.querySelector(`#${this._metricDisplayTypeId}`);
        const decimalPlacesInput = this.container.querySelector(`#${this._metricDecimalPlacesId}`);
        const resultContainer = this.container.querySelector('#metric-result');
        const createBtn = this.container.querySelector('#create-metric');
        const updateBtn = this.container.querySelector('#update-metric');
        
        if (nameInput) nameInput.value = '';
        if (expressionEditor) expressionEditor.value = '';
        if (displayTypeSelect) displayTypeSelect.value = 'numeric';
        if (decimalPlacesInput) decimalPlacesInput.value = '2';
        if (resultContainer) resultContainer.innerHTML = '';
        if (createBtn) createBtn.style.display = 'inline-block';
        if (updateBtn) updateBtn.style.display = 'none';
        this.editingMetricId = null;
        this.hideMetricSuggestions();
    }
    
    async updateMetric() {
        if (!this.editingMetricId) {
            return;
        }
        
        const nameInput = this.container.querySelector(`#${this._metricNameInputId}`);
        const expressionEditor = this.container.querySelector(`#${this._metricExpressionEditorId}`);
        const displayTypeSelect = this.container.querySelector(`#${this._metricDisplayTypeId}`);
        const decimalPlacesInput = this.container.querySelector(`#${this._metricDecimalPlacesId}`);
        const resultContainer = this.container.querySelector('#metric-result');
        
        if (!this.currentDataset) {
            if (resultContainer) {
                resultContainer.innerHTML = '<div class="error">Error: No dataset selected.</div>';
            }
            return;
        }
        
        const name = nameInput ? nameInput.value.trim() : '';
        const expression = expressionEditor ? expressionEditor.value.trim() : '';
        const displayType = displayTypeSelect ? displayTypeSelect.value : 'numeric';
        const decimalPlaces = decimalPlacesInput ? parseInt(decimalPlacesInput.value, 10) : 2;
        
        if (!name || !expression) {
            return;
        }
        
        // Show loading immediately
        if (resultContainer) {
            resultContainer.innerHTML = '<div class="loading">Updating metric...</div>';
        }
        
        try {
            // Get full dataset
            const fullDataset = await this.getFullDataset(this.currentDataset);
            
            // Evaluate metric script expression on full dataset
            const value = evaluateMetricScript(expression, fullDataset);
            
            if (value === null || isNaN(value)) {
                if (resultContainer) {
                    resultContainer.innerHTML = '<div class="error">Error: Could not calculate metric. Please check your expression.</div>';
                }
                return;
            }
            
            // Extract column and operation from expression
            const columnMatch = expression.match(/(?:SUM|MEAN|AVG|MIN|MAX|STDDEV|COUNT|COUNT_DISTINCT)\s*\(\s*(\w+)\s*\)/);
            const column = columnMatch ? columnMatch[1] : null;
            
            // Determine operation type
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
            
            // Update the metric
            const metric = metricsStore.update(this.editingMetricId, {
                name,
                value,
                expression,
                displayType,
                decimalPlaces,
                column,
                operation
            });
            
            if (!metric) {
                if (resultContainer) {
                    resultContainer.innerHTML = '<div class="error">Error: Could not update metric.</div>';
                }
                return;
            }
            
            // Show success
            if (resultContainer) {
                resultContainer.innerHTML = `
                    <div class="success">
                        <strong>Metric updated successfully!</strong><br>
                        <span class="metric-result-value">${this.escapeHtml(name)}: ${this.formatValue(value, displayType, decimalPlaces)}</span>
                    </div>
                `;
            }
            
            // Reset editing state
            this.editingMetricId = null;
            const createBtn = this.container.querySelector('#create-metric');
            const updateBtn = this.container.querySelector('#update-metric');
            if (createBtn) createBtn.style.display = 'inline-block';
            if (updateBtn) updateBtn.style.display = 'none';
            
            // Notify listeners
            if (this.metricDialog) {
                this.metricDialog.onCreated();
            }
            if (this.onMetricCreatedCallback) {
                this.onMetricCreatedCallback(metric);
            }
            
        } catch (error) {
            if (resultContainer) {
                resultContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            }
        }
    }
    
    setDataset(dataset) {
        this.currentDataset = dataset;
        
        // Clear cache when dataset changes
        if (dataset && this.fullDatasetCache) {
            // Only clear cache for different dataset
            const cacheKey = dataset.id;
            if (!this.fullDatasetCache.has(cacheKey)) {
                // New dataset, clear old cache entries to free memory
                this.fullDatasetCache.clear();
            }
        }
        
        // Update metric builder
        this.updateMetricSuggestions();
        this.updateCreateButtonState();
    }
    
    onMetricCreated(callback) {
        if (this.metricDialog) {
            this.metricDialog.onCreated(callback);
        }
    }
    
    editMetric(metricId, isDuplicate = false) {
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
        
        const nameInput = this.container.querySelector(`#${this._metricNameInputId}`);
        const expressionEditor = this.container.querySelector(`#${this._metricExpressionEditorId}`);
        const displayTypeSelect = this.container.querySelector(`#${this._metricDisplayTypeId}`);
        const decimalPlacesInput = this.container.querySelector(`#${this._metricDecimalPlacesId}`);
        const createBtn = this.container.querySelector('#create-metric');
        const updateBtn = this.container.querySelector('#update-metric');
        
        // If duplicating, append " (Copy)" to the name and don't set editing mode
        if (nameInput) {
            nameInput.value = isDuplicate ? `${metric.name || ''} (Copy)` : (metric.name || '');
        }
        
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
        
        // Load formatting options
        if (displayTypeSelect) {
            displayTypeSelect.value = metric.displayType || 'numeric';
        }
        if (decimalPlacesInput) {
            decimalPlacesInput.value = metric.decimalPlaces !== undefined ? metric.decimalPlaces : 2;
        }
        
        // Show update button if editing (not duplicating), hide create button
        if (!isDuplicate) {
            this.editingMetricId = metricId;
            if (createBtn) createBtn.style.display = 'none';
            if (updateBtn) updateBtn.style.display = 'inline-block';
        } else {
            this.editingMetricId = null;
            if (createBtn) createBtn.style.display = 'inline-block';
            if (updateBtn) updateBtn.style.display = 'none';
        }
        
        this.updateCreateButtonState();
        this.updateMetricSuggestions();
    }
    
    /**
     * Gets the full dataset by re-executing SQL without LIMIT if available
     * Uses caching to avoid re-executing the same query multiple times
     * @param {Object} dataset - Dataset object (may have limited rows)
     * @returns {Promise<Object>} Dataset with all rows
     */
    async getFullDataset(dataset) {
        if (!dataset) {
            return dataset;
        }
        
        // Check cache first
        const cacheKey = dataset.id;
        if (this.fullDatasetCache.has(cacheKey)) {
            const cached = this.fullDatasetCache.get(cacheKey);
            // Verify cache is still valid (same SQL)
            if (cached.sql === dataset.sql) {
                return cached;
            } else {
                // SQL changed, clear cache
                this.fullDatasetCache.delete(cacheKey);
            }
        }
        
        // If stored dataset already has a good number of rows (>= 100), use it directly
        // This avoids re-execution for datasets that are already reasonably complete
        if (dataset.rows && dataset.rows.length >= 100) {
            // Cache it for future use
            this.fullDatasetCache.set(cacheKey, dataset);
            return dataset;
        }
        
        // If dataset has SQL query, re-execute it without LIMIT to get all rows
        if (dataset.sql && dataset.sql.trim()) {
            try {
                // Remove any existing LIMIT clause
                let sqlWithoutLimit = dataset.sql
                    .replace(/;\s*$/, '') // Remove trailing semicolon
                    .replace(/\s+limit\s+\d+/gi, '') // Remove LIMIT clause
                    .trim();
                
                // Re-execute query without LIMIT to get all rows
                // Use 1000 rows instead of 10000 for faster execution (still plenty for metrics)
                const sqlResult = await executeSQL(sqlWithoutLimit, 1000);
                
                if (sqlResult && sqlResult.rows && sqlResult.rows.length > 0) {
                    // Create full dataset with all rows
                    const fullDataset = {
                        ...dataset,
                        rows: sqlResult.rows,
                        columns: sqlResult.columns || dataset.columns
                    };
                    
                    // Cache it for future use
                    this.fullDatasetCache.set(cacheKey, fullDataset);
                    
                    return fullDataset;
                }
            } catch (error) {
                console.warn('Could not re-execute SQL for full dataset, using stored dataset:', error);
                // Fall through to return original dataset
            }
        }
        
        // Return original dataset if no SQL or re-execution failed
        // Cache it anyway to avoid future checks
        this.fullDatasetCache.set(cacheKey, dataset);
        return dataset;
    }
    
    /**
     * Clears the full dataset cache (useful when datasets are updated)
     */
    clearFullDatasetCache() {
        this.fullDatasetCache.clear();
    }
}


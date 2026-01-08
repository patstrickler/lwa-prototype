// Script Execution Panel Component
// Allows choosing Python or R, accepting script text, and displaying results

import { scriptsStore } from '../data/scripts.js';
import { scriptExecutionEngine } from '../utils/script-execution-engine.js';
import { datasetStore } from '../data/datasets.js';
import { getColumnSuggestions, getWordStartPosition } from '../utils/script-autocomplete.js';
import { executeSQL } from '../utils/sql-engine.js';
import { datasetSelectionManager } from '../utils/dataset-selection-manager.js';

export class ScriptExecutionPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentDataset = null;
        this.saveCallbacks = [];
        this.suggestions = [];
        this.selectedSuggestionIndex = -1;
        this.autocompleteVisible = false;
        this.editingScriptId = null;
        this.lineResults = new Map(); // Store results for each line
        this.executionContext = null; // Maintain execution context between line executions
        
        // Listen to global selection changes
        datasetSelectionManager.onSelectionChanged((datasetId) => {
            this.syncWithGlobalSelection(datasetId);
        });
        
        this.init();
    }
    
    /**
     * Syncs this panel's dataset with the global selection manager
     * @param {string|null} datasetId - Dataset ID from global selection
     */
    syncWithGlobalSelection(datasetId) {
        if (!datasetId) {
            if (this.currentDataset) {
                this.currentDataset = null;
                this.render();
            }
            return;
        }
        
        // Only update if different from current selection
        if (!this.currentDataset || this.currentDataset.id !== datasetId) {
            const dataset = datasetStore.get(datasetId);
            if (dataset) {
                this.currentDataset = dataset;
                this.render();
            }
        }
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        const datasetInfo = this.currentDataset 
            ? `<div class="dataset-info-badge">
                <span class="material-icons" style="font-size: 16px; vertical-align: middle;">table_chart</span>
                <span>${this.escapeHtml(this.currentDataset.name)}</span>
                <span class="dataset-stats">${this.currentDataset.columns ? this.currentDataset.columns.length : 0} cols, ${this.currentDataset.rows ? this.currentDataset.rows.length : 0} rows</span>
               </div>`
            : '<div class="dataset-info-badge no-dataset"><span class="material-icons" style="font-size: 16px; vertical-align: middle;">info</span><span>Select a dataset from the sidebar to script on</span></div>';
        
        this.container.innerHTML = `
            <div class="script-execution-panel">
                <div class="script-header">
                    ${datasetInfo}
                </div>
                
                <div class="script-controls">
                    <div class="form-group">
                        <label for="script-language">Language:</label>
                        <select id="script-language" class="form-control">
                            <option value="python">Python</option>
                            <option value="r">R</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="script-name">Script Name:</label>
                        <input type="text" id="script-name" class="form-control" placeholder="e.g., Calculate Average">
                    </div>
                </div>
                
                <div class="form-group script-editor-wrapper">
                    <label for="script-editor">
                        Script Code:
                        <small class="text-muted" style="margin-left: 10px;">
                            <span class="material-icons" style="font-size: 14px; vertical-align: middle;">keyboard</span>
                            Ctrl+Enter: Run line | Ctrl+Shift+Enter: Run selection | F5: Run all
                        </small>
                    </label>
                    <div class="script-editor-container">
                        <div class="script-editor-with-lines">
                            <div class="script-line-numbers" id="script-line-numbers"></div>
                            <textarea id="script-editor" class="script-editor" placeholder="Enter your script code here...&#10;&#10;Example (Python):&#10;result = df['column_name'].mean()&#10;&#10;Or create a plot:&#10;import matplotlib.pyplot as plt&#10;plt.plot(df['column_name'])&#10;plt.title('My Plot')&#10;&#10;Example (R):&#10;result <- mean(df$column_name)&#10;&#10;Note: The dataset is available as 'df' (pandas DataFrame) or 'dataset' (dict)"></textarea>
                            <div id="script-inline-results" class="script-inline-results"></div>
                        </div>
                        <div id="script-autocomplete-suggestions" class="autocomplete-suggestions" style="display: none;"></div>
                    </div>
                </div>
                
                <div class="script-actions">
                    <button id="run-script" class="btn btn-primary">
                        <span class="material-icons" style="font-size: 18px; vertical-align: middle;">play_arrow</span>
                        Run Script
                    </button>
                    <button id="save-script" class="btn btn-secondary" disabled>
                        <span class="material-icons" style="font-size: 18px; vertical-align: middle;">save</span>
                        Save Script
                    </button>
                    <button id="clear-script" class="btn btn-outline-secondary">
                        <span class="material-icons" style="font-size: 18px; vertical-align: middle;">clear</span>
                        Clear
                    </button>
                </div>
                
                <div id="script-result" class="script-result"></div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const runBtn = this.container.querySelector('#run-script');
        const saveBtn = this.container.querySelector('#save-script');
        const clearBtn = this.container.querySelector('#clear-script');
        const scriptEditor = this.container.querySelector('#script-editor');
        const scriptName = this.container.querySelector('#script-name');
        
        runBtn.addEventListener('click', () => this.executeScript());
        saveBtn.addEventListener('click', () => this.saveScript());
        clearBtn.addEventListener('click', () => this.clearScript());
        
        // Enable save button when script has content
        scriptEditor.addEventListener('input', (e) => {
            saveBtn.disabled = !scriptEditor.value.trim() || !scriptName.value.trim();
            this.handleInput(e);
        });
        scriptName.addEventListener('input', () => {
            saveBtn.disabled = !scriptEditor.value.trim() || !scriptName.value.trim();
        });
        
        // Handle keyboard events for autocomplete and line execution
        scriptEditor.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
            this.handleExecutionShortcuts(e);
        });
        
        // Update line numbers on input
        scriptEditor.addEventListener('input', () => {
            this.updateLineNumbers();
        });
        
        // Update line numbers on scroll (sync with editor)
        scriptEditor.addEventListener('scroll', () => {
            this.syncLineNumbersScroll();
            this.updateInlineResultsPosition();
        });
        
        // Initialize line numbers
        this.updateLineNumbers();
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }
    
    handleInput(e) {
        this.updateSuggestions();
    }
    
    handleKeyDown(e) {
        const scriptEditor = this.container.querySelector('#script-editor');
        const suggestionsDiv = this.container.querySelector('#script-autocomplete-suggestions');
        
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
        const scriptEditor = this.container.querySelector('#script-editor');
        if (!scriptEditor) return;
        
        const scriptText = scriptEditor.value;
        const cursorPosition = scriptEditor.selectionStart;
        
        // Get dataset for column suggestions
        const dataset = this.currentDataset ? datasetStore.get(this.currentDataset.id) : null;
        
        if (dataset && dataset.columns) {
            this.suggestions = getColumnSuggestions(scriptText, cursorPosition, dataset);
            
            if (this.suggestions.length > 0) {
                this.selectedSuggestionIndex = -1;
                this.showSuggestions();
            } else {
                this.hideSuggestions();
            }
        } else {
            this.hideSuggestions();
        }
    }
    
    showSuggestions() {
        const scriptEditor = this.container.querySelector('#script-editor');
        const suggestionsDiv = this.container.querySelector('#script-autocomplete-suggestions');
        
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
                    <span class="suggestion-text">${this.escapeHtml(suggestion.display || suggestion.text)}</span>
                </div>
            `;
        }).join('');
        
        // Position suggestions
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
        const suggestionsDiv = this.container.querySelector('#script-autocomplete-suggestions');
        if (suggestionsDiv) {
            suggestionsDiv.style.display = 'none';
        }
        this.autocompleteVisible = false;
        this.selectedSuggestionIndex = -1;
    }
    
    highlightSuggestion() {
        const suggestionsDiv = this.container.querySelector('#script-autocomplete-suggestions');
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
        const scriptEditor = this.container.querySelector('#script-editor');
        const suggestionsDiv = this.container.querySelector('#script-autocomplete-suggestions');
        const editorContainer = scriptEditor.closest('.script-editor-container');
        
        if (!scriptEditor || !suggestionsDiv || !editorContainer) return;
        
        // Position relative to editor container
        suggestionsDiv.style.left = '0px';
        suggestionsDiv.style.top = `${scriptEditor.offsetHeight + 2}px`;
    }
    
    insertSuggestion(suggestion) {
        const scriptEditor = this.container.querySelector('#script-editor');
        const scriptText = scriptEditor.value;
        const cursorPosition = scriptEditor.selectionStart;
        const textBeforeCursor = scriptText.substring(0, cursorPosition);
        
        const wordStart = getWordStartPosition(textBeforeCursor);
        const wordEnd = cursorPosition;
        
        // Replace current word with suggestion
        const newScript = scriptText.substring(0, wordStart) + suggestion.text + scriptText.substring(wordEnd);
        
        // Update textarea
        scriptEditor.value = newScript;
        
        // Set cursor position after inserted text
        const newCursorPosition = wordStart + suggestion.text.length;
        scriptEditor.setSelectionRange(newCursorPosition, newCursorPosition);
        
        // Hide suggestions and update
        this.hideSuggestions();
        this.updateSuggestions();
        
        // Focus back on editor
        scriptEditor.focus();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    setDataset(dataset) {
        this.currentDataset = dataset;
        // Update global selection manager
        if (dataset) {
            datasetSelectionManager.setSelectedDatasetId(dataset.id);
        } else {
            datasetSelectionManager.setSelectedDatasetId(null);
        }
        // Re-render to show updated dataset info
        const scriptEditor = this.container.querySelector('#script-editor');
        const scriptName = this.container.querySelector('#script-name');
        const languageSelect = this.container.querySelector('#script-language');
        
        // Preserve current script content
        const currentScript = scriptEditor ? scriptEditor.value : '';
        const currentName = scriptName ? scriptName.value : '';
        const currentLanguage = languageSelect ? languageSelect.value : 'python';
        
        // Re-render
        this.render();
        
        // Restore script content
        const newScriptEditor = this.container.querySelector('#script-editor');
        const newScriptName = this.container.querySelector('#script-name');
        const newLanguageSelect = this.container.querySelector('#script-language');
        
        if (newScriptEditor && currentScript) {
            newScriptEditor.value = currentScript;
        }
        if (newScriptName && currentName) {
            newScriptName.value = currentName;
        }
        if (newLanguageSelect && currentLanguage) {
            newLanguageSelect.value = currentLanguage;
        }
        
        // Re-attach event listeners
        this.attachEventListeners();
        
        // Update suggestions when dataset changes
        this.updateSuggestions();
    }
    
    async executeScript() {
        const language = this.container.querySelector('#script-language').value;
        const scriptText = this.container.querySelector('#script-editor').value.trim();
        const resultContainer = this.container.querySelector('#script-result');
        
        if (!scriptText) {
            resultContainer.innerHTML = '<div class="error">Please enter script code.</div>';
            return;
        }
        
        // Validate script
        const validation = scriptExecutionEngine.validate(language, scriptText);
        if (!validation.isValid) {
            resultContainer.innerHTML = `<div class="error">${validation.errors.join('<br>')}</div>`;
            return;
        }
        
        // Get current dataset (read-only)
        const storedDataset = this.currentDataset ? datasetStore.get(this.currentDataset.id) : null;
        
        // Get full dataset (re-execute SQL without LIMIT if available)
        const dataset = await this.getFullDataset(storedDataset);
        
        // Show loading state
        resultContainer.innerHTML = '<div class="script-loading">Executing script...<br><small>This may take a moment for Python scripts (initializing Pyodide on first run)</small></div>';
        
        try {
            // Execute script (now async) on full dataset
            const result = await scriptExecutionEngine.execute(language, scriptText, dataset);
            
            // Display result
            this.displayResult(result);
            
            // Enable save button
            const saveBtn = this.container.querySelector('#save-script');
            saveBtn.disabled = false;
        } catch (error) {
            resultContainer.innerHTML = `<div class="error">Error: ${this.escapeHtml(error.message)}</div>`;
            console.error('Script execution error:', error);
        }
    }
    
    displayResult(result) {
        const resultContainer = this.container.querySelector('#script-result');
        
        switch (result.type) {
            case 'scalar':
                resultContainer.innerHTML = `
                    <div class="result-scalar">
                        <div class="result-header">
                            <span class="result-type">Scalar Result</span>
                            <span class="result-language">${result.language.toUpperCase()}</span>
                        </div>
                        <div class="result-value">${this.formatValue(result.value)}</div>
                        ${result.output ? `<div class="script-output" style="margin-top: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-family: monospace; font-size: 12px;">${this.escapeHtml(result.output)}</div>` : ''}
                        ${result.note ? `<div class="script-note" style="margin-top: 10px; padding: 8px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; font-size: 12px; color: #856404;">${this.escapeHtml(result.note)}</div>` : ''}
                    </div>
                `;
                break;
                
            case 'series':
                resultContainer.innerHTML = `
                    <div class="result-series">
                        <div class="result-header">
                            <span class="result-type">Series Result</span>
                            <span class="result-language">${result.language.toUpperCase()}</span>
                        </div>
                        <div class="series-chart">
                            <canvas id="series-chart" width="400" height="200"></canvas>
                        </div>
                        <div class="series-data">
                            <strong>Data:</strong> [${result.value.join(', ')}]
                        </div>
                        ${result.output ? `<div class="script-output" style="margin-top: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-family: monospace; font-size: 12px;">${this.escapeHtml(result.output)}</div>` : ''}
                        ${result.note ? `<div class="script-note" style="margin-top: 10px; padding: 8px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; font-size: 12px; color: #856404;">${this.escapeHtml(result.note)}</div>` : ''}
                    </div>
                `;
                // Draw simple line chart
                this.drawSeriesChart(result.value);
                break;
                
            case 'image':
                const imageSrc = typeof result.value === 'string' && result.value.startsWith('data:image')
                    ? result.value
                    : null;
                
                resultContainer.innerHTML = `
                    <div class="result-image">
                        <div class="result-header">
                            <span class="result-type">Image Result</span>
                            <span class="result-language">${result.language.toUpperCase()}</span>
                        </div>
                        ${imageSrc 
                            ? `<div class="image-container">
                                <img src="${imageSrc}" alt="Generated plot" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;" />
                               </div>`
                            : `<div class="image-placeholder">
                                <div class="image-icon">📊</div>
                                <div class="image-label">Chart/Plot</div>
                                <div class="image-note">Plot generated successfully</div>
                               </div>`
                        }
                        ${result.output ? `<div class="script-output" style="margin-top: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-family: monospace; font-size: 12px;">${this.escapeHtml(result.output)}</div>` : ''}
                    </div>
                `;
                break;
                
            default:
                resultContainer.innerHTML = `<div class="error">Unknown result type: ${result.type}</div>`;
        }
    }
    
    drawSeriesChart(data) {
        const canvas = document.getElementById('series-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 20;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set up chart area
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        // Find min and max values
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        
        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Draw line
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
            const y = height - padding - ((value - min) / range) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = '#007bff';
        data.forEach((value, index) => {
            const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
            const y = height - padding - ((value - min) / range) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
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
    
    async saveScript() {
        const language = this.container.querySelector('#script-language').value;
        const scriptText = this.container.querySelector('#script-editor').value.trim();
        const scriptName = this.container.querySelector('#script-name').value.trim();
        const resultContainer = this.container.querySelector('#script-result');
        
        if (!scriptName || !scriptText) {
            return;
        }
        
        // Get current result if available
        const resultElement = resultContainer.querySelector('.result-scalar, .result-series, .result-image');
        let result = null;
        if (resultElement) {
            // Extract result from displayed result
            const resultType = resultElement.classList.contains('result-scalar') ? 'scalar' :
                              resultElement.classList.contains('result-series') ? 'series' : 'image';
                // Re-execute to get the result
            try {
                const storedDataset = this.currentDataset ? datasetStore.get(this.currentDataset.id) : null;
                if (storedDataset) {
                    // Get full dataset for execution
                    const fullDataset = await this.getFullDataset(storedDataset);
                    result = await scriptExecutionEngine.execute(language, scriptText, fullDataset);
                }
            } catch (error) {
                console.error('Error getting result for save:', error);
            }
        }
        
        // Update existing script or create new one
        let script;
        if (this.editingScriptId) {
            // For now, we'll create a new script since we don't have an update method
            // In a real implementation, you'd update the existing script
            script = scriptsStore.create(scriptName, scriptText, language, '', result);
            this.editingScriptId = null;
        } else {
            // Create new script
            script = scriptsStore.create(scriptName, scriptText, language, '', result);
        }
        
        // Notify listeners
        this.notifySaved(script);
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = `Script "${scriptName}" saved successfully!`;
        resultContainer.insertBefore(successMsg, resultContainer.firstChild);
        
        setTimeout(() => {
            successMsg.remove();
        }, 3000);
    }
    
    onSaved(callback) {
        this.saveCallbacks.push(callback);
    }
    
    notifySaved(script) {
        this.saveCallbacks.forEach(callback => callback(script));
    }
    
    clearScript() {
        this.container.querySelector('#script-editor').value = '';
        this.container.querySelector('#script-name').value = '';
        this.container.querySelector('#script-result').innerHTML = '';
        this.container.querySelector('#save-script').disabled = true;
        this.editingScriptId = null;
        this.clearInlineResults();
    }
    
    loadScriptForEditing(scriptId) {
        const script = scriptsStore.get(scriptId);
        if (!script) {
            return;
        }
        
        const languageSelect = this.container.querySelector('#script-language');
        const scriptEditor = this.container.querySelector('#script-editor');
        const scriptName = this.container.querySelector('#script-name');
        const saveBtn = this.container.querySelector('#save-script');
        const resultContainer = this.container.querySelector('#script-result');
        
        // Set values
        if (languageSelect) languageSelect.value = script.language || 'python';
        if (scriptEditor) scriptEditor.value = script.code || '';
        if (scriptName) scriptName.value = script.name || '';
        
        // Enable save button
        if (saveBtn) saveBtn.disabled = false;
        
        // Store editing ID
        this.editingScriptId = scriptId;
        
        // Display result if available
        if (script.result && resultContainer) {
            this.displayResult(script.result);
        }
        
        // Update line numbers
        this.updateLineNumbers();
        
        // Scroll to editor
        if (scriptEditor) {
            scriptEditor.focus();
        }
    }
    
    handleExecutionShortcuts(e) {
        const scriptEditor = this.container.querySelector('#script-editor');
        if (!scriptEditor) return;
        
        // Ctrl+Enter or Cmd+Enter: Run current line
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.executeCurrentLine();
        }
        // Ctrl+Shift+Enter: Run selection
        else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
            e.preventDefault();
            this.executeSelection();
        }
        // F5: Run all
        else if (e.key === 'F5') {
            e.preventDefault();
            this.executeScript();
        }
    }
    
    updateLineNumbers() {
        const scriptEditor = this.container.querySelector('#script-editor');
        const lineNumbers = this.container.querySelector('#script-line-numbers');
        if (!scriptEditor || !lineNumbers) return;
        
        const lines = scriptEditor.value.split('\n');
        const lineCount = lines.length;
        
        lineNumbers.innerHTML = lines.map((_, index) => {
            const lineNum = index + 1;
            const hasResult = this.lineResults.has(lineNum);
            const resultClass = hasResult ? 'has-result' : '';
            return `<div class="line-number ${resultClass}" data-line="${lineNum}">${lineNum}</div>`;
        }).join('');
        
        // Sync scroll
        this.syncLineNumbersScroll();
    }
    
    syncLineNumbersScroll() {
        const scriptEditor = this.container.querySelector('#script-editor');
        const lineNumbers = this.container.querySelector('#script-line-numbers');
        if (scriptEditor && lineNumbers) {
            lineNumbers.scrollTop = scriptEditor.scrollTop;
        }
    }
    
    getCurrentLine() {
        const scriptEditor = this.container.querySelector('#script-editor');
        if (!scriptEditor) return null;
        
        const text = scriptEditor.value;
        const cursorPos = scriptEditor.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPos);
        const lines = textBeforeCursor.split('\n');
        const currentLineNum = lines.length;
        const currentLine = lines[lines.length - 1];
        
        return {
            lineNum: currentLineNum,
            line: currentLine,
            fullText: text
        };
    }
    
    getSelection() {
        const scriptEditor = this.container.querySelector('#script-editor');
        if (!scriptEditor) return null;
        
        const start = scriptEditor.selectionStart;
        const end = scriptEditor.selectionEnd;
        
        if (start === end) {
            return null; // No selection
        }
        
        const text = scriptEditor.value;
        const selectedText = text.substring(start, end);
        
        // Get line numbers for selection
        const textBeforeStart = text.substring(0, start);
        const textBeforeEnd = text.substring(0, end);
        const startLine = textBeforeStart.split('\n').length;
        const endLine = textBeforeEnd.split('\n').length;
        
        return {
            text: selectedText,
            startLine,
            endLine,
            start,
            end
        };
    }
    
    async executeCurrentLine() {
        const lineInfo = this.getCurrentLine();
        if (!lineInfo || !lineInfo.line.trim()) {
            return;
        }
        
        await this.executeLine(lineInfo.lineNum, lineInfo.line);
    }
    
    async executeSelection() {
        const selection = this.getSelection();
        if (!selection) {
            // If no selection, execute current line
            await this.executeCurrentLine();
            return;
        }
        
        await this.executeCodeBlock(selection.text, selection.startLine, selection.endLine);
    }
    
    async executeLine(lineNum, lineText) {
        if (!lineText.trim()) return;
        
        const language = this.container.querySelector('#script-language').value;
        
        // Show loading indicator
        this.showInlineResult(lineNum, '<div class="inline-loading">Running...</div>');
        
        try {
            // Get or initialize execution context
            if (!this.executionContext) {
                await this.initializeExecutionContext(language);
            }
            
            // Execute the line in context
            const result = await this.executeInContext(language, lineText);
            
            // Display inline result
            this.showInlineResult(lineNum, this.formatInlineResult(result));
            this.lineResults.set(lineNum, result);
            
            // Update line number indicator
            this.updateLineNumberIndicator(lineNum, true);
            
        } catch (error) {
            this.showInlineResult(lineNum, `<div class="inline-error">${this.escapeHtml(error.message)}</div>`);
            this.lineResults.set(lineNum, { error: error.message });
        }
    }
    
    async executeCodeBlock(code, startLine, endLine) {
        const language = this.container.querySelector('#script-language').value;
        
        // Show loading for all lines in selection
        for (let i = startLine; i <= endLine; i++) {
            this.showInlineResult(i, '<div class="inline-loading">Running...</div>');
        }
        
        try {
            // Get or initialize execution context
            if (!this.executionContext) {
                await this.initializeExecutionContext(language);
            }
            
            // Execute the code block
            const result = await this.executeInContext(language, code);
            
            // Display result on the last line
            this.showInlineResult(endLine, this.formatInlineResult(result));
            this.lineResults.set(endLine, result);
            this.updateLineNumberIndicator(endLine, true);
            
        } catch (error) {
            this.showInlineResult(endLine, `<div class="inline-error">${this.escapeHtml(error.message)}</div>`);
        }
    }
    
    async initializeExecutionContext(language) {
        const storedDataset = this.currentDataset ? datasetStore.get(this.currentDataset.id) : null;
        const dataset = await this.getFullDataset(storedDataset);
        
        this.executionContext = {
            language,
            dataset,
            initialized: false
        };
        
        // Initialize the execution engine with dataset
        if (language === 'python') {
            // For Python, we'll initialize Pyodide and set up the dataset
            await scriptExecutionEngine.initializePyodide();
            const datasetCode = scriptExecutionEngine.prepareDatasetForPython(dataset);
            await scriptExecutionEngine.pyodide.runPython(datasetCode);
            this.executionContext.initialized = true;
        }
    }
    
    async executeInContext(language, code) {
        if (!this.executionContext) {
            throw new Error('Execution context not initialized');
        }
        
        if (language === 'python') {
            return await this.executePythonLine(code);
        } else {
            return await this.executeRLine(code);
        }
    }
    
    async executePythonLine(code) {
        const pyodide = scriptExecutionEngine.pyodide;
        if (!pyodide) {
            throw new Error('Python environment not initialized');
        }
        
        // Capture print output
        pyodide.runPython(`
            import sys
            from io import StringIO
            if '_output_buffer' not in locals():
                _output_buffer = StringIO()
                sys.stdout = _output_buffer
        `);
        
        // Execute the line
        try {
            pyodide.runPython(code);
        } catch (error) {
            pyodide.runPython('sys.stdout = sys.__stdout__');
            throw error;
        }
        
        // Get print output
        const output = pyodide.runPython('_output_buffer.getvalue()');
        pyodide.runPython('_output_buffer.seek(0); _output_buffer.truncate(0)');
        
        // Try to get result if it exists
        let result = null;
        try {
            result = pyodide.runPython('result if "result" in locals() else None');
        } catch (e) {
            // result might not exist, that's okay
        }
        
        return {
            result,
            output: output || null,
            type: result !== null ? (Array.isArray(result) ? 'series' : 'scalar') : 'output'
        };
    }
    
    async executeRLine(code) {
        // For R, use the execution engine
        const result = await scriptExecutionEngine.executeR(code, this.executionContext.dataset);
        return {
            result: result.value,
            output: null,
            type: result.type
        };
    }
    
    showInlineResult(lineNum, html) {
        const inlineResults = this.container.querySelector('#script-inline-results');
        if (!inlineResults) return;
        
        let resultDiv = inlineResults.querySelector(`[data-line="${lineNum}"]`);
        if (!resultDiv) {
            resultDiv = document.createElement('div');
            resultDiv.className = 'inline-result';
            resultDiv.setAttribute('data-line', lineNum);
            resultDiv.id = `inline-result-${lineNum}`;
            inlineResults.appendChild(resultDiv);
        }
        
        resultDiv.innerHTML = html;
        
        // Position the result
        this.positionInlineResult(lineNum);
    }
    
    positionInlineResult(lineNum) {
        const scriptEditor = this.container.querySelector('#script-editor');
        const resultDiv = this.container.querySelector(`#inline-result-${lineNum}`);
        const editorContainer = scriptEditor?.closest('.script-editor-container');
        if (!scriptEditor || !resultDiv || !editorContainer) return;
        
        // Calculate line position based on scroll
        const lineHeight = 20; // Approximate line height
        const padding = 12;
        const editorScrollTop = scriptEditor.scrollTop;
        const topOffset = (lineNum - 1) * lineHeight + padding - editorScrollTop;
        
        resultDiv.style.top = `${Math.max(0, topOffset)}px`;
    }
    
    formatInlineResult(result) {
        if (result.error) {
            return `<div class="inline-error">${this.escapeHtml(result.error)}</div>`;
        }
        
        let html = '';
        
        if (result.output) {
            html += `<div class="inline-output">${this.escapeHtml(result.output)}</div>`;
        }
        
        if (result.result !== null && result.result !== undefined) {
            const value = this.formatValue(result.result);
            html += `<div class="inline-value">${value}</div>`;
        }
        
        return html || '<div class="inline-success">✓</div>';
    }
    
    updateLineNumberIndicator(lineNum, hasResult) {
        const lineNumber = this.container.querySelector(`#script-line-numbers .line-number[data-line="${lineNum}"]`);
        if (lineNumber) {
            if (hasResult) {
                lineNumber.classList.add('has-result');
            } else {
                lineNumber.classList.remove('has-result');
            }
        }
    }
    
    updateInlineResultsPosition() {
        // Update position of all inline results on scroll
        this.lineResults.forEach((result, lineNum) => {
            this.positionInlineResult(lineNum);
        });
    }
    
    clearInlineResults() {
        const inlineResults = this.container.querySelector('#script-inline-results');
        if (inlineResults) {
            inlineResults.innerHTML = '';
        }
        this.lineResults.clear();
        this.executionContext = null;
        this.updateLineNumbers();
    }
    
    /**
     * Gets the full dataset by re-executing SQL without LIMIT if available
     * @param {Object} dataset - Dataset object (may have limited rows)
     * @returns {Promise<Object>} Dataset with all rows
     */
    async getFullDataset(dataset) {
        if (!dataset) {
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
                // Use a large number for the mock engine's row generation
                const sqlResult = await executeSQL(sqlWithoutLimit, 10000);
                
                if (sqlResult && sqlResult.rows && sqlResult.rows.length > 0) {
                    // Return dataset with all rows
                    return {
                        ...dataset,
                        rows: sqlResult.rows,
                        columns: sqlResult.columns || dataset.columns
                    };
                }
            } catch (error) {
                console.warn('Could not re-execute SQL for full dataset, using stored dataset:', error);
                // Fall through to return original dataset
            }
        }
        
        // Return original dataset if no SQL or re-execution failed
        return dataset;
    }
}


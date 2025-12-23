// Script Execution Panel Component
// Allows choosing Python or R, accepting script text, and displaying results

import { scriptsStore } from '../data/scripts.js';
import { scriptExecutionEngine } from '../utils/script-execution-engine.js';
import { datasetStore } from '../data/datasets.js';

export class ScriptExecutionPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentDataset = null;
        this.saveCallbacks = [];
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="script-execution-panel">
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
                
                <div class="form-group">
                    <label for="script-editor">Script Code:</label>
                    <textarea id="script-editor" class="script-editor" placeholder="Enter your script code here..."></textarea>
                </div>
                
                <div class="script-actions">
                    <button id="run-script" class="btn btn-primary">Run Script</button>
                    <button id="save-script" class="btn btn-secondary" disabled>Save Script</button>
                    <button id="clear-script" class="btn btn-secondary">Clear</button>
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
        scriptEditor.addEventListener('input', () => {
            saveBtn.disabled = !scriptEditor.value.trim() || !scriptName.value.trim();
        });
        scriptName.addEventListener('input', () => {
            saveBtn.disabled = !scriptEditor.value.trim() || !scriptName.value.trim();
        });
    }
    
    setDataset(dataset) {
        this.currentDataset = dataset;
    }
    
    executeScript() {
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
        const dataset = this.currentDataset ? datasetStore.get(this.currentDataset.id) : null;
        
        // Show loading state
        resultContainer.innerHTML = '<div class="script-loading">Executing script...</div>';
        
        // Simulate execution delay
        setTimeout(() => {
            try {
                // Execute script (mocked)
                const result = scriptExecutionEngine.execute(language, scriptText, dataset);
                
                // Display result
                this.displayResult(result);
                
                // Enable save button
                const saveBtn = this.container.querySelector('#save-script');
                saveBtn.disabled = false;
            } catch (error) {
                resultContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            }
        }, 500); // Simulate 500ms execution time
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
                    </div>
                `;
                // Draw simple line chart
                this.drawSeriesChart(result.value);
                break;
                
            case 'image':
                resultContainer.innerHTML = `
                    <div class="result-image">
                        <div class="result-header">
                            <span class="result-type">Image Result</span>
                            <span class="result-language">${result.language.toUpperCase()}</span>
                        </div>
                        <div class="image-placeholder">
                            <div class="image-icon">📊</div>
                            <div class="image-label">Chart/Plot (Mock)</div>
                            <div class="image-note">In a real implementation, this would display the generated plot</div>
                        </div>
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
    
    saveScript() {
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
            // For simplicity, we'll re-execute to get the result
            try {
                const dataset = this.currentDataset ? datasetStore.get(this.currentDataset.id) : null;
                result = scriptExecutionEngine.execute(language, scriptText, dataset);
            } catch (error) {
                console.error('Error getting result for save:', error);
            }
        }
        
        // Create script
        const script = scriptsStore.create(scriptName, scriptText, language, '', result);
        
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
    }
}


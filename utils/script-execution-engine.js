// Script Execution Engine
// Executes Python scripts using Pyodide and R scripts (with backend support note)

/**
 * Script Execution Engine
 * Executes Python scripts in the browser using Pyodide
 * For R, provides enhanced processing with dataset support
 */
export class ScriptExecutionEngine {
    constructor() {
        this.pyodide = null;
        this.pyodideLoading = false;
        this.pyodideLoadPromise = null;
    }
    
    /**
     * Initialize Pyodide for Python execution
     * @returns {Promise<void>}
     */
    async initializePyodide() {
        if (this.pyodide) {
            return; // Already initialized
        }
        
        if (this.pyodideLoading) {
            return this.pyodideLoadPromise; // Return existing promise
        }
        
        this.pyodideLoading = true;
        this.pyodideLoadPromise = (async () => {
            try {
                // Check if Pyodide is available
                if (typeof loadPyodide === 'undefined') {
                    throw new Error('Pyodide is not loaded. Please ensure pyodide.js is included in the page.');
                }
                
                this.pyodide = await loadPyodide({
                    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
                });
                
                // Install pandas and numpy for data analysis
                await this.pyodide.loadPackage(['pandas', 'numpy', 'micropip']);
                
                // Set up matplotlib backend (non-interactive)
                await this.pyodide.runPython(`
                    import matplotlib
                    matplotlib.use('Agg')
                    import matplotlib.pyplot as plt
                    import io
                    import base64
                `);
                
                console.log('Pyodide initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Pyodide:', error);
                this.pyodideLoading = false;
                throw error;
            }
        })();
        
        return this.pyodideLoadPromise;
    }
    
    /**
     * Converts dataset to Python pandas DataFrame format
     * @param {Object} dataset - Dataset object with columns and rows
     * @returns {string} Python code to create DataFrame
     */
    prepareDatasetForPython(dataset) {
        if (!dataset || !dataset.columns || !dataset.rows) {
            return 'df = None';
        }
        
        // Convert dataset to Python dict format
        const columns = dataset.columns;
        const rows = dataset.rows;
        
        // Build Python code to create DataFrame
        let pythonCode = `
import pandas as pd
import numpy as np

# Dataset columns
columns = ${JSON.stringify(columns)}

# Dataset rows
rows = ${JSON.stringify(rows)}

# Create DataFrame
df = pd.DataFrame(rows, columns=columns)

# Make dataset available
dataset = {
    'columns': columns,
    'rows': rows,
    'dataframe': df
}
`;
        return pythonCode;
    }
    
    /**
     * Executes a Python script using Pyodide
     * @param {string} scriptText - Python script code
     * @param {Object} dataset - Dataset object
     * @returns {Promise<Object>} Result object
     */
    async executePython(scriptText, dataset) {
        if (!this.pyodide) {
            await this.initializePyodide();
        }
        
        try {
            // Prepare dataset
            const datasetCode = this.prepareDatasetForPython(dataset);
            
            // Combine dataset setup with user script
            const fullScript = datasetCode + '\n\n# User script\n' + scriptText;
            
            // Check if script returns a value or produces output
            const hasReturn = /return\s+/.test(scriptText);
            const hasPrint = /print\s*\(/.test(scriptText);
            const hasPlot = /plt\.|matplotlib|seaborn|plotly|px\./.test(scriptText);
            
            // Execute script
            let result;
            let output = '';
            
            // Capture print output
            if (hasPrint) {
                this.pyodide.runPython(`
                    import sys
                    from io import StringIO
                    _output_buffer = StringIO()
                    sys.stdout = _output_buffer
                `);
            }
            
            // Execute the script directly
            const finalScript = datasetCode + '\n\n# User script\n' + scriptText;
            this.pyodide.runPython(finalScript);
            
            // Try to get result variable if it exists
            try {
                result = this.pyodide.runPython('result if "result" in locals() else None');
            } catch (e) {
                result = null;
            }
            
            // Get print output
            if (hasPrint) {
                output = this.pyodide.runPython('_output_buffer.getvalue()');
                this.pyodide.runPython('sys.stdout = sys.__stdout__');
            }
            
            // Check for plots
            if (hasPlot) {
                try {
                    // Try to get plot as base64 image
                    const plotBase64 = this.pyodide.runPython(`
                        import io
                        import base64
                        buf = io.BytesIO()
                        plt.savefig(buf, format='png', bbox_inches='tight')
                        buf.seek(0)
                        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
                        plt.close()
                        img_base64
                    `);
                    
                    return {
                        type: 'image',
                        value: `data:image/png;base64,${plotBase64}`,
                        language: 'python',
                        executedAt: new Date().toISOString(),
                        output: output || undefined
                    };
                } catch (e) {
                    // Plot creation failed, continue with other result types
                    console.warn('Plot creation failed:', e);
                }
            }
            
            // Determine result type
            if (result === null || result === undefined) {
                return {
                    type: 'scalar',
                    value: output || 'Script executed successfully (no return value)',
                    language: 'python',
                    executedAt: new Date().toISOString(),
                    output: output || undefined
                };
            }
            
            // Convert Pyodide objects to JavaScript
            let parsedResult;
            try {
                const jsResult = this.pyodide.runPython(`
                    import json
                    import numpy as np
                    import pandas as pd
                    
                    def to_js(obj):
                        if obj is None:
                            return None
                        elif isinstance(obj, (np.integer, np.floating)):
                            return float(obj)
                        elif isinstance(obj, np.ndarray):
                            return obj.tolist()
                        elif isinstance(obj, pd.Series):
                            return obj.tolist()
                        elif isinstance(obj, pd.DataFrame):
                            return obj.to_dict('records')
                        elif isinstance(obj, (int, float, str, bool)):
                            return obj
                        elif isinstance(obj, (list, tuple)):
                            return [to_js(item) for item in obj]
                        elif isinstance(obj, dict):
                            return {str(k): to_js(v) for k, v in obj.items()}
                        else:
                            return str(obj)
                    
                    json.dumps(to_js(result))
                `);
                
                parsedResult = JSON.parse(jsResult);
            } catch (e) {
                // If conversion fails, return as string
                parsedResult = String(result);
            }
            
            // Determine type
            if (Array.isArray(parsedResult)) {
                // Check if it's a series (1D array of numbers)
                if (parsedResult.length > 0 && parsedResult.every(v => typeof v === 'number')) {
                    return {
                        type: 'series',
                        value: parsedResult,
                        language: 'python',
                        executedAt: new Date().toISOString(),
                        output: output || undefined
                    };
                }
            }
            
            // Default to scalar
            return {
                type: 'scalar',
                value: parsedResult,
                language: 'python',
                executedAt: new Date().toISOString(),
                output: output || undefined
            };
            
        } catch (error) {
            throw new Error(`Python execution error: ${error.message}`);
        }
    }
    
    /**
     * Executes an R script (enhanced processing with dataset)
     * Note: Full R execution requires a backend service
     * This provides dataset-aware processing
     * @param {string} scriptText - R script code
     * @param {Object} dataset - Dataset object
     * @returns {Promise<Object>} Result object
     */
    async executeR(scriptText, dataset) {
        // For now, provide enhanced dataset processing
        // In a production environment, this would call a backend R service
        
        if (!dataset || !dataset.columns || !dataset.rows) {
            throw new Error('R scripts require a dataset to be selected');
        }
        
        // Parse R script to extract operations
        const scriptLower = scriptText.toLowerCase();
        
        // Check for common R operations and process dataset
        try {
            // Convert dataset to R-friendly format
            const columns = dataset.columns;
            const rows = dataset.rows;
            
            // Simple R-like processing in JavaScript
            // This is a placeholder - real R execution would need a backend
            
            // Check for mean/average
            if (/mean\s*\(|average/i.test(scriptText)) {
                // Find numeric columns and calculate mean
                const numericValues = [];
                for (let i = 0; i < columns.length; i++) {
                    const colValues = rows.map(row => {
                        const val = row[i];
                        return typeof val === 'number' ? val : parseFloat(val);
                    }).filter(v => !isNaN(v));
                    
                    if (colValues.length > 0) {
                        numericValues.push(...colValues);
                    }
                }
                
                if (numericValues.length > 0) {
                    const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
                    return {
                        type: 'scalar',
                        value: mean,
                        language: 'r',
                        executedAt: new Date().toISOString(),
                        note: 'R execution simulated - full R support requires backend service'
                    };
                }
            }
            
            // Check for sum
            if (/sum\s*\(/i.test(scriptText)) {
                const numericValues = [];
                for (let i = 0; i < columns.length; i++) {
                    const colValues = rows.map(row => {
                        const val = row[i];
                        return typeof val === 'number' ? val : parseFloat(val);
                    }).filter(v => !isNaN(v));
                    
                    if (colValues.length > 0) {
                        numericValues.push(...colValues);
                    }
                }
                
                if (numericValues.length > 0) {
                    const sum = numericValues.reduce((a, b) => a + b, 0);
                    return {
                        type: 'scalar',
                        value: sum,
                        language: 'r',
                        executedAt: new Date().toISOString(),
                        note: 'R execution simulated - full R support requires backend service'
                    };
                }
            }
            
            // Check for plot/chart
            if (/plot\s*\(|ggplot|barplot|hist\s*\(/i.test(scriptText)) {
                // Generate sample series data
                const sampleData = [];
                for (let i = 0; i < Math.min(rows.length, 20); i++) {
                    const numericVal = rows[i].find(val => typeof val === 'number' || !isNaN(parseFloat(val)));
                    sampleData.push(typeof numericVal === 'number' ? numericVal : parseFloat(numericVal) || i);
                }
                
                return {
                    type: 'series',
                    value: sampleData.length > 0 ? sampleData : [1, 2, 3, 4, 5],
                    language: 'r',
                    executedAt: new Date().toISOString(),
                    note: 'R execution simulated - full R support requires backend service'
                };
            }
            
            // Default: return dataset info
            return {
                type: 'scalar',
                value: `Dataset processed: ${columns.length} columns, ${rows.length} rows`,
                language: 'r',
                executedAt: new Date().toISOString(),
                note: 'R execution simulated - full R support requires backend service. For full R functionality, please use a backend R service.'
            };
            
        } catch (error) {
            throw new Error(`R execution error: ${error.message}`);
        }
    }
    
    /**
     * Executes a script and returns a result
     * @param {string} language - 'python' or 'r'
     * @param {string} scriptText - Script code
     * @param {Object} dataset - Dataset object (read-only, not modified)
     * @returns {Promise<Object>} Result object with type and value
     */
    async execute(language, scriptText, dataset) {
        if (!language || !['python', 'r'].includes(language.toLowerCase())) {
            throw new Error('Language must be "python" or "r"');
        }
        
        if (!scriptText || !scriptText.trim()) {
            throw new Error('Script text is required');
        }
        
        // Normalize language
        const lang = language.toLowerCase();
        
        if (lang === 'python') {
            return await this.executePython(scriptText, dataset);
        } else if (lang === 'r') {
            return await this.executeR(scriptText, dataset);
        }
    }
    
    /**
     * Validates script before execution
     * @param {string} language - Script language
     * @param {string} scriptText - Script code
     * @returns {Object} Validation result
     */
    validate(language, scriptText) {
        const errors = [];
        
        if (!language || !['python', 'r'].includes(language.toLowerCase())) {
            errors.push('Language must be "python" or "r"');
        }
        
        if (!scriptText || !scriptText.trim()) {
            errors.push('Script text cannot be empty');
        }
        
        // Check for dangerous operations (read-only enforcement)
        const dangerousPatterns = [
            /\.drop\(|\.delete\(|\.remove\(|del\s+/i,  // Data deletion
            /\.write\(|\.to_csv\(|\.to_excel\(|save\(/i,  // File writes (except for plots)
            /import\s+os|import\s+subprocess|system\(|exec\(|eval\(/i  // System access
        ];
        
        // Allow matplotlib savefig for plots
        const safePatterns = [
            /plt\.savefig|matplotlib|seaborn|plotly/i
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(scriptText)) {
                // Check if it's a safe pattern (like savefig for plots)
                const isSafe = safePatterns.some(sp => sp.test(scriptText));
                if (!isSafe) {
                    errors.push('Scripts cannot modify datasets or access system resources');
                    break;
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export singleton instance
export const scriptExecutionEngine = new ScriptExecutionEngine();

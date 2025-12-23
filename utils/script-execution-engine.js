// Script Execution Engine (Mocked)
// Mocks script execution for Python and R scripts
// Returns scalar, series, or image results based on script content

/**
 * Mock Script Execution Engine
 * Provides hardcoded example responses based on script patterns
 * Does NOT actually execute scripts or modify datasets
 */
export class ScriptExecutionEngine {
    constructor() {
        // Hardcoded example responses for different script patterns
        this.mockResponses = this.initializeMockResponses();
    }
    
    /**
     * Initialize hardcoded mock responses
     */
    initializeMockResponses() {
        return {
            // Scalar results
            scalar: {
                python: [
                    { pattern: /mean|average|avg/i, value: 42.5 },
                    { pattern: /sum|total/i, value: 1250 },
                    { pattern: /count|length|len/i, value: 100 },
                    { pattern: /max|maximum/i, value: 99.9 },
                    { pattern: /min|minimum/i, value: 0.1 }
                ],
                r: [
                    { pattern: /mean|average|avg/i, value: 42.5 },
                    { pattern: /sum|total/i, value: 1250 },
                    { pattern: /count|length|nrow/i, value: 100 },
                    { pattern: /max|maximum/i, value: 99.9 },
                    { pattern: /min|minimum/i, value: 0.1 }
                ]
            },
            // Series results
            series: {
                python: [
                    { pattern: /plot|chart|graph|series|pandas\.Series|pd\.Series/i, 
                      value: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] },
                    { pattern: /histogram|hist/i,
                      value: [5, 10, 15, 20, 25, 20, 15, 10, 5] },
                    { pattern: /time.*series|ts/i,
                      value: [12.5, 15.3, 18.2, 16.8, 20.1, 22.5, 19.8, 17.2, 21.3, 23.7] }
                ],
                r: [
                    { pattern: /plot|chart|graph|ts\(|timeSeries/i,
                      value: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] },
                    { pattern: /histogram|hist\(/i,
                      value: [5, 10, 15, 20, 25, 20, 15, 10, 5] },
                    { pattern: /ggplot|geom_/i,
                      value: [12.5, 15.3, 18.2, 16.8, 20.1, 22.5, 19.8, 17.2, 21.3, 23.7] }
                ]
            },
            // Image results
            image: {
                python: [
                    { pattern: /matplotlib|plt\.|seaborn|sns\.|plotly|px\./i, value: 'plot' },
                    { pattern: /\.png|\.jpg|\.jpeg|savefig|imshow/i, value: 'chart' }
                ],
                r: [
                    { pattern: /ggplot2|ggsave|png\(|jpeg\(|pdf\(/i, value: 'plot' },
                    { pattern: /plot\(|barplot|boxplot/i, value: 'chart' }
                ]
            }
        };
    }
    
    /**
     * Executes a script (mocked) and returns a result
     * @param {string} language - 'python' or 'r'
     * @param {string} scriptText - Script code
     * @param {Object} dataset - Dataset object (read-only, not modified)
     * @returns {Object} Result object with type and value
     */
    execute(language, scriptText, dataset) {
        if (!language || !['python', 'r'].includes(language.toLowerCase())) {
            throw new Error('Language must be "python" or "r"');
        }
        
        if (!scriptText || !scriptText.trim()) {
            throw new Error('Script text is required');
        }
        
        // Normalize language
        const lang = language.toLowerCase();
        
        // Determine result type based on script content
        // Priority: Image > Series > Scalar
        
        // Check for image patterns
        const imageMatch = this.findMatch(scriptText, this.mockResponses.image[lang]);
        if (imageMatch) {
            return {
                type: 'image',
                value: imageMatch.value,
                language: lang,
                executedAt: new Date().toISOString()
            };
        }
        
        // Check for series patterns
        const seriesMatch = this.findMatch(scriptText, this.mockResponses.series[lang]);
        if (seriesMatch) {
            return {
                type: 'series',
                value: seriesMatch.value,
                language: lang,
                executedAt: new Date().toISOString()
            };
        }
        
        // Default to scalar
        const scalarMatch = this.findMatch(scriptText, this.mockResponses.scalar[lang]);
        const scalarValue = scalarMatch ? scalarMatch.value : 42.0;
        
        return {
            type: 'scalar',
            value: scalarValue,
            language: lang,
            executedAt: new Date().toISOString()
        };
    }
    
    /**
     * Finds the first matching pattern in script text
     * @param {string} scriptText - Script code
     * @param {Array} patterns - Array of {pattern, value} objects
     * @returns {Object|null} Matching pattern object or null
     */
    findMatch(scriptText, patterns) {
        for (const item of patterns) {
            if (item.pattern.test(scriptText)) {
                return item;
            }
        }
        return null;
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
            /\.write\(|\.to_csv\(|\.to_excel\(|save\(/i,  // File writes
            /import\s+os|import\s+subprocess|system\(/i  // System access
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(scriptText)) {
                errors.push('Scripts cannot modify datasets or access system resources');
                break;
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


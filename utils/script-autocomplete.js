// Script Autocomplete Utility
// Provides column suggestions for script editors based on current dataset

/**
 * Gets column suggestions for script autocomplete
 * @param {string} scriptText - Current script text
 * @param {number} cursorPosition - Current cursor position
 * @param {Object} dataset - Current dataset object
 * @returns {Array<{text: string, type: string}>}
 */
export function getColumnSuggestions(scriptText, cursorPosition, dataset) {
    if (!dataset || !dataset.columns || dataset.columns.length === 0) {
        return [];
    }
    
    const textBeforeCursor = scriptText.substring(0, cursorPosition);
    const currentWord = getCurrentWord(textBeforeCursor);
    
    if (!currentWord) {
        return [];
    }
    
    const wordLower = currentWord.toLowerCase();
    
    // Filter columns that match the current word
    const suggestions = dataset.columns
        .filter(column => column.toLowerCase().startsWith(wordLower))
        .map(column => ({ 
            text: column, 
            type: 'column',
            display: formatColumnName(column)
        }));
    
    return suggestions.slice(0, 10); // Limit to 10 suggestions
}

/**
 * Gets the current word being typed
 * @param {string} text - Text before cursor
 * @returns {string}
 */
function getCurrentWord(text) {
    // Match word characters, dots, and underscores (for column names)
    const match = text.match(/[\w._]+$/);
    return match ? match[0] : '';
}

/**
 * Gets the start position of the current word
 * @param {string} text - Text before cursor
 * @returns {number}
 */
export function getWordStartPosition(text) {
    const match = text.match(/[\w._]+$/);
    return match ? text.length - match[0].length : text.length;
}

/**
 * Formats column name for display
 * @param {string} column - Column name
 * @returns {string}
 */
function formatColumnName(column) {
    return column
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}








// Metric Formatter Utility
// Formats metric values based on display type and decimal places

/**
 * Formats a metric value based on its display type and decimal places
 * @param {number|string} value - The metric value to format
 * @param {string} displayType - Display type: 'numeric', 'currency', or 'percentage'
 * @param {number} decimalPlaces - Number of decimal places (0-10)
 * @returns {string} Formatted value
 */
export function formatMetricValue(value, displayType = 'numeric', decimalPlaces = 2) {
    if (value === null || value === undefined) {
        return 'N/A';
    }
    
    const num = parseFloat(value);
    if (isNaN(num)) {
        return String(value);
    }
    
    // Clamp decimal places between 0 and 10
    const decimals = Math.max(0, Math.min(10, Math.round(decimalPlaces)));
    
    switch (displayType) {
        case 'currency':
            return formatCurrency(num, decimals);
            
        case 'percentage':
            return formatPercentage(num, decimals);
            
        case 'numeric':
        default:
            return formatNumeric(num, decimals);
    }
}

/**
 * Formats a value as currency
 * @param {number} value - Numeric value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted currency string
 */
function formatCurrency(value, decimals) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

/**
 * Formats a value as percentage
 * @param {number} value - Numeric value (will be multiplied by 100)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
function formatPercentage(value, decimals) {
    const percentage = value * 100;
    return percentage.toFixed(decimals) + '%';
}

/**
 * Formats a value as numeric
 * @param {number} value - Numeric value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted numeric string
 */
function formatNumeric(value, decimals) {
    // Use locale-aware formatting with thousand separators
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}


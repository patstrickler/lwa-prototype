import {
    calculateMean,
    calculateSum,
    calculateMin,
    calculateMax,
    calculateStdev,
    calculateCount,
    calculateCountDistinct,
    calculateMetric
} from '../utils/metric-calculator.js';

describe('Metric Calculator', () => {
    const testRows = [
        [1, 'A', 10.5],
        [2, 'B', 20.3],
        [3, 'A', 15.7],
        [4, 'C', 30.1],
        [5, 'B', 25.9]
    ];
    const testColumns = ['id', 'category', 'value'];

    describe('calculateMean', () => {
        test('should calculate mean of numeric column', () => {
            const mean = calculateMean(testRows, testColumns, 'value');
            const expected = (10.5 + 20.3 + 15.7 + 30.1 + 25.9) / 5;
            expect(mean).toBeCloseTo(expected, 4);
        });

        test('should handle empty dataset', () => {
            expect(() => calculateMean([], testColumns, 'value')).toThrow();
        });

        test('should handle missing column', () => {
            expect(() => calculateMean(testRows, testColumns, 'nonexistent')).toThrow();
        });

        test('should filter out non-numeric values', () => {
            const rowsWithNulls = [
                [1, 'A', 10],
                [2, 'B', null],
                [3, 'C', 20],
                [4, 'D', 'not a number']
            ];
            const mean = calculateMean(rowsWithNulls, testColumns, 'value');
            expect(mean).toBeCloseTo(15, 4);
        });
    });

    describe('calculateSum', () => {
        test('should calculate sum of numeric column', () => {
            const sum = calculateSum(testRows, testColumns, 'value');
            const expected = 10.5 + 20.3 + 15.7 + 30.1 + 25.9;
            expect(sum).toBeCloseTo(expected, 4);
        });

        test('should handle empty dataset', () => {
            expect(() => calculateSum([], testColumns, 'value')).toThrow();
        });
    });

    describe('calculateMin', () => {
        test('should find minimum value', () => {
            const min = calculateMin(testRows, testColumns, 'value');
            expect(min).toBe(10.5);
        });

        test('should handle negative values', () => {
            const rowsWithNegatives = [
                [1, 'A', -10],
                [2, 'B', 5],
                [3, 'C', -5]
            ];
            const min = calculateMin(rowsWithNegatives, testColumns, 'value');
            expect(min).toBe(-10);
        });
    });

    describe('calculateMax', () => {
        test('should find maximum value', () => {
            const max = calculateMax(testRows, testColumns, 'value');
            expect(max).toBe(30.1);
        });
    });

    describe('calculateStdev', () => {
        test('should calculate standard deviation', () => {
            const stdev = calculateStdev(testRows, testColumns, 'value');
            expect(stdev).toBeGreaterThan(0);
            expect(typeof stdev).toBe('number');
        });

        test('should return 0 for single value', () => {
            const singleRow = [[1, 'A', 10]];
            const stdev = calculateStdev(singleRow, testColumns, 'value');
            expect(stdev).toBe(0);
        });

        test('should handle empty dataset', () => {
            expect(() => calculateStdev([], testColumns, 'value')).toThrow();
        });
    });

    describe('calculateCount', () => {
        test('should count non-null values', () => {
            const count = calculateCount(testRows, testColumns, 'value');
            expect(count).toBe(5);
        });

        test('should exclude null values', () => {
            const rowsWithNulls = [
                [1, 'A', 10],
                [2, 'B', null],
                [3, 'C', 20]
            ];
            const count = calculateCount(rowsWithNulls, testColumns, 'value');
            expect(count).toBe(2);
        });

        test('should handle empty dataset', () => {
            expect(() => calculateCount([], testColumns, 'value')).toThrow();
        });
    });

    describe('calculateCountDistinct', () => {
        test('should count distinct values', () => {
            const distinct = calculateCountDistinct(testRows, testColumns, 'category');
            expect(distinct).toBe(3); // A, B, C
        });

        test('should handle numeric distinct values', () => {
            const distinct = calculateCountDistinct(testRows, testColumns, 'value');
            expect(distinct).toBe(5); // All values are unique
        });

        test('should handle empty dataset', () => {
            expect(() => calculateCountDistinct([], testColumns, 'value')).toThrow();
        });
    });

    describe('calculateMetric', () => {
        test('should calculate mean via calculateMetric', () => {
            const result = calculateMetric(testRows, testColumns, 'value', 'mean');
            expect(typeof result).toBe('number');
        });

        test('should calculate sum via calculateMetric', () => {
            const result = calculateMetric(testRows, testColumns, 'value', 'sum');
            expect(result).toBeGreaterThan(0);
        });

        test('should calculate min via calculateMetric', () => {
            const result = calculateMetric(testRows, testColumns, 'value', 'min');
            expect(result).toBe(10.5);
        });

        test('should calculate max via calculateMetric', () => {
            const result = calculateMetric(testRows, testColumns, 'value', 'max');
            expect(result).toBe(30.1);
        });

        test('should calculate stdev via calculateMetric', () => {
            const result = calculateMetric(testRows, testColumns, 'value', 'stdev');
            expect(typeof result).toBe('number');
        });

        test('should calculate count via calculateMetric', () => {
            const result = calculateMetric(testRows, testColumns, 'value', 'count');
            expect(result).toBe(5);
        });

        test('should calculate count_distinct via calculateMetric', () => {
            const result = calculateMetric(testRows, testColumns, 'category', 'count_distinct');
            expect(result).toBe(3);
        });

        test('should reject invalid operation', () => {
            expect(() => calculateMetric(testRows, testColumns, 'value', 'invalid')).toThrow();
        });

        test('should handle case-insensitive operations', () => {
            const result1 = calculateMetric(testRows, testColumns, 'value', 'MEAN');
            const result2 = calculateMetric(testRows, testColumns, 'value', 'mean');
            expect(result1).toBe(result2);
        });
    });
});


import { metricExecutionEngine } from '../utils/metric-execution-engine.js';

describe('Metric Execution Engine', () => {
    const testRows = [
        [1, 'A', 10.5],
        [2, 'B', 20.3],
        [3, 'A', 15.7],
        [4, 'C', 30.1],
        [5, 'B', 25.9]
    ];
    const testColumns = ['id', 'category', 'value'];

    describe('execute', () => {
        test('should execute mean metric', () => {
            const metricDef = { operation: 'mean', column: 'value' };
            const result = metricExecutionEngine.execute(metricDef, testRows, testColumns);
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });

        test('should execute sum metric', () => {
            const metricDef = { operation: 'sum', column: 'value' };
            const result = metricExecutionEngine.execute(metricDef, testRows, testColumns);
            expect(result).toBeGreaterThan(0);
        });

        test('should execute min metric', () => {
            const metricDef = { operation: 'min', column: 'value' };
            const result = metricExecutionEngine.execute(metricDef, testRows, testColumns);
            expect(result).toBe(10.5);
        });

        test('should execute max metric', () => {
            const metricDef = { operation: 'max', column: 'value' };
            const result = metricExecutionEngine.execute(metricDef, testRows, testColumns);
            expect(result).toBe(30.1);
        });

        test('should reject invalid operation', () => {
            const metricDef = { operation: 'invalid', column: 'value' };
            expect(() => metricExecutionEngine.execute(metricDef, testRows, testColumns)).toThrow();
        });

        test('should reject missing column', () => {
            const metricDef = { operation: 'mean', column: 'nonexistent' };
            expect(() => metricExecutionEngine.execute(metricDef, testRows, testColumns)).toThrow();
        });

        test('should reject empty dataset', () => {
            const metricDef = { operation: 'mean', column: 'value' };
            expect(() => metricExecutionEngine.execute(metricDef, [], testColumns)).toThrow();
        });

        test('should reject missing metric definition', () => {
            expect(() => metricExecutionEngine.execute(null, testRows, testColumns)).toThrow();
        });
    });

    describe('executeMetric', () => {
        test('should execute metric from stored metric object', () => {
            const metric = {
                id: 'metric_1',
                datasetId: 'ds_1',
                name: 'Average Value',
                operation: 'mean',
                column: 'value',
                value: null
            };
            const dataset = {
                id: 'ds_1',
                rows: testRows,
                columns: testColumns
            };
            const result = metricExecutionEngine.executeMetric(metric, dataset);
            expect(typeof result).toBe('number');
        });

        test('should reject missing metric', () => {
            const dataset = {
                id: 'ds_1',
                rows: testRows,
                columns: testColumns
            };
            expect(() => metricExecutionEngine.executeMetric(null, dataset)).toThrow();
        });

        test('should reject missing dataset', () => {
            const metric = {
                operation: 'mean',
                column: 'value'
            };
            expect(() => metricExecutionEngine.executeMetric(metric, null)).toThrow();
        });
    });

    describe('validate', () => {
        test('should validate correct metric definition', () => {
            const metricDef = { operation: 'mean', column: 'value' };
            const result = metricExecutionEngine.validate(metricDef, testColumns);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        test('should reject missing operation', () => {
            const metricDef = { column: 'value' };
            const result = metricExecutionEngine.validate(metricDef, testColumns);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should reject missing column', () => {
            const metricDef = { operation: 'mean' };
            const result = metricExecutionEngine.validate(metricDef, testColumns);
            expect(result.isValid).toBe(false);
        });

        test('should reject invalid operation', () => {
            const metricDef = { operation: 'invalid', column: 'value' };
            const result = metricExecutionEngine.validate(metricDef, testColumns);
            expect(result.isValid).toBe(false);
        });

        test('should reject missing column in dataset', () => {
            const metricDef = { operation: 'mean', column: 'nonexistent' };
            const result = metricExecutionEngine.validate(metricDef, testColumns);
            expect(result.isValid).toBe(false);
        });
    });

    describe('getSupportedOperations', () => {
        test('should return array of supported operations', () => {
            const operations = metricExecutionEngine.getSupportedOperations();
            expect(Array.isArray(operations)).toBe(true);
            expect(operations.length).toBeGreaterThan(0);
            expect(operations).toContain('mean');
            expect(operations).toContain('sum');
            expect(operations).toContain('min');
            expect(operations).toContain('max');
        });
    });
});








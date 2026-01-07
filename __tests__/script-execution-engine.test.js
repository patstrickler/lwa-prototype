import { scriptExecutionEngine } from '../utils/script-execution-engine.js';

describe('Script Execution Engine', () => {
    const mockDataset = {
        id: 'ds_1',
        name: 'Test Dataset',
        columns: ['id', 'value'],
        rows: [[1, 10], [2, 20], [3, 30]]
    };

    describe('execute', () => {
        test('should execute Python script and return scalar result', () => {
            const script = 'mean = df["value"].mean()';
            const result = scriptExecutionEngine.execute('python', script, mockDataset);
            expect(result).toHaveProperty('type');
            expect(result).toHaveProperty('value');
            expect(result).toHaveProperty('language');
            expect(result.language).toBe('python');
        });

        test('should execute R script and return scalar result', () => {
            const script = 'mean_value <- mean(df$value)';
            const result = scriptExecutionEngine.execute('r', script, mockDataset);
            expect(result.type).toBe('scalar');
            expect(result.language).toBe('r');
        });

        test('should detect image results from matplotlib', () => {
            const script = 'import matplotlib.pyplot as plt\nplt.plot([1,2,3])';
            const result = scriptExecutionEngine.execute('python', script, mockDataset);
            expect(result.type).toBe('image');
        });

        test('should detect series results from pandas', () => {
            const script = 'import pandas as pd\nseries = pd.Series([1,2,3])';
            const result = scriptExecutionEngine.execute('python', script, mockDataset);
            expect(result.type).toBe('series');
            expect(Array.isArray(result.value)).toBe(true);
        });

        test('should detect image results from ggplot2', () => {
            const script = 'library(ggplot2)\nggplot(df, aes(x=id, y=value)) + geom_point()';
            const result = scriptExecutionEngine.execute('r', script, mockDataset);
            expect(result.type).toBe('image');
        });

        test('should reject invalid language', () => {
            expect(() => {
                scriptExecutionEngine.execute('javascript', 'console.log(1)', mockDataset);
            }).toThrow();
        });

        test('should reject empty script', () => {
            expect(() => {
                scriptExecutionEngine.execute('python', '', mockDataset);
            }).toThrow();
        });

        test('should handle case-insensitive language', () => {
            const script = 'mean = 42.5';
            const result1 = scriptExecutionEngine.execute('PYTHON', script, mockDataset);
            const result2 = scriptExecutionEngine.execute('python', script, mockDataset);
            expect(result1.language).toBe('python');
            expect(result2.language).toBe('python');
        });

        test('should include execution timestamp', () => {
            const script = 'mean = 42.5';
            const result = scriptExecutionEngine.execute('python', script, mockDataset);
            expect(result).toHaveProperty('executedAt');
            expect(result.executedAt).toBeTruthy();
        });
    });

    describe('validate', () => {
        test('should validate correct Python script', () => {
            const script = 'mean = df["value"].mean()';
            const result = scriptExecutionEngine.validate('python', script);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        test('should validate correct R script', () => {
            const script = 'mean_value <- mean(df$value)';
            const result = scriptExecutionEngine.validate('r', script);
            expect(result.isValid).toBe(true);
        });

        test('should reject invalid language', () => {
            const result = scriptExecutionEngine.validate('javascript', 'console.log(1)');
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should reject empty script', () => {
            const result = scriptExecutionEngine.validate('python', '');
            expect(result.isValid).toBe(false);
        });

        test('should reject dangerous operations - data deletion', () => {
            const script = 'df = df.drop(columns=["id"])';
            const result = scriptExecutionEngine.validate('python', script);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('modify'))).toBe(true);
        });

        test('should reject dangerous operations - file writes', () => {
            const script = 'df.to_csv("output.csv")';
            const result = scriptExecutionEngine.validate('python', script);
            expect(result.isValid).toBe(false);
        });

        test('should reject dangerous operations - system access', () => {
            const script = 'import os\nos.system("rm -rf /")';
            const result = scriptExecutionEngine.validate('python', script);
            expect(result.isValid).toBe(false);
        });
    });
});








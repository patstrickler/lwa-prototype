import { executeSQL, getAllTables } from '../utils/sql-engine.js';

describe('SQL Engine', () => {
    describe('getAllTables', () => {
        test('should return array of table definitions', () => {
            const tables = getAllTables();
            expect(Array.isArray(tables)).toBe(true);
            expect(tables.length).toBeGreaterThan(0);
            tables.forEach(table => {
                expect(table).toHaveProperty('name');
                expect(table).toHaveProperty('columns');
                expect(table).toHaveProperty('description');
                expect(Array.isArray(table.columns)).toBe(true);
            });
        });

        test('should include expected tables', () => {
            const tables = getAllTables();
            const tableNames = tables.map(t => t.name);
            expect(tableNames).toContain('samples');
            expect(tableNames).toContain('tests');
            expect(tableNames).toContain('results');
        });
    });

    describe('executeSQL', () => {
        test('should execute simple SELECT query', async () => {
            const result = await executeSQL('SELECT sample_id, sample_name FROM samples', 0);
            expect(result).toHaveProperty('columns');
            expect(result).toHaveProperty('rows');
            expect(Array.isArray(result.columns)).toBe(true);
            expect(Array.isArray(result.rows)).toBe(true);
            expect(result.columns).toContain('sample_id');
            expect(result.columns).toContain('sample_name');
        });

        test('should handle SELECT * query', async () => {
            const result = await executeSQL('SELECT * FROM samples', 0);
            expect(result.columns.length).toBeGreaterThan(0);
            expect(result.rows.length).toBeGreaterThan(0);
        });

        test('should handle queries with LIMIT', async () => {
            const result = await executeSQL('SELECT sample_id FROM samples LIMIT 5', 0);
            expect(result.rows.length).toBeLessThanOrEqual(5);
        });

        test('should handle queries with column aliases', async () => {
            const result = await executeSQL('SELECT sample_id AS id, sample_name AS name FROM samples', 0);
            expect(result.columns).toContain('id');
            expect(result.columns).toContain('name');
        });

        test('should handle JOIN queries', async () => {
            const result = await executeSQL(
                'SELECT s.sample_id, r.result_value FROM samples s JOIN results r ON s.sample_id = r.sample_id',
                0
            );
            expect(result.columns.length).toBeGreaterThan(0);
            expect(result.rows.length).toBeGreaterThan(0);
        });

        test('should handle LEFT JOIN queries', async () => {
            const result = await executeSQL(
                'SELECT s.sample_id, r.result_value FROM samples s LEFT JOIN results r ON s.sample_id = r.sample_id',
                0
            );
            expect(result.columns.length).toBeGreaterThan(0);
        });

        test('should reject empty query', async () => {
            await expect(executeSQL('', 0)).rejects.toThrow();
        });

        test('should reject non-SELECT queries', async () => {
            await expect(executeSQL('INSERT INTO samples VALUES (1, "test")', 0)).rejects.toThrow();
            await expect(executeSQL('UPDATE samples SET name = "test"', 0)).rejects.toThrow();
            await expect(executeSQL('DELETE FROM samples', 0)).rejects.toThrow();
        });

        test('should reject queries with invalid table names', async () => {
            await expect(executeSQL('SELECT * FROM nonexistent_table', 0)).rejects.toThrow();
        });

        test('should reject queries without FROM clause', async () => {
            await expect(executeSQL('SELECT sample_id', 0)).rejects.toThrow();
        });

        test('should handle WHERE clause (affects row count)', async () => {
            const result = await executeSQL('SELECT sample_id FROM samples WHERE sample_id > 0', 0);
            expect(result.rows.length).toBeGreaterThan(0);
        });

        test('should return consistent column structure', async () => {
            const result = await executeSQL('SELECT sample_id, sample_name, status FROM samples', 0);
            expect(result.columns.length).toBe(3);
            if (result.rows.length > 0) {
                expect(result.rows[0].length).toBe(3);
            }
        });
    });
});


import { datasetStore } from '../data/datasets.js';

describe('Dataset Store', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        // Re-initialize store
        datasetStore.datasets.clear();
        datasetStore.nextId = 1;
    });

    describe('create', () => {
        test('should create a new dataset', () => {
            const columns = ['id', 'name', 'value'];
            const rows = [[1, 'Test', 10], [2, 'Test2', 20]];
            const dataset = datasetStore.create('Test Dataset', 'SELECT * FROM test', columns, rows);
            
            expect(dataset).toHaveProperty('id');
            expect(dataset.name).toBe('Test Dataset');
            expect(dataset.sql).toBe('SELECT * FROM test');
            expect(dataset.columns).toEqual(columns);
            expect(dataset.rows).toEqual(rows);
            expect(dataset).toHaveProperty('createdAt');
        });

        test('should reject empty name', () => {
            expect(() => {
                datasetStore.create('', 'SELECT * FROM test', ['id'], [[1]]);
            }).toThrow();
        });

        test('should reject non-array columns', () => {
            expect(() => {
                datasetStore.create('Test', 'SELECT * FROM test', 'not an array', [[1]]);
            }).toThrow();
        });

        test('should reject non-array rows', () => {
            expect(() => {
                datasetStore.create('Test', 'SELECT * FROM test', ['id'], 'not an array');
            }).toThrow();
        });

        test('should handle empty SQL string', () => {
            const dataset = datasetStore.create('Test', '', ['id'], [[1]]);
            expect(dataset.sql).toBe('');
        });

        test('should create unique IDs', () => {
            const ds1 = datasetStore.create('Dataset 1', 'SELECT 1', ['id'], [[1]]);
            const ds2 = datasetStore.create('Dataset 2', 'SELECT 2', ['id'], [[2]]);
            expect(ds1.id).not.toBe(ds2.id);
        });
    });

    describe('get', () => {
        test('should retrieve dataset by ID', () => {
            const dataset = datasetStore.create('Test', 'SELECT * FROM test', ['id'], [[1]]);
            const retrieved = datasetStore.get(dataset.id);
            expect(retrieved).toEqual(dataset);
        });

        test('should return undefined for non-existent ID', () => {
            const retrieved = datasetStore.get('nonexistent');
            expect(retrieved).toBeUndefined();
        });
    });

    describe('getAll', () => {
        test('should return all datasets', () => {
            const ds1 = datasetStore.create('Dataset 1', 'SELECT 1', ['id'], [[1]]);
            const ds2 = datasetStore.create('Dataset 2', 'SELECT 2', ['id'], [[2]]);
            const all = datasetStore.getAll();
            expect(all.length).toBe(2);
            expect(all).toContainEqual(ds1);
            expect(all).toContainEqual(ds2);
        });

        test('should return empty array when no datasets', () => {
            const all = datasetStore.getAll();
            expect(all).toEqual([]);
        });
    });

    describe('update', () => {
        test('should update dataset name', () => {
            const dataset = datasetStore.create('Original', 'SELECT 1', ['id'], [[1]]);
            const updated = datasetStore.update(dataset.id, { name: 'Updated' });
            expect(updated.name).toBe('Updated');
            expect(updated).toHaveProperty('updatedAt');
        });

        test('should update dataset SQL', () => {
            const dataset = datasetStore.create('Test', 'SELECT 1', ['id'], [[1]]);
            const updated = datasetStore.update(dataset.id, { sql: 'SELECT 2' });
            expect(updated.sql).toBe('SELECT 2');
        });

        test('should update dataset columns', () => {
            const dataset = datasetStore.create('Test', 'SELECT 1', ['id'], [[1]]);
            const newColumns = ['id', 'name'];
            const updated = datasetStore.update(dataset.id, { columns: newColumns });
            expect(updated.columns).toEqual(newColumns);
        });

        test('should update dataset rows', () => {
            const dataset = datasetStore.create('Test', 'SELECT 1', ['id'], [[1]]);
            const newRows = [[1], [2], [3]];
            const updated = datasetStore.update(dataset.id, { rows: newRows });
            expect(updated.rows).toEqual(newRows);
        });

        test('should return null for non-existent dataset', () => {
            const updated = datasetStore.update('nonexistent', { name: 'New' });
            expect(updated).toBeNull();
        });
    });

    describe('exists', () => {
        test('should return true for existing dataset', () => {
            const dataset = datasetStore.create('Test', 'SELECT 1', ['id'], [[1]]);
            expect(datasetStore.exists(dataset.id)).toBe(true);
        });

        test('should return false for non-existent dataset', () => {
            expect(datasetStore.exists('nonexistent')).toBe(false);
        });
    });

    describe('delete', () => {
        test('should delete dataset', () => {
            const dataset = datasetStore.create('Test', 'SELECT 1', ['id'], [[1]]);
            const result = datasetStore.delete(dataset.id);
            expect(result.deleted).toBe(true);
            expect(datasetStore.get(dataset.id)).toBeUndefined();
        });

        test('should return deleted:false for non-existent dataset', () => {
            const result = datasetStore.delete('nonexistent');
            expect(result.deleted).toBe(false);
        });

        test('should persist deletion to storage', () => {
            const dataset = datasetStore.create('Test', 'SELECT 1', ['id'], [[1]]);
            datasetStore.delete(dataset.id);
            // Re-initialize store to check persistence
            datasetStore.loadFromStorage();
            expect(datasetStore.exists(dataset.id)).toBe(false);
        });
    });

    describe('persistence', () => {
        test('should persist datasets to localStorage', () => {
            const dataset = datasetStore.create('Test', 'SELECT 1', ['id'], [[1]]);
            // Check that it was saved
            const stored = localStorage.getItem('lwa_datasets');
            expect(stored).toBeTruthy();
            const parsed = JSON.parse(stored);
            expect(parsed.length).toBeGreaterThan(0);
        });

        test('should load datasets from localStorage', () => {
            const dataset = datasetStore.create('Test', 'SELECT 1', ['id'], [[1]]);
            const id = dataset.id;
            // Clear in-memory store
            datasetStore.datasets.clear();
            // Reload from storage
            datasetStore.loadFromStorage();
            const loaded = datasetStore.get(id);
            expect(loaded).toBeTruthy();
            expect(loaded.name).toBe('Test');
        });
    });
});


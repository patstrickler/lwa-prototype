import { QueryBuilder } from '../components/query-builder.js';
import { datasetStore } from '../data/datasets.js';

// Mock executeSQL
jest.mock('../utils/sql-engine.js', () => ({
    executeSQL: jest.fn(() => Promise.resolve({
        columns: ['id', 'name'],
        rows: [[1, 'Test'], [2, 'Test2']]
    })),
    getAllTables: jest.fn(() => [
        { name: 'samples', columns: ['sample_id', 'sample_name'], description: 'Samples table' }
    ])
}));

describe('Query Builder', () => {
    let container;
    let queryBuilder;

    beforeEach(() => {
        // Create container
        container = document.createElement('div');
        container.id = 'test-query-builder';
        document.body.appendChild(container);
        
        // Clear stores
        localStorage.clear();
        datasetStore.datasets.clear();
        
        // Mock Monaco editor
        global.monaco.editor.create = jest.fn(() => ({
            getValue: jest.fn(() => ''),
            setValue: jest.fn(),
            getSelection: jest.fn(() => ({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1
            })),
            executeEdits: jest.fn(),
            focus: jest.fn(),
            dispose: jest.fn(),
            onDidChangeModelContent: jest.fn()
        }));
    });

    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize query builder', async () => {
            queryBuilder = new QueryBuilder('#test-query-builder');
            // Wait for Monaco to load
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(queryBuilder.container).toBeTruthy();
        });

        test('should render query builder UI', async () => {
            queryBuilder = new QueryBuilder('#test-query-builder');
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(container.querySelector('#run-query')).toBeTruthy();
            expect(container.querySelector('#clear-query')).toBeTruthy();
            expect(container.querySelector('#save-dataset')).toBeTruthy();
        });
    });

    describe('query execution', () => {
        test('should execute query and display results', async () => {
            queryBuilder = new QueryBuilder('#test-query-builder');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const editor = queryBuilder.editor;
            editor.getValue = jest.fn(() => 'SELECT id, name FROM test');
            
            await queryBuilder.executeQuery();
            
            const tbody = container.querySelector('#results-tbody');
            expect(tbody).toBeTruthy();
        });

        test('should show error for empty query', async () => {
            queryBuilder = new QueryBuilder('#test-query-builder');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const editor = queryBuilder.editor;
            editor.getValue = jest.fn(() => '');
            
            await queryBuilder.executeQuery();
            
            const tbody = container.querySelector('#results-tbody');
            const errorMessage = tbody.textContent;
            expect(errorMessage).toContain('query');
        });

        test('should enable save button after successful query', async () => {
            queryBuilder = new QueryBuilder('#test-query-builder');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const editor = queryBuilder.editor;
            editor.getValue = jest.fn(() => 'SELECT id, name FROM test');
            
            await queryBuilder.executeQuery();
            
            const saveBtn = container.querySelector('#save-dataset');
            expect(saveBtn.disabled).toBe(false);
        });
    });

    describe('dataset operations', () => {
        test('should save query results as dataset', async () => {
            queryBuilder = new QueryBuilder('#test-query-builder');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Mock modal
            const { Modal } = await import('../utils/modal.js');
            Modal.prompt = jest.fn(() => Promise.resolve('Test Dataset'));
            Modal.alert = jest.fn(() => Promise.resolve());
            
            const editor = queryBuilder.editor;
            editor.getValue = jest.fn(() => 'SELECT id, name FROM test');
            
            await queryBuilder.executeQuery();
            await queryBuilder.saveAsDataset();
            
            const datasets = datasetStore.getAll();
            expect(datasets.length).toBeGreaterThan(0);
        });

        test('should not save without query results', async () => {
            queryBuilder = new QueryBuilder('#test-query-builder');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const { Modal } = await import('../utils/modal.js');
            Modal.alert = jest.fn(() => Promise.resolve());
            
            await queryBuilder.saveAsDataset();
            
            expect(Modal.alert).toHaveBeenCalled();
        });

        test('should clear query and results', async () => {
            queryBuilder = new QueryBuilder('#test-query-builder');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const editor = queryBuilder.editor;
            editor.setValue = jest.fn();
            editor.getValue = jest.fn(() => 'SELECT * FROM test');
            
            await queryBuilder.executeQuery();
            queryBuilder.clearQuery();
            
            expect(editor.setValue).toHaveBeenCalledWith('');
            expect(queryBuilder.currentResult).toBeNull();
        });
    });

    describe('text insertion', () => {
        test('should insert text at cursor position', async () => {
            queryBuilder = new QueryBuilder('#test-query-builder');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const editor = queryBuilder.editor;
            editor.executeEdits = jest.fn();
            
            queryBuilder.insertText('samples');
            
            expect(editor.executeEdits).toHaveBeenCalled();
        });
    });
});








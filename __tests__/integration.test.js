import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';
import { metricExecutionEngine } from '../utils/metric-execution-engine.js';
import { executeSQL } from '../utils/sql-engine.js';

describe('Integration Tests', () => {
    beforeEach(() => {
        localStorage.clear();
        datasetStore.datasets.clear();
        metricsStore.metrics.clear();
    });

    describe('Query → Dataset → Metric workflow', () => {
        test('should create dataset from query, then calculate metric', async () => {
            // Step 1: Execute query
            const queryResult = await executeSQL('SELECT sample_id, sample_name FROM samples LIMIT 10', 0);
            expect(queryResult.columns.length).toBeGreaterThan(0);
            expect(queryResult.rows.length).toBeGreaterThan(0);

            // Step 2: Create dataset from query results
            const dataset = datasetStore.create(
                'Test Dataset',
                'SELECT sample_id, sample_name FROM samples',
                queryResult.columns,
                queryResult.rows
            );
            expect(datasetStore.exists(dataset.id)).toBe(true);

            // Step 3: Create metric for dataset
            const metric = metricsStore.create(
                dataset.id,
                'Sample Count',
                0,
                'scalar',
                'sample_id',
                'count'
            );
            expect(metricsStore.get(metric.id)).toBeTruthy();

            // Step 4: Execute metric
            const metricValue = metricExecutionEngine.executeMetric(metric, dataset);
            expect(typeof metricValue).toBe('number');
            expect(metricValue).toBeGreaterThan(0);

            // Step 5: Update metric value
            const updated = metricsStore.updateValue(metric.id, metricValue);
            expect(updated.value).toBe(metricValue);
        });
    });

    describe('Dataset → Multiple Metrics workflow', () => {
        test('should calculate multiple metrics on same dataset', async () => {
            // Create dataset with numeric data
            const dataset = datasetStore.create(
                'Numeric Dataset',
                'SELECT value FROM test',
                ['value'],
                [[10], [20], [30], [40], [50]]
            );

            // Create multiple metrics
            const meanMetric = metricsStore.create(
                dataset.id,
                'Mean Value',
                0,
                'scalar',
                'value',
                'mean'
            );
            const sumMetric = metricsStore.create(
                dataset.id,
                'Sum Value',
                0,
                'scalar',
                'value',
                'sum'
            );
            const maxMetric = metricsStore.create(
                dataset.id,
                'Max Value',
                0,
                'scalar',
                'value',
                'max'
            );

            // Execute all metrics
            const meanValue = metricExecutionEngine.executeMetric(meanMetric, dataset);
            const sumValue = metricExecutionEngine.executeMetric(sumMetric, dataset);
            const maxValue = metricExecutionEngine.executeMetric(maxMetric, dataset);

            // Verify results
            expect(meanValue).toBe(30); // (10+20+30+40+50)/5
            expect(sumValue).toBe(150); // 10+20+30+40+50
            expect(maxValue).toBe(50);

            // Update all metrics
            metricsStore.updateValue(meanMetric.id, meanValue);
            metricsStore.updateValue(sumMetric.id, sumValue);
            metricsStore.updateValue(maxMetric.id, maxValue);

            // Verify all metrics are stored
            const allMetrics = metricsStore.getByDataset(dataset.id);
            expect(allMetrics.length).toBe(3);
        });
    });

    describe('Dataset update → Metric re-execution workflow', () => {
        test('should re-execute metrics when dataset is updated', () => {
            // Create initial dataset
            const dataset = datasetStore.create(
                'Updatable Dataset',
                'SELECT value FROM test',
                ['value'],
                [[10], [20], [30]]
            );

            // Create metric
            const metric = metricsStore.create(
                dataset.id,
                'Mean Value',
                0,
                'scalar',
                'value',
                'mean'
            );

            // Execute metric on initial data
            const initialValue = metricExecutionEngine.executeMetric(metric, dataset);
            expect(initialValue).toBe(20); // (10+20+30)/3

            // Update dataset with new data
            const updated = datasetStore.update(dataset.id, {
                rows: [[100], [200], [300]]
            });

            // Re-execute metric on updated data
            const updatedValue = metricExecutionEngine.executeMetric(metric, updated);
            expect(updatedValue).toBe(200); // (100+200+300)/3
            expect(updatedValue).not.toBe(initialValue);
        });
    });

    describe('Error handling in workflow', () => {
        test('should handle missing dataset gracefully', () => {
            const metric = metricsStore.create(
                'nonexistent',
                'Test Metric',
                0,
                'scalar',
                'value',
                'mean'
            );

            expect(() => {
                const dataset = datasetStore.get('nonexistent');
                metricExecutionEngine.executeMetric(metric, dataset);
            }).toThrow();
        });

        test('should handle missing column in metric', () => {
            const dataset = datasetStore.create(
                'Test Dataset',
                'SELECT id FROM test',
                ['id'],
                [[1], [2]]
            );

            const metric = metricsStore.create(
                dataset.id,
                'Invalid Metric',
                0,
                'scalar',
                'nonexistent_column',
                'mean'
            );

            expect(() => {
                metricExecutionEngine.executeMetric(metric, dataset);
            }).toThrow();
        });
    });

    describe('Data persistence across operations', () => {
        test('should persist datasets and metrics through operations', () => {
            // Create dataset
            const dataset = datasetStore.create(
                'Persistent Dataset',
                'SELECT value FROM test',
                ['value'],
                [[10], [20]]
            );

            // Create metric
            const metric = metricsStore.create(
                dataset.id,
                'Persistent Metric',
                0,
                'scalar',
                'value',
                'mean'
            );

            // Verify persistence
            expect(datasetStore.exists(dataset.id)).toBe(true);
            expect(metricsStore.get(metric.id)).toBeTruthy();

            // Simulate page reload by re-initializing stores
            datasetStore.loadFromStorage();
            metricsStore.loadFromStorage();

            // Verify data still exists
            const reloadedDataset = datasetStore.get(dataset.id);
            const reloadedMetric = metricsStore.get(metric.id);
            expect(reloadedDataset).toBeTruthy();
            expect(reloadedMetric).toBeTruthy();
        });
    });
});


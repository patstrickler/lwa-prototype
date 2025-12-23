import { VisualizationPanel } from '../components/visualization-panel.js';
import { datasetStore } from '../data/datasets.js';
import { metricsStore } from '../data/metrics.js';

// Mock Highcharts before importing
global.Highcharts = {
    Chart: jest.fn(function(config) {
        this.config = config;
        this.destroy = jest.fn();
        this.series = [];
        this.xAxis = [];
        this.yAxis = [];
        return this;
    })
};

describe('Visualization Panel', () => {
    let container;
    let panel;

    beforeEach(() => {
        // Create a container element
        container = document.createElement('div');
        container.id = 'test-visualization-panel';
        document.body.appendChild(container);
        
        // Clear stores
        localStorage.clear();
        datasetStore.datasets.clear();
        metricsStore.metrics.clear();
        
        // Create panel
        panel = new VisualizationPanel('#test-visualization-panel');
    });

    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize with empty state', () => {
            expect(panel.currentDataset).toBeNull();
            expect(panel.currentMetrics).toEqual([]);
            expect(panel.charts).toEqual([]);
        });

        test('should render chart builder UI', () => {
            const builder = container.querySelector('.visualization-builder');
            expect(builder).toBeTruthy();
            expect(container.querySelector('#chart-type-select')).toBeTruthy();
            expect(container.querySelector('#x-axis-display')).toBeTruthy();
            expect(container.querySelector('#y-axis-display')).toBeTruthy();
        });
    });

    describe('dataset operations', () => {
        test('should update dataset', () => {
            const dataset = datasetStore.create('Test Dataset', 'SELECT * FROM test', 
                ['id', 'value'], [[1, 10], [2, 20]]);
            panel.updateDataset(dataset);
            expect(panel.currentDataset).toEqual(dataset);
        });

        test('should handle missing dataset gracefully', () => {
            const missingDataset = { id: 'nonexistent', name: 'Missing' };
            panel.updateDataset(missingDataset);
            expect(panel.currentDataset).toBeNull();
        });
    });

    describe('axis selection', () => {
        test('should select X axis', () => {
            const dataset = datasetStore.create('Test', 'SELECT * FROM test', 
                ['id', 'value'], [[1, 10], [2, 20]]);
            panel.selectAxis('column', 'id', dataset.id, 'x');
            expect(panel.xAxisSelection).toBeTruthy();
            expect(panel.xAxisSelection.type).toBe('column');
            expect(panel.xAxisSelection.value).toBe('id');
        });

        test('should select Y axis', () => {
            const dataset = datasetStore.create('Test', 'SELECT * FROM test', 
                ['id', 'value'], [[1, 10], [2, 20]]);
            panel.selectAxis('column', 'value', dataset.id, 'y');
            expect(panel.yAxisSelection).toBeTruthy();
            expect(panel.yAxisSelection.type).toBe('column');
            expect(panel.yAxisSelection.value).toBe('value');
        });

        test('should clear selections', () => {
            const dataset = datasetStore.create('Test', 'SELECT * FROM test', 
                ['id', 'value'], [[1, 10]]);
            panel.selectAxis('column', 'id', dataset.id, 'x');
            panel.selectAxis('column', 'value', dataset.id, 'y');
            panel.clearSelections();
            expect(panel.xAxisSelection).toBeNull();
            expect(panel.yAxisSelection).toBeNull();
        });
    });

    describe('chart rendering', () => {
        test('should render line chart with valid data', () => {
            const dataset = datasetStore.create('Test', 'SELECT * FROM test', 
                ['id', 'value'], [[1, 10], [2, 20], [3, 30]]);
            panel.selectAxis('column', 'id', dataset.id, 'x');
            panel.selectAxis('column', 'value', dataset.id, 'y');
            
            // Wait for debounced render
            setTimeout(() => {
                const chartsContainer = container.querySelector('#charts-container');
                expect(chartsContainer.children.length).toBeGreaterThan(0);
            }, 300);
        });

        test('should not render chart without both axes', () => {
            const dataset = datasetStore.create('Test', 'SELECT * FROM test', 
                ['id', 'value'], [[1, 10]]);
            panel.selectAxis('column', 'id', dataset.id, 'x');
            // Y axis not selected
            const chartsContainer = container.querySelector('#charts-container');
            expect(chartsContainer.innerHTML).toBe('');
        });

        test('should handle empty dataset gracefully', () => {
            const dataset = datasetStore.create('Test', 'SELECT * FROM test', 
                ['id', 'value'], []);
            panel.selectAxis('column', 'id', dataset.id, 'x');
            panel.selectAxis('column', 'value', dataset.id, 'y');
            // Should not throw error
            expect(() => panel.renderChart()).not.toThrow();
        });
    });

    describe('data conversion', () => {
        test('should convert dataset rows to data objects', () => {
            const dataset = datasetStore.create('Test', 'SELECT * FROM test', 
                ['id', 'value'], [[1, 10], [2, 20]]);
            const data = panel.getDatasetData(dataset);
            expect(data.length).toBe(2);
            expect(data[0]).toEqual({ id: 1, value: 10 });
            expect(data[1]).toEqual({ id: 2, value: 20 });
        });

        test('should handle dataset with data property', () => {
            const dataset = {
                id: 'ds_1',
                columns: ['id', 'value'],
                data: [{ id: 1, value: 10 }]
            };
            const data = panel.getDatasetData(dataset);
            expect(data).toEqual(dataset.data);
        });

        test('should convert to Highcharts series format', () => {
            const data = [
                { id: 1, value: 10 },
                { id: 2, value: 20 },
                { id: 3, value: 30 }
            ];
            const seriesData = panel.convertToHighchartsSeries(data, 'id', 'value', 'line');
            expect(seriesData).toHaveProperty('chartData');
            expect(seriesData).toHaveProperty('isXNumeric');
            expect(seriesData).toHaveProperty('categories');
        });

        test('should handle scatter plot data format', () => {
            const data = [
                { x: 1, y: 10 },
                { x: 2, y: 20 }
            ];
            const seriesData = panel.convertToHighchartsSeries(data, 'x', 'y', 'scatter');
            expect(Array.isArray(seriesData.chartData)).toBe(true);
        });

        test('should filter out null values', () => {
            const data = [
                { id: 1, value: 10 },
                { id: 2, value: null },
                { id: 3, value: 30 }
            ];
            const seriesData = panel.convertToHighchartsSeries(data, 'id', 'value', 'line');
            expect(seriesData.chartData.length).toBeLessThanOrEqual(2);
        });
    });

    describe('KPI cards', () => {
        test('should render KPI card for metric', () => {
            const dataset = datasetStore.create('Test', 'SELECT * FROM test', 
                ['id', 'value'], [[1, 10]]);
            const metric = metricsStore.create(dataset.id, 'Average Value', 42.5, 'scalar', 'value', 'mean');
            panel.renderKPICard(metric);
            const chartsContainer = container.querySelector('#charts-container');
            const kpiCard = chartsContainer.querySelector('.kpi-card');
            expect(kpiCard).toBeTruthy();
        });
    });

    describe('formatting', () => {
        test('should format column names', () => {
            expect(panel.formatColumnName('sample_id')).toBe('Sample Id');
            expect(panel.formatColumnName('test_name')).toBe('Test Name');
        });

        test('should format metric values', () => {
            expect(panel.formatMetricValue(1000)).toBe('1.00K');
            expect(panel.formatMetricValue(1000000)).toBe('1.00M');
            expect(panel.formatMetricValue(42.5)).toBe('42.5');
        });
    });
});


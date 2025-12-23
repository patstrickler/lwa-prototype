// Main application entry point
import { QueryBuilder } from './components/query-builder.js';
import { AnalysisPanel } from './components/analysis-panel.js';
import { VisualizationPanel } from './components/visualization-panel.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    const queryBuilder = new QueryBuilder('#query-builder');
    const analysisPanel = new AnalysisPanel('#analysis-panel');
    const visualizationPanel = new VisualizationPanel('#visualization-panel');
    
    // Set up event listeners for component communication
    // Query Builder → Analysis Panel
    queryBuilder.onDatasetCreated((dataset) => {
        analysisPanel.setDataset(dataset);
    });
    
    // Analysis Panel → Visualization Panel
    analysisPanel.onMetricsUpdated((metrics) => {
        visualizationPanel.updateMetrics(metrics);
    });
    
    analysisPanel.onDatasetUpdated((dataset) => {
        visualizationPanel.updateDataset(dataset);
    });
});


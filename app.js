// Main application entry point
import { QueryBuilder } from './components/query-builder.js';
import { AnalysisPanel } from './components/analysis-panel.js';
import { VisualizationPanel } from './components/visualization-panel.js';
import { TableBrowser } from './components/table-browser.js';
import { DatasetBrowser } from './components/dataset-browser.js';

// Page routing/navigation functionality
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links and pages
            navLinks.forEach(l => l.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Show corresponding page
            const pageId = link.getAttribute('data-page');
            const targetPage = document.getElementById(`${pageId}-page`);
            if (targetPage) {
                targetPage.classList.add('active');
            }
        });
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation
    initNavigation();
    
    // Initialize components
    const tableBrowser = new TableBrowser('#table-browser');
    
    // Initialize dataset browsers for both pages
    const datasetBrowserAnalysis = new DatasetBrowser('#dataset-browser-analysis');
    const datasetBrowserVisualization = new DatasetBrowser('#dataset-browser-visualization');
    // Use visualization browser as the main one for visualization panel interactions
    const datasetBrowser = datasetBrowserVisualization;
    
    const queryBuilder = new QueryBuilder('#query-builder');
    const analysisPanel = new AnalysisPanel('#analysis-panel');
    const visualizationPanel = new VisualizationPanel('#visualization-panel');
    
    // Table Browser → Query Builder
    tableBrowser.onTableClick((tableName) => {
        queryBuilder.insertText(tableName);
    });
    
    tableBrowser.onColumnClick((tableName, columnName) => {
        queryBuilder.insertText(`${tableName}.${columnName}`);
    });
    
    tableBrowser.onDatasetSelect((datasetId) => {
        queryBuilder.loadDataset(datasetId);
    });
    
    // Query Builder → Table Browser (refresh dropdown after save/update)
    queryBuilder.onRefreshTableBrowser(() => {
        tableBrowser.loadSavedDatasets().then(() => {
            tableBrowser.render();
            tableBrowser.attachEventListeners();
        });
    });
    
    // Set up event listeners for component communication
    // Dataset Browser (Analysis) → Analysis Panel
    datasetBrowserAnalysis.onDatasetSelect((dataset) => {
        analysisPanel.setDataset(dataset);
        analysisPanel.refreshDatasetSelector();
    });
    
    // Dataset Browser (Analysis) → Edit Metric/Script
    datasetBrowserAnalysis.onEditMetric((metricId) => {
        if (analysisPanel.unifiedBuilder) {
            analysisPanel.unifiedBuilder.editMetric(metricId);
        }
    });
    
    datasetBrowserAnalysis.onEditScript((scriptId) => {
        if (analysisPanel.unifiedBuilder) {
            analysisPanel.unifiedBuilder.editScript(scriptId);
        }
    });
    
    // Dataset Browser (Visualization) → Visualization Panel
    datasetBrowserVisualization.onDatasetSelect((dataset) => {
        if (visualizationPanel.selectDataset) {
            visualizationPanel.selectDataset(dataset.id);
        }
    });
    
    // Dataset Browser item selection → Visualization Panel
    datasetBrowserVisualization.onItemSelect((type, value, datasetId) => {
        if (visualizationPanel.handleBrowserItemSelection) {
            visualizationPanel.handleBrowserItemSelection(type, value, datasetId);
        }
    });
    
    // Query Builder → Analysis Panel & Dataset Browsers
    queryBuilder.onDatasetCreated((dataset) => {
        analysisPanel.setDataset(dataset);
        analysisPanel.refreshDatasetSelector();
        datasetBrowserAnalysis.refresh();
        datasetBrowserVisualization.refresh();
    });
    
    // Analysis Panel → Visualization Panel
    analysisPanel.onMetricsUpdated((metrics) => {
        visualizationPanel.updateMetrics(metrics);
    });
    
    analysisPanel.onDatasetUpdated((dataset) => {
        visualizationPanel.updateDataset(dataset);
    });
    
    // Handle dataset deletion - refresh all components
    tableBrowser.onDatasetDeleted((datasetId, dataset) => {
        // Refresh dataset browsers
        datasetBrowserAnalysis.refresh();
        datasetBrowserVisualization.refresh();
        
        // Clear analysis panel if it was using the deleted dataset
        if (analysisPanel.currentDataset && analysisPanel.currentDataset.id === datasetId) {
            analysisPanel.setDataset(null);
        }
        
        // Clear visualization panel if it was using the deleted dataset
        if (visualizationPanel.currentDataset && visualizationPanel.currentDataset.id === datasetId) {
            visualizationPanel.updateDataset(null);
        }
    });
    
    queryBuilder.onDatasetDeleted((datasetId, dataset) => {
        // Refresh dataset browsers
        datasetBrowserAnalysis.refresh();
        datasetBrowserVisualization.refresh();
        
        // Clear analysis panel if it was using the deleted dataset
        if (analysisPanel.currentDataset && analysisPanel.currentDataset.id === datasetId) {
            analysisPanel.setDataset(null);
        }
        
        // Clear visualization panel if it was using the deleted dataset
        if (visualizationPanel.currentDataset && visualizationPanel.currentDataset.id === datasetId) {
            visualizationPanel.updateDataset(null);
        }
    });
});


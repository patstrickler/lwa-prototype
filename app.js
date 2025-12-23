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
    const datasetBrowser = new DatasetBrowser('#dataset-browser');
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
    
    // Set up event listeners for component communication
    // Dataset Browser → Analysis Panel
    datasetBrowser.onSelection((dataset) => {
        analysisPanel.setDataset(dataset);
        analysisPanel.refreshDatasetSelector();
    });
    
    // Query Builder → Analysis Panel & Dataset Browser
    queryBuilder.onDatasetCreated((dataset) => {
        analysisPanel.setDataset(dataset);
        analysisPanel.refreshDatasetSelector();
        datasetBrowser.refresh();
    });
    
    // Analysis Panel → Visualization Panel
    analysisPanel.onMetricsUpdated((metrics) => {
        visualizationPanel.updateMetrics(metrics);
    });
    
    analysisPanel.onDatasetUpdated((dataset) => {
        visualizationPanel.updateDataset(dataset);
    });
});


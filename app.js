// Main application entry point
import { QueryBuilder } from './components/query-builder.js';
import { AnalysisPanel } from './components/analysis-panel.js';
import { VisualizationPanel } from './components/visualization-panel.js';
import { ReportsPanel } from './components/reports-panel.js';
import { TableBrowser } from './components/table-browser.js';
import { DatasetBrowser } from './components/dataset-browser.js';
import { datasetSelectionManager } from './utils/dataset-selection-manager.js';

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
                
                // Sync dataset selection when switching pages
                const selectedDatasetId = datasetSelectionManager.getSelectedDatasetId();
                if (selectedDatasetId) {
                    // Trigger a sync by notifying selection change
                    // This will update all dataset browsers on the new page
                    datasetSelectionManager.notifySelectionChanged(selectedDatasetId);
                }
            }
        });
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation
    initNavigation();
    
    // Initialize components
    const tableBrowser = new TableBrowser('#table-browser', '#saved-datasets-container');
    
    // Initialize dataset browsers for both pages
    const datasetBrowserAnalysis = new DatasetBrowser('#dataset-browser-analysis');
    const datasetBrowserVisualization = new DatasetBrowser('#dataset-browser-visualization');
    // Use visualization browser as the main one for visualization panel interactions
    const datasetBrowser = datasetBrowserVisualization;
    
    const queryBuilder = new QueryBuilder('#query-builder');
    const analysisPanel = new AnalysisPanel('#analysis-panel');
    const visualizationPanel = new VisualizationPanel('#visualization-panel');
    const reportsPanel = new ReportsPanel('#reports-panel');
    
    // Lazy load admin panel only when admin page is accessed
    let adminPanel = null;
    const adminPageLink = document.querySelector('[data-page="admin"]');
    if (adminPageLink) {
        adminPageLink.addEventListener('click', async () => {
            if (!adminPanel) {
                try {
                    const { AdminPanel } = await import('./components/admin-panel.js');
                    const adminPage = document.getElementById('admin-page');
                    if (adminPage && !adminPanel) {
                        adminPanel = new AdminPanel('#admin-panel');
                    }
                } catch (error) {
                    console.error('Failed to load admin panel:', error);
                }
            }
        });
    }
    
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
    
    // Dataset Browser (Analysis) → Edit Metric
    datasetBrowserAnalysis.onEditMetric((metricId, isDuplicate) => {
        if (analysisPanel.unifiedBuilder) {
            analysisPanel.unifiedBuilder.editMetric(metricId, isDuplicate);
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
        // Update global selection to the newly created dataset
        datasetSelectionManager.setSelectedDatasetId(dataset.id);
        
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
        // Clear global selection if deleted dataset was selected
        const currentSelection = datasetSelectionManager.getSelectedDatasetId();
        if (currentSelection === datasetId) {
            datasetSelectionManager.clearSelection();
        }
        
        // Refresh dataset browsers
        datasetBrowserAnalysis.refresh();
        datasetBrowserVisualization.refresh();
        
        // Clear query builder if it was editing the deleted dataset
        if (queryBuilder.currentDatasetId === datasetId) {
            queryBuilder.clearQuery();
        }
        
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
        // Clear global selection if deleted dataset was selected
        const currentSelection = datasetSelectionManager.getSelectedDatasetId();
        if (currentSelection === datasetId) {
            datasetSelectionManager.clearSelection();
        }
        
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


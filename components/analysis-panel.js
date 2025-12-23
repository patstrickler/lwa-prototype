// Analysis Panel Component
// Metrics & scripts on datasets

import { DatasetSelector } from './dataset-selector.js';

export class AnalysisPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentDataset = null;
        this.metricsCallbacks = [];
        this.datasetCallbacks = [];
        this.datasetSelector = null;
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.initDatasetSelector();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="analysis-panel">
                <div id="dataset-selector-container"></div>
                
                <div class="metrics-section">
                    <h3>Metrics</h3>
                    <div id="metrics-list"></div>
                    <button id="add-metric" class="btn btn-primary">Add Metric</button>
                </div>
                
                <div class="scripts-section">
                    <h3>Analysis Scripts</h3>
                    <div id="scripts-list"></div>
                    <button id="add-script" class="btn btn-primary">Add Script</button>
                </div>
            </div>
        `;
    }
    
    initDatasetSelector() {
        this.datasetSelector = new DatasetSelector('#dataset-selector-container');
        this.datasetSelector.onSelection((dataset) => {
            this.setDataset(dataset);
        });
    }
    
    attachEventListeners() {
        const addMetricBtn = this.container.querySelector('#add-metric');
        const addScriptBtn = this.container.querySelector('#add-script');
        
        addMetricBtn.addEventListener('click', () => this.showAddMetricDialog());
        addScriptBtn.addEventListener('click', () => this.showAddScriptDialog());
    }
    
    setDataset(dataset) {
        this.currentDataset = dataset;
        if (this.datasetSelector) {
            this.datasetSelector.setSelectedDataset(dataset);
        }
        this.updateMetricsList();
        this.notifyDatasetUpdated(dataset);
    }
    
    refreshDatasetSelector() {
        if (this.datasetSelector) {
            this.datasetSelector.refresh();
        }
    }
    
    updateMetricsList() {
        const metricsList = this.container.querySelector('#metrics-list');
        // TODO: Display metrics for current dataset
        metricsList.innerHTML = '<p>No metrics yet. Add a metric to get started.</p>';
    }
    
    showAddMetricDialog() {
        // TODO: Implement metric creation dialog
        alert('Add Metric dialog - to be implemented');
    }
    
    showAddScriptDialog() {
        // TODO: Implement script creation dialog
        alert('Add Script dialog - to be implemented');
    }
    
    onMetricsUpdated(callback) {
        this.metricsCallbacks.push(callback);
    }
    
    onDatasetUpdated(callback) {
        this.datasetCallbacks.push(callback);
    }
    
    notifyMetricsUpdated(metrics) {
        this.metricsCallbacks.forEach(callback => callback(metrics));
    }
    
    notifyDatasetUpdated(dataset) {
        this.datasetCallbacks.forEach(callback => callback(dataset));
    }
}


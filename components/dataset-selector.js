// Dataset Selector Component
// Dropdown that lists saved datasets by name and allows selecting one

import { datasetStore } from '../data/datasets.js';

export class DatasetSelector {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.selectedDataset = null;
        this.selectionCallbacks = [];
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.refresh();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="dataset-selector">
                <label for="dataset-dropdown">Select Dataset:</label>
                <select id="dataset-dropdown" class="dataset-dropdown">
                    <option value="">-- Select a dataset --</option>
                </select>
            </div>
        `;
    }
    
    attachEventListeners() {
        const dropdown = this.container.querySelector('#dataset-dropdown');
        dropdown.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            if (selectedId) {
                const dataset = datasetStore.get(selectedId);
                this.selectedDataset = dataset;
                this.notifySelection(dataset);
            } else {
                this.selectedDataset = null;
                this.notifySelection(null);
            }
        });
    }
    
    refresh() {
        const dropdown = this.container.querySelector('#dataset-dropdown');
        const datasets = datasetStore.getAll();
        
        // Clear existing options except the placeholder
        dropdown.innerHTML = '<option value="">-- Select a dataset --</option>';
        
        // Add dataset options
        datasets.forEach(dataset => {
            const option = document.createElement('option');
            option.value = dataset.id;
            option.textContent = dataset.name;
            dropdown.appendChild(option);
        });
        
        // If there's a selected dataset, maintain the selection
        if (this.selectedDataset) {
            dropdown.value = this.selectedDataset.id;
        }
    }
    
    setSelectedDataset(dataset) {
        this.selectedDataset = dataset;
        const dropdown = this.container.querySelector('#dataset-dropdown');
        if (dropdown) {
            dropdown.value = dataset ? dataset.id : '';
        }
    }
    
    getSelectedDataset() {
        return this.selectedDataset;
    }
    
    onSelection(callback) {
        this.selectionCallbacks.push(callback);
    }
    
    notifySelection(dataset) {
        this.selectionCallbacks.forEach(callback => callback(dataset));
    }
}


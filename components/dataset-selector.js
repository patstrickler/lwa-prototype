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
        // Check if dropdown is currently open before re-rendering
        const existingDropdown = this.container.querySelector('#dataset-dropdown');
        const isDropdownOpen = existingDropdown && document.activeElement === existingDropdown;
        const currentValue = existingDropdown ? existingDropdown.value : null;
        
        this.container.innerHTML = `
            <div class="dataset-selector">
                <label for="dataset-dropdown">Select Dataset:</label>
                <select id="dataset-dropdown" class="dataset-dropdown">
                    <option value="">-- Select a dataset --</option>
                </select>
            </div>
        `;
        
        // If dropdown was open, restore focus and value after a brief delay
        // This prevents the dropdown from closing if render is called while it's open
        if (isDropdownOpen && currentValue !== null) {
            requestAnimationFrame(() => {
                const newDropdown = this.container.querySelector('#dataset-dropdown');
                if (newDropdown) {
                    newDropdown.value = currentValue;
                    // Don't restore focus automatically as it might interfere with user interaction
                }
            });
        }
    }
    
    attachEventListeners() {
        const dropdown = this.container.querySelector('#dataset-dropdown');
        if (!dropdown) return;
        
        // Remove existing listener if any (prevent duplicates)
        if (this._changeHandler) {
            dropdown.removeEventListener('change', this._changeHandler);
        }
        
        // Create handler with debouncing
        this._changeHandler = (e) => {
            // Clear any pending updates
            if (this._changeTimeout) {
                clearTimeout(this._changeTimeout);
            }
            
            // Debounce to prevent jitter
            this._changeTimeout = setTimeout(() => {
                requestAnimationFrame(() => {
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
            }, 150);
        };
        
        dropdown.addEventListener('change', this._changeHandler);
    }
    
    refresh() {
        const dropdown = this.container.querySelector('#dataset-dropdown');
        if (!dropdown) return;
        
        // Don't refresh if dropdown is currently open (has focus)
        // This prevents the dropdown from closing when user is trying to select
        if (document.activeElement === dropdown) {
            // Defer refresh until dropdown loses focus
            if (this._pendingRefresh) {
                return; // Already have a pending refresh
            }
            this._pendingRefresh = true;
            const handleBlur = () => {
                dropdown.removeEventListener('blur', handleBlur);
                this._pendingRefresh = false;
                // Refresh after a small delay to ensure dropdown is fully closed
                setTimeout(() => this.refresh(), 100);
            };
            dropdown.addEventListener('blur', handleBlur, { once: true });
            return;
        }
        
        // Filter datasets based on access control
        const allDatasets = datasetStore.getAll();
        const { UserManager } = await import('../utils/user-manager.js');
        const userManager = new UserManager();
        const datasets = allDatasets.filter(dataset => {
            return userManager.hasAccessToDataset(dataset);
        });
        
        const currentValue = dropdown.value;
        
        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select a dataset --';
        fragment.appendChild(placeholder);
        
        // Add dataset options
        datasets.forEach(dataset => {
            const option = document.createElement('option');
            option.value = dataset.id;
            option.textContent = dataset.name;
            fragment.appendChild(option);
        });
        
        // Batch DOM update - but only if dropdown is not open
        requestAnimationFrame(() => {
            // Double-check dropdown is not open before clearing
            if (document.activeElement !== dropdown) {
                dropdown.innerHTML = '';
                dropdown.appendChild(fragment);
                
                // If there's a selected dataset, maintain the selection
                if (this.selectedDataset && datasets.find(d => d.id === this.selectedDataset.id)) {
                    dropdown.value = this.selectedDataset.id;
                } else if (currentValue && datasets.find(d => d.id === currentValue)) {
                    dropdown.value = currentValue;
                }
            }
        });
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


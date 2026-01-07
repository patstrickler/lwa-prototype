// Shared dataset selection manager to maintain selection across pages/tabs

const SELECTION_STORAGE_KEY = 'lwa_selected_dataset';

class DatasetSelectionManager {
    constructor() {
        this.selectedDatasetId = null;
        this.callbacks = [];
        this.loadFromStorage();
    }
    
    /**
     * Loads selected dataset ID from localStorage
     */
    loadFromStorage() {
        try {
            const stored = sessionStorage.getItem(SELECTION_STORAGE_KEY);
            if (stored) {
                this.selectedDatasetId = stored;
            }
        } catch (error) {
            console.error('Error loading dataset selection from storage:', error);
        }
    }
    
    /**
     * Saves selected dataset ID to localStorage
     */
    saveToStorage() {
        try {
            if (this.selectedDatasetId) {
                sessionStorage.setItem(SELECTION_STORAGE_KEY, this.selectedDatasetId);
            } else {
                sessionStorage.removeItem(SELECTION_STORAGE_KEY);
            }
        } catch (error) {
            console.error('Error saving dataset selection to storage:', error);
        }
    }
    
    /**
     * Sets the selected dataset ID
     * @param {string|null} datasetId - Dataset ID to select, or null to clear
     */
    setSelectedDatasetId(datasetId) {
        const previousId = this.selectedDatasetId;
        this.selectedDatasetId = datasetId;
        this.saveToStorage();
        
        // Notify listeners if selection changed
        if (previousId !== datasetId) {
            this.notifySelectionChanged(datasetId);
        }
    }
    
    /**
     * Gets the currently selected dataset ID
     * @returns {string|null} Selected dataset ID or null
     */
    getSelectedDatasetId() {
        return this.selectedDatasetId;
    }
    
    /**
     * Clears the selection
     */
    clearSelection() {
        this.setSelectedDatasetId(null);
    }
    
    /**
     * Registers a callback for selection changes
     * @param {Function} callback - Callback function(datasetId)
     */
    onSelectionChanged(callback) {
        this.callbacks.push(callback);
    }
    
    /**
     * Notifies all listeners of selection change
     * @param {string|null} datasetId - New selected dataset ID
     */
    notifySelectionChanged(datasetId) {
        this.callbacks.forEach(callback => {
            try {
                callback(datasetId);
            } catch (error) {
                console.error('Error in dataset selection callback:', error);
            }
        });
    }
}

export const datasetSelectionManager = new DatasetSelectionManager();


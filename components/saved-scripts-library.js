// Saved Scripts Library Component
// Displays and manages saved R and Python scripts

import { scriptsStore } from '../data/scripts.js';
import { Modal } from '../utils/modal.js';

export class SavedScriptsLibrary {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.onScriptSelectCallbacks = [];
        this.onScriptDeleteCallbacks = [];
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        
        // Refresh periodically to catch new scripts
        setInterval(() => {
            if (this.container) {
                this.refresh();
            }
        }, 2000);
    }
    
    render() {
        const scripts = scriptsStore.getAll();
        const sortedScripts = scripts.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA; // Most recent first
        });
        
        this.container.innerHTML = `
            <div class="saved-scripts-library">
                ${sortedScripts.length === 0 
                    ? '<div class="empty-state-small">No saved scripts yet</div>'
                    : sortedScripts.map(script => this.renderScriptItem(script)).join('')
                }
            </div>
        `;
        
        // Re-attach event listeners after rendering
        this.attachEventListeners();
    }
    
    renderScriptItem(script) {
        const language = script.language || 'python';
        const languageLabel = language.toUpperCase();
        const createdAt = script.createdAt 
            ? new Date(script.createdAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            })
            : 'Unknown date';
        
        return `
            <div class="saved-script-item" data-script-id="${script.id}">
                <div class="script-item-header">
                    <div class="script-item-info">
                        <div class="script-item-name">${this.escapeHtml(script.name || 'Unnamed Script')}</div>
                        <div class="script-item-meta">
                            <span class="script-language-badge script-language-${language}">${languageLabel}</span>
                            <span class="script-date">${createdAt}</span>
                        </div>
                    </div>
                    <div class="script-item-actions">
                        <button type="button" class="btn btn-sm btn-icon load-script-btn" title="Load Script" data-script-id="${script.id}" onclick="return false;">
                            <span class="material-icons" style="font-size: 16px; pointer-events: none;">play_arrow</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-icon delete-script-btn" title="Delete Script" data-script-id="${script.id}" onclick="return false;">
                            <span class="material-icons" style="font-size: 16px; pointer-events: none;">delete</span>
                        </button>
                    </div>
                </div>
                ${script.description ? `<div class="script-item-description">${this.escapeHtml(script.description)}</div>` : ''}
            </div>
        `;
    }
    
    attachEventListeners() {
        if (!this.container) return;
        
        // Remove existing listener if any (to prevent duplicates)
        if (this._clickHandler) {
            this.container.removeEventListener('click', this._clickHandler);
        }
        
        // Use event delegation for dynamic content
        this._clickHandler = (e) => {
            // Check if clicking on a button or icon inside a button
            const clickedButton = e.target.closest('button');
            if (!clickedButton) {
                // Not clicking on a button, check if clicking on script item
                const scriptItem = e.target.closest('.saved-script-item');
                if (scriptItem) {
                    const scriptId = scriptItem.getAttribute('data-script-id');
                    if (scriptId) {
                        this.loadScript(scriptId);
                    }
                }
                return;
            }
            
            // We're clicking on a button - determine which one
            e.preventDefault();
            e.stopPropagation();
            
            const scriptId = clickedButton.getAttribute('data-script-id');
            if (!scriptId) {
                return;
            }
            
            // Check button type
            if (clickedButton.classList.contains('delete-script-btn')) {
                console.log('Delete button clicked for script:', scriptId);
                this.deleteScript(scriptId);
            } else if (clickedButton.classList.contains('load-script-btn')) {
                console.log('Load button clicked for script:', scriptId);
                this.loadScript(scriptId);
            }
        };
        
        this.container.addEventListener('click', this._clickHandler);
    }
    
    loadScript(scriptId) {
        const script = scriptsStore.get(scriptId);
        if (script) {
            this.notifyScriptSelected(script);
        }
    }
    
    async deleteScript(scriptId) {
        console.log('deleteScript called with ID:', scriptId);
        
        if (!scriptId) {
            console.error('No script ID provided for deletion');
            return;
        }
        
        const script = scriptsStore.get(scriptId);
        if (!script) {
            console.warn(`Script with ID ${scriptId} not found`);
            alert(`Script not found. It may have already been deleted.`);
            this.refresh(); // Refresh to update the list
            return;
        }
        
        console.log('Script found:', script.name);
        
        try {
            console.log('Showing confirmation modal...');
            const confirmed = await Modal.confirm(
                `Are you sure you want to delete "${script.name}"? This action cannot be undone.`
            );
            
            console.log('Modal confirmed:', confirmed);
            
            if (confirmed) {
                const deleted = scriptsStore.delete(scriptId);
                console.log('Delete result:', deleted);
                
                if (deleted) {
                    this.render();
                    // Re-attach event listeners after render
                    this.attachEventListeners();
                    this.notifyScriptDeleted(scriptId);
                    console.log('Script deleted successfully');
                } else {
                    console.error(`Failed to delete script with ID ${scriptId}`);
                    alert('Failed to delete script. Please try again.');
                }
            } else {
                console.log('Deletion cancelled by user');
            }
        } catch (error) {
            console.error('Error deleting script:', error);
            console.error('Error stack:', error.stack);
            
            // Fallback to native confirm on error
            const confirmed = window.confirm(
                `Are you sure you want to delete "${script.name}"? This action cannot be undone.`
            );
            if (confirmed) {
                const deleted = scriptsStore.delete(scriptId);
                if (deleted) {
                    this.render();
                    this.attachEventListeners();
                    this.notifyScriptDeleted(scriptId);
                } else {
                    alert('Failed to delete script. Please try again.');
                }
            }
        }
    }
    
    onScriptSelect(callback) {
        this.onScriptSelectCallbacks.push(callback);
    }
    
    notifyScriptSelected(script) {
        this.onScriptSelectCallbacks.forEach(callback => callback(script));
    }
    
    onScriptDelete(callback) {
        this.onScriptDeleteCallbacks.push(callback);
    }
    
    notifyScriptDeleted(scriptId) {
        this.onScriptDeleteCallbacks.forEach(callback => callback(scriptId));
    }
    
    refresh() {
        this.render();
        // Re-attach event listeners after render to ensure they work with new DOM
        this.attachEventListeners();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


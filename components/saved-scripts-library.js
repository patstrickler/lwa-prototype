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
                        <button class="btn btn-sm btn-icon load-script-btn" title="Load Script" data-script-id="${script.id}">
                            <span class="material-icons" style="font-size: 16px;">play_arrow</span>
                        </button>
                        <button class="btn btn-sm btn-icon delete-script-btn" title="Delete Script" data-script-id="${script.id}">
                            <span class="material-icons" style="font-size: 16px;">delete</span>
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
            // Check for delete button first (highest priority)
            const deleteBtn = e.target.closest('.delete-script-btn');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                const scriptId = deleteBtn.getAttribute('data-script-id');
                if (scriptId) {
                    this.deleteScript(scriptId);
                }
                return;
            }
            
            // Check for load button
            const loadBtn = e.target.closest('.load-script-btn');
            if (loadBtn) {
                e.preventDefault();
                e.stopPropagation();
                const scriptId = loadBtn.getAttribute('data-script-id');
                if (scriptId) {
                    this.loadScript(scriptId);
                }
                return;
            }
            
            // Click on script item to load it (only if not clicking on buttons)
            const scriptItem = e.target.closest('.saved-script-item');
            if (scriptItem && !e.target.closest('button')) {
                const scriptId = scriptItem.getAttribute('data-script-id');
                if (scriptId) {
                    this.loadScript(scriptId);
                }
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
        if (!scriptId) {
            console.error('No script ID provided for deletion');
            return;
        }
        
        const script = scriptsStore.get(scriptId);
        if (!script) {
            console.warn(`Script with ID ${scriptId} not found`);
            return;
        }
        
        try {
            const confirmed = await Modal.confirm(
                `Are you sure you want to delete "${script.name}"? This action cannot be undone.`
            );
            
            if (confirmed) {
                const deleted = scriptsStore.delete(scriptId);
                if (deleted) {
                    this.render();
                    // Re-attach event listeners after render
                    this.attachEventListeners();
                    this.notifyScriptDeleted(scriptId);
                } else {
                    console.error(`Failed to delete script with ID ${scriptId}`);
                }
            }
        } catch (error) {
            console.error('Error deleting script:', error);
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


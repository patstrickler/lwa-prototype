// Saved Scripts Library Component
// Displays and manages saved R and Python scripts

import { scriptsStore } from '../data/scripts.js';

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
        
        // Use event delegation for dynamic content
        this.container.addEventListener('click', (e) => {
            const loadBtn = e.target.closest('.load-script-btn');
            if (loadBtn) {
                const scriptId = loadBtn.getAttribute('data-script-id');
                this.loadScript(scriptId);
                e.stopPropagation();
                return;
            }
            
            const deleteBtn = e.target.closest('.delete-script-btn');
            if (deleteBtn) {
                const scriptId = deleteBtn.getAttribute('data-script-id');
                this.deleteScript(scriptId);
                e.stopPropagation();
                return;
            }
            
            // Click on script item to load it
            const scriptItem = e.target.closest('.saved-script-item');
            if (scriptItem && !loadBtn && !deleteBtn) {
                const scriptId = scriptItem.getAttribute('data-script-id');
                this.loadScript(scriptId);
            }
        });
    }
    
    loadScript(scriptId) {
        const script = scriptsStore.get(scriptId);
        if (script) {
            this.notifyScriptSelected(script);
        }
    }
    
    async deleteScript(scriptId) {
        const script = scriptsStore.get(scriptId);
        if (!script) return;
        
        const { Modal } = await import('../utils/modal.js');
        const confirmed = await Modal.confirm(
            `Are you sure you want to delete "${script.name}"? This action cannot be undone.`
        );
        
        if (confirmed) {
            const deleted = scriptsStore.delete(scriptId);
            if (deleted) {
                this.render();
                this.notifyScriptDeleted(scriptId);
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
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


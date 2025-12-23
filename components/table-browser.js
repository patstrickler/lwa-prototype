// Table Browser Component
// Displays available database tables in a sidebar

import { getAllTables } from '../utils/sql-engine.js';

export class TableBrowser {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.tables = getAllTables();
        this.onTableClickCallbacks = [];
        this.onColumnClickCallbacks = [];
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="table-browser">
                <div class="table-browser-header">
                    <h3>Database Tables</h3>
                </div>
                <div class="table-list">
                    ${this.tables.map(table => this.renderTable(table)).join('')}
                </div>
            </div>
        `;
    }
    
    renderTable(table) {
        const columnsHtml = table.columns.map(col => `
            <div class="table-column" data-table="${table.name}" data-column="${col}">
                <span class="column-icon">📊</span>
                <span class="column-name">${col}</span>
            </div>
        `).join('');
        
        return `
            <div class="table-item" data-table="${table.name}">
                <div class="table-header">
                    <span class="table-icon">🗂️</span>
                    <span class="table-name">${table.name}</span>
                    <span class="table-toggle">▼</span>
                </div>
                <div class="table-description">${table.description}</div>
                <div class="table-columns" style="display: none;">
                    ${columnsHtml}
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        // Table header click to expand/collapse
        this.container.querySelectorAll('.table-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const tableItem = header.closest('.table-item');
                const columns = tableItem.querySelector('.table-columns');
                const toggle = header.querySelector('.table-toggle');
                
                if (columns.style.display === 'none') {
                    columns.style.display = 'block';
                    toggle.textContent = '▲';
                    tableItem.classList.add('expanded');
                } else {
                    columns.style.display = 'none';
                    toggle.textContent = '▼';
                    tableItem.classList.remove('expanded');
                }
            });
        });
        
        // Table name click to insert into SQL
        this.container.querySelectorAll('.table-name').forEach(tableName => {
            tableName.addEventListener('click', (e) => {
                e.stopPropagation();
                const tableItem = tableName.closest('.table-item');
                const tableNameValue = tableItem.dataset.table;
                this.notifyTableClick(tableNameValue);
            });
        });
        
        // Column click to insert into SQL
        this.container.querySelectorAll('.table-column').forEach(column => {
            column.addEventListener('click', (e) => {
                e.stopPropagation();
                const table = column.dataset.table;
                const columnName = column.dataset.column;
                this.notifyColumnClick(table, columnName);
            });
        });
    }
    
    onTableClick(callback) {
        this.onTableClickCallbacks.push(callback);
    }
    
    onColumnClick(callback) {
        this.onColumnClickCallbacks.push(callback);
    }
    
    notifyTableClick(tableName) {
        this.onTableClickCallbacks.forEach(callback => callback(tableName));
    }
    
    notifyColumnClick(tableName, columnName) {
        this.onColumnClickCallbacks.forEach(callback => callback(tableName, columnName));
    }
}


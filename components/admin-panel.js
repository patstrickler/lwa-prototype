// Admin Panel Component
// Allows admins to manage database connections, users/groups, access control, and view health metrics

import { databaseConnectionsStore } from '../data/database-connections.js';
import { usersStore } from '../data/users.js';
import { userGroupsStore } from '../data/user-groups.js';
import { accessPermissionsStore } from '../data/access-permissions.js';
import { healthMetricsStore } from '../data/health-metrics.js';
import { Modal } from '../utils/modal.js';

export class AdminPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentTab = 'database';
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.showTab(this.currentTab);
    }
    
    render() {
        this.container.innerHTML = `
            <div class="admin-panel">
                <div class="admin-header">
                    <h2>Administration</h2>
                </div>
                
                <div class="admin-tabs">
                    <button type="button" class="admin-tab active" data-tab="database">
                        <span class="tab-icon">🗄️</span>
                        <span>Database</span>
                    </button>
                    <button type="button" class="admin-tab" data-tab="users-access">
                        <span class="tab-icon">👥</span>
                        <span>Users & Access</span>
                    </button>
                    <button type="button" class="admin-tab" data-tab="health">
                        <span class="tab-icon">📊</span>
                        <span>Health & Performance</span>
                    </button>
                </div>
                
                <div class="admin-content">
                    <div class="tab-content active" id="database-tab"></div>
                    <div class="tab-content" id="users-access-tab"></div>
                    <div class="tab-content" id="health-tab"></div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const tabs = this.container.querySelectorAll('.admin-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.getAttribute('data-tab');
                this.showTab(tabName);
            });
        });
    }
    
    showTab(tabName) {
        // Update tab buttons
        const tabs = this.container.querySelectorAll('.admin-tab');
        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update content
        const contents = this.container.querySelectorAll('.tab-content');
        contents.forEach(content => {
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        this.currentTab = tabName;
        
        // Load tab content
        switch (tabName) {
            case 'database':
                this.renderDatabaseTab();
                break;
            case 'users-access':
                this.renderUsersAccessTab();
                break;
            case 'health':
                this.renderHealthTab();
                break;
        }
    }
    
    // ===== DATABASE TAB =====
    renderDatabaseTab() {
        const tabContent = this.container.querySelector('#database-tab');
        const connections = databaseConnectionsStore.getAll();
        
        tabContent.innerHTML = `
            <div class="admin-section">
                <div class="section-header">
                    <h3>LIMS Database Connections</h3>
                    <button type="button" class="btn btn-primary" id="add-connection-btn">Add Connection</button>
                </div>
                
                <div class="connections-list" id="connections-list">
                    ${connections.length === 0 
                        ? '<p class="empty-state">No database connections configured. Click "Add Connection" to create one.</p>'
                        : connections.map(conn => this.renderConnectionCard(conn)).join('')
                    }
                </div>
            </div>
        `;
        
        const addBtn = tabContent.querySelector('#add-connection-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddConnectionDialog());
        }
        
        connections.forEach(conn => {
            const card = tabContent.querySelector(`[data-connection-id="${conn.id}"]`);
            if (card) {
                const testBtn = card.querySelector('.test-connection-btn');
                const editBtn = card.querySelector('.edit-connection-btn');
                const deleteBtn = card.querySelector('.delete-connection-btn');
                
                if (testBtn) {
                    testBtn.addEventListener('click', () => this.testConnection(conn.id));
                }
                if (editBtn) {
                    editBtn.addEventListener('click', () => this.editConnection(conn.id));
                }
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => this.deleteConnection(conn.id));
                }
            }
        });
    }
    
    renderConnectionCard(connection) {
        const statusClass = connection.status === 'connected' ? 'status-success' : 
                          connection.status === 'error' ? 'status-error' : 'status-disconnected';
        const statusText = connection.status.charAt(0).toUpperCase() + connection.status.slice(1);
        const createdDate = new Date(connection.createdAt).toLocaleDateString();
        const lastConnected = connection.lastConnected 
            ? new Date(connection.lastConnected).toLocaleDateString() 
            : 'Never';
        
        return `
            <div class="connection-card" data-connection-id="${connection.id}">
                <div class="card-header">
                    <div>
                        <h4>${this.escapeHtml(connection.name)}</h4>
                        <span class="connection-type">${this.escapeHtml(connection.type)}</span>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="card-body">
                    <div class="card-meta">
                        <span class="meta-item"><strong>Host:</strong> ${this.escapeHtml(connection.host)}:${connection.port}</span>
                        <span class="meta-item"><strong>Database:</strong> ${this.escapeHtml(connection.database)}</span>
                        <span class="meta-item"><strong>Username:</strong> ${this.escapeHtml(connection.username || 'N/A')}</span>
                        <span class="meta-item"><strong>Created:</strong> ${createdDate}</span>
                        <span class="meta-item"><strong>Last Connected:</strong> ${lastConnected}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button type="button" class="btn btn-sm btn-primary test-connection-btn">Test Connection</button>
                    <button type="button" class="btn btn-sm btn-secondary edit-connection-btn">Edit</button>
                    <button type="button" class="btn btn-sm btn-danger delete-connection-btn">Delete</button>
                </div>
            </div>
        `;
    }
    
    showAddConnectionDialog(connectionId = null) {
        const connection = connectionId ? databaseConnectionsStore.get(connectionId) : null;
        const isEdit = !!connection;
        
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        
        backdrop.innerHTML = `
            <div class="modal" style="max-width: 600px;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${isEdit ? 'Edit' : 'Add'} Database Connection</h3>
                        <button type="button" class="modal-close" id="close-db-dialog">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="db-connection-form">
                            <div class="form-group">
                                <label for="db-name">Connection Name *</label>
                                <input type="text" id="db-name" class="form-control" value="${connection ? this.escapeHtml(connection.name) : ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="db-type">Database Type *</label>
                                <select id="db-type" class="form-control" required>
                                    <option value="postgresql" ${connection && connection.type === 'postgresql' ? 'selected' : ''}>PostgreSQL</option>
                                    <option value="mysql" ${connection && connection.type === 'mysql' ? 'selected' : ''}>MySQL</option>
                                    <option value="mssql" ${connection && connection.type === 'mssql' ? 'selected' : ''}>Microsoft SQL Server</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="db-host">Host *</label>
                                <input type="text" id="db-host" class="form-control" value="${connection ? this.escapeHtml(connection.host) : 'localhost'}" required>
                            </div>
                            <div class="form-group">
                                <label for="db-port">Port *</label>
                                <input type="number" id="db-port" class="form-control" value="${connection ? connection.port : '5432'}" required>
                            </div>
                            <div class="form-group">
                                <label for="db-database">Database Name *</label>
                                <input type="text" id="db-database" class="form-control" value="${connection ? this.escapeHtml(connection.database) : ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="db-username">Username</label>
                                <input type="text" id="db-username" class="form-control" value="${connection ? this.escapeHtml(connection.username || '') : ''}">
                            </div>
                            <div class="form-group">
                                <label for="db-password">Password</label>
                                <input type="password" id="db-password" class="form-control" value="" placeholder="${isEdit ? 'Leave blank to keep current password' : ''}">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancel-db-dialog">Cancel</button>
                        <button type="button" class="btn btn-primary" id="save-db-dialog">${isEdit ? 'Update' : 'Create'} Connection</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(backdrop);
        
        const closeDialog = () => {
            backdrop.classList.add('modal-closing');
            setTimeout(() => backdrop.remove(), 200);
        };
        
        backdrop.querySelector('#close-db-dialog').addEventListener('click', closeDialog);
        backdrop.querySelector('#cancel-db-dialog').addEventListener('click', closeDialog);
        backdrop.querySelector('#save-db-dialog').addEventListener('click', async () => {
            const form = backdrop.querySelector('#db-connection-form');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const name = backdrop.querySelector('#db-name').value.trim();
            const host = backdrop.querySelector('#db-host').value.trim();
            const port = parseInt(backdrop.querySelector('#db-port').value, 10);
            const database = backdrop.querySelector('#db-database').value.trim();
            const username = backdrop.querySelector('#db-username').value.trim();
            const password = backdrop.querySelector('#db-password').value;
            const type = backdrop.querySelector('#db-type').value;
            
            try {
                if (isEdit) {
                    databaseConnectionsStore.update(connectionId, {
                        name,
                        host,
                        port,
                        database,
                        username,
                        password: password || connection.password, // Keep existing password if not changed
                        type
                    });
                    await Modal.alert('Database connection updated successfully!');
                } else {
                    databaseConnectionsStore.create(name, host, port, database, username, password, type);
                    await Modal.alert('Database connection created successfully!');
                }
                closeDialog();
                this.renderDatabaseTab();
            } catch (error) {
                await Modal.alert(`Error ${isEdit ? 'updating' : 'creating'} connection: ${error.message}`);
            }
        });
        
        // Close on backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeDialog();
            }
        });
    }
    
    async testConnection(id) {
        const connection = databaseConnectionsStore.get(id);
        if (!connection) return;
        
        await Modal.alert('Testing connection...');
        
        try {
            const success = await databaseConnectionsStore.testConnection(id);
            if (success) {
                await Modal.alert('Connection test successful!');
            } else {
                await Modal.alert('Connection test failed. Please check your settings.');
            }
            this.renderDatabaseTab();
        } catch (error) {
            await Modal.alert(`Error testing connection: ${error.message}`);
        }
    }
    
    editConnection(id) {
        this.showAddConnectionDialog(id);
    }
    
    async deleteConnection(id) {
        const confirmed = await Modal.confirm('Are you sure you want to delete this connection?');
        if (!confirmed) return;
        
        try {
            databaseConnectionsStore.delete(id);
            await Modal.alert('Connection deleted successfully!');
            this.renderDatabaseTab();
        } catch (error) {
            await Modal.alert(`Error deleting connection: ${error.message}`);
        }
    }
    
    // ===== USERS & ACCESS CONTROL TAB =====
    renderUsersAccessTab() {
        const tabContent = this.container.querySelector('#users-access-tab');
        const users = usersStore.getAll();
        const groups = userGroupsStore.getAll();
        const permissions = accessPermissionsStore.getAll();
        
        tabContent.innerHTML = `
            <div class="admin-section">
                <div class="section-header">
                    <h3>Users & Access Control</h3>
                    <div class="header-actions">
                        <button type="button" class="btn btn-secondary" id="add-group-btn">Add Group</button>
                        <button type="button" class="btn btn-primary" id="add-permission-btn">Add Permission</button>
                    </div>
                </div>
                
                <div class="users-groups-tabs">
                    <button type="button" class="sub-tab active" data-subtab="users">Users (${users.length})</button>
                    <button type="button" class="sub-tab" data-subtab="groups">Groups (${groups.length})</button>
                    <button type="button" class="sub-tab" data-subtab="permissions">Permissions (${permissions.length})</button>
                </div>
                
                <div class="users-content" id="users-content">
                    ${users.length === 0 
                        ? '<p class="empty-state">No users found. Users are managed by the system.</p>'
                        : users.map(user => this.renderUserCard(user)).join('')
                    }
                </div>
                
                <div class="groups-content" id="groups-content" style="display: none;">
                    ${groups.length === 0 
                        ? '<p class="empty-state">No groups found. Click "Add Group" to create one.</p>'
                        : groups.map(group => this.renderGroupCard(group)).join('')
                    }
                </div>
                
                <div class="permissions-content" id="permissions-content" style="display: none;">
                    ${permissions.length === 0 
                        ? '<p class="empty-state">No permissions configured. Click "Add Permission" to create one.</p>'
                        : permissions.map(perm => this.renderPermissionCard(perm, users, groups)).join('')
                    }
                </div>
            </div>
        `;
        
        const addGroupBtn = tabContent.querySelector('#add-group-btn');
        const addPermissionBtn = tabContent.querySelector('#add-permission-btn');
        
        if (addGroupBtn) {
            addGroupBtn.addEventListener('click', () => this.showAddGroupDialog());
        }
        if (addPermissionBtn) {
            addPermissionBtn.addEventListener('click', () => this.showAddPermissionDialog(users, groups));
        }
        
        // Sub-tabs
        const subTabs = tabContent.querySelectorAll('.sub-tab');
        subTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const subtabName = e.currentTarget.getAttribute('data-subtab');
                subTabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                tabContent.querySelector('#users-content').style.display = subtabName === 'users' ? 'block' : 'none';
                tabContent.querySelector('#groups-content').style.display = subtabName === 'groups' ? 'block' : 'none';
                tabContent.querySelector('#permissions-content').style.display = subtabName === 'permissions' ? 'block' : 'none';
            });
        });
        
        // Group actions
        groups.forEach(group => {
            const card = tabContent.querySelector(`[data-group-id="${group.id}"]`);
            if (card) {
                const deleteBtn = card.querySelector('.delete-group-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => this.deleteGroup(group.id));
                }
            }
        });
        
        // Permission actions
        permissions.forEach(perm => {
            const card = tabContent.querySelector(`[data-permission-id="${perm.id}"]`);
            if (card) {
                const deleteBtn = card.querySelector('.delete-permission-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => this.deletePermission(perm.id));
                }
            }
        });
    }
    
    renderUserCard(user) {
        const statusText = user.enabled ? 'Enabled' : 'Disabled';
        const statusClass = user.enabled ? 'status-active' : 'status-inactive';
        const createdDate = new Date(user.createdAt).toLocaleDateString();
        const roleBadge = `<span class="role-badge role-${user.role}">${this.escapeHtml(user.role)}</span>`;
        
        return `
            <div class="user-card" data-user-id="${user.id}">
                <div class="card-header">
                    <div>
                        <h4>${this.escapeHtml(user.username)}</h4>
                        <span class="user-email">${this.escapeHtml(user.email)}</span>
                    </div>
                    <div class="header-badges">
                        ${roleBadge}
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-meta">
                        <span class="meta-item"><strong>Groups:</strong> ${user.groups && Array.isArray(user.groups) ? user.groups.length : 0}</span>
                        <span class="meta-item"><strong>Created:</strong> ${createdDate}</span>
                        ${user.lastLogin ? `<span class="meta-item"><strong>Last Login:</strong> ${new Date(user.lastLogin).toLocaleDateString()}</span>` : ''}
                    </div>
                </div>
                <div class="card-actions">
                    <span class="read-only-badge">Read Only</span>
                </div>
            </div>
        `;
    }
    
    renderGroupCard(group) {
        const createdDate = new Date(group.createdAt).toLocaleDateString();
        const userCount = group.userIds && Array.isArray(group.userIds) ? group.userIds.length : 0;
        
        return `
            <div class="group-card" data-group-id="${group.id}">
                <div class="card-header">
                    <div>
                        <h4>${this.escapeHtml(group.name)}</h4>
                        ${group.description ? `<span class="group-description">${this.escapeHtml(group.description)}</span>` : ''}
                    </div>
                    <span class="member-count">${userCount} member${userCount !== 1 ? 's' : ''}</span>
                </div>
                <div class="card-body">
                    <div class="card-meta">
                        <span class="meta-item"><strong>Created:</strong> ${createdDate}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button type="button" class="btn btn-sm btn-danger delete-group-btn">Delete</button>
                </div>
            </div>
        `;
    }
    
    async showAddGroupDialog() {
        const name = await Modal.prompt('Group Name:', '');
        if (!name || !name.trim()) return;
        
        const description = await Modal.prompt('Description (optional):', '');
        
        try {
            userGroupsStore.create(name.trim(), description || '');
            await Modal.alert('Group created successfully!');
            this.renderUsersAccessTab();
        } catch (error) {
            await Modal.alert(`Error creating group: ${error.message}`);
        }
    }
    
    async deleteGroup(id) {
        const confirmed = await Modal.confirm('Are you sure you want to delete this group?');
        if (!confirmed) return;
        
        try {
            userGroupsStore.delete(id);
            await Modal.alert('Group deleted successfully!');
            this.renderUsersAccessTab();
        } catch (error) {
            await Modal.alert(`Error deleting group: ${error.message}`);
        }
    }
    
    renderPermissionCard(permission, users, groups) {
        const subject = permission.subjectType === 'user'
            ? users.find(u => u.id === permission.subjectId)
            : groups.find(g => g.id === permission.subjectId);
        const subjectName = subject 
            ? (permission.subjectType === 'user' ? subject.username : subject.name)
            : 'Unknown';
        const actionsList = permission.actions.join(', ');
        const enabledText = permission.enabled ? 'Enabled' : 'Disabled';
        const enabledClass = permission.enabled ? 'status-active' : 'status-inactive';
        
        return `
            <div class="permission-card" data-permission-id="${permission.id}">
                <div class="card-header">
                    <div>
                        <h4>${this.escapeHtml(permission.resourceType.charAt(0).toUpperCase() + permission.resourceType.slice(1))} Access</h4>
                        <span class="permission-resource">${this.escapeHtml(permission.resourceId)}</span>
                    </div>
                    <span class="status-badge ${enabledClass}">${enabledText}</span>
                </div>
                <div class="card-body">
                    <div class="card-meta">
                        <span class="meta-item"><strong>Subject:</strong> ${this.escapeHtml(subjectName)} (${permission.subjectType})</span>
                        <span class="meta-item"><strong>Resource:</strong> ${this.escapeHtml(permission.resourceType)} - ${this.escapeHtml(permission.resourceId)}</span>
                        <span class="meta-item"><strong>Actions:</strong> ${this.escapeHtml(actionsList)}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button type="button" class="btn btn-sm btn-danger delete-permission-btn">Remove</button>
                </div>
            </div>
        `;
    }
    
    async showAddPermissionDialog(users, groups) {
        // Simplified - in production would show proper forms
        const subjectType = await Modal.prompt('Subject Type (user/group):', 'user');
        if (!subjectType || !['user', 'group'].includes(subjectType.toLowerCase())) {
            await Modal.alert('Invalid subject type. Must be "user" or "group".');
            return;
        }
        
        const resourceType = await Modal.prompt('Resource Type (platform/function/data):', 'platform');
        if (!resourceType || !['platform', 'function', 'data'].includes(resourceType.toLowerCase())) {
            await Modal.alert('Invalid resource type. Must be "platform", "function", or "data".');
            return;
        }
        
        const resourceId = await Modal.prompt('Resource ID:', '');
        if (!resourceId || !resourceId.trim()) return;
        
        // Find first available subject (simplified)
        const subject = subjectType === 'user' ? users[0] : groups[0];
        if (!subject) {
            await Modal.alert(`No ${subjectType}s available. Please create one first.`);
            return;
        }
        
        try {
            accessPermissionsStore.create(
                subjectType.toLowerCase(),
                subject.id,
                resourceType.toLowerCase(),
                resourceId.trim(),
                ['read', 'write']
            );
            await Modal.alert('Permission created successfully!');
            this.renderAccessTab();
        } catch (error) {
            await Modal.alert(`Error creating permission: ${error.message}`);
        }
    }
    
    async deletePermission(id) {
        const confirmed = await Modal.confirm('Are you sure you want to remove this permission?');
        if (!confirmed) return;
        
        try {
            accessPermissionsStore.delete(id);
            await Modal.alert('Permission removed successfully!');
            this.renderUsersAccessTab();
        } catch (error) {
            await Modal.alert(`Error removing permission: ${error.message}`);
        }
    }
    
    // ===== HEALTH TAB =====
    renderHealthTab() {
        const tabContent = this.container.querySelector('#health-tab');
        const errorSummary = healthMetricsStore.getErrorSummary(60);
        const perfSummary = healthMetricsStore.getPerformanceSummary(60);
        const recentMetrics = healthMetricsStore.getRecent(60);
        
        tabContent.innerHTML = `
            <div class="admin-section">
                <div class="section-header">
                    <h3>Platform Health & Performance</h3>
                    <button type="button" class="btn btn-secondary" id="refresh-health-btn">Refresh</button>
                </div>
                
                <div class="health-metrics-grid">
                    <div class="metric-card">
                        <div class="metric-header">
                            <h4>Errors (Last 60 min)</h4>
                        </div>
                        <div class="metric-value">${errorSummary.total}</div>
                        <div class="metric-details">
                            ${Object.keys(errorSummary.bySeverity).length > 0 
                                ? Object.entries(errorSummary.bySeverity).map(([severity, count]) => 
                                    `<span class="severity-item severity-${severity}">${severity}: ${count}</span>`
                                ).join('')
                                : '<span>No errors</span>'
                            }
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <div class="metric-header">
                            <h4>Performance (Last 60 min)</h4>
                        </div>
                        <div class="metric-value">${perfSummary.total} operations</div>
                        <div class="metric-details">
                            ${Object.keys(perfSummary.byOperation).length > 0
                                ? Object.entries(perfSummary.byOperation).slice(0, 3).map(([op, stats]) => 
                                    `<div class="perf-item">
                                        <strong>${this.escapeHtml(op)}:</strong> 
                                        Avg: ${Math.round(stats.avg)}ms, 
                                        Min: ${Math.round(stats.min)}ms, 
                                        Max: ${Math.round(stats.max)}ms
                                    </div>`
                                ).join('')
                                : '<span>No performance data</span>'
                            }
                        </div>
                    </div>
                </div>
                
                <div class="recent-events">
                    <h4>Recent Events (Last 60 minutes)</h4>
                    <div class="events-list">
                        ${recentMetrics.length === 0
                            ? '<p class="empty-state">No recent events</p>'
                            : recentMetrics.slice(0, 20).map(metric => this.renderEventItem(metric)).join('')
                        }
                    </div>
                </div>
            </div>
        `;
        
        const refreshBtn = tabContent.querySelector('#refresh-health-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.renderHealthTab());
        }
    }
    
    renderEventItem(metric) {
        const timestamp = new Date(metric.timestamp).toLocaleString();
        const typeClass = `event-type-${metric.type}`;
        
        return `
            <div class="event-item ${typeClass}">
                <div class="event-time">${timestamp}</div>
                <div class="event-type">${this.escapeHtml(metric.type)}</div>
                <div class="event-details">
                    ${metric.message ? `<div class="event-message">${this.escapeHtml(metric.message)}</div>` : ''}
                    ${metric.operation ? `<div class="event-operation">${this.escapeHtml(metric.operation)}</div>` : ''}
                    ${metric.duration ? `<div class="event-duration">${Math.round(metric.duration)}ms</div>` : ''}
                </div>
            </div>
        `;
    }
    
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
}


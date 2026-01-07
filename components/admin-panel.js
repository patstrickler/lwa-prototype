// Admin Panel Component
// Allows admins to manage platform components, database connections, users/groups, access control, and view health metrics

import { platformComponentsStore } from '../data/platform-components.js';
import { databaseConnectionsStore } from '../data/database-connections.js';
import { usersStore } from '../data/users.js';
import { userGroupsStore } from '../data/user-groups.js';
import { accessPermissionsStore } from '../data/access-permissions.js';
import { healthMetricsStore } from '../data/health-metrics.js';
import { Modal } from '../utils/modal.js';

export class AdminPanel {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.currentTab = 'components';
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
                    <button type="button" class="admin-tab active" data-tab="components">
                        <span class="tab-icon">📦</span>
                        <span>Components</span>
                    </button>
                    <button type="button" class="admin-tab" data-tab="database">
                        <span class="tab-icon">🗄️</span>
                        <span>Database</span>
                    </button>
                    <button type="button" class="admin-tab" data-tab="users">
                        <span class="tab-icon">👥</span>
                        <span>Users & Groups</span>
                    </button>
                    <button type="button" class="admin-tab" data-tab="access">
                        <span class="tab-icon">🔐</span>
                        <span>Access Control</span>
                    </button>
                    <button type="button" class="admin-tab" data-tab="health">
                        <span class="tab-icon">📊</span>
                        <span>Health & Performance</span>
                    </button>
                </div>
                
                <div class="admin-content">
                    <div class="tab-content active" id="components-tab"></div>
                    <div class="tab-content" id="database-tab"></div>
                    <div class="tab-content" id="users-tab"></div>
                    <div class="tab-content" id="access-tab"></div>
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
            case 'components':
                this.renderComponentsTab();
                break;
            case 'database':
                this.renderDatabaseTab();
                break;
            case 'users':
                this.renderUsersTab();
                break;
            case 'access':
                this.renderAccessTab();
                break;
            case 'health':
                this.renderHealthTab();
                break;
        }
    }
    
    // ===== COMPONENTS TAB =====
    renderComponentsTab() {
        const tabContent = this.container.querySelector('#components-tab');
        const components = platformComponentsStore.getAll();
        
        tabContent.innerHTML = `
            <div class="admin-section">
                <div class="section-header">
                    <h3>Platform Components</h3>
                    <button type="button" class="btn btn-primary" id="install-component-btn">Install Component</button>
                </div>
                
                <div class="components-list" id="components-list">
                    ${components.length === 0 
                        ? '<p class="empty-state">No components installed. Click "Install Component" to add one.</p>'
                        : components.map(comp => this.renderComponentCard(comp)).join('')
                    }
                </div>
            </div>
        `;
        
        const installBtn = tabContent.querySelector('#install-component-btn');
        if (installBtn) {
            installBtn.addEventListener('click', () => this.showInstallComponentDialog());
        }
        
        // Attach event listeners for component actions
        components.forEach(comp => {
            const card = tabContent.querySelector(`[data-component-id="${comp.id}"]`);
            if (card) {
                const toggleBtn = card.querySelector('.toggle-component-btn');
                const deleteBtn = card.querySelector('.delete-component-btn');
                
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', () => this.toggleComponent(comp.id));
                }
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => this.deleteComponent(comp.id));
                }
            }
        });
    }
    
    renderComponentCard(component) {
        const statusClass = component.status === 'active' ? 'status-active' : 'status-inactive';
        const statusText = component.enabled ? 'Enabled' : 'Disabled';
        const installedDate = new Date(component.installedAt).toLocaleDateString();
        
        return `
            <div class="component-card" data-component-id="${component.id}">
                <div class="card-header">
                    <div>
                        <h4>${this.escapeHtml(component.name)}</h4>
                        <span class="component-version">v${this.escapeHtml(component.version)}</span>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="card-body">
                    <div class="card-meta">
                        <span class="meta-item"><strong>Type:</strong> ${this.escapeHtml(component.type)}</span>
                        <span class="meta-item"><strong>Installed:</strong> ${installedDate}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button type="button" class="btn btn-sm ${component.enabled ? 'btn-secondary' : 'btn-primary'} toggle-component-btn">
                        ${component.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button type="button" class="btn btn-sm btn-danger delete-component-btn">Uninstall</button>
                </div>
            </div>
        `;
    }
    
    async showInstallComponentDialog() {
        const name = await Modal.prompt('Component Name:', '');
        if (!name || !name.trim()) return;
        
        const version = await Modal.prompt('Component Version:', '1.0.0');
        if (!version || !version.trim()) return;
        
        const typeOptions = ['module', 'plugin', 'integration', 'extension'];
        const typeInput = await Modal.prompt('Component Type (module/plugin/integration/extension):', 'module');
        if (!typeInput || !typeInput.trim()) return;
        
        const type = typeOptions.includes(typeInput.toLowerCase()) ? typeInput.toLowerCase() : 'module';
        
        try {
            platformComponentsStore.install(name.trim(), version.trim(), type);
            await Modal.alert('Component installed successfully!');
            this.renderComponentsTab();
        } catch (error) {
            await Modal.alert(`Error installing component: ${error.message}`);
        }
    }
    
    async toggleComponent(id) {
        const component = platformComponentsStore.get(id);
        if (!component) return;
        
        try {
            platformComponentsStore.setEnabled(id, !component.enabled);
            this.renderComponentsTab();
        } catch (error) {
            await Modal.alert(`Error toggling component: ${error.message}`);
        }
    }
    
    async deleteComponent(id) {
        const confirmed = await Modal.confirm('Are you sure you want to uninstall this component?');
        if (!confirmed) return;
        
        try {
            platformComponentsStore.delete(id);
            await Modal.alert('Component uninstalled successfully!');
            this.renderComponentsTab();
        } catch (error) {
            await Modal.alert(`Error uninstalling component: ${error.message}`);
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
    
    async showAddConnectionDialog() {
        // In a real application, this would be a multi-step form
        const name = await Modal.prompt('Connection Name:', '');
        if (!name || !name.trim()) return;
        
        const host = await Modal.prompt('Database Host:', 'localhost');
        if (!host || !host.trim()) return;
        
        const port = await Modal.prompt('Database Port:', '5432');
        if (!port) return;
        
        const database = await Modal.prompt('Database Name:', '');
        if (!database || !database.trim()) return;
        
        const username = await Modal.prompt('Username:', '');
        const password = await Modal.prompt('Password:', '');
        const type = await Modal.prompt('Database Type (postgresql/mysql/mssql):', 'postgresql');
        
        try {
            databaseConnectionsStore.create(
                name.trim(),
                host.trim(),
                parseInt(port, 10),
                database.trim(),
                username || '',
                password || '',
                type || 'postgresql'
            );
            await Modal.alert('Database connection created successfully!');
            this.renderDatabaseTab();
        } catch (error) {
            await Modal.alert(`Error creating connection: ${error.message}`);
        }
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
    
    async editConnection(id) {
        // Simplified edit - in production would show a proper form
        await Modal.alert('Edit functionality would open a detailed form in production.');
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
    
    // ===== USERS TAB =====
    renderUsersTab() {
        const tabContent = this.container.querySelector('#users-tab');
        const users = usersStore.getAll();
        const groups = userGroupsStore.getAll();
        
        tabContent.innerHTML = `
            <div class="admin-section">
                <div class="section-header">
                    <h3>Users & Groups</h3>
                    <div class="header-actions">
                        <button type="button" class="btn btn-primary" id="add-user-btn">Add User</button>
                        <button type="button" class="btn btn-secondary" id="add-group-btn">Add Group</button>
                    </div>
                </div>
                
                <div class="users-groups-tabs">
                    <button type="button" class="sub-tab active" data-subtab="users">Users (${users.length})</button>
                    <button type="button" class="sub-tab" data-subtab="groups">Groups (${groups.length})</button>
                </div>
                
                <div class="users-content" id="users-content">
                    ${users.length === 0 
                        ? '<p class="empty-state">No users found. Click "Add User" to create one.</p>'
                        : users.map(user => this.renderUserCard(user)).join('')
                    }
                </div>
                
                <div class="groups-content" id="groups-content" style="display: none;">
                    ${groups.length === 0 
                        ? '<p class="empty-state">No groups found. Click "Add Group" to create one.</p>'
                        : groups.map(group => this.renderGroupCard(group)).join('')
                    }
                </div>
            </div>
        `;
        
        const addUserBtn = tabContent.querySelector('#add-user-btn');
        const addGroupBtn = tabContent.querySelector('#add-group-btn');
        
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showAddUserDialog());
        }
        if (addGroupBtn) {
            addGroupBtn.addEventListener('click', () => this.showAddGroupDialog());
        }
        
        // Sub-tabs
        const subTabs = tabContent.querySelectorAll('.sub-tab');
        subTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const subtabName = e.currentTarget.getAttribute('data-subtab');
                subTabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                if (subtabName === 'users') {
                    tabContent.querySelector('#users-content').style.display = 'block';
                    tabContent.querySelector('#groups-content').style.display = 'none';
                } else {
                    tabContent.querySelector('#users-content').style.display = 'none';
                    tabContent.querySelector('#groups-content').style.display = 'block';
                }
            });
        });
        
        // User actions
        users.forEach(user => {
            const card = tabContent.querySelector(`[data-user-id="${user.id}"]`);
            if (card) {
                const toggleBtn = card.querySelector('.toggle-user-btn');
                const deleteBtn = card.querySelector('.delete-user-btn');
                
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', () => this.toggleUser(user.id));
                }
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => this.deleteUser(user.id));
                }
            }
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
                    <button type="button" class="btn btn-sm ${user.enabled ? 'btn-secondary' : 'btn-primary'} toggle-user-btn">
                        ${user.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button type="button" class="btn btn-sm btn-danger delete-user-btn">Delete</button>
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
    
    async showAddUserDialog() {
        const username = await Modal.prompt('Username:', '');
        if (!username || !username.trim()) return;
        
        const email = await Modal.prompt('Email:', '');
        if (!email || !email.trim()) return;
        
        const password = await Modal.prompt('Password:', '');
        const role = await Modal.prompt('Role (admin/analyst/viewer):', 'viewer');
        
        try {
            usersStore.create(
                username.trim(),
                email.trim(),
                password || '',
                [],
                role || 'viewer'
            );
            await Modal.alert('User created successfully!');
            this.renderUsersTab();
        } catch (error) {
            await Modal.alert(`Error creating user: ${error.message}`);
        }
    }
    
    async showAddGroupDialog() {
        const name = await Modal.prompt('Group Name:', '');
        if (!name || !name.trim()) return;
        
        const description = await Modal.prompt('Description (optional):', '');
        
        try {
            userGroupsStore.create(name.trim(), description || '');
            await Modal.alert('Group created successfully!');
            this.renderUsersTab();
        } catch (error) {
            await Modal.alert(`Error creating group: ${error.message}`);
        }
    }
    
    async toggleUser(id) {
        const user = usersStore.get(id);
        if (!user) return;
        
        try {
            usersStore.setEnabled(id, !user.enabled);
            this.renderUsersTab();
        } catch (error) {
            await Modal.alert(`Error toggling user: ${error.message}`);
        }
    }
    
    async deleteUser(id) {
        const confirmed = await Modal.confirm('Are you sure you want to delete this user?');
        if (!confirmed) return;
        
        try {
            usersStore.delete(id);
            await Modal.alert('User deleted successfully!');
            this.renderUsersTab();
        } catch (error) {
            await Modal.alert(`Error deleting user: ${error.message}`);
        }
    }
    
    async deleteGroup(id) {
        const confirmed = await Modal.confirm('Are you sure you want to delete this group?');
        if (!confirmed) return;
        
        try {
            userGroupsStore.delete(id);
            await Modal.alert('Group deleted successfully!');
            this.renderUsersTab();
        } catch (error) {
            await Modal.alert(`Error deleting group: ${error.message}`);
        }
    }
    
    // ===== ACCESS CONTROL TAB =====
    renderAccessTab() {
        const tabContent = this.container.querySelector('#access-tab');
        const permissions = accessPermissionsStore.getAll();
        const users = usersStore.getAll();
        const groups = userGroupsStore.getAll();
        
        tabContent.innerHTML = `
            <div class="admin-section">
                <div class="section-header">
                    <h3>Access Control</h3>
                    <button type="button" class="btn btn-primary" id="add-permission-btn">Add Permission</button>
                </div>
                
                <div class="permissions-list" id="permissions-list">
                    ${permissions.length === 0 
                        ? '<p class="empty-state">No permissions configured. Click "Add Permission" to create one.</p>'
                        : permissions.map(perm => this.renderPermissionCard(perm, users, groups)).join('')
                    }
                </div>
            </div>
        `;
        
        const addBtn = tabContent.querySelector('#add-permission-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddPermissionDialog(users, groups));
        }
        
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
            this.renderAccessTab();
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


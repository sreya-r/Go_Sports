// ======================
// Dashboard Controller
// ======================

// State object to manage UI state
const appState = {
    isLoading: false,
    currentView: 'activity', // 'activity' or 'users'
    modals: {
        addItem: false,
        checkout: false
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the dashboard
    initDashboard();
    
    // Set up event listeners
    setupEventListeners();
});

// ======================
// Core Functions
// ======================

async function initDashboard() {
    if (appState.isLoading) return;
    
    try {
        setLoading(true);
        // Sequential loading to avoid UI conflicts
        await fetchDashboardData();
        
        // Only load users if needed
        if (appState.currentView === 'users') {
            await fetchUsersData();
        }
    } catch (error) {
        showError(error, 'Failed to initialize dashboard');
    } finally {
        setLoading(false);
    }
}

function setupEventListeners() {
    // Use event delegation for dynamic elements
    document.addEventListener('click', function(e) {
        // Table view toggles
        if (e.target.matches('#showUsersBtn')) {
            showView('users');
        } else if (e.target.matches('#showActivityBtn')) {
            showView('activity');
        }
        
        // Action buttons
        else if (e.target.matches('#addItemBtn')) {
            showAddItemModal();
        } else if (e.target.matches('#checkOutBtn')) {
            showCheckoutModal();
        } else if (e.target.matches('#refreshBtn')) {
            initDashboard();
        }
        
        // Modal close buttons
        else if (e.target.matches('.modal-close, .modal-overlay')) {
            closeAllModals();
        }
        
        // Alert resolve buttons
        else if (e.target.matches('.btn-resolve')) {
            resolveAlert(e.target.dataset.id);
        }
    });

    // Form submissions
    document.getElementById('addItemForm')?.addEventListener('submit', handleAddItem);
    document.getElementById('checkoutForm')?.addEventListener('submit', handleCheckout);
}

// ======================
// Data Fetching (Improved Error Handling)
// ======================

async function fetchDashboardData() {
    try {
        const response = await fetch('/static/api/fetch_data.php');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data?.success) {
            throw new Error(data?.error || 'Invalid server response');
        }
        
        updateDashboardUI(data);
        return data;
    } catch (error) {
        console.error('Dashboard data fetch failed:', error);
        throw error;
    }
}

async function fetchUsersData() {
    try {
        const response = await fetch('/static/api/fetch_users.php');
        if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
        
        const data = await response.json();
        if (!data?.success) throw new Error(data?.error || 'Invalid users data');
        
        renderUsersTable(data.users || []);
        return data;
    } catch (error) {
        console.error('Users data fetch failed:', error);
        showError(error, 'Failed to load users');
        throw error;
    }
}

// ======================
// UI Updates (More Robust)
// ======================

function updateDashboardUI(data) {
    if (!data) return;
    
    // Safely update stats cards
    if (data.stats) {
        updateStats(data.stats);
    }
    
    // Update activity log if exists
    if (data.activity) {
        renderActivityLog(data.activity);
    }
    
    // Update alerts if exists
    if (data.alerts) {
        renderAlerts(data.alerts);
    }
}

function updateStats(stats) {
    const safeStats = {
        totalItems: 0,
        checkedOut: 0,
        lowStock: 0,
        overdue: 0,
        ...stats
    };
    
    setTextContent('#totalItems', safeStats.totalItems);
    setTextContent('#checkedOut', safeStats.checkedOut);
    setTextContent('#lowStock', safeStats.lowStock);
    setTextContent('#overdue', safeStats.overdue);
}

function renderActivityLog(activities = []) {
    const container = document.getElementById('activityLog');
    if (!container) return;
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <i class="fas fa-${activity.status === 'checked_out' ? 'arrow-up' : 'arrow-down'}"></i>
            <span>
                <strong>${escapeHtml(activity.user_name || 'Unknown')}</strong> 
                ${escapeHtml(activity.action || 'performed action')} 
                ${escapeHtml(activity.quantity || 0)} 
                ${escapeHtml(activity.equipment_name || 'item')}
            </span>
            <small>${formatDateTime(activity.checkout_date)}</small>
        </div>
    `).join('');
}

function renderUsersTable(users = []) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${escapeHtml(user.user_id || '')}</td>
            <td>${escapeHtml(user.username || '')}</td>
            <td>${escapeHtml(user.full_name || 'N/A')}</td>
            <td>${escapeHtml(user.role || '')}</td>
        </tr>
    `).join('');
}

function renderAlerts(alerts = []) {
    const container = document.getElementById('alertsList');
    if (!container) return;
    
    container.innerHTML = alerts.map(alert => `
        <div class="alert-item">
            <i class="fas fa-exclamation-triangle"></i>
            <span>
                Low stock: <strong>${escapeHtml(alert.name || 'Unknown')}</strong> 
                (${alert.quantity || 0}/${alert.min_stock_level || 0})
            </span>
            <button class="btn-resolve" data-id="${alert.equipment_id || ''}">
                Resolve
            </button>
        </div>
    `).join('');
}

// ======================
// View Management
// ======================

function showView(viewName) {
    if (!['activity', 'users'].includes(viewName)) return;
    
    appState.currentView = viewName;
    
    // Toggle table visibility
    document.getElementById('activityTable').style.display = 
        viewName === 'activity' ? 'table' : 'none';
    document.getElementById('usersTable').style.display = 
        viewName === 'users' ? 'table' : 'none';
    
    // Load data if needed
    if (viewName === 'users') {
        fetchUsersData().catch(e => console.error(e));
    }
}

// ======================
// Modal Functions (Improved)
// ======================

function showAddItemModal() {
    if (appState.modals.addItem) return;
    
    const modal = document.getElementById('addItemModal');
    if (!modal) return;
    
    appState.modals.addItem = true;
    modal.style.display = 'block';
    
    // Load categories
    fetchCategories()
        .then(categories => {
            const select = document.getElementById('itemCategory');
            if (select) {
                select.innerHTML = categories.map(cat => 
                    `<option value="${escapeHtml(cat.category_id)}">
                        ${escapeHtml(cat.name)}
                    </option>`
                ).join('');
            }
        })
        .catch(e => showError(e, 'Failed to load categories'));
}

async function handleAddItem(e) {
    e.preventDefault();
    if (!e.target) return;
    
    try {
        setLoading(true);
        const formData = new FormData(e.target);
        
        // Basic client-side validation
        if (!formData.get('itemName')?.trim()) {
            throw new Error('Item name is required');
        }
        
        const response = await fetch('/static/api/add_item.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        if (!result?.success) {
            throw new Error(result?.error || 'Failed to add item');
        }
        
        showNotification('Item added successfully!');
        closeAllModals();
        await initDashboard(); // Refresh data
    } catch (error) {
        showError(error, 'Failed to add item');
    } finally {
        setLoading(false);
    }
}

function showCheckoutModal() {
    if (appState.modals.checkout) return;
    
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;
    
    appState.modals.checkout = true;
    modal.style.display = 'block';
    
    // Load available equipment with loading state
    setLoading(true, '#checkoutModal .modal-content');
    fetchAvailableEquipment()
        .then(equipment => {
            const select = document.getElementById('checkoutEquipment');
            if (select) {
                select.innerHTML = equipment.map(item => 
                    `<option value="${escapeHtml(item.equipment_id)}">
                        ${escapeHtml(item.name)} (Available: ${item.quantity - (item.checkedOut || 0)})
                    </option>`
                ).join('');
            }
        })
        .catch(e => showError(e, 'Failed to load equipment'))
        .finally(() => setLoading(false, '#checkoutModal .modal-content'));
}

async function handleCheckout(e) {
    e.preventDefault();
    if (!e.target) return;
    
    try {
        setLoading(true);
        const formData = new FormData(e.target);
        
        // Basic validation
        if (!formData.get('userId') || !formData.get('equipmentId')) {
            throw new Error('Please fill all required fields');
        }
        
        const response = await fetch('/static/api/checkout_item.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        if (!result?.success) {
            throw new Error(result?.error || 'Checkout failed');
        }
        
        showNotification('Equipment checked out successfully!');
        closeAllModals();
        await initDashboard(); // Refresh data
    } catch (error) {
        showError(error, 'Checkout failed');
    } finally {
        setLoading(false);
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    appState.modals.addItem = false;
    appState.modals.checkout = false;
}

// ======================
// Helper Functions (Improved)
// ======================

async function fetchCategories() {
    const response = await fetch('/static/api/get_categories.php');
    const data = await response.json();
    return data.categories || [];
}

async function fetchAvailableEquipment() {
    const response = await fetch('/static/api/get_available_equipment.php');
    const data = await response.json();
    return data.equipment || [];
}

async function resolveAlert(equipmentId) {
    if (!equipmentId) return;
    
    try {
        setLoading(true);
        const response = await fetch('/static/api/resolve_alert.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ equipment_id: equipmentId })
        });
        
        const result = await response.json();
        if (!result?.success) throw new Error(result?.error || 'Failed to resolve alert');
        
        showNotification('Alert resolved successfully!');
        await initDashboard(); // Refresh data
    } catch (error) {
        showError(error, 'Failed to resolve alert');
    } finally {
        setLoading(false);
    }
}

// ======================
// UI Utility Functions
// ======================

function setLoading(isLoading, context = '') {
    appState.isLoading = isLoading;
    const spinner = context ? 
        document.querySelector(`${context} .loading-spinner`) :
        document.getElementById('loadingSpinner');
    
    if (spinner) {
        spinner.style.display = isLoading ? 'block' : 'none';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showError(error, context = '') {
    console.error(context, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const errorElement = document.getElementById('errorMessage') || createErrorElement();
    errorElement.innerHTML = context ? `<strong>${escapeHtml(context)}:</strong> ${escapeHtml(errorMessage)}` : escapeHtml(errorMessage);
    errorElement.style.display = 'block';
    
    setTimeout(() => {
        errorElement.style.opacity = '0';
        setTimeout(() => {
            errorElement.style.display = 'none';
            errorElement.style.opacity = '1';
        }, 500);
    }, 8000);
}

function createErrorElement() {
    const el = document.createElement('div');
    el.id = 'errorMessage';
    el.className = 'error-message';
    document.body.appendChild(el);
    return el;
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('en-US', options);
    } catch {
        return dateString; // Return raw string if date parsing fails
    }
}

function setTextContent(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
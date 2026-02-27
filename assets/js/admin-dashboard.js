/**
 * Admin Dashboard - Dynamic Data Integration
 * Fetches real user and shipment data from backend API
 */

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!window.API.auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    const currentUser = window.API.userManager.getUser();

    // Role-based access control
    if (currentUser.role !== 'admin') {
        window.API.ui.showError('Access denied. Admin access only.');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // Initialize dashboard
    await initDashboard();
});

// Dashboard initialization
async function initDashboard() {
    const currentUser = window.API.userManager.getUser();

    // Display user info
    displayUserInfo(currentUser);

    // Setup event listeners
    setupEventListeners();

    // Load dashboard data
    await loadDashboardData();
}

// Display user information
function displayUserInfo(user) {
    const userName = user.name || user.fullname || 'Admin';
    const userEmail = user.email || '';
    const initials = userName.charAt(0).toUpperCase();

    // Update user display elements
    const userNameElements = document.querySelectorAll('#user-name, #welcome-name');
    userNameElements.forEach(el => {
        if (el) el.textContent = userName.split(' ')[0];
    });

    const userAvatarElement = document.getElementById('user-avatar');
    if (userAvatarElement) userAvatarElement.textContent = initials;
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                window.API.auth.logout();
            }
        });
    }

    // Sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });

        // Close sidebar when clicking outside (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 1024 &&
                !sidebar.contains(e.target) &&
                !sidebarToggle.contains(e.target) &&
                !sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.add('-translate-x-full');
            }
        });
    }

    // User role filter
    const roleFilter = document.getElementById('filter-role');
    if (roleFilter) {
        roleFilter.addEventListener('change', (e) => {
            filterUsers(e.target.value);
        });
    }
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        // Fetch all users and shipments in parallel
        const [usersResponse, shipmentsResponse] = await Promise.all([
            window.API.users.getAll().catch(err => ({ success: false, data: [] })),
            window.API.shipments.getAll().catch(err => ({ success: false, data: [] }))
        ]);

        const users = usersResponse.success ? (usersResponse.data || usersResponse.users || []) : [];
        const shipments = shipmentsResponse.success ? (shipmentsResponse.data || shipmentsResponse.shipments || []) : [];

        // Update statistics
        updateStatistics(users, shipments);

        // Render users list
        renderUsers(users);

        // Render recent activity
        renderRecentActivity(shipments.slice(0, 5));

        // Store data for filtering
        window.dashboardData = { users, shipments };

    } catch (error) {
        window.API.ui.handleError(error, 'Failed to load dashboard data');
    }
}

// Update statistics cards
function updateStatistics(users, shipments) {
    const shippers = users.filter(u => u.role === 'shipper').length;
    const drivers = users.filter(u => u.role === 'driver').length;
    const activeShipments = shipments.filter(s => s.status === 'in-transit').length;

    // Update stat elements
    const statUsers = document.getElementById('stat-users');
    const statShipments = document.getElementById('stat-shipments');
    const statTickets = document.getElementById('stat-tickets');

    if (statUsers) statUsers.textContent = users.length;
    if (statShipments) statShipments.textContent = activeShipments;
    if (statTickets) statTickets.textContent = Math.floor(users.length * 0.02); // Mock: 2% of users

    // Update user breakdown
    const userBreakdown = document.querySelector('.text-xs.text-secondary');
    if (userBreakdown && userBreakdown.innerHTML.includes('Shippers')) {
        userBreakdown.innerHTML = `
            <span>📦 ${shippers} Shippers</span>
            <span>🚛 ${drivers} Drivers</span>
        `;
    }
}

// Render users list
function renderUsers(users) {
    const container = document.getElementById('users-list');
    if (!container) return;

    container.innerHTML = '';

    if (users.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-4">No users found</p>';
        return;
    }

    users.slice(0, 10).forEach(user => {
        const roleColor = user.role === 'driver' ? 'bg-green-100 text-green-700' :
            user.role === 'shipper' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700';
        const statusColor = user.isActive ? 'bg-green-500' : 'bg-gray-400';
        const initial = (user.name || user.email).charAt(0).toUpperCase();

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 hover:bg-light rounded-lg transition-colors';
        item.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                    ${initial}
                </div>
                <div>
                    <p class="text-sm font-medium text-dark">${user.name || 'No name'}</p>
                    <p class="text-xs text-secondary">${user.email}</p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="px-2 py-1 ${roleColor} rounded-full text-xs font-medium capitalize">
                    ${user.role}
                </span>
                <div class="w-2 h-2 ${statusColor} rounded-full" title="${user.isActive ? 'Active' : 'Inactive'}"></div>
            </div>
        `;
        container.appendChild(item);
    });

    if (window.lucide) lucide.createIcons();
}

// Filter users by role
function filterUsers(role) {
    if (!window.dashboardData || !window.dashboardData.users) return;

    const filteredUsers = role === 'all'
        ? window.dashboardData.users
        : window.dashboardData.users.filter(u => u.role === role);

    renderUsers(filteredUsers);
}

// Render recent activity
function renderRecentActivity(recentShipments) {
    const container = document.getElementById('activity-log');
    if (!container) return;

    container.innerHTML = '';

    if (recentShipments.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-4">No recent activity</p>';
        return;
    }

    const statusIcons = {
        'pending': { icon: 'clock', color: 'text-yellow-600 bg-yellow-100' },
        'confirmed': { icon: 'check-circle', color: 'text-blue-600 bg-blue-100' },
        'in-transit': { icon: 'truck', color: 'text-purple-600 bg-purple-100' },
        'delivered': { icon: 'check-circle', color: 'text-green-600 bg-green-100' },
        'cancelled': { icon: 'x-circle', color: 'text-red-600 bg-red-100' }
    };

    recentShipments.forEach(shipment => {
        const statusInfo = statusIcons[shipment.status] || statusIcons['pending'];
        const timeAgo = getTimeAgo(new Date(shipment.createdAt || shipment.updatedAt));

        const item = document.createElement('div');
        item.className = 'flex items-start space-x-3 p-3 hover:bg-light rounded-lg transition-colors';
        item.innerHTML = `
            <div class="w-8 h-8 ${statusInfo.color} rounded-full flex items-center justify-center flex-shrink-0">
                <i data-lucide="${statusInfo.icon}" class="w-4 h-4"></i>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm text-dark font-medium">Shipment ${shipment.status}</p>
                <p class="text-sm text-secondary">${shipment.pickupLocation} → ${shipment.deliveryLocation}</p>
                <p class="text-xs text-secondary mt-1">${timeAgo} • ${shipment.trackingId || shipment._id.slice(-8)}</p>
            </div>
        `;
        container.appendChild(item);
    });

    if (window.lucide) lucide.createIcons();
}

// Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

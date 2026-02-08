/**
 * Shipper Dashboard - Dynamic Data Integration
 * Fetches real shipment data from backend API
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
    if (currentUser.role !== 'shipper') {
        window.API.ui.showError('Access denied. Shipper access only.');
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
    const userName = user.name || user.fullname || 'Shipper';
    const userEmail = user.email || '';
    const initials = userName.charAt(0).toUpperCase();

    // Update user display elements
    const userNameElements = document.querySelectorAll('#user-name, #welcome-name');
    userNameElements.forEach(el => {
        if (el) el.textContent = userName.split(' ')[0];
    });

    const userAvatarElement = document.getElementById('user-avatar');
    if (userAvatarElement) userAvatarElement.textContent = initials;

    const userEmailElement = document.querySelector('.text-xs.text-secondary');
    if (userEmailElement) userEmailElement.textContent = userEmail;
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

    // Create shipment form
    const createShipmentForm = document.getElementById('create-shipment-form');
    if (createShipmentForm) {
        createShipmentForm.addEventListener('submit', handleCreateShipment);
    }

    // Shipment status filter
    const statusFilter = document.getElementById('filter-status');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            filterShipments(e.target.value);
        });
    }
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        // Show loading state
        showLoading();

        // Fetch shipments
        const shipmentsResponse = await window.API.shipments.getAll();

        if (shipmentsResponse.success) {
            const shipments = shipmentsResponse.data || shipmentsResponse.shipments || [];

            // Update statistics
            updateStatistics(shipments);

            // Render shipments table
            renderShipments(shipments);

            // Store shipments for filtering
            window.dashboardData = { shipments };
        }

        hideLoading();

    } catch (error) {
        hideLoading();
        window.API.ui.handleError(error, 'Failed to load dashboard data');
    }
}

// Update statistics cards
function updateStatistics(shipments) {
    const stats = {
        total: shipments.length,
        pending: shipments.filter(s => s.status === 'pending').length,
        inTransit: shipments.filter(s => s.status === 'in-transit').length,
        delivered: shipments.filter(s => s.status === 'delivered').length
    };

    // Update stat elements
    const statTotal = document.getElementById('stat-total-shipments');
    const statPending = document.getElementById('stat-pending');
    const statInTransit = document.getElementById('stat-in-transit');
    const statDelivered = document.getElementById('stat-delivered');

    if (statTotal) statTotal.textContent = stats.total;
    if (statPending) statPending.textContent = stats.pending;
    if (statInTransit) statInTransit.textContent = stats.inTransit;
    if (statDelivered) statDelivered.textContent = stats.delivered;
}

// Render shipments table
function renderShipments(shipments) {
    const container = document.getElementById('shipments-list');
    if (!container) return;

    container.innerHTML = '';

    if (shipments.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i data-lucide="package" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
                <p class="text-gray-500 text-lg font-medium">No shipments yet</p>
                <p class="text-gray-400 text-sm mt-2">Create your first shipment to get started</p>
                <button onclick="showCreateShipmentModal()" class="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-accent transition-colors">
                    Create Shipment
                </button>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    // Create table
    const table = document.createElement('div');
    table.className = 'overflow-x-auto';
    table.innerHTML = `
        <table class="w-full">
            <thead class="bg-gray-50 border-b">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking ID</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody id="shipments-table-body" class="divide-y divide-gray-200">
            </tbody>
        </table>
    `;

    container.appendChild(table);

    const tbody = document.getElementById('shipments-table-body');

    shipments.forEach(shipment => {
        const row = createShipmentRow(shipment);
        tbody.appendChild(row);
    });

    if (window.lucide) lucide.createIcons();
}

// Create shipment table row
function createShipmentRow(shipment) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';

    const statusColors = {
        'pending': 'bg-yellow-100 text-yellow-700',
        'confirmed': 'bg-blue-100 text-blue-700',
        'in-transit': 'bg-purple-100 text-purple-700',
        'delivered': 'bg-green-100 text-green-700',
        'cancelled': 'bg-red-100 text-red-700'
    };

    const statusColor = statusColors[shipment.status] || 'bg-gray-100 text-gray-700';
    const date = new Date(shipment.createdAt || shipment.date).toLocaleDateString();

    row.innerHTML = `
        <td class="px-4 py-4">
            <div class="flex items-center">
                <i data-lucide="hash" class="w-4 h-4 text-gray-400 mr-2"></i>
                <span class="font-mono text-sm font-medium">${shipment.trackingId || shipment._id.slice(-8)}</span>
            </div>
        </td>
        <td class="px-4 py-4">
            <div class="text-sm">
                <div class="flex items-center text-gray-900 font-medium">
                    <i data-lucide="map-pin" class="w-3 h-3 text-green-600 mr-1"></i>
                    ${shipment.pickupLocation || 'N/A'}
                </div>
                <div class="flex items-center text-gray-500 mt-1">
                    <i data-lucide="flag" class="w-3 h-3 text-red-600 mr-1"></i>
                    ${shipment.deliveryLocation || 'N/A'}
                </div>
            </div>
        </td>
        <td class="px-4 py-4">
            <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor} capitalize">
                ${shipment.status}
            </span>
        </td>
        <td class="px-4 py-4 text-sm text-gray-900">
            ${shipment.weight || 'N/A'} kg
        </td>
        <td class="px-4 py-4 text-sm font-medium text-gray-900">
            ₹${shipment.price ? shipment.price.toLocaleString() : 'N/A'}
        </td>
        <td class="px-4 py-4 text-sm text-gray-500">
            ${date}
        </td>
        <td class="px-4 py-4 text-sm font-medium">
            <div class="flex items-center gap-2">
                <button onclick="viewShipmentDetails('${shipment._id}')" class="text-primary hover:text-accent" title="View Details">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
                <button onclick="trackShipment('${shipment.trackingId || shipment._id}')" class="text-green-600 hover:text-green-700" title="Track">
                    <i data-lucide="map" class="w-4 h-4"></i>
                </button>
            </div>
        </td>
    `;

    return row;
}

// Filter shipments by status
function filterShipments(status) {
    if (!window.dashboardData || !window.dashboardData.shipments) return;

    const filteredShipments = status === 'all'
        ? window.dashboardData.shipments
        : window.dashboardData.shipments.filter(s => s.status === status);

    renderShipments(filteredShipments);
}

// Handle create shipment form submission
async function handleCreateShipment(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const shipmentData = {
        pickupLocation: formData.get('pickupLocation'),
        deliveryLocation: formData.get('deliveryLocation'),
        weight: parseFloat(formData.get('weight')),
        vehicleType: formData.get('vehicleType'),
        cargoDescription: formData.get('cargoDescription'),
        price: parseFloat(formData.get('price'))
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    window.API.ui.showLoading(submitBtn, 'Creating...');

    try {
        const response = await window.API.shipments.create(shipmentData);

        if (response.success) {
            window.API.ui.showSuccess('Shipment created successfully!');
            form.reset();
            hideCreateShipmentModal();

            // Reload dashboard data
            await loadDashboardData();
        }
    } catch (error) {
        window.API.ui.handleError(error, 'Failed to create shipment');
    } finally {
        window.API.ui.hideLoading(submitBtn);
    }
}

// Show/hide loading state
function showLoading() {
    const loadingEl = document.getElementById('loading-overlay');
    if (loadingEl) loadingEl.classList.remove('hidden');
}

function hideLoading() {
    const loadingEl = document.getElementById('loading-overlay');
    if (loadingEl) loadingEl.classList.add('hidden');
}

// View shipment details
function viewShipmentDetails(shipmentId) {
    // Show details modal or navigate to details page
    alert(`View details for shipment: ${shipmentId}\n(Details page coming in Phase 2)`);
}

// Track shipment
function trackShipment(trackingId) {
    // Navigate to tracking page
    window.location.href = `tracking.html?id=${trackingId}`;
}

// Show/hide create shipment modal (if exists)
function showCreateShipmentModal() {
    const modal = document.getElementById('create-shipment-modal');
    if (modal) modal.classList.remove('hidden');
}

function hideCreateShipmentModal() {
    const modal = document.getElementById('create-shipment-modal');
    if (modal) modal.classList.add('hidden');
}

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
    displayUserInfo(currentUser);
    setupEventListeners();
    await loadDashboardData();
}

// Display user information
function displayUserInfo(user) {
    const userName = user.name || user.fullname || 'Shipper';
    const userEmail = user.email || '';
    const initials = userName.charAt(0).toUpperCase();

    const userNameEl = document.getElementById('user-name');
    const welcomeNameEl = document.getElementById('welcome-name');
    if (userNameEl) userNameEl.textContent = userName.split(' ')[0];
    if (welcomeNameEl) welcomeNameEl.textContent = userName.split(' ')[0];

    const userAvatarElement = document.getElementById('user-avatar');
    if (userAvatarElement) userAvatarElement.textContent = initials;

    const userEmailElements = document.querySelectorAll('.user-email');
    userEmailElements.forEach(el => { if (el) el.textContent = userEmail; });
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
        statusFilter.addEventListener('change', (e) => filterShipments(e.target.value));
    }

    // Open modal button
    const openModalBtn = document.getElementById('open-create-shipment');
    if (openModalBtn) {
        openModalBtn.addEventListener('click', showCreateShipmentModal);
    }

    // Close modal button
    const closeModalBtn = document.getElementById('close-create-shipment');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideCreateShipmentModal);
    }

    // Close modal on backdrop click
    const modal = document.getElementById('create-shipment-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideCreateShipmentModal();
        });
    }
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        showLoading();
        const shipmentsResponse = await window.API.shipments.getAll();

        if (shipmentsResponse.success) {
            const shipments = shipmentsResponse.data || [];
            updateStatistics(shipments);
            renderShipments(shipments);
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
        inTransit: shipments.filter(s => s.status === 'in-transit' || s.status === 'picked-up').length,
        delivered: shipments.filter(s => s.status === 'delivered').length
    };

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
        'assigned': 'bg-blue-100 text-blue-700',
        'picked-up': 'bg-indigo-100 text-indigo-700',
        'in-transit': 'bg-purple-100 text-purple-700',
        'delivered': 'bg-green-100 text-green-700',
        'cancelled': 'bg-red-100 text-red-700'
    };

    const statusColor = statusColors[shipment.status] || 'bg-gray-100 text-gray-700';
    const date = new Date(shipment.createdAt).toLocaleDateString('en-IN');

    // Fixed: use nested field paths from Shipment model
    const pickupAddress = shipment.pickupLocation?.address || shipment.pickupLocation || 'N/A';
    const deliveryAddress = shipment.deliveryLocation?.address || shipment.deliveryLocation || 'N/A';
    const weight = shipment.cargo?.weight || 'N/A';
    const totalPrice = shipment.pricing?.totalPrice;

    row.innerHTML = `
        <td class="px-4 py-4">
            <div class="flex items-center">
                <i data-lucide="hash" class="w-4 h-4 text-gray-400 mr-2"></i>
                <span class="font-mono text-sm font-medium">${shipment.trackingId || shipment._id?.slice(-8)}</span>
            </div>
        </td>
        <td class="px-4 py-4">
            <div class="text-sm">
                <div class="flex items-center text-gray-900 font-medium">
                    <i data-lucide="map-pin" class="w-3 h-3 text-green-600 mr-1 flex-shrink-0"></i>
                    <span class="truncate max-w-[140px]">${pickupAddress}</span>
                </div>
                <div class="flex items-center text-gray-500 mt-1">
                    <i data-lucide="flag" class="w-3 h-3 text-red-600 mr-1 flex-shrink-0"></i>
                    <span class="truncate max-w-[140px]">${deliveryAddress}</span>
                </div>
            </div>
        </td>
        <td class="px-4 py-4">
            <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor} capitalize">
                ${shipment.status}
            </span>
        </td>
        <td class="px-4 py-4 text-sm text-gray-900">${weight} kg</td>
        <td class="px-4 py-4 text-sm font-medium text-gray-900">
            ${totalPrice ? `₹${totalPrice.toLocaleString('en-IN')}` : 'N/A'}
        </td>
        <td class="px-4 py-4 text-sm text-gray-500">${date}</td>
        <td class="px-4 py-4 text-sm font-medium">
            <div class="flex items-center gap-2">
                <button onclick="viewShipmentDetails('${shipment._id}')" class="text-primary hover:text-accent" title="View Details">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
                ${shipment.status === 'pending' ? `
                <button onclick="cancelShipment('${shipment._id}')" class="text-red-500 hover:text-red-700" title="Cancel">
                    <i data-lucide="x-circle" class="w-4 h-4"></i>
                </button>` : ''}
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

    // Build payload matching backend's flexible format
    const pickupLocation = form.querySelector('#pickup-location')?.value?.trim();
    const deliveryLocation = form.querySelector('#delivery-location')?.value?.trim();
    const weight = form.querySelector('#cargo-weight')?.value;
    const vehicleType = form.querySelector('#vehicle-type')?.value;
    const cargoDescription = form.querySelector('#cargo-description')?.value?.trim();
    const pickupDate = form.querySelector('#pickup-date')?.value;

    if (!pickupLocation || !deliveryLocation || !weight || !vehicleType) {
        window.API.ui.showError('Please fill in all required fields');
        return;
    }

    const shipmentData = {
        pickupLocation,         // backend accepts string → wraps in { address: ... }
        deliveryLocation,
        weight: parseFloat(weight),
        vehicleType,
        cargoDescription,
        pickupDate: pickupDate || new Date().toISOString()
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    window.API.ui.showLoading(submitBtn, 'Creating...');

    try {
        const response = await window.API.shipments.create(shipmentData);
        if (response.success) {
            window.API.ui.showSuccess('Shipment created successfully!');
            form.reset();
            hideCreateShipmentModal();
            await loadDashboardData();
        }
    } catch (error) {
        window.API.ui.handleError(error, 'Failed to create shipment');
    } finally {
        window.API.ui.hideLoading(submitBtn);
    }
}

// Cancel shipment
async function cancelShipment(shipmentId) {
    if (!confirm('Are you sure you want to cancel this shipment?')) return;
    try {
        const response = await window.API.shipments.cancel(shipmentId);
        if (response.success) {
            window.API.ui.showSuccess('Shipment cancelled successfully');
            await loadDashboardData();
        }
    } catch (error) {
        window.API.ui.handleError(error, 'Failed to cancel shipment');
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

// View shipment details (basic modal)
function viewShipmentDetails(shipmentId) {
    window.API.shipments.getById(shipmentId).then(response => {
        if (response.success) {
            const s = response.data;
            const pickup = s.pickupLocation?.address || s.pickupLocation || 'N/A';
            const delivery = s.deliveryLocation?.address || s.deliveryLocation || 'N/A';
            alert(
                `📦 Shipment Details\n\n` +
                `Tracking ID: ${s.trackingId}\n` +
                `Status: ${s.status}\n` +
                `Pickup: ${pickup}\n` +
                `Delivery: ${delivery}\n` +
                `Weight: ${s.cargo?.weight} kg\n` +
                `Vehicle: ${s.cargo?.vehicleType}\n` +
                `Price: ₹${s.pricing?.totalPrice?.toLocaleString('en-IN') || 'N/A'}`
            );
        }
    }).catch(() => {
        window.API.ui.showError('Could not load shipment details');
    });
}

// Show/hide create shipment modal
function showCreateShipmentModal() {
    const modal = document.getElementById('create-shipment-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function hideCreateShipmentModal() {
    const modal = document.getElementById('create-shipment-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

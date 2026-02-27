/**
 * Driver Dashboard - Dynamic Data Integration
 * Fetches real shipment and earnings data from backend API
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
    if (currentUser.role !== 'driver') {
        window.API.ui.showError('Access denied. Driver access only.');
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
    const userName = user.name || user.fullname || 'Driver';
    const userEmail = user.email || '';
    const initials = userName.charAt(0).toUpperCase();

    // Update user display elements
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

    // Availability toggle
    const availabilityToggle = document.getElementById('availability-toggle');
    if (availabilityToggle) {
        availabilityToggle.addEventListener('change', handleAvailabilityToggle);
    }

    // Update shipment status buttons (event delegation)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.update-status-btn');
        if (btn) {
            const shipmentId = btn.dataset.shipmentId;
            const newStatus = btn.dataset.newStatus;
            updateShipmentStatus(shipmentId, newStatus);
        }
    });

    // Driver profile creation form
    const createProfileForm = document.getElementById('create-driver-profile-form');
    if (createProfileForm) {
        createProfileForm.addEventListener('submit', handleCreateProfile);
    }
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        // Fetch assigned shipments and driver stats in parallel
        // Fixed: getStats() is the correct method name (added in Phase 2 backend fix)
        const [shipmentsResponse, statsResponse] = await Promise.all([
            window.API.shipments.getAll().catch(err => ({ success: false, data: [] })),
            window.API.drivers.getStats().catch(err => ({ success: false, data: {} }))
        ]);

        const shipments = shipmentsResponse.success ? (shipmentsResponse.data || []) : [];
        const stats = statsResponse.success ? (statsResponse.data || {}) : {};

        // Update statistics
        updateStatistics(shipments, stats);

        // Render shipments list
        renderShipments(shipments);

        // Store data for later use
        window.dashboardData = { shipments, stats };

        // Check if driver needs to create profile
        checkDriverProfile();

    } catch (error) {
        window.API.ui.handleError(error, 'Failed to load dashboard data');
    }
}

// Check if driver has a profile set up
async function checkDriverProfile() {
    try {
        await window.API.drivers.getProfile();
        // Profile exists, hide setup prompt
        const setupPrompt = document.getElementById('profile-setup');
        if (setupPrompt) setupPrompt.classList.add('hidden');
    } catch (err) {
        // No profile — show setup
        const setupPrompt = document.getElementById('profile-setup');
        if (setupPrompt) setupPrompt.classList.remove('hidden');
    }
}

// Update statistics cards
function updateStatistics(shipments, stats) {
    const activeShipments = shipments.filter(s => s.status === 'in-transit' || s.status === 'picked-up').length;
    const completedShipments = shipments.filter(s => s.status === 'delivered').length;
    const totalEarnings = stats.totalEarnings || shipments
        .filter(s => s.status === 'delivered')
        .reduce((sum, s) => sum + ((s.pricing?.totalPrice || 0) * 0.7), 0);

    const statActive = document.getElementById('stat-active-shipments');
    const statCompleted = document.getElementById('stat-completed');
    const statEarnings = document.getElementById('stat-earnings');
    const statRating = document.getElementById('stat-rating');

    if (statActive) statActive.textContent = activeShipments;
    if (statCompleted) statCompleted.textContent = completedShipments;
    if (statEarnings) statEarnings.textContent = `₹${Math.floor(totalEarnings).toLocaleString()}`;
    if (statRating) statRating.textContent = stats.rating ? stats.rating.toFixed(1) : '—';
}

// Render shipments list
function renderShipments(shipments) {
    const container = document.getElementById('shipments-list');
    if (!container) return;

    container.innerHTML = '';

    if (shipments.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 col-span-full">
                <i data-lucide="package" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
                <p class="text-gray-500 text-lg font-medium">No shipments assigned yet</p>
                <p class="text-gray-400 text-sm mt-2">You'll see your assigned shipments here once a shipper selects you</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    shipments.forEach(shipment => {
        const card = createShipmentCard(shipment);
        container.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}

// Create shipment card
function createShipmentCard(shipment) {
    const card = document.createElement('div');
    card.className = 'bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow';

    const statusColors = {
        'pending': 'bg-yellow-100 text-yellow-700',
        'assigned': 'bg-blue-100 text-blue-700',
        'picked-up': 'bg-indigo-100 text-indigo-700',
        'in-transit': 'bg-purple-100 text-purple-700',
        'delivered': 'bg-green-100 text-green-700',
        'cancelled': 'bg-red-100 text-red-700'
    };

    const statusColor = statusColors[shipment.status] || 'bg-gray-100 text-gray-700';

    // Determine next possible status
    const nextStatusMap = { 'assigned': 'picked-up', 'picked-up': 'in-transit', 'in-transit': 'delivered' };
    const nextStatusLabelMap = { 'picked-up': 'Mark Picked Up', 'in-transit': 'Start Transit', 'delivered': 'Mark Delivered' };
    const nextStatus = nextStatusMap[shipment.status];
    const nextStatusLabel = nextStatusLabelMap[nextStatus];

    // Use nested field paths from Shipment model
    const pickupAddress = shipment.pickupLocation?.address || shipment.pickupLocation || 'N/A';
    const deliveryAddress = shipment.deliveryLocation?.address || shipment.deliveryLocation || 'N/A';
    const cargoWeight = shipment.cargo?.weight || 'N/A';
    const vehicleType = shipment.cargo?.vehicleType || 'N/A';
    const totalPrice = shipment.pricing?.totalPrice || 0;
    const driverEarnings = Math.floor(totalPrice * 0.7);

    card.innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-primary text-white rounded-lg flex items-center justify-center">
                    <i data-lucide="package" class="w-6 h-6"></i>
                </div>
                <div>
                    <p class="font-mono text-sm font-medium text-gray-900">#${shipment.trackingId || shipment._id?.slice(-8) || 'N/A'}</p>
                    <span class="px-3 py-1 inline-flex text-xs font-semibold rounded-full ${statusColor} capitalize mt-1">
                        ${shipment.status}
                    </span>
                </div>
            </div>
            <div class="text-right">
                <p class="text-2xl font-bold text-gray-900">₹${driverEarnings.toLocaleString()}</p>
                <p class="text-xs text-gray-500">Your earnings (70%)</p>
            </div>
        </div>
        
        <div class="space-y-3 mb-4">
            <div class="flex items-start gap-2">
                <i data-lucide="map-pin" class="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"></i>
                <div class="flex-1">
                    <p class="text-xs text-gray-500">Pickup</p>
                    <p class="text-sm font-medium text-gray-900">${pickupAddress}</p>
                </div>
            </div>
            <div class="flex items-start gap-2">
                <i data-lucide="flag" class="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0"></i>
                <div class="flex-1">
                    <p class="text-xs text-gray-500">Delivery</p>
                    <p class="text-sm font-medium text-gray-900">${deliveryAddress}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                    <p class="text-xs text-gray-500">Weight</p>
                    <p class="text-sm font-medium text-gray-900">${cargoWeight} kg</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500">Vehicle</p>
                    <p class="text-sm font-medium text-gray-900">${vehicleType}</p>
                </div>
            </div>
        </div>
        
        ${nextStatus && nextStatusLabel ? `
            <button 
                class="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-accent transition-colors update-status-btn flex items-center justify-center gap-2"
                data-shipment-id="${shipment._id}"
                data-new-status="${nextStatus}">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                ${nextStatusLabel}
            </button>
        ` : ''}
    `;

    return card;
}

// Update shipment status
async function updateShipmentStatus(shipmentId, newStatus) {
    if (!confirm(`Are you sure you want to update this shipment to "${newStatus}"?`)) {
        return;
    }

    try {
        // Use updateStatus endpoint (PATCH)
        const response = await window.API.shipments.updateStatus(shipmentId, newStatus);

        if (response.success) {
            window.API.ui.showSuccess('Shipment status updated successfully!');
            await loadDashboardData();
        }
    } catch (error) {
        window.API.ui.handleError(error, 'Failed to update shipment status');
    }
}

// Handle availability toggle
async function handleAvailabilityToggle(e) {
    const isAvailable = e.target.checked;

    try {
        // Fixed: correct method name is toggleAvailability (not updateAvailability)
        const response = await window.API.drivers.toggleAvailability(isAvailable);

        if (response.success) {
            window.API.ui.showSuccess(`You are now ${isAvailable ? 'available' : 'unavailable'} for new shipments`);

            // Update sidebar status indicator
            const statusText = document.getElementById('availability-status-text');
            if (statusText) statusText.textContent = isAvailable ? 'Available' : 'Unavailable';
        }
    } catch (error) {
        window.API.ui.handleError(error, 'Failed to update availability');
        e.target.checked = !isAvailable; // Revert toggle
    }
}

// Handle driver profile creation
async function handleCreateProfile(e) {
    e.preventDefault();
    const form = e.target;

    const vehicleType = form.querySelector('#prof-vehicle-type')?.value;
    const vehicleNumber = form.querySelector('#prof-vehicle-number')?.value;
    const licenseNumber = form.querySelector('#prof-license-number')?.value;

    const submitBtn = form.querySelector('button[type="submit"]');
    window.API.ui.showLoading(submitBtn, 'Creating profile...');

    try {
        const response = await window.API.drivers.createProfile({ vehicleType, vehicleNumber, licenseNumber });
        if (response.success) {
            window.API.ui.showSuccess('Driver profile created successfully!');
            const setupPrompt = document.getElementById('profile-setup');
            if (setupPrompt) setupPrompt.classList.add('hidden');
            await loadDashboardData();
        }
    } catch (error) {
        window.API.ui.handleError(error, 'Failed to create profile');
    } finally {
        window.API.ui.hideLoading(submitBtn);
    }
}

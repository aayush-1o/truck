/**
 * driver-dashboard.js - Phase 3 Enhanced
 * Includes: Real-time location (Socket.io), Notifications, Profile setup
 */

let socket = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!window.API) return;

    const user = window.API.auth.getCurrentUser();
    if (!user || user.role !== 'driver') {
        window.location.href = 'login.html';
        return;
    }

    // Populate user info
    setUserInfo(user);

    // Init notification bell
    if (window.initNotifications) initNotifications('notification-bell-container');

    // Init Socket.io for real-time location
    initSocket(user);

    // Load data
    checkDriverProfile();
    loadStats();
    loadShipments();

    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('-translate-x-full'));
    }

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        if (confirm('Logout?')) window.API.auth.logout();
    });

    // Availability toggle
    const availToggle = document.getElementById('availability-toggle');
    if (availToggle) {
        availToggle.addEventListener('change', async (e) => {
            try {
                await window.API.drivers.toggleAvailability(e.target.checked);
                const statusText = document.getElementById('availability-status-text');
                if (statusText) {
                    statusText.textContent = e.target.checked ? 'Available for jobs' : 'Not available';
                }
                window.API.ui.showSuccess(e.target.checked ? 'You are now available' : 'You are now offline');
            } catch (err) {
                window.API.ui.showError(err.message || 'Failed to update availability');
                e.target.checked = !e.target.checked;
            }
        });
    }

    // Profile setup form
    document.getElementById('create-driver-profile-form')?.addEventListener('submit', handleCreateProfile);

    // Update Location button
    document.getElementById('update-location-btn')?.addEventListener('click', updateLocation);
});

function setUserInfo(user) {
    const firstName = (user.name || user.fullname || 'Driver').split(' ')[0];
    const initial = firstName.charAt(0).toUpperCase();
    document.querySelectorAll('.user-email').forEach(el => el.textContent = user.email || '');
    const nameEl = document.getElementById('user-name');
    const welcomeEl = document.getElementById('welcome-name');
    const avatarEl = document.getElementById('user-avatar');
    const sidebarNameEl = document.getElementById('sidebar-name-driver');
    const sidebarAvatarEl = document.getElementById('sidebar-avatar');
    if (nameEl) nameEl.textContent = user.name || user.fullname || 'Driver';
    if (welcomeEl) welcomeEl.textContent = firstName;
    if (avatarEl) avatarEl.textContent = initial;
    if (sidebarNameEl) sidebarNameEl.textContent = user.name || user.fullname || 'Driver';
    if (sidebarAvatarEl) sidebarAvatarEl.textContent = initial;
}

function initSocket(user) {
    try {
        // Only load socket.io if available
        if (typeof io === 'undefined') {
            const script = document.createElement('script');
            script.src = 'http://localhost:5000/socket.io/socket.io.js';
            script.onload = () => {
                socket = io('http://localhost:5000');
                socket.emit('join', user.id);
            };
            document.head.appendChild(script);
        } else {
            socket = io('http://localhost:5000');
            socket.emit('join', user.id);
        }
    } catch (e) {
        console.warn('Socket.io not available:', e.message);
    }
}

async function updateLocation() {
    const btn = document.getElementById('update-location-btn');
    if (!('geolocation' in navigator)) {
        window.API.ui.showError('Geolocation not supported in your browser');
        return;
    }

    if (btn) btn.disabled = true;

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
            // Update DB
            await window.API.drivers.updateLocation({ lat, lng });

            // Emit via socket
            if (socket) {
                socket.emit('location:update', {
                    driverId: window.API.auth.getCurrentUser()?.id,
                    lat, lng
                });
            }

            window.API.ui.showSuccess('📍 Location updated successfully');
        } catch (e) {
            window.API.ui.showError('Failed to update location');
        }
        if (btn) btn.disabled = false;
    }, (err) => {
        window.API.ui.showError('Unable to get location: ' + err.message);
        if (btn) btn.disabled = false;
    });
}

async function checkDriverProfile() {
    try {
        const res = await window.API.drivers.getProfile();
        const profileSetup = document.getElementById('profile-setup');
        if (!res.success || !res.data) {
            if (profileSetup) profileSetup.classList.remove('hidden');
        } else {
            if (profileSetup) profileSetup.classList.add('hidden');
            // Set availability toggle state
            const toggle = document.getElementById('availability-toggle');
            if (toggle) toggle.checked = res.data.isAvailable !== false;
        }
    } catch (e) {
        // Profile doesn't exist, show setup
        const profileSetup = document.getElementById('profile-setup');
        if (profileSetup) profileSetup.classList.remove('hidden');
    }
}

async function loadStats() {
    try {
        const res = await window.API.drivers.getStats();
        if (res.success && res.data) {
            const { activeShipments = 0, completedTrips = 0, totalEarnings = 0, rating = 0 } = res.data;
            setText('stat-active-shipments', activeShipments);
            setText('stat-completed', completedTrips);
            setText('stat-earnings', totalEarnings ? `₹${totalEarnings.toLocaleString('en-IN')}` : '₹0');
            setText('stat-rating', rating ? `${rating.toFixed(1)} ⭐` : 'N/A');
        }
    } catch (e) {
        console.error('Load stats error:', e);
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

async function loadShipments() {
    try {
        const res = await window.API.shipments.getAll();
        if (!res.success) return;

        const shipments = (res.data || []).filter(s =>
            !['delivered', 'cancelled'].includes(s.status)
        );

        renderShipments(shipments);
    } catch (e) {
        console.error('Load shipments error:', e);
    }
}

const STATUS_NEXT = {
    'assigned': { next: 'picked-up', label: 'Mark Picked Up', color: 'bg-orange-600 hover:bg-orange-500' },
    'picked-up': { next: 'in-transit', label: 'Mark In Transit', color: 'bg-purple-600 hover:bg-purple-500' },
    'in-transit': { next: 'delivered', label: 'Mark Delivered', color: 'bg-green-600 hover:bg-green-500' }
};

const STATUS_BADGES = {
    'assigned': 'bg-blue-100 text-blue-700',
    'picked-up': 'bg-orange-100 text-orange-700',
    'in-transit': 'bg-purple-100 text-purple-700',
    'delivered': 'bg-green-100 text-green-700'
};

function renderShipments(shipments) {
    const container = document.getElementById('shipments-list');
    if (!shipments.length) {
        container.innerHTML = `
            <div class="col-span-3 text-center py-12">
                <i data-lucide="truck" class="w-12 h-12 text-gray-300 mx-auto mb-3"></i>
                <p class="text-secondary font-medium">No active shipments</p>
                <p class="text-sm text-gray-400 mt-1">Shipments assigned to you will appear here</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    container.innerHTML = shipments.map(s => {
        const pickup = s.pickupLocation?.address || s.pickupLocation || '—';
        const delivery = s.deliveryLocation?.address || s.deliveryLocation || '—';
        const weight = s.cargo?.weight || s.weight || '—';
        const price = s.pricing?.totalPrice || s.price || 0;
        const badgeClass = STATUS_BADGES[s.status] || 'bg-gray-100 text-gray-700';
        const next = STATUS_NEXT[s.status];

        return `
            <div class="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-3">
                    <span class="font-mono text-xs font-semibold text-primary">${s.trackingId || '—'}</span>
                    <span class="px-2 py-1 rounded-full text-xs font-semibold capitalize ${badgeClass}">${s.status}</span>
                </div>
                <div class="space-y-1 mb-4">
                    <div class="flex items-start gap-2">
                        <i data-lucide="map-pin" class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0"></i>
                        <p class="text-sm text-dark">${pickup}</p>
                    </div>
                    <div class="flex items-start gap-2">
                        <i data-lucide="flag" class="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"></i>
                        <p class="text-sm text-secondary">${delivery}</p>
                    </div>
                </div>
                <div class="flex justify-between text-xs text-secondary mb-4">
                    <span>${weight} kg</span>
                    <span class="font-semibold text-dark">₹${price ? price.toLocaleString('en-IN') : '—'}</span>
                </div>
                <div class="flex gap-2">
                    <a href="tracking.html?id=${s.trackingId}" class="flex-1 py-2 text-center text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                        <i data-lucide="map-pin" class="w-3 h-3"></i> Track
                    </a>
                    ${next ? `
                    <button onclick="updateShipmentStatus('${s._id}','${next.next}')"
                        class="flex-1 py-2 text-xs ${next.color} text-white rounded-lg transition-colors">
                        ${next.label}
                    </button>` : ''}
                </div>
            </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

async function updateShipmentStatus(shipmentId, newStatus) {
    try {
        const res = await window.API.shipments.updateStatus(shipmentId, newStatus);
        if (res.success) {
            window.API.ui.showSuccess(`Status updated to: ${newStatus}`);
            loadShipments();
            loadStats();
        }
    } catch (e) {
        window.API.ui.showError(e.message || 'Failed to update status');
    }
}

async function handleCreateProfile(e) {
    e.preventDefault();
    const vehicleType = document.getElementById('prof-vehicle-type')?.value;
    const vehicleNumber = document.getElementById('prof-vehicle-number')?.value?.trim();
    const licenseNumber = document.getElementById('prof-license-number')?.value?.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!vehicleType || !vehicleNumber || !licenseNumber) {
        window.API.ui.showError('Please fill all profile fields');
        return;
    }

    window.API.ui.showLoading(submitBtn, 'Saving...');

    try {
        const res = await window.API.drivers.createProfile({
            vehicle: { type: vehicleType, number: vehicleNumber },
            licenseNumber,
            isAvailable: true
        });

        if (res.success) {
            window.API.ui.showSuccess('✅ Driver profile created!');
            document.getElementById('profile-setup')?.classList.add('hidden');
            loadStats();
        }
    } catch (err) {
        window.API.ui.showError(err.message || 'Failed to create profile');
        window.API.ui.hideLoading(submitBtn);
    }
}

// Expose for onclick
window.updateShipmentStatus = updateShipmentStatus;
window.updateLocation = updateLocation;

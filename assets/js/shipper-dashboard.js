/**
 * shipper-dashboard.js - Phase 3 Enhanced
 * Includes: Pay Now (Razorpay), Notifications, Track link, Cancel shipment
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!window.API) return;

    const user = window.API.auth.getCurrentUser();
    if (!user || user.role !== 'shipper') {
        window.location.href = 'login.html';
        return;
    }

    // Populate user info
    setUserInfo(user);

    // Init notification bell
    if (window.initNotifications) initNotifications('notification-bell-container');

    // Load dashboard data
    loadStats();
    loadShipments();

    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('-translate-x-full'));
    }
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 1024 && sidebar &&
            !sidebar.contains(e.target) && sidebarToggle && !sidebarToggle.contains(e.target)) {
            sidebar.classList.add('-translate-x-full');
        }
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        if (confirm('Logout?')) window.API.auth.logout();
    });

    // Status filter
    document.getElementById('filter-status')?.addEventListener('change', (e) => {
        loadShipments(e.target.value);
    });

    // Create shipment modal
    const openBtns = document.querySelectorAll('#open-create-shipment');
    openBtns.forEach(btn => btn.addEventListener('click', showCreateShipmentModal));
    document.getElementById('close-create-shipment')?.addEventListener('click', hideCreateShipmentModal);
    document.getElementById('create-shipment-form')?.addEventListener('submit', handleCreateShipment);
});

function setUserInfo(user) {
    const firstName = (user.name || user.fullname || 'Shipper').split(' ')[0];
    const initial = firstName.charAt(0).toUpperCase();
    document.querySelectorAll('.user-email').forEach(el => el.textContent = user.email || '');
    const nameEl = document.getElementById('user-name');
    const welcomeEl = document.getElementById('welcome-name');
    const avatarEl = document.getElementById('user-avatar');
    const sidebarNameEl = document.getElementById('sidebar-name');
    const sidebarAvatarEl = document.getElementById('sidebar-avatar');
    if (nameEl) nameEl.textContent = user.name || user.fullname || 'Shipper';
    if (welcomeEl) welcomeEl.textContent = firstName;
    if (avatarEl) avatarEl.textContent = initial;
    if (sidebarNameEl) sidebarNameEl.textContent = user.name || user.fullname || 'Shipper';
    if (sidebarAvatarEl) sidebarAvatarEl.textContent = initial;
}

async function loadStats() {
    try {
        const res = await window.API.shipments.getAll();
        if (!res.success) return;

        const shipments = res.data || [];
        const total = shipments.length;
        const pending = shipments.filter(s => s.status === 'pending').length;
        const inTransit = shipments.filter(s => ['assigned', 'picked-up', 'in-transit'].includes(s.status)).length;
        const delivered = shipments.filter(s => s.status === 'delivered').length;

        setText('stat-total-shipments', total);
        setText('stat-pending', pending);
        setText('stat-in-transit', inTransit);
        setText('stat-delivered', delivered);
    } catch (e) {
        console.error('Load stats error:', e);
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

async function loadShipments(statusFilter = 'all') {
    try {
        const res = await window.API.shipments.getAll();
        if (!res.success) return;

        let shipments = res.data || [];
        if (statusFilter !== 'all') {
            shipments = shipments.filter(s => s.status === statusFilter);
        }

        renderShipments(shipments);
    } catch (e) {
        console.error('Load shipments error:', e);
        document.getElementById('shipments-list').innerHTML = `<p class="text-red-500 text-sm p-4">Failed to load shipments.</p>`;
    }
}

const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
    'picked-up': 'bg-orange-100 text-orange-700',
    'in-transit': 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
};

function renderShipments(shipments) {
    const container = document.getElementById('shipments-list');
    if (!shipments.length) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i data-lucide="package" class="w-12 h-12 text-gray-300 mx-auto mb-3"></i>
                <p class="text-secondary font-medium">No shipments found</p>
                <p class="text-sm text-gray-400 mt-1">Create your first shipment to get started</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="text-left text-secondary text-xs uppercase border-b">
                        <th class="pb-3 pr-4">Tracking ID</th>
                        <th class="pb-3 pr-4">Route</th>
                        <th class="pb-3 pr-4">Weight</th>
                        <th class="pb-3 pr-4">Price</th>
                        <th class="pb-3 pr-4">Status</th>
                        <th class="pb-3">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${shipments.map(s => {
        const pickup = s.pickupLocation?.address || s.pickupLocation || '—';
        const delivery = s.deliveryLocation?.address || s.deliveryLocation || '—';
        const weight = s.cargo?.weight || s.weight || '—';
        const price = s.pricing?.totalPrice || s.price || 0;
        const statusClass = STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-700';
        const isPaid = s.paymentStatus === 'paid';
        const canPay = ['pending', 'assigned'].includes(s.status) && !isPaid && price > 0;
        const canCancel = s.status === 'pending';
        const canTrack = s.trackingId;

        return `<tr class="hover:bg-gray-50">
                            <td class="py-3 pr-4">
                                <span class="font-mono text-xs text-primary font-semibold">${s.trackingId || '—'}</span>
                            </td>
                            <td class="py-3 pr-4">
                                <p class="font-medium text-dark truncate max-w-[140px]" title="${pickup}">${pickup}</p>
                                <p class="text-gray-400 text-xs truncate max-w-[140px]">→ ${delivery}</p>
                            </td>
                            <td class="py-3 pr-4 text-secondary">${weight} kg</td>
                            <td class="py-3 pr-4">
                                <span class="font-semibold text-dark">₹${price ? price.toLocaleString('en-IN') : '—'}</span>
                                ${isPaid ? '<span class="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">PAID</span>' : ''}
                            </td>
                            <td class="py-3 pr-4">
                                <span class="px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusClass}">${s.status || '—'}</span>
                            </td>
                            <td class="py-3">
                                <div class="flex items-center gap-2 flex-wrap">
                                    ${canTrack ? `<a href="tracking.html?id=${s.trackingId}" class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i>Track</a>` : ''}
                                    ${canPay ? `<button onclick="initiatePayment('${s._id}','${s.trackingId}',${price})" class="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors flex items-center gap-1"><i data-lucide="credit-card" class="w-3 h-3"></i>Pay</button>` : ''}
                                    ${canCancel ? `<button onclick="cancelShipment('${s._id}')" class="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">Cancel</button>` : ''}
                                </div>
                            </td>
                        </tr>`;
    }).join('')}
                </tbody>
            </table>
        </div>`;

    if (window.lucide) lucide.createIcons();
}

async function cancelShipment(shipmentId) {
    if (!confirm('Cancel this shipment?')) return;
    try {
        const res = await window.API.shipments.cancel(shipmentId);
        if (res.success) {
            window.API.ui.showSuccess('Shipment cancelled');
            loadShipments();
            loadStats();
        }
    } catch (e) {
        window.API.ui.showError(e.message || 'Failed to cancel shipment');
    }
}

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

async function handleCreateShipment(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');

    const pickup = document.getElementById('pickup-location')?.value?.trim();
    const delivery = document.getElementById('delivery-location')?.value?.trim();
    const weight = document.getElementById('cargo-weight')?.value;
    const vehicleType = document.getElementById('vehicle-type')?.value;
    const description = document.getElementById('cargo-description')?.value?.trim();
    const pickupDate = document.getElementById('pickup-date')?.value;

    if (!pickup || !delivery || !weight || !vehicleType) {
        window.API.ui.showError('Please fill all required fields');
        return;
    }

    window.API.ui.showLoading(submitBtn, 'Creating...');

    try {
        const payload = {
            pickupLocation: { address: pickup },
            deliveryLocation: { address: delivery },
            cargo: {
                weight: parseFloat(weight),
                vehicleType,
                description: description || ''
            },
            pickupDate: pickupDate || undefined
        };

        const res = await window.API.shipments.create(payload);
        if (res.success) {
            window.API.ui.showSuccess(`✅ Shipment ${res.data.trackingId} created!`);
            hideCreateShipmentModal();
            e.target.reset();
            loadShipments();
            loadStats();
        }
    } catch (err) {
        window.API.ui.showError(err.message || 'Failed to create shipment');
        window.API.ui.hideLoading(submitBtn);
    }
}

// Expose for onclick
window.cancelShipment = cancelShipment;
window.showCreateShipmentModal = showCreateShipmentModal;
window.hideCreateShipmentModal = hideCreateShipmentModal;

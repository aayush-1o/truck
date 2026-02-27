/**
 * admin-dashboard.js - Phase 3 Enhanced
 * Includes: Revenue stat, Assign driver modal, Notifications
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!window.API) return;

    const user = window.API.auth.getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    setUserInfo(user);

    // Init notification bell
    if (window.initNotifications) initNotifications('notification-bell-container');

    // Load dashboard data
    loadStats();
    loadUsers();
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

    // Role filter
    document.getElementById('filter-role')?.addEventListener('change', (e) => {
        loadUsers(e.target.value);
    });
});

function setUserInfo(user) {
    const firstName = (user.name || user.fullname || 'Admin').split(' ')[0];
    const initial = firstName.charAt(0).toUpperCase();
    document.querySelectorAll('.user-email').forEach(el => el.textContent = user.email || '');
    setText('user-name', user.name || user.fullname || 'Admin');
    setText('welcome-name', firstName);
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.textContent = initial;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

async function loadStats() {
    try {
        const [usersRes, shipmentsRes] = await Promise.all([
            window.API.users.getStats(),
            window.API.shipments.getAll()
        ]);

        if (usersRes.success) {
            setText('stat-total-users', usersRes.data?.totalUsers ?? '—');
            setText('stat-drivers', usersRes.data?.drivers ?? '—');
            setText('stat-shippers', usersRes.data?.shippers ?? '—');
        }

        if (shipmentsRes.success) {
            const shipments = shipmentsRes.data || [];
            setText('stat-total-shipments', shipments.length);

            // Calculate total revenue from delivered + paid
            const revenue = shipments
                .filter(s => s.status === 'delivered')
                .reduce((sum, s) => sum + (s.pricing?.totalPrice || s.price || 0), 0);
            setText('stat-revenue', revenue ? `₹${Math.round(revenue).toLocaleString('en-IN')}` : '₹0');
        }
    } catch (e) {
        console.error('Load admin stats error:', e);
    }
}

async function loadUsers(roleFilter = 'all') {
    try {
        const res = await window.API.users.getAll();
        if (!res.success) return;

        let users = res.data || [];
        if (roleFilter !== 'all') {
            users = users.filter(u => u.role === roleFilter);
        }

        renderUsers(users);
    } catch (e) {
        console.error('Load users error:', e);
    }
}

function renderUsers(users) {
    const container = document.getElementById('users-list');
    if (!container) return;

    if (!users.length) {
        container.innerHTML = '<div class="p-4 text-center text-secondary text-sm">No users found</div>';
        return;
    }

    const roleColors = {
        driver: 'bg-green-100 text-green-700',
        shipper: 'bg-blue-100 text-blue-700',
        admin: 'bg-purple-100 text-purple-700'
    };

    container.innerHTML = users.map(u => `
        <div class="flex items-center justify-between p-3 hover:bg-light rounded-lg transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    ${(u.name || u.email || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                    <p class="text-sm font-medium text-dark">${u.name || '—'}</p>
                    <p class="text-xs text-secondary">${u.email}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 ${roleColors[u.role] || 'bg-gray-100 text-gray-700'} rounded-full text-xs font-medium capitalize">${u.role}</span>
                <div class="w-2 h-2 ${u.isActive !== false ? 'bg-green-500' : 'bg-gray-400'} rounded-full"></div>
            </div>
        </div>
    `).join('');
}

async function loadShipments() {
    try {
        const [shipmentsRes, driversRes] = await Promise.all([
            window.API.shipments.getAll(),
            window.API.drivers.getAll()
        ]);

        if (!shipmentsRes.success) return;
        const shipments = shipmentsRes.data || [];
        const drivers = driversRes.success ? (driversRes.data || []) : [];

        renderActivityLog(shipments);
        renderShipmentsTable(shipments, drivers);
    } catch (e) {
        console.error('Load shipments error:', e);
    }
}

function renderActivityLog(shipments) {
    const container = document.getElementById('activity-log');
    if (!container) return;

    const recent = [...shipments]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 8);

    if (!recent.length) {
        container.innerHTML = '<div class="p-4 text-center text-secondary text-sm">No activity yet</div>';
        return;
    }

    const statusIcons = {
        pending: { icon: 'clock', color: 'text-yellow-600 bg-yellow-100' },
        assigned: { icon: 'user-check', color: 'text-blue-600 bg-blue-100' },
        'picked-up': { icon: 'package', color: 'text-orange-600 bg-orange-100' },
        'in-transit': { icon: 'truck', color: 'text-purple-600 bg-purple-100' },
        delivered: { icon: 'check-circle', color: 'text-green-600 bg-green-100' },
        cancelled: { icon: 'x-circle', color: 'text-red-600 bg-red-100' }
    };

    container.innerHTML = recent.map(s => {
        const cfg = statusIcons[s.status] || statusIcons.pending;
        const pickup = s.pickupLocation?.address || s.pickupLocation || '—';
        const timeAgo = getTimeAgo(s.updatedAt || s.createdAt);
        return `
            <div class="flex items-start gap-3 p-3 hover:bg-light rounded-lg transition-colors">
                <div class="w-8 h-8 ${cfg.color} rounded-full flex items-center justify-center flex-shrink-0">
                    <i data-lucide="${cfg.icon}" class="w-4 h-4"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-dark">${s.trackingId || '—'}</p>
                    <p class="text-xs text-secondary capitalize">${s.status} · from ${pickup}</p>
                    <p class="text-xs text-gray-400 mt-0.5">${timeAgo}</p>
                </div>
            </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function renderShipmentsTable(shipments, drivers) {
    const container = document.getElementById('shipments-table');
    if (!container) return;

    const pending = shipments.filter(s => !['delivered', 'cancelled'].includes(s.status)).slice(0, 10);

    if (!pending.length) {
        container.innerHTML = '<div class="p-4 text-center text-secondary text-sm">No active shipments</div>';
        return;
    }

    const availableDrivers = drivers.filter(d => d.isAvailable);

    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="text-left text-secondary text-xs uppercase border-b">
                        <th class="pb-3 pr-4">Tracking</th>
                        <th class="pb-3 pr-4">Route</th>
                        <th class="pb-3 pr-4">Status</th>
                        <th class="pb-3">Assign Driver</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${pending.map(s => {
        const pickup = s.pickupLocation?.address || s.pickupLocation || '—';
        const delivery = s.deliveryLocation?.address || s.deliveryLocation || '—';
        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-700',
            assigned: 'bg-blue-100 text-blue-700',
            'picked-up': 'bg-orange-100 text-orange-700',
            'in-transit': 'bg-purple-100 text-purple-700'
        };
        return `<tr class="hover:bg-gray-50">
                            <td class="py-3 pr-4">
                                <span class="font-mono text-xs text-primary font-semibold">${s.trackingId || '—'}</span>
                            </td>
                            <td class="py-3 pr-4">
                                <p class="text-dark text-xs truncate max-w-[120px]">${pickup}</p>
                                <p class="text-gray-400 text-xs truncate max-w-[120px]">→ ${delivery}</p>
                            </td>
                            <td class="py-3 pr-4">
                                <span class="px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}">${s.status}</span>
                            </td>
                            <td class="py-3">
                                ${s.status === 'pending' && availableDrivers.length > 0 ? `
                                    <select onchange="assignDriver('${s._id}', this.value)"
                                        class="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                                        <option value="">Select driver...</option>
                                        ${availableDrivers.map(d => {
            const name = d.user?.name || 'Driver';
            const vehicle = d.vehicle?.type || d.vehicleType || '';
            return `<option value="${d._id}">${name} · ${vehicle}</option>`;
        }).join('')}
                                    </select>
                                ` : s.driver ? '<span class="text-xs text-green-600 font-medium">Assigned ✓</span>'
                : '<span class="text-xs text-gray-400">No drivers available</span>'}
                            </td>
                        </tr>`;
    }).join('')}
                </tbody>
            </table>
        </div>`;

    if (window.lucide) lucide.createIcons();
}

async function assignDriver(shipmentId, driverId) {
    if (!driverId) return;
    try {
        const res = await fetch(`http://localhost:3000/api/shipments/${shipmentId}/assign`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.API.tokenManager.getToken()}`
            },
            body: JSON.stringify({ driverId })
        });
        const data = await res.json();
        if (data.success) {
            window.API.ui.showSuccess('✅ Driver assigned successfully!');
            loadShipments();
            loadStats();
        } else {
            throw new Error(data.message);
        }
    } catch (e) {
        window.API.ui.showError(e.message || 'Failed to assign driver');
    }
}

function getTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

window.assignDriver = assignDriver;

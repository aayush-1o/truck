/**
 * notifications.js - In-app notification bell UI
 * Shared across admin, shipper, driver dashboards
 */

let notificationPollInterval = null;

/**
 * Initialize notification bell in a given container element
 * Call this from each dashboard's init function
 * @param {string} bellContainerId - ID of the element to inject the bell into
 */
function initNotifications(bellContainerId = 'notification-bell-container') {
    const container = document.getElementById(bellContainerId);
    if (!container) return;

    container.innerHTML = `
        <div class="relative" id="notif-wrapper">
            <button id="notif-bell" class="relative p-2 text-secondary hover:bg-light rounded-lg transition-colors" title="Notifications">
                <i data-lucide="bell" class="w-5 h-5"></i>
                <span id="notif-badge" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">0</span>
            </button>

            <!-- Dropdown -->
            <div id="notif-dropdown" class="hidden absolute right-0 top-10 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50">
                <div class="flex items-center justify-between px-4 py-3 border-b">
                    <h3 class="font-semibold text-dark text-sm">Notifications</h3>
                    <button id="mark-all-read" class="text-xs text-primary hover:underline">Mark all read</button>
                </div>
                <div id="notif-list" class="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    <div class="p-4 text-center text-secondary text-sm">Loading...</div>
                </div>
                <div class="px-4 py-3 border-t text-center">
                    <p class="text-xs text-secondary">Auto-refreshes every minute</p>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Bell toggle
    document.getElementById('notif-bell').addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('notif-dropdown');
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            fetchNotifications();
        }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('notif-wrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            document.getElementById('notif-dropdown')?.classList.add('hidden');
        }
    });

    // Mark all read
    document.getElementById('mark-all-read').addEventListener('click', async () => {
        try {
            await window.API.notifications.markAllRead();
            document.getElementById('notif-badge').classList.add('hidden');
            await fetchNotifications();
        } catch (e) {
            console.error('Mark all read error:', e);
        }
    });

    // Initial fetch
    fetchNotifications();

    // Poll every 60 seconds
    if (notificationPollInterval) clearInterval(notificationPollInterval);
    notificationPollInterval = setInterval(fetchNotifications, 60000);
}

async function fetchNotifications() {
    try {
        const res = await window.API.notifications.getAll();
        if (!res.success) return;

        const { data: notifications, unreadCount } = res;

        // Update badge
        const badge = document.getElementById('notif-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        // Render list
        renderNotifications(notifications);

    } catch (e) {
        // Silently fail — user may not notice
    }
}

const TYPE_ICONS = {
    'info': { icon: 'info', color: 'text-blue-500 bg-blue-50' },
    'success': { icon: 'check-circle', color: 'text-green-500 bg-green-50' },
    'warning': { icon: 'alert-circle', color: 'text-yellow-500 bg-yellow-50' },
    'error': { icon: 'x-circle', color: 'text-red-500 bg-red-50' }
};

function renderNotifications(notifications) {
    const list = document.getElementById('notif-list');
    if (!list) return;

    if (!notifications || notifications.length === 0) {
        list.innerHTML = '<div class="p-6 text-center text-secondary text-sm">No notifications yet</div>';
        return;
    }

    list.innerHTML = notifications.map(n => {
        const cfg = TYPE_ICONS[n.type] || TYPE_ICONS['info'];
        const timeAgo = getTimeAgo(n.createdAt);
        return `
            <div class="flex gap-3 p-3 hover:bg-gray-50 cursor-pointer ${n.read ? 'opacity-60' : ''}" onclick="markRead('${n._id}')">
                <div class="w-8 h-8 ${cfg.color} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i data-lucide="${cfg.icon}" class="w-4 h-4"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-dark leading-snug">${n.title}</p>
                    <p class="text-xs text-secondary leading-snug mt-0.5">${n.message}</p>
                    <p class="text-[10px] text-gray-400 mt-1">${timeAgo}</p>
                </div>
                ${!n.read ? '<div class="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>' : ''}
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

async function markRead(notifId) {
    try {
        await window.API.notifications.markRead(notifId);
        fetchNotifications();
    } catch (e) {
        console.error('Mark read error:', e);
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

// Make globally accessible
window.initNotifications = initNotifications;
window.markRead = markRead;
window.fetchNotifications = fetchNotifications;

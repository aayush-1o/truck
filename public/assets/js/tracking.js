/**
 * tracking.js - Public shipment tracking page logic
 * No authentication required
 */

const STATUS_CONFIG = {
    'pending': { label: 'Pending', icon: 'clock', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
    'assigned': { label: 'Assigned', icon: 'user-check', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    'picked-up': { label: 'Picked Up', icon: 'package', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
    'in-transit': { label: 'In Transit', icon: 'truck', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
    'delivered': { label: 'Delivered', icon: 'check-circle', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    'cancelled': { label: 'Cancelled', icon: 'x-circle', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' }
};

let refreshInterval = null;
let currentTrackingId = null;
let leafletMap = null;

async function trackShipment(trackingId) {
    if (!trackingId) return;

    currentTrackingId = trackingId.trim().toUpperCase();

    const resultEl = document.getElementById('track-result');
    const errorEl = document.getElementById('track-error');
    resultEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    try {
        const response = await fetch(`https://truck-production.up.railway.app/api/shipments/track/${currentTrackingId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Shipment not found');
        }

        renderResult(data.data);
        resultEl.classList.remove('hidden');

        // Auto-refresh
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => trackShipment(currentTrackingId), 30000);

    } catch (err) {
        document.getElementById('error-message').textContent = err.message || 'Shipment not found';
        errorEl.classList.remove('hidden');
    }
}

function renderResult(shipment) {
    const status = shipment.status || 'pending';
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['pending'];

    document.getElementById('result-tracking-id').textContent = shipment.trackingId || '—';
    const badge = document.getElementById('result-status-badge');
    badge.textContent = cfg.label;

    const pickup = shipment.pickupLocation?.address || shipment.pickupLocation || '—';
    const delivery = shipment.deliveryLocation?.address || shipment.deliveryLocation || '—';
    document.getElementById('result-pickup').textContent = pickup;
    document.getElementById('result-delivery').textContent = delivery;

    const weight = shipment.cargo?.weight || shipment.weight;
    document.getElementById('result-weight').textContent = weight ? `${weight} kg` : '—';
    document.getElementById('result-vehicle').textContent = shipment.cargo?.vehicleType || shipment.vehicleType || '—';
    const price = shipment.pricing?.totalPrice || shipment.price;
    document.getElementById('result-price').textContent = price ? `₹${price.toLocaleString('en-IN')}` : '—';

    const driverCard = document.getElementById('driver-info');
    if (shipment.driver) {
        const driverUser = shipment.driver.user || shipment.driver;
        const driverName = driverUser.name || 'Driver';
        document.getElementById('driver-avatar').textContent = driverName.charAt(0).toUpperCase();
        document.getElementById('driver-name').textContent = driverName;
        document.getElementById('driver-vehicle').textContent =
            shipment.driver.vehicle?.type || shipment.driver.vehicleType || 'Assigned';
        driverCard.classList.remove('hidden');
    } else {
        driverCard.classList.add('hidden');
    }

    renderTimeline(shipment);
    renderMap(shipment);

    if (window.lucide) lucide.createIcons();
}

function renderTimeline(shipment) {
    const container = document.getElementById('timeline');
    container.innerHTML = '';

    const STEPS = ['pending', 'assigned', 'picked-up', 'in-transit', 'delivered'];
    const currentIdx = STEPS.indexOf(shipment.status);

    const historyMap = {};
    (shipment.statusHistory || []).forEach(h => { historyMap[h.status] = h; });

    STEPS.forEach((step, idx) => {
        const cfg = STATUS_CONFIG[step];
        const isDone = idx <= currentIdx && shipment.status !== 'cancelled';
        const isCurrent = step === shipment.status;
        const isLast = idx === STEPS.length - 1;
        const histEntry = historyMap[step];

        const el = document.createElement('div');
        el.className = 'flex gap-4';
        el.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? cfg.color : 'bg-gray-100 text-gray-400'} ${isCurrent ? 'ring-4 ring-offset-2 ring-blue-300' : ''}">
                    <i data-lucide="${cfg.icon}" class="w-5 h-5"></i>
                </div>
                ${!isLast ? `<div class="w-0.5 flex-1 ${isDone ? 'bg-blue-300' : 'bg-gray-200'} my-1"></div>` : ''}
            </div>
            <div class="pb-6 flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <p class="font-semibold text-dark text-sm">${cfg.label}</p>
                    ${isCurrent ? '<span class="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">Current</span>' : ''}
                </div>
                ${histEntry ? `
                    <p class="text-xs text-secondary">${new Date(histEntry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    ${histEntry.note ? `<p class="text-xs text-secondary mt-0.5">${histEntry.note}</p>` : ''}
                ` : `<p class="text-xs text-gray-300">${isDone ? 'Completed' : 'Pending'}</p>`}
            </div>
        `;
        container.appendChild(el);
    });

    if (window.lucide) lucide.createIcons();
}

// --- Leaflet Map ---
function renderMap(shipment) {
    if (typeof L === 'undefined') return;
    const mapEl = document.getElementById('tracking-map');
    if (!mapEl) return;

    const CITY_COORDS = {
        'mumbai': [19.0760, 72.8777], 'delhi': [28.7041, 77.1025],
        'bangalore': [12.9716, 77.5946], 'bengaluru': [12.9716, 77.5946],
        'chennai': [13.0827, 80.2707], 'kolkata': [22.5726, 88.3639],
        'hyderabad': [17.3850, 78.4867], 'pune': [18.5204, 73.8567],
        'ahmedabad': [23.0225, 72.5714], 'jaipur': [26.9124, 75.7873],
        'surat': [21.1702, 72.8311], 'lucknow': [26.8467, 80.9462],
        'chandigarh': [30.7333, 76.7794], 'bhopal': [23.2599, 77.4126],
        'nagpur': [21.1458, 79.0882], 'indore': [22.7196, 75.8577],
        'patna': [25.5941, 85.1376], 'agra': [27.1767, 78.0081]
    };

    function getCoords(location) {
        if (!location) return null;
        if (location.coordinates?.lat && location.coordinates?.lng)
            return [location.coordinates.lat, location.coordinates.lng];
        const city = (location.city || location.address || '').toLowerCase();
        for (const [key, coords] of Object.entries(CITY_COORDS)) {
            if (city.includes(key)) return coords;
        }
        return null;
    }

    const pickupCoords = getCoords(shipment.pickupLocation);
    const deliveryCoords = getCoords(shipment.deliveryLocation);

    if (leafletMap) { leafletMap.remove(); leafletMap = null; }

    const center = pickupCoords || deliveryCoords || [20.5937, 78.9629];
    leafletMap = L.map('tracking-map').setView(center, 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(leafletMap);

    const greenIcon = L.divIcon({ html: '📦', className: '', iconSize: [24, 24] });
    const redIcon = L.divIcon({ html: '🏁', className: '', iconSize: [24, 24] });
    const truckIcon = L.divIcon({ html: '🚛', className: '', iconSize: [24, 24] });

    if (pickupCoords) L.marker(pickupCoords, { icon: greenIcon }).addTo(leafletMap)
        .bindPopup('📦 Pickup: ' + (shipment.pickupLocation?.address || 'Pickup'));
    if (deliveryCoords) L.marker(deliveryCoords, { icon: redIcon }).addTo(leafletMap)
        .bindPopup('🏁 Delivery: ' + (shipment.deliveryLocation?.address || 'Delivery'));

    const driverCoords = shipment.driver?.currentLocation?.coordinates;
    if (driverCoords?.lat && driverCoords?.lng) {
        L.marker([driverCoords.lat, driverCoords.lng], { icon: truckIcon })
            .addTo(leafletMap).bindPopup('🚛 Driver Location');
    }

    if (pickupCoords && deliveryCoords) {
        L.polyline([pickupCoords, deliveryCoords], { color: '#2563eb', dashArray: '8,6', weight: 3 }).addTo(leafletMap);
        leafletMap.fitBounds([pickupCoords, deliveryCoords], { padding: [40, 40] });
    }
}

// Form submission
document.getElementById('track-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('tracking-input').value;
    trackShipment(id);
});

// Auto-track from URL param
const urlParams = new URLSearchParams(window.location.search);
const urlId = urlParams.get('id') || urlParams.get('trackingId');
if (urlId) {
    document.getElementById('tracking-input').value = urlId;
    trackShipment(urlId);
}

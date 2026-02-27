/**
 * quote.js - Real-time freight quote calculator
 * Public page — no authentication required
 */

// Pricing formula (mirrors Shipment model calculation)
const VEHICLE_RATES = {
    'Mini Truck (7ft)': { base: 2000, perKg: 1.5, label: 'Mini Truck' },
    'Standard Truck (14ft)': { base: 3500, perKg: 1.2, label: 'Standard Truck' },
    'Large Truck (19ft)': { base: 5000, perKg: 1.0, label: 'Large Truck' },
    'Container (20ft)': { base: 7000, perKg: 0.8, label: 'Container' },
    'Refrigerated': { base: 4500, perKg: 2.0, label: 'Refrigerated' }
};

function calculateQuote(weightKg, vehicleType) {
    const rate = VEHICLE_RATES[vehicleType] || VEHICLE_RATES['Standard Truck (14ft)'];
    const baseFare = rate.base;
    const weightCharge = Math.round(weightKg * rate.perKg);
    const vehicleSurcharge = Math.round(baseFare * 0.1);
    const total = baseFare + weightCharge + vehicleSurcharge;
    return { baseFare, weightCharge, vehicleSurcharge, total };
}

function rupees(n) {
    return '₹' + n.toLocaleString('en-IN');
}

function updateQuote() {
    const pickup = document.getElementById('q-pickup').value.trim();
    const delivery = document.getElementById('q-delivery').value.trim();
    const weight = parseInt(document.getElementById('q-weight').value) || 1000;
    const vehicleInput = document.querySelector('input[name="vehicle"]:checked');
    const vehicle = vehicleInput ? vehicleInput.value : 'Standard Truck (14ft)';

    const noteEl = document.getElementById('quote-note');

    if (!pickup || !delivery) {
        document.getElementById('quote-price').textContent = '₹ —';
        noteEl.textContent = 'Fill in pickup & delivery to get a quote';
        ['q-base', 'q-weight-charge', 'q-vehicle-charge', 'q-total'].forEach(id => {
            document.getElementById(id).textContent = '₹—';
        });
        return;
    }

    const { baseFare, weightCharge, vehicleSurcharge, total } = calculateQuote(weight, vehicle);

    document.getElementById('quote-price').textContent = rupees(total);
    document.getElementById('q-base').textContent = rupees(baseFare);
    document.getElementById('q-weight-charge').textContent = rupees(weightCharge);
    document.getElementById('q-vehicle-charge').textContent = rupees(vehicleSurcharge);
    document.getElementById('q-total').textContent = rupees(total);
    noteEl.textContent = `${pickup} → ${delivery} · ${weight.toLocaleString()} kg · ${vehicle.split(' (')[0]}`;

    // Update Book Now link with pre-filled params
    const bookBtn = document.getElementById('book-now-btn');
    const params = new URLSearchParams({ pickup, delivery, weight, vehicle });
    bookBtn.href = `register.html?${params.toString()}`;
}

// Weight slider label update
document.getElementById('q-weight').addEventListener('input', (e) => {
    const w = parseInt(e.target.value);
    document.getElementById('weight-display').textContent = w.toLocaleString() + ' kg';
    updateQuote();
});

// Pickup / Delivery inputs
['q-pickup', 'q-delivery'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateQuote);
});

// Vehicle type radio cards — visual selection highlight
document.getElementById('vehicle-options').addEventListener('change', (e) => {
    document.querySelectorAll('.vehicle-option').forEach(label => {
        label.classList.remove('border-primary', 'bg-blue-50');
        label.classList.add('border-gray-200');
    });
    if (e.target.type === 'radio') {
        e.target.closest('.vehicle-option').classList.add('border-primary', 'bg-blue-50');
        e.target.closest('.vehicle-option').classList.remove('border-gray-200');
    }
    updateQuote();
});

// Mark default selected vehicle
document.addEventListener('DOMContentLoaded', () => {
    const defaultVehicle = document.querySelector('input[name="vehicle"][checked]');
    if (defaultVehicle) {
        defaultVehicle.closest('.vehicle-option').classList.add('border-primary', 'bg-blue-50');
    } else {
        // Select first
        const first = document.querySelector('input[name="vehicle"]');
        if (first) {
            first.checked = true;
            first.closest('.vehicle-option').classList.add('border-primary', 'bg-blue-50');
        }
    }

    // Pre-fill from query params if coming from tracking page etc.
    const params = new URLSearchParams(window.location.search);
    if (params.get('pickup')) document.getElementById('q-pickup').value = params.get('pickup');
    if (params.get('delivery')) document.getElementById('q-delivery').value = params.get('delivery');
    if (params.get('weight')) {
        document.getElementById('q-weight').value = params.get('weight');
        document.getElementById('weight-display').textContent = parseInt(params.get('weight')).toLocaleString() + ' kg';
    }
    if (params.get('vehicle')) {
        const vehicleInputs = document.querySelectorAll('input[name="vehicle"]');
        vehicleInputs.forEach(inp => {
            if (inp.value === params.get('vehicle')) {
                inp.checked = true;
                document.querySelectorAll('.vehicle-option').forEach(l => l.classList.remove('border-primary', 'bg-blue-50'));
                inp.closest('.vehicle-option').classList.add('border-primary', 'bg-blue-50');
            }
        });
    }

    updateQuote();
});

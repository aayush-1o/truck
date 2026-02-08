/**
 * Quote Calculator - Dynamic Price Calculation
 * Handles quote form submission and price calculation
 */

// Initialize quote calculator
document.addEventListener('DOMContentLoaded', () => {
    const quoteForm = document.getElementById('quote-form');
    if (quoteForm) {
        quoteForm.addEventListener('submit', handleQuoteSubmission);
    }

    // Add real-time calculation on input change
    const inputs = ['from-location', 'to-location', 'weight', 'vehicle-type'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', debounce(calculateQuote, 500));
        }
    });
});

// Handle quote form submission
async function handleQuoteSubmission(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const quoteData = {
        fromLocation: formData.get('from'),
        toLocation: formData.get('to'),
        weight: parseFloat(formData.get('weight')),
        vehicleType: formData.get('vehicle-type'),
        cargoType: formData.get('cargo-type')
    };

    // Validation
    if (!quoteData.fromLocation || !quoteData.toLocation) {
        showQuoteError('Please enter both pickup and delivery locations');
        return;
    }

    if (!quoteData.weight || quoteData.weight <= 0) {
        showQuoteError('Please enter a valid weight');
        return;
    }

    if (!quoteData.vehicleType) {
        showQuoteError('Please select a vehicle type');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Calculating...';
    submitBtn.disabled = true;

    try {
        const estimate = await calculateQuotePricing(quoteData);
        showQuoteResult(estimate);

        // If user is logged in, optionally save the quote
        if (window.API && window.API.auth.isAuthenticated()) {
            saveQuoteToProfile(quoteData, estimate);
        }

    } catch (error) {
        showQuoteError('Failed to calculate quote. Please try again.');
        console.error('Quote calculation error:', error);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Calculate quote pricing
async function calculateQuotePricing(quoteData) {
    // Base pricing structure (₹/km)
    const vehicleRates = {
        'small': 15,      // Pickup, Small Van
        'medium': 25,     // Mini Truck
        'large': 40,      // Large Truck
        'xlarge': 60      // Container
    };

    // Weight multipliers
    const weightFactor = quoteData.weight > 1000 ? 1.3 :
        quoteData.weight > 500 ? 1.15 : 1.0;

    // Estimate distance (in real app, would use Google Maps API)
    const estimatedDistance = estimateDistance(quoteData.fromLocation, quoteData.toLocation);

    // Base price
    const ratePerKm = vehicleRates[quoteData.vehicleType] || vehicleRates['medium'];
    let basePrice = estimatedDistance * ratePerKm;

    // Apply weight factor
    basePrice *= weightFactor;

    // Add fuel and toll estimates
    const fuelCost = estimatedDistance * 5; // ₹5/km average fuel
    const tollCharges = Math.floor(estimatedDistance / 100) * 150; // ₹150 per 100km approx

    // Final price with overhead (15% platform fee)
    const platformFee = basePrice * 0.15;
    const totalPrice = Math.ceil(basePrice + fuelCost + tollCharges + platformFee);

    return {
        distance: estimatedDistance,
        basePrice: Math.ceil(basePrice),
        fuelCost: Math.ceil(fuelCost),
        tollCharges,
        platformFee: Math.ceil(platformFee),
        totalPrice,
        breakdown: {
            perKmRate: ratePerKm,
            weightFactor,
            ...quoteData
        }
    };
}

// Estimate distance between locations (simplified - would use real API)
function estimateDistance(from, to) {
    // This is a mock calculation - in production, use Google Maps Distance Matrix API
    // For now, return a random distance between 50-500 km
    const hash = (from + to).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 50 + (hash % 450);
}

// Show quote result
function showQuoteResult(estimate) {
    const resultContainer = document.getElementById('quote-result');
    if (!resultContainer) {
        // Create modal if doesn't exist
        createQuoteResultModal(estimate);
        return;
    }

    resultContainer.innerHTML = `
        <div class="bg-gradient-to-r from-primary to-accent text-white p-8 rounded-2xl shadow-2xl">
            <div class="text-center mb-6">
                <h3 class="text-3xl font-bold mb-2">Your Estimated Quote</h3>
                <p class="text-blue-100">Based on current market rates</p>
            </div>
            
            <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
                <div class="flex items-baseline justify-center gap-2">
                    <span class="text-5xl font-bold">₹${estimate.totalPrice.toLocaleString()}</span>
                    <span class="text-blue-100">total</span>
                </div>
                <p class="text-center text-blue-100 mt-2">${estimate.distance} km • ${estimate.breakdown.vehicleType} vehicle</p>
            </div>
            
            <div class="space-y-3 mb-6">
                <div class="flex justify-between text-sm">
                    <span class="text-blue-100">Base Transport Charge</span>
                    <span class="font-semibold">₹${estimate.basePrice.toLocaleString()}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-blue-100">Fuel Charges</span>
                    <span class="font-semibold">₹${estimate.fuelCost.toLocaleString()}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-blue-100">Toll Charges</span>
                    <span class="font-semibold">₹${estimate.tollCharges.toLocaleString()}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-blue-100">Platform Fee</span>
                    <span class="font-semibold">₹${estimate.platformFee.toLocaleString()}</span>
                </div>
            </div>
            
            <div class="flex gap-3">
                <a href="pages/register.html" class="flex-1 bg-white text-primary px-6 py-3 rounded-lg font-semibold text-center hover:bg-blue-50 transition-colors">
                    Book Now
                </a>
                <button onclick="this.closest('#quote-result').innerHTML=''" class="px-6 py-3 border-2 border-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
                    New Quote
                </button>
            </div>
        </div>
    `;

    // Scroll to result
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Create quote result modal
function createQuoteResultModal(estimate) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.id = 'quote-modal';

    modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-md w-full p-6" onclick="event.stopPropagation()">
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-2xl font-bold text-dark">Your Quote</h3>
                <button onclick="document.getElementById('quote-modal').remove()" class="text-gray-400 hover:text-gray-600">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            
            <div class="bg-gradient-to-r from-primary to-accent text-white p-6 rounded-xl mb-4">
                <div class="text-center">
                    <p class="text-blue-100 mb-2">Total Estimated Cost</p>
                    <p class="text-4xl font-bold">₹${estimate.totalPrice.toLocaleString()}</p>
                    <p class="text-sm text-blue-100 mt-2">${estimate.distance} km journey</p>
                </div>
            </div>
            
            <div class="space-y-2 mb-6 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">Base Charge</span>
                    <span class="font-medium">₹${estimate.basePrice.toLocaleString()}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Fuel + Tolls</span>
                    <span class="font-medium">₹${(estimate.fuelCost + estimate.tollCharges).toLocaleString()}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Platform Fee</span>
                    <span class="font-medium">₹${estimate.platformFee.toLocaleString()}</span>
                </div>
            </div>
            
            <a href="pages/register.html" class="block w-full bg-primary text-white px-6 py-3 rounded-lg font-semibold text-center hover:bg-accent transition-colors">
                Book This Shipment
            </a>
        </div>
    `;

    modal.addEventListener('click', () => modal.remove());
    document.body.appendChild(modal);

    if (window.lucide) lucide.createIcons();
}

// Show quote error
function showQuoteError(message) {
    const errorContainer = document.getElementById('quote-error');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
        setTimeout(() => errorContainer.classList.add('hidden'), 5000);
    } else {
        alert(message);
    }
}

// Real-time quote calculation (debounced)
async function calculateQuote() {
    const fromLocation = document.getElementById('from-location')?.value;
    const toLocation = document.getElementById('to-location')?.value;
    const weight = parseFloat(document.getElementById('weight')?.value);
    const vehicleType = document.getElementById('vehicle-type')?.value;

    if (fromLocation && toLocation && weight && vehicleType) {
        const estimate = await calculateQuotePricing({
            fromLocation,
            toLocation,
            weight,
            vehicleType
        });

        // Update price preview if exists
        const pricePreview = document.getElementById('price-preview');
        if (pricePreview) {
            pricePreview.textContent = `₹${estimate.totalPrice.toLocaleString()}`;
            pricePreview.classList.remove('hidden');
        }
    }
}

// Save quote to user profile (if logged in)
async function saveQuoteToProfile(quoteData, estimate) {
    try {
        // Optional: Save quote to backend for user's history
        // await window.API.quotes.save({ ...quoteData, estimate });
        console.log('Quote saved to profile:', { quoteData, estimate });
    } catch (error) {
        console.error('Failed to save quote:', error);
    }
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

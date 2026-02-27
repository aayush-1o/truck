/**
 * utils/geocoding.js
 * OpenRouteService geocoding + real driving distance calculation.
 * Free tier: 2,000 req/day — https://openrouteservice.org (no billing required)
 *
 * Key design principles:
 * - NEVER throws — always returns a safe fallback value
 * - In-memory cache with 24-hour TTL to avoid redundant API calls
 * - AbortSignal.timeout() ensures hung requests don't block shipment creation
 */

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_BASE = 'https://api.openrouteservice.org';
const FALLBACK_DISTANCE_KM = 100; // Used when geocoding/ORS is unavailable

// In-memory geocoding cache: address string → { lat, lng }
// Key: normalized address string
// Value: { coords: { lat, lng }, expiresAt: timestamp }
const geocodeCache = new Map();

/**
 * Geocode an address string to { lat, lng } coordinates.
 * Uses ORS Geocode Search (Pelias) API.
 *
 * @param {string} address - Human-readable address, e.g. "Mumbai, Maharashtra"
 * @returns {Promise<{lat: number, lng: number} | null>} Coordinates, or null on failure.
 */
async function geocodeAddress(address) {
    if (!ORS_API_KEY) return null;
    if (!address || typeof address !== 'string') return null;

    const normalizedAddress = address.trim().toLowerCase();

    // Check cache first — avoids redundant API calls for repeated addresses
    const cached = geocodeCache.get(normalizedAddress);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.coords;
    }

    try {
        const url = new URL(`${ORS_BASE}/geocode/search`);
        url.searchParams.set('api_key', ORS_API_KEY);
        url.searchParams.set('text', address);
        url.searchParams.set('size', '1');
        url.searchParams.set('layers', 'locality,region,country');

        const res = await fetch(url.toString(), {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5-second hard timeout
        });

        if (!res.ok) {
            console.warn(`⚠️  Geocoding API error for "${address}": HTTP ${res.status}`);
            return null;
        }

        const data = await res.json();
        const feature = data.features?.[0];

        if (!feature?.geometry?.coordinates) {
            console.warn(`⚠️  No geocoding result for "${address}"`);
            return null;
        }

        // ORS returns coordinates as [lng, lat] (GeoJSON convention)
        const coords = {
            lng: feature.geometry.coordinates[0],
            lat: feature.geometry.coordinates[1]
        };

        // Cache for 24 hours — city-level addresses rarely change
        geocodeCache.set(normalizedAddress, {
            coords,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000
        });

        return coords;
    } catch (err) {
        // Swallow all errors — network failure, timeout, malformed JSON
        console.warn(`⚠️  Geocoding failed for "${address}": ${err.message}`);
        return null;
    }
}

/**
 * Calculate real driving distance in km between two address strings.
 * Uses ORS Directions API with driving-car profile.
 *
 * Fallback behaviour (always returns a number, never throws):
 * - ORS_API_KEY not set → returns FALLBACK_DISTANCE_KM (100) with a console warning
 * - Either address fails to geocode → returns FALLBACK_DISTANCE_KM
 * - ORS Directions API fails → returns FALLBACK_DISTANCE_KM
 *
 * @param {string} pickupAddress
 * @param {string} deliveryAddress
 * @returns {Promise<number>} Driving distance in km, rounded to nearest integer.
 */
async function getDistanceKm(pickupAddress, deliveryAddress) {
    if (!ORS_API_KEY) {
        console.warn('⚠️  ORS_API_KEY not set — using fallback distance of 100km');
        return FALLBACK_DISTANCE_KM;
    }

    try {
        // Geocode both addresses concurrently
        const [pickup, delivery] = await Promise.all([
            geocodeAddress(pickupAddress),
            geocodeAddress(deliveryAddress)
        ]);

        if (!pickup || !delivery) {
            console.warn(`⚠️  Could not geocode address(es) — using fallback distance`);
            return FALLBACK_DISTANCE_KM;
        }

        // ORS Directions API expects coordinates as [lng, lat]
        const res = await fetch(`${ORS_BASE}/v2/directions/driving-car`, {
            method: 'POST',
            headers: {
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: [
                    [pickup.lng, pickup.lat],
                    [delivery.lng, delivery.lat]
                ]
            }),
            signal: AbortSignal.timeout(8000) // 8-second hard timeout
        });

        if (!res.ok) {
            console.warn(`⚠️  ORS Directions API error: HTTP ${res.status}`);
            return FALLBACK_DISTANCE_KM;
        }

        const data = await res.json();
        const distanceMeters = data.routes?.[0]?.summary?.distance;

        if (!distanceMeters || typeof distanceMeters !== 'number') {
            console.warn('⚠️  ORS Directions response missing distance — using fallback');
            return FALLBACK_DISTANCE_KM;
        }

        const distanceKm = Math.round(distanceMeters / 1000);
        console.log(`🗺️  Distance ${pickupAddress} → ${deliveryAddress}: ${distanceKm}km`);
        return distanceKm;

    } catch (err) {
        // Covers: AbortError (timeout), network failures, JSON parse errors
        console.warn(`⚠️  Distance calculation failed: ${err.message} — using fallback`);
        return FALLBACK_DISTANCE_KM;
    }
}

module.exports = { geocodeAddress, getDistanceKm };

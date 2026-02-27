/**
 * API Client - Centralized API communication layer
 * Handles all HTTP requests, authentication, and error handling
 */

// API Configuration
// Auto-detect environment: use localhost in dev, production URL on the live server
const API_CONFIG = {
    baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.protocol}//${window.location.host}/api`
        : 'https://truck-production.up.railway.app/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
};

// Token Management
const TokenManager = {
    setToken(token) {
        localStorage.setItem('authToken', token);
    },

    getToken() {
        return localStorage.getItem('authToken');
    },

    removeToken() {
        localStorage.removeItem('authToken');
    },

    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        try {
            // Decode the JWT payload (base64url) and check expiry
            // This is safe — the payload is public data, not the signature
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch {
            // Malformed token — treat as unauthenticated
            this.removeToken();
            return false;
        }
    }
};

// User Management
const UserManager = {
    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    removeUser() {
        localStorage.removeItem('user');
    },

    getUserRole() {
        const user = this.getUser();
        return user ? user.role : null;
    }
};

// HTTP Client with interceptors
class APIClient {
    constructor(config) {
        this.baseURL = config.baseURL;
        this.timeout = config.timeout;
        this.defaultHeaders = config.headers;
    }

    /**
     * Build full URL with query parameters
     */
    buildURL(endpoint, params = {}) {
        const url = new URL(`${this.baseURL}${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
        return url.toString();
    }

    /**
     * Get headers with authentication
     */
    getHeaders(customHeaders = {}) {
        const headers = { ...this.defaultHeaders, ...customHeaders };

        const token = TokenManager.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Handle API response — includes silent token refresh on 401.
     * If an access token has expired, we automatically hit /api/refresh,
     * get a new access token from the HttpOnly cookie, and retry the
     * original request once. If refresh also fails, redirect to login.
     */
    async handleResponse(response, method, endpoint, options) {
        if (!response.ok) {
            const error = await response.json().catch(() => ({
                message: response.statusText || 'An error occurred'
            }));

            // Handle authentication errors — attempt silent refresh first
            if (response.status === 401 && !this._isRefreshing && endpoint !== '/refresh') {
                this._isRefreshing = true;
                try {
                    const baseURL = this.baseURL.replace('/api', '');
                    const refreshRes = await fetch(`${baseURL}/api/refresh`, {
                        method: 'POST',
                        credentials: 'include' // Sends the HttpOnly refreshToken cookie
                    });

                    if (refreshRes.ok) {
                        const refreshData = await refreshRes.json();
                        TokenManager.setToken(refreshData.token);
                        this._isRefreshing = false;
                        // Retry the original request with the new access token
                        return this.request(method, endpoint, options);
                    }
                } catch (refreshErr) {
                    // Refresh attempt itself failed — fall through to redirect
                } finally {
                    this._isRefreshing = false;
                }

                // Refresh failed — clear everything and redirect to login
                TokenManager.removeToken();
                UserManager.removeUser();
                const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : '/pages/login.html';
                window.location.href = loginPath;
            } else if (response.status === 401) {
                TokenManager.removeToken();
                UserManager.removeUser();
                const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : '/pages/login.html';
                window.location.href = loginPath;
            }

            throw {
                status: response.status,
                message: error.message || 'API request failed',
                data: error
            };
        }

        return response.json();
    }

    /**
     * Generic request method
     */
    async request(method, endpoint, options = {}) {
        const { data, params, headers: customHeaders, ...otherOptions } = options;

        const url = this.buildURL(endpoint, params);
        const headers = this.getHeaders(customHeaders);

        const config = {
            method,
            headers,
            credentials: 'include', // Send HttpOnly refresh cookie with every request
            ...otherOptions
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            return await this.handleResponse(response, method, endpoint, options);
        } catch (error) {
            if (error.status) {
                throw error;
            } else {
                throw {
                    status: 0,
                    message: 'Network error. Please check your connection.',
                    data: error
                };
            }
        }
    }

    /**
     * GET request
     */
    get(endpoint, params = {}, options = {}) {
        return this.request('GET', endpoint, { params, ...options });
    }

    /**
     * POST request
     */
    post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, { data, ...options });
    }

    /**
     * PUT request
     */
    put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, { data, ...options });
    }

    /**
     * PATCH request
     */
    patch(endpoint, data, options = {}) {
        return this.request('PATCH', endpoint, { data, ...options });
    }

    /**
     * DELETE request
     */
    delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, options);
    }
}

// Create API client instance
const api = new APIClient(API_CONFIG);

// API Service Methods
const AuthAPI = {
    /**
     * Register new user
     */
    async register(userData) {
        const response = await api.post('/register', userData);
        return response;
    },

    /**
     * Login user
     */
    async login(credentials) {
        const response = await api.post('/login', credentials);
        if (response.success && response.token) {
            TokenManager.setToken(response.token);
            UserManager.setUser(response.user);
        }
        return response;
    },

    /**
     * Logout user — clears HttpOnly cookie on server, then clears localStorage.
     */
    async logout() {
        try {
            // Tell the server to clear the HttpOnly refreshToken cookie
            await fetch(`${api.baseURL.replace('/api', '')}/api/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            // Fire and forget — proceed with local cleanup regardless
        }
        TokenManager.removeToken();
        UserManager.removeUser();
        const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : '/pages/login.html';
        window.location.href = loginPath;
    },

    /**
     * Request password reset
     */
    async forgotPassword(email) {
        return await api.post('/forgot-password', { email });
    },

    /**
     * Verify reset token
     */
    async verifyToken(token) {
        return await api.post('/verify-token', { token });
    },

    /**
     * Reset password
     */
    async resetPassword(token, newPassword) {
        return await api.post('/reset-password', { token, newPassword });
    },

    /**
     * Get current user
     */
    getCurrentUser() {
        return UserManager.getUser();
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return TokenManager.isAuthenticated();
    }
};

const ShipmentAPI = {
    /**
     * Create new shipment
     */
    async create(shipmentData) {
        return await api.post('/shipments', shipmentData);
    },

    /**
     * Get all shipments
     */
    async getAll(filters = {}) {
        return await api.get('/shipments', filters);
    },

    /**
     * Get single shipment by ID
     */
    async getById(id) {
        return await api.get(`/shipments/${id}`);
    },

    /**
     * Update shipment
     */
    async update(id, updates) {
        return await api.put(`/shipments/${id}`, updates);
    },

    /**
     * Update shipment status
     */
    async updateStatus(id, status) {
        return await api.patch(`/shipments/${id}/status`, { status });
    },

    /**
     * Cancel/Delete shipment
     */
    async cancel(id) {
        return await api.delete(`/shipments/${id}`);
    },

    /**
     * Track shipment by tracking ID (public)
     */
    async track(trackingId) {
        return await api.get(`/shipments/track/${trackingId}`);
    }
};

const UserAPI = {
    /**
     * Get all users (Admin only)
     */
    async getAll() {
        return await api.get('/users');
    },

    /**
     * Get user profile
     */
    async getProfile() {
        return await api.get('/users/profile');
    },

    /**
     * Update user profile
     */
    async updateProfile(updates) {
        return await api.put('/users/profile', updates);
    },

    /**
     * Deactivate user (Admin only)
     */
    async deactivate(userId) {
        return await api.delete(`/users/${userId}`);
    },

    /**
     * Update user role (Admin only)
     */
    async updateRole(userId, role) {
        return await api.patch(`/users/${userId}/role`, { role });
    },

    /**
     * Get user statistics (Admin only)
     */
    async getStats() {
        return await api.get('/users/stats');
    }
};

const DriverAPI = {
    /**
     * Create driver profile
     */
    async createProfile(driverData) {
        return await api.post('/drivers', driverData);
    },

    /**
     * Get all drivers
     */
    async getAll() {
        return await api.get('/drivers');
    },

    /**
     * Get driver profile
     */
    async getProfile() {
        return await api.get('/drivers/profile');
    },

    /**
     * Update driver profile
     */
    async updateProfile(updates) {
        return await api.put('/drivers/profile', updates);
    },

    /**
     * Update driver location
     */
    async updateLocation(location) {
        return await api.put('/drivers/location', location);
    },

    /**
     * Toggle availability
     */
    async toggleAvailability(isAvailable) {
        return await api.patch('/drivers/availability', { isAvailable });
    },

    /**
     * Get driver statistics (Phase 2 endpoint)
     */
    async getStats() {
        return await api.get('/drivers/stats');
    },

    /**
     * Get driver earnings
     */
    async getEarnings() {
        return await api.get('/drivers/earnings');
    }
};

// UI Helper Functions
const UIHelpers = {
    /**
     * Show loading state
     */
    showLoading(element, text = 'Loading...') {
        if (element) {
            element.disabled = true;
            element.dataset.originalText = element.textContent;
            element.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> ${text}`;
            if (window.lucide) lucide.createIcons();
        }
    },

    /**
     * Hide loading state
     */
    hideLoading(element) {
        if (element && element.dataset.originalText) {
            element.disabled = false;
            element.textContent = element.dataset.originalText;
        }
    },

    /**
     * Show success message
     */
    showSuccess(message, duration = 3000) {
        this.showNotification(message, 'success', duration);
    },

    /**
     * Show error message
     */
    showError(message, duration = 5000) {
        this.showNotification(message, 'error', duration);
    },

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        const existing = document.querySelector('.api-notification');
        if (existing) existing.remove();

        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-yellow-500'
        };
        const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info';

        // Build DOM safely — no innerHTML with user-controlled strings (XSS prevention)
        const notification = document.createElement('div');
        notification.className = `api-notification fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in-down max-w-md`;

        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center gap-3';

        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', iconName);
        icon.className = 'w-5 h-5 flex-shrink-0';

        const text = document.createElement('p');
        text.className = 'font-medium';
        text.textContent = message; // textContent never executes injected scripts

        wrapper.appendChild(icon);
        wrapper.appendChild(text);
        notification.appendChild(wrapper);
        document.body.appendChild(notification);

        if (window.lucide) lucide.createIcons();

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    /**
     * Handle API errors
     */
    handleError(error, fallbackMessage = 'An error occurred') {
        console.error('API Error:', error);
        const message = error.message || fallbackMessage;
        this.showError(message);
    }
};

// Auth Guard - Protect pages that require authentication
function initAuthGuard() {
    const publicPages = [
        '/index.html', '/pages/login.html', '/pages/register.html',
        '/pages/forgot-password.html', '/pages/tracking.html', '/pages/quote.html'
    ];
    const currentPath = window.location.pathname;

    // Check if current page requires authentication
    const isPublicPage = publicPages.some(page => currentPath.endsWith(page) || currentPath === '/');

    if (!isPublicPage && !AuthAPI.isAuthenticated()) {
        const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : '/pages/login.html';
        window.location.href = loginPath;
        return;
    }

    // Role-based redirect
    if (AuthAPI.isAuthenticated()) {
        const user = AuthAPI.getCurrentUser();
        const roleDashboards = {
            admin: '/pages/admin-dashboard.html',
            shipper: '/pages/shipper-dashboard.html',
            driver: '/pages/driver-dashboard.html'
        };

        // If on login/register page and already authenticated, redirect to dashboard
        if (currentPath.endsWith('login.html') || currentPath.endsWith('register.html')) {
            window.location.href = roleDashboards[user.role] || '/';
        }
    }
}

// Initialize auth guard on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthGuard);
} else {
    initAuthGuard();
}

// ==============================
// Payment API
// ==============================
const PaymentAPI = {
    async createOrder(shipmentId) {
        return await api.post('/payments/order', { shipmentId });
    },
    async verify(data) {
        return await api.post('/payments/verify', data);
    },
    async getHistory() {
        return await api.get('/payments/history');
    }
};

// ==============================
// Notification API
// ==============================
const NotificationAPI = {
    async getAll() {
        return await api.get('/notifications');
    },
    async markRead(id) {
        return await api.patch(`/notifications/${id}/read`);
    },
    async markAllRead() {
        return await api.patch('/notifications/read-all');
    },
    async delete(id) {
        return await api.delete(`/notifications/${id}`);
    }
};

// Export for use in other scripts
window.API = {
    auth: AuthAPI,
    shipments: ShipmentAPI,
    users: UserAPI,
    drivers: DriverAPI,
    payments: PaymentAPI,
    notifications: NotificationAPI,
    ui: UIHelpers,
    tokenManager: TokenManager,
    userManager: UserManager
};

/**
 * theme.js - Dark mode toggle
 * Shared across all dashboard pages
 * Add <script src="../assets/js/theme.js"></script> to each dashboard
 */

(function () {
    // Apply saved theme immediately to avoid flash
    const saved = localStorage.getItem('ff-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('ff-theme', next);
        updateToggleIcons(next);
    }

    function updateToggleIcons(theme) {
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            const moonIcon = btn.querySelector('.moon-icon');
            const sunIcon = btn.querySelector('.sun-icon');
            if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'none' : 'block';
            if (sunIcon) sunIcon.style.display = theme === 'dark' ? 'block' : 'none';
        });
    }

    function injectToggleButton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const btn = document.createElement('button');
        btn.className = 'theme-toggle-btn p-2 text-secondary hover:bg-light rounded-lg transition-colors';
        btn.title = 'Toggle dark mode';
        btn.innerHTML = `
            <svg class="moon-icon w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
            <svg class="sun-icon w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="display:none">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>
            </svg>
        `;
        btn.addEventListener('click', toggleTheme);
        container.appendChild(btn);
        updateToggleIcons(saved);
    }

    // Auto-inject when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        injectToggleButton('theme-toggle-container');
        updateToggleIcons(saved);
    });

    window.toggleTheme = toggleTheme;
})();

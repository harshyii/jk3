/**
 * Haryana Tools - Main Application Entry
 * Initializes global services and triggers page-specific logic.
 */

import { UI } from './ui.js';
import { Utils } from './utils.js';

const App = {
    init() {
        console.log('🚀 Haryana Tools initializing...');
        
        // 1. Initialize shared UI components
        this.loadSharedPartials();
        
        // 2. Initialize lazy loading for images
        Utils.lazyLoad();
        
        // 3. Register global event listeners
        this.bindEvents();
    },

    loadSharedPartials() {
        // Logic to inject header/footer if using a fetch-based partial system
        // Or simple console log for build-time static injection
        console.log('Partials initialized.');
    },

    bindEvents() {
        // Global search triggers
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                // Navigate to search page or trigger dropdown
                console.log('Searching for:', e.target.value);
            }, 500));
        }
    }
};

// Launch the app
document.addEventListener('DOMContentLoaded', () => App.init());

export default App;
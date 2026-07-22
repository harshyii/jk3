/**
 * Haryana Tools - Data Access Layer
 * Fetches static JSON files from the build output directory
 */

// Use a version string to bust cache when you rebuild your data
const CACHE_VERSION = 'v1.0'; 

// Adjusted base URL to look outside src/pages/ into your build/dist directory structure
const BASE_URL = '././dist/data'; // Adjust if your folder nesting differs (e.g., './dist/data')

export const API = {
    /**
     * Generic fetcher with versioned caching
     */
    async fetchData(endpoint) {
        const cacheKey = `haryana_tools_${CACHE_VERSION}_${endpoint}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        try {
            // Ensure endpoint doesn't have a leading slash to prevent double slashes
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
            const response = await fetch(`${BASE_URL}/${cleanEndpoint}`);
            
            if (!response.ok) {
                throw new Error(`API Fetch failed: ${response.status} for ${endpoint}`);
            }

            const data = await response.json();
            
            // Cache the result
            localStorage.setItem(cacheKey, JSON.stringify(data));
            return data;
        } catch (error) {
            console.error(`API Error fetching ${endpoint}:`, error);
            return null;
        }
    },

    // --- Product Methods ---
    // --- Product Methods ---
    async getCatalog() {
        return await this.fetchData('catalog.json');
    },

    async getProduct(slug) {
        // Automatically sanitize and slugify the incoming slug (lowercases and replaces spaces with hyphens)
        const cleanSlug = slug
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-');

        return await this.fetchData(`products/${cleanSlug}.json`);
    },

    async getProduct(slug) {
        return await this.fetchData(`products/${slug}.json`);
    },

    // --- Blog Methods ---
    async getBlogs() {
        return await this.fetchData('blogs.json');
    },

    async getBlog(slug) {
        // Now unified to use fetchData for proper path resolution and caching
        return await this.fetchData(`blogs/${slug}.json`);
    },

    // --- Utilities ---
    async getSearchIndex() {
        return await this.fetchData('search.json');
    },

    /**
     * Clear all cached data (useful when running new builds)
     */
    clearCache() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('haryana_tools_')) {
                localStorage.removeItem(key);
            }
        });
    }
};

// Expose API globally for console debugging
window.API = API;
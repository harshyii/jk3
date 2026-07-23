/**
 * Haryana Tools - Category Controller
 * Manages product grid, filtering, sorting, and pagination.
 */

import { API } from './api.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';

const Category = {
    allProducts: [],
    filteredProducts: [],
    currentPage: 1,
    pageSize: 20,

    async init() {
        const urlParams = Utils.getQueryParams();
        const categorySlug = urlParams.get('slug'); // e.g., ?slug=power-tools

        if (UI && typeof UI.setLoading === 'function') {
            UI.setLoading(true);
        }

        try {
            const catalog = await API.getCatalog();
            
            // Store all products
            this.allProducts = catalog || [];

            // If a category slug is specified in URL, pre-filter by it
            if (categorySlug) {
                this.allProducts = this.allProducts.filter(p => Utils.slugify(p.Category || p.category || '') === categorySlug);
                const titleEl = document.getElementById('category-title');
                if (titleEl && this.allProducts.length > 0) {
                    titleEl.textContent = this.allProducts[0].Category || this.allProducts[0].category || 'Category Products';
                }
            }

            // Initial setup for filtered pool
            this.filteredProducts = [...this.allProducts];
            this.handleSearchAndFilter();

            // Bind Search Listener
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    this.currentPage = 1;
                    this.handleSearchAndFilter();
                });
            }

            // Bind Sort Listener
            const sortSelect = document.getElementById('sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.sortProducts(e.target.value);
                });
            }
        } catch (err) {
            console.error('❌ Error initializing category controller:', err);
        } finally {
            if (UI && typeof UI.setLoading === 'function') {
                UI.setLoading(false);
            }
        }
    },

    getRandomItems(arr, count) {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    },

    fuzzyMatch(query, text) {
        query = query.toLowerCase().trim();
        text = text.toLowerCase().trim();
        
        if (text.includes(query)) return true;

        // Typo / incomplete word tolerance (e.g., "dril" matching "drill")
        let qIndex = 0;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === query[qIndex]) {
                qIndex++;
            }
            if (qIndex === query.length) return true;
        }
        return false;
    },

    handleSearchAndFilter() {
        const searchInput = document.getElementById('search-input');
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        const titleEl = document.getElementById('category-title');

        if (searchTerm === '') {
            // No search yet: show random selection of items as recommendations
            this.filteredProducts = this.getRandomItems(this.allProducts, Math.min(this.pageSize, this.allProducts.length));
            if (titleEl && !Utils.getQueryParams().get('slug')) {
                titleEl.textContent = 'Featured Recommendations';
            }
        } else {
            // Search query entered: apply fuzzy match across name, title, and SKU
            this.filteredProducts = this.allProducts.filter(p => {
                const name = p.name || p.Title || p.title || '';
                const sku = p.sku || p.SKU || '';
                return this.fuzzyMatch(searchTerm, name) || this.fuzzyMatch(searchTerm, sku);
            });

            if (titleEl) {
                titleEl.textContent = `Search results for "${searchTerm}"`;
            }
        }

        this.render();
    },

    render() {
        const start = (this.currentPage - 1) * this.pageSize;
        const pageProducts = this.filteredProducts.slice(start, start + this.pageSize);
        
        const container = document.getElementById('product-grid');
        if (!container) return;

        if (pageProducts.length === 0) {
            container.innerHTML = '<p class="text-center w-100 py-5 text-muted">No matching products found.</p>';
            return;
        }

        container.innerHTML = pageProducts.map(p => `
            <a href="product.html?sku=${p.sku || p.SKU || ''}" class="product-card">
                <div class="product-img-container">
                    <img src="${p.image || p.Image || 'src/images/placeholder.jpg'}" alt="${p.name || p.Title || p.title || 'Product'}" onerror="this.src='src/images/placeholder.jpg'">
                </div>
                <div class="product-info">
                    <h5 class="card-title">${p.name || p.Title || p.title || 'Product Name'}</h5>
                    <div class="product-meta">
                        <span class="product-price">${Utils.formatCurrency ? Utils.formatCurrency(p.price || p.Price || 0) : '₹' + (p.price || p.Price || 0)}</span>
                    </div>
                </div>
            </a>
        `).join('');
    },

    sortProducts(criteria) {
        if (criteria === 'price-low') {
            this.filteredProducts.sort((a, b) => (parseFloat(a.price || a.Price || 0) - parseFloat(b.price || b.Price || 0)));
        } else if (criteria === 'price-high') {
            this.filteredProducts.sort((a, b) => (parseFloat(b.price || b.Price || 0) - parseFloat(a.price || a.Price || 0)));
        } else if (criteria === 'name') {
            this.filteredProducts.sort((a, b) => (a.name || a.Title || a.title || '').localeCompare(b.name || b.Title || b.title || ''));
        }
        this.render();
    }
};

document.addEventListener('DOMContentLoaded', () => Category.init());
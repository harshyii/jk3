/**
 * Haryana Tools - Brand Controller
 * Manages product listings by specific manufacturer/brand.
 */

import { API } from './api.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';

const Brand = {
    allProducts: [],

    async init() {
        const urlParams = Utils.getQueryParams();
        const brandSlug = urlParams.get('slug'); // e.g., ?slug=bosch

        if (!brandSlug) return;

        UI.setLoading(true);
        const catalog = await API.getCatalog();
        
        // Filter products where Brand slug matches
        this.allProducts = catalog.filter(p => Utils.slugify(p.Brand) === brandSlug);
        
        this.render(brandSlug);
        UI.setLoading(false);
    },

    render(brandName) {
        const container = document.getElementById('brand-product-grid');
        if (!container) return;

        // Header update
        const header = document.getElementById('brand-title');
        if (header) header.textContent = `Products by ${brandName.toUpperCase()}`;

        container.innerHTML = this.allProducts.map(p => `
            <div class="col-md-3 mb-4">
                <div class="card h-100">
                    <img src="${p.image}" class="card-img-top" alt="${p.name}">
                    <div class="card-body">
                        <h5 class="card-title">${p.name}</h5>
                        <p class="card-text text-primary">${Utils.formatCurrency(p.price)}</p>
                        <a href="/product/${p.slug}" class="btn btn-outline-primary w-100">View Product</a>
                    </div>
                </div>
            </div>
        `).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => Brand.init());
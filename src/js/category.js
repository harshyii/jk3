/**
 * Haryana Tools - Category Controller
 * Manages product grid, filtering, sorting, and pagination.
 */

import { API } from './api.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';

const Category = {
    allProducts: [],
    currentPage: 1,
    pageSize: 20,

    async init() {
        const urlParams = Utils.getQueryParams();
        const categorySlug = urlParams.get('slug'); // e.g., ?slug=power-tools

        UI.setLoading(true);
        const catalog = await API.getCatalog();
        
        // Filter products belonging to this category
        this.allProducts = catalog.filter(p => Utils.slugify(p.Category) === categorySlug);
        
        this.render();
        UI.setLoading(false);
    },

    render() {
        const start = (this.currentPage - 1) * this.pageSize;
        const pageProducts = this.allProducts.slice(start, start + this.pageSize);
        
        const container = document.getElementById('product-grid');
        if (!container) return;

        container.innerHTML = pageProducts.map(p => `
            <div class="col-md-3 mb-4">
                <div class="card h-100">
                    <img src="${p.image}" class="card-img-top" alt="${p.name}">
                    <div class="card-body">
                        <h5 class="card-title">${p.name}</h5>
                        <p class="card-text">${Utils.formatCurrency(p.price)}</p>
                        <a href="/product/${p.slug}" class="btn btn-primary">View</a>
                    </div>
                </div>
            </div>
        `).join('');
    },

    sortProducts(criteria) {
        if (criteria === 'price-low') this.allProducts.sort((a, b) => a.price - b.price);
        if (criteria === 'price-high') this.allProducts.sort((a, b) => b.price - a.price);
        this.render();
    }
};

document.addEventListener('DOMContentLoaded', () => Category.init());
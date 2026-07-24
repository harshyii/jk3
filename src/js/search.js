/**
 * Haryana Tools - Search Module
 * Handles product/blog searching, autocomplete, and results rendering.
 */

import { API } from './api.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';

export const SearchModule = {
    products: [],
    blogs: [],

    async init() {
        console.log("🔍 Initializing Search Module...");
        
        try {
            if (UI.setLoading) UI.setLoading(true);

            // Fetch products and blogs data concurrently
            const [productsData, blogsData] = await Promise.all([
                API.getProducts ? API.getProducts() : fetch('/dist/data/catalog.json').then(res => res.json()).catch(() => []),
                API.getBlogs ? API.getBlogs() : fetch('/dist/data/blogs.json').then(res => res.json()).catch(() => [])
            ]);

            this.products = Array.isArray(productsData) ? productsData : (productsData.products || []);
            this.blogs = Array.isArray(blogsData) ? blogsData : (blogsData.blogs || []);

            console.log(`Search loaded ${this.products.length} products and ${this.blogs.length} blogs.`);

            this.bindEvents();
            this.handleURLQuery();

        } catch (error) {
            console.error("❌ Error initializing search module:", error);
        } finally {
            if (UI.setLoading) UI.setLoading(false);
        }
    },

    bindEvents() {
        const searchInputs = document.querySelectorAll('.search-input, #search-input, input[name="q"]');
        
        searchInputs.forEach(input => {
            input.addEventListener('input', Utils.debounce((e) => {
                const query = e.target.value.trim();
                this.showAutocomplete(query, input);
            }, 300));

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = input.value.trim();
                    if (query) {
                        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
                    }
                }
            });
        });

        const searchForms = document.querySelectorAll('form.search-form, #search-form');
        searchForms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = form.querySelector('input[name="q"], .search-input');
                if (input) {
                    const query = input.value.trim();
                    if (query) {
                        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
                    }
                }
            });
        });
    },

    handleURLQuery() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');

        if (query) {
            const queryDisplay = document.getElementById('search-query-display');
            if (queryDisplay) {
                queryDisplay.textContent = query;
            }

            const searchInputs = document.querySelectorAll('.search-input, #search-input, input[name="q"]');
            searchInputs.forEach(input => {
                input.value = query;
            });

            this.performSearch(query);
        }
    },

    filterCatalog(query) {
        const lowerQ = query.toLowerCase();
        return this.products.filter(p => {
            const name = (p.name || p.Name || '').toLowerCase();
            const category = (p.category || p.Category || '').toLowerCase();
            const sku = (p.sku || p.SKU || '').toLowerCase();
            const desc = (p.description || p.Description || '').toLowerCase();
            return name.includes(lowerQ) || category.includes(lowerQ) || sku.includes(lowerQ) || desc.includes(lowerQ);
        });
    },

    filterBlogs(query) {
        const lowerQ = query.toLowerCase();
        return this.blogs.filter(b => {
            const title = (b.title || b.Title || '').toLowerCase();
            const summary = (b.summary || b.Summary || '').toLowerCase();
            const content = (b.content || b.Content || '').toLowerCase();
            return title.includes(lowerQ) || summary.includes(lowerQ) || content.includes(lowerQ);
        });
    },

    showAutocomplete(query, inputElement) {
        let dropdown = document.getElementById('search-autocomplete-dropdown');
        
        if (!query || query.length < 2) {
            if (dropdown) dropdown.remove();
            return;
        }

        const matchedProducts = this.filterCatalog(query).slice(0, 5);
        const matchedBlogs = this.filterBlogs(query).slice(0, 3);

        if (matchedProducts.length === 0 && matchedBlogs.length === 0) {
            if (dropdown) dropdown.remove();
            return;
        }

        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'search-autocomplete-dropdown';
            dropdown.className = 'dropdown-menu show shadow-sm border-0 position-absolute w-100 mt-1';
            dropdown.style.zIndex = '1050';
            inputElement.parentNode.style.position = 'relative';
            inputElement.parentNode.appendChild(dropdown);
        }

        let html = '';
        if (matchedProducts.length > 0) {
            html += `<h6 class="dropdown-header text-uppercase text-muted fs-7">Products</h6>`;
            matchedProducts.forEach(p => {
                html += `
                    <a class="dropdown-item d-flex align-items-center gap-2 py-2" href="product.html?slug=${p.slug || p.Slug}">
                        <img src="${p.image || p.Image || 'https://via.placeholder.com/40'}" style="width: 30px; height: 30px; object-fit: contain;" alt="">
                        <div class="text-truncate">
                            <div class="fw-medium text-dark text-truncate fs-7">${p.name || p.Name}</div>
                            <div class="text-primary fs-8">${Utils.formatCurrency ? Utils.formatCurrency(p.price || p.SalePrice || 0) : '₹' + (p.price || 0)}</div>
                        </div>
                    </a>
                `;
            });
        }

        if (matchedBlogs.length > 0) {
            html += `<div class="dropdown-divider"></div>`;
            html += `<h6 class="dropdown-header text-uppercase text-muted fs-7">Guides & Blogs</h6>`;
            matchedBlogs.forEach(b => {
                const blogImg = b.image || b.Image || b.thumbnail || b.Thumbnail || 'https://via.placeholder.com/40';
                html += `
                    <a class="dropdown-item d-flex align-items-center gap-2 py-2" href="blog.html?slug=${b.slug || b.Slug}">
                        <img src="${blogImg}" style="width: 30px; height: 30px; object-fit: cover;" alt="">
                        <div class="fw-medium text-dark text-truncate fs-7">${b.title || b.Title}</div>
                    </a>
                `;
            });
        }

        dropdown.innerHTML = html;

        document.addEventListener('click', function closeDropdown(e) {
            if (!inputElement.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    },

    performSearch(query) {
        const resultsContainer = document.getElementById('search-results-grid') || document.getElementById('product-grid');
        const counterContainer = document.getElementById('search-count');

        if (!resultsContainer) return;

        if (!query) {
            resultsContainer.innerHTML = '<p class="text-muted text-center col-12">Please enter a keyword to search products or guides.</p>';
            if (counterContainer) counterContainer.textContent = '';
            return;
        }

        const filteredProducts = this.filterCatalog(query);
        const filteredBlogs = this.filterBlogs(query);
        const totalResults = filteredProducts.length + filteredBlogs.length;

        if (counterContainer) {
            counterContainer.textContent = `Found ${totalResults} result(s) for "${query}"`;
        }

        if (totalResults === 0) {
            resultsContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <h4 class="text-muted">No products or blogs found matching "${query}".</h4>
                    <p class="text-secondary">Try searching with broader terms like "drill", "socket", or "maintenance".</p>
                </div>
            `;
            return;
        }

        let outputHtml = '';

        if (filteredProducts.length > 0) {
            outputHtml += `<div class="col-12 mb-3"><h3 class="h5 border-bottom pb-2">Products (${filteredProducts.length})</h3></div>`;
            outputHtml += filteredProducts.map(p => `
                <div class="card h-100 shadow-sm border-0" style="width: 100%;">
                    <div class="card-img-top-wrapper p-3 text-center bg-light" style="height: 180px; display: flex; align-items: center; justify-content: center;">
                        <img src="${p.image || p.Image || 'https://via.placeholder.com/300'}" class="img-fluid" alt="${p.name || p.Name}" style="max-height: 150px; object-fit: contain;" onerror="this.src='https://via.placeholder.com/300'">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <span class="badge bg-light text-dark mb-2 align-self-start">${p.category || p.Category || 'General'}</span>
                        <h5 class="card-title text-truncate fs-6" title="${p.name || p.Name}">${p.name || p.Name}</h5>
                        <p class="card-text text-primary fw-bold fs-5 mt-1">${Utils.formatCurrency ? Utils.formatCurrency(p.price || p.SalePrice || 0) : '₹' + (p.price || 0)}</p>
                        <div class="d-flex gap-2 mt-auto">
                            <a href="product.html?slug=${p.slug || p.Slug}" class="btn btn-outline-primary btn-sm w-50">Details</a>
                            <button class="btn btn-primary btn-sm w-50 add-to-cart-btn" 
                                data-slug="${p.slug || p.Slug}" 
                                data-name="${p.name || p.Name}" 
                                data-price="${p.price || p.SalePrice || 0}" 
                                data-image="${p.image || p.Image || 'https://via.placeholder.com/50'}">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        if (filteredBlogs.length > 0) {
            outputHtml += `<div class="col-12 mt-4 mb-3"><h3 class="h5 border-bottom pb-2">Industry Guides & Blogs (${filteredBlogs.length})</h3></div>`;
            outputHtml += filteredBlogs.map(b => {
                const blogImg = b.image || b.Image || b.thumbnail || b.Thumbnail || 'https://via.placeholder.com/300';
                return `
                    <div class="card h-100 shadow-sm border-0" style="width: 100%;">
                        <div class="card-img-top-wrapper bg-light" style="height: 160px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                            <img src="${blogImg}" class="w-100 h-100" alt="${b.title || b.Title}" style="object-fit: cover;" onerror="this.src='https://via.placeholder.com/300'">
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title text-dark fs-6">${b.title || b.Title}</h5>
                            <p class="card-text text-muted small flex-grow-1">${b.summary || b.Summary || ''}</p>
                            <a href="blog.html?slug=${b.slug || b.Slug}" class="btn btn-sm btn-dark w-100 mt-auto">Read Guide</a>
                        </div>
                    </div>
                `;
            }).join('');
        }

        resultsContainer.innerHTML = outputHtml;
    }
};

// Automatically initialize on load
document.addEventListener('DOMContentLoaded', () => {
    SearchModule.init();
});
/**
 * Haryana Tools - Search Handler Module
 * Handles live searching across products and blogs, autocomplete dropdown, and grid rendering.
 */

import { API } from './api.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';

const SearchModule = {
    catalog: [],
    blogs: [],

    async init() {
        UI.setLoading(true);
        try {
            // Load both product catalog and blogs index in parallel
            const [catalogData, blogsData] = await Promise.all([
                API.getCatalog() || [],
                API.getBlogs ? API.getBlogs() : Promise.resolve([]) // Fallback if API method name differs
            ]);

            this.catalog = catalogData;
            this.blogs = blogsData;
            console.log(`🔍 Search loaded ${this.catalog.length} products and ${this.blogs.length} blogs.`);

            this.bindEvents();

            const urlParams = new URLSearchParams(window.location.search);
            const queryParam = urlParams.get('q');
            
            if (queryParam) {
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = queryParam;
                
                const queryDisplay = document.getElementById('search-query-display');
                if (queryDisplay) queryDisplay.textContent = queryParam;

                this.performSearch(queryParam);
            }
        } catch (err) {
            console.error('❌ Error initializing search module:', err);
        } finally {
            UI.setLoading(false);
        }
    },

    bindEvents() {
        const searchInput = document.getElementById('search-input');
        const searchForm = document.getElementById('search-form');

        if (!searchInput) return;

        const parentWrapper = searchInput.parentElement;
        if (parentWrapper && getComputedStyle(parentWrapper).position === 'static') {
            parentWrapper.style.position = 'relative';
        }

        // Create autocomplete dropdown container
        let autocompleteBox = document.getElementById('search-autocomplete-list');
        if (!autocompleteBox) {
            autocompleteBox = document.createElement('div');
            autocompleteBox.id = 'search-autocomplete-list';
            autocompleteBox.className = 'dropdown-menu shadow w-100 border-0 mt-1';
            autocompleteBox.style.cssText = 'max-height: 400px; overflow-y: auto; z-index: 1050; display: none; position: absolute; left: 0; right: 0;';
            parentWrapper.appendChild(autocompleteBox);
        }

        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();

            debounceTimer = setTimeout(() => {
                const resultsContainer = document.getElementById('search-results-grid') || document.getElementById('product-grid');
                if (resultsContainer && window.location.pathname.includes('search.html')) {
                    this.performSearch(query);
                }
                this.renderAutocomplete(query, autocompleteBox);
            }, 300);
        });

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                const query = searchInput.value.trim();
                
                if (!window.location.pathname.includes('search.html')) {
                    return; 
                }

                e.preventDefault();
                autocompleteBox.style.display = 'none';
                
                const queryDisplay = document.getElementById('search-query-display');
                if (queryDisplay) queryDisplay.textContent = query;

                this.performSearch(query);
            });
        }

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !autocompleteBox.contains(e.target)) {
                autocompleteBox.style.display = 'none';
            }
        });
    },

    filterCatalog(query) {
        if (!query) return [];
        const lowerQuery = query.toLowerCase();
        return this.catalog.filter(p => {
            const name = (p.name || p.Name || '').toLowerCase();
            const brand = (p.brand || p.Brand || '').toLowerCase();
            const category = (p.category || p.Category || '').toLowerCase();
            const keywords = (p.SearchKeywords || p.searchKeywords || '').toLowerCase();

            return name.includes(lowerQuery) || 
                   brand.includes(lowerQuery) || 
                   category.includes(lowerQuery) || 
                   keywords.includes(lowerQuery);
        });
    },

    filterBlogs(query) {
        if (!query) return [];
        const lowerQuery = query.toLowerCase();
        return this.blogs.filter(b => {
            const title = (b.title || b.Title || '').toLowerCase();
            const summary = (b.summary || b.Summary || b.description || '').toLowerCase();
            const tags = (b.tags || b.Tags || '').toLowerCase();

            return title.includes(lowerQuery) || 
                   summary.includes(lowerQuery) || 
                   tags.includes(lowerQuery);
        });
    },

    renderAutocomplete(query, container) {
        if (!query || query.length < 2) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        const productMatches = this.filterCatalog(query).slice(0, 4);
        const blogMatches = this.filterBlogs(query).slice(0, 3);

        if (productMatches.length === 0 && blogMatches.length === 0) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        let html = '';

        // Render Product Suggestions Section
        if (productMatches.length > 0) {
            html += `<h6 class="dropdown-header text-uppercase text-muted fw-bold small bg-light py-1 px-3 mb-0">Products</h6>`;
            html += productMatches.map(p => `
                <a href="product.html?slug=${p.slug || p.Slug}" class="dropdown-item d-flex align-items-center py-2 px-3 border-bottom text-decoration-none">
                    <img src="${p.image || 'https://via.placeholder.com/40'}" alt="${p.name || p.Name}" style="width: 35px; height: 35px; object-fit: contain;" class="me-3 rounded bg-light p-1">
                    <div class="flex-grow-1 overflow-hidden">
                        <h6 class="mb-0 text-dark text-truncate small fw-bold">${p.name || p.Name}</h6>
                        <small class="text-muted">${p.category || p.Category || 'General'} • <span class="text-primary fw-semibold">₹${p.price || p.SalePrice || 0}</span></small>
                    </div>
                </a>
            `).join('');
        }

        // Render Blog / Guide Suggestions Section
        if (blogMatches.length > 0) {
            html += `<h6 class="dropdown-header text-uppercase text-muted fw-bold small bg-light py-1 px-3 mt-2 mb-0">Guides & Blogs</h6>`;
            html += blogMatches.map(b => `
                <a href="post.html?slug=${b.slug || b.Slug}" class="dropdown-item d-flex align-items-center py-2 px-3 border-bottom text-decoration-none">
                    <div class="flex-grow-1 overflow-hidden">
                        <h6 class="mb-0 text-dark text-truncate small fw-bold">📖 ${b.title || b.Title}</h6>
                        <small class="text-muted text-truncate d-block">${b.summary || b.Summary || ''}</small>
                    </div>
                </a>
            `).join('');
        }

        // View All Footer
        html += `
            <div class="p-2 text-center bg-light mt-1">
                <a href="search.html?q=${encodeURIComponent(query)}" class="btn btn-sm btn-primary w-100 text-decoration-none text-white">View all results for "${query}"</a>
            </div>
        `;

        container.innerHTML = html;
        container.style.display = 'block';
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

        // Render Products Grid if any found
        if (filteredProducts.length > 0) {
            outputHtml += `<div class="col-12 mb-3"><h3 class="h5 border-bottom pb-2">Products (${filteredProducts.length})</h3></div>`;
            outputHtml += filteredProducts.map(p => `
                <div class="col-md-3 mb-4">
                    <div class="card h-100 shadow-sm border-0">
                        <img src="${p.image || 'https://via.placeholder.com/300'}" class="card-img-top p-3" alt="${p.name || p.Name}" style="height: 200px; object-fit: contain;">
                        <div class="card-body d-flex flex-column">
                            <span class="badge bg-light text-dark mb-2 align-self-start">${p.category || p.Category || 'General'}</span>
                            <h5 class="card-title text-truncate" title="${p.name || p.Name}">${p.name || p.Name}</h5>
                            <p class="card-text text-primary fw-bold fs-5">${Utils.formatCurrency ? Utils.formatCurrency(p.price || p.SalePrice || 0) : '₹' + (p.price || 0)}</p>
                           <div class="d-flex gap-2 mt-auto">
                    <a href="product.html?slug=${p.slug || p.Slug}" class="btn btn-outline-primary w-50">Details</a>
                    <button class="btn btn-primary w-50 add-to-cart-btn" 
                            data-slug="${p.slug || p.Slug}" 
                            data-name="${p.name || p.Name}" 
                            data-price="${p.price || p.SalePrice || 0}" 
                            data-image="${p.image || p.Image || 'https://via.placeholder.com/50'}">
                        Add to Cart
                    </button>
                </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Render Blogs Section if any found
        if (filteredBlogs.length > 0) {
            outputHtml += `<div class="col-12 mt-4 mb-3"><h3 class="h5 border-bottom pb-2">Industry Guides & Blogs (${filteredBlogs.length})</h3></div>`;
            outputHtml += filteredBlogs.map(b => `
                <div class="col-md-4 mb-4">
                    <div class="card h-100 shadow-sm border-0">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title text-dark">${b.title || b.Title}</h5>
                            <p class="card-text text-muted small flex-grow-1">${b.summary || b.Summary || ''}</p>
                            <a href="?slug=${b.slug || b.Slug}" class="btn btn-sm btn-dark w-100 mt-auto">Read Guide</a>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        resultsContainer.innerHTML = outputHtml;
    }
};

document.addEventListener('DOMContentLoaded', () => SearchModule.init());
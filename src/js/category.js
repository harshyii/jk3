/**
 * Haryana Tools - Category Controller
 * Manages product grid, filtering, sorting, pagination, and cart shortcuts.
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
                const sku = p.sku || p.SKU || p.Id || p.id || '';
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

        container.innerHTML = pageProducts.map(p => {
            const productSku = p.sku || p.SKU || p.Id || p.id || '';
            const productName = p.name || p.Title || p.title || 'Product Name';
            const productImg = p.image || p.Image || '404.webp';
            const productPrice = p.price || p.Price || p.SalePrice || 0;

            return `
                <div class="product-card" data-sku="${productSku}">
                    <div class="product-img-container product-clickable" data-sku="${productSku}" style="cursor: pointer;">
                        <img src="${productImg}" alt="${productName}" onerror="this.src='404.webp'">
                    </div>
                    <div class="product-info">
                        <h5 class="card-title product-clickable" data-sku="${productSku}" style="cursor: pointer;">${productName}</h5>
                        <div class="product-meta">
                            <span class="product-price">${Utils.formatCurrency ? Utils.formatCurrency(productPrice) : '₹' + productPrice}</span>
                        </div>
                        <button class="btn btn-sm btn-primary add-to-cart-btn mt-2" data-sku="${productSku}">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.bindCardEvents();
    },

    bindCardEvents() {
        const container = document.getElementById('product-grid');
        if (!container) return;

        // Handle clicks on product image or title to navigate safely
        container.querySelectorAll('.product-clickable').forEach(el => {
            el.addEventListener('click', (e) => {
                const sku = e.currentTarget.getAttribute('data-sku');
                if (sku) {
                    window.location.href = `product.html?sku=${encodeURIComponent(sku)}`;
                }
            });
        });

        // Handle Add to Cart shortcut clicks
        container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering card navigation
                const sku = e.currentTarget.getAttribute('data-sku');
                
                // Find matching product from loaded catalog
                const productData = this.allProducts.find(p => (p.sku || p.SKU || p.Id || p.id) === sku);
                if (!productData) {
                    console.error('Product data not found for SKU:', sku);
                    return;
                }

                const cartItem = {
                    sku: sku,
                    slug: productData.slug || productData.Slug || '',
                    name: productData.name || productData.Title || productData.title || productData.Name || 'Product',
                    price: parseFloat(productData.price || productData.Price || productData.SalePrice || 0),
                    image: productData.image || productData.Image || '404.webp',
                    quantity: 1,
                    unit: productData.unit || 'PC'
                };

                // Retrieve and modify cart matching cart.js logic
                let cart = JSON.parse(localStorage.getItem('ht_cart') || '[]');
                const existingIndex = cart.findIndex(item => (item.sku === cartItem.sku) || (item.slug === cartItem.slug));

                if (existingIndex > -1) {
                    cart[existingIndex].quantity = (cart[existingIndex].quantity || cart[existingIndex].qty || 1) + 1;
                    if (cart[existingIndex].qty) cart[existingIndex].qty = cart[existingIndex].quantity;
                } else {
                    cart.push(cartItem);
                }

                localStorage.setItem('ht_cart', JSON.stringify(cart));
                
                // Broadcast sync event so header badges update immediately
                window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));

                // Update cart badge visually if present
                const badge = document.getElementById('cart-counter');
                if (badge) {
                    const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity || item.qty) || 1), 0);
                    badge.textContent = totalItems;
                    badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
                }

                if (UI && typeof UI.showToast === 'function') {
                    UI.showToast('Product added to cart successfully!', 'success');
                } else {
                    alert('Product added to cart!');
                }
            });
        });
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
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
        const categorySlug = urlParams.get('slug');

        if (UI && typeof UI.setLoading === 'function') {
            UI.setLoading(true);
        }

        try {
            const catalog = await API.getCatalog();
            this.allProducts = catalog || [];

            if (categorySlug) {
                this.allProducts = this.allProducts.filter(p => Utils.slugify(p.Category || p.category || '') === categorySlug);
                const titleEl = document.getElementById('category-title');
                if (titleEl && this.allProducts.length > 0) {
                    titleEl.textContent = this.allProducts[0].Category || this.allProducts[0].category || 'Category Products';
                }
            }

            this.filteredProducts = [...this.allProducts];
            this.handleSearchAndFilter();

            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    this.currentPage = 1;
                    this.handleSearchAndFilter();
                });
            }

            const sortSelect = document.getElementById('sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.sortProducts(e.target.value);
                });
            }
        } catch (err) {
            console.error('❌ Error initializing category controller:', err);
            this.showToast('Failed to load category products.', 'error');
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
        query = String(query || '').toLowerCase().trim();
        text = String(text || '').toLowerCase().trim();
        if (text.includes(query)) return true;
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
            this.filteredProducts = this.getRandomItems(this.allProducts, Math.min(this.pageSize, this.allProducts.length));
            if (titleEl && !Utils.getQueryParams().get('slug')) {
                titleEl.textContent = 'Featured Recommendations';
            }
        } else {
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
                        <button type="button" class="btn btn-sm btn-primary add-to-cart-btn mt-2" data-sku="${productSku}">
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

        container.querySelectorAll('.product-clickable').forEach(el => {
            el.addEventListener('click', (e) => {
                const sku = e.currentTarget.getAttribute('data-sku');
                if (sku) {
                    window.location.href = `product.html?sku=${encodeURIComponent(sku)}`;
                }
            });
        });

        container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sku = e.currentTarget.getAttribute('data-sku');
                const productData = this.allProducts.find(p => String(p.sku || p.SKU || p.Id || p.id) === String(sku));

                if (!productData) {
                    console.error('Product data not found for SKU:', sku);
                    this.showToast('Could not add product to cart.', 'error');
                    return;
                }

                const productName = productData.name || productData.Title || productData.title || productData.Name || 'Product';

                const cartItem = {
                    sku: sku,
                    slug: productData.slug || productData.Slug || '',
                    name: productName,
                    price: parseFloat(productData.price || productData.Price || productData.SalePrice || 0),
                    image: productData.image || productData.Image || '404.webp',
                    quantity: 1,
                    unit: productData.unit || 'PC'
                };

                let cart = [];
                try {
                    cart = JSON.parse(localStorage.getItem('ht_cart') || '[]');
                } catch (err) {
                    cart = [];
                }

                const existingIndex = cart.findIndex(item => String(item.sku) === String(cartItem.sku) || (item.slug && item.slug === cartItem.slug));

                if (existingIndex > -1) {
                    const currentQty = Number(cart[existingIndex].quantity || cart[existingIndex].qty || 1);
                    cart[existingIndex].quantity = currentQty + 1;
                    if (cart[existingIndex].qty !== undefined) {
                        cart[existingIndex].qty = cart[existingIndex].quantity;
                    }
                } else {
                    cart.push(cartItem);
                }

                localStorage.setItem('ht_cart', JSON.stringify(cart));
                window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));

                const badge = document.getElementById('cart-counter');
                if (badge) {
                    const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity || item.qty) || 1), 0);
                    badge.textContent = totalItems;
                    badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
                }

                const message = `${productName} added to your cart!`;
                this.showToast(message, 'success');
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
    },

    showToast(message, type = 'success') {
        // Direct absolute fallback injection to bypass layout/partial loading asynchronous race conditions entirely
        let toastContainer = document.getElementById('global-toast-layer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'global-toast-layer';
            toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
            document.body.appendChild(toastContainer);
        }

        const toastEl = document.createElement('div');
        toastEl.className = `alert ${type === 'error' ? 'alert-danger' : 'alert-success'} shadow py-2 px-3 m-0 d-flex align-items-center justify-content-between`;
        toastEl.style.cssText = 'pointer-events: auto; min-width: 280px; animation: fadeIn 0.3s ease-in-out; background-color: #198754; color: #fff; border-radius: 4px;';
        if (type === 'error') {
            toastEl.style.backgroundColor = '#dc3545';
        }

        toastEl.innerHTML = `
            <span>🌿 ${message}</span>
            <a href="cart.html" class="ms-3 text-decoration-underline fw-bold text-white" style="white-space: nowrap;">View Cart</a>
        `;

        toastContainer.appendChild(toastEl);

        setTimeout(() => {
            toastEl.style.opacity = '0';
            toastEl.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                toastEl.remove();
            }, 300);
        }, 3500);
    }
};

document.addEventListener('DOMContentLoaded', () => Category.init());
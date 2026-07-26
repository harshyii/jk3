import { API } from './api.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';

const Category = {
    allProducts: [],
    filteredProducts: [],
    currentPage: 1,
    pageSize: 12,

    async init() {
        const urlParams = Utils.getQueryParams();
        const categorySlug = urlParams.get('slug');
        const brandSlug = urlParams.get('brand');

        if (UI && typeof UI.setLoading === 'function') {
            UI.setLoading(true);
        }

        try {
            const catalog = await API.getCatalog();
            this.allProducts = catalog || [];

            // Populate filters dynamically and set initial select states
            this.loadFilters(categorySlug, brandSlug);

            // Filter by Category Slug if present
            if (categorySlug) {
                this.allProducts = this.allProducts.filter(p => Utils.slugify(p.Category || p.category || '') === categorySlug);
                const titleEl = document.getElementById('category-title');
                if (titleEl && this.allProducts.length > 0) {
                    titleEl.textContent = this.allProducts[0].Category || this.allProducts[0].category || 'Category Products';
                }
            }

            // Filter by Brand Slug if present
            if (brandSlug) {
                this.allProducts = this.allProducts.filter(p => Utils.slugify(p.brand || p.Brand || '') === brandSlug);
                const titleEl = document.getElementById('category-title');
                if (titleEl && !categorySlug && this.allProducts.length > 0) {
                    titleEl.textContent = `Brand: ${this.allProducts[0].brand || this.allProducts[0].Brand}`;
                }
            }

            this.filteredProducts = [...this.allProducts];
            this.handleSearchAndFilter();

            // Setup Search Listener
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    this.currentPage = 1;
                    this.handleSearchAndFilter();
                });
            }

            // Setup Sort Listener
            const sortSelect = document.getElementById('sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.currentPage = 1;
                    this.sortProducts(e.target.value);
                });
            }

            // Setup Clear Filters Button Listener
            const clearBtn = document.getElementById('clear-filters-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    window.location.href = 'category.html';
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

    loadFilters(currentCategorySlug, currentBrandSlug) {
        const categorySelect = document.getElementById('category-filter');
        const brandSelect = document.getElementById('brand-filter');

        // Extract complete unique lists from full database catalog (not just filtered results)
        API.getCatalog().then(catalog => {
            const fullCatalog = catalog || [];

            // Populate Categories
            if (categorySelect) {
                const uniqueCategories = [...new Set(fullCatalog.map(p => p.Category || p.category).filter(Boolean))].sort();
                let catOptions = '<option value="">All Categories</option>';
                uniqueCategories.forEach(cat => {
                    const slug = Utils.slugify(cat);
                    const isSelected = slug === currentCategorySlug ? 'selected' : '';
                    catOptions += `<option value="${slug}" ${isSelected}>${cat}</option>`;
                });
                categorySelect.innerHTML = catOptions;

                categorySelect.addEventListener('change', (e) => {
                    const slug = e.target.value;
                    const params = new URLSearchParams(window.location.search);
                    if (slug) params.set('slug', slug); else params.delete('slug');
                    window.location.href = `category.html?${params.toString()}`;
                });
            }

            // Populate Brands
            if (brandSelect) {
                const uniqueBrands = [...new Set(fullCatalog.map(p => p.brand || p.Brand).filter(Boolean))].sort();
                let brandOptions = '<option value="">All Brands</option>';
                uniqueBrands.forEach(brand => {
                    const slug = Utils.slugify(brand);
                    const isSelected = slug === currentBrandSlug ? 'selected' : '';
                    brandOptions += `<option value="${slug}" ${isSelected}>${brand}</option>`;
                });
                brandSelect.innerHTML = brandOptions;

                brandSelect.addEventListener('change', (e) => {
                    const slug = e.target.value;
                    const params = new URLSearchParams(window.location.search);
                    if (slug) params.set('brand', slug); else params.delete('brand');
                    window.location.href = `category.html?${params.toString()}`;
                });
            }
        });
    },

    fuzzyMatch(query, text) {
        query = String(query || '').toLowerCase().trim();
        text = String(text || '').toLowerCase().trim();
        if (text.includes(query)) return true;
        let qIndex = 0;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === query[qIndex]) qIndex++;
            if (qIndex === query.length) return true;
        }
        return false;
    },

    handleSearchAndFilter() {
        const searchInput = document.getElementById('search-input');
        const searchTerm = searchInput ? searchInput.value.trim() : '';

        if (searchTerm !== '') {
            this.filteredProducts = this.allProducts.filter(p => {
                const name = p.name || p.Title || p.title || '';
                const sku = p.sku || p.SKU || p.Id || p.id || '';
                return this.fuzzyMatch(searchTerm, name) || this.fuzzyMatch(searchTerm, sku);
            });
        } else {
            this.filteredProducts = [...this.allProducts];
        }
        this.render();
    },

    render() {
        const start = (this.currentPage - 1) * this.pageSize;
        const pageProducts = this.filteredProducts.slice(start, start + this.pageSize);
        const container = document.getElementById('product-grid');

        if (!container) return;

        if (pageProducts.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5 text-muted">No matching products found.</div>';
            const paginationContainer = document.getElementById('pagination-container');
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        container.innerHTML = pageProducts.map(p => {
            const productSku = p.sku || p.SKU || p.Id || p.id || '';
            const productName = p.name || p.Title || p.title || 'Product Name';
            const productImg = p.image || p.Image || '404.webp';
            const productPrice = p.price || p.Price || p.SalePrice || 0;

            return `
                <div class="col">
                    <div class="card h-100 shadow-sm product-card border-0">
                        <div class="product-img-container product-clickable text-center p-3 bg-white rounded-top" data-sku="${productSku}" style="cursor: pointer; height: 180px; display: flex; align-items: center; justify-content: center;">
                            <img src="${productImg}" alt="${productName}" class="img-fluid" style="max-height: 100%; object-fit: contain;" onerror="this.src='404.webp'">
                        </div>
                        <div class="card-body d-flex flex-column product-info bg-light rounded-bottom">
                            <h5 class="card-title fs-6 product-clickable text-dark text-truncate" title="${productName}" data-sku="${productSku}" style="cursor: pointer;">${productName}</h5>
                            <div class="product-meta mt-auto mb-2">
                                <span class="product-price fw-bold text-primary fs-5">${Utils.formatCurrency ? Utils.formatCurrency(productPrice) : '₹' + productPrice}</span>
                            </div>
                            <button type="button" class="btn btn-sm btn-primary add-to-cart-btn w-100" data-sku="${productSku}">
                                <i class="fas fa-cart-plus me-1"></i> Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.bindCardEvents();
        this.renderPagination();
    },

    renderPagination() {
        let paginationContainer = document.getElementById('pagination-container');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.filteredProducts.length / this.pageSize);
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        const getPageNumbers = (current, total) => {
            const delta = 2;
            const range = [];
            const rangeWithDots = [];
            let l;

            range.push(1);
            for (let i = current - delta; i <= current + delta; i++) {
                if (i < total && i > 1) range.push(i);
            }
            if (total > 1) range.push(total);

            for (let i of range) {
                if (l) {
                    if (i - l === 2) rangeWithDots.push(l + 1);
                    else if (i - l !== 1) rangeWithDots.push('...');
                }
                rangeWithDots.push(i);
                l = i;
            }
            return rangeWithDots;
        };

        const pages = getPageNumbers(this.currentPage, totalPages);

        let paginationHTML = `
            <nav aria-label="Page navigation" class="mt-4">
                <ul class="pagination justify-content-center shadow-sm">
                    <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${this.currentPage - 1}">Prev</a>
                    </li>
        `;

        pages.forEach(page => {
            if (page === '...') {
                paginationHTML += `<li class="page-item disabled"><span class="page-link border-0 bg-transparent">...</span></li>`;
            } else {
                paginationHTML += `<li class="page-item ${this.currentPage === page ? 'active' : ''}"><a class="page-link" href="#" data-page="${page}">${page}</a></li>`;
            }
        });

        paginationHTML += `
                    <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${this.currentPage + 1}">Next</a>
                    </li>
                </ul>
            </nav>
        `;

        paginationContainer.innerHTML = paginationHTML;

        paginationContainer.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedPage = parseInt(e.currentTarget.getAttribute('data-page'));
                if (selectedPage && selectedPage >= 1 && selectedPage <= totalPages && selectedPage !== this.currentPage) {
                    this.currentPage = selectedPage;
                    this.render();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
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

                const existingIndex = cart.findIndex(item => String(item.sku) === String(cartItem.sku));
                if (existingIndex > -1) {
                    cart[existingIndex].quantity = Number(cart[existingIndex].quantity || 1) + 1;
                } else {
                    cart.push(cartItem);
                }

                localStorage.setItem('ht_cart', JSON.stringify(cart));
                window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));

                const badge = document.getElementById('cart-counter');
                if (badge) {
                    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
                    badge.textContent = totalItems;
                    badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
                }

                this.showToast(`${productName} added to your cart!`, 'success');
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
        let toastContainer = document.getElementById('global-toast-layer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'global-toast-layer';
            toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
            document.body.appendChild(toastContainer);
        }

        const toastEl = document.createElement('div');
        toastEl.className = `alert ${type === 'error' ? 'alert-danger' : 'alert-success'} shadow py-2 px-3 m-0 d-flex align-items-center justify-content-between`;
        toastEl.style.cssText = 'pointer-events: auto; min-width: 280px; background-color: #198754; color: #fff; border-radius: 4px;';
        if (type === 'error') toastEl.style.backgroundColor = '#dc3545';

        toastEl.innerHTML = `<span>🌿 ${message}</span><a href="cart.html" class="ms-3 text-decoration-underline fw-bold text-white">View Cart</a>`;
        toastContainer.appendChild(toastEl);

        setTimeout(() => {
            toastEl.style.opacity = '0';
            toastEl.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toastEl.remove(), 300);
        }, 3500);
    }
};

document.addEventListener('DOMContentLoaded', () => Category.init());
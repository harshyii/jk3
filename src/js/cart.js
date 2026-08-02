import { API } from './api.js';
import { Utils } from './utils.js';

// Helper function to safely parse prices like '₹340.00' or '₹1,139' into clean numbers
const parseNumericPrice = (value) => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const cleanStr = value.toString().replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
};

const CartPage = {
    async init() {
        console.log("🛒 Cart Page Controller Initialized");
        this.injectStyles();
        this.renderCart();
        this.bindEvents();
        this.loadRecommendations();
    },

    injectStyles() {
        if (document.getElementById('ht-cart-layout-fix')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'ht-cart-layout-fix';
        styleEl.innerHTML = `
            #cart-items { width: 100% !important; max-width: 100% !important; }
            #cart-items .card { width: 100% !important; max-width: 100% !important; overflow: hidden; }
            #cart-items .row { width: 100% !important; margin-left: 0 !important; margin-right: 0 !important; }
            .cart-item-title { word-break: break-word; overflow-wrap: break-word; }
        `;
        document.head.appendChild(styleEl);
    },

    getCart() {
        return JSON.parse(localStorage.getItem('ht_cart') || '[]');
    },

    saveCart(cart) {
        localStorage.setItem('ht_cart', JSON.stringify(cart));
        this.updateCartBadge();
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
    },

    renderCart() {
        const cartContainer = document.getElementById('cart-items');
        const cartTotalEl = document.getElementById('cart-total');
        const checkoutBtn = document.getElementById('checkout-btn');
        if (!cartContainer) return;

        const cart = this.getCart();
        this.updateCartBadge();

        if (cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="text-center py-5 bg-white rounded shadow-sm border-0 w-100">
                    <div class="mb-3 fs-1 text-muted">🛒</div>
                    <h4 class="fw-bold text-dark">Your cart is empty</h4>
                    <p class="text-muted mb-4">Looks like you haven't added any tools to your cart yet.</p>
                    <a href="index.html" class="btn btn-primary px-4 fw-bold">Start Shopping</a>
                </div>
            `;
            if (cartTotalEl) cartTotalEl.textContent = Utils.formatCurrency ? Utils.formatCurrency(0) : '₹0.00';
            if (checkoutBtn) checkoutBtn.disabled = true;
            return;
        }

        if (checkoutBtn) checkoutBtn.disabled = false;

        cartContainer.innerHTML = cart.map((item, index) => {
            const rawPrice = item.current_price ?? item["Sale Price"] ?? item.SalePrice ?? item.price ?? item.Price ?? item.MRP ?? 0;
            const itemPrice = parseNumericPrice(rawPrice);
            const itemQty = Number(item.quantity || item.qty || 1);
            const itemTotal = itemPrice * itemQty;
            const itemName = item.name || item.Name || item.title || item.Title || 'Product';
            const itemImage = item.image || item.Image || item.image_url_1 || '404.webp';
            const itemSku = item.sku || item.SKU || 'N/A';

            return `
                <div class="card mb-3 shadow-sm border-0 p-3">
                    <div class="row align-items-center g-3">
                        <div class="col-4 col-md-2 text-center">
                            <img src="${itemImage}" alt="${itemName}" class="img-fluid rounded" style="max-height: 70px; object-fit: contain;" onerror="this.src='404.webp'">
                        </div>
                        <div class="col-8 col-md-4">
                            <h5 class="h6 fw-bold mb-1 cart-item-title">${itemName}</h5>
                            <small class="text-muted d-block mb-1">SKU: ${itemSku}</small>
                            <span class="text-primary fw-semibold">${Utils.formatCurrency ? Utils.formatCurrency(itemPrice) : '₹' + itemPrice.toLocaleString('en-IN')}</span>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="input-group input-group-sm" style="max-width: 110px;">
                                <button class="btn btn-outline-secondary qty-decrease" data-index="${index}" type="button">-</button>
                                <input type="text" class="form-control text-center bg-white" value="${itemQty}" readonly>
                                <button class="btn btn-outline-secondary qty-increase" data-index="${index}" type="button">+</button>
                            </div>
                        </div>
                        <div class="col-6 col-md-3 text-end">
                            <span class="fw-bold text-dark d-block mb-1">${Utils.formatCurrency ? Utils.formatCurrency(itemTotal) : '₹' + itemTotal.toLocaleString('en-IN')}</span>
                            <button class="btn btn-sm btn-link text-danger p-0 text-decoration-none remove-item-btn" data-index="${index}" type="button">Remove</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const total = cart.reduce((sum, item) => {
            const rawPrice = item.current_price ?? item["Sale Price"] ?? item.SalePrice ?? item.price ?? item.Price ?? item.MRP ?? 0;
            const price = parseNumericPrice(rawPrice);
            const qty = Number(item.quantity || item.qty || 1);
            return sum + (price * qty);
        }, 0);

        if (cartTotalEl) {
            cartTotalEl.textContent = Utils.formatCurrency ? Utils.formatCurrency(total) : '₹' + total.toLocaleString('en-IN');
        }
    },

    bindEvents() {
        const cartContainer = document.getElementById('cart-items');
        if (cartContainer) {
            cartContainer.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('button');
                if (!targetBtn) return;

                let cart = this.getCart();
                const index = targetBtn.dataset.index;
                if (index === undefined) return;

                const cartIndex = parseInt(index, 10);
                if (isNaN(cartIndex) || !cart[cartIndex]) return;

                const currentQty = Number(cart[cartIndex].quantity || cart[cartIndex].qty || 1);

                if (targetBtn.classList.contains('qty-increase')) {
                    cart[cartIndex].quantity = currentQty + 1;
                    if (cart[cartIndex].qty !== undefined) cart[cartIndex].qty = cart[cartIndex].quantity;
                } else if (targetBtn.classList.contains('qty-decrease')) {
                    if (currentQty > 1) {
                        cart[cartIndex].quantity = currentQty - 1;
                        if (cart[cartIndex].qty !== undefined) cart[cartIndex].qty = cart[cartIndex].quantity;
                    } else {
                        cart.splice(cartIndex, 1);
                    }
                } else if (targetBtn.classList.contains('remove-item-btn')) {
                    cart.splice(cartIndex, 1);
                }

                this.saveCart(cart);
                this.renderCart();
            });
        }

        const recommendationContainer = document.getElementById('recommended-products');
        if (recommendationContainer) {
            recommendationContainer.addEventListener('click', (e) => {
                const addBtn = e.target.closest('.add-to-cart-btn');
                if (!addBtn) return;

                const rawPrice = addBtn.dataset.price;
                const product = {
                    sku: addBtn.dataset.sku || addBtn.dataset.slug,
                    slug: addBtn.dataset.slug,
                    name: addBtn.dataset.name,
                    price: parseNumericPrice(rawPrice),
                    image: addBtn.dataset.image,
                    quantity: 1,
                    unit: 'PC'
                };

                let cart = this.getCart();
                const existingIndex = cart.findIndex(item => (String(item.sku) === String(product.sku)) || (item.slug === product.slug));

                if (existingIndex > -1) {
                    const currentQty = Number(cart[existingIndex].quantity || cart[existingIndex].qty || 1);
                    cart[existingIndex].quantity = currentQty + 1;
                    if (cart[existingIndex].qty !== undefined) cart[existingIndex].qty = cart[existingIndex].quantity;
                } else {
                    cart.push(product);
                }

                this.saveCart(cart);
                this.renderCart();
            });
        }

        window.addEventListener('storage', (e) => {
            if (e.key === 'ht_cart') {
                this.renderCart();
            }
        });

        window.addEventListener('cartUpdated', () => {
            this.renderCart();
        });

        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                const cart = this.getCart();
                if (cart.length === 0) {
                    alert('Your cart is empty!');
                    return;
                }
                window.location.href = 'checkout.html';
            });
        }
    },

    async loadRecommendations() {
        const recommendationContainer = document.getElementById('recommended-products');
        if (!recommendationContainer) return;

        try {
            const catalog = await API.getCatalog() || [];
            const recommendations = [...catalog].sort(() => 0.5 - Math.random()).slice(0, 3);

            if (recommendations.length === 0) {
                recommendationContainer.innerHTML = '<p class="text-muted text-center">No recommendations available at the moment.</p>';
                return;
            }

            recommendationContainer.innerHTML = recommendations.map(p => {
                const pSku = p.sku || p.SKU || '';
                const pSlug = p.slug || p.Slug || '';
                const pName = p.name || p.Name || p.title || p.Title || 'Product';
                
                const rawPrice = p.current_price ?? p["Sale Price"] ?? p.SalePrice ?? p.price ?? p.Price ?? p.MRP ?? 0;
                const pPrice = parseNumericPrice(rawPrice);
                
                const pImage = p.image || p.Image || p.image_url_1 || '404.webp';

                return `
                    <div class="col">
                        <div class="card h-100 shadow-sm border-0 d-flex flex-column">
                            <img src="${pImage}" class="card-img-top p-3" alt="${pName}" style="height: 160px; object-fit: contain;" onerror="this.src='404.webp'">
                            <div class="card-body d-flex flex-column">
                                <h6 class="card-title text-truncate fw-bold">${pName}</h6>
                                <p class="text-primary fw-semibold mb-3">${Utils.formatCurrency ? Utils.formatCurrency(pPrice) : '₹' + pPrice.toLocaleString('en-IN')}</p>
                                <div class="d-flex gap-2 mt-auto">
                                    <a href="product.html?sku=${encodeURIComponent(pSku)}&slug=${encodeURIComponent(pSlug)}" class="btn btn-sm btn-outline-primary w-50">Details</a>
                                    <button class="btn btn-sm btn-primary w-50 add-to-cart-btn" 
                                            data-sku="${pSku}"
                                            data-slug="${pSlug}" 
                                            data-name="${pName}" 
                                            data-price="${rawPrice}" 
                                            data-image="${pImage}"
                                            type="button">
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error('❌ Error loading recommendations:', err);
        }
    },

    updateCartBadge() {
        const badge = document.getElementById('cart-counter');
        if (badge) {
            const cart = this.getCart();
            const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity || item.qty) || 1), 0);
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => CartPage.init());
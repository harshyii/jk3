/**
 * Haryana Tools - Cart Page Controller
 * Manages cart listing, quantity adjustments, item deletion, totals, cross-tab synchronization, and recommendations.
 */

import { API } from './api.js';
import { Utils } from './utils.js';

const CartPage = {
    async init() {
        console.log("🛒 Cart Page Controller Initialized");
        this.renderCart();
        this.bindEvents();
        this.loadRecommendations();
    },

    getCart() {
        return JSON.parse(localStorage.getItem('cart') || '[]');
    },

    saveCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
        this.updateCartBadge();
        
        // Broadcast custom event so other components or tabs stay in real-time sync
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
                <div class="text-center py-5 bg-white rounded shadow-sm border-0">
                    <div class="mb-3 fs-1 text-muted">🛒</div>
                    <h4 class="fw-bold text-dark">Your cart is empty</h4>
                    <p class="text-muted mb-4">Looks like you haven't added any tools to your cart yet.</p>
                    <a href="index.html" class="btn btn-primary px-4 fw-bold">Start Shopping</a>
                </div>
            `;
            if (cartTotalEl) cartTotalEl.textContent = Utils.formatCurrency ? Utils.formatCurrency(0) : '$0.00';
            if (checkoutBtn) checkoutBtn.disabled = true;
            return;
        }

        if (checkoutBtn) checkoutBtn.disabled = false;

        cartContainer.innerHTML = cart.map((item, index) => `
            <div class="card mb-3 shadow-sm border-0 p-3">
                <div class="row align-items-center">
                    <div class="col-md-2 text-center">
                        <img src="${item.image || item.Image || 'https://via.placeholder.com/100'}" alt="${item.name || item.Name}" class="img-fluid rounded" style="max-height: 80px; object-fit: contain;">
                    </div>
                    <div class="col-md-4">
                        <h5 class="h6 fw-bold mb-1">${item.name || item.Name}</h5>
                        <p class="text-primary fw-semibold mb-0">${Utils.formatCurrency ? Utils.formatCurrency(item.price || item.SalePrice || 0) : '$' + (item.price || 0)}</p>
                    </div>
                    <div class="col-md-3 my-2 my-md-0">
                        <div class="input-group input-group-sm" style="max-width: 120px;">
                            <button class="btn btn-outline-secondary qty-decrease" data-index="${index}">-</button>
                            <input type="text" class="form-control text-center bg-white" value="${item.quantity || item.qty || 1}" readonly>
                            <button class="btn btn-outline-secondary qty-increase" data-index="${index}">+</button>
                        </div>
                    </div>
                    <div class="col-md-2 text-end">
                        <span class="fw-bold text-dark d-block mb-2">${Utils.formatCurrency ? Utils.formatCurrency((item.price || item.SalePrice || 0) * (item.quantity || item.qty || 1)) : '$0.00'}</span>
                        <button class="btn btn-sm btn-outline-danger remove-item-btn" data-index="${index}">🗑️ Remove</button>
                    </div>
                </div>
            </div>
        `).join('');

        const total = cart.reduce((sum, item) => sum + ((item.price || item.SalePrice || 0) * (item.quantity || item.qty || 1)), 0);
        if (cartTotalEl) {
            cartTotalEl.textContent = Utils.formatCurrency ? Utils.formatCurrency(total) : '$' + total;
        }
    },

    bindEvents() {
        const cartContainer = document.getElementById('cart-items');
        if (cartContainer) {
            cartContainer.addEventListener('click', (e) => {
                let cart = this.getCart();
                const index = e.target.dataset.index;
                if (index === undefined) return;

                const currentQty = Number(cart[index].quantity || cart[index].qty || 1);

                if (e.target.classList.contains('qty-increase')) {
                    cart[index].quantity = currentQty + 1;
                    if (cart[index].qty) cart[index].qty = cart[index].quantity;
                } else if (e.target.classList.contains('qty-decrease')) {
                    if (currentQty > 1) {
                        cart[index].quantity = currentQty - 1;
                        if (cart[index].qty) cart[index].qty = cart[index].quantity;
                    } else {
                        cart.splice(index, 1);
                    }
                } else if (e.target.classList.contains('remove-item-btn')) {
                    cart.splice(index, 1);
                }

                this.saveCart(cart);
                this.renderCart();
            });
        }

        // Handle recommendation container clicks for adding items directly from recommendations
        const recommendationContainer = document.getElementById('recommended-products');
        if (recommendationContainer) {
            recommendationContainer.addEventListener('click', (e) => {
                const addBtn = e.target.closest('.add-to-cart-btn');
                if (!addBtn) return;

                const product = {
                    slug: addBtn.dataset.slug,
                    name: addBtn.dataset.name,
                    price: parseFloat(addBtn.dataset.price),
                    image: addBtn.dataset.image,
                    quantity: 1
                };

                let cart = this.getCart();
                const existingIndex = cart.findIndex(item => (item.slug || item.Slug) === product.slug);

                if (existingIndex > -1) {
                    cart[existingIndex].quantity = (cart[existingIndex].quantity || cart[existingIndex].qty || 1) + 1;
                    if (cart[existingIndex].qty) cart[existingIndex].qty = cart[existingIndex].quantity;
                } else {
                    cart.push(product);
                }

                this.saveCart(cart);
                this.renderCart();
            });
        }

        // Listen for storage changes from other tabs to auto-refresh state instantly
        window.addEventListener('storage', (e) => {
            if (e.key === 'cart') {
                this.renderCart();
            }
        });

        // Listen for custom events dispatched locally within the same tab
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
            const recommendations = catalog.sort(() => 0.5 - Math.random()).slice(0, 3);

            if (recommendations.length === 0) {
                recommendationContainer.innerHTML = '<p class="text-muted text-center">No recommendations available at the moment.</p>';
                return;
            }

            recommendationContainer.innerHTML = recommendations.map(p => `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0 d-flex flex-column">
                        <img src="${p.image || p.Image || 'https://via.placeholder.com/200'}" class="card-img-top p-3" alt="${p.name || p.Name}" style="height: 160px; object-fit: contain;">
                        <div class="card-body d-flex flex-column">
                            <h6 class="card-title text-truncate fw-bold">${p.name || p.Name}</h6>
                            <p class="text-primary fw-semibold mb-3">${Utils.formatCurrency ? Utils.formatCurrency(p.price || p.SalePrice || 0) : '₹' + (p.price || 0)}</p>
                            <div class="d-flex gap-2 mt-auto">
                                <a href="product.html?slug=${p.slug || p.Slug}" class="btn btn-sm btn-outline-primary w-50">Details</a>
                                <button class="btn btn-sm btn-primary w-50 add-to-cart-btn" 
                                        data-slug="${p.slug || p.Slug}" 
                                        data-name="${p.name || p.Name}" 
                                        data-price="${p.price || p.SalePrice || 0}" 
                                        data-image="${p.image || p.Image || 'https://via.placeholder.com/50'}">
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
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
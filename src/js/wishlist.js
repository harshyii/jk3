/**
 * Haryana Tools - Wishlist (Saved Projects) Controller
 * Allows users to save tools for future procurement, updates badges, and broadcasts state changes.
 */

import { UI } from './ui.js';

export const Wishlist = {
    items: JSON.parse(localStorage.getItem('wishlist')) || [],

    init() {
        this.items = JSON.parse(localStorage.getItem('wishlist')) || [];
        this.updateBadge();
        
        // Listen for storage changes from other tabs to auto-refresh state instantly
        window.addEventListener('storage', (e) => {
            if (e.key === 'wishlist') {
                this.items = JSON.parse(localStorage.getItem('wishlist')) || [];
                this.updateBadge();
                this.render();
            }
        });

        // Listen for custom events dispatched locally within the same tab
        window.addEventListener('wishlistUpdated', () => {
            this.items = JSON.parse(localStorage.getItem('wishlist')) || [];
            this.updateBadge();
            this.render();
        });
    },

    toggle(product) {
        const productSlug = product.slug || product.Slug;
        const index = this.items.findIndex(item => (item.slug || item.Slug) === productSlug);
        
        if (index > -1) {
            this.items.splice(index, 1);
            if (UI && typeof UI.showToast === 'function') {
                UI.showToast('Removed from saved list', 'secondary');
            }
        } else {
            this.items.push(product);
            if (UI && typeof UI.showToast === 'function') {
                UI.showToast('Added to your saved tools', 'info');
            }
        }
        
        this.save();
        this.updateButtonUI(productSlug);
    },

    save() {
        localStorage.setItem('wishlist', JSON.stringify(this.items));
        this.updateBadge();
        
        // Broadcast custom event so other components or tabs stay in real-time sync
        window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: this.items }));
    },

    updateButtonUI(slug) {
        const btn = document.querySelector(`[data-wishlist-slug="${slug}"]`);
        if (btn) {
            const isSaved = this.items.some(item => (item.slug || item.Slug) === slug);
            btn.innerHTML = isSaved ? '<i class="bi bi-heart-fill text-danger"></i>' : '<i class="bi bi-heart"></i>';
        }
    },

    updateBadge() {
        const badge = document.getElementById('wishlist-counter');
        if (badge) {
            const totalItems = this.items.length;
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
        }
    },

    render() {
        const container = document.getElementById('wishlist-items');
        if (!container) return;

        if (this.items.length === 0) {
            container.innerHTML = '<p class="text-muted">Your saved list is empty.</p>';
            return;
        }

        container.innerHTML = this.items.map(item => `
            <div class="col-md-4 mb-3" data-wishlist-item="${item.slug || item.Slug}">
                <div class="card p-3 shadow-sm border-0">
                    <img src="${item.image || item.Image || 'https://via.placeholder.com/150'}" class="card-img-top mb-2" alt="${item.name || item.Name}" style="height: 120px; object-fit: contain;">
                    <h6>${item.name || item.Name}</h6>
                    <p class="text-primary fw-semibold mb-2">${item.price || item.SalePrice ? '₹' + (item.price || item.SalePrice) : ''}</p>
                    <button class="btn btn-sm btn-outline-danger" onclick="Wishlist.toggle({slug: '${item.slug || item.Slug}', name: '${item.name || item.Name}', price: '${item.price || item.SalePrice || 0}', image: '${item.image || item.Image || ''}'})">Remove</button>
                </div>
            </div>
        `).join('');
    }
};

// Global Exposure and Auto-Initialization on Load
window.Wishlist = Wishlist;

document.addEventListener('DOMContentLoaded', () => {
    Wishlist.init();
    Wishlist.render();
});
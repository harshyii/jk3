/**
 * Haryana Tools - Home Controller
 * Manages featured products and latest blog cards loading on the home page safely.
 */

import { API } from './api.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';

const Home = {
    async init() {
        if (typeof UI.setLoading === 'function') UI.setLoading(true);
        
        try {
            // Fetch catalog safely with fallback
            let catalog = [];
            try {
                catalog = await API.getCatalog();
            } catch (e) {
                console.warn('⚠️ API.getCatalog failed, checking localStorage fallback.');
                catalog = JSON.parse(localStorage.getItem('catalog') || '[]');
            }

            let blogs = [];
            try {
                if (typeof API.getBlogs === 'function') {
                    blogs = await API.getBlogs();
                }
            } catch (e) {
                console.warn('⚠️ API.getBlogs failed.');
            }

            console.log(`🏠 Home loaded ${(catalog || []).length} products and ${(blogs || []).length} blogs.`);

            this.renderFeaturedProducts(catalog || []);
            this.renderBlogs(blogs || []);
        } catch (err) {
            console.error('❌ Error initializing home page:', err);
        } finally {
            if (typeof UI.setLoading === 'function') UI.setLoading(false);
        }
    },

    renderFeaturedProducts(catalog) {
        const productGrid = document.getElementById('product-grid');
        if (!productGrid) return;

        // If catalog is completely empty, provide fallback sample products so buttons can be tested instantly
        const displayCatalog = catalog.length > 0 ? catalog : [
            { slug: 'sample-drill', name: 'EASTMAN 12V Drill Driver', price: 4027, image: 'https://via.placeholder.com/300', category: 'Power Tools' },
            { slug: 'sample-hammer', name: 'Heavy Duty Rotary Hammer', price: 3646, image: 'https://via.placeholder.com/300', category: 'Hand Tools' }
        ];

        const featured = displayCatalog.slice(0, 4);

        productGrid.innerHTML = featured.map(p => `
            <div class="col-md-3 mb-4">
                <div class="card h-100 shadow-sm border-0 d-flex flex-column">
                    <img src="${p.image || p.Image || 'https://via.placeholder.com/300'}" class="card-img-top p-3" alt="${p.name || p.Name}" style="height: 200px; object-fit: contain;">
                    <div class="card-body d-flex flex-column">
                        <span class="badge bg-light text-dark mb-2 align-self-start">${p.category || p.Category || 'General'}</span>
                        <h5 class="card-title text-truncate" title="${p.name || p.Name}">${p.name || p.Name}</h5>
                        <p class="card-text text-primary fw-bold fs-5">${Utils.formatCurrency ? Utils.formatCurrency(p.price || p.SalePrice || 0) : '₹' + (p.price || 0)}</p>
                        
                        <!-- Action Buttons (Details + Add to Cart) -->
                        <div class="d-flex gap-2 mt-auto">
                            <a href="product.html?slug=${p.slug || p.Slug}" class="btn btn-outline-primary w-50">Details</a>
                            <button class="btn btn-primary w-50 add-to-cart-btn" 
                                    data-slug="${p.slug || p.Slug || 'sample'}" 
                                    data-name="${p.name || p.Name || 'Tool'}" 
                                    data-price="${p.price || p.SalePrice || 0}" 
                                    data-image="${p.image || p.Image || 'https://via.placeholder.com/50'}">
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderBlogs(blogs) {
        const blogGrid = document.getElementById('blog-grid');
        if (!blogGrid) return;

        const latestBlogs = blogs.slice(0, 3);

        if (latestBlogs.length === 0) {
            blogGrid.innerHTML = '<p class="text-muted text-center col-12">No recent industry guides or blogs found.</p>';
            return;
        }

        blogGrid.innerHTML = latestBlogs.map(b => `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0 d-flex flex-column">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-dark">${b.title || b.Title}</h5>
                        <p class="card-text text-muted small flex-grow-1">${b.summary || b.Summary || ''}</p>
                        <a href="post.html?slug=${b.slug || b.Slug}" class="btn btn-sm btn-dark w-100 mt-auto">Read Guide</a>
                    </div>
                </div>
            </div>
        `).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => Home.init());
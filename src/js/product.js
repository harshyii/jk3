/**
 * Haryana Tools - Product Detail Controller
 * Manages gallery, technical specs, and dynamic page content.
 */

import { API } from './api.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';

const Product = {
    async init() {
        const container = document.getElementById('main-content') || document.getElementById('product-detail-container');
        
        // 1. Extract slug from query parameters (e.g., product.html?slug=heavy-duty-drill)
        const urlParams = new URLSearchParams(window.location.search);
        let slug = urlParams.get('slug');

        // 2. Fallback: Check pathname if query param is missing (e.g., /product/slug routing)
        if (!slug) {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            let lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart !== 'product.html' && lastPart !== 'product') {
                slug = lastPart;
            }
        }

        // Diagnostic check: If still no slug, notify instead of hard-redirecting
        if (!slug) {
            console.warn("Product Init Warning: No product slug was found in the URL parameters.");
            if (container) {
                container.innerHTML = `
                    <div class="container py-5 text-center">
                        <div class="alert alert-warning shadow-sm p-4 d-inline-block">
                            <h4>No Product Selected</h4>
                            <p class="text-muted">Please select a valid product from the catalog.</p>
                            <a href="index.html" class="btn btn-primary btn-sm mt-2">Back to Home</a>
                        </div>
                    </div>
                `;
            }
            return;
        }

        if (typeof UI?.setLoading === 'function') UI.setLoading(true);
        
        const data = await API.getProduct(slug);
        
        if (data) {
            this.render(data);
            if (typeof UI?.setPageMeta === 'function') {
                UI.setPageMeta(data.Name, [
                    { text: 'Home', url: '/' },
                    { text: data.Category, url: `/category/${Utils.slugify ? Utils.slugify(data.Category) : data.Category}` },
                    { text: data.Name, url: '#' }
                ]);
            }
        } else {
            // Graceful error handling on screen instead of a broken 404 redirect loop
            if (container) {
                container.innerHTML = `
                    <div class="container py-5 text-center">
                        <div class="alert alert-danger shadow-sm p-4 d-inline-block">
                            <h4>Product Not Found</h4>
                            <p class="text-muted">The product "${slug}" could not be located in our database.</p>
                            <a href="index.html" class="btn btn-primary btn-sm mt-2">Back to Home</a>
                        </div>
                    </div>
                `;
            }
        }
        
        if (typeof UI?.setLoading === 'function') UI.setLoading(false);
    },

    render(p) {
        // 1. Basic Info & Title
        const titleEl = document.getElementById('product-title') || document.getElementById('product-name');
        if (titleEl) titleEl.textContent = p.Name || p.title || 'Product Details';

        // 2. Pricing & Savings Calculations
        const priceEl = document.getElementById('product-price');
        if (priceEl) {
            const salePrice = p.SalePrice || p.Price || 0;
            const mrp = p.MRP || 0;
            const discount = p.Discount || 0;
            
            priceEl.innerHTML = `
                <span class="text-dark fw-bold fs-2">₹${salePrice.toLocaleString()}</span>
                ${mrp > salePrice ? `<span class="text-muted text-decoration-line-through fs-5 ms-3">₹${mrp.toLocaleString()}</span>` : ''}
                ${discount > 0 ? `<span class="badge bg-danger ms-2 fs-6">${discount}% OFF</span>` : ''}
            `;
        }

        // 3. Category & Brand Badges
        const categoryEl = document.getElementById('product-category');
        if (categoryEl) {
            categoryEl.innerHTML = `
                <span class="badge bg-secondary me-2">${p.Category || 'Tools'}</span>
                ${p.Brand ? `<span class="badge bg-info text-dark">Brand: ${p.Brand}</span>` : ''}
            `;
        }

        // 4. Stock Availability Badge
        const stockEl = document.getElementById('product-stock') || document.createElement('div');
        stockEl.id = 'product-stock';
        const stockQty = p.StockQuantity !== undefined ? p.StockQuantity : 5;
        stockEl.innerHTML = `
            <p class="mb-3">
                <span class="badge ${stockQty > 0 ? 'bg-success' : 'bg-danger'}">
                    ${stockQty > 0 ? `In Stock (${stockQty} ${p.Unit || 'PC'} available)` : 'Out of Stock'}
                </span>
            </p>
        `;
        // Insert stock badge right after price if container exists
        if (priceEl && !document.getElementById('product-stock')) {
            priceEl.parentNode.insertBefore(stockEl, priceEl.nextSibling);
        }

        // 5. Rich Description & Detailed Info Tabs/Sections
        const descEl = document.getElementById('product-description');
        if (descEl) {
            let contentHtml = '';
            if (p.Description) contentHtml += `<p class="lead fs-6">${p.Description}</p>`;
            if (p.DetailedInfo) contentHtml += `<div class="mt-3 text-muted">${p.DetailedInfo}</div>`;
            if (!contentHtml) contentHtml = `<p class="text-muted">No description available for this item.</p>`;
            
            descEl.innerHTML = contentHtml;
        }

        // 6. Gallery Images Setup
       // Inside your render(p) method:
    
    // 1. Collect all valid image URLs from the product object (handles 'Images' array or fallback fields)
    const images = (p.Images && p.Images.length > 0) 
        ? p.Images.filter(img => img && typeof img === 'string' && img.startsWith('http')) 
        : [p.Image, p.FeaturedImage].filter(Boolean);

    const mainImageEl = document.getElementById('product-image');
    const thumbnailsContainer = document.getElementById('product-thumbnails');

    if (images.length > 0) {
        // Set default main image to the first one (Featured Image)
        if (mainImageEl) {
            mainImageEl.src = images[0];
            mainImageEl.alt = p.Name || 'Product Image';
        }

        // Render thumbnail strip if container exists
        if (thumbnailsContainer) {
            if (images.length > 1) {
                thumbnailsContainer.innerHTML = images.map((imgUrl, index) => `
                    <img src="${imgUrl}" alt="Thumbnail ${index + 1}" 
                         class="thumbnail-item rounded border ${index === 0 ? 'border-primary border-2' : 'border-light'}" 
                         style="width: 70px; height: 70px; object-fit: cover; cursor: pointer; transition: all 0.2s;"
                         data-full="${imgUrl}"
                    />
                `).join('');

                // Add click event listeners to thumbnails to switch the main image on the fly
                thumbnailsContainer.querySelectorAll('.thumbnail-item').forEach(thumb => {
                    thumb.addEventListener('click', (e) => {
                        // Update main image source
                        if (mainImageEl) mainImageEl.src = e.target.getAttribute('data-full');
                        
                        // Highlight active border styling
                        thumbnailsContainer.querySelectorAll('.thumbnail-item').forEach(t => t.classList.replace('border-primary', 'border-light'));
                        e.target.classList.replace('border-light', 'border-primary');
                        e.target.classList.add('border-2');
                    });
                });
                thumbnailsContainer.style.display = 'flex';
            } else {
                thumbnailsContainer.style.display = 'none'; // Hide strip if only 1 image exists
            }
        }
    } else if (mainImageEl) {
        mainImageEl.style.display = 'none';
        if (thumbnailsContainer) thumbnailsContainer.style.display = 'none';
    }

        // 7. Render Extra Metadata Specifications Table (Model, Country, SKU, etc.)
        const specsContainer = document.getElementById('product-specs');
        if (specsContainer) {
            const specs = {
                "SKU": p.SKU,
                "Model Number": p.Model,
                "Brand": p.Brand,
                "Country of Origin": p.Country,
                "Supplier": p.Supplier,
                "Unit": p.Unit
            };

            const specsHtml = Object.entries(specs)
                .filter(([_, val]) => val) // Only show keys that have values
                .map(([key, val]) => `<tr><th class="w-50 text-secondary">${key}</th><td>${val}</td></tr>`)
                .join('');
            
            specsContainer.innerHTML = specsHtml || `<tr><td colspan="2" class="text-muted">No additional specifications.</td></tr>`;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Product.init());
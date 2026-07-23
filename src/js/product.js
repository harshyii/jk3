/**
 * Haryana Tools - Product Detail Controller
 * Handles loading individual product JSON via SKU, rendering specs, and cart functionality.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    let sku = urlParams.get('sku') || urlParams.get('id');
    const slug = urlParams.get('slug');

    try {
        // If we only have a slug, load catalog.json to find the matching SKU first (case-insensitive)
        if (!sku && slug) {
            const catalogRes = await fetch('dist/data/catalog.json');
            if (catalogRes.ok) {
                const catalog = await catalogRes.json();
                const matchedProduct = catalog.find(p => (p.slug || '').toLowerCase() === slug.toLowerCase());
                if (matchedProduct) {
                    sku = matchedProduct.sku || matchedProduct.SKU;
                }
            }
        }

        if (!sku) {
            throw new Error('No valid product SKU or slug specified.');
        }
        
        // --- NORMALIZE SKU TO LOWERCASE FOR FILE PATH ---
        sku = sku.toLowerCase().trim();

        // Fetch specific product JSON file by SKU with fallback mechanisms
        let response = await fetch(`dist/data/products/${sku}.json`);
        
        if (!response.ok) {
            // Fallback: If direct lowercase file fetch fails, look up the exact filename/SKU case from catalog.json
            const catalogRes = await fetch('dist/data/catalog.json');
            if (catalogRes.ok) {
                const catalog = await catalogRes.json();
                const matchedProduct = catalog.find(p => (p.sku || p.SKU || '').toLowerCase().trim() === sku);
                if (matchedProduct) {
                    const catalogSku = matchedProduct.sku || matchedProduct.SKU;
                    // Try fetching with catalog SKU or lowercased version if different
                    response = await fetch(`dist/data/products/${catalogSku}.toLowerCase().json`) || await fetch(`dist/data/products/${catalogSku}.json`);
                }
            }
        }

        if (!response || !response.ok) throw new Error('Product not found');
        const product = await response.json();

        renderProductDetails(product);
        
        // Fetch catalog to find related/similar products in the same category
        try {
            const catalogRes = await fetch('dist/data/catalog.json');
            if (catalogRes.ok) {
                const catalog = await catalogRes.json();
                renderRelatedProducts(product, catalog);
            }
        } catch (catErr) {
            console.warn('Could not load related products:', catErr);
        }

    } catch (error) {
        console.error('Error loading product details:', error);
        showError('The product you are looking for does not exist or has been removed.');
    }
});

function renderProductDetails(product) {
    // Update Document Title for SEO
    document.title = `${product.Name || product.name || 'Product'} - Haryana Tools`;

    // Breadcrumbs
    const breadcrumbContainer = document.getElementById('product-breadcrumb');
    if (breadcrumbContainer) {
        const categoryName = product.Category || product.category || '';
        const productName = product.Name || product.name || '';
        breadcrumbContainer.innerHTML = `
            <li class="breadcrumb-item"><a href="index.html">Home</a></li>
            ${categoryName ? `<li class="breadcrumb-item"><a href="category.html?slug=${slugify(categoryName)}">${escapeHtml(categoryName)}</a></li>` : ''}
            <li class="breadcrumb-item active" aria-current="page">${escapeHtml(productName)}</li>
        `;
    }

    const pName = product.Name || product.name || '';
    const pSku = product.SKU || product.sku || '';
    const pBrand = product.Brand || product.brand || 'General';
    const pCategory = product.Category || product.category || 'Uncategorized';
    const stockQty = product.StockQuantity !== undefined ? product.StockQuantity : (product.stockQuantity !== undefined ? product.stockQuantity : 10);
    const pUnit = product.Unit || product.unit || 'PC';

    // Main Product Information
    setTextContent('product-title', pName);
    setTextContent('product-sku', pSku);
    setTextContent('product-brand', pBrand);
    setTextContent('product-category', pCategory);
    setTextContent('product-stock', stockQty > 0 ? `In Stock (${stockQty} ${pUnit})` : 'Out of Stock');
    
    const stockBadge = document.getElementById('product-stock');
    if (stockBadge) {
        stockBadge.className = stockQty > 0 ? 'badge bg-success' : 'badge bg-danger';
    }

    // Pricing
    const priceEl = document.getElementById('product-price');
    const mrpEl = document.getElementById('product-mrp');
    const discountEl = document.getElementById('product-discount');

    const salePrice = product.SalePrice || product.salePrice || product.price || product.MRP || 0;
    const mrpPrice = product.MRP || product.mrp || 0;
    const discountPct = product.Discount || product.discount || 0;

    if (priceEl) priceEl.textContent = `₹${Number(salePrice).toLocaleString('en-IN')}`;
    if (mrpEl && mrpPrice && mrpPrice > salePrice) {
        mrpEl.textContent = `₹${Number(mrpPrice).toLocaleString('en-IN')}`;
        mrpEl.style.display = 'inline';
    } else if (mrpEl) {
        mrpEl.style.display = 'none';
    }

    if (discountEl && discountPct > 0) {
        discountEl.textContent = `${discountPct}% OFF`;
        discountEl.style.display = 'inline-block';
    } else if (discountEl) {
        discountEl.style.display = 'none';
    }

    // Descriptions & Specs
    const descEl = document.getElementById('product-description');
    if (descEl) {
        descEl.innerHTML = product.Description || product.description || product.DetailedInfo || '<p class="text-muted">No description available for this product.</p>';
    }

    // Additional specifications table if available
    renderSpecifications(product);

    // Images & Gallery
    const imagesList = product.Images || product.images || [product.Image || product.image];
    renderImageGallery(imagesList, pName);

    // Initialize Add to Cart / Quantity controls
    initActionButtons(product);
}

function renderImageGallery(images, productName) {
    const mainImageEl = document.getElementById('main-product-image');
    const thumbnailContainer = document.getElementById('product-thumbnails');

    const validImages = (images || []).filter(img => img && typeof img === 'string');
    const primaryImg = validImages.length > 0 ? validImages[0] : 'src/images/placeholder.jpg';

    if (mainImageEl) {
        mainImageEl.src = primaryImg;
        mainImageEl.alt = productName;
        mainImageEl.onerror = function() {
            this.src = 'src/images/placeholder.jpg';
        };
    }

    if (thumbnailContainer) {
        if (validImages.length > 1) {
            thumbnailContainer.innerHTML = validImages.map((img, idx) => `
                <div class="p-1 border rounded cursor-pointer thumb-item ${idx === 0 ? 'border-primary' : ''}" style="width: 70px; height: 70px;" onclick="changeMainImage('${img}', this)">
                    <img src="${img}" alt="" class="w-100 h-100 object-fit-contain" onerror="this.src='src/images/placeholder.jpg'">
                </div>
            `).join('');
            thumbnailContainer.style.display = 'flex';
        } else {
            thumbnailContainer.style.display = 'none';
        }
    }
}

// Global helper for gallery thumbnail switches
window.changeMainImage = function(src, thumbElement) {
    const mainImageEl = document.getElementById('main-product-image');
    if (mainImageEl) mainImageEl.src = src;

    document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('border-primary'));
    if (thumbElement) thumbElement.classList.add('border-primary');
};

function renderSpecifications(product) {
    const specsContainer = document.getElementById('product-specs-table');
    if (!specsContainer) return;

    const specs = [
        { label: 'SKU', value: product.SKU || product.sku },
        { label: 'Brand', value: product.Brand || product.brand },
        { label: 'Model Number', value: product.Model || product.model },
        { label: 'Category', value: product.Category || product.category },
        { label: 'Subcategory', value: product.Subcategory || product.subcategory },
        { label: 'Country of Origin', value: product.Country || product.country },
        { label: 'Unit', value: product.Unit || product.unit }
    ].filter(s => s.value);

    specsContainer.innerHTML = specs.map(s => `
        <tr>
            <th class="w-25 text-muted">${escapeHtml(s.label)}</th>
            <td>${escapeHtml(s.value)}</td>
        </tr>
    `).join('');
}

function renderRelatedProducts(currentProduct, catalog) {
    const container = document.getElementById('related-products-grid');
    if (!container) return;

    const currentSku = (currentProduct.SKU || currentProduct.sku || '').toLowerCase().trim();
    const currentCategory = currentProduct.Category || currentProduct.category || '';

    // Filter products matching the same category, excluding the current SKU case-insensitively
    const related = catalog.filter(p => {
        const pSku = (p.sku || p.SKU || '').toLowerCase().trim();
        const pCat = p.category || p.Category || '';
        return pSku !== currentSku && 
               pCat && currentCategory && 
               pCat.toLowerCase() === currentCategory.toLowerCase();
    }).slice(0, 4);

    if (related.length === 0) {
        const section = document.getElementById('related-products-section');
        if (section) section.style.display = 'none';
        return;
    }

    container.innerHTML = related.map(product => {
        const productSku = product.sku || product.SKU || '';
        const productName = product.name || product.Name || '';
        const productImg = product.image || product.Image || 'src/images/placeholder.jpg';
        const productPrice = product.price || product.SalePrice || product.MRP || 0;
        const productBrand = product.brand || product.Brand || 'General';

        return `
            <div class="col-6 col-md-3 mb-4">
                <div class="card h-100 product-card shadow-sm border-0">
                    <a href="product.html?sku=${productSku}" class="text-decoration-none">
                        <div class="product-img-wrapper position-relative overflow-hidden" style="height: 160px; background-color: #f8f9fa;">
                             <img src="${productImg}" alt="${escapeHtml(productName)}" class="w-100 h-100 object-fit-contain p-2" onerror="this.src='src/images/placeholder.jpg'">
                             </div>
                    </a>
                    <div class="card-body d-flex flex-column p-3">
                        <span class="text-uppercase text-muted small mb-1">${escapeHtml(productBrand)}</span>
                        <h5 class="card-title fs-6 mb-2">
                            <a href="product.html?sku=${productSku}" class="text-dark text-decoration-none stretched-link">
                                ${escapeHtml(productName)}
                            </a>
                        </h5>
                        <div class="mt-auto d-flex align-items-center justify-content-between pt-2">
                            <span class="fw-bold text-primary">₹${Number(productPrice).toLocaleString('en-IN')}</span>
                            <a href="product.html?sku=${productSku}" class="btn btn-sm btn-outline-primary position-relative z-1">View</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function initActionButtons(product) {
    const buyBtn = document.getElementById('buy-now-btn');
    const cartBtn = document.getElementById('add-to-cart-btn');
    const qtyInput = document.getElementById('product-quantity');

    if (buyBtn) {
        buyBtn.addEventListener('click', () => {
            const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            addToCartAction(product, qty);
            window.location.href = 'checkout.html';
        });
    }

    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            addToCartAction(product, qty);
            
            const productName = product.Name || product.name || 'Product';
            const message = `${productName} added to your cart!`;
            if (window.UI && typeof window.UI.showToast === 'function') {
                window.UI.showToast(message, 'success');
            } else if (typeof window.showToast === 'function') {
                window.showToast('Success', message, 'success');
            } else {
                showFallbackToast(message);
            }
        });
    }
}

function showFallbackToast(message) {
    let toastContainer = document.getElementById('fallback-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'fallback-toast-container';
        toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999;';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = 'alert alert-success shadow-sm py-2 px-3 mb-2 animate-fade';
    toast.innerHTML = `🌿 ${escapeHtml(message)}`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function addToCartAction(product, quantity) {
    let cart = JSON.parse(localStorage.getItem('ht_cart') || '[]');
    
    // --- CASE-INSENSITIVE CART MATCHING ---
    const productSku = (product.SKU || product.sku || '').toLowerCase().trim();
    const existingIndex = cart.findIndex(item => (item.sku || '').toLowerCase().trim() === productSku);

    if (existingIndex > -1) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || cart[existingIndex].qty || 1) + quantity;
        if (cart[existingIndex].qty) cart[existingIndex].qty = cart[existingIndex].quantity;
    } else {
        cart.push({
            sku: product.SKU || product.sku,
            name: product.Name || product.name,
            price: product.SalePrice || product.salePrice || product.MRP || product.price || 0,
            image: product.Image || product.image || '',
            quantity: quantity,
            unit: product.Unit || product.unit || 'PC'
        });
    }

    localStorage.setItem('ht_cart', JSON.stringify(cart));
    updateCartCountBadge();
}

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    const cart = JSON.parse(localStorage.getItem('ht_cart') || '[]');

    if (cart.length === 0) {
        container.innerHTML = '<p class="text-muted">Your cart is empty.</p>';
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="card mb-3 p-3 shadow-sm border-0">
            <div class="row align-items-center">
                <div class="col-md-2">
                    <img src="${item.image || 'src/images/placeholder.jpg'}" alt="${escapeHtml(item.name)}" class="img-fluid rounded object-fit-contain" style="height: 70px;" onerror="this.src='src/images/placeholder.jpg'">
                </div>
                <div class="col-md-4">
                    <h5 class="fs-6 mb-1">${escapeHtml(item.name)}</h5>
                    <small class="text-muted">SKU: ${escapeHtml(item.sku)}</small>
                </div>
                <div class="col-md-3">
                    <span class="fw-bold">Qty: ${item.quantity || item.qty || 1}</span>
                </div>
                <div class="col-md-3 text-end">
                    <span class="text-primary fw-bold">₹${(item.price * (item.quantity || item.qty || 1)).toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function updateCartCountBadge() {
    const cart = JSON.parse(localStorage.getItem('ht_cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || item.qty || 1), 0);
    document.querySelectorAll('.cart-count-badge').forEach(badge => {
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
}

function setTextContent(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
}

function showError(message) {
    const mainContainer = document.querySelector('main') || document.body;
    mainContainer.innerHTML = `
        <div class="container py-5 text-center">
            <div class="alert alert-warning shadow-sm p-4 d-inline-block mx-auto" style="max-width: 500px;">
                <h4 class="alert-heading fw-bold mb-2">Notice</h4>
                <p class="text-muted mb-3">${escapeHtml(message)}</p>
                <a href="index.html" class="btn btn-primary">Return to Home</a>
            </div>
        </div>
    `;
}

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
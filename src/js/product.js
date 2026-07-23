document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    let sku = urlParams.get('sku') || urlParams.get('id');
    const slug = urlParams.get('slug');

    try {
        // If we only have a slug, load catalog.json to find the matching SKU first
        if (!sku && slug) {
            const catalogRes = await fetch('dist/data/catalog.json');
            if (catalogRes.ok) {
                const catalog = await catalogRes.json();
                const matchedProduct = catalog.find(p => p.slug === slug);
                if (matchedProduct) {
                    sku = matchedProduct.sku;
                }
            }
        }

        if (!sku) {
            throw new Error('No valid product SKU or slug specified.');
        }

        // Fetch specific product JSON file by SKU
        const response = await fetch(`dist/data/products/${sku}.json`);
        if (!response.ok) throw new Error('Product not found');
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
    document.title = `${product.Name} - Haryana Tools`;

    // Breadcrumbs
    const breadcrumbContainer = document.getElementById('product-breadcrumb');
    if (breadcrumbContainer) {
        breadcrumbContainer.innerHTML = `
            <li class="breadcrumb-item"><a href="index.html">Home</a></li>
            ${product.Category ? `<li class="breadcrumb-item"><a href="category.html?slug=${slugify(product.Category)}">${escapeHtml(product.Category)}</a></li>` : ''}
            <li class="breadcrumb-item active" aria-current="page">${escapeHtml(product.Name)}</li>
        `;
    }

    // Main Product Information
    setTextContent('product-title', product.Name);
    setTextContent('product-sku', product.SKU);
    setTextContent('product-brand', product.Brand || 'General');
    setTextContent('product-category', product.Category || 'Uncategorized');
    setTextContent('product-stock', product.StockQuantity > 0 ? `In Stock (${product.StockQuantity} ${product.Unit || 'Units'})` : 'Out of Stock');
    
    const stockBadge = document.getElementById('product-stock');
    if (stockBadge) {
        stockBadge.className = product.StockQuantity > 0 ? 'badge bg-success' : 'badge bg-danger';
    }

    // Pricing
    const priceEl = document.getElementById('product-price');
    const mrpEl = document.getElementById('product-mrp');
    const discountEl = document.getElementById('product-discount');

    if (priceEl) priceEl.textContent = `₹${Number(product.SalePrice || product.MRP || 0).toLocaleString('en-IN')}`;
    if (mrpEl && product.MRP && product.MRP > (product.SalePrice || 0)) {
        mrpEl.textContent = `₹${Number(product.MRP).toLocaleString('en-IN')}`;
        mrpEl.style.display = 'inline';
    } else if (mrpEl) {
        mrpEl.style.display = 'none';
    }

    if (discountEl && product.Discount && product.Discount > 0) {
        discountEl.textContent = `${product.Discount}% OFF`;
        discountEl.style.display = 'inline-block';
    } else if (discountEl) {
        discountEl.style.display = 'none';
    }

    // Descriptions & Specs
    const descEl = document.getElementById('product-description');
    if (descEl) {
        descEl.innerHTML = product.Description || product.DetailedInfo || '<p class="text-muted">No description available for this product.</p>';
    }

    // Additional specifications table if available
    renderSpecifications(product);

    // Images & Gallery
    renderImageGallery(product.Images || [product.Image], product.Name);

    // Initialize Add to Cart / Quantity controls
    initActionButtons(product);
}

function renderImageGallery(images, productName) {
    const mainImageEl = document.getElementById('main-product-image');
    const thumbnailContainer = document.getElementById('product-thumbnails');

    // Filter out non-string or video elements if they shouldn't be treated as standard image thumbnails
    const validImages = (images || []).filter(img => img && typeof img === 'string' && img.startsWith('http'));
    const primaryImg = validImages.length > 0 ? validImages[0] : 'src/images/placeholder.jpg';

    if (mainImageEl) {
        mainImageEl.src = primaryImg;
        mainImageEl.alt = productName;
    }

    if (thumbnailContainer) {
        if (validImages.length > 1) {
            thumbnailContainer.innerHTML = validImages.map((img, idx) => `
                <div class="p-1 border rounded cursor-pointer thumb-item ${idx === 0 ? 'border-primary' : ''}" style="width: 70px; height: 70px;" onclick="changeMainImage('${img}', this)">
                    <img src="${img}" alt="" class="w-100 h-100 object-fit-contain">
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
        { label: 'SKU', value: product.SKU },
        { label: 'Brand', value: product.Brand },
        { label: 'Model Number', value: product.Model },
        { label: 'Category', value: product.Category },
        { label: 'Subcategory', value: product.Subcategory },
        { label: 'Country of Origin', value: product.Country },
        { label: 'Unit', value: product.Unit }
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

    // Filter products matching the same category, excluding the current SKU
    const related = catalog.filter(p => 
        p.sku !== currentProduct.SKU && 
        p.category && currentProduct.category && 
        p.category.toLowerCase() === currentProduct.category.toLowerCase()
    ).slice(0, 4);

    if (related.length === 0) {
        const section = document.getElementById('related-products-section');
        if (section) section.style.display = 'none';
        return;
    }

    container.innerHTML = related.map(product => `
        <div class="col-6 col-md-3 mb-4">
            <div class="card h-100 product-card shadow-sm border-0">
                <a href="product.html?sku=${product.sku}" class="text-decoration-none">
                    <div class="product-img-wrapper position-relative overflow-hidden" style="height: 160px; background-color: #f8f9fa;">
                        <img src="${product.image || 'src/images/placeholder.jpg'}" alt="${escapeHtml(product.name)}" class="w-100 h-100 object-fit-contain p-2">
                    </div>
                </a>
                <div class="card-body d-flex flex-column p-3">
                    <span class="text-uppercase text-muted small mb-1">${escapeHtml(product.brand || 'General')}</span>
                    <h5 class="card-title fs-6 mb-2">
                        <a href="product.html?sku=${product.sku}" class="text-dark text-decoration-none stretched-link">
                            ${escapeHtml(product.name)}
                        </a>
                    </h5>
                    <div class="mt-auto d-flex align-items-center justify-content-between pt-2">
                        <span class="fw-bold text-primary">₹${Number(product.price).toLocaleString('en-IN')}</span>
                        <a href="product.html?sku=${product.sku}" class="btn btn-sm btn-outline-primary position-relative z-1">View</a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
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
            showToast('Success', `${product.Name} added to your cart!`, 'success');
        });
    }
}

function addToCartAction(product, quantity) {
    let cart = JSON.parse(localStorage.getItem('ht_cart') || '[]');
    const existingIndex = cart.findIndex(item => item.sku === product.SKU);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({
            sku: product.SKU,
            name: product.Name,
            price: product.SalePrice || product.MRP || 0,
            image: product.Image || '',
            quantity: quantity,
            unit: product.Unit || 'PC'
        });
    }

    localStorage.setItem('ht_cart', JSON.stringify(cart));
    updateCartCountBadge();
}

function updateCartCountBadge() {
    const cart = JSON.parse(localStorage.getItem('ht_cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
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
// GOOGLE APPS SCRIPT URL FOR REVIEWS
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwRBzAd9OGyiZ4brBkxrppIazLIpSBczgii5NdGLIweGzRqlnuluz7oWL89xsJW5adm_Q/exec';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    let sku = urlParams.get('sku') || urlParams.get('id') || urlParams.get('asin');
    const slug = urlParams.get('slug');

    try {
        if (!sku && slug) {
            const catalogRes = await fetch('dist/data/catalog.json');
            if (catalogRes.ok) {
                const catalog = await catalogRes.json();
                const matchedProduct = catalog.find(p => (p.slug || '').toLowerCase() === slug.toLowerCase());
                if (matchedProduct) {
                    sku = matchedProduct.sku || matchedProduct.SKU || matchedProduct.asin || matchedProduct.ASIN;
                }
            }
        }

        if (!sku) {
            throw new Error('No valid product SKU, ASIN or slug specified.');
        }

        sku = sku.toLowerCase().trim();
        
        loadAndRenderComments(sku);

        let response = await fetch(`dist/data/products/${sku}.json`);

        if (!response.ok) {
            const catalogRes = await fetch('dist/data/catalog.json');
            if (catalogRes.ok) {
                const catalog = await catalogRes.json();
                const matchedProduct = catalog.find(p => (p.sku || p.SKU || p.asin || p.ASIN || '').toLowerCase().trim() === sku);
                if (matchedProduct) {
                    const catalogSku = matchedProduct.sku || matchedProduct.SKU || matchedProduct.asin || matchedProduct.ASIN;
                    response = await fetch(`dist/data/products/${slugify(catalogSku)}.json`);
                }
            }
        }

        if (!response || !response.ok) throw new Error('Product not found');

        const product = await response.json();
        renderProductDetails(product);
        
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

function parseNumericPrice(value) {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    
    const cleanStr = value.toString().replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
}

function renderProductDetails(product) {
    const productName = product.title || product.Name || product.name || 'Product';
    document.title = `${productName} - Haryana Tools`;
    updatePageMetaTags(product);
    const breadcrumbContainer = document.getElementById('product-breadcrumb');
    if (breadcrumbContainer) {
        const categoryName = product.Category || product.category || '';
        breadcrumbContainer.innerHTML = `
            <li class="breadcrumb-item"><a href="index.html">Home</a></li>
            ${categoryName ? `<li class="breadcrumb-item"><a href="category.html?slug=${slugify(categoryName)}">${escapeHtml(categoryName)}</a></li>` : ''}
            <li class="breadcrumb-item active" aria-current="page">${escapeHtml(productName)}</li>
        `;
    }

    const pSku = product.SKU || product.sku || product.asin || product.ASIN || '';
    const pBrand = product.brand || product.Brand || 'General';
    const brandSlug = slugify(pBrand);

    const pCategory = product.Category || product.category || 'Uncategorized';
    const categorySlug = slugify(pCategory);

    const stockQty = product.StockQuantity !== undefined ? product.StockQuantity : (product.stockQuantity !== undefined ? product.stockQuantity : 10);
    const pUnit = product.Unit || product.unit || 'PC';

    setTextContent('product-title', productName);
    setTextContent('product-sku', pSku);
    
    // Make Brand clickable right next to title
    const brandEl = document.getElementById('product-brand');
    if (brandEl) {
        brandEl.innerHTML = `<a href="category.html?brand=${brandSlug}" class="text-primary text-decoration-none fw-semibold">${escapeHtml(pBrand)}</a>`;
    }

    // Make Category clickable or viewable
    const categoryEl = document.getElementById('product-category');
    if (categoryEl) {
        categoryEl.innerHTML = `<a href="category.html?slug=${categorySlug}" class="text-primary text-decoration-none fw-semibold">${escapeHtml(pCategory)}</a>`;
    }

    setTextContent('product-stock', stockQty > 0 ? `In Stock (${stockQty}${pUnit})` : 'Out of Stock');

    const stockBadge = document.getElementById('product-stock');
    if (stockBadge) {
        stockBadge.className = stockQty > 0 ? 'badge bg-success ms-2' : 'badge bg-danger ms-2';
        stockBadge.style.display = 'inline-block';
    }

    const priceEl = document.getElementById('product-price');
    const mrpEl = document.getElementById('product-mrp');
    const discountEl = document.getElementById('product-discount');
    
    const rawSalePrice = product.current_price ?? product["Sale Price"] ?? product.SalePrice ?? product.salePrice ?? product.price ?? product.MRP ?? 0;
    const salePrice = parseNumericPrice(rawSalePrice);

    const rawMrpPrice = product.mrp ?? product["List Price"] ?? product.ListPrice ?? product.MRP ?? 0;
    const mrpPrice = parseNumericPrice(rawMrpPrice);

    const discountPct = product.Discount || product.discount || 0;

    if (priceEl) priceEl.textContent = `₹${salePrice.toLocaleString('en-IN')}`;
    
    if (mrpEl && mrpPrice > salePrice) {
        mrpEl.textContent = `₹${mrpPrice.toLocaleString('en-IN')}`;
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

    const descEl = document.getElementById('product-description');
    if (descEl) {
        descEl.innerHTML = product.description || product.Description || product.DetailedInfo || '<p class="text-muted">No description available for this product.</p>';
    }

    renderSpecifications(product);

    const imagesList = product.image_urls || product.Images || product.images || [product.image_url_1 || product.Image || product.image];
    renderImageGallery(imagesList, productName);
    initActionButtons(product);



    function updatePageMetaTags(product) {
    const productName = product.title || product.Name || product.name || 'Haryana Tools Product';
    const rawPrice = product.current_price ?? product["Sale Price"] ?? product.SalePrice ?? product.salePrice ?? product.price ?? product.MRP ?? 0;
    const salePrice = parseNumericPrice(rawPrice);
    const productDesc = product.description || product.Description || product.DetailedInfo || `Buy ${productName} at the best price on Haryana Tools.`;
    
    // Clean description text from HTML tags for meta description
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = productDesc;
    const cleanDesc = (tempDiv.textContent || tempDiv.innerText || '').substring(0, 160);

    const imagesList = product.image_urls || product.Images || product.images || [product.image_url_1 || product.Image || product.image];
    const productImage = imagesList && imagesList.length > 0 ? imagesList[0] : '404.webp';
    
    // Make image URL absolute if it's relative (recommended for social sharing crawlers)
    const absoluteImageUrl = productImage.startsWith('http') ? productImage : new URL(productImage, window.location.origin).href;
    const currentUrl = window.location.href;

    // Update standard title
    document.title = `${productName} - ₹${salePrice.toLocaleString('en-IN')} | Haryana Tools`;

    // Helper to safely set or create meta tags
    const setMetaTag = (propertyAttr, attrName, value) => {
        if (!value) return;
        let selector = propertyAttr ? `meta[property="${propertyAttr}"]` : `meta[name="${attrName}"]`;
        let tag = document.querySelector(selector);
        
        if (!tag) {
            tag = document.createElement('meta');
            if (propertyAttr) tag.setAttribute('property', propertyAttr);
            if (attrName) tag.setAttribute('name', attrName);
            document.head.appendChild(tag);
        }
        tag.setAttribute('content', value);
    };

    // Standard SEO Meta
    setMetaTag(null, 'description', cleanDesc);

    // Open Graph / Facebook / WhatsApp Meta Tags
    setMetaTag('og:title', null, `${productName} - ₹${salePrice.toLocaleString('en-IN')}`);
    setMetaTag('og:description', null, cleanDesc);
    setMetaTag('og:image', null, absoluteImageUrl);
    setMetaTag('og:url', null, currentUrl);
    setMetaTag('og:type', null, 'product');

    // Twitter Card Meta Tags
    setMetaTag(null, 'twitter:card', 'summary_large_image');
    setMetaTag(null, 'twitter:title', `${productName} - ₹${salePrice.toLocaleString('en-IN')}`);
    setMetaTag(null, 'twitter:description', cleanDesc);
    setMetaTag(null, 'twitter:image', absoluteImageUrl);
}



}

function renderImageGallery(images, productName) {
    const mainImageEl = document.getElementById('main-product-image');
    const thumbnailContainer = document.getElementById('product-thumbnails');
    const validImages = (images || []).filter(img => img && typeof img === 'string');
    const primaryImg = validImages.length > 0 ? validImages[0] : '404.webp';

    if (mainImageEl) {
        mainImageEl.src = primaryImg;
        mainImageEl.alt = productName;
        mainImageEl.onerror = function() { this.src = '404.webp'; };
    }

    if (thumbnailContainer) {
        if (validImages.length > 1) {
            thumbnailContainer.innerHTML = validImages.map((img, idx) => `
                <div class="p-1 border rounded cursor-pointer thumb-item ${idx === 0 ? 'border-primary' : ''}" style="width: 70px; height: 70px;" onclick="changeMainImage('${img}', this)">
                    <img src="${img}" alt="" class="w-100 h-100 object-fit-contain" onerror="this.src='404.webp'">
                </div>
            `).join('');
            thumbnailContainer.style.display = 'flex';
        } else {
            thumbnailContainer.style.display = 'none';
        }
    }
}

window.changeMainImage = function(src, thumbElement) {
    const mainImageEl = document.getElementById('main-product-image');
    if (mainImageEl) mainImageEl.src = src;
    document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('border-primary'));
    if (thumbElement) thumbElement.classList.add('border-primary');
};

function renderSpecifications(product) {
    const specsContainer = document.getElementById('product-specs-table');
    if (!specsContainer) return;

    const brandName = product.brand || product.Brand || 'General';
    const brandSlug = slugify(brandName);

    const categoryName = product.Category || product.category || 'Uncategorized';
    const categorySlug = slugify(categoryName);

    const manufacturerName = product.manufacturer || product.Manufacturer || brandName;
    const manufacturerSlug = slugify(manufacturerName);

    let specs = [
        { label: 'ASIN / SKU', value: product.asin || product.SKU || product.sku },
        { label: 'Brand', value: `<a href="category.html?brand=${brandSlug}" class="text-primary text-decoration-none fw-semibold">${escapeHtml(brandName)}</a>`, isHtml: true },
        { label: 'Model Number', value: product.Model || product.model },
        { label: 'Category', value: `<a href="category.html?slug=${categorySlug}" class="text-primary text-decoration-none fw-semibold">${escapeHtml(categoryName)}</a>`, isHtml: true },
        { label: 'Subcategory', value: product.Subcategory || product.subcategory },
        { label: 'Manufacturer', value: `<a href="category.html?brand=${manufacturerSlug}" class="text-primary text-decoration-none fw-semibold">${escapeHtml(manufacturerName)}</a>`, isHtml: true },
        { label: 'Country of Origin', value: product.Country || product.country },
        { label: 'Rating', value: product.rating }
    ].filter(s => s.value !== undefined && s.value !== null && s.value !== '');

    if (product.specifications && typeof product.specifications === 'object') {
        for (const [key, val] of Object.entries(product.specifications)) {
            if (val !== undefined && val !== null && val !== '') {
                const formattedLabel = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, str => str.toUpperCase());
                let finalVal = val;
                const lowerKey = key.toLowerCase();

                if (lowerKey.includes('brand')) {
                    finalVal = `<a href="category.html?brand=${slugify(val)}" class="text-primary text-decoration-none fw-semibold">${escapeHtml(val)}</a>`;
                } else if (lowerKey.includes('category')) {
                    finalVal = `<a href="category.html?slug=${slugify(val)}" class="text-primary text-decoration-none fw-semibold">${escapeHtml(val)}</a>`;
                } else if (lowerKey.includes('manufacturer')) {
                    finalVal = `<a href="category.html?brand=${slugify(val)}" class="text-primary text-decoration-none fw-semibold">${escapeHtml(val)}</a>`;
                }

                specs.push({ label: formattedLabel, value: finalVal, isHtml: true });
            }
        }
    }

    specsContainer.innerHTML = specs.map(s => `
        <tr>
            <th class="w-25 text-muted">${escapeHtml(s.label)}</th>
            <td>${s.isHtml ? s.value : escapeHtml(s.value)}</td>
        </tr>
    `).join('');
}

function renderRelatedProducts(currentProduct, catalog) {
    const container = document.getElementById('related-products-grid');
    if (!container) return;

    const currentSku = (currentProduct.sku || currentProduct.SKU || currentProduct.asin || '').toLowerCase().trim();
    const currentCategory = currentProduct.Category || currentProduct.category || '';

    const related = catalog.filter(p => {
        const pSku = (p.sku || p.SKU || p.asin || '').toLowerCase().trim();
        const pCat = p.category || p.Category || '';
        return pSku !== currentSku && pCat && currentCategory && pCat.toLowerCase() === currentCategory.toLowerCase();
    }).slice(0, 4);

    if (related.length === 0) {
        const section = document.getElementById('related-products-section');
        if (section) section.style.display = 'none';
        return;
    }

    container.innerHTML = related.map(product => {
        const productSku = product.sku || product.SKU || product.asin || '';
        const productName = product.name || product.Name || product.title || '';
        const productImg = product.image || product.Image || '404.webp';
        
        const rawRelatedPrice = product.price ?? product["Sale Price"] ?? product.current_price ?? product.SalePrice ?? product.MRP ?? 0;
        const productPrice = parseNumericPrice(rawRelatedPrice);
        
        const productBrand = product.brand || product.Brand || 'General';

        return `
            <div class="col-6 col-md-3 mb-4">
                <div class="card h-100 product-card shadow-sm border-0">
                    <a href="product.html?sku=${productSku}" class="text-decoration-none">
                        <div class="product-img-wrapper position-relative overflow-hidden" style="height: 160px; background-color: #f8f9fa;">
                            <img src="${productImg}" alt="${escapeHtml(productName)}" class="w-100 h-100 object-fit-contain p-2" onerror="this.src='404.webp'">
                        </div>
                    </a>
                    <div class="card-body d-flex flex-column p-3">
                        <span class="text-uppercase text-muted small mb-1">${escapeHtml(productBrand)}</span>
                        <h5 class="card-title fs-6 mb-2">
                            <a href="product.html?sku=${productSku}" class="text-dark text-decoration-none stretched-link">${escapeHtml(productName)}</a>
                        </h5>
                        <div class="mt-auto d-flex align-items-center justify-content-between pt-2">
                            <span class="fw-bold text-primary">₹${productPrice.toLocaleString('en-IN')}</span>
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
            const productName = product.title || product.Name || product.name || 'Product';
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
    setTimeout(() => { toast.remove(); }, 3000);
}

function addToCartAction(product, quantity) {
    let cart = JSON.parse(localStorage.getItem('ht_cart') || '[]');
    const productSku = (product.sku || product.SKU || product.asin || '').toLowerCase().trim();
    const existingIndex = cart.findIndex(item => (item.sku || '').toLowerCase().trim() === productSku);

    const rawCartPrice = product.current_price ?? product["Sale Price"] ?? product.SalePrice ?? product.salePrice ?? product.MRP ?? product.price ?? 0;
    const itemPrice = parseNumericPrice(rawCartPrice);

    if (existingIndex > -1) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || cart[existingIndex].qty || 1) + quantity;
        if (cart[existingIndex].qty) cart[existingIndex].qty = cart[existingIndex].quantity;
    } else {
        cart.push({
            sku: product.sku || product.SKU || product.asin,
            name: product.title || product.Name || product.name,
            price: itemPrice,
            image: product.image_url_1 || product.Image || product.image || '',
            quantity: quantity,
            unit: product.Unit || product.unit || 'PC'
        });
    }

    localStorage.setItem('ht_cart', JSON.stringify(cart));
    updateCartCountBadge();
}

function updateCartCountBadge() {
    const cart = JSON.parse(localStorage.getItem('ht_cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || item.qty || 1), 0);
    document.querySelectorAll('.cart-count-badge').forEach(badge => {
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
}

async function loadAndRenderComments(sku) {
    const container = document.getElementById('comments-list-container');
    if (!container) return;

    container.innerHTML = '<p class="text-muted fst-italic">Loading reviews from server...</p>';

    let comments = [];

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        if (response.ok) {
            const allReviews = await response.json();
            comments = allReviews.filter(r => r.sku === sku);
        }
    } catch (err) {
        console.warn('Could not fetch remote reviews, falling back to local cache.', err);
        const storageKey = `ht_comments_${sku}`;
        comments = JSON.parse(localStorage.getItem(storageKey) || '[]');
    }

    if (comments.length === 0) {
        container.innerHTML = '<p class="text-muted fst-italic">No reviews yet. Be the first to share your feedback!</p>';
        return;
    }

    container.innerHTML = comments.map(c => `
        <div class="card border-0 shadow-sm p-3 mb-3 rounded-3 bg-white">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <h6 class="fw-bold mb-0 text-dark">👤 ${escapeHtml(c.author)}</h6>
                <span class="text-muted small">${escapeHtml(c.date)}</span>
            </div>
            <div class="mb-2 text-warning fs-6">
                ${'★'.repeat(c.rating)}${'☆'.repeat(5 - c.rating)}
            </div>
            <p class="mb-0 text-secondary" style="font-size: 0.95rem;">${escapeHtml(c.text)}</p>
        </div>
    `).join('');
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
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'anonymous-comment-form') {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-review-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting...';
        }

        const urlParams = new URLSearchParams(window.location.search);
        const sku = (urlParams.get('sku') || urlParams.get('id') || urlParams.get('asin') || 'default_product').toLowerCase().trim();
        
        const authorInput = document.getElementById('comment-author').value.trim();
        const ratingInput = document.getElementById('comment-rating').value;
        const textInput = document.getElementById('comment-text').value.trim();
        const trapField = document.getElementById('website_trap');
        const trapInput = trapField ? trapField.value : '';

        if (!textInput) {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Post Review'; }
            return;
        }

        const payload = {
            sku: sku,
            author: authorInput || 'Anonymous Buyer',
            rating: ratingInput,
            text: textInput,
            website_trap: trapInput
        };

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const newComment = {
                author: payload.author,
                rating: parseInt(payload.rating),
                text: payload.text,
                date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
            };

            const storageKey = `ht_comments_${sku}`;
            let existingComments = JSON.parse(localStorage.getItem(storageKey) || '[]');
            existingComments.unshift(newComment);
            localStorage.setItem(storageKey, JSON.stringify(existingComments));

            e.target.reset();
            loadAndRenderComments(sku);
            
            alert('Thank you! Your review has been successfully posted.');
        } catch (err) {
            console.error('Error posting review:', err);
            alert('There was an error posting your review. Please try again.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post Review';
            }
        }
    }
});
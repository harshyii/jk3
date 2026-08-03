document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('dist/data/catalog.json');
        if (!response.ok) throw new Error('Failed to load product catalog');
        const products = await response.json();
        
        renderFeaturedProducts(products);
        initHomeAddToCart(products);

        try {
            const blogResponse = await fetch('dist/data/blogs.json');
            if (blogResponse.ok) {
                const blogs = await blogResponse.json();
                renderBlogs(blogs);
            }
        } catch (blogErr) {
            console.warn('Could not load blogs:', blogErr);
        }

        initializeSearch(products);
    } catch (error) {
        console.error('Error initializing home page:', error);
    }
});

// Helper function to safely parse prices like '₹340.00' or '₹1,139' into clean numbers
function parseNumericPrice(value) {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const cleanStr = value.toString().replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
}

function renderFeaturedProducts(products) {
    const container = document.getElementById('product-grid');
    if (!container) return;

    // Filter out items that lack images or have broken 404 images to ensure "better looking" items
    const validProducts = products.filter(p => {
        const img = p.image_url_1 || p.image || p.Image || '';
        return img && img !== '404.webp' && !img.includes('placeholder');
    });

    const pool = validProducts.length > 0 ? validProducts : products;

    // Shuffle pool using Fisher-Yates algorithm for true random display on every reload
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Select top 8 random products with nice visual presentation criteria
    let featured = shuffled.slice(0, 12);

    if (featured.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No products available at the moment.</p>';
        return;
    }

    container.innerHTML = featured.map(product => {
        const productSku = product.sku || product.SKU || product.asin || product.ASIN || '';
        const productName = product.title || product.Name || product.name || '';
        const productImg = product.image_url_1 || product.image || product.Image || '404.webp';
        
        const rawPrice = product.current_price ?? product["Sale Price"] ?? product.SalePrice ?? product.price ?? product.MRP ?? 0;
        const productPrice = parseNumericPrice(rawPrice);

        // Fetch discount percentage if calculated by our pipeline script earlier
        const discountPercentage = product.discount_percentage ? parseFloat(product.discount_percentage) : 0;

        const productUnit = product.unit || product.Unit || 'PC';
        const productBrand = product.brand || product.Brand || 'General';

        return `
            <div class="col-6 col-md-4 col-lg-3 mb-4">
                <div class="card h-100 product-card shadow-sm border-0 d-flex flex-column position-relative overflow-hidden hover-shadow transition">
                    ${discountPercentage > 0 ? `<span class="badge bg-danger position-absolute top-0 start-0 m-2 z-2 px-2 py-1 shadow-sm">${Math.round(discountPercentage)}% OFF</span>` : ''}
                    <a href="product.html?sku=${productSku}" class="text-decoration-none">
                        <div class="product-img-wrapper position-relative overflow-hidden bg-white d-flex align-items-center justify-content-center" style="height: 210px;">
                            <img src="${productImg}" alt="${escapeHtml(productName)}" class="w-100 h-100 object-fit-contain p-3 transition-transform" onerror="this.src='404.webp'">
                        </div>
                    </a>
                    <div class="card-body d-flex flex-column p-3 bg-light bg-opacity-25">
                        <span class="text-uppercase text-muted small fw-bold mb-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">${escapeHtml(productBrand)}</span>
                        <h5 class="card-title fs-6 mb-2 text-truncate-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.6em;">
                            <a href="product.html?sku=${productSku}" class="text-dark text-decoration-none stretched-link">${escapeHtml(productName)}</a>
                        </h5>
                        <div class="mt-auto pt-2">
                            <div class="d-flex align-items-baseline mb-2">
                                <span class="fw-bold text-primary fs-5 me-2">₹${productPrice.toLocaleString('en-IN')}</span>
                            </div>
                            <div class="d-flex gap-2 position-relative z-1">
                                <a href="product.html?sku=${productSku}" class="btn btn-sm btn-outline-secondary w-50 fw-semibold">View</a>
                                <button class="btn btn-sm btn-primary w-50 home-add-to-cart-btn fw-semibold shadow-sm"
                                    data-sku="${productSku}"
                                    data-name="${escapeHtml(productName)}"
                                    data-price="${productPrice}"
                                    data-image="${productImg}"
                                    data-unit="${productUnit}"
                                    type="button"><i class="bi bi-cart-plus me-1"></i> Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function initHomeAddToCart(products) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    productGrid.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.home-add-to-cart-btn');
        if (!addBtn) return;

        const sku = addBtn.dataset.sku;
        const name = addBtn.dataset.name;
        const price = parseNumericPrice(addBtn.dataset.price);
        const image = addBtn.dataset.image;
        const unit = addBtn.dataset.unit || 'PC';

        let cart = JSON.parse(localStorage.getItem('ht_cart') || '[]');
        const existingIndex = cart.findIndex(item => item.sku === sku);

        if (existingIndex > -1) {
            cart[existingIndex].quantity = (cart[existingIndex].quantity || cart[existingIndex].qty || 1) + 1;
            if (cart[existingIndex].qty) cart[existingIndex].qty = cart[existingIndex].quantity;
        } else {
            cart.push({
                sku: sku,
                name: name,
                price: price,
                image: image,
                quantity: 1,
                unit: unit
            });
        }

        localStorage.setItem('ht_cart', JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));

        showCappedButtonToast(`${name} added to cart!`);
    });
}

function showCappedButtonToast(message) {
    let container = document.getElementById('global-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'global-toast-container';
        container.className = 'position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    const existingToasts = container.querySelectorAll('.toast');
    if (existingToasts.length >= 2) {
        existingToasts[0].remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast show align-items-center text-white bg-success border-0 shadow-lg p-3 mb-2';
    toast.style.cursor = 'pointer';
    toast.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
            <div class="fw-semibold me-3">✓ ${escapeHtml(message)}</div>
            <button class="btn btn-sm btn-light text-success fw-bold px-3 py-1 shadow-sm" type="button">View Cart &rarr;</button>
        </div>
    `;

    toast.addEventListener('click', () => {
        window.location.href = 'cart.html';
    });

    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 4000);
}

function renderBlogs(blogs) {
    const container = document.getElementById('blog-grid');
    if (!container) return;

    const sortedBlogs = [...blogs].sort((a, b) => {
        const dateA = new Date(a.date || a.Date || 0);
        const dateB = new Date(b.date || b.Date || 0);
        return dateB - dateA;
    });

    const latestBlogs = sortedBlogs.slice(0, 3);
    if (latestBlogs.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No blog posts available.</p>';
        return;
    }

    container.innerHTML = latestBlogs.map(blog => {
        let rawDate = blog.date || blog.Date || '';
        let displayDate = (rawDate && isNaN(rawDate)) ? rawDate : 'Recent Guide';
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0">
                    <div style="height: 160px; background-color: #f8f9fa; overflow: hidden;">
                        <img src="${blog.image || blog.FeaturedImage || '404.webp'}" alt="${escapeHtml(blog.title || blog.Title)}" class="w-100 h-100 object-fit-cover" onerror="this.src='404.webp'">
                    </div>
                    <div class="card-body d-flex flex-column p-3">
                        <small class="text-muted mb-1">${escapeHtml(displayDate)} &bull; ${escapeHtml(blog.category || blog.Category || 'General')}</small>
                        <h5 class="card-title fs-6 fw-bold mb-2">
                            <a href="blog.html?slug=${blog.slug || blog.Slug}" class="text-dark text-decoration-none stretched-link">${escapeHtml(blog.title || blog.Title)}</a>
                        </h5>
                        <p class="card-text text-muted small mb-3">${escapeHtml(blog.excerpt || blog.MetaDescription || '')}</p>
                        <div class="mt-auto">
                            <a href="blog.html?slug=${blog.slug || blog.Slug}" class="text-decoration-none fw-semibold small position-relative z-1">Read More <i class="bi bi-arrow-right"></i></a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function initializeSearch(products) {
    const searchInput = document.getElementById('main-search-input');
    const searchResults = document.getElementById('main-search-results');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!searchResults) return;

        if (query.length < 2) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('show');
            return;
        }

        const matches = products.filter(p => {
            const pName = p.title || p.name || p.Name || '';
            const pBrand = p.brand || p.Brand || '';
            const pCat = p.category || p.Category || '';
            return pName.toLowerCase().includes(query) || pBrand.toLowerCase().includes(query) || pCat.toLowerCase().includes(query);
        }).slice(0, 5);

        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="dropdown-item text-muted py-2">No products found</div>';
            searchResults.classList.add('show');
            return;
        }

        searchResults.innerHTML = matches.map(p => {
            const productSku = p.sku || p.SKU || p.asin || p.ASIN || '';
            const productName = p.title || p.name || p.Name || '';
            const productImg = p.image_url_1 || p.image || p.Image || '404.webp';
            
            const rawPrice = p.current_price ?? p["Sale Price"] ?? p.SalePrice ?? p.price ?? p.MRP ?? 0;
            const productPrice = parseNumericPrice(rawPrice);

            return `
                <a href="product.html?sku=${productSku}" class="dropdown-item d-flex align-items-center py-2 border-bottom">
                    <img src="${productImg}" alt="" style="width: 40px; height: 40px; object-fit: contain;" class="me-2 bg-light rounded" onerror="this.src='404.webp'">
                    <div class="text-truncate">
                        <div class="fw-semibold text-dark text-truncate" style="max-width: 250px;">${escapeHtml(productName)}</div>
                        <small class="text-muted">₹${productPrice.toLocaleString('en-IN')}</small>
                    </div>
                </a>
            `;
        }).join('');
        searchResults.classList.add('show');
    });

    document.addEventListener('click', (e) => {
        if (searchResults && !searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('show');
        }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
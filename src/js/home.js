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

// Helper function to safely parse prices into clean numbers
function parseNumericPrice(value) {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const cleanStr = value.toString().replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
}

// Helper function to extract a valid single image URL from pipe-separated strings ('url1 | url2') or arrays
function getPrimaryImage(product) {
    let rawImg = product.image_url_2 || product.image_url_1 || product.Image || product.image || '';

    if (Array.isArray(rawImg)) {
        rawImg = rawImg[0] || '';
    }

    if (typeof rawImg === 'string' && rawImg.includes('|')) {
        rawImg = rawImg.split('|')[0].trim();
    }

    return (typeof rawImg === 'string' && rawImg.startsWith('http')) ? rawImg : '404.webp';
}

// Helper function to extract spec label and value (e.g., { label: "Length", value: "160mm" })
function extractProductSpec(product, title) {
    const specs = product.specifications || {};

    // 1. Check direct JSON specifications first
    if (specs['Item Length'] || specs['Length']) {
        return { label: 'Length', value: specs['Item Length'] || specs['Length'] };
    }
    if (specs['Item Width'] || specs['Width']) {
        return { label: 'Width', value: specs['Item Width'] || specs['Width'] };
    }
    if (specs['Outside Diameter']) {
        return { label: 'OD', value: specs['Outside Diameter'] };
    }
    if (specs['Diameter']) {
        return { label: 'Dia', value: specs['Diameter'] };
    }
    if (specs['Size'] || product.size || product.Size) {
        return { label: 'Size', value: specs['Size'] || product.size || product.Size };
    }
    if (specs['Item Dimensions L x W']) {
        return { label: 'Dim', value: specs['Item Dimensions L x W'] };
    }

    // 2. Fallback regex analysis from title context
    const titleStr = String(title);

    // Detect specific dimension keywords in title
    if (/length/i.test(titleStr)) {
        const match = titleStr.match(/(\d+(\.\d+)?\s*(mm|cm|m|ft|feet|inch|"|in))/i);
        if (match) return { label: 'Length', value: match[0] };
    }
    if (/width/i.test(titleStr)) {
        const match = titleStr.match(/(\d+(\.\d+)?\s*(mm|cm|m|ft|feet|inch|"|in))/i);
        if (match) return { label: 'Width', value: match[0] };
    }

    // Catch general dimensions in product titles (e.g., 160mm, 6 Feet, 3/4", 1")
    const genericMatch = titleStr.match(/(\d+(\.\d+)?\s*(feet|ft|meter|m|cm|mm|inch|"|in)|(\d+\/\d+\s*(inch|")))/i);
    if (genericMatch) {
        let label = 'Size';
        // Infer 'Length' for tools like pliers, blades, saws, wrenches when given in mm/cm
        if (/(plier|wrench|blade|saw|cutter|spanner|driver|file)/i.test(titleStr) && /(mm|cm|m|ft|feet)/i.test(genericMatch[0])) {
            label = 'Length';
        }
        return { label: label, value: genericMatch[0] };
    }

    return null;
}

function renderFeaturedProducts(products) {
    const container = document.getElementById('product-grid');
    if (!container) return;

    // Filter out items that lack images or have broken 404 images
    const validProducts = products.filter(p => {
        const img = getPrimaryImage(p);
        return img && img !== '404.webp' && !img.includes('placeholder');
    });

    const pool = validProducts.length > 0 ? validProducts : products;

    // Shuffle pool using Fisher-Yates algorithm for random display on reload
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let featured = shuffled.slice(0, 12);

    if (featured.length === 0) {
        container.innerHTML = '<p class="text-center text-muted col-12 py-4">No products available at the moment.</p>';
        return;
    }

    container.innerHTML = featured.map(product => {
        const productSku = product.SKU || product.sku || product.asin || product.ASIN || '';
        const productName = product.Name || product.title || product.name || 'Product';
        const productBrand = product.brand || product.Brand || (product.specifications && product.specifications['Brand Name']) || 'Eastman';
        const productImg = getPrimaryImage(product);
        
        // Extract labeled specification object (e.g., { label: "Length", value: "160mm" })
        const spec = extractProductSpec(product, productName);

        // Pricing & Discount calculation
        const currentPrice = parseNumericPrice(product.current_price ?? product.SalePrice ?? product.price ?? 0);
        const mrpPrice = parseNumericPrice(product.mrp ?? product.MRP ?? 0);
        const discountPct = product.Discount || product.discount_percentage || (mrpPrice > currentPrice && mrpPrice > 0 ? Math.round(((mrpPrice - currentPrice) / mrpPrice) * 100) : 0);

        const productUnit = product.Unit || product.unit || '1 Count';

        return `
            <div class="col-6 col-md-4 col-lg-3 mb-4">
                <div class="card h-100 product-card shadow-sm border-0 rounded-3 overflow-hidden d-flex flex-column">
                    
                    <!-- Image Wrapper with Top-Right Brand Badge & Top-Left Discount Badge -->
                    <div class="product-img-wrapper position-relative overflow-hidden bg-white text-center p-3 d-flex align-items-center justify-content-center" style="height: 190px;">
                        
                        <!-- Top-Right Brand Badge -->
                        <span class="position-absolute top-0 end-0 m-2 badge bg-dark bg-opacity-75 text-white text-uppercase fw-semibold px-2 py-1" style="font-size: 0.65rem; letter-spacing: 0.5px; z-index: 2;">
                            ${escapeHtml(productBrand)}
                        </span>

                        <!-- Top-Left Discount Badge -->
                        ${discountPct > 0 ? `
                            <span class="position-absolute top-0 start-0 m-2 badge bg-danger text-white fw-bold px-2 py-1" style="font-size: 0.65rem; z-index: 2;">
                                -${Math.round(discountPct)}% OFF
                            </span>
                        ` : ''}

                        <a href="product.html?sku=${encodeURIComponent(productSku)}" class="w-100 h-100 d-flex align-items-center justify-content-center">
                            <img src="${productImg}" alt="${escapeHtml(productName)}" class="mw-100 mh-100 object-fit-contain transition-transform" onerror="this.src='404.webp'">
                        </a>
                    </div>

                    <!-- Card Body -->
                    <div class="card-body d-flex flex-column p-3 bg-light">
                        
                        <!-- 2-Line Clamped Title -->
                        <h5 class="card-title text-dark mb-2" 
                            title="${escapeHtml(productName)}" 
                            style="font-size: 0.85rem; line-height: 1.35; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.3em;">
                            <a href="product.html?sku=${encodeURIComponent(productSku)}" class="text-dark text-decoration-none">${escapeHtml(productName)}</a>
                        </h5>

                        <!-- Labeled Spec Badge (e.g., Size: 1" or Length: 160mm) -->
                        <div class="mb-2" style="min-height: 22px;">
                            ${spec ? `
                                <span class="badge bg-white text-primary border border-primary-subtle fw-bold px-2 py-1" style="font-size: 0.72rem;">
                                    <i class="bi bi-ruler me-1"></i>${escapeHtml(spec.label)}: ${escapeHtml(spec.value)}
                                </span>
                            ` : ''}
                        </div>

                        <!-- Price & MRP Display -->
                        <div class="mt-auto pt-2 border-top border-secondary-subtle">
                            <div class="d-flex align-items-baseline mb-2">
                                <span class="fw-bold text-primary fs-6 me-2">₹${currentPrice.toLocaleString('en-IN')}</span>
                                ${mrpPrice > currentPrice ? `<span class="text-muted text-decoration-line-through" style="font-size: 0.75rem;">₹${mrpPrice.toLocaleString('en-IN')}</span>` : ''}
                            </div>

                            <div class="d-flex gap-2 position-relative z-1">
                                <a href="product.html?sku=${encodeURIComponent(productSku)}" class="btn btn-sm btn-outline-secondary w-50 fw-semibold">View</a>
                                <button class="btn btn-sm btn-primary w-50 home-add-to-cart-btn fw-semibold shadow-sm"
                                    data-sku="${encodeURIComponent(productSku)}"
                                    data-name="${escapeHtml(productName)}"
                                    data-price="${currentPrice}"
                                    data-image="${productImg}"
                                    data-unit="${escapeHtml(productUnit)}"
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

        const sku = decodeURIComponent(addBtn.dataset.sku);
        const name = addBtn.dataset.name;
        const price = parseNumericPrice(addBtn.dataset.price);
        const image = addBtn.dataset.image;
        const unit = addBtn.dataset.unit || '1 Count';

        let cart = JSON.parse(localStorage.getItem('ht_cart') || '[]');
        const existingIndex = cart.findIndex(item => String(item.sku) === String(sku));

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
        container.innerHTML = '<p class="text-center text-muted col-12 py-4">No blog posts available.</p>';
        return;
    }

    container.innerHTML = latestBlogs.map(blog => {
        let rawDate = blog.date || blog.Date || '';
        let displayDate = (rawDate && isNaN(rawDate)) ? rawDate : 'Recent Guide';
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0 rounded-3 overflow-hidden">
                    <div style="height: 160px; background-color: #f8f9fa; overflow: hidden;">
                        <img src="${blog.image || blog.FeaturedImage || '404.webp'}" alt="${escapeHtml(blog.title || blog.Title)}" class="w-100 h-100 object-fit-cover" onerror="this.src='404.webp'">
                    </div>
                    <div class="card-body d-flex flex-column p-3">
                        <small class="text-muted mb-1">${escapeHtml(displayDate)} &bull; ${escapeHtml(blog.category || blog.Category || 'General')}</small>
                        <h5 class="card-title fs-6 fw-bold mb-2">
                            <a href="blogs/${blog.slug || blog.Slug}.html" class="text-dark text-decoration-none stretched-link">${escapeHtml(blog.title || blog.Title)}</a>
                        </h5>
                        <p class="card-text text-muted small mb-3">${escapeHtml(blog.excerpt || blog.MetaDescription || '')}</p>
                        <div class="mt-auto">
                            <a href="blogs/${blog.slug || blog.Slug}.html" class="text-decoration-none fw-semibold small position-relative z-1">Read More <i class="bi bi-arrow-right"></i></a>
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
            const pName = p.Name || p.title || p.name || '';
            const pBrand = p.brand || p.Brand || (p.specifications && p.specifications['Brand Name']) || '';
            const pCat = p.Category || p.category || '';
            const pSku = p.SKU || p.sku || p.asin || p.ASIN || '';
            return pName.toLowerCase().includes(query) || pBrand.toLowerCase().includes(query) || pCat.toLowerCase().includes(query) || pSku.toLowerCase().includes(query);
        }).slice(0, 5);

        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="dropdown-item text-muted py-2">No products found</div>';
            searchResults.classList.add('show');
            return;
        }

        searchResults.innerHTML = matches.map(p => {
            const productSku = p.SKU || p.sku || p.asin || p.ASIN || '';
            const productName = p.Name || p.title || p.name || '';
            const productImg = getPrimaryImage(p);
            
            const rawPrice = p.current_price ?? p.SalePrice ?? p.price ?? 0;
            const productPrice = parseNumericPrice(rawPrice);

            return `
                <a href="product.html?sku=${encodeURIComponent(productSku)}" class="dropdown-item d-flex align-items-center py-2 border-bottom">
                    <img src="${productImg}" alt="" style="width: 40px; height: 40px; object-fit: contain;" class="me-2 bg-light rounded p-1" onerror="this.src='404.webp'">
                    <div class="text-truncate">
                        <div class="fw-semibold text-dark text-truncate" style="max-width: 250px;">${escapeHtml(productName)}</div>
                        <small class="text-primary fw-bold">₹${productPrice.toLocaleString('en-IN')}</small>
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
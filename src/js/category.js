/**
 * category.js - Handles fetching, filtering, sorting, and pagination for catalog.html
 */

// 1. Primary & Fallback JSON Data File Paths
const DATA_PATHS = {
    products: ['../dist/data/catalog.json', 'data/catalog.json', 'dist/data/catalog.json'],
    categories: ['../dist/data/categories.json', 'data/categories.json', 'dist/data/categories.json'],
    brands: ['../dist/data/brands.json', 'data/brands.json', 'dist/data/brands.json']
};

const state = {
    products: [],
    filteredProducts: [],
    categories: [],
    brands: [],
    currentPage: 1,
    itemsPerPage: 12,
    filters: {
        category: '',
        brand: '',
        search: '',
        sort: 'default'
    }
};

const elements = {
    productGrid: document.getElementById('product-grid'),
    paginationContainer: document.getElementById('pagination-container'),
    categoryFilter: document.getElementById('category-filter'),
    brandFilter: document.getElementById('brand-filter'),
    sortSelect: document.getElementById('sort-select'),
    searchInput: document.getElementById('search-input'),
    categoryTitle: document.getElementById('category-title')
};

document.addEventListener('DOMContentLoaded', initCatalog);

async function initCatalog() {
    setupEventListeners();
    readUrlParams();

    await Promise.all([
        loadBrands(),
        loadCategories(),
        loadProducts()
    ]);

    // Sync dropdown UI state after async fetching completes
    if (elements.categoryFilter && state.filters.category) {
        elements.categoryFilter.value = state.filters.category;
    }
    if (elements.brandFilter && state.filters.brand) {
        elements.brandFilter.value = state.filters.brand;
    }

    applyFiltersAndRender();
}

/* ==========================================================================
   Helper & Utility Functions
   ========================================================================== */

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
}

function parsePrice(val) {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const clean = val.toString().replace(/[^0-9.]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
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

async function fetchWithFallback(paths) {
    for (const path of paths) {
        try {
            const res = await fetch(path);
            if (res.ok) return await res.json();
        } catch (e) {
            // Silently try next fallback path
        }
    }
    throw new Error('All resource fetch paths failed.');
}

function readUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('category') || urlParams.get('slug');
    const brand = urlParams.get('brand');
    const search = urlParams.get('q') || urlParams.get('search');

    if (cat) state.filters.category = slugify(cat);
    if (brand) state.filters.brand = slugify(brand);
    if (search) {
        state.filters.search = search.trim();
        if (elements.searchInput) elements.searchInput.value = search.trim();
    }
}

/* ==========================================================================
   Data Loading
   ========================================================================== */

async function loadBrands() {
    if (!elements.brandFilter) return;

    try {
        state.brands = await fetchWithFallback(DATA_PATHS.brands);
        elements.brandFilter.innerHTML = '<option value="">All Brands</option>';

        state.brands.forEach(brand => {
            const option = document.createElement('option');
            const name = brand.name || brand;
            const slug = brand.slug || slugify(name);
            const count = brand.count !== undefined ? ` (${brand.count})` : '';

            option.value = slug;
            option.textContent = `${name}${count}`;
            elements.brandFilter.appendChild(option);
        });
    } catch (err) {
        console.warn('Could not load brands list, will auto-extract from products if available.');
    }
}

async function loadCategories() {
    if (!elements.categoryFilter) return;

    try {
        state.categories = await fetchWithFallback(DATA_PATHS.categories);
        populateCategoryDropdown(state.categories);
    } catch (err) {
        console.warn('categories.json missing, falling back to dynamic extraction.');
    }
}

function populateCategoryDropdown(categories) {
    if (!elements.categoryFilter) return;

    elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';

    categories.forEach(cat => {
        const option = document.createElement('option');
        const name = typeof cat === 'object' ? (cat.name || cat.title) : cat;
        const slug = typeof cat === 'object' ? (cat.slug || slugify(name)) : slugify(cat);
        const count = typeof cat === 'object' && cat.count !== undefined ? ` (${cat.count})` : '';

        option.value = slug;
        option.textContent = `${name}${count}`;
        elements.categoryFilter.appendChild(option);
    });
}

async function loadProducts() {
    try {
        state.products = await fetchWithFallback(DATA_PATHS.products);

        if (!state.categories.length) {
            extractCategoriesFromProducts(state.products);
        }
    } catch (err) {
        console.error('Error loading products catalog:', err);
        if (elements.productGrid) {
            elements.productGrid.innerHTML = `
                <div class="col-12 text-center text-danger py-5">
                    <p class="fs-5">Failed to load product catalog.</p>
                </div>`;
        }
    }
}

function extractCategoriesFromProducts(products) {
    const map = {};
    products.forEach(p => {
        const name = p.category || p.Category || 'General';
        const slug = slugify(p.categorySlug || name);
        if (!map[slug]) map[slug] = { name, slug, count: 0 };
        map[slug].count++;
    });

    state.categories = Object.values(map);
    populateCategoryDropdown(state.categories);
}

/* ==========================================================================
   Filtering & Sorting
   ========================================================================== */

function applyFiltersAndRender() {
    let result = [...state.products];

    // Filter by Category
    if (state.filters.category) {
        result = result.filter(p => {
            const cat = slugify(p.categorySlug || p.category || p.Category || '');
            return cat === state.filters.category;
        });
    }

    // Filter by Brand
    if (state.filters.brand) {
        result = result.filter(p => {
            const b = slugify(p.brandSlug || p.brand || p.Brand || p.brandName || '');
            return b === state.filters.brand;
        });
    }

    // Filter by Search Query
    if (state.filters.search) {
        const q = state.filters.search.toLowerCase();
        result = result.filter(p => {
            const title = (p.title || p.Title || p.name || p.Name || '').toLowerCase();
            const sku = (p.sku || p.SKU || p.asin || '').toLowerCase();
            const desc = (p.description || p.Description || '').toLowerCase();
            return title.includes(q) || sku.includes(q) || desc.includes(q);
        });
    }

    // Sort Results
    switch (state.filters.sort) {
        case 'price-low':
            result.sort((a, b) => parsePrice(a.SalePrice ?? a.current_price ?? a.price ?? a.MRP) - parsePrice(b.SalePrice ?? b.current_price ?? b.price ?? b.MRP));
            break;
        case 'price-high':
            result.sort((a, b) => parsePrice(b.SalePrice ?? b.current_price ?? b.price ?? b.MRP) - parsePrice(a.SalePrice ?? a.current_price ?? a.price ?? a.MRP));
            break;
        case 'name':
            result.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
            break;
    }

    state.filteredProducts = result;
    state.currentPage = 1;

    updateHeading();
    renderPage();
}

/* ==========================================================================
   UI Rendering
   ========================================================================== */

function renderPage() {
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const end = start + state.itemsPerPage;
    const batch = state.filteredProducts.slice(start, end);

    renderProductGrid(batch);
    renderPagination(state.filteredProducts.length);
}

function renderProductGrid(products) {
    if (!elements.productGrid) return;

    if (products.length === 0) {
        elements.productGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <p class="fs-5 text-muted">No products found matching your current selection.</p>
            </div>`;
        return;
    }

    elements.productGrid.innerHTML = products.map(product => {
        const title = product.title 
            || product.Title 
            || product.Name 
            || product.name 
            || product.product_name 
            || product['Product Name'] 
            || product.SKU 
            || product.asin 
            || 'Untitled Product';

        // Extract primary image
        let imageUrl = '404.webp';
        const rawImage = product.Image 
            || product.image 
            || product.thumbnail 
            || product.image_url_1 
            || (Array.isArray(product.Images) ? product.Images[0] : '')
            || (Array.isArray(product.image_urls) ? product.image_urls[0] : '');

        if (typeof rawImage === 'string' && rawImage.trim() !== '') {
            imageUrl = rawImage.split('|')[0].trim();
        }

        // Prices
        const rawActivePrice = product.SalePrice ?? product.current_price ?? product.salePrice ?? product.price ?? product.Price ?? product.MRP;
        const activePrice = parsePrice(rawActivePrice);
        
        const rawMrp = product.mrp ?? product.MRP ?? product["List Price"];
        const mrpPrice = parsePrice(rawMrp);

        const priceText = activePrice > 0 ? `₹${activePrice.toLocaleString('en-IN')}` : 'Contact for Price';
        const mrpText = mrpPrice > activePrice 
            ? `<span class="text-decoration-line-through text-muted small ms-2">₹${mrpPrice.toLocaleString('en-IN')}</span>` 
            : '';

        // Badges
        const brandName = product.brand || product.Brand || product.brandName || product.specifications?.['Brand Name'] || '';
        const brandBadge = brandName 
            ? `<span class="badge bg-dark position-absolute top-0 end-0 m-2">${escapeHtml(brandName)}</span>` 
            : '';

        const isOutOfStock = product.StockQuantity === 0 || product.stockQuantity === 0;
        const stockBadge = isOutOfStock 
            ? `<span class="badge bg-danger position-absolute top-0 start-0 m-2">Out of Stock</span>` 
            : '';

        // Specification Badges
        let sizeText = product.size || product.Size || (Array.isArray(product.sizes) ? product.sizes.join(', ') : '') || product.dimensions;

        if (!sizeText) {
            const driveMatch = title.match(/1\/[248]\s*(?:Inch|")?\s*(?:Sq\.?)?\s*Drive/i) || product.description?.match(/1\/[248]\s*Sq\s*Drive/i);
            const pieceMatch = title.match(/\d+\s*(?:Pcs|Pieces|Pc|Set)/i);
            const mmMatch = title.match(/\d+(?:\.\d+)?\s*mm/i);

            if (driveMatch && pieceMatch) {
                sizeText = `${driveMatch[0]} • ${pieceMatch[0]}`;
            } else if (driveMatch) {
                sizeText = driveMatch[0];
            } else if (pieceMatch) {
                sizeText = pieceMatch[0];
            } else if (mmMatch) {
                sizeText = mmMatch[0];
            } else if (product.specifications?.['Material Type']) {
                sizeText = product.specifications['Material Type'];
            }
        }

        const sizeBadgeHTML = sizeText 
            ? `<div class="mb-2"><span class="badge bg-light text-dark border font-monospace fw-normal text-truncate d-inline-block mw-100">${escapeHtml(sizeText)}</span></div>`
            : `<div class="mb-2" style="min-height: 23px;"></div>`;

        const productId = product.SKU || product.sku || product.asin || product.ASIN || product.id || product.Slug || '';

        return `
            <div class="col">
                <div class="card h-100 product-card shadow-sm position-relative ${isOutOfStock ? 'opacity-75' : ''}">
                    ${stockBadge}
                    ${brandBadge}
                    
                    <a href="product.html?id=${productId}" class="text-decoration-none">
                        <img src="${imageUrl}" class="card-img-top p-3" alt="${escapeHtml(title)}" style="height: 180px; object-fit: contain;" onerror="this.src='404.webp'">
                    </a>
                    
                    <div class="card-body d-flex flex-column pt-1">
                        <h5 class="card-title fs-6 mb-2 text-truncate-2" title="${escapeHtml(title)}">
                            <a href="product.html?id=${productId}" class="text-dark text-decoration-none">${escapeHtml(title)}</a>
                        </h5>
                        
                        ${sizeBadgeHTML}

                        <div class="mt-auto mb-2">
                            <span class="fw-bold text-primary fs-5">${priceText}</span>
                            ${mrpText}
                        </div>

                        <a href="product.html?id=${productId}" class="btn btn-outline-primary btn-sm w-100">View Details</a>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function renderPagination(totalItems) {
    if (!elements.paginationContainer) return;

    const totalPages = Math.ceil(totalItems / state.itemsPerPage);

    if (totalItems === 0) {
        elements.paginationContainer.innerHTML = '';
        return;
    }

    const current = state.currentPage;
    const pages = [];

    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (current > 3) pages.push('...');

        const start = Math.max(2, current - 1);
        const end = Math.min(totalPages - 1, current + 1);

        for (let i = start; i <= end; i++) pages.push(i);

        if (current < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }

    const startItem = (current - 1) * state.itemsPerPage + 1;
    const endItem = Math.min(current * state.itemsPerPage, totalItems);

    let html = `
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 my-4 p-3 bg-light rounded border">
            <div class="d-flex align-items-center gap-2">
                <label for="page-size-select" class="form-label mb-0 text-nowrap text-muted small fw-bold">Show per page:</label>
                <select id="page-size-select" class="form-select form-select-sm" style="width: auto;">
                    <option value="12" ${state.itemsPerPage === 12 ? 'selected' : ''}>12</option>
                    <option value="24" ${state.itemsPerPage === 24 ? 'selected' : ''}>24</option>
                    <option value="48" ${state.itemsPerPage === 48 ? 'selected' : ''}>48</option>
                    <option value="96" ${state.itemsPerPage === 96 ? 'selected' : ''}>96</option>
                </select>
                <span class="text-muted small ms-2">Showing ${startItem}–${endItem} of ${totalItems} products</span>
            </div>

            <nav aria-label="Catalog pagination">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${current === 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>&laquo;</button>
                    </li>`;

    pages.forEach(p => {
        if (p === '...') {
            html += `<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`;
        } else {
            html += `
                <li class="page-item ${p === current ? 'active' : ''}">
                    <button class="page-link" data-page="${p}">${p}</button>
                </li>`;
        }
    });

    html += `
                    <li class="page-item ${current === totalPages ? 'disabled' : ''}">
                        <button class="page-link" data-page="${current + 1}" ${current === totalPages ? 'disabled' : ''}>&raquo;</button>
                    </li>
                </ul>
            </nav>
        </div>`;

    elements.paginationContainer.innerHTML = html;
}

function updateHeading() {
    if (!elements.categoryTitle) return;

    if (state.filters.category && elements.categoryFilter) {
        const selectedOpt = elements.categoryFilter.options[elements.categoryFilter.selectedIndex];
        elements.categoryTitle.textContent = selectedOpt ? selectedOpt.text.replace(/\s*\(\d+\)$/, '') : 'Products';
    } else if (state.filters.brand && elements.brandFilter) {
        const selectedOpt = elements.brandFilter.options[elements.brandFilter.selectedIndex];
        elements.categoryTitle.textContent = selectedOpt ? selectedOpt.text.replace(/\s*\(\d+\)$/, '') : 'Products';
    } else {
        elements.categoryTitle.textContent = 'All Products';
    }
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

function setupEventListeners() {
    elements.categoryFilter?.addEventListener('change', e => {
        state.filters.category = e.target.value;
        applyFiltersAndRender();
    });

    elements.brandFilter?.addEventListener('change', e => {
        state.filters.brand = e.target.value;
        applyFiltersAndRender();
    });

    elements.sortSelect?.addEventListener('change', e => {
        state.filters.sort = e.target.value;
        applyFiltersAndRender();
    });

    let searchTimeout;
    elements.searchInput?.addEventListener('input', e => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.filters.search = e.target.value.trim();
            applyFiltersAndRender();
        }, 300);
    });

    elements.paginationContainer?.addEventListener('click', e => {
        const button = e.target.closest('button.page-link');
        if (button && button.dataset.page) {
            const page = parseInt(button.dataset.page, 10);
            const totalPages = Math.ceil(state.filteredProducts.length / state.itemsPerPage);

            if (page >= 1 && page <= totalPages) {
                state.currentPage = page;
                renderPage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });

    elements.paginationContainer?.addEventListener('change', e => {
        if (e.target.id === 'page-size-select') {
            state.itemsPerPage = parseInt(e.target.value, 10);
            state.currentPage = 1;
            renderPage();
        }
    });
}

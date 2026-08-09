/**
 * category.js - Handles fetching, filtering, sorting, and pagination for catalog.html
 */

// 1. JSON Data File Paths (Adjust folder paths if your JSON files live elsewhere)
const DATA_PATHS = {
  products: '../dist/data/catalog.json',
  categories: '../dist/data/categories.json',
  brands: '../dist/data/brands.json'
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

  await Promise.all([
    loadBrands(),
    loadCategories(),
    loadProducts()
  ]);

  applyFiltersAndRender();
}

// --- Data Loading ---

async function loadBrands() {
  if (!elements.brandFilter) return;

  try {
    const response = await fetch(DATA_PATHS.brands);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    state.brands = await response.json();
    elements.brandFilter.innerHTML = '<option value="">All Brands</option>';
    
    state.brands.forEach(brand => {
      const option = document.createElement('option');
      option.value = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      option.textContent = brand.count !== undefined ? `${brand.name} (${brand.count})` : brand.name;
      elements.brandFilter.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading brands:', err);
  }
}

async function loadCategories() {
  if (!elements.categoryFilter) return;

  try {
    const response = await fetch(DATA_PATHS.categories);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    state.categories = await response.json();
    populateCategoryDropdown(state.categories);
  } catch (err) {
    console.warn('categories.json not found, fallback to auto-extract from products.');
  }
}

function populateCategoryDropdown(categories) {
  elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';

  categories.forEach(cat => {
    const option = document.createElement('option');
    const slug = typeof cat === 'object' ? (cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')) : cat.toLowerCase().replace(/\s+/g, '-');
    const name = typeof cat === 'object' ? cat.name : cat;
    const count = typeof cat === 'object' && cat.count !== undefined ? ` (${cat.count})` : '';

    option.value = slug;
    option.textContent = `${name}${count}`;
    elements.categoryFilter.appendChild(option);
  });
}

async function loadProducts() {
  try {
    const response = await fetch(DATA_PATHS.products);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    state.products = await response.json();

    if (!state.categories.length) {
      extractCategoriesFromProducts(state.products);
    }
  } catch (err) {
    console.error('Error loading products:', err);
    if (elements.productGrid) {
      elements.productGrid.innerHTML = `
        <div class="col-12 text-center text-danger py-4">
          <p>Failed to load product catalog.</p>
        </div>`;
    }
  }
}

function extractCategoriesFromProducts(products) {
  const map = {};
  products.forEach(p => {
    const name = p.category || 'General';
    const slug = (p.categorySlug || name).toLowerCase().replace(/\s+/g, '-');
    if (!map[slug]) map[slug] = { name, slug, count: 0 };
    map[slug].count++;
  });

  state.categories = Object.values(map);
  populateCategoryDropdown(state.categories);
}

// --- Filtering & Sorting ---

function applyFiltersAndRender() {
  let result = [...state.products];

  if (state.filters.category) {
    result = result.filter(p => {
      const cat = (p.categorySlug || p.category || '').toLowerCase().replace(/\s+/g, '-');
      return cat === state.filters.category.toLowerCase();
    });
  }

  if (state.filters.brand) {
    result = result.filter(p => {
      const b = (p.brandSlug || p.brand || p.brandName || '').toLowerCase().replace(/\s+/g, '-');
      return b === state.filters.brand.toLowerCase();
    });
  }

  if (state.filters.search) {
    const q = state.filters.search.toLowerCase();
    result = result.filter(p => {
      return (p.title || p.name || '').toLowerCase().includes(q) ||
             (p.sku || '').toLowerCase().includes(q) ||
             (p.description || '').toLowerCase().includes(q);
    });
  }

  switch (state.filters.sort) {
    case 'price-low':
      result.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
      break;
    case 'price-high':
      result.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
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

// --- UI Rendering ---

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
        <p class="fs-5 text-muted">No products found matching your current filters.</p>
      </div>`;
    return;
  }

  elements.productGrid.innerHTML = products.map(product => {
    // 1. Bulletproof Title Extraction (Checks every common key variant)
    const title = product.title 
      || product.Title 
      || product.Name 
      || product.name 
      || product.product_name 
      || product['Product Name'] 
      || product.item_name 
      || product.set_name 
      || product.SKU 
      || product.asin 
      || 'Untitled Product';

    // 2. Image Cleanup (Splits pipe '|' separated URLs if present)
    let imageUrl = 'https://via.placeholder.com/300?text=No+Image';
    const rawImage = product.Image 
      || product.image 
      || product.thumbnail 
      || product.image_url_1 
      || product.image_url_2 
      || (Array.isArray(product.Images) ? product.Images[0] : '')
      || (Array.isArray(product.image_urls) ? product.image_urls[0] : '');

    if (typeof rawImage === 'string' && rawImage.trim() !== '') {
      imageUrl = rawImage.split('|')[0].trim();
    }

    // 3. Price Normalization
    const activePrice = product.SalePrice 
      || product.current_price 
      || product.price 
      || product.Price;

    const priceText = activePrice 
      ? `₹${parseFloat(activePrice).toLocaleString('en-IN')}` 
      : 'Contact for Price';

    const mrpText = product.mrp && product.mrp > activePrice 
      ? `<span class="text-decoration-line-through text-muted small ms-2">₹${parseFloat(product.mrp).toLocaleString('en-IN')}</span>` 
      : '';

    // 4. Brand & Stock Badges
    const brandName = product.brand 
      || product.Brand 
      || product.brandName 
      || product.specifications?.['Brand Name'] 
      || '';

    const brandBadge = brandName 
      ? `<span class="badge bg-dark position-absolute top-0 end-0 m-2">${brandName}</span>` 
      : '';

    const isOutOfStock = product.StockQuantity === 0;
    const stockBadge = isOutOfStock 
      ? `<span class="badge bg-danger position-absolute top-0 start-0 m-2">Out of Stock</span>` 
      : '';

    // 5. Size & Specification Extraction
    let sizeText = product.size 
      || product.Size 
      || (Array.isArray(product.sizes) ? product.sizes.join(', ') : '')
      || product.dimensions;

    if (!sizeText) {
      // Auto-extract common tool specifications from title/description
      const driveMatch = title.match(/1\/[248]\s*(?:Inch|")?\s*(?:Sq\.?)?\s*Drive/i) 
        || product.description?.match(/1\/[248]\s*Sq\s*Drive/i);
      
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
      ? `<div class="mb-2"><span class="badge bg-light text-dark border font-monospace fw-normal text-truncate d-inline-block mw-100">${sizeText}</span></div>`
      : `<div class="mb-2" style="min-height: 23px;"></div>`;

    const productId = product.SKU || product.asin || product.id || product.Slug || '';

    return `
      <div class="col">
        <div class="card h-100 product-card shadow-sm position-relative ${isOutOfStock ? 'opacity-75' : ''}">
          ${stockBadge}
          ${brandBadge}
          
          <img src="${imageUrl}" class="card-img-top p-3" alt="${title}" style="height: 180px; object-fit: contain;">
          
          <div class="card-body d-flex flex-column pt-1">
            <h5 class="card-title fs-6 mb-2 text-truncate-2" title="${title}">${title}</h5>
            
            <!-- Size & Specs -->
            ${sizeBadgeHTML}

            <div class="mt-auto mb-2">
              <span class="fw-bold text-primary fs-5">${priceText}</span>
              ${mrpText}
            </div>

            <a href="/product.html?id=${productId}" class="btn btn-outline-primary btn-sm w-100">View Details</a>
          </div>
        </div>
      </div>`;
  }).join('');
}

// Smart Bootstrap Pagination with Ellipses & Page Size selector
function renderPagination(totalItems) {
  if (!elements.paginationContainer) return;

  const totalPages = Math.ceil(totalItems / state.itemsPerPage);

  if (totalItems === 0) {
    elements.paginationContainer.innerHTML = '';
    return;
  }

  // Calculate page numbers with truncating ellipses
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
      
      <!-- Page Size Selector & Stats -->
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

      <!-- Bootstrap Truncated Pagination -->
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

  if (state.filters.category) {
    const selectedOpt = elements.categoryFilter?.options[elements.categoryFilter.selectedIndex];
    elements.categoryTitle.textContent = selectedOpt ? selectedOpt.text.replace(/\s*\(\d+\)$/, '') : 'Products';
  } else if (state.filters.brand) {
    const selectedOpt = elements.brandFilter?.options[elements.brandFilter.selectedIndex];
    elements.categoryTitle.textContent = selectedOpt ? selectedOpt.text.replace(/\s*\(\d+\)$/, '') : 'Products';
  } else {
    elements.categoryTitle.textContent = 'All Products';
  }
}

// --- Event Handlers ---

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

  // Handle Pagination Clicks & Page Size Changes
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
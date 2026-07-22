document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('dist/catalog.json');
        if (!response.ok) throw new Error('Failed to load product catalog');
        const products = await response.json();

        renderFeaturedProducts(products);
        
        // Also fetch and render blogs if the blog-grid container exists
        try {
            const blogResponse = await fetch('dist/blogs.json');
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

function renderFeaturedProducts(products) {
    const container = document.getElementById('product-grid');
    if (!container) return;

    // Take the first 8 products as featured items
    const featured = products.slice(0, 8);

    if (featured.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No products available at the moment.</p>';
        return;
    }

    container.innerHTML = featured.map(product => `
        <div class="col-6 col-md-4 col-lg-3 mb-4">
            <div class="card h-100 product-card shadow-sm border-0">
                <a href="product.html?slug=${product.slug}" class="text-decoration-none">
                    <div class="product-img-wrapper position-relative overflow-hidden" style="height: 200px; background-color: #f8f9fa;">
                        <img src="${product.image || 'src/images/placeholder.jpg'}" alt="${escapeHtml(product.name)}" class="w-100 h-100 object-fit-contain p-3">
                    </div>
                </a>
                <div class="card-body d-flex flex-column p-3">
                    <span class="text-uppercase text-muted small mb-1">${escapeHtml(product.brand || 'General')}</span>
                    <h5 class="card-title fs-6 mb-2">
                        <a href="product.html?slug=${product.slug}" class="text-dark text-decoration-none stretched-link">
                            ${escapeHtml(product.name)}
                        </a>
                    </h5>
                    <div class="mt-auto d-flex align-items-center justify-content-between pt-2">
                        <span class="fw-bold text-primary">₹${Number(product.price).toLocaleString('en-IN')}</span>
                        <a href="product.html?slug=${product.slug}" class="btn btn-sm btn-outline-primary position-relative z-1">View</a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderBlogs(blogs) {
    const container = document.getElementById('blog-grid');
    if (!container) return;

    const latestBlogs = blogs.slice(0, 3);

    if (latestBlogs.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No blog posts available.</p>';
        return;
    }

    container.innerHTML = latestBlogs.map(blog => `
        <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm border-0">
                <div style="height: 160px; background-color: #f8f9fa; overflow: hidden;">
                    <img src="${blog.image || 'src/images/placeholder.jpg'}" alt="${escapeHtml(blog.title)}" class="w-100 h-100 object-fit-cover">
                </div>
                <div class="card-body d-flex flex-column p-3">
                    <small class="text-muted mb-1">${escapeHtml(blog.date)} &bull; ${escapeHtml(blog.category)}</small>
                    <h5 class="card-title fs-6 fw-bold mb-2">
                        <a href="blog.html?slug=${blog.slug}" class="text-dark text-decoration-none stretched-link">
                            ${escapeHtml(blog.title)}
                        </a>
                    </h5>
                    <p class="card-text text-muted small mb-3">${escapeHtml(blog.excerpt || '')}</p>
                    <div class="mt-auto">
                        <a href="blog.html?slug=${blog.slug}" class="text-decoration-none fw-semibold small position-relative z-1">Read More <i class="bi bi-arrow-right"></i></a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
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

        const matches = products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.brand && p.brand.toLowerCase().includes(query)) ||
            (p.category && p.category.toLowerCase().includes(query))
        ).slice(0, 5);

        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="dropdown-item text-muted py-2">No products found</div>';
            searchResults.classList.add('show');
            return;
        }

        searchResults.innerHTML = matches.map(p => `
            <a href="product.html?slug=${p.slug}" class="dropdown-item d-flex align-items-center py-2 border-bottom">
                <img src="${p.image || 'src/images/placeholder.jpg'}" alt="" style="width: 40px; height: 40px; object-fit: contain;" class="me-2 bg-light rounded">
                <div class="text-truncate">
                    <div class="fw-semibold text-dark text-truncate" style="max-width: 250px;">${escapeHtml(p.name)}</div>
                    <small class="text-muted">₹${Number(p.price).toLocaleString('en-IN')}</small>
                </div>
            </a>
        `).join('');
        
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
    return str
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
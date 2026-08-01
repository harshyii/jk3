import { API } from './api.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';

let Brand = {
    async init() {
        let queryParams = Utils.getQueryParams();
        let brandSlug = queryParams.get("slug");
        let page = parseInt(queryParams.get("page")) || 1;
        const ITEMS_PER_PAGE = 12; // Change this value to adjust items per page

        if (UI && typeof UI.setLoading === 'function') {
            UI.setLoading(true);
        }

        try {
            if (!brandSlug) {
                // No slug provided: Load and render all brands list view with pagination
                this.updateMetaTags({ name: "Our Brands", description: "Explore all top industrial tool and equipment brands available at Haryana Tools." });
                await this.renderAllBrands(page, ITEMS_PER_PAGE);
            } else {
                // Slug provided: Load and render products for that specific brand with pagination
                await this.renderBrandProducts(brandSlug, page, ITEMS_PER_PAGE);
            }
        } catch (err) {
            console.error("❌ Error initializing brand page:", err);
            if (UI && typeof UI.showToast === 'function') {
                UI.showToast("Failed to load brand data.", "error");
            }
        } finally {
            if (UI && typeof UI.setLoading === 'function') {
                UI.setLoading(false);
            }
        }
    },

    updateMetaTags(brandInfo) {
        const brandName = brandInfo.name || "Brands";
        const description = brandInfo.description || `Explore products from ${brandName} at Haryana Tools.`;
        const currentUrl = window.location.href;
        
        let image = brandInfo.image || '404.webp';
        const absoluteImageUrl = image.startsWith('http') ? image : new URL(image, window.location.origin).href;

        // Update standard title
        document.title = `${brandName} - Haryana Tools`;

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
        setMetaTag(null, 'description', description);

        // Open Graph / Facebook / WhatsApp Meta Tags
        setMetaTag('og:title', null, `${brandName} - Haryana Tools`);
        setMetaTag('og:description', null, description);
        setMetaTag('og:image', null, absoluteImageUrl);
        setMetaTag('og:url', null, currentUrl);
        setMetaTag('og:type', null, 'website');

        // Twitter Card Meta Tags
        setMetaTag(null, 'twitter:card', 'summary_large_image');
        setMetaTag(null, 'twitter:title', `${brandName} - Haryana Tools`);
        setMetaTag(null, 'twitter:description', description);
        setMetaTag(null, 'twitter:image', absoluteImageUrl);
    },

    async renderAllBrands(currentPage, itemsPerPage) {
        let gridEl = document.getElementById("brand-product-grid");
        if (!gridEl) return;

        let titleEl = document.getElementById("brand-title");
        if (titleEl) {
            titleEl.textContent = "Our Brands";
        }

        let brandsList = [];
        try {
            let res = await fetch('dist/data/brands.json');
            if (!res.ok) res = await fetch('brands.json');
            if (res.ok) {
                brandsList = await res.json();
            }
        } catch (err) {
            console.warn("Could not load brands list metadata:", err);
        }

        let countBadge = document.getElementById("product-count-badge");
        if (countBadge) {
            countBadge.textContent = `${brandsList.length} ${brandsList.length === 1 ? 'Brand' : 'Brands'}`;
        }

        if (!brandsList || brandsList.length === 0) {
            gridEl.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="fs-1 mb-2 text-muted">🏷️</div>
                    <h5 class="text-dark fw-bold">No Brands Available</h5>
                    <p class="text-muted small">We couldn't find any brands at the moment.</p>
                    <a href="index.html" class="btn btn-sm btn-outline-primary px-4 mt-2 fw-bold">Back to Home</a>
                </div>`;
            return;
        }

        // Pagination calculations
        let totalPages = Math.ceil(brandsList.length / itemsPerPage);
        currentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
        let startIndex = (currentPage - 1) * itemsPerPage;
        let paginatedBrands = brandsList.slice(startIndex, startIndex + itemsPerPage);

        gridEl.innerHTML = paginatedBrands.map(brand => {
            let brandName = brand.name || 'Brand Name';
            let brandSlug = brand.slug || Utils.slugify(brandName);
            let brandImage = brand.image || '404.webp';
            let brandCount = brand.count !== undefined ? `${brand.count} Products` : '';

            return `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0 position-relative brand-card text-center">
                        <div class="bg-light p-3 rounded-top" style="height: 160px; display: flex; align-items: center; justify-content: center;">
                            <img src="${brandImage}" class="img-fluid" alt="${brandName}" style="max-height: 100%; object-fit: contain;" onerror="this.src='404.webp'">
                        </div>
                        <div class="card-body d-flex flex-column p-3">
                            <h5 class="card-title text-truncate fw-bold text-dark mb-1" title="${brandName}" style="font-size: 1rem;">${brandName}</h5>
                            ${brandCount ? `<p class="text-muted small mb-3">${brandCount}</p>` : '<div class="mb-3"></div>'}
                            <div class="mt-auto">
                                <a href="brand.html?slug=${brandSlug}" class="btn btn-primary btn-sm w-100 fw-bold py-2">View Products</a>
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join("");

        this.renderPaginationUI(currentPage, totalPages);
    },

    async renderBrandProducts(brandSlug, currentPage, itemsPerPage) {
        let gridEl = document.getElementById("brand-product-grid");
        if (!gridEl) return;

        let brandProductsList = [];
        let brandMetaData = null;

        // 1. Try fetching dedicated file from brands/ folder
        try {
            let res = await fetch(`brands/${brandSlug}.json`);
            if (res.ok) {
                brandProductsList = await res.json();
            }
        } catch (err) {
            console.warn(`Could not load brands/${brandSlug}.json directly.`);
        }

        // 2. Fallback to filtering main catalog if individual file is missing/empty
        if (!brandProductsList || brandProductsList.length === 0) {
            try {
                let catalog = await API.getCatalog();
                if (Array.isArray(catalog)) {
                    brandProductsList = catalog.filter(item => {
                        let bName = item.Brand || item.brand || item.brandName || '';
                        return Utils.slugify(bName) === brandSlug;
                    });
                }
            } catch (catErr) {
                console.error("Error fetching main catalog fallback:", catErr);
            }
        }

        let allProducts = Array.isArray(brandProductsList) ? brandProductsList : [];

        // 3. Resolve display brand name & metadata
        let displayBrandName = brandSlug;
        if (allProducts.length > 0) {
            let firstItem = allProducts[0];
            displayBrandName = firstItem.Brand || firstItem.brand || firstItem.brandName || brandSlug;
        }

        try {
            let metaRes = await fetch('dist/data/brands.json');
            if (!metaRes.ok) metaRes = await fetch('brands.json');
            if (metaRes.ok) {
                let metaList = await metaRes.json();
                let found = metaList.find(b => b.slug === brandSlug);
                if (found) {
                    brandMetaData = found;
                    if (found.name) displayBrandName = found.name;
                }
            }
        } catch (metaErr) {}

        // Update Meta Tags for social media sharing & SEO
        this.updateMetaTags({
            name: displayBrandName,
            description: `Browse all ${allProducts.length} high-quality industrial tools and hardware products from ${displayBrandName}.`,
            image: brandMetaData ? brandMetaData.image : (allProducts.length > 0 ? (allProducts[0].image || allProducts[0].Image) : null)
        });

        let titleEl = document.getElementById("brand-title");
        if (titleEl) {
            titleEl.textContent = `Products by ${displayBrandName.toUpperCase()}`;
        }

        let countBadge = document.getElementById("product-count-badge");
        if (countBadge) {
            countBadge.textContent = `${allProducts.length} ${allProducts.length === 1 ? 'Item' : 'Items'}`;
        }

        if (allProducts.length === 0) {
            gridEl.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="fs-1 mb-2 text-muted">🔍</div>
                    <h5 class="text-dark fw-bold">No Products Found</h5>
                    <p class="text-muted small">We couldn't find any items available for this brand right now.</p>
                    <a href="brand.html" class="btn btn-sm btn-outline-primary px-4 mt-2 fw-bold">Back to All Brands</a>
                </div>`;
            return;
        }

        // Pagination calculations
        let totalPages = Math.ceil(allProducts.length / itemsPerPage);
        currentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
        let startIndex = (currentPage - 1) * itemsPerPage;
        let paginatedProducts = allProducts.slice(startIndex, startIndex + itemsPerPage);

        gridEl.innerHTML = paginatedProducts.map(product => {
            let prodImage = product.image || product.Image || product.img || '404.webp';
            let prodName = product.name || product.Name || product.title || 'Industrial Product';
            let prodPrice = parseFloat(product.price || product.SalePrice || product.MRP || 0);
            let prodSlug = product.slug || Utils.slugify(prodName);

            return `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0 position-relative product-card">
                        <div class="bg-light p-3 text-center rounded-top" style="height: 180px; display: flex; align-items: center; justify-content: center;">
                            <img src="${prodImage}" class="img-fluid" alt="${prodName}" style="max-height: 100%; object-fit: contain;" onerror="this.src='404.webp'">
                        </div>
                        <div class="card-body d-flex flex-column p-3">
                            <h5 class="card-title text-truncate fw-bold text-dark mb-2" title="${prodName}" style="font-size: 0.95rem;">${prodName}</h5>
                            <div class="mb-3">
                                <span class="text-primary fw-bold fs-6">${Utils.formatCurrency ? Utils.formatCurrency(prodPrice) : '₹' + prodPrice}</span>
                            </div>
                            <div class="mt-auto">
                                <a href="product.html?slug=${prodSlug}" class="btn btn-outline-primary btn-sm w-100 fw-bold py-2">View Product</a>
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join("");

        this.renderPaginationUI(currentPage, totalPages);
    },

    renderPaginationUI(currentPage, totalPages) {
        let paginationContainer = document.getElementById("pagination-placeholder");
        if (!paginationContainer) {
            console.warn("⚠️ #pagination-placeholder element not found in DOM!");
            return;
        }

        // Force integer evaluation
        currentPage = parseInt(currentPage) || 1;
        totalPages = parseInt(totalPages) || 1;

        if (totalPages <= 1) {
            paginationContainer.innerHTML = "";
            return;
        }

        let queryParams = Utils.getQueryParams();
        let brandSlug = queryParams.get("slug");

        const getPageNumbers = (current, total) => {
            const delta = 2;
            const range = [];
            const rangeWithDots = [];
            let l;

            range.push(1);
            for (let i = current - delta; i <= current + delta; i++) {
                if (i < total && i > 1) range.push(i);
            }
            if (total > 1) range.push(total);

            for (let i of range) {
                if (l) {
                    if (i - l === 2) rangeWithDots.push(l + 1);
                    else if (i - l !== 1) rangeWithDots.push('...');
                }
                rangeWithDots.push(i);
                l = i;
            }
            return rangeWithDots;
        };

        const pages = getPageNumbers(currentPage, totalPages);

        let prevTargetUrl = brandSlug ? `brand.html?slug=${brandSlug}&page=${currentPage - 1}` : `brand.html?page=${currentPage - 1}`;
        let nextTargetUrl = brandSlug ? `brand.html?slug=${brandSlug}&page=${currentPage + 1}` : `brand.html?page=${currentPage + 1}`;

        let paginationHTML = `
            <nav aria-label="Brand Catalog Navigation" class="mt-4">
                <ul class="pagination justify-content-center shadow-sm">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="${currentPage === 1 ? '#' : prevTargetUrl}">Prev</a>
                    </li>
        `;

        pages.forEach(page => {
            if (page === '...') {
                paginationHTML += `<li class="page-item disabled"><span class="page-link border-0 bg-transparent">...</span></li>`;
            } else {
                let pageUrl = brandSlug ? `brand.html?slug=${brandSlug}&page=${page}` : `brand.html?page=${page}`;
                paginationHTML += `
                    <li class="page-item ${currentPage === page ? 'active' : ''}">
                        <a class="page-link" href="${pageUrl}">${page}</a>
                    </li>
                `;
            }
        });

        paginationHTML += `
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="${currentPage === totalPages ? '#' : nextTargetUrl}">Next</a>
                    </li>
                </ul>
            </nav>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }
};

document.addEventListener("DOMContentLoaded", () => Brand.init());
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        const filterForm = document.getElementById('filter-form');
        if (!filterForm) return;

        const priceRange = document.getElementById('price-range');
        const priceValue = document.getElementById('price-value');
        const categoryListContainer = document.getElementById('filter-category-list');
        const brandListContainer = document.getElementById('filter-brand-list');
        const resetBtn = document.getElementById('reset-filters-btn');

        // Fix currency template display
        document.querySelectorAll('#currency-symbol, .curr-sym').forEach(el => {
            el.textContent = '₹';
        });

        // 1. Fetch categories.json
        try {
            const catRes = await fetch('./dist/data/categories.json');
            if (catRes.ok && categoryListContainer) {
                const categories = await catRes.json();
                categoryListContainer.innerHTML = '';
                categories.forEach(cat => {
                    const name = cat.name || cat.Title || cat.title || cat;
                    const slug = cat.slug || cat.Slug || name.toLowerCase().replace(/\s+/g, '-');
                    const div = document.createElement('div');
                    div.className = 'form-check';
                    div.innerHTML = `
                        <input class="form-check-input" type="checkbox" name="category" value="${slug}" id="cat-${slug}">
                        <label class="form-check-label small text-muted" for="cat-${slug}">${name}</label>
                    `;
                    categoryListContainer.appendChild(div);
                });
            }
        } catch (e) {
            console.warn('Could not load categories.json');
        }

        // 2. Fetch brands.json
        try {
            const brandRes = await fetch('./dist/data/brands.json');
            if (brandRes.ok && brandListContainer) {
                const brands = await brandRes.json();
                brandListContainer.innerHTML = '';
                brands.forEach(brand => {
                    const name = brand.name || brand.Title || brand.title || brand;
                    const slug = brand.slug || brand.Slug || name.toLowerCase().replace(/\s+/g, '-');
                    const div = document.createElement('div');
                    div.className = 'form-check';
                    div.innerHTML = `
                        <input class="form-check-input" type="checkbox" name="brand" value="${slug}" id="brand-${slug}">
                        <label class="form-check-label small text-muted" for="brand-${slug}">${name}</label>
                    `;
                    brandListContainer.appendChild(div);
                });
            }
        } catch (e) {
            console.warn('Could not load brands.json');
        }

        // 3. Live update price slider text
        if (priceRange && priceValue) {
            priceRange.addEventListener('input', (e) => {
                priceValue.textContent = Number(e.target.value).toLocaleString('en-IN');
            });
        }

        const getController = () => window.Category || window.Shop || window.App || window.Products || window.catalog || window.Catalogue;

        // 4. Reset Button Handler
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                filterForm.reset();
                if (priceRange && priceValue) {
                    priceValue.textContent = Number(priceRange.value).toLocaleString('en-IN');
                }
                const ctrl = getController();
                if (ctrl) {
                    if (ctrl.allProducts) ctrl.filteredProducts = [...ctrl.allProducts];
                    ctrl.currentPage = 1;
                    if (typeof ctrl.render === 'function') ctrl.render();
                } else {
                    window.location.reload();
                }
            });
        }

        // 5. Form Submit Filtering & Sorting Logic
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const ctrl = getController();
            const productsPool = ctrl?.allProducts || ctrl?.products || window.allProducts || window.productsList;

            if (!productsPool || productsPool.length === 0) {
                console.error("Product array not exposed globally. Expose your products array to window.allProducts in your main catalog script.");
                alert("Please ensure products are loaded before applying filters.");
                return;
            }

            const formData = new FormData(filterForm);
            const maxPrice = parseFloat(formData.get('max_price')) || 25000;
            const selectedCategories = formData.getAll('category');
            const selectedBrands = formData.getAll('brand');
            const minRating = parseFloat(formData.get('rating')) || 0;
            const inStockOnly = formData.get('in_stock') === 'true';
            const onSaleOnly = formData.get('on_sale') === 'true';
            const sortOption = formData.get('sort') || 'default';

            const filtered = productsPool.filter(p => {
                const price = parseFloat(p.price || p.Price || p.SalePrice || 0);
                if (price > maxPrice) return false;

                const pCatSlug = (p.Category || p.category || '').toLowerCase().replace(/\s+/g, '-');
                if (selectedCategories.length > 0 && !selectedCategories.includes(pCatSlug)) return false;

                const pBrandSlug = (p.Brand || p.brand || '').toLowerCase().replace(/\s+/g, '-');
                if (selectedBrands.length > 0 && !selectedBrands.includes(pBrandSlug)) return false;

                const rating = parseFloat(p.rating || p.Rating || 0);
                if (minRating > 0 && rating < minRating) return false;

                if (inStockOnly && !(p.in_stock || p.InStock || p.stock > 0)) return false;
                if (onSaleOnly && !(p.on_sale || p.OnSale || p.SalePrice)) return false;

                return true;
            });

            filtered.sort((a, b) => {
                const priceA = parseFloat(a.price || a.Price || a.SalePrice || 0);
                const priceB = parseFloat(b.price || b.Price || b.SalePrice || 0);
                const nameA = (a.name || a.Title || '').toLowerCase();
                const nameB = (b.name || b.Title || '').toLowerCase();
                const ratingA = parseFloat(a.rating || a.Rating || 0);
                const ratingB = parseFloat(b.rating || b.Rating || 0);
                const dateA = new Date(a.created_at || a.date || 0);
                const dateB = new Date(b.created_at || b.date || 0);

                switch (sortOption) {
                    case 'price-low': return priceA - priceB;
                    case 'price-high': return priceB - priceA;
                    case 'name': return nameA.localeCompare(nameB);
                    case 'rating-desc': return ratingB - ratingA;
                    case 'newest': return dateB - dateA;
                    default: return 0;
                }
            });

            if (ctrl) {
                ctrl.filteredProducts = filtered;
                ctrl.currentPage = 1;
                if (typeof ctrl.render === 'function') {
                    ctrl.render();
                }
            }
        });
    }, 300);
});